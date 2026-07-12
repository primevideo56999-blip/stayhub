from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from decimal import Decimal

from .models import Booking
from .serializers import (
    BookingSerializer, BookingCreateSerializer,
    BookingCancelSerializer, PricePreviewSerializer,
)
from properties.models import Property


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ["get", "post", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            is_active=True, guest=user
        ).union(
            Booking.objects.filter(host=user, is_active=True)
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user, is_active=True)
        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = booking.calculate_refund()
        try:
            booking.cancel(cancelled_by=Booking.CancelledBy.GUEST,
                           reason=serializer.validated_data.get("reason", ""))
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Booking cancelled.", "refund_amount": str(refund),
                         "booking": BookingSerializer(booking).data})

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, host=request.user, is_active=True)
        try:
            booking.confirm()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Booking confirmed.", "booking": BookingSerializer(booking).data})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, host=request.user, is_active=True)
        try:
            booking.reject()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Booking rejected.", "booking": BookingSerializer(booking).data})

    @action(detail=True, methods=["post"], url_path="host-cancel")
    def host_cancel(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, host=request.user, is_active=True)
        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking.cancel(cancelled_by=Booking.CancelledBy.HOST,
                           reason=serializer.validated_data.get("reason", ""))
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Booking cancelled by host. Guest will be fully refunded.",
                         "refund_amount": str(booking.total_price),
                         "booking": BookingSerializer(booking).data})

    @action(detail=False, methods=["get"], url_path="my-trips")
    def my_trips(self, request):
        today = timezone.now().date()
        # Auto-complete confirmed bookings whose checkout has passed
        Booking.objects.filter(
            guest=request.user,
            status=Booking.Status.CONFIRMED,
            check_out__lte=today,
            is_active=True,
        ).update(status=Booking.Status.COMPLETED)

        qs = Booking.objects.filter(guest=request.user, is_active=True).order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(BookingSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="host-bookings")
    def host_bookings(self, request):
        qs = Booking.objects.filter(host=request.user, is_active=True).order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(BookingSerializer(qs, many=True).data)


class PricePreviewView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = PricePreviewSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        listing = get_object_or_404(Property, pk=data["property_id"], status="active")
        nights  = (data["check_out"] - data["check_in"]).days
        if nights <= 0:
            return Response({"detail": "Invalid dates."}, status=status.HTTP_400_BAD_REQUEST)
        subtotal    = listing.price_per_night * nights
        service_fee = (subtotal * listing.service_fee_pct / 100).quantize(Decimal("0.01"))
        total       = subtotal + listing.cleaning_fee + service_fee
        return Response({
            "nights": nights,
            "price_per_night": str(listing.price_per_night),
            "subtotal":        str(subtotal),
            "cleaning_fee":    str(listing.cleaning_fee),
            "service_fee":     str(service_fee),
            "service_fee_pct": str(listing.service_fee_pct),
            "total":           str(total),
            "currency":        "usd",
        })
