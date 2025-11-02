from datetime import datetime, time

from django.shortcuts import render
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Max, OuterRef, Subquery
from robots.models import Robot
from warehouse.models import InventoryHistory


def get_status(robot):
    if robot.battery_level <= 20:
        return "low_battery"
    if not robot.is_active:
        return "offline"
    return "active"


class DashboardCurrentView(APIView):
    def get(self, request):
        robots = Robot.objects.all()
        recent_scans = InventoryHistory.objects.order_by('-scanned_at')[:20]

        today_start = timezone.make_aware(
            datetime.combine(timezone.now().date(), time.min)
        )
        today_scans = InventoryHistory.objects.filter(scanned_at__gte=today_start)
        stats = {
            'active_robots': robots.filter(is_active=True).count(),
            'checked_today': today_scans.count(),
            'critical_stock': today_scans.filter(status="CRITICAL").count(),
            'avg_battery': round(sum(r.battery_level for r in robots) / robots.count()) if robots.count() > 0 else 0
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


class ZoneStatusAPIView(APIView):
    """API endpoint для получения последнего статуса всех зон склада"""

    def get(self, request):
        zones_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        rows_count = 50
        zone_status = {}

        # Используем select_related для оптимизации обращения к product
        all_scans = InventoryHistory.objects.select_related('product').filter(
            zone__in=list(zones_letters),
            row_number__isnull=False
        ).order_by('zone', 'row_number', '-scanned_at')

        # Создаем словарь для группировки по зоне и ряду
        latest_scans = {}
        for scan in all_scans:
            key = (scan.zone, scan.row_number)
            if key not in latest_scans:
                latest_scans[key] = scan


        for zone in zones_letters:
            for row in range(1, rows_count + 1):
                cell_key = f"{zone}{row}"
                scan = latest_scans.get((zone, row))

                if scan:
                    zone_status[cell_key] = {
                        'time': scan.scanned_at.isoformat() if scan.scanned_at else None,
                        'status': scan.status,
                        'quantity': scan.quantity,
                        'product': scan.product.name if scan.product else None,
                        'product_id': str(scan.product.id) if scan.product else None,
                        'robot_id': str(scan.robot_id),
                        'zone': zone,
                        'row': row,
                    }
                else:
                    zone_status[cell_key] = None

        return Response(zone_status)