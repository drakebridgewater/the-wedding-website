from rest_framework import serializers

from .models import EmailTemplate, Guest, Party, SentEmail, WeddingPartyGroup, WeddingPartyMember


class WeddingPartyMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = WeddingPartyMember
        fields = ['id', 'name', 'role', 'role_display', 'color', 'email', 'phone', 'order', 'guest_id']
        read_only_fields = ['guest_id']


class WeddingPartyGroupSerializer(serializers.ModelSerializer):
    members = WeddingPartyMemberSerializer(many=True, read_only=True)

    class Meta:
        model = WeddingPartyGroup
        fields = ['id', 'name', 'description', 'color', 'order', 'members']


class GuestSerializer(serializers.ModelSerializer):
    party_id = serializers.PrimaryKeyRelatedField(
        queryset=Party.objects.all(),
        source='party',
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Guest
        fields = [
            'id', 'party_id', 'first_name', 'last_name', 'email',
            'is_attending', 'meal', 'is_child', 'dietary_restrictions',
        ]


class PartySerializer(serializers.ModelSerializer):
    guests = GuestSerializer(source='ordered_guests', many=True, read_only=True)

    class Meta:
        model = Party
        fields = [
            'id', 'name', 'type', 'category', 'status',
            'is_attending', 'rehearsal_dinner', 'comments', 'guests',
            'address', 'side', 'plus_one_allowed', 'plus_one_count', 'rsvp_responded_at',
            'invitation_id', 'invitation_sent', 'invitation_opened',
        ]
        read_only_fields = ['rsvp_responded_at', 'invitation_id', 'invitation_sent', 'invitation_opened']


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = ['id', 'name', 'subject', 'body_html', 'created_at', 'updated_at']


class SentEmailSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source='party.name', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)

    class Meta:
        model = SentEmail
        fields = ['id', 'template_id', 'template_name', 'party_id', 'party_name',
                  'subject', 'body_html', 'recipients', 'sent_at']
