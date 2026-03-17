from rest_framework import serializers

from .models import Guest, Party, WeddingPartyGroup, WeddingPartyMember


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


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ['id', 'first_name', 'last_name', 'email', 'is_attending', 'meal', 'is_child']


class PartySerializer(serializers.ModelSerializer):
    guests = GuestSerializer(source='ordered_guests', many=True, read_only=True)

    class Meta:
        model = Party
        fields = [
            'id', 'name', 'type', 'category', 'is_invited',
            'is_attending', 'rehearsal_dinner', 'comments', 'guests',
        ]
