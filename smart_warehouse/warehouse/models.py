from datetime import timedelta

from django.db import models
from django.utils import timezone
from products.models import Product
from robots.models import Robot

class InventoryHistory(models.Model):
    robot = models.ForeignKey(
        'robots.Robot',
        on_delete=models.CASCADE,
        db_column='robot_id'
    )

    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        db_column='product_id'
    )
    expected_quantity = models.IntegerField(null=True, blank=True)
    quantity = models.IntegerField(null=False)
    zone = models.CharField(max_length=10, null=False)
    row_number = models.IntegerField(null=True, blank=True)
    shelf_number = models.IntegerField(null=True, blank=True)

    status = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[('OK', 'OK'), ('LOW_STOCK', 'LOW_STOCK'), ('CRITICAL', 'CRITICAL')]
    )

    scanned_at = models.DateTimeField(null=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def difference(self):
        expected = self.expected_quantity or 0
        return self.quantity - expected

    @property
    def session_status(self):
        now = timezone.now()
        if self.status == 'CRITICAL':
            return 'CRITICAL'
        elif self.scanned_at >= (now - timedelta(hours=1)):
            return 'CHECKED RECENTLY'
        else:
            return 'NEED_CHECK'



    class Meta:
        db_table = 'inventory_history'

    def __str__(self):
        return f'{self.product} - {self.robot} at {self.scanned_at}'

