from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0007_party_wants_physical_card'),
    ]

    operations = [
        migrations.AddField(
            model_name='guest',
            name='is_plus_one',
            field=models.BooleanField(default=False),
        ),
    ]
