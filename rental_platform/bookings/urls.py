from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, PricePreviewView

router = DefaultRouter()
router.register(r"", BookingViewSet, basename="booking")

urlpatterns = [
    path("price-preview/", PricePreviewView.as_view(), name="price-preview"),
    path("", include(router.urls)),
]
