from rest_framework import serializers
from .models import *
from django.contrib.auth.hashers import make_password
from django.db.models import Avg

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

# class ProductSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Product
#         fields = '__all__'

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
            return obj.file_data.url
        return None
    
class VariantOptionsSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    compare_price = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    length = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    width = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    height = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    weight = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    weight_unit = serializers.CharField(read_only=True)

    class Meta:
        model = VariantOptions
        fields = ['id', 'variant', 'title', 'quantity', 'price', 'compare_price', 'image_url', 'length', 'width', 'height', 'weight', 'weight_unit']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

class VariantsSerializer(serializers.ModelSerializer):
    options = VariantOptionsSerializer(source='variantoptions_set', many=True, read_only=True)

    class Meta:
        model = Variants
        fields = ['id', 'title', 'options']

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
    # Include per-SKU details
    skus = serializers.SerializerMethodField()
    compare_price = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    length = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    width = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    height = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    weight = serializers.DecimalField(max_digits=9, decimal_places=2, read_only=True)
    weight_unit = serializers.CharField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'quantity', 'price',
            'status', 'upload_status', 'condition', 'created_at', 'updated_at',
            'shop', 'customer', 'category_admin', 'category', 'variants',
            'media_files', 'primary_image', 'skus', 'compare_price', 'length', 'width', 'height', 'weight', 'weight_unit'
        ]
    
    def get_primary_image(self, obj):
        """Get the first media file as primary image"""
        media = obj.productmedia_set.first()
        if media:
            return {
                'id': str(media.id),
                'url': media.file_data.url if media.file_data else None,
                'file_type': media.file_type
            }
        return None


    def get_skus(self, obj):
        skus = []
        for sku in obj.skus.all():
            skus.append({
                'id': str(sku.id),
                'option_ids': sku.option_ids,
                'option_map': sku.option_map,
                'price': str(sku.price) if sku.price is not None else None,
                'compare_price': str(sku.compare_price) if sku.compare_price is not None else None,
                'quantity': sku.quantity,
                'length': str(sku.length) if sku.length is not None else None,
                'width': str(sku.width) if sku.width is not None else None,
                'height': str(sku.height) if sku.height is not None else None,
                'weight': str(sku.weight) if sku.weight is not None else None,
                'weight_unit': sku.weight_unit,
                'sku_code': sku.sku_code,
                'critical_trigger': sku.critical_trigger,
                'allow_swap': sku.allow_swap,
                'swap_type': sku.swap_type,
                'minimum_additional_payment': (str(sku.minimum_additional_payment) if sku.minimum_additional_payment is not None else None),
                'maximum_additional_payment': (str(sku.maximum_additional_payment) if sku.maximum_additional_payment is not None else None),
                'accepted_categories': [str(c.id) for c in sku.accepted_categories.all()],
                'swap_description': sku.swap_description,
                'image': (
                    (self.context.get('request').build_absolute_uri(sku.image.url)
                        if self.context.get('request') and sku.image and getattr(sku.image, 'url', None)
                        else (sku.image.url if sku.image and getattr(sku.image, 'url', None) else None))
                ),
            })
        return skus

    def get_variants(self, obj):
        # Build a mapping of option_id -> image url derived from SKUs.
        request = self.context.get('request')
        option_image_map = {}

        # Prefer single-option SKUs first (explicit image for that option), then fall back to any SKU that includes the option
        try:
            for sku in obj.skus.all():
                oids = sku.option_ids or []
                if not oids:
                    continue
                # resolve image URL
                img_url = None
                if sku.image and getattr(sku.image, 'url', None):
                    if request:
                        img_url = request.build_absolute_uri(sku.image.url)
                    else:
                        img_url = sku.image.url

                # If single-option sku, prefer assigning immediately
                if len(oids) == 1 and img_url:
                    option_image_map[str(oids[0])] = img_url

            # Second pass: fill missing option images from any SKU that includes the option
            for sku in obj.skus.all():
                oids = sku.option_ids or []
                if not oids:
                    continue
                img_url = None
                if sku.image and getattr(sku.image, 'url', None):
                    if request:
                        img_url = request.build_absolute_uri(sku.image.url)
                    else:
                        img_url = sku.image.url
                if not img_url:
                    continue
                for oid in oids:
                    if str(oid) not in option_image_map:
                        option_image_map[str(oid)] = img_url
        except Exception:
            # Fail silently; return variants without images
            option_image_map = option_image_map or {}

        variants = []
        for variant in obj.variants_set.all():
            vdata = {
                'id': str(variant.id),
                'title': variant.title,
                'options': []
            }
            for option in variant.variantoptions_set.all():
                opt_img = option_image_map.get(str(option.id)) if option_image_map else None
                vdata['options'].append({
                    'id': str(option.id),
                    'title': option.title,
                    'quantity': option.quantity if hasattr(option, 'quantity') else None,
                    'price': str(option.price) if hasattr(option, 'price') and option.price is not None else None,
                    
                })
            variants.append(vdata)
        return variants
        
        
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
    """Serializer for cart items with product details"""
    item_name = serializers.CharField(source='product.name', read_only=True)
    item_price = serializers.DecimalField(
        source='product.price', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    item_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    product_details = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='product.shop.name', read_only=True)
    
    class Meta:
        model = CartItem
        fields = [
            'id', 
            'product', 
            'product_details',
            'item_name',
            'item_price',
            'item_image',
            'shop_name',
            'quantity', 
            'added_at',
            'subtotal'
        ]
        read_only_fields = ['id', 'added_at']
    
    def get_subtotal(self, obj):
        if obj.product and obj.product.price:
            return float(obj.product.price) * obj.quantity
        return 0
    
    def get_item_image(self, obj):
        # Get the first media file from product
        if obj.product:
            # Access the related media files
            media_files = obj.product.productmedia_set.all()
            if media_files.exists():
                first_media = media_files.first()
                if first_media.file_data:
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(first_media.file_data.url)
                    return first_media.file_data.url
        return None
    
    def get_product_details(self, obj):
        if obj.product:
            media_files = []
            for media in obj.product.productmedia_set.all():
                if media.file_data:
                    request = self.context.get('request')
                    file_url = media.file_data.url
                    if request:
                        file_url = request.build_absolute_uri(file_url)
                    
                    media_files.append({
                        'id': str(media.id),
                        'file_url': file_url,
                        'file_type': media.file_type
                    })
            
            return {
                'id': str(obj.product.id),
                'name': obj.product.name,
                'price': str(obj.product.price),
                'shop_name': obj.product.shop.name if obj.product.shop else None,
                'media_files': media_files if media_files else None
            }
        return None

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

