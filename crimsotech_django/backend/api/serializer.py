from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password

class UserSeriaLizer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)  # Make password optional

    class Meta:
        model = User
        fields = [
            'user_id', 'username', 'email', 'password', 'first_name',
            'last_name', 'middle_name', 'contact_number', 'date_of_birth',
            'age', 'sex', 'street', 'barangay', 'city', 'province',
            'state', 'zip_code', 'country', 'is_admin', 'is_customer',
            'is_moderator', 'is_rider', 'registration_stage',
        ]
        read_only_fields = ['user_id', 'created_at', 'updated_at']
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
            'password': {'write_only': True, 'required': False},
            'email': {'required': False, 'allow_blank': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'middle_name': {'required': False, 'allow_blank': True},
            'contact_number': {'required': False, 'allow_blank': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'registration_stage': {'required': False, 'allow_null': True},
            'age': {'required': False, 'allow_null': True},
            'sex': {'required': False, 'allow_blank': True},
            'street': {'required': False, 'allow_blank': True},
            'barangay': {'required': False, 'allow_blank': True},
            'city': {'required': False, 'allow_blank': True},
            'province': {'required': False, 'allow_blank': True},
            'state': {'required': False, 'allow_blank': True},
            'zip_code': {'required': False, 'allow_blank': True},
            'country': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class RiderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rider
        fields = '__all__'