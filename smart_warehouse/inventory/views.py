import io

from django.db.models import F, Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from warehouse.models import InventoryHistory
from .serializers import InventoryItemSerializer
from rest_framework.pagination import PageNumberPagination
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from django.http import HttpResponse

class InventoryPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class InventoryHistoryView(APIView):
    """
    // Исторические данные
    GET /api/inventory/history?from=date&to=date&zone=A&status=critical
    Response: { total: number, items: [], pagination: {} }
    """

    def get(self, request):
        queryset = InventoryHistory.objects.all().order_by('-scanned_at')

        from_date = request.GET.get('from')   # YYYY-MM-DD
        to_date = request.GET.get('to')
        zone = request.GET.get('zone')        # например "A"
        status_filter = request.GET.get('status')  # "OK", "LOW_STOCK", "CRITICAL"
        search = request.GET.get('search')    # поиск по product_name или product_id

        if from_date:
            queryset = queryset.filter(scanned_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(scanned_at__date__lte=to_date)
        if zone:
            queryset = queryset.filter(zone__iexact=zone)
        if status_filter and status_filter.lower() != "all":
            queryset = queryset.filter(status__iexact=status_filter)
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search) | Q(product_id__exact=search)
            )

        ordering = request.GET.get('ordering')
        if ordering:
            queryset = queryset.order_by(ordering)

        total_checks = queryset.count()
        unique_products = queryset.values('product_id').distinct().count()

        discrepancies = queryset.exclude(expected_quantity=F('quantity')).count() if 'expected_quantity' in [f.name for f in InventoryHistory._meta.get_fields()] else 0

        summary = {
            "total_checks": total_checks,
            "unique_products": unique_products,
            "discrepancies": discrepancies,
            "avg_time_per_zone": round(total_checks / 60, 2) if total_checks else 0
        }

        paginator = InventoryPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = InventoryItemSerializer(paginated_queryset, many=True)

        pagination_info = {
            'page': paginator.page.number,
            'page_size': paginator.page.paginator.per_page,
            'total_pages': paginator.page.paginator.num_pages,
            'total_items': paginator.page.paginator.count,
            'has_next': paginator.page.has_next(),
            'has_previous': paginator.page.has_previous()
        }

        response_data = {
            "total": total_checks,
            "items": serializer.data,
            "summary": summary,
            "pagination": pagination_info
        }

        return Response(response_data, status=200)


class InventoryTrendView(APIView):
    def get(self, request):
        product_filter = request.GET.get('products')
        if product_filter:
            products = product_filter.split(',')
            queryset = InventoryHistory.objects.filter(product_id__in=products)
        else:
            queryset = InventoryHistory.objects.all()

        data = {}
        for product in queryset.values_list('product_id', flat=True).distinct():
            records = queryset.filter(product_id=product).order_by('scanned_at')
            data[product] = [
                {'scanned_at': r.scanned_at, 'quantity': r.quantity} for r in records
            ]

        response = {
            'products': list(data.keys()),
            'data': data
        }

        return Response(response)


class InventoryExportMixin:
    """ Общая логика фильтрации для экспорта """

    def get_filtered_queryset(self, request):
        queryset = InventoryHistory.objects.all().order_by("-scanned_at")

        from_date = request.data.get("from")
        to_date = request.data.get("to")
        zone = request.data.get("zone")
        status_filter = request.data.get("status")
        search = request.data.get("search")
        ordering = request.data.get("ordering")
        ids = request.data.get("ids", [])

        # Если выбраны конкретные ID — приоритетно используем их
        if ids:
            queryset = queryset.filter(id__in=ids)
        else:
            if from_date:
                queryset = queryset.filter(scanned_at__date__gte=from_date)
            if to_date:
                queryset = queryset.filter(scanned_at__date__lte=to_date)
            if zone:
                queryset = queryset.filter(zone__iexact=zone)
            if status_filter and status_filter.lower() != "all":
                queryset = queryset.filter(status__iexact=status_filter)
            if search:
                queryset = queryset.filter(
                    Q(product__name__icontains=search) | Q(product_id__icontains=search)
                )
            if ordering:
                queryset = queryset.order_by(ordering)

        return queryset


class InventoryExportExcelView(InventoryExportMixin, APIView):
    def post(self, request):
        queryset = self.get_filtered_queryset(request)
        if not queryset.exists():
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        wb = Workbook()
        ws = wb.active
        ws.title = "Inventory Export"

        headers = ["ID", "Дата", "Зона", "Товар", "Кол-во", "Статус"]
        ws.append(headers)

        for item in queryset:
            ws.append([
                item.product_id,
                item.scanned_at.strftime("%Y-%m-%d %H:%M:%S"),
                item.zone,
                item.product.name if item.product else "",
                item.quantity,
                item.status
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
        queryset = self.get_filtered_queryset(request)
        if not queryset.exists():
            return Response({"error": "Нет данных для экспорта"}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "Отчёт по инвентаризации")
        y -= 30

        p.setFont("Helvetica", 10)
        headers = ["ID", "Дата", "Зона", "Товар", "Кол-во", "Статус"]
        p.drawString(50, y, " | ".join(headers))
        y -= 20

        for item in queryset:
            line = f"{item.product_id} | {item.scanned_at.strftime('%Y-%m-%d %H:%M:%S')} | {item.zone} | {item.product.name if item.product else ''} | {item.quantity} | {item.status}"
            p.drawString(50, y, line)
            y -= 15
            if y < 50:
                p.showPage()
                y = height - 50

        p.save()
        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="inventory_export.pdf"'
        return response