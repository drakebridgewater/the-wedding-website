from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='guest',
            name='seat_color',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]
