from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, HostProfile


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    role      = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.GUEST)
    phone     = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model  = User
        fields = ["email", "username", "first_name", "last_name", "password", "password2", "role", "phone"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.role == User.Role.HOST:
            HostProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    avatar = serializers.SerializerMethodField()
    avatar_upload = serializers.ImageField(write_only=True, required=False, source='avatar')

    class Meta:
        model  = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "full_name", "role", "phone", "phone_verified", "email_verified",
            "avatar", "avatar_upload", "bio", "is_verified", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "phone_verified", "email_verified", "is_verified", "created_at"]

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        url = str(obj.avatar.name if hasattr(obj.avatar, 'name') else obj.avatar)
        # already a full URL
        if url.startswith('http'):
            if 'res.cloudinary.com' in url:
                parts = url.split('cgtjcyy4/')
                if len(parts) > 1:
                    path = parts[-1]
                    return f"https://res.cloudinary.com/cgtjcyy4/image/upload/{path}"
            return url
        # relative path — build full cloudinary URL
        import os
        cloud = os.environ.get('CLOUDINARY_CLOUD_NAME', 'cgtjcyy4')
        return f"https://res.cloudinary.com/{cloud}/image/upload/{url}"

class HostProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = HostProfile
        fields = ["user", "business_name", "description", "response_rate",
                  "response_time", "is_superhost", "joined_as_host"]
        read_only_fields = ["response_rate", "is_superhost", "joined_as_host"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class ResetPasswordSerializer(serializers.Serializer):
    """Forgot-password: verify emailed OTP code, then set a new password."""
    email        = serializers.EmailField()
    code         = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
