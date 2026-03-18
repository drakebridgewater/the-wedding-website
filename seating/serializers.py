from rest_framework import serializers

from guests.models import Guest
from .models import SeatingConfig, SeatingTable


class SeatingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatingConfig
        fields = ['grid_cols', 'grid_rows', 'cell_size_ft']


class GuestSeatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ['id', 'first_name', 'last_name', 'is_child', 'meal', 'seating_table_id', 'seat_color']


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
