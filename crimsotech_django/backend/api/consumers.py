# api/consumers.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import User, Message, Conversation, ConversationParticipant

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Called when WebSocket connects"""
        self.user = self.scope['user']
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.other_user_id = self.scope['url_route']['kwargs'].get('user_id')
        
        if not self.conversation_id and self.other_user_id:
            self.conversation_id = self.get_conversation_id(
                str(self.user.id), 
                self.other_user_id
            )
        
        self.room_group_name = f'chat_{self.conversation_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.set_user_online(True)
        
        await self.accept()
        
        await self.send_conversation_history()
    
    async def disconnect(self, close_code):
        """Called when WebSocket disconnects"""
        await self.set_user_online(False)
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Called when message is received from WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        
        if message_type == 'message':
            await self.handle_chat_message(data)
        elif message_type == 'read_receipt':
            await self.handle_read_receipt(data)
        elif message_type == 'typing':
            await self.handle_typing(data)
        elif message_type == 'file_upload':
            await self.handle_file_upload(data)
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        message = await self.save_message_to_db(
            receiver_id=data['receiver_id'],
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            conversation_id=self.conversation_id
        )
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': str(message.id),
                'sender_id': str(self.user.id),
                'sender_name': self.user.username,
                'receiver_id': data['receiver_id'],
                'content': data['content'],
                'timestamp': str(message.created_at),
                'status': message.status
            }
        )
    
    async def handle_read_receipt(self, data):
        """Handle read receipt"""
        message_id = data['message_id']
        
        await self.mark_message_read(message_id)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'read_receipt',
                'message_id': message_id,
                'reader_id': str(self.user.id),
                'read_at': str(timezone.now())
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'is_typing': data.get('is_typing', True),
                'conversation_id': self.conversation_id
            }
        )
    
    async def handle_file_upload(self, data):
        """Handle file upload in chat"""
        pass
    
    async def chat_message(self, event):
        """Send message to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message_id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'content': event['content'],
            'timestamp': event['timestamp'],
            'status': event['status']
        }))
    
    async def read_receipt(self, event):
        """Send read receipt to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'reader_id': event['reader_id'],
            'read_at': event['read_at']
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))
    
    # Database operations (Supabase)
    @database_sync_to_async
    def save_message_to_db(self, receiver_id, content, message_type, conversation_id):
        """Save message to Supabase/PostgreSQL"""
        receiver = User.objects.get(id=receiver_id)
        
        message = Message.objects.create(
            sender=self.user,
            receiver=receiver,
            content=content,
            message_type=message_type,
            conversation_id=conversation_id,
            status='sent'
        )
        return message
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read in database"""
        message = Message.objects.get(id=message_id, receiver=self.user)
        message.mark_as_read()
        return message
    
    @database_sync_to_async
    def send_conversation_history(self):
        """Send last 50 messages from Supabase"""
        messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).select_related('sender', 'receiver').order_by('-created_at')[:50]
        
        history = []
        for msg in reversed(messages):  # Reverse to show oldest first
            history.append({
                'id': str(msg.id),
                'sender_id': str(msg.sender.id),
                'sender_name': msg.sender.username,
                'content': msg.content,
                'timestamp': str(msg.created_at),
                'status': msg.status,
                'message_type': msg.message_type
            })
        
        # Send history to client
        self.send(text_data=json.dumps({
            'type': 'conversation_history',
            'messages': history
        }))
    
    @database_sync_to_async
    def set_user_online(self, is_online):
        """Track user online status in conversation"""
        # You can add online tracking in your models
        pass
    
    def get_conversation_id(self, user1_id, user2_id):
        """Generate consistent conversation ID"""
        ids = sorted([str(user1_id), str(user2_id)])
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{ids[0]}_{ids[1]}"))