from django.db import migrations

# The meal choices that were previously hardcoded in guests.models.MEALS
SEED_MEALS = [
    ('beef', 'Beef', 0),
    ('fish', 'Fish', 1),
    ('hen', 'Chicken', 2),
    ('vegetarian', 'Vegetarian', 3),
]


def seed_meal_options(apps, schema_editor):
    MealOption = apps.get_model('guests', 'MealOption')
    for key, label, ordering in SEED_MEALS:
        MealOption.objects.get_or_create(
            key=key, defaults={'label': label, 'ordering': ordering},
        )


def unseed_meal_options(apps, schema_editor):
    MealOption = apps.get_model('guests', 'MealOption')
    MealOption.objects.filter(key__in=[key for key, _, _ in SEED_MEALS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0017_mealoption_alter_guest_meal'),
    ]

    operations = [
        migrations.RunPython(seed_meal_options, unseed_meal_options),
    ]
