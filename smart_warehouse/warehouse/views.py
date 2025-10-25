# warehouse/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
import random

class WarehousePredictMockAPIView(APIView):
    """
    Эмуляция прогноза запасов без внешнего API.
    """
    def get(self, request):
        # Список продуктов для примера
        products = [
            {"product_id": "TEL-4567", "name": "Роутер RT-AC68U"},
            {"product_id": "TEL-8901", "name": "Модем DSL-2640U"},
            {"product_id": "TEL-2345", "name": "Коммутатор SG-108"},
        ]

        predictions = []
        for p in products:
            predictions.append({
                "product_id": p["product_id"],
                "days_until_stockout": random.randint(1, 10),  # случайное число дней
                "recommended_order_quantity": random.randint(10, 100)  # случайное количество
            })

        return Response({"predictions": predictions})
