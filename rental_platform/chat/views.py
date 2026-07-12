from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Conversation, Message
from rest_framework import serializers
from users.serializers import UserSerializer
from properties.serializers import PropertyListSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    class Meta:
        model  = Message
        fields = ["id", "sender", "body", "is_read", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    guest        = UserSerializer(read_only=True)
    host         = UserSerializer(read_only=True)
    property     = PropertyListSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = ["id", "property", "guest", "host",
                  "last_message", "unread_count", "created_at", "updated_at"]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {
                "body":       msg.body,
                "created_at": msg.created_at.isoformat(),
                "sender_id":  msg.sender_id,
            }
        return None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


class ConversationListView(generics.ListAPIView):
    """GET /api/v1/chat/conversations/"""
    serializer_class   = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(
            Q(guest=user) | Q(host=user)
        ).prefetch_related("messages").select_related(
            "guest", "host", "property"
        ).order_by("-updated_at")


class ConversationStartView(APIView):
    """POST /api/v1/chat/start/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from properties.models import Property
        property_id = request.data.get("property_id")
        if not property_id:
            return Response({"detail": "property_id required."}, status=400)
        prop = get_object_or_404(Property, pk=property_id, is_active=True)
        if request.user == prop.host:
            return Response({"detail": "You cannot chat with yourself."}, status=400)
        conv, created = Conversation.objects.get_or_create(
            property=prop,
            guest=request.user,
            host=prop.host,
        )
        return Response({
            "conversation_id": conv.id,
            "created":         created,
        }, status=201 if created else 200)


class MessageListView(generics.ListAPIView):
    """GET /api/v1/chat/conversations/{id}/messages/"""
    serializer_class   = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user    = self.request.user
        conv_id = self.kwargs["conversation_id"]
        conv    = get_object_or_404(Conversation, pk=conv_id)
        if conv.guest != user and conv.host != user:
            return Message.objects.none()
        # Mark received messages as read
        Message.objects.filter(
            conversation=conv, is_read=False
        ).exclude(sender=user).update(is_read=True)
        return Message.objects.filter(
            conversation=conv
        ).select_related("sender").order_by("created_at")


class MessageSendView(APIView):
    """
    POST /api/v1/chat/conversations/{conversation_id}/send/
    Body: { body: "message text" }
    Used by polling-based chat (replaces WebSocket send).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conv = get_object_or_404(Conversation, pk=conversation_id)
        if conv.guest != request.user and conv.host != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        body = request.data.get("body", "").strip()
        if not body:
            return Response({"detail": "Message body cannot be empty."}, status=400)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            body=body,
        )
        # Update conversation timestamp so it appears at top of list
        conv.save(update_fields=["updated_at"])

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class UnreadCountView(APIView):
    """GET /api/v1/chat/unread/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__in=Conversation.objects.filter(
                Q(guest=request.user) | Q(host=request.user)
            ),
            is_read=False,
        ).exclude(sender=request.user).count()
        return Response({"unread": count})
