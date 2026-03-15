from rest_framework import serializers

from .models import WeddingPartyMember, WeddingPartyGroup


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
