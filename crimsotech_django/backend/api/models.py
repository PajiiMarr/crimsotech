from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType

class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    username = models.CharField(max_length=100, unique=True, blank=True, null=True)
    email = models.CharField(max_length=100, unique=True, null=True, blank=True)
    password = models.CharField(max_length=200, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    middle_name = models.CharField(max_length=100, blank=True, default='')
    contact_number = models.CharField(max_length=20, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, blank=True, default='')
    street = models.CharField(max_length=200, blank=True, default='')
    barangay = models.CharField(max_length=100, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    province = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    zip_code = models.CharField(max_length=20, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    is_admin = models.BooleanField(default=False)
    is_customer = models.BooleanField(default=False)
    is_moderator = models.BooleanField(default=False)
    is_rider = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    registration_stage = models.IntegerField(null=True, blank=True)
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True, null=True)
    suspended_until = models.DateTimeField(blank=True, null=True)
    warning_count = models.IntegerField(default=0)
    last_warning_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_suspended', 'suspended_until']),
            models.Index(fields=['is_customer', 'is_suspended']),
            models.Index(fields=['is_moderator', 'is_suspended']),
            models.Index(fields=['is_rider', 'is_suspended']),
        ]

    def __str__(self):
        return f"User {self.username or self.id}"
    
    @property
    def active_report_count(self):
        return self.reports_against.filter(status__in=['pending', 'under_review']).count()
    
    @property
    def total_report_count(self):
        return self.reports_against.count()

class Customer(models.Model):
    customer = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    product_limit = models.IntegerField(default=500)
    current_product_count = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['current_product_count', 'product_limit']),
        ]

    def can_add_product(self):
        return self.current_product_count < self.product_limit

    def increment_product_count(self):
        if self.can_add_product():
            self.current_product_count += 1
            self.save()
        else:
            raise ValidationError("Product limit reached")

    def decrement_product_count(self):
        if self.current_product_count > 0:
            self.current_product_count -= 1
            self.save()

    def __str__(self):
        return f"{self.customer.username}"

class Moderator(models.Model):
    moderator = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    approval_status = models.CharField(max_length=20, choices=[('pending','Pending'),('approved','Approved'),('rejected','Rejected')], default='pending')

    class Meta:
        indexes = [
            models.Index(fields=['approval_status']),
        ]

    def __str__(self):
        return f"Moderator: {self.moderator.username}"

class Rider(models.Model):
    rider = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    vehicle_type = models.CharField(max_length=50, blank=True)
    plate_number = models.CharField(max_length=20, blank=True)
    vehicle_brand = models.CharField(max_length=50, blank=True)
    vehicle_model = models.CharField(max_length=50, blank=True)
    vehicle_image = models.ImageField(upload_to='riders/vehicles/', null=True, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    license_image = models.ImageField(upload_to='riders/licenses/', null=True, blank=True)
    verified = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_riders')
    approval_date = models.DateTimeField(null=True, blank=True)
    availability_status = models.CharField(
        max_length=20,
        choices=[
            ('offline', 'Offline'),
            ('available', 'Available for Deliveries'),
            ('busy', 'Busy - On Delivery'),
            ('break', 'On Break'),
            ('unavailable', 'Temporarily Unavailable')
        ],
        default='offline'
    )
    is_accepting_deliveries = models.BooleanField(default=False)
    last_status_update = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['verified', 'availability_status']),
            models.Index(fields=['availability_status', 'is_accepting_deliveries']),
            models.Index(fields=['last_status_update']),
        ]

    def __str__(self):
        return f"Rider: {self.rider.username}"
    
class Admin(models.Model):
    admin = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)

    def __str__(self):
        return f"Admin: {self.admin.username}"
    
class Logs(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"Log {self.id} by {self.user.username} at {self.timestamp}"
    
class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=500)
    type = models.CharField(max_length=50)
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Notification {self.id} for {self.user.username}"
    
class OTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    otp = models.CharField(max_length=10)
    sent_at = models.DateTimeField(auto_now_add=True)
    expired_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=['expired_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.expired_at:
            self.expired_at = timezone.now() + timedelta(minutes=5)
        super().save(*args,**kwargs)

    def is_expired(self):
        return timezone.now() > self.expired_at

    def __str__(self):
        return f"OTP for {self.user.username} (Expires at {self.expired_at})"
    
class Shop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    shop_picture = models.ImageField(upload_to='shop/picture/', null=True, blank=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_shops'
    )
    description = models.CharField(max_length=200, blank=True, null=True)
    name = models.CharField(max_length=50)
    province = models.CharField(max_length=50)
    city = models.CharField(max_length=50)
    barangay = models.CharField(max_length=50)
    street = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=20, blank=True, default='')
    verified = models.BooleanField(default=False)
    status = models.CharField(max_length=10, default="Active")
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True, null=True)
    suspended_until = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'verified']),
            models.Index(fields=['verified', 'status']),
            models.Index(fields=['name']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_suspended', 'suspended_until']),
        ]

    def __str__(self):
        return f"{self.name}"
    
    @property
    def active_report_count(self):
        return self.reports_against.filter(status__in=['pending', 'under_review']).count()

class ShopFollow(models.Model): 
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    followed_at = models.DateTimeField(auto_now_add=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shop_follows'
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='followers'
    )

    class Meta:
        unique_together = ['customer', 'shop']
        indexes = [
            models.Index(fields=['shop', 'followed_at']),
            models.Index(fields=['customer', 'followed_at']),
        ]

    def __str__(self):
        return f"{self.customer} follows {self.shop}"

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=50)
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=['shop', 'name']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name}"

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    shop = models.ForeignKey(
        'Shop',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )
    customer = models.ForeignKey(
        'Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )
    category_admin = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_products'
    )
    category = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=1000)
    quantity = models.IntegerField(default=0)
    price = models.DecimalField(decimal_places=2, max_digits=9)
    upload_status = models.CharField(max_length=20, choices=[('draft','Draft'),('published','Published'),('archived','Archived')], default='draft')
    status = models.TextField()
    condition = models.CharField(max_length=50)
    compare_price = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    is_refundable = models.BooleanField(null=True,blank=True)
    length = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=10, default='kg', blank=True)
    critical_stock = models.IntegerField(null=True,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_removed = models.BooleanField(default=False)
    removal_reason = models.TextField(blank=True, null=True)
    removed_at = models.DateTimeField(blank=True, null=True)
    refund_days = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['shop', 'upload_status']),
            models.Index(fields=['customer', 'upload_status']),
            models.Index(fields=['upload_status', 'created_at']),
            models.Index(fields=['category', 'upload_status']),
            models.Index(fields=['price']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_removed', 'removed_at']),
        ]

    @property
    def active_report_count(self):
        return self.reports_against.filter(status__in=['pending', 'under_review']).count()

    def clean(self):
        if self.customer and not self.customer.can_add_product():
            raise ValidationError(f"Customer cannot add more than {self.customer.product_limit} products")

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        
        if is_new and self.customer:
            self.customer.increment_product_count()
        
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.customer:
            self.customer.decrement_product_count()
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.name}"

class Favorites(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ['product', 'customer']
        indexes = [
            models.Index(fields=['customer', 'product']),
        ]

    def __str__(self):
        return f"{self.customer} favorites {self.product}"

class ProductMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    file_data = models.FileField(upload_to="product/")
    file_type = models.TextField()
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"Media for {self.product.name}"

class Variants(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100)

    class Meta:
        indexes = [
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"{self.title} for {self.product.name}"

class VariantOptions(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    variant = models.ForeignKey(
        Variants,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['variant']),
            models.Index(fields=['created_at']),
        ]

    @property
    def quantity(self):
        return None

    @property
    def price(self):
        return None

    def __str__(self):
        return f"{self.title} - {self.variant.title if self.variant else ''}"

class Issues(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    description = models.CharField(max_length=300)

    class Meta:
        indexes = [
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"Issue with {self.product.name}"

class BoostPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    name = models.CharField(max_length=50)
    price = models.DecimalField(decimal_places=2, max_digits=9)
    duration = models.IntegerField()
    time_unit = models.CharField(max_length=10, choices=[
        ('hours', 'Hours'),
        ('days', 'Days'), 
        ('weeks', 'Weeks'),
        ('months', 'Months')
    ])
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived')
    ])
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'price']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.name}"

class BoostFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    def __str__(self):
        return self.name

class BoostPlanFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    boost_plan = models.ForeignKey(BoostPlan, on_delete=models.CASCADE, related_name='features')
    feature = models.ForeignKey(BoostFeature, on_delete=models.CASCADE)
    value = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        unique_together = ['boost_plan', 'feature']
        indexes = [
            models.Index(fields=['boost_plan']),
        ]
    
    def __str__(self):
        return f"{self.boost_plan.name} - {self.feature.name}"

class Boost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    boost_plan = models.ForeignKey(
        BoostPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending')
    ], default='active')
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'end_date']),
            models.Index(fields=['product', 'status']),
            models.Index(fields=['shop', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.end_date and self.boost_plan:
            duration_map = {
                'hours': timedelta(hours=self.boost_plan.duration),
                'days': timedelta(days=self.boost_plan.duration),
                'weeks': timedelta(weeks=self.boost_plan.duration),
                'months': timedelta(days=self.boost_plan.duration * 30)
            }
            self.end_date = self.start_date + duration_map.get(self.boost_plan.time_unit, timedelta(days=7))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Boost for {self.product.name}"

class Voucher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20)
    discount_type = models.TextField()
    value = models.DecimalField(decimal_places=2, max_digits=9)
    minimum_spend = models.DecimalField(decimal_places=2, max_digits=9, default=0.00)
    maximum_usage = models.IntegerField(default=0)
    valid_until = models.DateField()
    added_at = models.DateField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_vouchers'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['code', 'is_active']),
            models.Index(fields=['shop', 'is_active', 'valid_until']),
            models.Index(fields=['valid_until', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
        
class RefundPolicy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    main_title = models.CharField(max_length=100)
    section_title = models.CharField(max_length=100)
    content = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.main_title}"

class CustomerActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    activity_type = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['product', 'created_at']),
        ]

    def __str__(self):
        return f"{self.customer} - {self.activity_type}"

class AiRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'score']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Recommendation for {self.customer}"

class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    # Track selected SKU when product has variants
    sku = models.ForeignKey(
        'ProductSKU',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cart_items'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    quantity = models.IntegerField(default=1)
    is_ordered = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # uniqueness now includes sku to allow same product with different SKUs
        unique_together = ['product', 'user', 'sku']
        indexes = [
            models.Index(fields=['user', 'is_ordered']),
            models.Index(fields=['product', 'is_ordered']),
            models.Index(fields=['sku', 'is_ordered']),
        ]

    def __str__(self):
        return f"{self.quantity} x {(self.product.name if self.product else 'Unknown Product')} (SKU: {self.sku.sku_code if self.sku else 'none'})"

class ShippingAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shipping_addresses'
    )
    recipient_name = models.CharField(max_length=200)
    recipient_phone = models.CharField(max_length=20)
    street = models.CharField(max_length=200)
    barangay = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default='')
    zip_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Philippines')
    building_name = models.CharField(max_length=200, blank=True, default='')
    floor_number = models.CharField(max_length=50, blank=True, default='')
    unit_number = models.CharField(max_length=50, blank=True, default='')
    landmark = models.CharField(max_length=300, blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    address_type = models.CharField(max_length=20, choices=[
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other')
    ], default='home')
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name_plural = "Shipping Addresses"
        indexes = [
            models.Index(fields=['user', 'is_default']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['city', 'province']),
        ]
    
    def __str__(self):
        return f"{self.recipient_name} - {self.street}, {self.barangay}, {self.city}"
    
    def get_full_address(self):
        address_parts = []
        if self.building_name:
            address_parts.append(self.building_name)
        if self.floor_number:
            address_parts.append(f"Floor {self.floor_number}")
        if self.unit_number:
            address_parts.append(f"Unit {self.unit_number}")
        if self.street:
            address_parts.append(self.street)
        if self.barangay:
            address_parts.append(self.barangay)
        if self.city:
            address_parts.append(self.city)
        if self.province:
            address_parts.append(self.province)
        if self.zip_code:
            address_parts.append(self.zip_code)
        if self.country:
            address_parts.append(self.country)
        
        return ", ".join(filter(None, address_parts))
    
    def save(self, *args, **kwargs):
        if self.is_default:
            ShippingAddress.objects.filter(
                user=self.user, 
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)

class Order(models.Model):
    order = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    shipping_address = models.ForeignKey(
        ShippingAddress,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    approval = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ], default='pending')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded')
    ], default='pending')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50)
    delivery_method = models.CharField(max_length=50, null=True, blank=True)
    delivery_address_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    receipt = models.FileField(upload_to="receipt/", null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['approval', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['total_amount']),
        ]

    def __str__(self):
        return f"Order {self.order} by {self.user.username}"
    
    def save(self, *args, **kwargs):
        if self.shipping_address and not self.delivery_address_text:
            self.delivery_address_text = self.shipping_address.get_full_address()
        super().save(*args, **kwargs)

