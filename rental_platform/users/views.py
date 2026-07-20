from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User
from .serializers import (
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    ResetPasswordSerializer,
)
from . import otp as otp_store
from notifications.tasks import send_otp_email
from .cookie_token_refresh import set_refresh_cookie, clear_refresh_cookie


class CustomTokenSerializer(TokenObtainPairSerializer):
    """Add user info to login response."""
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class   = CustomTokenSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop("refresh", None)
            if refresh_token:
                set_refresh_cookie(response, refresh_token)
        return response


class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class   = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Email a verification code (soft gate — account works immediately)
        code = otp_store.generate_otp(user.id, "verify_account")
        send_otp_email.delay(user.id, code, "verify_account")
        refresh = RefreshToken.for_user(user)
        response = Response({
            "user":   UserSerializer(user).data,
            "access": str(refresh.access_token),
            # refresh is NOT included in the body — it goes into the httpOnly cookie below
        }, status=status.HTTP_201_CREATED)
        set_refresh_cookie(response, str(refresh))
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .cookie_token_refresh import _cookie_settings
        cfg = _cookie_settings()
        raw_token = request.COOKIES.get(cfg["name"])
        response = Response({"detail": "Logged out."}, status=status.HTTP_205_RESET_CONTENT)
        if raw_token:
            try:
                token = RefreshToken(raw_token)
                token.blacklist()
            except Exception:
                pass  # already invalid — still clear the cookie
        clear_refresh_cookie(response)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    """Get and update the authenticated user's profile."""
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        # Changing the phone number invalidates its verified status —
        # the user re-verifies via the change_phone OTP flow
        new_phone = serializer.validated_data.get("phone")
        if new_phone is not None and new_phone != self.request.user.phone:
            serializer.save(phone_verified=False)
        else:
            serializer.save()


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class   = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})


# ── OTP verification ──────────────────────────────────────────────────────────

class OtpSendView(APIView):
    """
    Send (or resend) a verification code to the user's email.

    Authenticated: {"purpose": "verify_account" | "change_phone"}
    Anonymous:     {"purpose": "reset_password", "email": "..."}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        purpose = request.data.get("purpose")
        if purpose not in otp_store.PURPOSES:
            return Response({"detail": "Invalid purpose."}, status=status.HTTP_400_BAD_REQUEST)

        if purpose == "reset_password":
            email = (request.data.get("email") or "").strip().lower()
            if not email:
                return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            user = User.objects.filter(email__iexact=email).first()
            # Always claim success so account existence isn't leaked
            if user and otp_store.can_send(user.id, purpose):
                code = otp_store.generate_otp(user.id, purpose)
                send_otp_email.delay(user.id, code, purpose)
            return Response({"detail": "If that account exists, a code has been emailed."})

        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        if not otp_store.can_send(user.id, purpose):
            return Response(
                {"detail": "Too many codes requested. Try again in 15 minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        code = otp_store.generate_otp(user.id, purpose)
        send_otp_email.delay(user.id, code, purpose)
        return Response({"detail": "Verification code sent to your email."})


class OtpVerifyView(APIView):
    """
    Confirm a code (authenticated).

    {"purpose": "verify_account", "code": "123456"}
      → sets email_verified (+ phone_verified when a phone is on file)
    {"purpose": "change_phone", "code": "123456", "phone": "+91..."}
      → sets the new phone and marks it verified
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        purpose = request.data.get("purpose")
        code    = request.data.get("code") or ""
        if purpose not in ("verify_account", "change_phone"):
            return Response({"detail": "Invalid purpose."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if purpose == "change_phone" and not (request.data.get("phone") or "").strip():
            return Response({"detail": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_store.verify_otp(user.id, purpose, code):
            return Response(
                {"detail": "Invalid or expired code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if purpose == "verify_account":
            user.email_verified = True
            if user.phone:
                user.phone_verified = True
            user.save(update_fields=["email_verified", "phone_verified"])
        else:  # change_phone
            user.phone = request.data["phone"].strip()
            user.phone_verified = True
            user.save(update_fields=["phone", "phone_verified"])

        return Response({"detail": "Verified.", "user": UserSerializer(user).data})


class ForgotPasswordView(APIView):
    """POST {"email"} → emails a reset code (always 200; doesn't leak accounts)."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if user and otp_store.can_send(user.id, "reset_password"):
            code = otp_store.generate_otp(user.id, "reset_password")
            send_otp_email.delay(user.id, code, "reset_password")
        return Response({"detail": "If that account exists, a code has been emailed."})


class ResetPasswordView(APIView):
    """POST {"email", "code", "new_password"} → verify code and set password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(email__iexact=data["email"].strip()).first()
        if not user or not otp_store.verify_otp(user.id, "reset_password", data["code"]):
            return Response(
                {"detail": "Invalid or expired code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(data["new_password"])
        # Reaching the inbox proves ownership of the email
        user.email_verified = True
        user.save(update_fields=["password", "email_verified"])
        return Response({"detail": "Password reset. You can now log in."})