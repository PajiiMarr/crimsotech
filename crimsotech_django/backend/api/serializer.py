from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password
from django.db.models import Avg
from api.utils.storage_utils import convert_s3_to_public_url

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
    address = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = '__all__'  # or explicitly include ['id', 'name', 'shop_picture', ... , 'address', 'avg_rating']

    def get_address(self, obj):
        parts = [obj.street, obj.barangay, obj.city, obj.province]
        return ", ".join([p for p in parts if p])  # skip empty parts

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()  # related_name='reviews' in your Review model
        if reviews.exists():
            return sum(r.rating for r in reviews) / reviews.count()
        return None  # or 0 if you prefer
       

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

class FavoritesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorites
        fields = '__all__'


class ProductMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductMedia
        fields = ['id', 'file_data', 'file_type', 'file_url']
    
    def get_file_url(self, obj):
        if obj.file_data:
            # Convert S3 URL to public URL
            return convert_s3_to_public_url(obj.file_data.url)
        return None

# NEW: Simplified Variants Serializer (contains all fields from the refactored Variants model)
class VariantsSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
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
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'option_created_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class ProductSerializer(serializers.ModelSerializer):
    shop = ShopSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_admin = CategorySerializer(read_only=True)
    variants = serializers.SerializerMethodField()
    media_files = ProductMediaSerializer(source='productmedia_set', many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    total_stock = serializers.IntegerField(source='total_variant_stock', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'status', 'upload_status', 'condition',
            'is_refundable', 'refund_days', 'created_at', 'updated_at',
            'shop', 'category', 'category_admin', 'variants', 'media_files', 
            'primary_image', 'price_display', 'price_range', 'total_stock',
            'open_for_swap'
        ]
    
    def get_primary_image(self, obj):
        """Get the first media file as primary image"""
        media = obj.productmedia_set.first()
        if media and media.file_data:
            url = media.file_data.url
            request = self.context.get('request')
            if request:
                try:
                    url = request.build_absolute_uri(url)
                except Exception:
                    pass
            return {
                'id': str(media.id),
                'url': url,
                'file_type': media.file_type
            }
        return None

    def get_variants(self, obj):
        """Return all variants for detail view, empty list for list view"""
        request = self.context.get('request')
        # Check if this is a detail view by looking at the URL or action
        if request and request.parser_context.get('kwargs', {}).get('pk'):
            # This is a detail view - return all variants
            variants = obj.variants.filter(is_active=True)
            context = self.context.copy()
            return VariantsSerializer(variants, many=True, context=context).data
        # This is a list view - return empty list to keep response light
        return []
    
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
        


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'

class CheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkout
        fields = '__all__'

# ENHANCED SERIALIZERS WITH NESTED RELATIONSHIPS
class ShopDetailSerializer(serializers.ModelSerializer):
    customer_id = CustomerSerializer(read_only=True)
    address = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'shop_picture', 'province', 'city', 'barangay', 'street',
            'contact_number', 'verified', 'status', 'total_sales', 'address', 'avg_rating'
        ]

    def get_address(self, obj):
        parts = [obj.street, obj.barangay, obj.city, obj.province]
        return ", ".join([p for p in parts if p])

    def get_avg_rating(self, obj):
        # Assuming Product has a related_name='products' and Review model has 'rating' field
        avg = obj.owned_products.aggregate(avg=Avg('reviews__rating'))['avg'] or 0
        return round(avg, 1)

