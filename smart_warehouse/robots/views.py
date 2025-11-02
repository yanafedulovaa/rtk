from datetime import datetime, timezone as dt_timezone, time
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Robot
from warehouse.models import InventoryHistory
from products.models import Product


class RobotTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        robot_id = request.data.get('robot_id')
        secret = request.data.get('secret')

        try:
            robot = Robot.objects.get(id=robot_id, is_active=True)
        except Robot.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken()
        refresh['robot_id'] = robot.id

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class RobotScanView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        data = request.data

        robot_id = data.get("robot_id")
        location = data.get('location')
        battery = data.get('battery_level')
        scans = data.get('scan_results', [])
        timestamp = data.get('timestamp')

        if not robot_id or not location or not timestamp:
            return Response({"error": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            last_update = datetime.fromisoformat(timestamp.replace("Z", "")).replace(tzinfo=dt_timezone.utc)
        except ValueError:
            return Response({"error": "Invalid timestamp format"}, status=status.HTTP_400_BAD_REQUEST)

        robot, created = Robot.objects.update_or_create(
            id=robot_id,
            defaults={
                "battery_level": battery,
                "last_update": last_update,
                "current_zone": location.get("zone"),
                "current_row": location.get("row"),
                "current_shelf": location.get("shelf"),
                "is_active": True,
                "status": "active" if battery > 20 else "low_battery",
            }
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'dashboard_updates',
                {
                    'type': 'robot_update',
                    'data': {
                        'id': robot.id,
                        'battery': robot.battery_level,
                        'zone': robot.current_zone,
                        'row': robot.current_row,
                        'shelf': robot.current_shelf,
                        'status': self.get_robot_status(robot),
                        'last_update': last_update.isoformat()
                    }
                }
            )

        # Получаем актуальную статистику один раз перед циклом
        today_start = timezone.make_aware(
            datetime.combine(timezone.now().date(), time.min)
        )
        today_scans = InventoryHistory.objects.filter(scanned_at__gte=today_start)

        for scan in scans:
            product_id = scan.get("product_id")
            quantity = scan.get("quantity")
            status_text = scan.get("status")
            product_name = scan.get("product_name", "")

            if not product_id or quantity is None:
                continue

            product, _ = Product.objects.get_or_create(
                id=product_id,
                defaults={"name": product_name}
            )

            inventory = InventoryHistory.objects.create(
                robot_id=robot.id,
                product_id=product.id,
                quantity=quantity,
                zone=robot.current_zone,
                row_number=robot.current_row,
                shelf_number=robot.current_shelf,
                status=status_text,
                scanned_at=last_update
            )

            # Пересчитываем статистику после создания записи
            today_scans_count = today_scans.count() + 1  # +1 за только что созданную запись
            critical_count = today_scans.filter(status="CRITICAL").count()
            if status_text == "CRITICAL":
                critical_count += 1  # +1 если текущая запись критическая

            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'dashboard_updates',
                    {
                        'type': 'new_scan',
                        'data': {
                            'time': last_update.isoformat(),
                            'robot_id': robot.id,
                            'zone': robot.current_zone,
                            'row': robot.current_row,
                            'product': product.name,
                            'product_id': product_id,
                            'quantity': quantity,
                            'status': status_text,
                            # ✅ ДОБАВЛЯЕМ: Актуальную статистику
                            'statistics': {
                                'checked_today': today_scans_count,
                                'critical_stock': critical_count,
                            }
                        }
                    }
                )

            if status_text == "CRITICAL" and channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'dashboard_updates',
                    {
                        'type': 'inventory_alert',
                        'data': {
                            'product_id': product_id,
                            'product_name': product.name,
                            'quantity': quantity,
                            'zone': robot.current_zone,
                            'timestamp': last_update.isoformat()
                        }
                    }
                )

        return Response({"status": "received"}, status=status.HTTP_200_OK)

    @staticmethod
    def get_robot_status(robot):
        if robot.battery_level <= 20:
            return "low_battery"
        if not robot.is_active:
            return "offline"
        return "active"