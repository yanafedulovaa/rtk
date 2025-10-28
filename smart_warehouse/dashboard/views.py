from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from robots.models import Robot
from warehouse.models import InventoryHistory

def get_status(robot):
    if robot.battery_level <= 20:
        return "low_battery"
    if not robot.is_active:  # если есть поле активности
        return "offline"
    return "active"
class DashboardCurrentView(APIView):
    def get(self, request):
        robots = Robot.objects.all()
        recent_scans = InventoryHistory.objects.order_by('-scanned_at')[:20]

        stats = {
            'active_robots': robots.count(),
            'checked_today': InventoryHistory.objects.count(),
            'critical_stock': InventoryHistory.objects.filter(status="CRITICAL").count(),
            'avg_battery': round(sum(r.battery_level for r in robots) / (robots.count()))
        }

        return Response({
            "robots": [
                {
                    'id': r.id,
                    'battery': r.battery_level,
                    'zone': r.current_zone,
                    'row': r.current_row,
                    'shelf': r.current_shelf,
                    'status': get_status(r),
                } for r in robots
            ],
            "recent_scans": [
                {
                    'time': s.scanned_at,
                    'robot_id': s.robot_id,
                    'product': s.product.name,
                    'quantity': s.quantity,
                    'status': s.status,
                    'session_status': s.session_status
                } for s in recent_scans
            ],
            'statistics': stats
        })
