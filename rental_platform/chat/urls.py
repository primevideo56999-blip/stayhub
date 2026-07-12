from django.urls import path
from .views import (
    ConversationListView, ConversationStartView,
    MessageListView, MessageSendView, UnreadCountView,
)

urlpatterns = [
    path("conversations/",
         ConversationListView.as_view(), name="conversation-list"),
    path("conversations/<int:conversation_id>/messages/",
         MessageListView.as_view(), name="message-list"),
    path("conversations/<int:conversation_id>/send/",
         MessageSendView.as_view(), name="message-send"),
    path("start/",
         ConversationStartView.as_view(), name="chat-start"),
    path("unread/",
         UnreadCountView.as_view(), name="chat-unread"),
]
