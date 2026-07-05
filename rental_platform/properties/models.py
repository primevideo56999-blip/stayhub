from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User


class Amenity(models.Model):
    name     = models.CharField(max_length=100, unique=True)
    icon     = models.CharField(max_length=50, blank=True)  # e.g. "wifi", "pool"
    category = models.CharField(max_length=50, blank=True)  # e.g. "essentials", "safety"

    class Meta:
        db_table  = "amenities"
        verbose_name_plural = "amenities"
        ordering  = ["name"]

    def __str__(self):
        return self.name


class Property(models.Model):
    class PropertyType(models.TextChoices):
        APARTMENT   = "apartment",   "Apartment"
        HOUSE       = "house",       "House"
        VILLA       = "villa",       "Villa"
        STUDIO      = "studio",      "Studio"
        CABIN       = "cabin",       "Cabin"
        HOTEL_ROOM  = "hotel_room",  "Hotel Room"
        HOSTEL      = "hostel",      "Hostel"
        OTHER       = "other",       "Other"

    class Status(models.TextChoices):
        DRAFT       = "draft",      "Draft"
        ACTIVE      = "active",     "Active"
        PAUSED      = "paused",     "Paused"      # host subscription expired
        ARCHIVED    = "archived",   "Archived"

    # Ownership
    host            = models.ForeignKey(User, on_delete=models.CASCADE, related_name="properties")

    # Basics
    title           = models.CharField(max_length=200)
    description     = models.TextField()
    property_type   = models.CharField(max_length=20, choices=PropertyType.choices)
    status          = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    # Location
    address_line1   = models.CharField(max_length=255)
    address_line2   = models.CharField(max_length=255, blank=True)
    city            = models.CharField(max_length=100)
    state           = models.CharField(max_length=100)
    country         = models.CharField(max_length=100)
    postal_code     = models.CharField(max_length=20)
    latitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude       = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Capacity & rooms
    max_guests      = models.PositiveIntegerField(default=1)
    bedrooms        = models.PositiveIntegerField(default=1)
    beds            = models.PositiveIntegerField(default=1)
    bathrooms       = models.DecimalField(max_digits=3, decimal_places=1, default=1)

    # Pricing
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee    = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    service_fee_pct = models.DecimalField(max_digits=5,  decimal_places=2, default=12)  # platform %

    # Rules
    min_nights      = models.PositiveIntegerField(default=1)
    max_nights      = models.PositiveIntegerField(default=365)
    check_in_time   = models.TimeField(default="15:00")
    check_out_time  = models.TimeField(default="11:00")
    house_rules     = models.TextField(blank=True)
    allows_pets     = models.BooleanField(default=False)
    allows_smoking  = models.BooleanField(default=False)
    allows_parties  = models.BooleanField(default=False)

    # Amenities
    amenities       = models.ManyToManyField(Amenity, blank=True, related_name="properties")

    # Stats (denormalised for speed)
    avg_rating      = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews   = models.PositiveIntegerField(default=0)
    total_bookings  = models.PositiveIntegerField(default=0)

    # Soft delete
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = "properties"
        ordering  = ["-created_at"]
        indexes   = [
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["city", "country"]),
            models.Index(fields=["price_per_night"]),
            models.Index(fields=["host"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.city})"

    @property
    def cover_photo(self):
        return self.photos.filter(is_cover=True).first() or self.photos.first()


class PropertyPhoto(models.Model):
    property    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="photos")
    image       = models.ImageField(upload_to="properties/photos/%Y/%m/")
    caption     = models.CharField(max_length=200, blank=True)
    is_cover    = models.BooleanField(default=False)
    order       = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "property_photos"
        ordering = ["order", "uploaded_at"]

    def save(self, *args, **kwargs):
        # Only one cover photo per property
        if self.is_cover:
            PropertyPhoto.objects.filter(
                property=self.property, is_cover=True
            ).exclude(pk=self.pk).update(is_cover=False)
        super().save(*args, **kwargs)


class PropertyAvailability(models.Model):
    """Blocked dates — when a property is NOT available."""
    class BlockReason(models.TextChoices):
        BOOKED      = "booked",     "Booked"
        HOST_BLOCK  = "host_block", "Host Blocked"
        MAINTENANCE = "maintenance","Maintenance"

    property    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="blocked_dates")
    date        = models.DateField()
    reason      = models.CharField(max_length=15, choices=BlockReason.choices, default=BlockReason.HOST_BLOCK)

    class Meta:
        db_table = "property_availability"
        unique_together = ["property", "date"]
        indexes = [models.Index(fields=["property", "date"])]

    def __str__(self):
        return f"{self.property} blocked on {self.date}"
