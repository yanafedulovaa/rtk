from rest_framework import serializers
from .models import AIPrediction
from django.utils import timezone
from datetime import timedelta


class AIPredictionSerializer(serializers.ModelSerializer):
    """Сериализатор для прогнозов ИИ"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.CharField(source='product.id', read_only=True)
    predicted_stockout_date = serializers.SerializerMethodField()
    is_critical = serializers.SerializerMethodField()
    confidence_percentage = serializers.SerializerMethodField()

    class Meta:
        model = AIPrediction
        fields = [
            'id',
            'product_id',
            'product_name',
            'prediction_date',
            'days_until_stockout',
            'predicted_stockout_date',
            'recommended_order',
            'confidence_score',
            'confidence_percentage',
            'current_stock_at_prediction',
            'avg_daily_consumption',
            'seasonal_factor',
            'model_version',
            'is_active',
            'is_critical'
        ]
        read_only_fields = ['id', 'prediction_date']

    def get_predicted_stockout_date(self, obj):
        """Прогнозируемая дата исчерпания запасов"""
        return (timezone.now().date() + timedelta(days=obj.days_until_stockout)).isoformat()

    def get_is_critical(self, obj):
        """Критический ли прогноз (меньше 7 дней)"""
        return obj.days_until_stockout <= 7

    def get_confidence_percentage(self, obj):
        """Уровень уверенности в процентах"""
        return int(float(obj.confidence_score) * 100)


class PredictionRequestSerializer(serializers.Serializer):
    """Сериализатор для запроса обновления прогноза"""
    limit = serializers.IntegerField(
        required=False,
        default=20,
        help_text="Количество товаров для расчета прогноза"
    )


class PredictionResponseSerializer(serializers.Serializer):
    """Сериализатор для ответа с прогнозом"""
    product_id = serializers.CharField()
    prediction_date = serializers.DateTimeField()
    days_until_stockout = serializers.IntegerField()
    recommended_order_quantity = serializers.IntegerField()
    confidence_score = serializers.FloatField()
    metrics = serializers.DictField()
    model_version = serializers.CharField()