class Checkout(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    voucher = models.ForeignKey(
        'Voucher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    cart_item = models.ForeignKey(
        CartItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    quantity = models.IntegerField(default=0)
    total_amount = models.DecimalField(decimal_places=2, max_digits=9)
    status = models.TextField()
    remarks = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Checkout {self.id}"

class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews'
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews'
    )
    rating = models.IntegerField()
    comment = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['shop', 'rating']),
            models.Index(fields=['product', 'rating']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Review by {self.customer} - {self.rating} stars"

class Delivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    rider = models.ForeignKey(Rider, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending','Pending'),
        ('picked_up','Picked Up'),
        ('in_progress','In Progress'),
        ('delivered','Delivered'),
        ('cancelled','Cancelled'),
    ], default='pending')
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    estimated_minutes = models.IntegerField(null=True, blank=True)
    actual_minutes = models.IntegerField(null=True, blank=True)
    delivery_rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    picked_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_pickup_time = models.DateTimeField(null=True, blank=True)
    scheduled_delivery_time = models.DateTimeField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['order', 'status']),
            models.Index(fields=['rider', 'status']),
            models.Index(fields=['status', 'scheduled_delivery_time']),
            models.Index(fields=['created_at']),
            models.Index(fields=['delivered_at']),
        ]

    def __str__(self):
        return f"Delivery {self.id} for Order {self.order.order}"

class Proof(models.Model):
    PROOF_TYPE_CHOICES = [
        ('delivery', 'Delivery'),
        ('seller', 'Seller'),
        ('pickup', 'Pickup'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE)
    proof_type = models.CharField(max_length=20, choices=PROOF_TYPE_CHOICES)
    file_data = models.FileField(upload_to="delivery/proofs/")
    file_type = models.CharField(max_length=50)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['delivery', 'uploaded_at']),
            models.Index(fields=['uploaded_at']),
        ]

    def __str__(self):
        return f"Proof {self.id} for Delivery {self.delivery.id}"

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=[('success','Success'),('failed','Failed')])
    transaction_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['order', 'status']),
            models.Index(fields=['status', 'transaction_date']),
            models.Index(fields=['transaction_date']),
        ]

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.order}"

class Report(models.Model):
    REPORT_TYPES = [
        ('account', 'Account'),
        ('product', 'Product'),
        ('shop', 'Shop'),
    ]
    
    REPORT_REASONS = [
        ('spam', 'Spam'),
        ('inappropriate_content', 'Inappropriate Content'),
        ('harassment', 'Harassment'),
        ('fake_account', 'Fake Account'),
        ('fraud', 'Fraud'),
        ('counterfeit', 'Counterfeit Items'),
        ('misleading', 'Misleading Information'),
        ('intellectual_property', 'Intellectual Property Violation'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
        ('action_taken', 'Action Taken'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    reporter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports_made'
    )
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    reason = models.CharField(max_length=50, choices=REPORT_REASONS)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reported_account = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports_against'
    )
    reported_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports_against'
    )
    reported_shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports_against'
    )
    assigned_moderator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_reports',
        limit_choices_to={'is_moderator': True}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['assigned_moderator', 'status']),
            models.Index(fields=['reported_account', 'status']),
            models.Index(fields=['reported_product', 'status']),
            models.Index(fields=['reported_shop', 'status']),
        ]
    
    def clean(self):
        targets = [self.reported_account, self.reported_product, self.reported_shop]
        set_targets = [target for target in targets if target is not None]
        
        if len(set_targets) != 1:
            raise ValidationError("Exactly one report target must be set based on report_type")
        
        if self.report_type == 'account' and not self.reported_account:
            raise ValidationError("Report type 'account' requires a reported account")
        elif self.report_type == 'product' and not self.reported_product:
            raise ValidationError("Report type 'product' requires a reported product")
        elif self.report_type == 'shop' and not self.reported_shop:
            raise ValidationError("Report type 'shop' requires a reported shop")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def get_reported_object(self):
        if self.report_type == 'account':
            return self.reported_account
        elif self.report_type == 'product':
            return self.reported_product
        elif self.report_type == 'shop':
            return self.reported_shop
        return None
    
    def __str__(self):
        return f"Report {self.id} - {self.get_report_type_display()} - {self.get_status_display()}"

class ReportMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name='media'
    )
    file_data = models.FileField(upload_to="reports/")
    file_type = models.CharField(max_length=50)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['report']),
        ]
    
    def __str__(self):
        return f"Media for Report {self.report.id}"

class ReportAction(models.Model):
    ACTION_TYPES = [
        ('warning', 'Warning Issued'),
        ('suspension', 'Account Suspension'),
        ('product_removal', 'Product Removed'),
        ('shop_suspension', 'Shop Suspended'),
        ('content_removal', 'Content Removed'),
        ('no_action', 'No Action Taken'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name='action'
    )
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    taken_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions_taken',
        limit_choices_to={'is_admin': True, 'is_moderator': True}
    )
    duration_days = models.IntegerField(null=True, blank=True, help_text="Duration in days for temporary actions")
    taken_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.get_action_type_display()} for Report {self.report.id}"

class ReportComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='report_comments'
    )
    comment = models.TextField()
    is_internal = models.BooleanField(default=True, help_text="Internal comments are only visible to moderators/admins")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['report', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"Comment by {self.user.username} on Report {self.report.id}"

class ProductSKU(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='skus'
    )
    option_ids = models.JSONField(blank=True, null=True)
    option_map = models.JSONField(blank=True, null=True)
    sku_code = models.CharField(max_length=100, blank=True, null=True)
    price = models.DecimalField(decimal_places=2, max_digits=9, null=True, blank=True)
    compare_price = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    quantity = models.IntegerField(default=0)
    length = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=10, default='g', blank=True)
    critical_trigger = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_refundable = models.BooleanField(default=False)
    refund_days = models.PositiveIntegerField(default=0)
    allow_swap = models.BooleanField(default=False)
    swap_type = models.CharField(
        max_length=30,
        choices=[('direct_swap', 'Direct swap'), ('swap_plus_payment', 'Swap + payment')],
        default='direct_swap'
    )
    minimum_additional_payment = models.DecimalField(max_digits=9, decimal_places=2, default=Decimal('0.00'))
    maximum_additional_payment = models.DecimalField(max_digits=9, decimal_places=2, default=Decimal('0.00'))
    swap_description = models.TextField(blank=True, null=True)
    accepted_categories = models.ManyToManyField('Category', blank=True, related_name='accepted_for_sku_swaps')
    image = models.ImageField(upload_to='product/skus/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['sku_code']),
            models.Index(fields=['quantity', 'is_active']),
            models.Index(fields=['price']),
        ]

    def __str__(self):
        return f"SKU for {self.product.name} ({self.sku_code or 'no-code'})"

