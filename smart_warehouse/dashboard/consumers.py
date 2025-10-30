# dashboard/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from robots.models import Robot
from warehouse.models import InventoryHistory


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'dashboard_updates'

        # Присоединяемся к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Отправляем начальные данные при подключении
        initial_data = await self.get_initial_data()
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'data': initial_data
        }))

    async def disconnect(self, close_code):
        # Покидаем группу
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # Обработка сообщений от клиента (если нужно)
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong'
            }))

    # Обработчики сообщений от группы
    async def robot_update(self, event):
        """Обновление данных робота"""
        await self.send(text_data=json.dumps({
            'type': 'robot_update',
            'data': event['data']
        }))

    async def inventory_alert(self, event):
        """Критический остаток"""
        await self.send(text_data=json.dumps({
            'type': 'inventory_alert',
            'data': event['data']
        }))

    async def new_scan(self, event):
        """Новое сканирование"""
        await self.send(text_data=json.dumps({
            'type': 'new_scan',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_initial_data(self):
        """Получение начальных данных"""
        robots = Robot.objects.all()
        recent_scans = InventoryHistory.objects.order_by('-scanned_at')[:20]

        return {
            'robots': [
                {
                    'id': r.id,
                    'battery': r.battery_level,
                    'zone': r.current_zone,
                    'row': r.current_row,
                    'shelf': r.current_shelf,
                    'status': self.get_robot_status(r),
                    'last_update': r.last_update.isoformat() if r.last_update else None
                } for r in robots
            ],
            'recent_scans': [
                {
                    'time': s.scanned_at.isoformat(),
                    'robot_id': s.robot_id,
                    'zone': s.zone,
                    'product': s.product.name,
                    'quantity': s.quantity,
                    'status': s.status,
                } for s in recent_scans
            ]
        }

    @staticmethod
    def get_robot_status(robot):
        if robot.battery_level <= 20:
            return "low_battery"
        if not robot.is_active:
            return "offline"
        return "active"