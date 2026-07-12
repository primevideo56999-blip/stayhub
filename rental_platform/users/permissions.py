from rest_framework.permissions import BasePermission


class IsHost(BasePermission):
    message = "Only hosts can perform this action."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_host


class IsHostProfileComplete(BasePermission):
    """
    Host must have bio and avatar before managing listings.
    """
    message = "Complete your host profile (bio and profile photo) before managing listings."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not request.user.is_host:
            return False
        has_bio   = bool(request.user.bio and request.user.bio.strip())
        has_photo = bool(request.user.avatar)
        return has_bio and has_photo