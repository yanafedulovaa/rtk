from datetime import datetime
from django.db import transaction


class AIPredictionService:
    """Сервис для работы с AI-прогнозами"""

    @staticmethod
    def save_prediction(prediction_data, product):
        """
        Сохраняет прогноз в базу данных.

        """
        from warehouse.models import AIPrediction

        metrics = prediction_data.get('metrics', {})

        prediction = AIPrediction.objects.create(
            product=product,
            days_until_stockout=prediction_data['days_until_stockout'],
            recommended_order=prediction_data['recommended_order_quantity'],
            confidence_score=prediction_data['confidence_score'],
            current_stock_at_prediction=metrics.get('current_stock'),
            avg_daily_consumption=metrics.get('avg_daily_consumption'),
            seasonal_factor=metrics.get('seasonal_factor', 1.0),
            model_version=prediction_data.get('model_version', 'unknown'),
            is_active=True
        )

        return prediction

    @staticmethod
    def save_batch_predictions(predictions_list):
        """
        Сохраняет множество прогнозов за одну транзакцию.

        """
        from warehouse.models import AIPrediction

        with transaction.atomic():
            predictions_to_create = []

            for item in predictions_list:
                prediction_data = item['prediction']
                product = item['product']
                metrics = prediction_data.get('metrics', {})

                predictions_to_create.append(
                    AIPrediction(
                        product=product,
                        days_until_stockout=prediction_data['days_until_stockout'],
                        recommended_order=prediction_data['recommended_order_quantity'],
                        confidence_score=prediction_data['confidence_score'],
                        current_stock_at_prediction=metrics.get('current_stock'),
                        avg_daily_consumption=metrics.get('avg_daily_consumption'),
                        seasonal_factor=metrics.get('seasonal_factor', 1.0),
                        model_version=prediction_data.get('model_version', 'unknown'),
                        is_active=True
                    )
                )

            AIPrediction.objects.bulk_create(predictions_to_create)

    @staticmethod
    def get_latest_prediction(product):
        """Получает последний активный прогноз для продукта"""
        from warehouse.models import AIPrediction

        return AIPrediction.objects.filter(
            product=product,
            is_active=True
        ).first()

    @staticmethod
    def get_prediction_history(product, limit=10):
        """Получает историю прогнозов для продукта"""
        from warehouse.models import AIPrediction

        return AIPrediction.objects.filter(
            product=product
        )[:limit]

    @staticmethod
    def deactivate_old_predictions(product):
        """Деактивирует старые прогнозы для продукта"""
        from warehouse.models import AIPrediction

        AIPrediction.objects.filter(
            product=product,
            is_active=True
        ).update(is_active=False)