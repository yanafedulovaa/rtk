from django.contrib import admin
from django.urls import path, include
from .views import InventoryHistoryView, InventoryTrendView, InventoryExportPDFView, InventoryExportExcelView, InventoryUploadView

urlpatterns = [
    path('history/', InventoryHistoryView.as_view(), name='history'),
    path('trend/', InventoryTrendView.as_view(), name='trend'),
    path("export/excel/", InventoryExportExcelView.as_view(), name="inventory_export_excel"),
    path("export/pdf/", InventoryExportPDFView.as_view(), name="inventory_export_pdf"),
    path('upload/', InventoryUploadView.as_view(), name='inventory_upload')
]
