from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('properties', '0001_initial'),
        ('users', '0002_fix_image_urls'),
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('guest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_guest', to='users.user')),
                ('host', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_host', to='users.user')),
                ('property', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations', to='properties.property')),
            ],
            options={
                'db_table': 'conversations',
                'ordering': ['-updated_at'],
                'unique_together': {('property', 'guest', 'host')},
            },
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('body', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.conversation')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to='users.user')),
            ],
            options={
                'db_table': 'messages',
                'ordering': ['created_at'],
            },
        ),
    ]
