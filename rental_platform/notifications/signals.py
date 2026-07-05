from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="bookings.Booking")
def booking_notifications(sender, instance, created, **kwargs):
    from notifications.tasks import (
        notify_booking_requested,
        notify_booking_confirmed,
        notify_booking_cancelled,
        notify_booking_rejected,
    )
    if created:
        notify_booking_requested.delay(instance.pk)
    else:
        if instance.status == "confirmed":
            notify_booking_confirmed.delay(instance.pk)
        elif instance.status == "cancelled":
            notify_booking_cancelled.delay(instance.pk)
        elif instance.status == "rejected":
            notify_booking_rejected.delay(instance.pk)


@receiver(post_save, sender="reviews.Review")
def review_notifications(sender, instance, created, **kwargs):
    if created:
        from notifications.tasks import notify_new_review
        notify_new_review.delay(instance.pk)
