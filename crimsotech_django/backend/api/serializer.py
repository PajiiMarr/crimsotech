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
        fields = ['id', 'product', 'user', 'quantity', 'added_at']
        read_only_fields = ['id', 'added_at']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value



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
    variants = VariantsSerializer(source='variants_set', many=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'quantity', 'used_for', 'price',
            'status', 'upload_status', 'condition', 'created_at', 'updated_at',
            'shop', 'customer', 'category_admin', 'category', 'variants'
        ]

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

class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = '__all__'

class RefundMediasSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundMedias
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
    product_details = CartProductSerializer(source='product', read_only=True)
    subtotal = serializers.SerializerMethodField()
    item_name = serializers.CharField(source='product.name', read_only=True)
    item_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    item_image = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = [
            'id', 
            'product', 
            'product_details',
            'item_name',
            'item_price',
            'item_image',
            'quantity', 
            'added_at',
            'subtotal'
        ]
        read_only_fields = ['id', 'added_at']
    
    def get_subtotal(self, obj):
        if obj.product and obj.product.price:
            return obj.quantity * obj.product.price
        return 0
    
    def get_item_image(self, obj):
        if obj.product and hasattr(obj.product, 'media_files') and obj.product.media_files.exists():
            return obj.product.media_files.first().file_url
        return None

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
    

    