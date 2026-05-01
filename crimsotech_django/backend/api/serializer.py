import os
from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password
from django.db.models import Avg
from api.utils.storage_utils import convert_s3_to_public_url

# Helper function to get media URL consistently
def get_media_url(file_field):
    """Helper to get the appropriate URL for a file field"""
    if not file_field:
        return None
    
    try:
        # Try to get the URL from the file field
        url = file_field.url
        # Convert S3 URL to public URL if needed
        return convert_s3_to_public_url(url)
    except Exception as e:
        print(f"Error getting media URL: {e}")
        return None

# Existing serializers (don't modify)
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name',
            'last_name', 'middle_name', 'contact_number', 'date_of_birth',
            'age', 'sex', 'street', 'barangay', 'city', 'province',
            'state', 'zip_code', 'country', 'is_admin', 'is_customer',
            'is_moderator', 'is_rider', 'registration_stage','profile_picture', 'profile_picture_url',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'profile_picture_url']
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
            'profile_picture': {'required': False, 'allow_null': True},
        }

    def get_profile_picture_url(self, obj):
        """Returns the full URL for the profile picture"""
        return get_media_url(obj.profile_picture)

    def create(self, validated_data):
        # Ensure password is hashed on creation (handle missing/blank safely)
        validated_data['password'] = make_password(validated_data.get('password', ''))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # If password is provided on update, hash it before saving
        password = validated_data.pop('password', None)
        if password is not None:
            validated_data['password'] = make_password(password)
        return super().update(instance, validated_data)

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class RiderSerializer(serializers.ModelSerializer):
    vehicle_image_url = serializers.SerializerMethodField()
    license_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Rider
        fields = '__all__'
    
    def get_vehicle_image_url(self, obj):
        return get_media_url(obj.vehicle_image)
    
    def get_license_image_url(self, obj):
        return get_media_url(obj.license_image)

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
    address = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    shop_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = '__all__'  # or explicitly include ['id', 'name', 'shop_picture', ... , 'address', 'avg_rating']

    def get_address(self, obj):
        parts = [obj.street, obj.barangay, obj.city, obj.province]
        return ", ".join([p for p in parts if p])  # skip empty parts

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            # Use average_rating instead of rating
            valid_reviews = [r for r in reviews if r.average_rating is not None]
            if valid_reviews:
                return sum(r.average_rating for r in valid_reviews) / len(valid_reviews)
        return None
    
    def get_shop_picture_url(self, obj):
        return get_media_url(obj.shop_picture)

class ShopFollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopFollow
        fields = '__all__'
        read_only_fields = ['id', 'followed_at']

class ReviewMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ReviewMedia
        fields = ['id', 'file_data', 'file_type', 'file_url', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

class ReviewSerializer(serializers.ModelSerializer):
    # Add computed field for product average
    product_average = serializers.SerializerMethodField(read_only=True)
    media = ReviewMediaSerializer(many=True, read_only=True, source='medias')
    
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['average_rating', 'created_at', 'updated_at']

    def get_product_average(self, obj):
        """
        Calculate average of product-related ratings:
        condition_rating, accuracy_rating, value_rating
        """
        ratings = []
        if obj.condition_rating:
            ratings.append(obj.condition_rating)
        if obj.accuracy_rating:
            ratings.append(obj.accuracy_rating)
        if obj.value_rating:
            ratings.append(obj.value_rating)
        
        if ratings:
            return round(sum(ratings) / len(ratings), 2)
        return None

    def validate(self, data):
        # Check if either product or rider is specified
        if not data.get('product') and not data.get('rider'):
            raise serializers.ValidationError(
                "Either product or rider must be specified for a review"
            )
        
        # Validate product ratings if product is provided
        if data.get('product'):
            condition = data.get('condition_rating')
            accuracy = data.get('accuracy_rating')
            value = data.get('value_rating')
            delivery = data.get('delivery_rating')
            
            # Check if at least one rating is provided
            if condition is None and accuracy is None and value is None and delivery is None:
                raise serializers.ValidationError(
                    "At least one rating must be provided for product review"
                )
        
        return data

    def create(self, validated_data):
        # Collect all ratings for average calculation
        ratings = []
        
        # Add product ratings
        if validated_data.get('condition_rating'):
            ratings.append(validated_data['condition_rating'])
        if validated_data.get('accuracy_rating'):
            ratings.append(validated_data['accuracy_rating'])
        if validated_data.get('value_rating'):
            ratings.append(validated_data['value_rating'])
        if validated_data.get('delivery_rating'):
            ratings.append(validated_data['delivery_rating'])
        
        # Calculate average if there are ratings
        if ratings:
            validated_data['average_rating'] = round(sum(ratings) / len(ratings), 2)
        else:
            validated_data['average_rating'] = None
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Update instance with new values
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Collect all ratings for average calculation
        ratings = []
        
        # Add product ratings
        if instance.condition_rating:
            ratings.append(instance.condition_rating)
        if instance.accuracy_rating:
            ratings.append(instance.accuracy_rating)
        if instance.value_rating:
            ratings.append(instance.value_rating)
        if instance.delivery_rating:
            ratings.append(instance.delivery_rating)
        
        # Calculate and set average
        if ratings:
            instance.average_rating = round(sum(ratings) / len(ratings), 2)
        else:
            instance.average_rating = None
        
        instance.save()
        return instance

        
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class FavoritesSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    product = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    product_details = serializers.SerializerMethodField()
    
    def get_product(self, obj):
        if isinstance(obj, dict):
            product = obj.get('product')
        else:
            product = obj.product
            
        if product:
            return {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'shop_id': product.shop.id if product.shop else None,
                'shop_name': product.shop.name if product.shop else None
            }
        return None
    
    def get_customer(self, obj):
        if isinstance(obj, dict):
            customer = obj.get('customer')
        else:
            customer = obj.customer
            
        if customer:
            return {
                'id': customer.customer.id,
                'username': customer.customer.username
            }
        return None
    
    def get_product_details(self, obj):
        if isinstance(obj, dict):
            return obj.get('product_details')
        return None

class ProductMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductMedia
        fields = ['id', 'file_data', 'file_type', 'file_url']
    
    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

class VariantsSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    proof_image_url = serializers.SerializerMethodField()  # ADDED
    purchase_date_formatted = serializers.SerializerMethodField()  # ADDED
    original_price_formatted = serializers.SerializerMethodField()  # ADDED
    
    class Meta:
        model = Variants
        fields = [
            'id', 'product', 'shop', 'title', 'option_title', 'option_created_at',
            'option_ids', 'option_map', 'sku_code', 'price', 'compare_price',
            'quantity', 'weight', 'weight_unit', 'critical_trigger', 'is_active', 
            'is_refundable', 'refund_days', 'allow_swap', 'swap_type', 
            'original_price', 'usage_period', 'usage_unit', 'depreciation_rate',
            'minimum_additional_payment', 'maximum_additional_payment', 
            'swap_description', 'image', 'image_url', 'critical_stock',
            'proof_image', 'proof_image_url', 'purchase_date', 'purchase_date_formatted',  # ADDED proof_image and purchase_date
            'original_price_formatted',  # ADDED
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'option_created_at']
    
    def get_image_url(self, obj):
        return get_media_url(obj.image)
    
    def get_proof_image_url(self, obj):  # ADDED
        """Get public URL for proof image"""
        return get_media_url(obj.proof_image)
    
    def get_purchase_date_formatted(self, obj):  # ADDED
        """Return formatted purchase date"""
        if obj.purchase_date:
            return obj.purchase_date.isoformat()
        return None
    
    def get_original_price_formatted(self, obj):  # ADDED
        """Return formatted original price"""
        if obj.original_price:
            return f"₱{float(obj.original_price):.2f}"
        return None

class ProductSerializer(serializers.ModelSerializer):
    shop = ShopSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_admin = CategorySerializer(read_only=True)
    variants = serializers.SerializerMethodField()
    media_files = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    total_stock = serializers.IntegerField(source='total_variant_stock', read_only=True)
    open_for_swap = serializers.BooleanField(read_only=True)

    min_variant_price = serializers.FloatField(read_only=True, required=False, allow_null=True)
    max_variant_price = serializers.FloatField(read_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'status', 'upload_status', 'condition',
            'is_refundable', 'refund_days', 'created_at', 'updated_at',
            'shop', 'category', 'category_admin', 'variants', 'media_files', 
            'primary_image', 'price_display', 'price_range', 'total_stock',
            'open_for_swap', 'min_variant_price', 'max_variant_price'
        ]
    
    def get_primary_image(self, obj):
        """Get the first media file as primary image"""
        media = obj.productmedia_set.first()
        if media and media.file_data:
            return {
                'id': str(media.id),
                'url': get_media_url(media.file_data),
                'file_type': media.file_type
            }
        return None

    def get_media_files(self, obj):
        """Get all media files with S3 URLs"""
        media_files = []
        for media in obj.productmedia_set.all():
            media_files.append({
                'id': str(media.id),
                'file_data': get_media_url(media.file_data) if media.file_data else None,
                'file_type': media.file_type,
                'file_url': get_media_url(media.file_data) if media.file_data else None
            })
        return media_files

    def get_variants(self, obj):
        """Return variants with minimal info for list view, full details for detail view"""
        request = self.context.get('request')
        
        # Check if this is a detail view
        is_detail_view = request and request.parser_context.get('kwargs', {}).get('pk')
        
        variants = obj.variants.filter(is_active=True)
        
        if is_detail_view:
            # Detail view - return all variants with full details
            context = self.context.copy()
            return VariantsSerializer(variants, many=True, context=context).data
        else:
            # List view - return minimal variant data including original_price for discounts
            minimal_variants = []
            for variant in variants:
                minimal_variants.append({
                    'id': str(variant.id),
                    'price': float(variant.price) if variant.price else None,
                    'original_price': float(variant.original_price) if variant.original_price else None,
                    'compare_price': float(variant.compare_price) if variant.compare_price else None,
                })
            return minimal_variants
    
    def get_price_display(self, obj):
        """Get formatted price display for the product"""
        if hasattr(obj, 'min_variant_price') and obj.min_variant_price:
            if obj.min_variant_price == obj.max_variant_price:
                return f"₱{float(obj.min_variant_price):.2f}"
            else:
                return f"₱{float(obj.min_variant_price):.2f} - ₱{float(obj.max_variant_price):.2f}"
        
        # Fallback to checking variants directly
        variants = obj.variants.filter(is_active=True)
        if variants.exists():
            prices = [v.price for v in variants if v.price]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                if min_price == max_price:
                    return f"₱{float(min_price):.2f}"
                else:
                    return f"₱{float(min_price):.2f} - ₱{float(max_price):.2f}"
        
        return "Price unavailable"
    
    def get_price_range(self, obj):
        """Get price range object for the product"""
        if hasattr(obj, 'min_variant_price') and obj.min_variant_price:
            return {
                'min': float(obj.min_variant_price),
                'max': float(obj.max_variant_price),
                'is_range': obj.min_variant_price != obj.max_variant_price
            }
        
        # Fallback to checking variants directly
        variants = obj.variants.filter(is_active=True)
        if variants.exists():
            prices = [float(v.price) for v in variants if v.price]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                return {
                    'min': min_price,
                    'max': max_price,
                    'is_range': min_price != max_price
                }
        
        return None
    
class IssuesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issues
        fields = '__all__'

class BoostPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoostPlan
        fields = '__all__'

class BoostSerializer(serializers.ModelSerializer):
    receipt_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Boost
        fields = '__all__'  # or list all fields including the new ones
        read_only_fields = ['payment_verified_at', 'payment_verified_by']
    
    def get_receipt_image_url(self, obj):
        return get_media_url(obj.receipt_image)

class BoostDetailSerializer(serializers.ModelSerializer):
    product_id = ProductSerializer(read_only=True)
    boost_plan_id = BoostPlanSerializer(read_only=True)
    shop_id = ShopSerializer(read_only=True)
    customer_id = CustomerSerializer(read_only=True)
    receipt_image_url = serializers.SerializerMethodField()
    payment_verified_by_details = UserSerializer(source='payment_verified_by', read_only=True)
    
    class Meta:
        model = Boost
        fields = '__all__'
    
    def get_receipt_image_url(self, obj):
        return get_media_url(obj.receipt_image)

class BoostReceiptUploadSerializer(serializers.Serializer):
    plan_id = serializers.UUIDField()
    product_ids = serializers.ListField(child=serializers.UUIDField())
    receipt_image = serializers.ImageField()
    payment_method = serializers.ChoiceField(choices=['GCash', 'Maya', 'Bank Transfer', 'Credit Card'])
    
    def validate_receipt_image(self, value):
        # Validate file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size too large. Maximum size is 5MB.")
        
        # Validate file type
        valid_types = ['image/jpeg', 'image/png', 'image/jpg']
        if value.content_type not in valid_types:
            raise serializers.ValidationError("Invalid file type. Please upload JPEG or PNG images.")
        
        return value
    
    def validate_product_ids(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one product ID is required.")
        return value

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

class OrderSerializer(serializers.ModelSerializer):
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = '__all__'
    
    def get_receipt_url(self, obj):
        return get_media_url(obj.receipt)

class CheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkout
        fields = '__all__'

# ENHANCED SERIALIZERS WITH NESTED RELATIONSHIPS
class ShopDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    address = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    shop_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'shop_picture', 'shop_picture_url', 'province', 'city', 'barangay', 'street',
            'contact_number', 'verified', 'status', 'total_sales', 'address', 'avg_rating'
        ]

    def get_address(self, obj):
        parts = [obj.street, obj.barangay, obj.city, obj.province]
        return ", ".join([p for p in parts if p])

    def get_avg_rating(self, obj):
        # Assuming Product has a related_name='products' and Review model has 'rating' field
        avg = obj.owned_products.aggregate(avg=Avg('reviews__rating'))['avg'] or 0
        return round(avg, 1)
    
    def get_shop_picture_url(self, obj):
        return get_media_url(obj.shop_picture)

class ProductDetailSerializer(serializers.ModelSerializer):
    shop = ShopSerializer()
    category = CategorySerializer()
    category_admin = CategorySerializer()
    variants = serializers.SerializerMethodField()
    media_files = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    total_stock = serializers.IntegerField(source='total_variant_stock', read_only=True)
    price_display = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 
            'status', 'upload_status', 'condition',
            'is_refundable', 'refund_days', 'created_at', 'updated_at',
            'shop', 'category', 'category_admin', 'variants', 'media_files', 
            'primary_image', 'total_stock', 'price_display', 'price_range'
        ]
    
    def to_internal_value(self, data):
        # Accept 'refundable' from frontend when updating products and map to 'is_refundable'
        try:
            mutable = data.copy()
            if 'refundable' in mutable and 'is_refundable' not in mutable:
                mutable['is_refundable'] = True if str(mutable.get('refundable')).lower() in ('true', '1') else False
            return super().to_internal_value(mutable)
        except Exception:
            return super().to_internal_value(data)
    
    def get_primary_image(self, obj):
        """Get the first media file as primary image"""
        media = obj.productmedia_set.first()
        if media and media.file_data:
            return {
                'id': str(media.id),
                'url': get_media_url(media.file_data),
                'file_type': media.file_type
            }
        return None

    def get_media_files(self, obj):
        """Get all media files with S3 URLs"""
        media_files = []
        for media in obj.productmedia_set.all():
            media_files.append({
                'id': str(media.id),
                'file_data': get_media_url(media.file_data) if media.file_data else None,
                'file_type': media.file_type,
                'file_url': get_media_url(media.file_data) if media.file_data else None
            })
        return media_files

    def get_variants(self, obj):
        """Return all variants with full details including ownership info"""
        variants = obj.variants.filter(is_active=True)
        # Pass request context to serializer for building absolute URLs
        context = self.context.copy()
        return VariantsSerializer(variants, many=True, context=context).data
    
    def get_price_display(self, obj):
        """Get formatted price display for the product"""
        if hasattr(obj, 'min_variant_price') and obj.min_variant_price:
            if obj.min_variant_price == obj.max_variant_price:
                return f"₱{float(obj.min_variant_price):.2f}"
            else:
                return f"₱{float(obj.min_variant_price):.2f} - ₱{float(obj.max_variant_price):.2f}"
        
        # Fallback to checking variants directly
        variants = obj.variants.filter(is_active=True)
        if variants.exists():
            prices = [v.price for v in variants if v.price]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                if min_price == max_price:
                    return f"₱{float(min_price):.2f}"
                else:
                    return f"₱{float(min_price):.2f} - ₱{float(max_price):.2f}"
        
        return "Price unavailable"
    
    def get_price_range(self, obj):
        """Get price range object for the product"""
        if hasattr(obj, 'min_variant_price') and obj.min_variant_price:
            return {
                'min': float(obj.min_variant_price),
                'max': float(obj.max_variant_price),
                'is_range': obj.min_variant_price != obj.max_variant_price
            }
        
        # Fallback to checking variants directly
        variants = obj.variants.filter(is_active=True)
        if variants.exists():
            prices = [float(v.price) for v in variants if v.price]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                return {
                    'min': min_price,
                    'max': max_price,
                    'is_range': min_price != max_price
                }
        
        return None

        
class ReviewDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    shop_id = ShopSerializer(read_only=True)
    
    class Meta:
        model = Review
        fields = '__all__'

# Note: Duplicate BoostDetailSerializer - keeping the enhanced one
class BoostDetailSerializer(serializers.ModelSerializer):
    product_id = ProductDetailSerializer(read_only=True)
    boost_plan_id = BoostPlanSerializer(read_only=True)
    shop_id = ShopDetailSerializer(read_only=True)
    customer_id = CustomerSerializer(read_only=True)
    receipt_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Boost
        fields = '__all__'
    
    def get_receipt_image_url(self, obj):
        return get_media_url(obj.receipt_image)

#CHECKOUT
class CartProductSerializer(serializers.ModelSerializer):
    """Serializer for product details in cart"""
    shop_name = serializers.SerializerMethodField()
    primary_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'shop_name', 'primary_image_url']
    
    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else "Unknown Shop"
    
    def get_primary_image_url(self, obj):
        media = obj.productmedia_set.first()
        if media and media.file_data:
            return get_media_url(media.file_data)
        return None

class CartItemSerializer(serializers.ModelSerializer):
    product_details = serializers.SerializerMethodField()
    variant_details = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'variant', 'quantity', 'added_at', 
                 'product_details', 'variant_details', 'total_price']

    def get_product_details(self, obj):
        if not obj.product:
            return None
        
        # Get main image with full URL
        main_image = self.get_main_product_image(obj.product)
        
        # Get all media files if needed
        media_files = []
        for media in obj.product.productmedia_set.all()[:3]:  # Limit to 3 images
            media_files.append({
                'id': str(media.id),
                'url': get_media_url(media.file_data) if media.file_data else None,
                'file_type': media.file_type
            })
        
        return {
            'id': str(obj.product.id),
            'name': obj.product.name,
            'description': obj.product.description,
            'condition': obj.product.condition,
            'shop_name': obj.product.shop.name if obj.product.shop else None,
            'shop_id': str(obj.product.shop.id) if obj.product.shop else None,
            'main_image': main_image,
            'media_files': media_files,  # Additional images if needed
        }

    def get_variant_details(self, obj):
        if not obj.variant:
            return None
        
        return {
            'id': str(obj.variant.id),
            'title': obj.variant.title,
            'sku_code': obj.variant.sku_code,
            'price': str(obj.variant.price) if obj.variant.price else None,
            'compare_price': str(obj.variant.compare_price) if obj.variant.compare_price else None,
            'image': get_media_url(obj.variant.image) if obj.variant.image else None,
            'image_url': get_media_url(obj.variant.image) if obj.variant.image else None,
            'option_title': obj.variant.option_title,
            'options': obj.variant.option_map,
            'quantity_available': obj.variant.quantity  # Add available stock
        }

    def get_total_price(self, obj):
        if obj.variant and obj.variant.price:
            return str(obj.variant.price * obj.quantity)
        elif obj.product:
            # Fallback to min price if no variant
            min_price = obj.product.min_price
            if min_price:
                return str(min_price * obj.quantity)
        return None

    def get_main_product_image(self, product):
        """Get the first product media with full URL"""
        first_media = product.productmedia_set.first()
        if first_media and first_media.file_data:
            return get_media_url(first_media.file_data)
        return None
    
