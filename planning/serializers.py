from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from guests.models import Guest
from .models import BudgetLineItem, Expense, SeatingConfig, SeatingTable, WeddingPartyMember, WeddingPartyGroup, ScheduleDay, ScheduleEvent


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
    # CharField avoids DecimalField crashing on Money objects in to_representation.
    # to_representation overrides these with correctly formatted values.
    estimated_cost = serializers.CharField()
    actual_cost = serializers.CharField(allow_null=True, required=False)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
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


class WeddingPartyMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = WeddingPartyMember
        fields = ['id', 'name', 'role', 'role_display', 'color', 'email', 'phone', 'order']


class WeddingPartyGroupSerializer(serializers.ModelSerializer):
    members = WeddingPartyMemberSerializer(many=True, read_only=True)

    class Meta:
        model = WeddingPartyGroup
        fields = ['id', 'name', 'description', 'color', 'order', 'members']


class ScheduleEventSerializer(serializers.ModelSerializer):
    attendee_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=WeddingPartyMember.objects.all(),
        source='attendees', required=False,
    )
    attendees = WeddingPartyMemberSerializer(many=True, read_only=True)
    conflicts = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleEvent
        fields = [
            'id', 'day', 'start_time', 'duration_minutes',
            'name', 'location', 'category', 'notes',
            'attendees', 'attendee_ids', 'conflicts',
        ]
        read_only_fields = ['id', 'attendees', 'conflicts']

    def get_conflicts(self, obj):
        """Return IDs of attendees who are double-booked at this time on the same day."""
        start = obj.start_time
        start_mins = start.hour * 60 + start.minute
        end_mins = start_mins + obj.duration_minutes

        attendee_ids = list(obj.attendees.values_list('id', flat=True))
        if not attendee_ids:
            return []

        overlapping = ScheduleEvent.objects.filter(
            day=obj.day,
            attendees__in=attendee_ids,
        ).exclude(pk=obj.pk)

        conflicted = set()
        for other in overlapping:
            o_start = other.start_time.hour * 60 + other.start_time.minute
            o_end = o_start + other.duration_minutes
            if start_mins < o_end and end_mins > o_start:
                conflicted.update(
                    other.attendees.filter(id__in=attendee_ids).values_list('id', flat=True)
                )
        return list(conflicted)

    def create(self, validated_data):
        attendees = validated_data.pop('attendees', [])
        event = ScheduleEvent.objects.create(**validated_data)
        event.attendees.set(attendees)
        return event

    def update(self, instance, validated_data):
        attendees = validated_data.pop('attendees', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if attendees is not None:
            instance.attendees.set(attendees)
        return instance


class ScheduleDaySerializer(serializers.ModelSerializer):
    events = ScheduleEventSerializer(many=True, read_only=True)

    class Meta:
        model = ScheduleDay
        fields = ['id', 'date', 'label', 'order', 'events']
        read_only_fields = ['id', 'events']


class SeatingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatingConfig
        fields = ['grid_cols', 'grid_rows', 'cell_size_ft']


class GuestSeatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ['id', 'first_name', 'last_name', 'is_child', 'meal', 'seating_table_id']


class SeatingTableSerializer(serializers.ModelSerializer):
    assigned_count = serializers.SerializerMethodField()
    guests = GuestSeatingSerializer(many=True, read_only=True)

    class Meta:
        model = SeatingTable
        fields = [
            'id', 'name', 'capacity', 'shape',
            'grid_x', 'grid_y', 'grid_width', 'grid_height',
            'notes', 'assigned_count', 'guests',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'assigned_count', 'guests', 'created_at', 'updated_at']

    def get_assigned_count(self, obj):
        return obj.guests.count()
