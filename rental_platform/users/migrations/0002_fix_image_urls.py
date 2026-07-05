from django.db import migrations

def fix_urls(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.exclude(avatar='').exclude(avatar=None):
        val = str(user.avatar)
        if val.startswith('https:/') and not val.startswith('https://'):
            user.avatar = 'https://' + val[7:]
            user.save()

    PropertyPhoto = apps.get_model('properties', 'PropertyPhoto')
    for photo in PropertyPhoto.objects.all():
        val = str(photo.image)
        if val.startswith('https:/') and not val.startswith('https://'):
            photo.image = 'https://' + val[7:]
            photo.save()

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(fix_urls, migrations.RunPython.noop),
    ]
