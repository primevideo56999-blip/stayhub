from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet, PropertyPhotoUploadView,
    PropertyPhotoDeleteView, AmenityListView,
)

router = DefaultRouter()
router.register(r"", PropertyViewSet, basename="property")

urlpatterns = [
    path("amenities/",                          AmenityListView.as_view(),         name="amenity-list"),
    path("<int:property_id>/photos/",           PropertyPhotoUploadView.as_view(), name="property-photo-upload"),
    path("photos/<int:pk>/",                    PropertyPhotoDeleteView.as_view(),  name="property-photo-delete"),
    path("", include(router.urls)),
]
