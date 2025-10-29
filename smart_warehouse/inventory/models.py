from django.db import models

class InventoryCSVImport(models.Model):
    product_id = models.CharField(max_length=50)
    product_name = models.CharField(max_length=255)

    quantity = models.IntegerField()
    zone = models.CharField(max_length=10)
    row_number = models.IntegerField(null=True, blank=True)
    shelf_number = models.IntegerField(null=True, blank=True)
    scanned_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50)


    # @property
    # def status(self) -> str:
    #     """Вычисляет статус на основе quantity"""
    #     if self.quantity is None:
    #         return "-"
    #     elif self.quantity <= 5:
    #         return "CRITICAL"
    #     elif self.quantity <= 20:
    #         return "LOW_STOCK"
    #     else:
    #         return "OK"


    class Meta:
        verbose_name = "Импорт CSV"
        verbose_name_plural = "Импорты CSV"

    def __str__(self):
        return f"{self.product_name} ({self.product_id}) - {self.quantity} шт. в зоне {self.zone}"