class CheckoutDetailSerializer(serializers.ModelSerializer):
    voucher_id = VoucherSerializer(read_only=True)
    cartitem_id = CartItemSerializer(read_only=True)
    
    class Meta:
        model = Checkout
        fields = '__all__'

class CustomerActivityDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    product_id = ProductDetailSerializer(read_only=True)
    
    class Meta:
        model = CustomerActivity
        fields = '__all__'

class AiRecommendationDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    product_id = ProductDetailSerializer(read_only=True)
    
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

    def to_internal_value(self, data):
        # Allow frontend to send 'refundable' (string booleans) and map to model's 'is_refundable'
        try:
            mutable = data.copy()
            if 'refundable' in mutable and 'is_refundable' not in mutable:
                mutable['is_refundable'] = True if str(mutable.get('refundable')).lower() in ('true', '1') else False
            return super().to_internal_value(mutable)
        except Exception:
            return super().to_internal_value(data)

class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'

class BoostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boost
        fields = '__all__'

class RefundSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Refund
        fields = '__all__'


class CartItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating cart items"""
    class Meta:
        model = CartItem
        fields = ['product', 'variant', 'quantity']
    
    def validate(self, data):
        # Check if product exists and is available
        product = data.get('product')
        if not product:
            raise serializers.ValidationError({"product": "Product is required."})
        
        # Check if product is available
        if hasattr(product, 'is_available') and not product.is_available:
            raise serializers.ValidationError({"product": "This product is currently unavailable."})
        
        # Check quantity
        quantity = data.get('quantity', 1)
        if quantity < 1:
            raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})
        
        # Check variant stock if variant is provided
        variant = data.get('variant')
        if variant and variant.quantity < quantity:
            raise serializers.ValidationError({
                "quantity": f"Only {variant.quantity} items available for this variant."
            })
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        product = validated_data['product']
        variant = validated_data.get('variant')
        quantity = validated_data['quantity']
        
        # Check if item already exists in cart with same product and variant
        cart_item, created = CartItem.objects.get_or_create(
            user=user,
            product=product,
            variant=variant,
            defaults={'quantity': quantity}
        )
        
        if not created:
            # Update quantity if item exists
            cart_item.quantity += quantity
            cart_item.save()
        
        return cart_item
    

class CartDisplayItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pk')  # UUID as id
    name = serializers.CharField(source='product.name')
    color = serializers.CharField(source='product.color', default='N/A')
    price = serializers.DecimalField(source='product.price', max_digits=12, decimal_places=2)
    quantity = serializers.IntegerField()
    image_url = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='product.shop.name', default='Unknown Shop')
    selected = serializers.SerializerMethodField()
    variant_details = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'name', 'color', 'price', 'quantity', 'image_url', 'shop_name', 'selected', 'variant_details']

    def get_selected(self, obj):
        return True  # default to selected
    
    def get_variant_details(self, obj):
        if obj.variant:
            return {
                'id': str(obj.variant.id),
                'title': obj.variant.title,
                'sku_code': obj.variant.sku_code,
                'price': str(obj.variant.price) if obj.variant.price else None,
                'image_url': get_media_url(obj.variant.image) if obj.variant.image else None
            }
        return None
    
    def get_image_url(self, obj):
        media = obj.product.productmedia_set.first()
        if media and media.file_data:
            return get_media_url(media.file_data)
        return None
    

class UserPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentMethod
        fields = '__all__'



# Refund Serializers
class RefundMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RefundMedia
        fields = '__all__'
    
    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

class RefundProofSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = RefundProof
        fields = ['id', 'refund', 'uploaded_by', 'file_type', 'file_data', 'file_url', 'notes', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'file_url', 'created_at']

    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

    def validate_file_data(self, value):
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
        if value.content_type not in allowed_types:
            raise ValidationError("File type not allowed. Only images and MP4 videos are accepted.")
        return value

    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            return {'id': str(obj.uploaded_by.id), 'username': obj.uploaded_by.username}
        return None
    

class RefundWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundWallet
        fields = '__all__'

class RefundBankSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundBank
        fields = '__all__'

class RefundRemittanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundRemittance
        fields = '__all__'

class CounterRefundRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounterRefundRequest
        fields = '__all__'

class DisputeEvidenceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeEvidence
        fields = '__all__'
    
    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

class ReturnRequestMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ReturnRequestMedia
        fields = '__all__'
    
    def get_file_url(self, obj):
        return get_media_url(obj.file_data)

class ReturnAddressSerializer(serializers.ModelSerializer):
    shop = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = ReturnAddress
        fields = [
            'id', 'refund', 'shop', 'seller', 'recipient_name', 'contact_number',
            'country', 'province', 'city', 'barangay', 'street', 'zip_code', 'notes',
            'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'shop', 'seller']

    def get_shop(self, obj):
        if obj.shop:
            return {'id': str(obj.shop.id), 'name': obj.shop.name}
        return None

    def get_seller(self, obj):
        if obj.seller:
            return {'id': str(obj.seller.id), 'username': obj.seller.username}
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return {'id': str(obj.created_by.id), 'username': obj.created_by.username}
        return None

class ReturnRequestItemSerializer(serializers.ModelSerializer):
    medias = ReturnRequestMediaSerializer(many=True, read_only=True)
    
    class Meta:
        model = ReturnRequestItem
        fields = '__all__'

class DisputeRequestSerializer(serializers.ModelSerializer):
    evidences = DisputeEvidenceSerializer(many=True, read_only=True)
    requested_by = UserSerializer(read_only=True)
    processed_by = UserSerializer(read_only=True)
    refund = serializers.SerializerMethodField()
    
    # Add serializers for buyer, seller, rider details
    buyer_details = serializers.SerializerMethodField()
    seller_details = serializers.SerializerMethodField()
    rider_details = serializers.SerializerMethodField()

    class Meta:
        model = DisputeRequest
        fields = '__all__'

    def get_refund(self, obj):
        if obj.refund_id:
            return {
                'refund_id': str(obj.refund_id.refund_id),
                'status': obj.refund_id.status,
                'total_refund_amount': float(obj.refund_id.total_refund_amount) if getattr(obj.refund_id, 'total_refund_amount', None) is not None else None
            }
        return None
    
    def get_buyer_details(self, obj):
        if obj.buyer:
            return {
                'id': str(obj.buyer.id),
                'username': obj.buyer.username,
                'email': obj.buyer.email,
            }
        return None
    
    def get_seller_details(self, obj):
        if obj.seller:
            return {
                'id': str(obj.seller.id),
                'username': obj.seller.username,
                'email': obj.seller.email,
            }
        return None
    
    def get_rider_details(self, obj):
        if obj.rider:
            return {
                'id': str(obj.rider.id),
                'username': obj.rider.username,
                'email': obj.rider.email,
            }
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        
        # Ensure case_category is a list (backward compatibility)
        cc = rep.get('case_category')
        if cc is None:
            rep['case_category'] = []
        elif isinstance(cc, str):
            rep['case_category'] = [cc]
        
        # Ensure liability is always a list
        liability = rep.get('liability')
        if liability is None:
            rep['liability'] = []
        
        return rep


class DisputeRequestCreateSerializer(serializers.ModelSerializer):
    # Accept either a single string or a list of category keys
    case_category = serializers.ListField(child=serializers.CharField(), required=False)
    requested_by_entity = serializers.ChoiceField(
        choices=['buyer', 'seller', 'rider'],
        required=False,
        default='buyer'
    )

    class Meta:
        model = DisputeRequest
        fields = ['reason', 'case_category', 'requested_by_entity']

    def create(self, validated_data):
        # Map 'refund' (from serializer.save(refund=...)) to model field 'refund_id'
        refund_obj = validated_data.pop('refund', None)
        if refund_obj is not None:
            validated_data['refund_id'] = refund_obj

        # Normalize case_category: accept list or single string and store as list for JSONField
        case_cat = validated_data.get('case_category')
        if isinstance(case_cat, list):
            validated_data['case_category'] = [str(c).strip() for c in case_cat if c is not None]
        elif isinstance(case_cat, str):
            validated_data['case_category'] = [case_cat.strip()] if case_cat.strip() else []
        else:
            validated_data.pop('case_category', None)  # Remove if not provided

        # Get the user who is filing the dispute
        filed_by = self.context.get('filed_by')
        if not filed_by:
            raise serializers.ValidationError({'filed_by': 'X-User-Id header is required'})
        
        # Set requested_by (legacy field)
        validated_data['requested_by'] = filed_by
        
        return super().create(validated_data)
    

class AppliedGiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppliedGift
        fields = '__all__'


class AppliedGiftProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppliedGiftProduct
        fields = '__all__'

class DeliveryStatsSerializer(serializers.ModelSerializer):
    order_id = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    pickup_location = serializers.SerializerMethodField()
    delivery_location = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='order.total_amount', max_digits=12, decimal_places=2, read_only=True)
    distance = serializers.DecimalField(source='distance_km', max_digits=6, decimal_places=2, read_only=True)
    estimated_time = serializers.IntegerField(source='estimated_minutes', read_only=True)
    actual_time = serializers.IntegerField(source='actual_minutes', read_only=True)
    rating = serializers.IntegerField(source='delivery_rating', read_only=True)
    completed_at = serializers.DateTimeField(source='delivered_at', read_only=True)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Delivery
        fields = [
            'id', 'order_id', 'customer_name', 'pickup_location', 
            'delivery_location', 'status', 'amount', 'distance', 
            'estimated_time', 'actual_time', 'rating', 'completed_at',
            'picked_at', 'delivered_at', 'created_at', 'delivery_fee'
        ]
    
    def get_order_id(self, obj):
        return str(obj.order.order)
    
    def get_customer_name(self, obj):
        user = obj.order.user
        if user.first_name and user.last_name:
            return f"{user.first_name} {user.last_name}"
        return user.username or "Unknown Customer"
    
    def get_pickup_location(self, obj):
        # Assuming shop location for pickup
        try:
            # Get the first product's shop from the order
            # You might need to adjust this based on your order structure
            from api.models import OrderItem  # Import if you have OrderItem model
            order_items = obj.order.orderitem_set.all() if hasattr(obj.order, 'orderitem_set') else []
            if order_items:
                shop = order_items[0].product.shop
                if shop:
                    return f"{shop.name}, {shop.city}"
        except:
            pass
        return "Pickup Location"
    
    def get_delivery_location(self, obj):
        # Get from shipping address
        shipping_address = obj.order.shipping_address
        if shipping_address:
            return f"{shipping_address.city}, {shipping_address.province}"
        return "Delivery Location"


class RiderMetricsSerializer(serializers.Serializer):
    total_deliveries = serializers.IntegerField()
    completed_deliveries = serializers.IntegerField()
    pending_deliveries = serializers.IntegerField()
    cancelled_deliveries = serializers.IntegerField()
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    avg_delivery_time = serializers.FloatField()
    avg_rating = serializers.FloatField()
    on_time_percentage = serializers.FloatField()
    current_week_deliveries = serializers.IntegerField()
    current_month_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    has_data = serializers.BooleanField()
    growth_metrics = serializers.DictField(required=False)
    declined_orders = serializers.IntegerField() 

class LogsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Logs
        fields = ['id', 'user', 'username', 'user_email', 'user_role', 'action', 'timestamp']
    
    def get_user_role(self, obj):
        user = obj.user
        if user.is_admin:
            return 'admin'
        elif user.is_moderator:
            return 'moderator'
        elif user.is_rider:
            return 'rider'
        elif user.is_customer:
            return 'customer'
        return 'unknown'
    
import re
from rest_framework import serializers

class UserPaymentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentDetail
        fields = [
            'payment_id', 'user', 'payment_method', 'bank_name',
            'account_name', 'account_number', 'is_default',
            'created_at', 'updated_at', 'verified_by'
        ]
        read_only_fields = ['payment_id', 'created_at', 'updated_at', 'verified_by']

    def validate_account_number(self, value):
        clean_value = re.sub(r'[^0-9]', '', str(value))
        # Determine the payment method from the request data or instance
        payment_method = self.initial_data.get('payment_method')
        if not payment_method and self.instance:
            payment_method = self.instance.payment_method

        if payment_method in ['gcash', 'paymaya']:
            # Validate PH mobile number: 639 + 9 digits = 12 digits total
            if not re.match(r'^639\d{9}$', clean_value):
                raise serializers.ValidationError(
                    "Enter a valid Philippine mobile number starting with 639 followed by 9 digits (e.g., 639171234567)"
                )
        elif payment_method == 'bank':
            # Bank account validation: exactly 16 digits (adjust as needed)
            if len(clean_value) != 16:
                raise serializers.ValidationError(
                    "Bank account number must be exactly 16 digits"
                )
        else:
            # Fallback (if payment_method is not recognized)
            pass

        return clean_value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Mask account number for security – show only last 4 digits
        if data.get('account_number'):
            acc_num = data['account_number']
            if len(acc_num) > 4:
                data['account_number'] = '*' * (len(acc_num) - 4) + acc_num[-4:]
            # For e-wallets, add a formatted display with PH flag
            if instance.payment_method in ['gcash', 'paymaya']:
                data['display_number'] = f"🇵🇭 +63 {acc_num[3:6]} {acc_num[6:]}"
            else:
                # For banks, just show the masked number
                data['display_number'] = data['account_number']
            # Store full number for edit mode
            data['full_account_number'] = acc_num
        return data
    


class RefundSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    medias = RefundMediaSerializer(many=True, read_only=True)
    counter_requests = CounterRefundRequestSerializer(many=True, read_only=True)
    dispute = DisputeRequestSerializer(read_only=True)
    return_request = ReturnRequestItemSerializer(read_only=True)
    proofs = RefundProofSerializer(many=True, read_only=True)
    payment_detail = UserPaymentDetailSerializer(read_only=True)  # Add this line

    def get_items(self, obj):
        return [{
            'checkout_id': str(item.checkout.id),
            'quantity': item.quantity,
            'amount': str(item.amount) if item.amount else None,
            'shop_id': str(item.checkout.cart_item.product.shop.id),  
            'shop_name': item.checkout.cart_item.product.shop.name,
            'shipping_fee': str(item.checkout.shipping_fee) if item.checkout.shipping_fee else '0', 
        } for item in obj.items.all()]

    class Meta:
        model = Refund
        fields = '__all__'


class ProofSerializer(serializers.ModelSerializer):
    """
    Complete serializer for Proof model with full image/media handling
    """
    # Custom fields for better frontend display
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    delivery_order_id = serializers.SerializerMethodField()
    formatted_uploaded_at = serializers.SerializerMethodField()
    proof_type_display = serializers.CharField(source='get_proof_type_display', read_only=True)
    
    class Meta:
        model = Proof
        fields = [
            'id',
            'delivery',
            'delivery_order_id',
            'proof_type',
            'proof_type_display',
            'file_data',
            'file_url',
            'file_name',
            'file_type',
            # 'file_size',  # ← REMOVE THIS LINE - model doesn't have this field
            'file_size_display',
            'uploaded_at',
            'formatted_uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'file_type']  # Also remove file_size from here
    
    def get_file_url(self, obj):
        """Get URL for the file using the same method as ProductMedia"""
        try:
            if obj.file_data:
                # Use the same method that works for ProductMedia
                return get_media_url(obj.file_data)
            return None
        except Exception as e:
            print(f"Error in get_file_url for proof {obj.id}: {e}")
            return None
    
    def get_file_name(self, obj):
        """Extract filename from file_data"""
        if obj.file_data and hasattr(obj.file_data, 'name'):
            return os.path.basename(obj.file_data.name)
        return None
    
    def get_file_size_display(self, obj):
        """Convert file size to human-readable format"""
        if obj.file_data and hasattr(obj.file_data, 'size'):
            size_bytes = obj.file_data.size
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            else:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
        return None
    
    def get_delivery_order_id(self, obj):
        """Get the order ID associated with this delivery"""
        if obj.delivery and obj.delivery.order:
            return str(obj.delivery.order.order)
        return None
    
    def get_formatted_uploaded_at(self, obj):
        """Format the uploaded_at timestamp"""
        if obj.uploaded_at:
            return obj.uploaded_at.strftime("%Y-%m-%d %H:%M:%S")
        return None
    
    def validate_file_data(self, value):
        """Validate file on upload"""
        if value:
            # Check file size (max 10MB)
            max_size = 10 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError("File size too large. Maximum size is 10MB.")
            
            # Check file extension
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.heic', '.heif']
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
                )
        return value
    
    def to_representation(self, instance):
        """Customize the output representation"""
        data = super().to_representation(instance)
        
        # Remove raw file_data from response to keep it clean
        if 'file_data' in data:
            del data['file_data']
        
        # Add thumbnail hint for images
        if data.get('file_type') in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif']:
            data['is_image'] = True
        else:
            data['is_image'] = False
        
        return data
    
    def create(self, validated_data):
        """Custom create method to set file_type automatically"""
        file_obj = validated_data.get('file_data')
        if file_obj:
            # Extract file extension and set as file_type
            ext = os.path.splitext(file_obj.name)[1].lower().replace('.', '')
            validated_data['file_type'] = ext
        
        return super().create(validated_data)

# ================================
# Wallet Serializers
# ================================

class UserWalletSerializer(serializers.ModelSerializer):
    total_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = UserWallet
        fields = [
            'wallet_id', 'user', 'available_balance', 'pending_balance', 
            'total_balance', 'created_at', 'updated_at'
        ]
        read_only_fields = ['wallet_id', 'user', 'created_at', 'updated_at']
    
    def get_total_balance(self, obj):
        return obj.available_balance + obj.pending_balance


class WalletTransactionSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    shop_id = serializers.UUIDField(source='shop.id', read_only=True)
    order_id = serializers.UUIDField(source='order.order', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = WalletTransaction
        fields = [
            'transaction_id', 'wallet', 'user', 'user_id', 'user_name',
            'shop', 'shop_id', 'shop_name', 'order', 'order_id', 
            'amount', 'transaction_type', 'source_type', 'status', 'created_at'
        ]
        read_only_fields = ['transaction_id', 'created_at']
class WithdrawalRequestSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    wallet = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawalRequest
        fields = [
            "withdrawal_id",
            "user",
            "wallet",
            "amount",
            "status",
            "requested_at",
            "approved_by",
            "approved_at",
            "completed_at",
            "admin_proof",
        ]

    def get_user(self, obj):
        if obj.user:
            return {
                "id": obj.user.id,
                "username": getattr(obj.user, "username", None),
                "email": getattr(obj.user, "email", None),
            }
        return None

    def get_wallet(self, obj):
        if obj.wallet:
            return {
                "id": str(obj.wallet.wallet_id),  # Use wallet_id instead of id
                "balance": float(obj.wallet.available_balance) if obj.wallet.available_balance else 0,  # Use available_balance instead of balance
            }
        return None

    def get_approved_by(self, obj):
        if obj.approved_by:
            return {
                "id": obj.approved_by.id,
                "username": getattr(obj.approved_by, "username", None),
            }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.withdrawal_id)
        return data

class WithdrawalRequestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WithdrawalRequest
        fields = ['status', 'admin_proof', 'approved_by', 'approved_at', 'completed_at']
        extra_kwargs = {
            'approved_by': {'read_only': True},
            'approved_at': {'read_only': True},
            'completed_at': {'read_only': True}
        }

class AdminRemittanceSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    processed_by = serializers.SerializerMethodField()
    proof_url = serializers.CharField(source='maya_payment_id', read_only=True)

    class Meta:
        model = RiderRemittance
        fields = [
            "id",
            "reference_number",
            "user",
            "total_amount",
            "status",
            "payment_method",
            "proof_url",
            "created_at",
            "processed_by",
            "processed_at",
        ]

    def get_user(self, obj):
        if obj.rider and obj.rider.rider:
            return {
                "id": obj.rider.rider.id,
                "username": getattr(obj.rider.rider, "username", None),
                "email": getattr(obj.rider.rider, "email", None),
            }
        return None

    def get_processed_by(self, obj):
        if obj.processed_by:
            return {
                "id": obj.processed_by.id,
                "username": getattr(obj.processed_by, "username", None),
            }
        return None

from django.db.models import Sum

class RiderWalletSerializer(serializers.ModelSerializer):
    """Complete serializer for rider wallet with transactions and balances"""
    
    # Wallet fields
    wallet_id = serializers.UUIDField(source='wallet.wallet_id', read_only=True)
    available_balance = serializers.DecimalField(source='wallet.available_balance', max_digits=15, decimal_places=2, read_only=True)
    pending_balance = serializers.DecimalField(source='wallet.pending_balance', max_digits=15, decimal_places=2, read_only=True)
    formatted_available = serializers.SerializerMethodField()
    formatted_pending = serializers.SerializerMethodField()
    formatted_total = serializers.SerializerMethodField()
    
    # Transaction fields
    transaction_id = serializers.UUIDField(read_only=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    transaction_type = serializers.ChoiceField(choices=WalletTransaction.TRANSACTION_TYPES)
    source_type = serializers.CharField(max_length=20)
    status = serializers.CharField(max_length=30, default='completed')
    created_at = serializers.DateTimeField(read_only=True)
    
    # Related fields
    order_number = serializers.SerializerMethodField()
    formatted_amount = serializers.SerializerMethodField()
    formatted_created_at = serializers.SerializerMethodField()
    
    # Stats fields
    total_earned = serializers.SerializerMethodField()
    total_withdrawn = serializers.SerializerMethodField()
    transaction_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WalletTransaction
        fields = [
            # Wallet info
            'wallet_id',
            'available_balance',
            'pending_balance',
            'formatted_available',
            'formatted_pending',
            'formatted_total',
            
            # Transaction info
            'transaction_id',
            'amount',
            'transaction_type',
            'source_type',
            'status',
            'created_at',
            'order',
            'order_number',
            'formatted_amount',
            'formatted_created_at',
            
            # Stats
            'total_earned',
            'total_withdrawn',
            'transaction_count'
        ]
        read_only_fields = ['transaction_id', 'created_at', 'wallet_id']

    def get_formatted_available(self, obj):
        """Format available balance with peso sign"""
        if hasattr(obj, 'wallet'):
            return f"₱{obj.wallet.available_balance:,.2f}"
        return "₱0.00"

    def get_formatted_pending(self, obj):
        """Format pending balance with peso sign"""
        if hasattr(obj, 'wallet'):
            return f"₱{obj.wallet.pending_balance:,.2f}"
        return "₱0.00"

    def get_formatted_total(self, obj):
        """Format total balance with peso sign"""
        if hasattr(obj, 'wallet'):
            total = obj.wallet.available_balance + obj.wallet.pending_balance
            return f"₱{total:,.2f}"
        return "₱0.00"

    def get_order_number(self, obj):
        """Get the order number from the related order"""
        if obj.order:
            return obj.order.order
        return None

    def get_formatted_amount(self, obj):
        """Format transaction amount with peso sign"""
        return f"₱{obj.amount:,.2f}"

    def get_formatted_created_at(self, obj):
        """Format created_at for display"""
        if obj.created_at:
            return obj.created_at.strftime("%b %d, %Y • %I:%M %p")
        return None

    def get_total_earned(self, obj):
        """Get total lifetime earnings from deliveries"""
        if hasattr(obj, 'wallet') and obj.wallet:
            total = WalletTransaction.objects.filter(
                wallet=obj.wallet,
                transaction_type='credit',
                source_type='delivery_fee'
            ).aggregate(total=Sum('amount'))['total'] or 0
            return float(total)
        return 0

    def get_total_withdrawn(self, obj):
        """Get total amount withdrawn"""
        if hasattr(obj, 'wallet') and obj.wallet:
            total = WalletTransaction.objects.filter(
                wallet=obj.wallet,
                transaction_type='debit',
                source_type='withdrawal'
            ).aggregate(total=Sum('amount'))['total'] or 0
            return float(total)
        return 0

    def get_transaction_count(self, obj):
        """Get total number of transactions"""
        if hasattr(obj, 'wallet') and obj.wallet:
            return WalletTransaction.objects.filter(wallet=obj.wallet).count()
        return 0

    def create(self, validated_data):
        """
        Create a wallet transaction and update wallet balance
        Used for:
        - Adding delivery fees (credit, source_type='delivery_fee')
        - Processing withdrawals (debit, source_type='withdrawal')
        """
        # Extract wallet from context or create/get it
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError({"error": "User is required"})
        
        # Get or create wallet for user
        wallet, created = UserWallet.objects.get_or_create(user=user)
        
        # Create transaction
        transaction = WalletTransaction.objects.create(
            wallet=wallet,
            amount=validated_data['amount'],
            transaction_type=validated_data['transaction_type'],
            source_type=validated_data['source_type'],
            status=validated_data.get('status', 'completed'),
            order=validated_data.get('order'),
            user=user
        )
        
        # Update wallet balance
        if validated_data['transaction_type'] == 'credit':
            wallet.available_balance += validated_data['amount']
        elif validated_data['transaction_type'] == 'debit':
            wallet.available_balance -= validated_data['amount']
        
        wallet.save()
        
        return transaction

    def to_representation(self, instance):
        """Customize the output based on what's being requested"""
        data = super().to_representation(instance)
        
        # If this is a list of transactions, include wallet summary at the top
        if self.context.get('include_wallet_summary'):
            wallet = instance.wallet if hasattr(instance, 'wallet') else None
            if wallet:
                data['wallet_summary'] = {
                    'wallet_id': str(wallet.wallet_id),
                    'available_balance': float(wallet.available_balance),
                    'pending_balance': float(wallet.pending_balance),
                    'formatted_available': f"₱{wallet.available_balance:,.2f}",
                    'formatted_pending': f"₱{wallet.pending_balance:,.2f}",
                    'formatted_total': f"₱{wallet.available_balance + wallet.pending_balance:,.2f}"
                }
        
        return data


