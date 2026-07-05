import django_filters
from .models import Property


class PropertyFilter(django_filters.FilterSet):
    # Price range
    min_price   = django_filters.NumberFilter(field_name="price_per_night", lookup_expr="gte")
    max_price   = django_filters.NumberFilter(field_name="price_per_night", lookup_expr="lte")

    # Capacity
    min_guests  = django_filters.NumberFilter(field_name="max_guests",  lookup_expr="gte")
    min_beds    = django_filters.NumberFilter(field_name="beds",        lookup_expr="gte")
    min_bedrooms= django_filters.NumberFilter(field_name="bedrooms",    lookup_expr="gte")
    min_bathrooms=django_filters.NumberFilter(field_name="bathrooms",   lookup_expr="gte")

    # Location
    city        = django_filters.CharFilter(lookup_expr="icontains")
    country     = django_filters.CharFilter(lookup_expr="icontains")

    # Type
    property_type = django_filters.CharFilter(lookup_expr="exact")

    # Rules
    allows_pets     = django_filters.BooleanFilter()
    allows_smoking  = django_filters.BooleanFilter()

    # Rating
    min_rating  = django_filters.NumberFilter(field_name="avg_rating", lookup_expr="gte")

    # Amenities
    amenities   = django_filters.BaseInFilter(field_name="amenities__id", lookup_expr="in")

    class Meta:
        model  = Property
        fields = [
            "min_price", "max_price", "min_guests", "min_beds",
            "min_bedrooms", "min_bathrooms", "city", "country",
            "property_type", "allows_pets", "allows_smoking",
            "min_rating", "amenities",
        ]
