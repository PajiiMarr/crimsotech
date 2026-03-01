# api/routing.py
from django.urls import re_path
from . import consumers

# WebSocket URL patterns
websocket_urlpatterns = [
    # Chat with specific user
    re_path(
        r'ws/chat/user/(?P<user_id>[^/]+)/$', 
        consumers.ChatConsumer.as_asgi()
    ),
    
    # Chat with specific conversation ID
    re_path(
        r'ws/chat/(?P<conversation_id>[^/]+)/$', 
        consumers.ChatConsumer.as_asgi()
    ),
    
    # General chat endpoint
    re_path(r'ws/chat/$', consumers.ChatConsumer.as_asgi()),
]