class UserPaymentMethod(models.Model):
    METHOD_CHOICES = [
        ('wallet', 'E-Wallet'),
        ('bank', 'Bank Account'),
        ('remittance', 'Remittance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=20, choices=METHOD_CHOICES)
    provider = models.CharField(max_length=100, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_type = models.CharField(max_length=50, blank=True, null=True)
    branch = models.CharField(max_length=200, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)
    valid_id_type = models.CharField(max_length=100, blank=True, null=True)
    valid_id_number = models.CharField(max_length=50, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_default']),
            models.Index(fields=['method_type', 'user']),
        ]
    
    def __str__(self):
        return f"{self.get_method_type_display()} - {self.account_number}"

class Refund(models.Model):
    REFUND_METHOD_CHOICES = [
        ('wallet', 'E-wallet'),
        ('bank', 'Bank Transfer'),
        ('remittance', 'Remittance'),
        ('voucher', 'Store Voucher'),
    ]

    REFUND_TYPE_CHOICES = [
        ('return', 'Return Item'),
        ('keep', 'Keep Item'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('negotiation', 'Negotiation'),
        ('rejected', 'Rejected'),
        ('dispute', 'Dispute'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('failed', 'Failed'),
        ('completed', 'Completed'),
    ]

    refund_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reason = models.CharField(max_length=500)
    detailed_reason = models.TextField(blank=True, null=True)
    buyer_preferred_refund_method = models.CharField(max_length=50, choices=REFUND_METHOD_CHOICES)
    refund_type = models.CharField(max_length=10, choices=REFUND_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    customer_note = models.TextField(blank=True, null=True)
    final_refund_type = models.CharField(max_length=50, blank=True, null=True)
    total_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    approved_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    final_refund_method = models.CharField(max_length=50, blank=True, null=True)
    refund_payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    order_id = models.ForeignKey(Order, on_delete=models.CASCADE)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_refunds')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_refunds')
    buyer_notified_at = models.DateTimeField(null=True, blank=True)
    reject_reason_code = models.CharField(max_length=100, blank=True, null=True)
    reject_reason_details = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['order_id', 'status']),
            models.Index(fields=['requested_by', 'status']),
            models.Index(fields=['status', 'requested_at']),
            models.Index(fields=['refund_payment_status']),
        ]

    def __str__(self):
        return f"Refund {self.refund_id}"

class RefundMedia(models.Model):
    refundmedia = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_data = models.FileField(upload_to='refunds/media/')
    file_type = models.CharField(max_length=50)
    refund_id = models.ForeignKey(Refund, on_delete=models.CASCADE, related_name='medias')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['refund_id']),
        ]

    def __str__(self):
        return f"Media for Refund {self.refund_id.refund_id}"

class RefundWallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=100)
    account_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    refund_id = models.OneToOneField(Refund, on_delete=models.CASCADE, related_name='wallet')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet for Refund {self.refund_id.refund_id}"

class RefundBank(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_name = models.CharField(max_length=100)
    account_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=100)
    account_type = models.CharField(max_length=50)
    branch = models.CharField(max_length=100)
    refund_id = models.OneToOneField(Refund, on_delete=models.CASCADE, related_name='bank')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Bank for Refund {self.refund_id.refund_id}"

class RefundRemittance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    barangay = models.CharField(max_length=100)
    street = models.CharField(max_length=200)
    valid_id_type = models.CharField(max_length=50)
    valid_id_number = models.CharField(max_length=50)
    refund_id = models.OneToOneField(Refund, on_delete=models.CASCADE, related_name='remittance')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Remittance for Refund {self.refund_id.refund_id}"

class CounterRefundRequest(models.Model):
    REQUESTED_BY_CHOICES = [
        ('buyer', 'Buyer'),
        ('seller', 'Seller'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('dispute', 'Dispute'),
    ]

    COUNTER_TYPE_CHOICES = [
        ('return', 'Return'),
        ('keep', 'Keep'),
    ]

    counter_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_id = models.ForeignKey(Refund, on_delete=models.CASCADE, related_name='counter_requests')
    requested_by = models.CharField(max_length=10, choices=REQUESTED_BY_CHOICES)
    seller_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='counter_requests_made')
    shop_id = models.ForeignKey(Shop, on_delete=models.CASCADE)
    counter_refund_method = models.CharField(max_length=50)
    counter_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    counter_refund_type = models.CharField(max_length=10, choices=COUNTER_TYPE_CHOICES, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['refund_id', 'status']),
            models.Index(fields=['seller_id', 'requested_at']),
        ]

    def __str__(self):
        return f"Counter Request for Refund {self.refund_id.refund_id}"

