from datetime import datetime, timezone as dt_timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Robot
from warehouse.models import InventoryHistory
from products.models import Product


class RobotTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        robot_id = request.data.get('robot_id')
        secret = request.data.get('secret')

        try:
            robot = Robot.objects.get(robot_id=robot_id, secret=secret, is_active=True)
        except Robot.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken()
        refresh['robot_id'] = robot.robot_id

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

        # Преобразуем строку времени в datetime с UTC
        try:
            last_update = datetime.fromisoformat(timestamp.replace("Z", "")).replace(tzinfo=dt_timezone.utc)
        except ValueError:
            return Response({"error": "Invalid timestamp format"}, status=status.HTTP_400_BAD_REQUEST)

        robot, _ = Robot.objects.update_or_create(
            id=robot_id,
            defaults={
                "battery_level": battery,
                "last_update": last_update,
                "current_zone": location.get("zone"),
                "current_row": location.get("row"),
                "current_shelf": location.get("shelf"),
            }
        )

        for scan in scans:
            product_id = scan.get("product_id")
            quantity = scan.get("quantity")
            status_text = scan.get("status")
            product_name = scan.get("product_name", "")

            if not product_id or quantity is None:
                continue  # Пропускаем некорректные записи

            product, _ = Product.objects.get_or_create(
                id=product_id,
                defaults={"name": product_name}
            )

            InventoryHistory.objects.create(
                robot_id=robot.id,
                product_id=product.id,
                quantity=quantity,
                zone=robot.current_zone,
                row_number=robot.current_row,
                shelf_number=robot.current_shelf,
                status=status_text,
                scanned_at=last_update
            )

        return Response({"status": "received"}, status=status.HTTP_200_OK)
