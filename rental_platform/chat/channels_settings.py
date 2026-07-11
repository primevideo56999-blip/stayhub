# Add these to core/settings/base.py

# ── Django Channels ───────────────────────────────────────────────────────────
INSTALLED_APPS += ["channels", "chat"]

ASGI_APPLICATION = "core.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG":  {
            "hosts": [("redis", 6379)],   # use REDIS_URL in production
        },
    }
}