class NotificationSerializer(serializers.ModelSerializer):
    """Comprehensive Notification Serializer for all operations"""
    
    # Read-only fields for additional info
    time_ago = serializers.SerializerMethodField(read_only=True)
    related_order_number = serializers.SerializerMethodField(read_only=True)
    related_refund_id = serializers.SerializerMethodField(read_only=True)
    related_delivery_id = serializers.SerializerMethodField(read_only=True)
    
    # For create/update operations
    user_id = serializers.UUIDField(write_only=True, required=False)
    related_order_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    related_refund_id_field = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    related_delivery_id_field = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Notification
        fields = [
            # Core fields
            'id',
            'title',
            'message',
            'type',
            'is_read',
            'created_at',
            'read_at',
            
            # Related objects (read)
            'related_order',
            'related_refund',
            'related_delivery',
            
            # Related objects (write)
            'user_id',
            'related_order_id',
            'related_refund_id_field',
            'related_delivery_id_field',
            
            # Deep linking
            'action_url',
            'action_type',
            'action_id',
            
            # Computed fields
            'time_ago',
            'related_order_number',
            'related_refund_id',
            'related_delivery_id',
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'related_order', 'related_refund', 'related_delivery']
    
    def get_time_ago(self, obj):
        """Get human-readable time difference"""
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 30:
            months = diff.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
    
    def get_related_order_number(self, obj):
        """Get order number if related order exists"""
        if obj.related_order:
            return str(obj.related_order.order)
        return None
    
    def get_related_refund_id(self, obj):
        """Get refund ID if related refund exists"""
        if obj.related_refund:
            return str(obj.related_refund.refund_id)
        return None
    
    def get_related_delivery_id(self, obj):
        """Get delivery ID if related delivery exists"""
        if obj.related_delivery:
            return str(obj.related_delivery.id)
        return None
    
    def validate_user_id(self, value):
        """Validate that user exists"""
        if not value:
            raise serializers.ValidationError("user_id is required for creating notifications")
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist")
    
    def validate_related_order_id(self, value):
        """Validate that order exists if provided"""
        if value:
            try:
                return Order.objects.get(order=value)
            except Order.DoesNotExist:
                raise serializers.ValidationError("Order does not exist")
        return None
    
    def validate_related_refund_id_field(self, value):
        """Validate that refund exists if provided"""
        if value:
            try:
                return Refund.objects.get(refund_id=value)
            except Refund.DoesNotExist:
                raise serializers.ValidationError("Refund does not exist")
        return None
    
    def validate_related_delivery_id_field(self, value):
        """Validate that delivery exists if provided"""
        if value:
            try:
                return Delivery.objects.get(id=value)
            except Delivery.DoesNotExist:
                raise serializers.ValidationError("Delivery does not exist")
        return None
    
    def validate(self, data):
        """Cross-field validation"""
        # For update operations, user_id might not be required
        if self.instance is None and not data.get('user_id'):
            raise serializers.ValidationError({"user_id": "user_id is required when creating a notification"})
        return data
    
    def create(self, validated_data):
        """Create a new notification"""
        # Extract related object IDs
        user_id = validated_data.pop('user_id', None)
        related_order = validated_data.pop('related_order_id', None)
        related_refund = validated_data.pop('related_refund_id_field', None)
        related_delivery = validated_data.pop('related_delivery_id_field', None)
        
        # Get the user
        user = User.objects.get(id=user_id)
        
        # Create notification
        notification = Notification.objects.create(
            user=user,
            related_order=related_order,
            related_refund=related_refund,
            related_delivery=related_delivery,
            **validated_data
        )
        
        return notification
    
    def update(self, instance, validated_data):
        """Update a notification (typically just marking as read)"""
        # Remove fields that shouldn't be updated directly
        validated_data.pop('user_id', None)
        validated_data.pop('related_order_id', None)
        validated_data.pop('related_refund_id_field', None)
        validated_data.pop('related_delivery_id_field', None)
        
        # Handle marking as read
        is_read = validated_data.get('is_read', False)
        if is_read and not instance.is_read:
            instance.read_at = timezone.now()
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class BulkNotificationSerializer(serializers.Serializer):
    """Serializer for bulk notification operations"""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of notification IDs to mark as read"
    )
    mark_all_as_read = serializers.BooleanField(
        default=False,
        help_text="Set to true to mark all notifications as read"
    )
    delete_all_read = serializers.BooleanField(
        default=False,
        help_text="Set to true to delete all read notifications"
    )
    
    def validate(self, data):
        """Validate that at least one action is specified"""
        if not any([data.get('notification_ids'), data.get('mark_all_as_read'), data.get('delete_all_read')]):
            raise serializers.ValidationError(
                "At least one action (notification_ids, mark_all_as_read, or delete_all_read) must be provided"
            )
        return data

class MessageSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()
    attachment_type = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'delivered_at', 'read_at', 'edited_at', 'deleted_at', 'attachment_url', 'attachment_type']
    
    def get_attachment_url(self, obj):
        """Get public URL for attachment"""
        return get_media_url(obj.attachment)
    
    def get_attachment_type(self, obj):
        """Determine attachment type based on MIME type"""
        if not obj.attachment:
            return None
        
        if obj.attachment_mime_type and obj.attachment_mime_type.startswith('image/'):
            return 'image'
        return 'file'
