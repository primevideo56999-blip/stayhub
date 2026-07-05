from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display   = ["id", "guest", "property", "overall", "cleanliness",
                      "communication", "location", "value", "created_at"]
    list_filter    = ["overall", "is_active"]
    search_fields  = ["guest__email", "property__title", "comment"]
    raw_id_fields  = ["guest", "host", "property", "booking"]
    readonly_fields= ["created_at", "updated_at", "host_responded_at"]
