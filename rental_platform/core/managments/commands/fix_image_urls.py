from django.core.management.base import BaseCommand
from users.models import User
from properties.models import PropertyPhoto

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Fix avatars
        for user in User.objects.exclude(avatar='').exclude(avatar=None):
            if str(user.avatar).startswith('https:/') and not str(user.avatar).startswith('https://'):
                user.avatar = 'https://' + str(user.avatar)[7:]
                user.save()
                self.stdout.write(f"Fixed avatar for {user.email}")

        # Fix property photos
        for photo in PropertyPhoto.objects.all():
            if str(photo.image).startswith('https:/') and not str(photo.image).startswith('https://'):
                photo.image = 'https://' + str(photo.image)[7:]
                photo.save()
                self.stdout.write(f"Fixed photo {photo.id}")

        self.stdout.write("Done!")