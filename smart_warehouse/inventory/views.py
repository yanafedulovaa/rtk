import csv
import io
import os

from django.db.models import F, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from warehouse.models import InventoryHistory
from .serializers import InventoryItemSerializer
from rest_framework.pagination import PageNumberPagination
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.http import HttpResponse
import numpy as np
from products.models import Product
from .models import InventoryCSVImport

from datetime import datetime
class InventoryPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


from itertools import chain
from operator import attrgetter

def calculate_status(quantity):
    if quantity is None:
        return "-"
    if quantity <= 5:
        return "CRITICAL"
    if quantity <= 20:
        return "LOW_STOCK"
    return "OK"


def serialize_item(item, source):
    # Универсальное преобразование для обеих моделей
    return {
        "product_id": item.get("product_id"),
        "product_name": item.get("product_name") or item.get("product__name"),
        "zone": item.get("zone"),
        "quantity": item.get("quantity"),
        "scanned_at": item.get("scanned_at"),
        "status": item.get("status") or calculate_status(item.get("quantity")),
        "source": source,
        "row_number": item.get("row_number"),
        "shelf_number": item.get("shelf_number"),
        "created_at": item.get("created_at"),
    }


class InventoryHistoryView(APIView):

    def get(self, request):
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        zone = request.GET.get('zone')
        status_filter = request.GET.get('status')
        search = request.GET.get('search')
        ordering = request.GET.get('ordering') or '-scanned_at'

        # --- Получаем QuerySet для обеих таблиц ---
        qs1 = InventoryHistory.objects.all()
        qs2 = InventoryCSVImport.objects.all()

        # --- Фильтры по дате и зоне ---
        if from_date:
            qs1 = qs1.filter(scanned_at__date__gte=from_date)
            qs2 = qs2.filter(scanned_at__date__gte=from_date)
        if to_date:
            qs1 = qs1.filter(scanned_at__date__lte=to_date)
            qs2 = qs2.filter(scanned_at__date__lte=to_date)
        if zone:
            qs1 = qs1.filter(zone__iexact=zone)
            qs2 = qs2.filter(zone__iexact=zone)

        # --- Унифицированный поиск ---
        if search:
            qs1 = qs1.filter(
                Q(product__name__icontains=search) | Q(product__id__icontains=search)
            )
            qs2 = qs2.filter(
                Q(product_name__icontains=search) | Q(product_id__icontains=search)
            )

        # --- Преобразуем InventoryHistory в словари ---
        qs1_values = list(
            qs1.values(
                'id',
                "product_id",
                "product__name",
                "zone",
                "status",
                "quantity",
                "scanned_at",
            )
        )
        for item in qs1_values:
            item["product_name"] = item.pop("product__name")  # унификация
            item["source"] = "history"

        # --- Преобразуем InventoryCSVImport в словари ---
        qs2_values = list(
            qs2.values(
                'id',
                "product_id",
                "product_name",
                "quantity",
                "zone",
                "row_number",
                "shelf_number",
                "scanned_at",
                "created_at",
            )
        )
        for item in qs2_values:
            qty = item.get("quantity")
            if qty is None:
                item["status"] = "-"
            elif qty <= 5:
                item["status"] = "CRITICAL"
            elif qty <= 20:
                item["status"] = "LOW_STOCK"
            else:
                item["status"] = "OK"
            item["source"] = "csv"

        # --- Объединяем обе таблицы ---
        combined = list(chain(qs1_values, qs2_values))

        # --- Фильтруем по статусу после объединения ---
        if status_filter and status_filter.lower() != "all":
            combined = [
                i for i in combined if i.get("status", "").lower() == status_filter.lower()
            ]

        # --- Сортировка ---
        reverse = ordering.startswith("-")
        field = ordering.lstrip("-")
        combined.sort(key=lambda x: x.get(field), reverse=reverse)

        # --- Пагинация ---
        paginator = InventoryPagination()
        page = paginator.paginate_queryset(combined, request)

        response_data = {
            "total": len(combined),
            "items": page,
            "summary": {
                "total_checks": len(combined),
                "unique_products": len({item["product_name"] for item in combined}),
                "discrepancies": 0,
                "avg_time_per_zone": round(len(combined) / 60, 2) if combined else 0
            },
            "pagination": {
                "page": paginator.page.number,
                "page_size": paginator.page.paginator.per_page,
                "total_pages": paginator.page.paginator.num_pages,
                "total_items": paginator.page.paginator.count,
                "has_next": paginator.page.has_next(),
                "has_previous": paginator.page.has_previous(),
            },
        }

        return Response(response_data)


