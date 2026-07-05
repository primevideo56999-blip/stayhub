from rest_framework import serializers
from .models import Property, PropertyPhoto, PropertyAvailability, Amenity
from users.serializers import UserSerializer


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Amenity
        fields = ["id", "name", "icon", "category"]


class PropertyPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()  # add this

    class Meta:
        model  = PropertyPhoto
        fields = ["id", "image", "caption", "is_cover", "order", "uploaded_at"]
        read_only_fields = ["uploaded_at"]

    def get_image(self, obj):
        if not obj.image:
            return None
        name = str(obj.image)
        if name.startswith('http'):
            return name
        if name.startswith('res.cloudinary.com'):
            return f"https://{name}"
        return f"https://res.cloudinary.com/cgtjcyy4/{name}"


class PropertyAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = PropertyAvailability
        fields = ["id", "date", "reason"]


class PropertyListSerializer(serializers.ModelSerializer):
    """Lightweight — used in search results / lists."""
    cover_photo = serializers.SerializerMethodField()
    host_name   = serializers.CharField(source="host.full_name", read_only=True)

    class Meta:
        model  = Property
        fields = [
            "id", "title", "property_type", "city", "country",
            "latitude", "longitude", "price_per_night", "cleaning_fee",
            "max_guests", "bedrooms", "beds", "bathrooms",
            "avg_rating", "total_reviews",
            "cover_photo", "host_name", "status",
        ]

    def get_cover_photo(self, obj):
        photo = obj.cover_photo
        if not photo or not photo.image:
            return None
        name = str(photo.image)
        if name.startswith('http'):
            return name
        if name.startswith('res.cloudinary.com'):
            return f"https://{name}"
        return f"https://res.cloudinary.com/cgtjcyy4/{name}"

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
