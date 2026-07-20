from django.urls import path
from rental_platform.users.cookie_token_refresh import CookieTokenRefreshView
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import (
    LoginView, RegisterView, LogoutView, MeView, ChangePasswordView,
    OtpSendView, OtpVerifyView, ForgotPasswordView, ResetPasswordView,
)

urlpatterns = [
    path("register/",         RegisterView.as_view(),       name="auth-register"),
    path("login/",            LoginView.as_view(),           name="auth-login"),
    path("logout/",           LogoutView.as_view(),          name="auth-logout"),
    # path("token/refresh/",    TokenRefreshView.as_view(),    name="token-refresh"),
    path("me/",               MeView.as_view(),              name="auth-me"),
    path("change-password/",  ChangePasswordView.as_view(),  name="auth-change-password"),
    path("otp/send/",         OtpSendView.as_view(),         name="auth-otp-send"),
    path("otp/verify/",       OtpVerifyView.as_view(),       name="auth-otp-verify"),
    path("forgot-password/",  ForgotPasswordView.as_view(),  name="auth-forgot-password"),
    path("reset-password/",   ResetPasswordView.as_view(),   name="auth-reset-password"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
]
