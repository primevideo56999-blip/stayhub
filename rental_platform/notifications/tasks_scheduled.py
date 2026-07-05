from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def send_checkin_reminders():
    """Every day at 08:00 — notify guests checking in tomorrow."""
    from bookings.models import Booking
    from notifications.tasks import notify_checkin_reminder

    tomorrow = timezone.now().date() + timedelta(days=1)
    bookings = Booking.objects.filter(
        status=Booking.Status.CONFIRMED,
        check_in=tomorrow,
        is_active=True,
    )
    for booking in bookings:
        notify_checkin_reminder.delay(booking.pk)
    return f"Sent {bookings.count()} check-in reminders."


@shared_task
def send_review_reminders():
    """Every day at 10:00 — ask guests to review yesterday's completed stays."""
    from bookings.models import Booking
    from notifications.tasks import notify_review_reminder

    yesterday = timezone.now().date() - timedelta(days=1)
    bookings = Booking.objects.filter(
        status=Booking.Status.COMPLETED,
        check_out=yesterday,
        is_active=True,
    ).select_related("guest")

    count = 0
    for booking in bookings:
        if not hasattr(booking, "review"):
            notify_review_reminder.delay(booking.pk)
            count += 1
    return f"Sent {count} review reminders."