class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = '__all__'

class RefundMediasSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundMedias
        fields = '__all__'




class CartItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating cart items"""
    class Meta:
        model = CartItem
        fields = ['product', 'quantity']
    
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
        
        # Check stock if product has stock attribute
        if hasattr(product, 'stock') and product.stock < quantity:
            raise serializers.ValidationError({"quantity": f"Only {product.stock} items available in stock."})
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        product = validated_data['product']
        quantity = validated_data['quantity']
        
        # Check if item already exists in cart
        cart_item, created = CartItem.objects.get_or_create(
            user=user,
            product=product,
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

    class Meta:
        model = CartItem
        fields = ['id', 'name', 'color', 'price', 'quantity', 'image', 'shop_name', 'selected']

    def get_selected(self, obj):
        return True  # default to selected
    

class ProductSKUSerializer(serializers.ModelSerializer):
    option_map = serializers.JSONField(read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductSKU
        fields = [
            'id', 'option_ids', 'option_map', 'sku_code',
            'price', 'compare_price', 'quantity',
            'length', 'width', 'height', 'weight', 'weight_unit',
            'image_url',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        # fallback: first option with image
        for oid in obj.option_ids or []:
            try:
                option = VariantOptions.objects.get(id=oid)
                if hasattr(option, 'image') and option.image:
                    return request.build_absolute_uri(option.image.url) if request else option.image.url
            except VariantOptions.DoesNotExist:
                continue
        return None
    

class RefundCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ['order', 'reason', 'preferred_refund_method', 
                  'total_refund_amount', 'customer_note', 'requested_by']
        
        
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

class UserPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentMethod
        fields = '__all__'

class RefundSerializer(serializers.ModelSerializer):
    wallet_details = RefundWalletSerializer(read_only=True)
    bank_details = RefundBankSerializer(read_only=True)
    remittance_details = RefundRemittanceSerializer(read_only=True)
    payment_details = serializers.SerializerMethodField()
    
    # === ADD THESE PROPERTIES ===
    requires_return = serializers.BooleanField(read_only=True)
    is_partial_refund = serializers.BooleanField(read_only=True)
    refund_category_display = serializers.CharField(
        source='get_refund_category_display', 
        read_only=True
    )
    # ============================
    
    class Meta:
        model = Refund
        fields = '__all__'
        read_only_fields = [
            'refund', 'request_number', 'requested_at', 'processed_at',
            'dispute_filed_at', 'resolved_at', 'negotiation_deadline',
            'approved_at', 'return_deadline', 'refund_category'  # Add refund_category here
        ]
    
    def get_payment_details(self, obj):
        """Get the payment details based on selected method"""
        try:
            if 'wallet' in obj.preferred_refund_method.lower():
                return RefundWalletSerializer(obj.wallet_details).data
            elif 'bank' in obj.preferred_refund_method.lower():
                return RefundBankSerializer(obj.bank_details).data
            elif 'money back' in obj.preferred_refund_method.lower() or 'remittance' in obj.preferred_refund_method.lower():
                return RefundRemittanceSerializer(obj.remittance_details).data
        except:
            return None
    
    # === OPTIONAL: Add validation for refund creation ===
    def validate_preferred_refund_method(self, value):
        """Validate that preferred_refund_method is one of the allowed options"""
        allowed_methods = [
            'Return Item & Refund to Wallet',
            'Return Item & Bank Transfer',
            'Return Item & Store Voucher',
            'Return & Replacement',
            'Return Item & Money Back',
            'Keep Item & Partial Refund to Wallet',
            'Keep Item & Partial Bank Transfer',
            'Keep Item & Partial Store Voucher',
            'Keep Item & Partial Money Back'
        ]
        
        if value not in allowed_methods:
            raise serializers.ValidationError(
                f"Invalid refund method. Allowed methods: {', '.join(allowed_methods)}"
            )
        return value


class ReturnWaybillSerializer(serializers.ModelSerializer):
    """Serializer for ReturnWaybill model"""
    
    # Read-only fields for computed data
    return_items = serializers.SerializerMethodField(read_only=True)
    customer_info = serializers.SerializerMethodField(read_only=True)
    shop_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ReturnWaybill
        fields = [
            'id', 'refund', 'shop', 
            'waybill_number', 'logistic_service', 'tracking_number', 'status',
            'return_instructions', 'created_at', 'updated_at', 'printed_at',
            'shipped_at', 'received_at', 'return_items', 'customer_info', 'shop_info'
        ]
        read_only_fields = ['id', 'waybill_number', 'created_at', 'updated_at', 'printed_at', 'shipped_at', 'received_at']
    
    def get_return_items(self, obj):
        """Get the items being returned"""
        return obj.return_items
    
    def get_customer_info(self, obj):
        """Get customer information for the return"""
        return obj.customer_info
    
    def get_shop_info(self, obj):
        """Get shop information for the return"""
        return {
            'name': obj.shop_name,
            'contact_number': obj.shop_contact_number,
            'address': obj.shop_address
        }
    
    def create(self, validated_data):
        """Create a new ReturnWaybill with shop information populated"""
        shop = validated_data.get('shop')
        if shop:
            # Populate shop information from the shop instance
            validated_data['shop_name'] = shop.name
            validated_data['shop_contact_number'] = getattr(shop, 'contact_number', '')
            # Build address from shop fields
            address_parts = [
                getattr(shop, 'street', ''),
                getattr(shop, 'barangay', ''),
                getattr(shop, 'city', ''),
                getattr(shop, 'province', ''),
                "Philippines"
            ]
            validated_data['shop_address'] = ", ".join(filter(None, address_parts))
        
        return super().create(validated_data)
    


# serializers.py
class DisputeEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for dispute evidence"""
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = DisputeEvidence
        fields = [
            'id', 'dispute', 'uploaded_by', 'uploaded_by_name', 
            'file', 'file_url', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class DisputeRequestSerializer(serializers.ModelSerializer):
    """Serializer for dispute requests"""
    evidence = DisputeEvidenceSerializer(many=True, read_only=True)
    filed_by_name = serializers.CharField(source='filed_by.get_full_name', read_only=True)
    order_number = serializers.CharField(source='order.order', read_only=True)
    refund_request_number = serializers.CharField(source='refund.request_number', read_only=True, allow_null=True)
    
    class Meta:
        model = DisputeRequest
        fields = [
            'id', 'order', 'order_number', 'refund', 'refund_request_number',
            'filed_by', 'filed_by_name', 'reason', 'description', 'status',
            'outcome', 'awarded_amount', 'admin_note', 'created_at', 
            'resolved_at', 'evidence'
        ]
        read_only_fields = [
            'filed_by', 'created_at', 'resolved_at', 'status', 'outcome',
            'admin_note', 'awarded_amount'
        ]
    
    def create(self, validated_data):
        # Auto-set filed_by to current user
        validated_data['filed_by'] = self.context['request'].user
        return super().create(validated_data)


class DisputeRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dispute requests (with validation)"""
    class Meta:
        model = DisputeRequest
        fields = ['order', 'refund', 'filed_by', 'reason', 'description']
    
    def validate(self, data):
        # Validation is handled in the ViewSet, so we skip it here
        # to avoid issues with request.user not being set
        return data