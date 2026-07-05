from django.db import models
from users.models import User
from properties.models import Property


class Wishlist(models.Model):
    guest       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wishlists")
    name        = models.CharField(max_length=100, default="My Wishlist")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishlists"
        unique_together = ["guest", "name"]

    def __str__(self):
        return f"{self.guest.email} — {self.name}"


class WishlistItem(models.Model):
    wishlist    = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name="items")
    property    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="wishlisted_by")
    added_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishlist_items"
        unique_together = ["wishlist", "property"]

    def __str__(self):
        return f"{self.wishlist.name} — {self.property.title}"
