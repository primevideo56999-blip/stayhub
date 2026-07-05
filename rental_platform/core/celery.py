import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

app = Celery("rental_platform")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
