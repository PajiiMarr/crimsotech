# backend/asgi.py
import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
# Remove this import if not needed
# from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from api.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": 
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        ),
    # Remove AllowedHostsOriginValidator for now to test
})