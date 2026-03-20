from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from .models import BudgetCategory, BudgetLineItem, Expense


def _category_label(slug):
    try:
        return BudgetCategory.objects.get(slug=slug).label
    except BudgetCategory.DoesNotExist:
        return slug.replace('_', ' ').title()


class ExpenseSerializer(serializers.ModelSerializer):
    amount = serializers.CharField()

    class Meta:
        model = Expense
        fields = ['id', 'amount', 'description', 'paid_on', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['amount'] = str(instance.amount.amount)
        return rep

    def validate_amount(self, value):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            raise serializers.ValidationError('Enter a valid dollar amount.')

    def create(self, validated_data):
        amount = validated_data.pop('amount')
        return Expense.objects.create(amount=amount, **validated_data)


class BudgetLineItemSerializer(serializers.ModelSerializer):
    estimated_cost = serializers.CharField()
    actual_cost = serializers.CharField(allow_null=True, required=False)
    category_display = serializers.SerializerMethodField()

    def get_category_display(self, obj):
        return _category_label(obj.category)
    variance = serializers.SerializerMethodField()
    expenses = ExpenseSerializer(many=True, read_only=True)
    expense_total = serializers.SerializerMethodField()

    class Meta:
        model = BudgetLineItem
        fields = [
            'id', 'category', 'category_display', 'description',
            'estimated_cost', 'actual_cost', 'vendor_name',
            'notes', 'is_paid', 'variance',
            'expenses', 'expense_total',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'category_display', 'variance',
            'expenses', 'expense_total',
            'created_at', 'updated_at',
        ]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['estimated_cost'] = str(instance.estimated_cost.amount)
        rep['actual_cost'] = (
            str(instance.actual_cost.amount) if instance.actual_cost is not None else None
        )
        return rep

    def get_expense_total(self, obj):
        total = sum(e.amount.amount for e in obj.expenses.all())
        return str(total)

    def get_variance(self, obj):
        expense_total = sum(e.amount.amount for e in obj.expenses.all())
        if expense_total:
            return str(obj.estimated_cost.amount - expense_total)
        if obj.actual_cost is not None:
            return str(obj.estimated_cost.amount - obj.actual_cost.amount)
        return None

    def validate_estimated_cost(self, value):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            raise serializers.ValidationError('Enter a valid dollar amount.')

    def validate_actual_cost(self, value):
        if value is None or value == '':
            return None
        try:
            return Decimal(str(value))
        except InvalidOperation:
            raise serializers.ValidationError('Enter a valid dollar amount.')

    def create(self, validated_data):
        estimated = validated_data.pop('estimated_cost')
        actual = validated_data.pop('actual_cost', None)
        return BudgetLineItem.objects.create(
            estimated_cost=estimated,
            actual_cost=actual,
            **validated_data,
        )

    def update(self, instance, validated_data):
        if 'estimated_cost' in validated_data:
            instance.estimated_cost = validated_data.pop('estimated_cost')
        if 'actual_cost' in validated_data:
            instance.actual_cost = validated_data.pop('actual_cost')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
