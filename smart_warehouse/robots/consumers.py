import json
from channels.generic.websocket import AsyncWebsocketConsumer

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Присоединяем пользователя к группе "dashboard"
        await self.channel_layer.group_add("dashboard", self.channel_name)
        await self.accept()
        print(f"{self.channel_name} connected")

    async def disconnect(self, close_code):
        # Убираем пользователя из группы
        await self.channel_layer.group_discard("dashboard", self.channel_name)
        print(f"{self.channel_name} disconnected")

    # Получение сообщений от группы
    async def send_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    # Можно принимать сообщения от клиента, если нужно
    async def receive(self, text_data):
        data = json.loads(text_data)
        print("Received from client:", data)
