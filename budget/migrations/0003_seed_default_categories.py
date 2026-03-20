from django.db import migrations


DEFAULT_CATEGORIES = [
    ('venue', 'Venue'),
    ('catering', 'Catering'),
    ('cake', 'Cake & Desserts'),
    ('flowers', 'Flowers & Décor'),
    ('entertainment', 'Entertainment'),
    ('attire', 'Attire'),
    ('beauty', 'Beauty & Hair'),
    ('photography', 'Photography & Video'),
    ('stationery', 'Stationery'),
    ('transportation', 'Transportation'),
    ('gifts', 'Gifts & Favors'),
    ('miscellaneous', 'Miscellaneous'),
]


def seed_categories(apps, schema_editor):
    BudgetCategory = apps.get_model('budget', 'BudgetCategory')
    for order, (slug, label) in enumerate(DEFAULT_CATEGORIES):
        BudgetCategory.objects.get_or_create(slug=slug, defaults={'label': label, 'order': order})


def remove_categories(apps, schema_editor):
    BudgetCategory = apps.get_model('budget', 'BudgetCategory')
    BudgetCategory.objects.filter(slug__in=[s for s, _ in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0002_add_budget_category'),
    ]

    operations = [
        migrations.RunPython(seed_categories, remove_categories),
    ]
