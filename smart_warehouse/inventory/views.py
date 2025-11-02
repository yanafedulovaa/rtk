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

from datetime import datetime, timedelta
from itertools import chain
from operator import attrgetter


# Пагинация для истории инвентаризации
class InventoryPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# Функция для расчета статуса товара по количеству
def calculate_status(quantity):
    if quantity is None:
        return "-"
    if quantity <= 5:
        return "CRITICAL"
    if quantity <= 20:
        return "LOW_STOCK"
    return "OK"


# Универсальное сериализованное представление элемента для обеих моделей
def serialize_item(item, source):
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
    """Возвращает историю инвентаризации с фильтрацией, поиском, пагинацией и подсчетом расхождений"""
    def get(self, request):
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        zone = request.GET.get('zone')
        status_filter = request.GET.get('status')
        search = request.GET.get('search')
        ordering = request.GET.get('ordering') or '-scanned_at'

        now = timezone.now()
        last_24_hours = now - timedelta(hours=24)

        qs1 = InventoryHistory.objects.filter(scanned_at__gte=last_24_hours)
        qs2 = InventoryCSVImport.objects.filter(scanned_at__gte=last_24_hours)

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

        # Преобразуем QuerySet в список словарей
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
            item["product_name"] = item.pop("product__name")
            item["source"] = "history"

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

        combined = list(chain(qs1_values, qs2_values))

        # Подсчет расхождений
        discrepancies_count = 0
        products_cache = {}

        for item in combined:
            product_id = item.get("product_id")
            actual_qty = item.get("quantity", 0)

            if product_id not in products_cache:
                try:
                    product = Product.objects.get(id=product_id)
                    products_cache[product_id] = {
                        'optimal_stock': product.optimal_stock,
                        'min_stock': product.min_stock
                    }
                except Product.DoesNotExist:
                    products_cache[product_id] = None

            product_data = products_cache[product_id]

            if product_data:
                expected_qty = product_data['optimal_stock']
                min_stock = product_data['min_stock']

                discrepancy = actual_qty - expected_qty
                threshold = max(expected_qty * 0.1, 5)

                if abs(discrepancy) > threshold or actual_qty < min_stock:
                    discrepancies_count += 1

                item["expected_quantity"] = expected_qty
                item["discrepancy"] = discrepancy
                item["min_stock"] = min_stock
            else:
                item["expected_quantity"] = None
                item["discrepancy"] = None
                item["min_stock"] = None

        if status_filter and status_filter.lower() != "all":
            combined = [
                i for i in combined if i.get("status", "").lower() == status_filter.lower()
            ]

        # Сортировка
        reverse = ordering.startswith("-")
        field = ordering.lstrip("-")
        combined.sort(key=lambda x: x.get(field) if x.get(field) is not None else "", reverse=reverse)

        # Пагинация
        paginator = InventoryPagination()
        page = paginator.paginate_queryset(combined, request)

        response_data = {
            "total": len(combined),
            "items": page,
            "summary": {
                "total_checks": len(combined),
                "unique_products": len({item["product_name"] for item in combined if item["product_name"]}),
                "discrepancies": discrepancies_count,
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


def lttb_downsample(data, threshold):
    """
    LTTB downsampling - уменьшает количество точек на графике для трендов
    data: список словарей [{'scanned_at': '...', 'quantity': ...}, ...]
    threshold: целевое количество точек
    """
    if len(data) <= threshold or threshold < 3:
        return data

    points = []
    seen_timestamps = set()

    for d in data:
        timestamp = datetime.fromisoformat(d['scanned_at'].replace('Z', '+00:00')).timestamp()

        while timestamp in seen_timestamps:
            timestamp += 0.001

        seen_timestamps.add(timestamp)
        y = float(d['quantity'])
        points.append({'x': timestamp, 'y': y, 'original': d})

    sampled = [points[0]]
    bucket_size = (len(points) - 2) / (threshold - 2)

    a = 0
    for i in range(threshold - 2):
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

        range_start = int(i * bucket_size) + 1
        range_end = int((i + 1) * bucket_size) + 1

        max_area = -1
        max_area_point = None
        max_area_index = 0

        point_a = sampled[-1]

        for j in range(range_start, range_end):
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

    sampled.append(points[-1])

    return [p['original'] for p in sampled]


class InventoryTrendView(APIView):
    """Возвращает тренд изменения количества товаров во времени с возможностью downsampling"""
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

            records.sort(key=lambda x: x['scanned_at'])

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
    """Миксин для фильтрации и подготовки данных для экспорта (Excel/PDF) из InventoryHistory и InventoryCSVImport"""
    def get_filtered_data(self, request):
        if request.data.get("all"):
            filters = request.data.get("filters", {})
            from_date = filters.get("from")
            to_date = filters.get("to")
            zone = filters.get("zone")
            status_filter = filters.get("status")
            search = filters.get("search")

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
            # Фильтр по выбранным элементам
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

        # Расчет расхождений
        products_cache = {}
        discrepancies_count = 0

        for item in data:
            product_id = item.get("product_id")
            actual_qty = item.get("quantity", 0)

            if product_id not in products_cache:
                try:
                    product = Product.objects.get(id=product_id)
                    products_cache[product_id] = {
                        'optimal_stock': product.optimal_stock,
                        'min_stock': product.min_stock
                    }
                except Product.DoesNotExist:
                    products_cache[product_id] = None

            product_data = products_cache[product_id]

            if product_data:
                expected_qty = product_data['optimal_stock']
                discrepancy = actual_qty - expected_qty
                threshold = max(expected_qty * 0.1, 5)

                if abs(discrepancy) > threshold or actual_qty < product_data['min_stock']:
                    discrepancies_count += 1

                item["expected_quantity"] = expected_qty
                item["discrepancy"] = discrepancy
                item["min_stock"] = product_data["min_stock"]
            else:
                item["expected_quantity"] = None
                item["discrepancy"] = None
                item["min_stock"] = None

        return data


class InventoryExportExcelView(InventoryExportMixin, APIView):
    """Экспорт данных инвентаризации в Excel"""
    def post(self, request):
        data = self.get_filtered_data(request)
        if not data:
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        wb = Workbook()
        ws = wb.active
        ws.title = "Inventory Export"

        headers = [
            "ID товара",
            "Дата",
            "Зона",
            "Товар",
            "Кол-во (факт)",
            "Ожидаемое количество",
            "Расхождение (+/-)",
            "Минимальный запас",
            "Статус",
            "Источник"
        ]
        ws.append(headers)

        for item in data:
            ws.append([
                item["product_id"],
                item["scanned_at"].strftime("%Y-%m-%d %H:%M:%S") if item["scanned_at"] else "",
                item["zone"],
                item["product_name"],
                item["quantity"],
                item.get("expected_quantity", ""),
                item.get("discrepancy", ""),
                item.get("min_stock", ""),
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
    """Экспорт данных инвентаризации в PDF"""
    def post(self, request):
        data = self.get_filtered_data(request)
        if not data:
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        font_path = os.path.join(os.path.dirname(__file__), "DejaVuSans.ttf")
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_path))
        p.setFont("DejaVuSans", 12)

        # Заголовок
        p.setFont("DejaVuSans", 14)
        p.drawString(50, y, "Отчёт по инвентаризации")
        y -= 30

        # Колонки
        p.setFont("DejaVuSans", 10)
        headers = [
            "ID товара",
            "Дата",
            "Зона",
            "Товар",
            "Кол-во (факт)",
            "Ожид.",
            "Δ (+/-)",
            "Мин.запас",
            "Статус",
            "Источник"
        ]
        p.drawString(50, y, " | ".join(headers))
        y -= 20

        for item in data:
            scanned_at = item["scanned_at"].strftime("%Y-%m-%d %H:%M:%S") if item["scanned_at"] else ""
            line = f"{item['product_id']} | {scanned_at} | {item['zone']} | {item['product_name']} | {item['quantity']} | {item.get('expected_quantity', '')} | {item.get('discrepancy', ''):+} | {item.get('min_stock', '')} | {item['status']} | {item['source']}"
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
    """Загрузка CSV-файла с данными инвентаризации, валидация, создание/обновление записей и предупреждения по расхождениям"""
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Файл не предоставлен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': "Неверная кодировка, требуется UTF-8"}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded_file), delimiter=';')

        # Проверяем наличие обязательных колонок
        required_columns = {"product_id", "product_name", "quantity", "zone", "date", "row", "shelf"}
        if not required_columns.issubset(reader.fieldnames):
            missing = required_columns - set(reader.fieldnames)
            return Response({"error": f"Отсутствуют обязательные колонки: {', '.join(missing)}"},
                            status=status.HTTP_400_BAD_REQUEST)

        errors = []
        warnings = []
        validated_data = []

        # Валидация всех строк
        for row_num, row in enumerate(reader, start=2):
            try:
                product_id = row["product_id"].strip()
                product_name = row["product_name"].strip()
                quantity = int(row["quantity"])
                zone = row["zone"].strip()
                row_number = int(row["row"]) if row["row"] else None
                shelf_number = int(row["shelf"]) if row["shelf"] else None

                try:
                    product = Product.objects.get(id=product_id)
                    expected = product.optimal_stock
                    discrepancy = quantity - expected
                    threshold = max(expected * 0.1, 5)

                    if abs(discrepancy) > threshold:
                        warnings.append({
                            "row": row_num,
                            "product_id": product_id,
                            "product_name": product_name,
                            "message": f"Большое расхождение: ожидалось {expected}, фактически {quantity} (разница: {discrepancy:+d})"
                        })

                except Product.DoesNotExist:
                    warnings.append({
                        "row": row_num,
                        "product_id": product_id,
                        "message": f"Продукт '{product_name}' не найден в базе данных. Будет создан с дефолтными значениями."
                    })

                scanned_date = parse_date(row["date"])
                if scanned_date:
                    scanned_at = datetime.combine(scanned_date, datetime.min.time())
                    scanned_at = timezone.make_aware(scanned_at)
                else:
                    scanned_at = timezone.now()

                validated_data.append({
                    "product_id": product_id,
                    "product_name": product_name,
                    "quantity": quantity,
                    "zone": zone,
                    "scanned_at": scanned_at,
                    "row_number": row_number,
                    "shelf_number": shelf_number
                })

            except ValueError as e:
                errors.append({
                    "row": row_num,
                    "data": row,
                    "error": f"Ошибка преобразования данных: {str(e)}"
                })
                continue
            except Exception as e:
                errors.append({
                    "row": row_num,
                    "data": row,
                    "error": str(e)
                })
                continue

        if errors:
            return Response({
                "error": "Файл содержит ошибки и не может быть загружен",
                "errors": errors[:10],
                "total_errors": len(errors),
                "message": f"Обнаружено ошибок: {len(errors)}. Исправьте файл и загрузите заново."
            }, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0

        for data in validated_data:
            try:
                # Создаем/получаем продукт, если его нет
                product, created = Product.objects.get_or_create(
                    id=data["product_id"],
                    defaults={
                        "name": data["product_name"],
                        "category": "Без категории",
                        "min_stock": 10,
                        "optimal_stock": data["quantity"]
                    }
                )

                InventoryCSVImport.objects.create(
                    product_id=data["product_id"],
                    product_name=data["product_name"],
                    quantity=data["quantity"],
                    zone=data["zone"],
                    scanned_at=data["scanned_at"],
                    row_number=data["row_number"],
                    shelf_number=data["shelf_number"],
                    status='OK'
                )

                created_count += 1

            except Exception as e:
                print(f"Unexpected error during save: {str(e)}")
                continue

        response = {
            "message": f"Успешно загружено {created_count} записей",
            "created_count": created_count,
        }

        if warnings:
            response["warnings"] = warnings[:10]
            response["total_warnings"] = len(warnings)

        return Response(response, status=status.HTTP_200_OK)
