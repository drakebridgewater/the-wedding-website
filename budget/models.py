from django.db import models
from djmoney.models.fields import MoneyField


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
