"""
Провайдеры для получения прогнозов.
Реализуют паттерн Strategy для легкой замены источника прогнозов.
"""
import random
from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal


class PredictionProvider(ABC):
    """Абстрактный интерфейс для провайдера прогнозов"""

    @abstractmethod
    def predict(self, product_id):
        """Получить прогноз для одного продукта"""
        pass

    @abstractmethod
    def batch_predict(self, product_ids):
        """Получить прогнозы для списка продуктов"""
        pass


class MockPredictionProvider(PredictionProvider):
    """
    Mock-реализация для разработки и тестирования.
    Имитирует работу ML-модели с учетом "исторических данных".
    """

    def predict(self, product_id):
        """Генерирует прогноз для одного продукта"""
        historical_data = self._get_mock_historical_data(product_id)

        # "Расчет" среднего потребления
        avg_daily_consumption = historical_data['avg_daily_sales']
        current_stock = historical_data['current_stock']
        seasonal_factor = historical_data['seasonal_factor']

        # Прогноз с учетом "сезонности"
        adjusted_consumption = avg_daily_consumption * seasonal_factor

        # Расчет дней до исчерпания запасов
        if adjusted_consumption > 0:
            days_until_stockout = max(1, int(current_stock / adjusted_consumption))
        else:
            days_until_stockout = 999

        # Рекомендуемое количество заказа
        safety_stock_days = 7
        lead_time_days = 5
        recommended_order = int(adjusted_consumption * (safety_stock_days + lead_time_days))

        # Уровень уверенности
        confidence = self._calculate_mock_confidence(historical_data)

        return {
            "product_id": product_id,
            "prediction_date": datetime.now().isoformat(),
            "days_until_stockout": days_until_stockout,
            "recommended_order_quantity": recommended_order,
            "confidence_score": confidence,
            "metrics": {
                "current_stock": current_stock,
                "avg_daily_consumption": round(adjusted_consumption, 2),
                "seasonal_factor": seasonal_factor,
                "reorder_point": int(adjusted_consumption * lead_time_days)
            },
            "model_version": "mock_v1"
        }

    def batch_predict(self, product_ids):
        """Генерирует прогнозы для списка продуктов"""
        return [self.predict(pid) for pid in product_ids]

    def _get_mock_historical_data(self, product_id):
        """
        Имитация получения исторических данных.
        В реальности: запрос к БД за последние N дней продаж.
        """
        # Базовое потребление зависит от product_id для консистентности
        random.seed(hash(product_id) % 10000)
        base_consumption = random.uniform(2.0, 8.0)
        current_stock = random.randint(10, 100)

        # Сезонность (зима - больше продаж)
        current_month = datetime.now().month
        seasonal_factor = 1.3 if current_month in [11, 12, 1, 2] else 1.0

        # Сбрасываем seed для дальнейшей случайности
        random.seed()

        return {
            "avg_daily_sales": base_consumption,
            "current_stock": current_stock,
            "seasonal_factor": seasonal_factor,
            "sales_variance": random.uniform(0.1, 0.3),
            "trend": random.choice(["increasing", "stable", "decreasing"])
        }

    def _calculate_mock_confidence(self, historical_data):
        """
        Имитация расчета уровня уверенности модели.
        В реальности: метрики качества ML-модели (R², RMSE и т.д.)
        """
        variance = historical_data['sales_variance']

        if variance < 0.15:
            confidence = random.uniform(0.85, 0.95)
        elif variance < 0.25:
            confidence = random.uniform(0.70, 0.85)
        else:
            confidence = random.uniform(0.50, 0.70)

        return round(confidence, 2)


class ExternalAIPredictionProvider(PredictionProvider):
    """
    Заглушка для будущей интеграции с внешним AI-сервисом.
    Когда появится реальный API, здесь будет HTTP-клиент.
    """

    def __init__(self, api_key, endpoint):
        self.api_key = api_key
        self.endpoint = endpoint

    def predict(self, product_id):
        """
        TODO: Реализовать HTTP запрос к реальному API

        import requests
        response = requests.post(
            f"{self.endpoint}/predict",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"product_id": product_id},
            timeout=10
        )
        return response.json()
        """
        raise NotImplementedError("External AI provider not configured yet")

    def batch_predict(self, product_ids):
        """TODO: Batch prediction via external API"""
        raise NotImplementedError("External AI provider not configured yet")


class PredictionProviderFactory:
    """Фабрика для создания нужного провайдера прогнозов"""

    @staticmethod
    def get_provider():
        """
        Создает провайдер на основе настроек Django.
        Позволяет легко переключаться между mock и реальным API.
        """
        from django.conf import settings

        provider_type = getattr(settings, 'PREDICTION_PROVIDER', 'mock')

        if provider_type == 'mock':
            return MockPredictionProvider()
        elif provider_type == 'external_api':
            api_key = getattr(settings, 'AI_API_KEY', '')
            endpoint = getattr(settings, 'AI_API_ENDPOINT', '')
            return ExternalAIPredictionProvider(api_key, endpoint)
        else:
            raise ValueError(f"Unknown prediction provider: {provider_type}")