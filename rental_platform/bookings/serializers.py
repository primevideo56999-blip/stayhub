from rest_framework import serializers
from django.utils import timezone
from .models import Booking
from properties.serializers import PropertyListSerializer
from users.serializers import UserSerializer


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = ["id", "listing", "check_in", "check_out", "num_guests"]

    def validate(self, attrs):
        listing   = attrs["listing"]
        check_in  = attrs["check_in"]
        check_out = attrs["check_out"]
        if listing.status != "active":
            raise serializers.ValidationError("This property is not available for booking.")
        if check_in < timezone.now().date():
            raise serializers.ValidationError({"check_in": "Check-in cannot be in the past."})
        if check_in >= check_out:
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})
        nights = (check_out - check_in).days
        if nights < listing.min_nights:
            raise serializers.ValidationError({"check_in": f"Minimum stay is {listing.min_nights} night(s)."})
        if nights > listing.max_nights:
            raise serializers.ValidationError({"check_in": f"Maximum stay is {listing.max_nights} night(s)."})
        if attrs["num_guests"] > listing.max_guests:
            raise serializers.ValidationError({"num_guests": f"Max guests for this property is {listing.max_guests}."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        listing = validated_data["listing"]
        booking = Booking(
            guest=request.user,
            host=listing.host,
            **validated_data,
        )
        booking.save()
        return booking


class BookingSerializer(serializers.ModelSerializer):
    listing  = PropertyListSerializer(read_only=True)
    guest    = UserSerializer(read_only=True)
    host     = UserSerializer(read_only=True)
    subtotal = serializers.ReadOnlyField()
    refund_amount_preview = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            "id", "listing", "guest", "host",
            "check_in", "check_out", "nights", "num_guests",
            "price_per_night", "cleaning_fee", "service_fee",
            "subtotal", "total_price",
            "status", "cancelled_by", "cancellation_reason", "cancelled_at",
            "stripe_payment_intent_id", "is_paid", "refund_amount",
            "refund_amount_preview",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_refund_amount_preview(self, obj):
        return str(obj.calculate_refund())


class BookingCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class PricePreviewSerializer(serializers.Serializer):
    property_id = serializers.IntegerField()
    check_in    = serializers.DateField()
    check_out   = serializers.DateField()
    num_guests  = serializers.IntegerField(min_value=1)
