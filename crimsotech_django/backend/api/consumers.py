# api/consumers.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Called when WebSocket connects"""
        self.user = None
        self.conversation_id = None
        self.room_group_name = None
        await self.accept()
    
    async def receive(self, text_data):
        """Called when message is received from WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'authenticate':
            await self.handle_authenticate(data)
        elif not self.user:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Not authenticated'
            }))
            return
        elif message_type == 'message':
            await self.handle_chat_message(data)
        elif message_type == 'read_receipt':
            await self.handle_read_receipt(data)
        elif message_type == 'typing':
            await self.handle_typing(data)
        elif message_type == 'file_upload':
            await self.handle_file_upload(data)
    
    async def handle_authenticate(self, data):
        """Handle authentication"""
        user_id = data.get('user_id')
        if not user_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'User ID required'
            }))
            await self.close()
            return
        
        # Get user from database
        self.user = await self.get_user(user_id)
        if not self.user:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'User not found'
            }))
            await self.close()
            return
        
        # Get conversation ID from URL or data
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.other_user_id = self.scope['url_route']['kwargs'].get('user_id')
        
        # If we have a specific conversation ID from the frontend, use it
        if data.get('conversation_id'):
            self.conversation_id = str(data.get('conversation_id'))
        elif not self.conversation_id and self.other_user_id:
            self.conversation_id = await self.get_conversation_id(
                str(self.user.id), 
                self.other_user_id
            )
        
        if self.conversation_id:
            # Ensure conversation_id is a string
            self.conversation_id = str(self.conversation_id)
            self.room_group_name = f'chat_{self.conversation_id}'
            
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': str(self.user.id),
                'conversation_id': self.conversation_id
            }))
            
            # Send conversation history - now properly awaited
            await self.send_conversation_history()
        else:
            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': str(self.user.id),
                'conversation_id': None
            }))

    @database_sync_to_async
    def get_user(self, user_id):
        """Get user by ID - lazy import"""
        from .models import User  # Import inside method
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    async def disconnect(self, close_code):
        """Called when WebSocket disconnects"""
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        if not self.user:
            return
        
        # Get conversation_id from data if not set
        conversation_id = self.conversation_id or data.get('conversation_id')
        
        if not conversation_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'No conversation ID'
            }))
            return
            
        # Ensure conversation_id is a string and valid
        conversation_id = str(conversation_id)
        
        # Create a safe group name - ensure it's valid
        self.room_group_name = f"chat_{conversation_id}"
        
        # Make sure we're in the group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        message = await self.save_message_to_db(
            receiver_id=data['receiver_id'],
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            conversation_id=conversation_id
        )
        
        # Prepare message for broadcast
        message_data = {
            'type': 'chat_message',
            'message_id': str(message.id),
            'sender_id': str(self.user.id),
            'sender_name': self.user.username or 'Unknown',
            'receiver_id': data['receiver_id'],
            'content': data['content'],
            'timestamp': str(message.created_at),
            'status': message.status,
            'conversation_id': conversation_id
        }
        
        # Send to group
        await self.channel_layer.group_send(
            self.room_group_name,
            message_data
        )
    
    async def handle_read_receipt(self, data):
        """Handle read receipt"""
        if not self.user:
            return
            
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
        if not self.user or not self.conversation_id:
            return
            
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
            'status': event['status'],
            'conversation_id': event['conversation_id']
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
    
    @database_sync_to_async
    def save_message_to_db(self, receiver_id, content, message_type, conversation_id):
        """Save message to database - lazy imports"""
        from .models import User, Message  # Import inside method
        try:
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
        except Exception as e:
            print(f"Error saving message: {e}")
            raise
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read in database - lazy import"""
        from .models import Message  # Import inside method
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            message.mark_as_read()
            return message
        except Message.DoesNotExist:
            return None
    
    async def send_conversation_history(self):
        """Send last 50 messages from database - now properly async"""
        if not self.conversation_id:
            return
        
        # Use database_sync_to_async to get messages
        messages = await self.get_conversation_messages()
        
        if messages:
            await self.send(text_data=json.dumps({
                'type': 'conversation_history',
                'messages': messages
            }))
    
    @database_sync_to_async
    def get_conversation_messages(self):
        """Get conversation messages from database - lazy imports"""
        from .models import Message  # Import inside method
        if not self.conversation_id:
            return []
        
        messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).select_related('sender', 'receiver').order_by('-created_at')[:50]
        
        history = []
        for msg in reversed(messages):
            # Skip if message is deleted for this user
            if (msg.sender == self.user and msg.is_deleted_for_sender) or \
               (msg.receiver == self.user and msg.is_deleted_for_receiver):
                continue
                
            history.append({
                'id': str(msg.id),
                'sender_id': str(msg.sender.id) if msg.sender else None,
                'sender_name': msg.sender.username if msg.sender else 'Unknown',
                'content': msg.content,
                'timestamp': str(msg.created_at),
                'status': msg.status,
                'message_type': msg.message_type
            })
        
        return history
    
    @database_sync_to_async
    def get_conversation_id(self, user1_id, user2_id):
        """Generate consistent conversation ID"""
        from .models import Conversation  # Import inside method
        
        ids = sorted([str(user1_id), str(user2_id)])
        
        # Check if conversation already exists
        try:
            user1 = self.user.__class__.objects.get(id=user1_id)
            user2 = self.user.__class__.objects.get(id=user2_id)
            
            conversation = Conversation.objects.filter(
                participants=user1
            ).filter(participants=user2).first()
            
            if conversation:
                return str(conversation.id)
        except:
            pass
        
        # If not found, generate UUID based on user IDs
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{ids[0]}_{ids[1]}"))