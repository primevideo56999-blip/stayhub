from rest_framework import serializers
from django.utils import timezone
from .models import Review
from users.serializers import UserSerializer


class ReviewSerializer(serializers.ModelSerializer):
    guest     = UserSerializer(read_only=True)
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)
    guest_avatar = serializers.ImageField(source="guest.avatar", read_only=True)

    class Meta:
        model  = Review
        fields = [
            "id", "property", "booking",
            "guest", "guest_name", "guest_avatar",
            "overall", "cleanliness", "communication", "location", "value",
            "comment", "host_response", "host_responded_at",
            "created_at",
        ]
        read_only_fields = [
            "id", "guest", "guest_name", "guest_avatar",
            "host_response", "host_responded_at", "created_at",
        ]

    def validate_booking(self, booking):
        request = self.context["request"]
        # Must be the guest of this booking
        if booking.guest != request.user:
            raise serializers.ValidationError("This is not your booking.")
        # Must be completed
        from bookings.models import Booking
        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError("You can only review a completed stay.")
        # Not already reviewed
        if hasattr(booking, "review"):
            raise serializers.ValidationError("You have already reviewed this booking.")
        return booking

    def create(self, validated_data):
        booking = validated_data["booking"]
        request = self.context["request"]
        validated_data.pop("property", None)  # remove if present, we'll set it from booking
        return Review.objects.create(
            guest=request.user,
            host=booking.host,
            property=booking.listing,
            **validated_data,
        )


class HostResponseSerializer(serializers.Serializer):
    host_response = serializers.CharField()
