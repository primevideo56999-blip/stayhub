from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from datetime import date

from .models import Property, PropertyPhoto, PropertyAvailability, Amenity
from .serializers import (
    PropertyListSerializer, PropertyDetailSerializer,
    PropertyPhotoSerializer, PropertyAvailabilitySerializer,
    AmenitySerializer,
)
from .filters import PropertyFilter


class IsHostOwner(permissions.BasePermission):
    """Only the property's host can modify it."""
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

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyListSerializer
        return PropertyDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by available dates
        check_in  = self.request.query_params.get("check_in")
        check_out = self.request.query_params.get("check_out")
        if check_in and check_out:
            # Exclude properties that have any blocked date in the requested range
            blocked = PropertyAvailability.objects.filter(
                date__range=[check_in, check_out]
            ).values_list("property_id", flat=True)
            qs = qs.exclude(id__in=blocked)

        # Public: only show active listings
        if not self.request.user.is_authenticated:
            return qs.filter(status=Property.Status.ACTIVE)

        # Hosts see their own drafts/paused too
        if self.request.user.is_host:
            return qs  # host can see all statuses on their own, filtered in list below

        return qs.filter(status=Property.Status.ACTIVE)

    def get_queryset_for_host(self):
        """Return all properties belonging to the authenticated host."""
        return Property.objects.filter(host=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    # GET /api/v1/properties/mine/
    @action(detail=False, methods=["get"], url_path="mine",
            permission_classes=[permissions.IsAuthenticated])
    def my_properties(self, request):
        qs = Property.objects.filter(host=request.user, is_active=True)
        serializer = PropertyDetailSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    # POST /api/v1/properties/{id}/publish/
    @action(detail=True, methods=["post"], url_path="publish",
            permission_classes=[permissions.IsAuthenticated, IsHostOwner])
    def publish(self, request, pk=None):
        property_ = self.get_object()
        if property_.photos.count() == 0:
            return Response(
                {"detail": "At least one photo is required to publish."},
                status=status.HTTP_400_BAD_REQUEST
            )
        property_.status = Property.Status.ACTIVE
        property_.save()
        return Response({"detail": "Property published.", "status": property_.status})

    # POST /api/v1/properties/{id}/unpublish/
    @action(detail=True, methods=["post"], url_path="unpublish",
            permission_classes=[permissions.IsAuthenticated, IsHostOwner])
    def unpublish(self, request, pk=None):
        property_ = self.get_object()
        property_.status = Property.Status.PAUSED
        property_.save()
        return Response({"detail": "Property paused.", "status": property_.status})

    # GET /api/v1/properties/{id}/availability/
    @action(detail=True, methods=["get", "post", "delete"], url_path="availability")
    def availability(self, request, pk=None):
        property_ = self.get_object()

        if request.method == "GET":
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
            PropertyAvailability.objects.filter(property=property_, date=date_str).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


class PropertyPhotoUploadView(generics.CreateAPIView):
    """POST /api/v1/properties/{property_id}/photos/"""
    serializer_class   = PropertyPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        property_ = Property.objects.get(pk=self.kwargs["property_id"], host=self.request.user)
        # First photo auto-becomes cover
        is_cover = not property_.photos.exists()
        serializer.save(property=property_, is_cover=is_cover)


class PropertyPhotoDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/properties/photos/{id}/"""
    queryset           = PropertyPhoto.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PropertyPhoto.objects.filter(property__host=self.request.user)


class AmenityListView(generics.ListAPIView):
    """GET /api/v1/properties/amenities/ — public list of all amenities."""
    queryset           = Amenity.objects.all()
    serializer_class   = AmenitySerializer
    permission_classes = [permissions.AllowAny]