from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import datetime


def lttb_downsample(data, threshold):
    """
    LTTB downsampling - чистая Python реализация
    data: список словарей [{'scanned_at': '...', 'quantity': ...}, ...]
    threshold: целевое количество точек
    """
    if len(data) <= threshold or threshold < 3:
        return data

    # Преобразуем в числовые координаты
    points = []
    seen_timestamps = set()

    for d in data:
        timestamp = datetime.fromisoformat(d['scanned_at'].replace('Z', '+00:00')).timestamp()

        # Пропускаем дубликаты или добавляем микросдвиг
        while timestamp in seen_timestamps:
            timestamp += 0.001  # Добавляем 1 миллисекунду

        seen_timestamps.add(timestamp)
        y = float(d['quantity'])
        points.append({'x': timestamp, 'y': y, 'original': d})

    sampled = [points[0]]  # Всегда берем первую точку

    bucket_size = (len(points) - 2) / (threshold - 2)

    a = 0
    for i in range(threshold - 2):
        # Следующий bucket для расчета среднего
        avg_range_start = int((i + 1) * bucket_size) + 1
        avg_range_end = int((i + 2) * bucket_size) + 1
        avg_range_end = min(avg_range_end, len(points))

        avg_x = 0
        avg_y = 0
        avg_range_length = avg_range_end - avg_range_start

        for j in range(avg_range_start, avg_range_end):
            avg_x += points[j]['x']
            avg_y += points[j]['y']

        avg_x /= avg_range_length
        avg_y /= avg_range_length

        # Текущий bucket
        range_start = int(i * bucket_size) + 1
        range_end = int((i + 1) * bucket_size) + 1

        # Находим точку с максимальной площадью треугольника
        max_area = -1
        max_area_point = None
        max_area_index = 0

        point_a = sampled[-1]

        for j in range(range_start, range_end):
            # Площадь треугольника
            area = abs(
                (point_a['x'] - avg_x) * (points[j]['y'] - point_a['y']) -
                (point_a['x'] - points[j]['x']) * (avg_y - point_a['y'])
            ) * 0.5

            if area > max_area:
                max_area = area
                max_area_point = points[j]
                max_area_index = j

        sampled.append(max_area_point)
        a = max_area_index

    sampled.append(points[-1])  # Всегда берем последнюю точку

    return [p['original'] for p in sampled]


class InventoryTrendView(APIView):
    def get(self, request):
        max_points = int(request.GET.get('max_points', 200))

        product_filter = request.GET.get('products')
        if product_filter:
            products = [p.strip() for p in product_filter.split(',')]
            qs1 = InventoryHistory.objects.filter(product_id__in=products)
            qs2 = InventoryCSVImport.objects.filter(product_id__in=products)
        else:
            qs1 = InventoryHistory.objects.all()
            qs2 = InventoryCSVImport.objects.all()

        data = {}
        all_products = set(qs1.values_list('product_id', flat=True)) | \
                       set(qs2.values_list('product_id', flat=True))

        for product in all_products:
            records = []

            # Собираем данные
            for r in qs1.filter(product_id=product).order_by('scanned_at'):
                if r.quantity is not None:
                    records.append({
                        'scanned_at': r.scanned_at.isoformat(),
                        'quantity': r.quantity
                    })

            for r in qs2.filter(product_id=product).order_by('scanned_at'):
                if r.quantity is not None:
                    records.append({
                        'scanned_at': r.scanned_at.isoformat(),
                        'quantity': r.quantity
                    })

            # Сортируем по времени
            records.sort(key=lambda x: x['scanned_at'])

            # Применяем LTTB если точек больше max_points
            if len(records) > max_points:
                records = lttb_downsample(records, max_points)

            data[str(product)] = records

        response = {
            'products': [str(p) for p in all_products],
            'data': data,
            'meta': {
                'max_points_per_product': max_points,
                'total_products': len(all_products)
            }
        }
        return Response(response)


