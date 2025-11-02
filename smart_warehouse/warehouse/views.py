from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
import random
from django.utils import timezone
from datetime import timedelta
from .models import InventoryHistory
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import AIPrediction
from products.models import Product  # замените на вашу модель
from .serializers import (
    PredictionRequestSerializer,
    PredictionResponseSerializer,
    AIPredictionSerializer
)
from .services import AIPredictionService, PredictionProviderFactory


class WarehousePredictAPIView(APIView):
    """
    API для получения и обновления AI-прогнозов.

    GET - Получить последние прогнозы из БД (топ-5 критических товаров)
    POST - Обновить прогнозы (пересчитать через AI и сохранить в БД)
    """

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='limit',
                type=int,
                description='Количество товаров для прогноза (по умолчанию 5)',
                required=False,
                default=5
            ),
        ],
        responses={200: AIPredictionSerializer(many=True)},
        description='Получить последние прогнозы из БД (топ-5 критических товаров)'
    )
    def get(self, request):
        """
        Получает последние прогнозы из БД.
        Показывает товары с самым коротким временем до исчерпания (критические).
        """
        limit = int(request.query_params.get('limit', 5))

        # Получаем последние активные прогнозы, отсортированные по критичности
        # (чем меньше days_until_stockout, тем критичнее)
        predictions = AIPrediction.objects.filter(
            is_active=True
        ).select_related('product').order_by(
            'product_id',  # Должно быть первым
            'days_until_stockout',  # Затем по критичности
            '-prediction_date'  # И по дате
        ).distinct('product_id')[:limit]

        if not predictions.exists():
            return Response({
                "message": "Прогнозы отсутствуют. Нажмите 'Обновить прогноз'",
                "predictions": [],
                "count": 0
            }, status=status.HTTP_200_OK)

        serializer = AIPredictionSerializer(predictions, many=True)

        return Response({
            "predictions": serializer.data,
            "count": len(serializer.data),
            "last_update": predictions.first().prediction_date if predictions else None
        }, status=status.HTTP_200_OK)

    @extend_schema(
        request=PredictionRequestSerializer,
        responses={200: PredictionResponseSerializer(many=True)},
        description='Обновить прогнозы (пересчитать через AI)'
    )
    def post(self, request):
        """
        Обновляет прогнозы:
        1. Получает список товаров
        2. Вызывает AI-провайдер для расчета новых прогнозов
        3. Деактивирует старые прогнозы
        4. Сохраняет новые прогнозы в БД
        5. Возвращает новые прогнозы
        """
        limit = int(request.data.get('limit', 20))  # Рассчитываем для 20 товаров

        try:

            provider = PredictionProviderFactory.get_provider()

            products = Product.objects.all()[:limit]

            if not products.exists():
                return Response({
                    "error": "No products found"
                }, status=status.HTTP_404_NOT_FOUND)

            AIPrediction.objects.filter(is_active=True).update(is_active=False)

            new_predictions = []
            predictions_to_save = []

            for product in products:

                prediction_data = provider.predict(product.id)

                predictions_to_save.append({
                    'prediction': prediction_data,
                    'product': product
                })

                new_predictions.append(prediction_data)

            AIPredictionService.save_batch_predictions(predictions_to_save)

            critical_predictions = sorted(
                new_predictions,
                key=lambda x: x['days_until_stockout']
            )[:5]

            return Response({
                "message": "Прогнозы успешно обновлены",
                "predictions": critical_predictions,
                "total_calculated": len(new_predictions),
                "top_critical": len(critical_predictions)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": "Failed to update predictions",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictionHistoryAPIView(APIView):
    """
    API для получения истории прогнозов по товару.
    """

    @extend_schema(
        responses={200: AIPredictionSerializer(many=True)},
        description='Получить историю прогнозов для товара'
    )
    def get(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        limit = int(request.query_params.get('limit', 10))

        history = AIPredictionService.get_prediction_history(product, limit)
        serializer = AIPredictionSerializer(history, many=True)

        return Response({
            "product_id": product_id,
            "product_name": product.name,
            "history": serializer.data,
            "count": len(serializer.data)
        }, status=status.HTTP_200_OK)


class RobotActivityAPIView(APIView):
    def get(self, request):
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)

        scans = InventoryHistory.objects.filter(scanned_at__gte=one_hour_ago)

        data = []
        for i in range(60):
            minute_start = one_hour_ago + timedelta(minutes=i)
            minute_end = minute_start + timedelta(minutes=1)
            count = scans.filter(scanned_at__gte=minute_start, scanned_at__lt=minute_end).count()
            data.append({
                "time": minute_start.strftime("%H:%M"),
                "scans": count
            })

        return Response({"activity": data})


