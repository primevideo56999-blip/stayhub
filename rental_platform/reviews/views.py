from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Review
from .serializers import ReviewSerializer, HostResponseSerializer
from properties.models import Property


class ReviewViewSet(viewsets.ModelViewSet):
    queryset           = Review.objects.filter(is_active=True).select_related("guest", "host", "property")
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names  = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter by property
        property_id = self.request.query_params.get("property")
        if property_id:
            qs = qs.filter(property_id=property_id)
        # Filter by guest
        guest_id = self.request.query_params.get("guest")
        if guest_id:
            qs = qs.filter(guest_id=guest_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.guest != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        review.is_active = False
        review.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # POST /api/v1/reviews/{id}/respond/  — host responds to a review
    @action(detail=True, methods=["post"], url_path="respond",
            permission_classes=[permissions.IsAuthenticated])
    def respond(self, request, pk=None):
        review = self.get_object()
        if review.host != request.user:
            return Response(
                {"detail": "Only the host can respond to this review."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if review.host_response:
            return Response(
                {"detail": "You have already responded to this review."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = HostResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review.host_response    = serializer.validated_data["host_response"]
        review.host_responded_at = timezone.now()
        review.save(update_fields=["host_response", "host_responded_at", "updated_at"])
        return Response(ReviewSerializer(review).data)


class PropertyReviewsView(generics.ListAPIView):
    """GET /api/v1/properties/{property_id}/reviews/ — all reviews for a property."""
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(
            property_id=self.kwargs["property_id"],
            is_active=True,
        ).select_related("guest").order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True, context={"request": request})

        # Aggregate rating breakdown
        from django.db.models import Avg
        agg = qs.aggregate(
            avg_overall=Avg("overall"),
            avg_cleanliness=Avg("cleanliness"),
            avg_communication=Avg("communication"),
            avg_location=Avg("location"),
            avg_value=Avg("value"),
        )

        return Response({
            "count":   qs.count(),
            "ratings": {k: round(v or 0, 2) for k, v in agg.items()},
            "results": serializer.data,
        })
