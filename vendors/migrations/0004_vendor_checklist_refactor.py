from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0003_seed_venue_checklist_items'),
    ]

    operations = [
        # Rename model (renames the DB table too)
        migrations.RenameModel(
            old_name='VenueChecklistItem',
            new_name='VendorChecklistItem',
        ),

        # Add vendor_type field (existing rows default to 'venue')
        migrations.AddField(
            model_name='vendorchecklistitem',
            name='vendor_type',
            field=models.CharField(
                choices=[
                    ('venue',         'Venue'),
                    ('caterer',       'Caterer'),
                    ('cake',          'Cake'),
                    ('florist',       'Florist'),
                    ('entertainment', 'Entertainment'),
                ],
                default='venue',
                max_length=20,
                db_index=True,
            ),
        ),

        # Add question field for the second-line prompt text
        migrations.AddField(
            model_name='vendorchecklistitem',
            name='question',
            field=models.TextField(
                blank=True,
                help_text='The actual question to ask (displayed below the item label).',
            ),
        ),

        # Update ordering to include vendor_type
        migrations.AlterModelOptions(
            name='vendorchecklistitem',
            options={'ordering': ['vendor_type', 'order', 'id']},
        ),

        # Add checklist JSONField to non-venue vendor models
        migrations.AddField(
            model_name='catereroption',
            name='checklist',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='cakeoption',
            name='checklist',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='floristoption',
            name='checklist',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='entertainmentoption',
            name='checklist',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
