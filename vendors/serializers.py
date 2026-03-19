from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from .models import (
    CakeOption,
    CatererOption,
    EntertainmentOption,
    FloristOption,
    VendorPhoto,
    VenueOption,
)


class VendorPhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = VendorPhoto
        fields = ['id', 'url', 'caption', 'order', 'uploaded_at']
        read_only_fields = ['id', 'url', 'uploaded_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


def _money_to_str(money_obj):
    return str(money_obj.amount) if money_obj is not None else None


def _validate_money(value):
    if value is None or value == '':
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        raise serializers.ValidationError('Enter a valid dollar amount.')


BASE_FIELDS = [
    'id', 'name', 'website', 'phone', 'email',
    'is_chosen', 'is_favorite', 'has_talked_to', 'has_visited',
    'price_estimate',
    'rating',
    'address', 'latitude', 'longitude',
    'positives', 'negatives', 'comments',
    'photos',
    'created_at', 'updated_at',
]

BASE_READ_ONLY = ['id', 'photos', 'created_at', 'updated_at']


class BaseVendorSerializer(serializers.ModelSerializer):
    price_estimate = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    photos = VendorPhotoSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['price_estimate'] = _money_to_str(instance.price_estimate)
        return rep

    def validate_price_estimate(self, value):
        return _validate_money(value)

    def _pop_money(self, validated_data):
        result = {}
        if 'price_estimate' in validated_data:
            result['price_estimate'] = validated_data.pop('price_estimate')
        return result

    def create(self, validated_data):
        money = self._pop_money(validated_data)
        instance = self.Meta.model(**validated_data)
        for k, v in money.items():
            setattr(instance, k, v)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        money = self._pop_money(validated_data)
        for k, v in money.items():
            setattr(instance, k, v)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class VenueSerializer(BaseVendorSerializer):
    class Meta:
        model = VenueOption
        fields = BASE_FIELDS + [
            'capacity', 'style',
            'has_parking', 'catering_included',
            'accommodation_nearby', 'is_indoor', 'is_outdoor',
            'checklist',
        ]
        read_only_fields = BASE_READ_ONLY


class CatererSerializer(BaseVendorSerializer):
    price_per_head = serializers.CharField(allow_null=True, required=False, allow_blank=True)

    class Meta:
        model = CatererOption
        fields = BASE_FIELDS + [
            'price_per_head', 'cuisine_type',
            'has_vegetarian', 'has_vegan', 'has_gluten_free',
            'tasting_scheduled', 'tasting_completed',
        ]
        read_only_fields = BASE_READ_ONLY

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['price_per_head'] = _money_to_str(instance.price_per_head)
        return rep

    def validate_price_per_head(self, value):
        return _validate_money(value)

    def _pop_money(self, validated_data):
        d = super()._pop_money(validated_data)
        if 'price_per_head' in validated_data:
            d['price_per_head'] = validated_data.pop('price_per_head')
        return d


class CakeSerializer(BaseVendorSerializer):
    price_per_serving = serializers.CharField(allow_null=True, required=False, allow_blank=True)

    class Meta:
        model = CakeOption
        fields = BASE_FIELDS + [
            'price_per_serving', 'flavors',
            'custom_design_available', 'tasting_scheduled', 'tasting_completed',
        ]
        read_only_fields = BASE_READ_ONLY

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['price_per_serving'] = _money_to_str(instance.price_per_serving)
        return rep

    def validate_price_per_serving(self, value):
        return _validate_money(value)

    def _pop_money(self, validated_data):
        d = super()._pop_money(validated_data)
        if 'price_per_serving' in validated_data:
            d['price_per_serving'] = validated_data.pop('price_per_serving')
        return d


class FloristSerializer(BaseVendorSerializer):
    minimum_order = serializers.CharField(allow_null=True, required=False, allow_blank=True)

    class Meta:
        model = FloristOption
        fields = BASE_FIELDS + ['arrangement_types', 'style', 'minimum_order']
        read_only_fields = BASE_READ_ONLY

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['minimum_order'] = _money_to_str(instance.minimum_order)
        return rep

    def validate_minimum_order(self, value):
        return _validate_money(value)

    def _pop_money(self, validated_data):
        d = super()._pop_money(validated_data)
        if 'minimum_order' in validated_data:
            d['minimum_order'] = validated_data.pop('minimum_order')
        return d


class EntertainmentSerializer(BaseVendorSerializer):
    class Meta:
        model = EntertainmentOption
        fields = BASE_FIELDS + [
            'type', 'num_members', 'genres',
            'package_details', 'sample_link', 'performance_duration_hours',
        ]
        read_only_fields = BASE_READ_ONLY
