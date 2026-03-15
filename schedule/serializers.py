from rest_framework import serializers

from guests.models import WeddingPartyMember, WeddingPartyGroup
from guests.serializers import WeddingPartyMemberSerializer, WeddingPartyGroupSerializer
from .models import ScheduleDay, ScheduleEvent


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
