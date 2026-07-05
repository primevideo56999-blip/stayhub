from celery import shared_task
from django.utils import timezone


@shared_task
def auto_complete_bookings():
    """
    Runs daily via Celery Beat.
    Marks confirmed bookings as completed if check_out date has passed.
    """
    from .models import Booking
    today = timezone.now().date()
    expired = Booking.objects.filter(
        status=Booking.Status.CONFIRMED,
        check_out__lt=today,
        is_active=True,
    )
    count = 0
    for booking in expired:
        try:
            booking.complete()
            count += 1
        except Exception:
            pass
    return f"Auto-completed {count} bookings."


@shared_task
def auto_cancel_unpaid_bookings():
    """
    Runs every hour.
    Cancels pending bookings that weren't paid within 24 hours.
    """
    from .models import Booking
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(hours=24)
    unpaid = Booking.objects.filter(
        status=Booking.Status.PENDING,
        is_paid=False,
        created_at__lt=cutoff,
        is_active=True,
    )
    count = 0
    for booking in unpaid:
        try:
            booking.cancel(
                cancelled_by=Booking.CancelledBy.ADMIN,
                reason="Auto-cancelled: payment not received within 24 hours.",
            )
            count += 1
        except Exception:
            pass
    return f"Auto-cancelled {count} unpaid bookings."
