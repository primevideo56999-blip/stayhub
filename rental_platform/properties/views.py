from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Property, PropertyPhoto, PropertyAvailability, Amenity
from .serializers import (
    PropertyListSerializer, PropertyDetailSerializer,
    PropertyPhotoSerializer, PropertyAvailabilitySerializer,
    AmenitySerializer,
)
from .filters import PropertyFilter
from users.permissions import IsHost, IsHostProfileComplete


class IsHostOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.host == request.user


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.filter(is_active=True).select_related("host").prefetch_related(
        "photos", "amenities"
    )
    permission_classes  = [permissions.IsAuthenticatedOrReadOnly, IsHostOwner]
    filter_backends     = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class     = PropertyFilter
    search_fields       = ["title", "description", "city", "country", "address_line1"]
    ordering_fields     = ["price_per_night", "avg_rating", "total_reviews", "created_at"]
    ordering            = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsHost(), IsHostProfileComplete()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyListSerializer
        return PropertyDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        check_in  = self.request.query_params.get("check_in")
        check_out = self.request.query_params.get("check_out")
        if check_in and check_out:
            # Only exclude properties with CONFIRMED bookings in this range
            from bookings.models import Booking
            confirmed_blocked = Booking.objects.filter(
                status=Booking.Status.CONFIRMED,
                check_in__lt=check_out,
                check_out__gt=check_in,
                is_active=True,
            ).values_list("listing_id", flat=True)
            # Also exclude host-manually-blocked dates
            host_blocked = PropertyAvailability.objects.filter(
                date__range=[check_in, check_out],
                reason=PropertyAvailability.BlockReason.HOST_BLOCK,
            ).values_list("property_id", flat=True)
            qs = qs.exclude(id__in=list(confirmed_blocked) + list(host_blocked))

        if not self.request.user.is_authenticated:
            return qs.filter(status=Property.Status.ACTIVE)
        if self.request.user.is_host:
            return qs
        return qs.filter(status=Property.Status.ACTIVE)

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    @action(detail=False, methods=["get"], url_path="mine",
            permission_classes=[permissions.IsAuthenticated])
    def my_properties(self, request):
        qs = Property.objects.filter(host=request.user, is_active=True)
        serializer = PropertyDetailSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="publish",
            permission_classes=[permissions.IsAuthenticated, IsHostOwner, IsHostProfileComplete])
    def publish(self, request, pk=None):
        property_ = self.get_object()
        if property_.photos.count() == 0:
            return Response(
                {"detail": "At least one photo is required to publish."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not property_.description or not property_.description.strip():
            return Response(
                {"detail": "A property description is required before publishing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        property_.status = Property.Status.ACTIVE
        property_.save()
        return Response({"detail": "Property published.", "status": property_.status})

    @action(detail=True, methods=["post"], url_path="unpublish",
            permission_classes=[permissions.IsAuthenticated, IsHostOwner])
    def unpublish(self, request, pk=None):
        property_ = self.get_object()
        property_.status = Property.Status.PAUSED
        property_.save()
        return Response({"detail": "Property paused.", "status": property_.status})

    @action(
        detail=True,
        methods=["get", "post", "delete"],
        url_path="availability",
        # ── PUBLIC GET: no login required to view availability ──
        permission_classes=[permissions.IsAuthenticatedOrReadOnly],
    )
    def availability(self, request, pk=None):
        property_ = self.get_object()

        if request.method == "GET":
            # Anyone can see which dates are blocked
            blocked = PropertyAvailability.objects.filter(property=property_)
            return Response(PropertyAvailabilitySerializer(blocked, many=True).data)

        if request.method == "POST":
            if property_.host != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)
            serializer = PropertyAvailabilitySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(property=property_)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        if request.method == "DELETE":
            if property_.host != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)
            date_str = request.data.get("date")
            PropertyAvailability.objects.filter(
                property=property_, date=date_str
            ).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


class PropertyPhotoUploadView(generics.CreateAPIView):
    serializer_class   = PropertyPhotoSerializer
    permission_classes = [permissions.IsAuthenticated, IsHost]
    parser_classes     = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        property_ = Property.objects.get(pk=self.kwargs["property_id"], host=self.request.user)
        is_cover  = not property_.photos.exists()
        serializer.save(property=property_, is_cover=is_cover)


class PropertyPhotoDeleteView(generics.DestroyAPIView):
    queryset           = PropertyPhoto.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsHost]

    def get_queryset(self):
        return PropertyPhoto.objects.filter(property__host=self.request.user)


class AmenityListView(generics.ListAPIView):
    queryset           = Amenity.objects.all()
    serializer_class   = AmenitySerializer
    permission_classes = [permissions.AllowAny]
