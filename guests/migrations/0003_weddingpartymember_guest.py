from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0002_guest_seat_color'),
    ]

    operations = [
        migrations.AddField(
            model_name='weddingpartymember',
            name='guest',
            field=models.OneToOneField(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='wedding_party_info',
                to='guests.guest',
            ),
        ),
    ]
