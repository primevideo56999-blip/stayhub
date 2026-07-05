from django.urls import path
from .views import WishlistListView, WishlistToggleView, WishlistStatusView, SavedPropertiesView

urlpatterns = [
    path("",         WishlistListView.as_view(),   name="wishlist-list"),
    path("toggle/",  WishlistToggleView.as_view(),  name="wishlist-toggle"),
    path("status/",  WishlistStatusView.as_view(),  name="wishlist-status"),
    path("saved/",   SavedPropertiesView.as_view(), name="wishlist-saved"),
]
