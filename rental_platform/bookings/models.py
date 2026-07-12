from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from users.models import User
from properties.models import Property, PropertyAvailability


class Booking(models.Model):

    class Status(models.TextChoices):
        PENDING    = "pending",    "Pending"
        CONFIRMED  = "confirmed",  "Confirmed"
        CANCELLED  = "cancelled",  "Cancelled"
        COMPLETED  = "completed",  "Completed"
        REJECTED   = "rejected",   "Rejected"

    class CancelledBy(models.TextChoices):
        GUEST = "guest", "Guest"
        HOST  = "host",  "Host"
        ADMIN = "admin", "Admin"

    guest           = models.ForeignKey(User, on_delete=models.PROTECT, related_name="bookings_as_guest")
    host            = models.ForeignKey(User, on_delete=models.PROTECT, related_name="bookings_as_host")
    listing         = models.ForeignKey(Property, on_delete=models.PROTECT, related_name="bookings")

    check_in        = models.DateField()
    check_out       = models.DateField()
    nights          = models.PositiveIntegerField(editable=False)
    num_guests      = models.PositiveIntegerField(default=1)

    price_per_night      = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee         = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    service_fee          = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    total_price          = models.DecimalField(max_digits=10, decimal_places=2)

    status               = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    cancelled_by         = models.CharField(max_length=5, choices=CancelledBy.choices, blank=True)
    cancellation_reason  = models.TextField(blank=True)
    cancelled_at         = models.DateTimeField(null=True, blank=True)

    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    is_paid                  = models.BooleanField(default=False)
    refund_amount            = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bookings"
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["guest", "status"]),
            models.Index(fields=["host",  "status"]),
            models.Index(fields=["listing", "check_in", "check_out"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Booking#{self.pk} — {self.guest.email} @ {self.listing.title}"

    def clean(self):
        errors = {}

        if self.check_in >= self.check_out:
            errors["check_out"] = "Check-out must be after check-in."

        if self.check_in < timezone.now().date():
            errors["check_in"] = "Check-in cannot be in the past."

        nights = (self.check_out - self.check_in).days
        if nights < self.listing.min_nights:
            errors["check_in"] = f"Minimum stay is {self.listing.min_nights} night(s)."
        if nights > self.listing.max_nights:
            errors["check_in"] = f"Maximum stay is {self.listing.max_nights} night(s)."
        if self.num_guests > self.listing.max_guests:
            errors["num_guests"] = f"Max guests allowed is {self.listing.max_guests}."

        if errors:
            raise ValidationError(errors)

        # ── KEY CHANGE: only block if there's a CONFIRMED booking on these dates ──
        # Multiple PENDING bookings on same dates are allowed
        # Only one CONFIRMED booking can exist per date range
        overlapping_confirmed = Booking.objects.filter(
            listing=self.listing,
            status=Booking.Status.CONFIRMED,   # only confirmed blocks new bookings
            check_in__lt=self.check_out,
            check_out__gt=self.check_in,
            is_active=True,
        ).exclude(pk=self.pk)

        if overlapping_confirmed.exists():
            raise ValidationError({
                "check_in": "These dates are already booked. Please choose different dates."
            })

        # Also block dates that host manually blocked (not booked ones)
        host_blocked = PropertyAvailability.objects.filter(
            property=self.listing,
            date__range=[self.check_in, self.check_out - timedelta(days=1)],
            reason=PropertyAvailability.BlockReason.HOST_BLOCK,  # only host blocks, not booked
        )
        if host_blocked.exists():
            raise ValidationError({
                "check_in": "One or more selected dates are blocked by the host."
            })

    def save(self, *args, **kwargs):
        self.nights = (self.check_out - self.check_in).days
        if not self.pk:
            self._calculate_price()
        self.full_clean()
        super().save(*args, **kwargs)

    def _calculate_price(self):
        self.price_per_night = self.listing.price_per_night
        self.cleaning_fee    = self.listing.cleaning_fee
        subtotal             = self.price_per_night * self.nights
        self.service_fee     = (subtotal * self.listing.service_fee_pct / 100).quantize(Decimal("0.01"))
        self.total_price     = subtotal + self.cleaning_fee + self.service_fee

    @property
    def subtotal(self):
        return self.price_per_night * self.nights

    def confirm(self):
        if self.status != self.Status.PENDING:
            raise ValueError("Only pending bookings can be confirmed.")

        # ── When confirming, reject all other pending bookings for same dates ──
        overlapping_pending = Booking.objects.filter(
            listing=self.listing,
            status=self.Status.PENDING,
            check_in__lt=self.check_out,
            check_out__gt=self.check_in,
            is_active=True,
        ).exclude(pk=self.pk)

        for b in overlapping_pending:
            b.status = self.Status.REJECTED
            b.cancellation_reason = "Another booking was confirmed for these dates."
            b.save(update_fields=["status", "cancellation_reason", "updated_at"])

        self.status = self.Status.CONFIRMED
        self.save(update_fields=["status", "updated_at"])
        self._block_dates()

    def reject(self):
        if self.status != self.Status.PENDING:
            raise ValueError("Only pending bookings can be rejected.")
        self.status = self.Status.REJECTED
        self.save(update_fields=["status", "updated_at"])

    def cancel(self, cancelled_by, reason=""):
        if self.status not in [self.Status.PENDING, self.Status.CONFIRMED]:
            raise ValueError("Cannot cancel a completed or already cancelled booking.")
        self.status              = self.Status.CANCELLED
        self.cancelled_by        = cancelled_by
        self.cancellation_reason = reason
        self.cancelled_at        = timezone.now()
        self.save(update_fields=["status", "cancelled_by", "cancellation_reason", "cancelled_at", "updated_at"])
        self._unblock_dates()

    def complete(self):
        if self.status != self.Status.CONFIRMED:
            raise ValueError("Only confirmed bookings can be completed.")
        self.status = self.Status.COMPLETED
        self.save(update_fields=["status", "updated_at"])

    def _block_dates(self):
        """Block dates ONLY after confirmation."""
        current = self.check_in
        while current < self.check_out:
            PropertyAvailability.objects.get_or_create(
                property=self.listing,
                date=current,
                defaults={"reason": PropertyAvailability.BlockReason.BOOKED},
            )
            current += timedelta(days=1)

    def _unblock_dates(self):
        """Release booked dates when booking is cancelled."""
        PropertyAvailability.objects.filter(
            property=self.listing,
            date__range=[self.check_in, self.check_out - timedelta(days=1)],
            reason=PropertyAvailability.BlockReason.BOOKED,
        ).delete()

    def calculate_refund(self):
        if not self.is_paid:
            return Decimal("0.00")
        days_until = (self.check_in - timezone.now().date()).days
        if days_until >= 7:
            return self.total_price
        elif days_until >= 3:
            return (self.total_price * Decimal("0.5")).quantize(Decimal("0.01"))
        return Decimal("0.00")
