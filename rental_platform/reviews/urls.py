from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, PropertyReviewsView

router = DefaultRouter()
router.register(r"", ReviewViewSet, basename="review")

urlpatterns = [
    path("property/<int:property_id>/", PropertyReviewsView.as_view(), name="property-reviews"),
    path("", include(router.urls)),
]
