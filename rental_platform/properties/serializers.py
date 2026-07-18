from rest_framework import serializers
from .models import Property, PropertyPhoto, PropertyAvailability, Amenity
from users.serializers import UserSerializer


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Amenity
        fields = ["id", "name", "icon", "category"]


class PropertyPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = PropertyPhoto
        fields = ["id", "image", "caption", "is_cover", "order", "uploaded_at"]
        read_only_fields = ["uploaded_at"]

    def get_image(self, obj):
        if not obj.image:
            return None
        url = str(obj.image.name if hasattr(obj.image, 'name') else obj.image)
        if url.startswith('http'):
            if 'res.cloudinary.com' in url:
                parts = url.split('cgtjcyy4/')
                if len(parts) > 1:
                    path = parts[-1]
                    return f"https://res.cloudinary.com/cgtjcyy4/image/upload/{path}"
            return url
        import os
        cloud = os.environ.get('CLOUDINARY_CLOUD_NAME', 'cgtjcyy4')
        return f"https://res.cloudinary.com/{cloud}/image/upload/{url}"

    def create(self, validated_data):
        request = self.context.get('request')
        image_file = request.FILES.get('image_upload') or request.FILES.get('image')
        instance = PropertyPhoto.objects.create(**validated_data)
        if image_file:
            instance.image = image_file
            instance.save()
        return instance


class PropertyAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = PropertyAvailability
        fields = ["id", "date", "reason"]


class PropertyListSerializer(serializers.ModelSerializer):
    """Lightweight — used in search results / lists."""
    cover_photo = serializers.SerializerMethodField()
    host_name   = serializers.CharField(source="host.full_name", read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model  = Property
        fields = [
            "id", "title", "property_type", "city", "country",
            "latitude", "longitude", "price_per_night", "cleaning_fee",
            "max_guests", "bedrooms", "beds", "bathrooms",
            "avg_rating", "total_reviews",
            "cover_photo", "host_name", "status", "distance_km",
        ]

    def get_distance_km(self, obj):
        # Present only on near_lat/near_lng queries (queryset annotation)
        dist = getattr(obj, "distance_km", None)
        return round(dist, 2) if dist is not None else None

    def get_cover_photo(self, obj):
        photo = obj.cover_photo
        if not photo or not photo.image:
            return None
        url = str(photo.image.name if hasattr(photo.image, 'name') else photo.image)
        if url.startswith('http'):
            if 'res.cloudinary.com' in url:
                parts = url.split('cgtjcyy4/')
                if len(parts) > 1:
                    path = parts[-1]
                    return f"https://res.cloudinary.com/cgtjcyy4/image/upload/{path}"
            return url
        import os
        cloud = os.environ.get('CLOUDINARY_CLOUD_NAME', 'cgtjcyy4')
        return f"https://res.cloudinary.com/{cloud}/image/upload/{url}"

class PropertyDetailSerializer(serializers.ModelSerializer):
    """Full detail — used on the property detail page."""
    photos       = PropertyPhotoSerializer(many=True, read_only=True)
    amenities    = AmenitySerializer(many=True, read_only=True)
    amenity_ids  = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Amenity.objects.all(), write_only=True, source="amenities"
    )
    host         = UserSerializer(read_only=True)
    blocked_dates = PropertyAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model  = Property
        fields = [
            "id", "host", "title", "description", "property_type", "status",
            "address_line1", "address_line2", "city", "state", "country", "postal_code",
            "latitude", "longitude",
            "max_guests", "bedrooms", "beds", "bathrooms",
            "price_per_night", "cleaning_fee", "service_fee_pct",
            "min_nights", "max_nights", "check_in_time", "check_out_time",
            "house_rules", "allows_pets", "allows_smoking", "allows_parties",
            "amenities", "amenity_ids", "photos", "blocked_dates",
            "avg_rating", "total_reviews", "total_bookings",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = [
            "host", "avg_rating", "total_reviews", "total_bookings",
            "is_active", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        amenities = validated_data.pop("amenities", [])
        property_ = Property.objects.create(**validated_data)
        property_.amenities.set(amenities)
        return property_

    def update(self, instance, validated_data):
        amenities = validated_data.pop("amenities", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if amenities is not None:
            instance.amenities.set(amenities)
        return instance
