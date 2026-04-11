from django.db import migrations


def backfill_guests(apps, schema_editor):
    Party = apps.get_model('guests', 'Party')
    Guest = apps.get_model('guests', 'Guest')

    for party in Party.objects.all():
        if party.guest_set.exists():
            continue

        name = party.name.strip()
        parts = name.split()

        if len(parts) >= 2:
            first_name = parts[0]
            last_name = parts[-1]
        else:
            # Single word or empty — use full party name for both
            first_name = name
            last_name = name

        Guest.objects.create(
            party=party,
            first_name=first_name,
            last_name=last_name,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0008_guest_is_plus_one'),
    ]

    operations = [
        migrations.RunPython(backfill_guests, migrations.RunPython.noop),
    ]
