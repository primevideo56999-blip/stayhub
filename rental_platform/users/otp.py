"""
OTP (one-time code) storage backed by the Redis cache — no database model.

Keys (all with TTLs):
  otp:{purpose}:{user_id}            the 6-digit code           (10 min)
  otp_attempts:{purpose}:{user_id}   failed verify counter      (10 min)
  otp_sends:{purpose}:{user_id}      send counter for rate limit (15 min)
"""
import hmac
import secrets

from django.core.cache import cache

OTP_TTL       = 10 * 60   # code lifetime: 10 minutes
SEND_WINDOW   = 15 * 60   # rate-limit window: 15 minutes
MAX_SENDS     = 3         # codes per window
MAX_ATTEMPTS  = 5         # wrong guesses before the code is invalidated

PURPOSES = ("verify_account", "reset_password", "change_phone")


def _key(prefix, purpose, user_id):
    return f"{prefix}:{purpose}:{user_id}"


def can_send(user_id, purpose):
    """True if this user is under the send rate limit for this purpose."""
    return (cache.get(_key("otp_sends", purpose, user_id)) or 0) < MAX_SENDS


def generate_otp(user_id, purpose):
    """Create + store a fresh 6-digit code, bump the send counter."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    cache.set(_key("otp", purpose, user_id), code, timeout=OTP_TTL)
    cache.delete(_key("otp_attempts", purpose, user_id))

    sends_key = _key("otp_sends", purpose, user_id)
    try:
        # incr only works if the key exists; keeps the original window TTL
        cache.incr(sends_key)
    except ValueError:
        cache.set(sends_key, 1, timeout=SEND_WINDOW)
    return code


def verify_otp(user_id, purpose, code):
    """
    Check a submitted code. Deletes the stored code on success.
    After MAX_ATTEMPTS wrong guesses the code is invalidated.
    """
    otp_key = _key("otp", purpose, user_id)
    stored  = cache.get(otp_key)
    if not stored:
        return False

    attempts_key = _key("otp_attempts", purpose, user_id)
    try:
        attempts = cache.incr(attempts_key)
    except ValueError:
        cache.set(attempts_key, 1, timeout=OTP_TTL)
        attempts = 1
    if attempts > MAX_ATTEMPTS:
        cache.delete(otp_key)
        return False

    if hmac.compare_digest(str(stored), str(code).strip()):
        cache.delete(otp_key)
        cache.delete(attempts_key)
        return True
    return False
