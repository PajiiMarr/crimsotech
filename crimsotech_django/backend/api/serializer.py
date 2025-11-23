from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password

# Existing serializers (don't modify)
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name',
            'last_name', 'middle_name', 'contact_number', 'date_of_birth',
            'age', 'sex', 'street', 'barangay', 'city', 'province',
            'state', 'zip_code', 'country', 'is_admin', 'is_customer',
            'is_moderator', 'is_rider', 'registration_stage',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
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

# NEW BASIC SERIALIZERS
class ModeratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Moderator
        fields = '__all__'

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = '__all__'

class LogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Logs
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTP
        fields = '__all__'

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = '__all__'

class ShopFollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopFollow
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class FavoritesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorites
        fields = '__all__'

class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = '__all__'

class VariantsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variants
        fields = '__all__'

class VariantOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantOptions
        fields = '__all__'

class IssuesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issues
        fields = '__all__'

class BoostPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoostPlan
        fields = '__all__'

class BoostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boost
        fields = '__all__'

class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = '__all__'

class RefundPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundPolicy
        fields = '__all__'

class CustomerActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerActivity
        fields = '__all__'

class AiRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiRecommendation
        fields = '__all__'

class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = '__all__'

class CheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkout
        fields = '__all__'

# ENHANCED SERIALIZERS WITH NESTED RELATIONSHIPS
class ShopDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    
    class Meta:
        model = Shop
        fields = '__all__'

class ProductDetailSerializer(serializers.ModelSerializer):
    shop_id = ShopSerializer(read_only=True)
    customer_id = CustomerSerializer(read_only=True)
    category_id = CategorySerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'

class ReviewDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    shop_id = ShopSerializer(read_only=True)
    
    class Meta:
        model = Review
        fields = '__all__'

class BoostDetailSerializer(serializers.ModelSerializer):
    product_id = ProductSerializer(read_only=True)
    boost_plan_id = BoostPlanSerializer(read_only=True)
    shop_id = ShopSerializer(read_only=True)
    customer_id = CustomerSerializer(read_only=True)
    
    class Meta:
        model = Boost
        fields = '__all__'

class CheckoutDetailSerializer(serializers.ModelSerializer):
    voucher_id = VoucherSerializer(read_only=True)
    cartitem_id = CartItemSerializer(read_only=True)
    
    class Meta:
        model = Checkout
        fields = '__all__'

class CustomerActivityDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    product_id = ProductSerializer(read_only=True)
    
    class Meta:
        model = CustomerActivity
        fields = '__all__'

class AiRecommendationDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    product_id = ProductSerializer(read_only=True)
    
    class Meta:
        model = AiRecommendation
        fields = '__all__'

# WRITE SERIALIZERS FOR CREATION (WITHOUT NESTED RELATIONSHIPS)
class ShopCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = '__all__'

class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'

class BoostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boost
        fields = '__all__'