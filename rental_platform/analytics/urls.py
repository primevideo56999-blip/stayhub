from django.urls import path
from .views import HostAnalyticsView

urlpatterns = [
    path("host/", HostAnalyticsView.as_view(), name="host-analytics"),
]
