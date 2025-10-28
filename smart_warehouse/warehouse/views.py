from rest_framework.views import APIView
from rest_framework.response import Response
import random
from django.utils import timezone
from datetime import timedelta
from .models import InventoryHistory

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


