from rest_framework import serializers

from .models import EmailTemplate, Guest, Party, SaveTheDateSettings, SentEmail, WeddingPartyGroup, WeddingPartyMember


class WeddingPartyMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = WeddingPartyMember
        fields = ['id', 'name', 'role', 'role_display', 'color', 'email', 'phone', 'bio', 'photo_url', 'order', 'guest_id', 'is_informed', 'is_public']
        read_only_fields = ['guest_id', 'photo_url']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


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
            'id', 'party_id', 'first_name', 'last_name', 'email', 'phone',
            'is_attending', 'meal', 'is_child', 'dietary_restrictions', 'label', 'is_plus_one',
        ]


class PartySerializer(serializers.ModelSerializer):
    guests = GuestSerializer(source='ordered_guests', many=True, read_only=True)

    class Meta:
        model = Party
        fields = [
            'id', 'name', 'type', 'category', 'status',
            'is_attending', 'rehearsal_dinner', 'comments', 'guests',
            'address', 'address_street', 'address_city', 'address_state', 'address_zip',
            'address_country', 'address_verified',
            'wants_physical_card', 'side', 'plus_one_allowed', 'plus_one_count', 'rsvp_responded_at',
            'invitation_id', 'invitation_sent', 'invitation_opened',
            'save_the_date_sent',
        ]
        read_only_fields = ['rsvp_responded_at', 'invitation_id', 'invitation_sent', 'invitation_opened', 'save_the_date_sent']


class EmailTemplateSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'purpose', 'subject', 'body_html', 'footer_html', 'image_url',
            'show_rsvp_button', 'rsvp_button_text', 'rsvp_button_color',
            'background_color', 'font_color',
            'created_at', 'updated_at',
        ]

    def get_image_url(self, obj):
        if not obj.main_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.main_image.url)
        return obj.main_image.url


class SaveTheDateSettingsSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SaveTheDateSettings
        fields = ['id', 'background_color', 'font_color', 'image_url']

    def get_image_url(self, obj):
        if not obj.main_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.main_image.url)
        return obj.main_image.url


class SentEmailSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source='party.name', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)

    class Meta:
        model = SentEmail
        fields = ['id', 'template_id', 'template_name', 'party_id', 'party_name',
                  'subject', 'body_html', 'recipients', 'sent_at']