class ProductSerializer(serializers.ModelSerializer):
    shop = ShopSerializer()
    category = CategorySerializer()
    category_admin = CategorySerializer()
    variants = serializers.SerializerMethodField()
    media_files = ProductMediaSerializer(source='productmedia_set', many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    # Add computed fields from variants
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
            url = media.file_data.url
            request = self.context.get('request')
            if request:
                try:
                    url = request.build_absolute_uri(url)
                except Exception:
                    # Fallback to raw url if anything goes wrong
                    url = media.file_data.url
            return {
                'id': str(media.id),
                'url': url,
                'file_type': media.file_type
            }
        return None

    def get_variants(self, obj):
        """Return all variants for this product using the simplified VariantsSerializer"""
        variants = obj.variants.all()
        # Pass request context to serializer for building absolute URLs
        context = self.context.copy()
        return VariantsSerializer(variants, many=True, context=context).data
    
    def get_price_display(self, obj):
        """Get formatted price display for the product"""
        # Check if we have annotated values
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

class BoostDetailSerializer(serializers.ModelSerializer):
    product_id = ProductSerializer(read_only=True)
    boost_plan_id = BoostPlanSerializer(read_only=True)
    shop_id = ShopSerializer(read_only=True)
    customer_id = CustomerSerializer(read_only=True)
    
    class Meta:
        model = Boost
        fields = '__all__'


#CHECKOUT
class CartProductSerializer(serializers.ModelSerializer):
    """Serializer for product details in cart"""
    shop_name = serializers.SerializerMethodField()
    media_files = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'shop_name', 'media_files']
    
    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else "Unknown Shop"
    
    def get_media_files(self, obj):
        if hasattr(obj, 'media_files') and obj.media_files.exists():
            return obj.media_files.first().file_url
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
                'url': self.get_full_url(media.file_data.url) if media.file_data else None,
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
        
        # Get variant image with full URL
        variant_image = None
        if obj.variant.image:
            variant_image = self.get_full_url(obj.variant.image.url)
        
        return {
            'id': str(obj.variant.id),
            'title': obj.variant.title,
            'sku_code': obj.variant.sku_code,
            'price': str(obj.variant.price) if obj.variant.price else None,
            'compare_price': str(obj.variant.compare_price) if obj.variant.compare_price else None,
            'image': variant_image,
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
            return self.get_full_url(first_media.file_data.url)
        return None

    def get_full_url(self, url):
        """Convert relative URL to absolute URL using request context"""
        request = self.context.get('request')
        if request and url:
            try:
                # If it's already a full URL, return as is
                if url.startswith(('http://', 'https://')):
                    return url
                # Otherwise build absolute URL
                return request.build_absolute_uri(url)
            except Exception:
                return url
        return url
    
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
    image = serializers.ImageField(source='product.image', read_only=True)
    shop_name = serializers.CharField(source='product.shop.name', default='Unknown Shop')
    selected = serializers.SerializerMethodField()
    variant_details = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'name', 'color', 'price', 'quantity', 'image', 'shop_name', 'selected', 'variant_details']

    def get_selected(self, obj):
        return True  # default to selected
    
    def get_variant_details(self, obj):
        if obj.variant:
            return {
                'id': str(obj.variant.id),
                'title': obj.variant.title,
                'sku_code': obj.variant.sku_code,
                'price': str(obj.variant.price) if obj.variant.price else None
            }
        return None
    

class UserPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentMethod
        fields = '__all__'


# Refund Serializers
class RefundMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundMedia
        fields = '__all__'

class RefundProofSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = RefundProof
        fields = ['id', 'refund', 'uploaded_by', 'file_type', 'file_data', 'file_url', 'notes', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'file_url', 'created_at']

    def get_file_url(self, obj):
        if obj.file_data:
            request = self.context.get('request')
            url = obj.file_data.url
            return request.build_absolute_uri(url) if request else url
        return None

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
    class Meta:
        model = DisputeEvidence
        fields = '__all__'

class ReturnRequestMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequestMedia
        fields = '__all__'

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


class DisputeRequestCreateSerializer(serializers.ModelSerializer):
    # Accept an optional 'description' in the creation payload (write-only). It's not a model field,
    # so pop it during create to avoid trying to assign it to the model.
    description = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = DisputeRequest
        fields = ['reason', 'description']

    def create(self, validated_data):
        # Remove non-model 'description' before creating the model instance
        validated_data.pop('description', None)

        # Map 'refund' (from serializer.save(refund=...)) to model field 'refund_id'
        refund_obj = validated_data.pop('refund', None)
        if refund_obj is not None:
            validated_data['refund_id'] = refund_obj

        filed_by = self.context.get('filed_by')
        if not filed_by:
            raise serializers.ValidationError({'filed_by': 'X-User-Id header is required'})
        validated_data['requested_by'] = filed_by
        return super().create(validated_data)

class RefundSerializer(serializers.ModelSerializer):
    medias = RefundMediaSerializer(many=True, read_only=True)
    wallet = RefundWalletSerializer(read_only=True)
    bank = RefundBankSerializer(read_only=True)
    remittance = RefundRemittanceSerializer(read_only=True)
    counter_requests = CounterRefundRequestSerializer(many=True, read_only=True)
    dispute = DisputeRequestSerializer(read_only=True)
    return_request = ReturnRequestItemSerializer(read_only=True)
    proofs = RefundProofSerializer(many=True, read_only=True)
    
    class Meta:
        model = Refund
        fields = '__all__'




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