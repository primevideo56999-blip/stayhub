from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display   = [
        "id", "guest", "host", "listing", "check_in", "check_out",
        "nights", "total_price", "status", "is_paid", "created_at"
    ]
    list_filter    = ["status", "is_paid", "cancelled_by"]
    search_fields  = ["guest__email", "host__email", "property__title"]
    raw_id_fields  = ["guest", "host", "listing"]
    readonly_fields= [
        "nights", "price_per_night", "cleaning_fee", "service_fee", "total_price",
        "stripe_payment_intent_id", "refund_amount", "cancelled_at",
        "created_at", "updated_at",
    ]
    fieldsets = (
        ("Booking",  {"fields": ("listing", "guest", "host", "check_in", "check_out", "num_guests", "nights")}),
        ("Pricing",  {"fields": ("price_per_night", "cleaning_fee", "service_fee", "total_price")}),
        ("Status",   {"fields": ("status", "cancelled_by", "cancellation_reason", "cancelled_at")}),
        ("Payment",  {"fields": ("stripe_payment_intent_id", "is_paid", "refund_amount")}),
        ("Meta",     {"fields": ("is_active", "created_at", "updated_at")}),
    )

    actions = ["mark_completed"]

    def mark_completed(self, request, queryset):
        for booking in queryset.filter(status="confirmed"):
            booking.complete()
        self.message_user(request, "Selected confirmed bookings marked as completed.")
    mark_completed.short_description = "Mark selected bookings as completed"
