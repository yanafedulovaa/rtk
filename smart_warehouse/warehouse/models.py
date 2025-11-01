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

    scanned_at = models.DateTimeField(null=True)
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



class AIPrediction(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='ai_prediction')
    prediction_date = models.DateTimeField(auto_now_add=True)
    days_until_stockout = models.IntegerField()
    recommended_order = models.IntegerField()
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2)


    current_stock_at_prediction = models.IntegerField(
        null=True,
        blank=True
    )
    avg_daily_consumption = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    seasonal_factor = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=1.0
    )

    model_version = models.CharField(
        max_length=50,
        default='mock_v1'
    )
    is_active = models.BooleanField(
        default=True
    )

    class Meta:
        db_table = 'ai_predictions'
        ordering = ['-prediction_date']
        indexes = [
            models.Index(fields=['product', '-prediction_date']),
            models.Index(fields=['is_active', 'days_until_stockout']),  # Для критических прогнозов
        ]
        verbose_name = 'AI Прогноз'
        verbose_name_plural = 'AI Прогнозы'

    def __str__(self):
        return f"Прогноз для {self.product.name} от {self.prediction_date.date()}"

    @property
    def is_critical(self):
        """Критический ли прогноз (меньше 7 дней до исчерпания)"""
        return self.days_until_stockout <= 7

    @property
    def predicted_stockout_date(self):
        """Прогнозируемая дата исчерпания запасов"""
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now().date() + timedelta(days=self.days_until_stockout)