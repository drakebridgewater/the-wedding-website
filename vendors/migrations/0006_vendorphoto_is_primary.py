from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0005_seed_vendor_checklists'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendorphoto',
            name='is_primary',
            field=models.BooleanField(default=False, help_text='Show this photo on the vendor card.'),
        ),
        migrations.AlterModelOptions(
            name='vendorphoto',
            options={'ordering': ['-is_primary', 'order', 'uploaded_at']},
        ),
    ]
