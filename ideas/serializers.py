from rest_framework import serializers

from .models import Idea, IdeaTag


class IdeaTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdeaTag
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class IdeaSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    tags = IdeaTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, required=False,
        queryset=IdeaTag.objects.all(), source='tags',
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Idea
        fields = [
            'id', 'title', 'description', 'image_url', 'source', 'source_url',
            'pinterest_pin_id', 'tags', 'tag_ids', 'is_favorite', 'order',
            'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'image_url', 'tags', 'pinterest_pin_id', 'created_by_name',
            'created_at', 'updated_at',
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None