class InventoryExportMixin:
    """ Общая логика фильтрации для экспорта с поддержкой двух таблиц """

    def get_filtered_data(self, request):
        """
        Ожидаем либо:
        - список выбранных записей: [{"id": 1, "source": "history"}, ...]
        - или all=True + filters
        """
        if request.data.get("all"):
            # Экспорт всех записей по фильтрам
            filters = request.data.get("filters", {})
            from_date = filters.get("from")
            to_date = filters.get("to")
            zone = filters.get("zone")
            status_filter = filters.get("status")
            search = filters.get("search")

            # Получаем все записи из обеих таблиц
            qs1 = InventoryHistory.objects.all()
            qs2 = InventoryCSVImport.objects.all()

            if from_date:
                qs1 = qs1.filter(scanned_at__date__gte=from_date)
                qs2 = qs2.filter(scanned_at__date__gte=from_date)
            if to_date:
                qs1 = qs1.filter(scanned_at__date__lte=to_date)
                qs2 = qs2.filter(scanned_at__date__lte=to_date)
            if zone:
                qs1 = qs1.filter(zone__iexact=zone)
                qs2 = qs2.filter(zone__iexact=zone)

            if search:
                qs1 = qs1.filter(
                    Q(product__name__icontains=search) | Q(product__id__icontains=search)
                )
                qs2 = qs2.filter(
                    Q(product_name__icontains=search) | Q(product_id__icontains=search)
                )

            # Сериализация
            data = []
            for item in qs1:
                data.append({
                    "product_id": item.product_id,
                    "product_name": item.product.name if item.product else "",
                    "zone": item.zone,
                    "quantity": item.quantity,
                    "status": item.status,
                    "scanned_at": item.scanned_at,
                    "source": "history",
                })
            for item in qs2:
                qty = item.quantity
                if qty is None:
                    status = "-"
                elif qty <= 5:
                    status = "CRITICAL"
                elif qty <= 20:
                    status = "LOW_STOCK"
                else:
                    status = "OK"

                data.append({
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "zone": item.zone,
                    "quantity": item.quantity,
                    "status": status,
                    "scanned_at": item.scanned_at,
                    "source": "csv",
                })
        else:
            # Обычный экспорт выбранных записей
            selected = request.data.get("selected", [])
            data = []

            history_ids = [item["id"] for item in selected if item["source"] == "history"]
            csv_ids = [item["id"] for item in selected if item["source"] == "csv"]

            if history_ids:
                qs_history = InventoryHistory.objects.filter(id__in=history_ids)
                for item in qs_history:
                    data.append({
                        "product_id": item.product_id,
                        "product_name": item.product.name if item.product else "",
                        "zone": item.zone,
                        "quantity": item.quantity,
                        "status": item.status,
                        "scanned_at": item.scanned_at,
                        "source": "history",
                    })

            if csv_ids:
                qs_csv = InventoryCSVImport.objects.filter(id__in=csv_ids)
                for item in qs_csv:
                    qty = item.quantity
                    if qty is None:
                        status = "-"
                    elif qty <= 5:
                        status = "CRITICAL"
                    elif qty <= 20:
                        status = "LOW_STOCK"
                    else:
                        status = "OK"

                    data.append({
                        "product_id": item.product_id,
                        "product_name": item.product_name,
                        "zone": item.zone,
                        "quantity": item.quantity,
                        "status": status,
                        "scanned_at": item.scanned_at,
                        "source": "csv",
                    })

        # Сортировка
        ordering = request.data.get("ordering", "-scanned_at")
        reverse = ordering.startswith("-")
        field = ordering.lstrip("-")
        data.sort(key=lambda x: x.get(field), reverse=reverse)

        return data


