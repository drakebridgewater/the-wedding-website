from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0009_backfill_guests_for_empty_parties'),
    ]

    operations = [
        migrations.AddField(
            model_name='weddingpartymember',
            name='is_informed',
            field=models.BooleanField(
                default=False,
                help_text='Has this person been informed that they are in the wedding party? '
                          'Only informed members appear on the public wedding party page.',
            ),
        ),
    ]
