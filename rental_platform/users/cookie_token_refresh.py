"""
Drop this into your auth app (e.g. accounts/views.py or accounts/cookie_token_refresh.py)
and wire it up in urls.py as shown at the bottom of this file.

Why this exists
---------------
The Next.js frontend stores the refresh token in an httpOnly cookie and never
sends it in the request body (see auth.ts: "Refresh token lives in an httpOnly
cookie the browser attaches automatically; this module never reads or writes it
directly.").

SimpleJWT's default TokenRefreshView expects {"refresh": "<token>"} in the
JSON body, which causes a 400 {"refresh": ["This field is required."]} error.

This view reads the token from the cookie instead.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken


# ---------------------------------------------------------------------------
# Settings (put these in settings.py / base.py if you want to customise them)
# ---------------------------------------------------------------------------
#
# SIMPLE_JWT_COOKIE = {
#     "name":      "refresh_token",   # cookie name the frontend sets / reads
#     "httponly":  True,
#     "samesite":  "Lax",
#     "secure":    not DEBUG,          # True in production (HTTPS only)
#     "max_age":   60 * 60 * 24 * 7,  # 7 days (match SIMPLE_JWT REFRESH_TOKEN_LIFETIME)
# }


def _cookie_settings() -> dict:
    """Return cookie config from settings or safe defaults."""
    defaults = {
        "name": "refresh_token",
        "httponly": True,
        "samesite": "Lax",
        "secure": not getattr(settings, "DEBUG", True),
        "max_age": 60 * 60 * 24 * 7,  # 7 days
    }
    return {**defaults, **getattr(settings, "SIMPLE_JWT_COOKIE", {})}


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/token/refresh/

    Reads the refresh token from the httpOnly cookie (not the request body).
    Returns a new access token in JSON and rotates the refresh cookie if
    ROTATE_REFRESH_TOKENS is enabled in SIMPLE_JWT settings.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        cfg = _cookie_settings()
        raw_token = request.COOKIES.get(cfg["name"])

        if not raw_token:
            return Response(
                {"detail": "Refresh token cookie not found. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_token)
        except TokenError as exc:
            raise InvalidToken({"detail": str(exc)})

        data: dict = {"access": str(refresh.access_token)}

        response = Response(data, status=status.HTTP_200_OK)

        # Rotate the refresh token if SimpleJWT is configured to do so
        rotate = getattr(settings, "SIMPLE_JWT", {}).get("ROTATE_REFRESH_TOKENS", False)
        if rotate:
            # Blacklist the old token (requires 'rest_framework_simplejwt.token_blacklist' in INSTALLED_APPS)
            blacklist = getattr(settings, "SIMPLE_JWT", {}).get("BLACKLIST_AFTER_ROTATION", False)
            if blacklist:
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass  # blacklist app not installed — skip silently

            new_refresh = RefreshToken.for_user(refresh.user)  # type: ignore[attr-defined]
            response.set_cookie(
                key=cfg["name"],
                value=str(new_refresh),
                max_age=cfg["max_age"],
                httponly=cfg["httponly"],
                samesite=cfg["samesite"],
                secure=cfg["secure"],
            )

        return response


class CookieTokenObtainView(APIView):
    """
    Mixin helper: after a successful login / register, call
    `set_refresh_cookie(response, refresh_token_str)` to write the httpOnly cookie.

    Usage in LoginView / RegisterView:
        from .cookie_token_refresh import set_refresh_cookie
        ...
        response = Response({...})
        set_refresh_cookie(response, str(refresh))
        return response
    """


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Write the httpOnly refresh cookie onto an existing Response object."""
    cfg = _cookie_settings()
    response.set_cookie(
        key=cfg["name"],
        value=refresh_token,
        max_age=cfg["max_age"],
        httponly=cfg["httponly"],
        samesite=cfg["samesite"],
        secure=cfg["secure"],
    )


def clear_refresh_cookie(response: Response) -> None:
    """Erase the refresh cookie (call from LogoutView)."""
    cfg = _cookie_settings()
    response.delete_cookie(cfg["name"])


# ---------------------------------------------------------------------------
# urls.py wiring  (paste into your accounts/urls.py or the root urls.py)
# ---------------------------------------------------------------------------
#
# from accounts.cookie_token_refresh import CookieTokenRefreshView
#
# urlpatterns = [
#     ...
#     p
#     ...
# ]