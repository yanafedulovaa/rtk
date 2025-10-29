import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import robots.routing  # создадим ниже

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smart_warehouse.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            robots.routing.websocket_urlpatterns
        )
    ),
})
