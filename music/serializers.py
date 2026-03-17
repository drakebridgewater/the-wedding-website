from rest_framework import serializers
from .models import Song


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = [
            'id', 'list_type', 'moment', 'title', 'artist',
            'url', 'source', 'thumbnail_url', 'notes', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
