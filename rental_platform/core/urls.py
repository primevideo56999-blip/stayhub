from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/v1/auth/",        include("users.urls.auth")),
    path("api/v1/users/",       include("users.urls.users")),
    path("api/v1/properties/",  include("properties.urls")),
    path("api/v1/bookings/",    include("bookings.urls")),
    path("api/v1/payments/",    include("payments.urls")),
    path("api/v1/reviews/",     include("reviews.urls")),
    path("api/v1/wishlist/",    include("wishlist.urls")),
    path("api/v1/analytics/",   include("analytics.urls")),
    path("api/v1/chat/",        include("chat.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
