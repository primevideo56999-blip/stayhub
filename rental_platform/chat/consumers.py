import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.
    URL: ws://host/ws/chat/{conversation_id}/
    Requires JWT token as query param: ?token=<access_token>
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"chat_{self.conversation_id}"
        self.user = self.scope.get("user")

        # Reject unauthenticated connections
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Check user belongs to this conversation
        if not await self.user_in_conversation():
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send last 50 messages on connect
        messages = await self.get_messages()
        await self.send(text_data=json.dumps({
            "type":     "history",
            "messages": messages,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type", "message")

        if msg_type == "message":
            body = data.get("body", "").strip()
            if not body:
                return
            message = await self.save_message(body)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type":    "chat_message",
                    "message": message,
                }
            )

        elif msg_type == "read":
            await self.mark_read()

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":    "message",
            "message": event["message"],
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────
    @database_sync_to_async
    def user_in_conversation(self):
        from .models import Conversation
        return Conversation.objects.filter(
            id=self.conversation_id,
        ).filter(
            models.Q(guest=self.user) | models.Q(host=self.user)
        ).exists()

    @database_sync_to_async
    def get_messages(self):
        from .models import Message
        msgs = Message.objects.filter(
            conversation_id=self.conversation_id
        ).select_related("sender").order_by("-created_at")[:50]
        return [self._serialize_message(m) for m in reversed(list(msgs))]

    @database_sync_to_async
    def save_message(self, body):
        from .models import Message, Conversation
        conv = Conversation.objects.get(id=self.conversation_id)
        msg  = Message.objects.create(
            conversation=conv,
            sender=self.user,
            body=body,
        )
        # Update conversation timestamp for ordering
        conv.save(update_fields=["updated_at"])
        return self._serialize_message(msg)

    @database_sync_to_async
    def mark_read(self):
        from .models import Message
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False,
        ).exclude(sender=self.user).update(is_read=True)

    def _serialize_message(self, msg):
        return {
            "id":         msg.id,
            "body":       msg.body,
            "sender_id":  msg.sender_id,
            "sender_name":msg.sender.full_name,
            "sender_avatar": msg.sender.avatar.url if msg.sender.avatar else None,
            "is_read":    msg.is_read,
            "created_at": msg.created_at.isoformat(),
        }
