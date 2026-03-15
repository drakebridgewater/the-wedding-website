from django.contrib import admin

from .models import BudgetLineItem, Expense


class ExpenseInline(admin.TabularInline):
    model = Expense
    fields = ('description', 'amount', 'paid_on', 'notes')
    extra = 0


@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display = ('category', 'description', 'vendor_name', 'estimated_cost', 'actual_cost', 'is_paid')
    list_filter = ('category', 'is_paid')
    search_fields = ('description', 'vendor_name', 'notes')
    list_editable = ('is_paid',)
    inlines = [ExpenseInline]
