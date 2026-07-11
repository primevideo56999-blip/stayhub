"""
JWT auth middleware for Django Channels WebSocket connections.
Reads ?token=<jwt> from the query string and authenticates the user.
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token: str):
    from rest_framework_simplejwt.tokens import AccessToken
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        validated = AccessToken(token)
        return User.objects.get(id=validated["user_id"])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params       = parse_qs(query_string)
        token_list   = params.get("token", [])
        token        = token_list[0] if token_list else None

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
