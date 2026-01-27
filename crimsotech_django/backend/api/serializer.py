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
            request = self.context.get('request')
            url = obj.file_data.url
            if request:
                try:
                    return request.build_absolute_uri(url)
                except Exception:
                    return url
            return url
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

    def to_internal_value(self, data):
        # Accept 'refundable' from frontend when updating products and map to 'is_refundable'
        try:
            mutable = data.copy()
            if 'refundable' in mutable and 'is_refundable' not in mutable:
                mutable['is_refundable'] = True if str(mutable.get('refundable')).lower() in ('true', '1') else False
            return super().to_internal_value(mutable)
        except Exception:
            return super().to_internal_value(data)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'quantity', 'price',
            'status', 'upload_status', 'condition', 'is_refundable', 'created_at', 'updated_at',
            'shop', 'category', 'category_admin', 'variants', 'media_files', 'primary_image',
            'skus', 'compare_price', 'length', 'width', 'height', 'weight', 'weight_unit',
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
                    # Fallback to raw url if anything goes wrong
                    url = media.file_data.url
            return {
                'id': str(media.id),
                'url': url,
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
                'is_refundable': sku.is_refundable,
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
            'is_refundable',
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
    
    class Meta:
        model = Delivery
        fields = [
            'id', 'order_id', 'customer_name', 'pickup_location', 
            'delivery_location', 'status', 'amount', 'distance', 
            'estimated_time', 'actual_time', 'rating', 'completed_at',
            'picked_at', 'delivered_at', 'created_at'
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