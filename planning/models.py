from django.db import models
from djmoney.models.fields import MoneyField


class TickTickSettings(models.Model):
    """Singleton model — only one row (pk=1) should ever exist."""

    client_id = models.CharField(max_length=200, blank=True)
    client_secret = models.CharField(max_length=200, blank=True)
    username = models.EmailField(blank=True, help_text='TickTick account email')
    password = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick account password. Stored in the database — ensure your admin is accessed over HTTPS in production.',
    )
    project_name = models.CharField(
        max_length=100, default='Wedding',
        help_text='Name of the TickTick project to sync (case-insensitive).',
    )
    drake_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick assignee ID for Drake. Run `manage.py ticktick_auth` to find this value.',
    )
    shawna_assignee_id = models.CharField(
        max_length=200, blank=True,
        help_text='TickTick assignee ID for Shawna. Run `manage.py ticktick_auth` to find this value.',
    )

    class Meta:
        verbose_name = 'TickTick Settings'
        verbose_name_plural = 'TickTick Settings'

    def __str__(self):
        return 'TickTick Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class BudgetLineItem(models.Model):
    CATEGORIES = [
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

    category = models.CharField(max_length=30, choices=CATEGORIES)
    description = models.CharField(max_length=255)
    estimated_cost = MoneyField(max_digits=10, decimal_places=2, default_currency='USD')
    actual_cost = MoneyField(
        max_digits=10, decimal_places=2, default_currency='USD',
        null=True, blank=True,
    )
    vendor_name = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'description']

    def __str__(self):
        return f"{self.get_category_display()} – {self.description}"


class Expense(models.Model):
    budget_item = models.ForeignKey(
        BudgetLineItem, on_delete=models.CASCADE, related_name='expenses'
    )
    amount = MoneyField(max_digits=10, decimal_places=2, default_currency='USD')
    description = models.CharField(max_length=255)
    paid_on = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-paid_on', '-created_at']

    def __str__(self):
        return f"{self.budget_item}: {self.amount}"
