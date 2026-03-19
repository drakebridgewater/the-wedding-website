from django.db import migrations, models


def migrate_dimagi_to_formal(apps, schema_editor):
    """Rename any legacy 'dimagi' party type to 'formal'."""
    Party = apps.get_model('guests', 'Party')
    Party.objects.filter(type='dimagi').update(type='formal')


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0003_remove_party_is_invited_party_status'),
    ]

    operations = [
        migrations.RunPython(migrate_dimagi_to_formal, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='party',
            name='type',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('formal', 'Formal'),
                    ('fun', 'Fun'),
                    ('family', 'Family'),
                    ('work', 'Work'),
                ],
            ),
        ),
    ]