class DisputeRequest(models.Model):
    REQUESTED_BY_CHOICES = [
        ('buyer', 'Buyer'),
        ('seller', 'Seller'),
    ]

    STATUS_CHOICES = [
        ('filed', 'Filed'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('resolved', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_id = models.OneToOneField(Refund, on_delete=models.CASCADE, related_name='dispute', null=True, blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='filed')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_disputes')
    resolved_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['refund_id', 'status']),
            models.Index(fields=['requested_by', 'created_at']),
        ]

    def __str__(self):
        return f"Dispute for Refund {self.refund_id.refund_id}"

class DisputeEvidence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_type = models.CharField(max_length=50, null=True, blank=True)
    dispute_id = models.ForeignKey(DisputeRequest, on_delete=models.CASCADE, related_name='evidences', null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    file_data = models.FileField(upload_to='disputes/evidence/', null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['dispute_id']),
        ]

    def __str__(self):
        return f"Evidence for Dispute {self.dispute_id.dispute_id}"

class ReturnRequestItem(models.Model):
    STATUS_CHOICES = [
        ('shipped', 'Shipped'),
        ('received', 'Received'),
        ('inspected', 'Inspected'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('problem', 'Problem'),
    ]

    return_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_id = models.OneToOneField(Refund, on_delete=models.CASCADE, related_name='return_request')
    return_method = models.CharField(max_length=100)
    logistic_service = models.CharField(max_length=100, blank=True, null=True) 
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    shipped_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipped_returns')
    shipped_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    return_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_returns')

    class Meta:
        indexes = [
            models.Index(fields=['refund_id', 'status']),
            models.Index(fields=['status', 'return_deadline']),
        ]

    def __str__(self):
        return f"Return for Refund {self.refund_id.refund_id}"

class ReturnRequestMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_id = models.ForeignKey(ReturnRequestItem, on_delete=models.CASCADE, related_name='medias')
    file_type = models.CharField(max_length=50)
    file_data = models.FileField(upload_to='returns/media/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['return_id']),
        ]

    def __str__(self):
        return f"Media for Return {self.return_id.return_id}"

class ReturnAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund = models.OneToOneField(
        Refund,
        on_delete=models.CASCADE,
        related_name='return_address',
        null=True,
        blank=True,
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='return_addresses'
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seller_return_addresses'
    )
    recipient_name = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    barangay = models.CharField(max_length=100)
    street = models.CharField(max_length=255)
    zip_code = models.CharField(max_length=20)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_return_addresses'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['shop', 'seller']),
            models.Index(fields=['refund']),
        ]

    def __str__(self):
        shop_part = f" for Shop {self.shop.name}" if self.shop else ''
        return f"Return Address for Refund {self.refund.refund_id}{shop_part}"

class RefundProof(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund = models.ForeignKey(
        Refund,
        on_delete=models.CASCADE,
        related_name='proofs'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_refund_proofs'
    )
    file_type = models.CharField(max_length=50)
    file_data = models.FileField(upload_to='refunds/proof/')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['refund']),
        ]

    def __str__(self):
        return f"Proof for Refund {self.refund.refund_id}"

class AppliedGift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop_id = models.ForeignKey(
        'Shop',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='applied_gifts'
    )
    gift_product_id = models.ForeignKey(
        'Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gift_promotions'
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['shop_id', 'is_active']),
            models.Index(fields=['is_active', 'end_time']),
        ]

    def __str__(self):
        return f"Gift: {self.gift_product_id.name if self.gift_product_id else 'No Product'}"

class AppliedGiftProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applied_gift_id = models.ForeignKey(
        AppliedGift,
        on_delete=models.CASCADE,
        related_name='eligible_products'
    )
    product_id = models.ForeignKey(
        'Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ['applied_gift_id', 'product_id']
        indexes = [
            models.Index(fields=['applied_gift_id']),
            models.Index(fields=['product_id']),
        ]

    def __str__(self):
        product_name = self.product_id.name if self.product_id else 'No Product'
        return f"Eligible: {product_name}"

class RiderSchedule(models.Model):
    rider = models.ForeignKey(Rider, on_delete=models.CASCADE)
    day_of_week = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['rider', 'day_of_week']),
            models.Index(fields=['day_of_week', 'is_available']),
        ]

class TimeOffRequest(models.Model):
    rider = models.ForeignKey(Rider, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20)

    class Meta:
        indexes = [
            models.Index(fields=['rider', 'start_date']),
            models.Index(fields=['status', 'start_date']),
        ]