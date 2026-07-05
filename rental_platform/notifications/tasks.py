from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string


def _send(subject, to_email, template, context):
    """Helper — renders template and sends email."""
    try:
        body = render_to_string(template, context)
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception as e:
        # Log but don't crash — email failure should never break the app
        print(f"[EMAIL ERROR] {to_email} | {subject} | {e}")


# ── Booking notifications ─────────────────────────────────────────────────────

@shared_task
def notify_booking_requested(booking_id):
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest", "host").get(pk=booking_id)
    # Email to host
    _send(
        subject=f"New booking request — {booking.property.title}",
        to_email=booking.host.email,
        template="notifications/booking_requested_host.txt",
        context={"booking": booking},
    )
    # Email to guest
    _send(
        subject=f"Booking request sent — {booking.property.title}",
        to_email=booking.guest.email,
        template="notifications/booking_requested_guest.txt",
        context={"booking": booking},
    )


@shared_task
def notify_booking_confirmed(booking_id):
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest", "host").get(pk=booking_id)
    _send(
        subject=f"Booking confirmed! — {booking.property.title}",
        to_email=booking.guest.email,
        template="notifications/booking_confirmed.txt",
        context={"booking": booking},
    )


@shared_task
def notify_booking_cancelled(booking_id):
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest", "host").get(pk=booking_id)
    # Notify the other party
    notify_email = booking.host.email if booking.cancelled_by == "guest" else booking.guest.email
    _send(
        subject=f"Booking cancelled — {booking.property.title}",
        to_email=notify_email,
        template="notifications/booking_cancelled.txt",
        context={"booking": booking},
    )


@shared_task
def notify_booking_rejected(booking_id):
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest", "host").get(pk=booking_id)
    _send(
        subject=f"Booking not accepted — {booking.property.title}",
        to_email=booking.guest.email,
        template="notifications/booking_rejected.txt",
        context={"booking": booking},
    )


@shared_task
def notify_checkin_reminder(booking_id):
    """Send 24h before check-in — triggered by Celery Beat."""
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest").get(pk=booking_id)
    _send(
        subject=f"Your check-in is tomorrow — {booking.property.title}",
        to_email=booking.guest.email,
        template="notifications/checkin_reminder.txt",
        context={"booking": booking},
    )


@shared_task
def notify_review_reminder(booking_id):
    """Send 24h after check-out to request a review."""
    from bookings.models import Booking
    booking = Booking.objects.select_related("property", "guest").get(pk=booking_id)
    if not hasattr(booking, "review"):
        _send(
            subject=f"How was your stay at {booking.property.title}?",
            to_email=booking.guest.email,
            template="notifications/review_reminder.txt",
            context={"booking": booking},
        )


# ── Review notifications ──────────────────────────────────────────────────────

@shared_task
def notify_new_review(review_id):
    from reviews.models import Review
    review = Review.objects.select_related("property", "guest", "host").get(pk=review_id)
    _send(
        subject=f"New review on {review.property.title}",
        to_email=review.host.email,
        template="notifications/new_review.txt",
        context={"review": review},
    )
