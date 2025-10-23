from django.db.models.functions import datetime
from datetime import datetime
from django.shortcuts import render
from django.utils import timezone
from rest_framework import request, status
from rest_framework.views import APIView
from .models import Robot
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from warehouse.models import InventoryHistory
from products.models import Product

class RobotTokenView(APIView):
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
            'reresh': str(refresh),
        })
class RobotScanView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # robot = request.user
        data = request.data

        robot_id = data.get("robot_id")
        location = data.get('location')
        battery = data.get('battery_level')
        scans = data.get('scan_results', [])
        timestamp = data.get('timestamp')

        if not robot_id or not location:
            return Response({"error": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST)

        robot, _ = Robot.objects.update_or_create(
            id=robot_id,
            defaults={
                "battery_level": battery,
                "last_update": datetime.fromisoformat(timestamp.replace("Z","")),
                "current_zone": location.get("zone"),
                "current_row": location.get("row"),
                "current_shelf": location.get("shelf"),
            }
        )

        for scan in scans:
            product_id = scan["product_id"]
            quantity = scan["quantity"]
            status_text = scan["status"]

            product, _ = Product.objects.get_or_create(
                id=product_id,
                defaults={"name": scan["product_name"]}
            )

            InventoryHistory.objects.create(
                robot_id=robot.id,
                product_id=product_id,
                quantity=quantity,
                zone=robot.current_zone,
                row_number=robot.current_row,
                shelf_number=robot.current_shelf,
                status=status_text,
                scanned_at=data.get("timestamp", robot.id)
            )

        return Response({"status": "received"}, status=status.HTTP_200_OK)