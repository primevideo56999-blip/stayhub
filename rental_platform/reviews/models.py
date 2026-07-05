from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from users.models import User
from properties.models import Property
from bookings.models import Booking


class Review(models.Model):
    # A guest can only review a property once per completed booking
    booking     = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="review")
    property    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="reviews")
    guest       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_given")
    host        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_received")

    # Ratings (1-5)
    overall         = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    cleanliness     = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    communication   = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    location        = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    value           = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])

    comment         = models.TextField()
    host_response   = models.TextField(blank=True)
    host_responded_at = models.DateTimeField(null=True, blank=True)

    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["property", "is_active"]),
            models.Index(fields=["guest"]),
        ]

    def __str__(self):
        return f"Review by {self.guest.email} on {self.property.title} ({self.overall}★)"

    def clean(self):
        # Only allow reviews for completed bookings
        if self.booking.status != Booking.Status.COMPLETED:
            raise ValidationError("You can only review a completed stay.")
        # Guest must match booking guest
        if self.booking.guest != self.guest:
            raise ValidationError("You can only review your own bookings.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self._update_property_rating()

    def _update_property_rating(self):
        from django.db.models import Avg
        agg = Review.objects.filter(
            property=self.property, is_active=True
        ).aggregate(
            avg=Avg("overall"), count=models.Count("id")
        )
        Property.objects.filter(pk=self.property_id).update(
            avg_rating=round(agg["avg"] or 0, 2),
            total_reviews=agg["count"],
        )