class InventoryExportExcelView(InventoryExportMixin, APIView):
    def post(self, request):
        data = self.get_filtered_data(request)
        if not data:
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        wb = Workbook()
        ws = wb.active
        ws.title = "Inventory Export"

        headers = ["ID товара", "Дата", "Зона", "Товар", "Кол-во", "Статус", "Источник"]
        ws.append(headers)

        for item in data:
            ws.append([
                item["product_id"],
                item["scanned_at"].strftime("%Y-%m-%d %H:%M:%S") if item["scanned_at"] else "",
                item["zone"],
                item["product_name"],
                item["quantity"],
                item["status"],
                item["source"]
            ])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="inventory_export.xlsx"'
        return response

class InventoryExportPDFView(InventoryExportMixin, APIView):
    def post(self, request):
        data = self.get_filtered_data(request)
        if not data:
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        # ✅ Регистрируем шрифт с кириллицей
        font_path = os.path.join(os.path.dirname(__file__), "DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
        p.setFont("DejaVuSans", 12)

        # Заголовок
        p.setFont("DejaVuSans", 14)
        p.drawString(50, y, "Отчёт по инвентаризации")
        y -= 30

        # Колонки
        p.setFont("DejaVuSans", 10)
        headers = ["ID товара", "Дата", "Зона", "Товар", "Кол-во", "Статус", "Источник"]
        p.drawString(50, y, " | ".join(headers))
        y -= 20

        for item in data:
            scanned_at = item["scanned_at"].strftime("%Y-%m-%d %H:%M:%S") if item["scanned_at"] else ""
            line = f"{item['product_id']} | {scanned_at} | {item['zone']} | {item['product_name']} | {item['quantity']} | {item['status']} | {item['source']}"
            p.drawString(50, y, line)
            y -= 15

            if y < 50:
                p.showPage()
                p.setFont("DejaVuSans", 10)
                y = height - 50

        p.save()
        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="inventory_export.pdf"'
        return response

class InventoryUploadView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Файл не предоставлен'}, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем кодировку
        try:
            decoded_file = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': "Неверная кодировка, требуется UTF-8"}, status=status.HTTP_400_BAD_REQUEST)

        # Парсим CSV
        reader = csv.DictReader(io.StringIO(decoded_file), delimiter=';')

        # Проверяем наличие обязательных колонок
        required_columns = {"product_id", "product_name", "quantity", "zone", "date", "row", "shelf"}
        if not required_columns.issubset(reader.fieldnames):
            missing = required_columns - set(reader.fieldnames)
            return Response({"error": f"Отсутствуют обязательные колонки: {', '.join(missing)}"},
                            status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        errors = []

        for row in reader:
            try:
                # Извлекаем данные
                product_id = row["product_id"].strip()
                product_name = row["product_name"].strip()
                quantity = int(row["quantity"])
                zone = row["zone"].strip()
                row_number = int(row["row"]) if row["row"] else None
                shelf_number = int(row["shelf"]) if row["shelf"] else None

                # Парсим дату и делаем её timezone-aware
                scanned_date = parse_date(row["date"])
                if scanned_date:
                    scanned_at = datetime.combine(scanned_date, datetime.min.time())
                    scanned_at = timezone.make_aware(scanned_at)
                else:
                    scanned_at = None

                # Создаём запись в таблице InventoryCSVImport
                InventoryCSVImport.objects.create(
                    product_id=product_id,
                    product_name=product_name,
                    quantity=quantity,
                    zone=zone,
                    scanned_at=scanned_at,
                    row_number=row_number,
                    shelf_number=shelf_number,
                    status='OK'  # можно менять, если нужно вычислять статус
                )

                created_count += 1

            except Exception as e:
                errors.append({"row": row, "error": str(e)})
                continue

        # Формируем ответ
        response = {
            "message": f"Успешно загружено {created_count} записей",
        }
        if errors:
            response["errors"] = errors[:5]  # показываем первые 5 ошибок для отладки

        return Response(response, status=status.HTTP_200_OK)