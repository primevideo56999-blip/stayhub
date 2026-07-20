from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Wishlist, WishlistItem
from properties.models import Property
from properties.serializers import PropertyListSerializer
from rest_framework import serializers


class WishlistItemSerializer(serializers.ModelSerializer):
    property = PropertyListSerializer(read_only=True)
    class Meta:
        model  = WishlistItem
        fields = ["id", "property", "added_at"]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()
    class Meta:
        model  = Wishlist
        fields = ["id", "name", "items", "count", "created_at"]
    def get_count(self, obj):
        return obj.items.count()


class WishlistListView(generics.ListCreateAPIView):
    """GET  /api/v1/wishlist/          — list all wishlists
       POST /api/v1/wishlist/          — create a new wishlist"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = WishlistSerializer

    def get_queryset(self):
        return Wishlist.objects.filter(guest=self.request.user).prefetch_related("items__property")

    def perform_create(self, serializer):
        serializer.save(guest=self.request.user)


class WishlistToggleView(APIView):
    """POST /api/v1/wishlist/toggle/
       Body: { property_id: int }
       Adds property to default wishlist if not there, removes if already there.
       Returns { saved: true/false }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        property_id = request.data.get("property_id")
        if not property_id:
            return Response({"detail": "property_id required."}, status=status.HTTP_400_BAD_REQUEST)
        prop = get_object_or_404(Property, pk=property_id, is_active=True)
        wishlist, _ = Wishlist.objects.get_or_create(
            guest=request.user,
            name="Saved",
        )
        item = WishlistItem.objects.filter(wishlist=wishlist, property=prop).first()
        if item:
            item.delete()
            return Response({"saved": False, "property_id": prop.id})
        else:
            WishlistItem.objects.create(wishlist=wishlist, property=prop)
            return Response({"saved": True, "property_id": prop.id})


class WishlistStatusView(APIView):
    """GET /api/v1/wishlist/status/?property_ids=1,2,3
       Returns which properties are saved by this user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get("property_ids", "")
        try:
            ids = [int(i) for i in ids_param.split(",") if i.strip()]
        except ValueError:
            return Response({"saved_ids": []})
        saved = WishlistItem.objects.filter(
            wishlist__guest=request.user,
            property_id__in=ids,
        ).values_list("property_id", flat=True)
        return Response({"saved_ids": list(saved)})


class SavedPropertiesView(generics.ListAPIView):
    """GET /api/v1/wishlist/saved/ — flat list of all saved properties"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = PropertyListSerializer
    pagination_class   = None  # flat list — frontend shows everything at once

    def get_queryset(self):
        from django.db.models import Max, Q
        saved = WishlistItem.objects.filter(wishlist__guest=self.request.user)
        return (
            Property.objects
            .filter(id__in=saved.values_list("property_id", flat=True), is_active=True)
            .annotate(saved_at=Max(
                "wishlisted_by__added_at",
                filter=Q(wishlisted_by__wishlist__guest=self.request.user),
            ))
            .order_by("-saved_at")
        )
