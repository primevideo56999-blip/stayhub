from django.db import models
from users.models import User
from properties.models import Property


class Conversation(models.Model):
    """A conversation thread between a guest and host about a property."""
    property    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="conversations")
    guest       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversations_as_guest")
    host        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversations_as_host")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = "conversations"
        unique_together = ["property", "guest", "host"]
        ordering        = ["-updated_at"]

    def __str__(self):
        return f"{self.guest.email} ↔ {self.host.email} re: {self.property.title}"

        return self.host if current_user == self.guest else self.guest


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    body         = models.TextField()
    is_read      = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.email}: {self.body[:50]}"
