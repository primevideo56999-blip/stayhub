from django.contrib import admin
from .models import Property, PropertyPhoto, PropertyAvailability, Amenity


class PropertyPhotoInline(admin.TabularInline):
    model  = PropertyPhoto
    extra  = 0
    fields = ["image", "caption", "is_cover", "order"]


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display   = ["title", "host", "city", "property_type", "status", "price_per_night", "avg_rating"]
    list_filter    = ["status", "property_type", "country", "allows_pets"]
    search_fields  = ["title", "city", "host__email"]
    raw_id_fields  = ["host"]
    inlines        = [PropertyPhotoInline]
    readonly_fields= ["avg_rating", "total_reviews", "total_bookings", "created_at", "updated_at"]


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display  = ["name", "icon", "category"]
    search_fields = ["name"]


@admin.register(PropertyAvailability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display  = ["property", "date", "reason"]
    list_filter   = ["reason"]
