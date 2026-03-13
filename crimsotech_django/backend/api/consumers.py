# api/consumers.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.user_id = None
        self.group_name = None
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'authenticate':
            await self.handle_authenticate(data)
        elif not self.user:
            await self.send_error('Not authenticated')
        elif message_type == 'mark_read':
            await self.handle_mark_read(data)
        elif message_type == 'mark_all_read':
            await self.handle_mark_all_read()
    
    async def handle_authenticate(self, data):
        user_id = data.get('user_id')
        if not user_id:
            await self.send_error('User ID required')
            await self.close()
            return
        
        self.user = await self.get_user(user_id)
        if not self.user:
            await self.send_error('User not found')
            await self.close()
            return
        
        self.user_id = str(self.user.id)
        self.group_name = f'notifications_{self.user_id}'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        unread_count = await self.get_unread_count()
        notifications = await self.get_recent_notifications()
        
        await self.send(text_data=json.dumps({
            'type': 'authenticated',
            'user_id': self.user_id,
            'unread_count': unread_count,
            'notifications': notifications
        }))
    
    async def handle_mark_read(self, data):
        notification_id = data.get('notification_id')
        if notification_id:
            await self.mark_notification_read(notification_id)
            
            unread_count = await self.get_unread_count()
            
            await self.send(text_data=json.dumps({
                'type': 'marked_read',
                'notification_id': notification_id,
                'unread_count': unread_count
            }))
    
    async def handle_mark_all_read(self):
        await self.mark_all_notifications_read()
        
        await self.send(text_data=json.dumps({
            'type': 'marked_all_read',
            'unread_count': 0
        }))
    
    async def notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification_id': event['notification_id'],
            'title': event['title'],
            'message': event['message'],
            'notification_type': event['notification_type'],
            'created_at': event['created_at'],
            'data': event.get('data', {})
        }))
    
    async def unread_count(self, event):
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': event['count']
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name') and self.group_name:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def send_error(self, message):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))
    
    @database_sync_to_async
    def get_user(self, user_id):
        from .models import User
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_unread_count(self):
        if not self.user:
            return 0
        from .models import Notification
        return Notification.objects.filter(
            user=self.user,
            is_read=False
        ).count()
    
    @database_sync_to_async
    def get_recent_notifications(self):
        if not self.user:
            return []
        from .models import Notification
        notifications = Notification.objects.filter(
            user=self.user
        ).order_by('-created_at')[:20]
        
        return [{
            'id': str(n.id),
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': str(n.created_at)
        } for n in notifications]
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        if not self.user:
            return
        from .models import Notification
        Notification.objects.filter(
            id=notification_id,
            user=self.user
        ).update(is_read=True)
    
    @database_sync_to_async
    def mark_all_notifications_read(self):
        if not self.user:
            return
        from .models import Notification
        Notification.objects.filter(
            user=self.user,
            is_read=False
        ).update(is_read=True)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.conversation_id = None
        self.room_group_name = None
        await self.accept()
    
    async def receive(self, text_data):
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
    
    async def handle_authenticate(self, data):
        user_id = data.get('user_id')
        if not user_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'User ID required'
            }))
            await self.close()
            return
        
        self.user = await self.get_user(user_id)
        if not self.user:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'User not found'
            }))
            await self.close()
            return
        
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.other_user_id = self.scope['url_route']['kwargs'].get('user_id')
        
        if data.get('conversation_id'):
            self.conversation_id = str(data.get('conversation_id'))
        elif not self.conversation_id and self.other_user_id:
            self.conversation_id = await self.get_conversation_id(
                str(self.user.id), 
                self.other_user_id
            )
        
        if self.conversation_id:
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
            
            await self.send_conversation_history()
        else:
            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': str(self.user.id),
                'conversation_id': None
            }))
    
    async def handle_chat_message(self, data):
        if not self.user:
            return
        
        conversation_id = self.conversation_id or data.get('conversation_id')
        
        if not conversation_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'No conversation ID'
            }))
            return
            
        conversation_id = str(conversation_id)
        self.room_group_name = f"chat_{conversation_id}"
        
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
        
        await self.channel_layer.group_send(
            self.room_group_name,
            message_data
        )
        
        await self.send_notification_to_user(
            receiver_id=data['receiver_id'],
            sender_name=self.user.username or 'Unknown',
            content=data['content'][:100],
            conversation_id=conversation_id
        )
    
    async def handle_read_receipt(self, data):
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
    
    async def chat_message(self, event):
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
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'reader_id': event['reader_id'],
            'read_at': event['read_at']
        }))
    
    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def send_conversation_history(self):
        if not self.conversation_id:
            return
        
        messages = await self.get_conversation_messages()
        
        if messages:
            await self.send(text_data=json.dumps({
                'type': 'conversation_history',
                'messages': messages
            }))
    
    @database_sync_to_async
    def get_user(self, user_id):
        from .models import User
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def save_message_to_db(self, receiver_id, content, message_type, conversation_id):
        from .models import User, Message
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
        from .models import Message
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            message.mark_as_read()
            return message
        except Message.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_conversation_messages(self):
        from .models import Message
        if not self.conversation_id:
            return []
        
        messages = Message.objects.filter(
            conversation_id=self.conversation_id
        ).select_related('sender', 'receiver').order_by('-created_at')[:50]
        
        history = []
        for msg in reversed(messages):
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
        from .models import Conversation
        
        ids = sorted([str(user1_id), str(user2_id)])
        
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
        
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{ids[0]}_{ids[1]}"))
    
    @database_sync_to_async
    def send_notification_to_user(self, receiver_id, sender_name, content, conversation_id):
        from .models import User, Notification
        try:
            receiver = User.objects.get(id=receiver_id)
            
            Notification.objects.create(
                user=receiver,
                title=f"New message from {sender_name}",
                message=content,
                type='chat',
                is_read=False
            )
        except User.DoesNotExist:
            pass