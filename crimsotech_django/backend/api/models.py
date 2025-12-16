from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
from django.core.exceptions import ValidationError
from decimal import Decimal

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
    product_limit = models.IntegerField(default=500)  # Maximum products a customer can sell
    current_product_count = models.IntegerField(default=0)  # Track current product count

    def can_add_product(self):
        """Check if customer can add more products"""
        return self.current_product_count < self.product_limit

    def increment_product_count(self):
        """Increment product count when adding a product"""
        if self.can_add_product():
            self.current_product_count += 1
            self.save()
        else:
            raise ValidationError("Product limit reached")

    def decrement_product_count(self):
        """Decrement product count when removing a product"""
        if self.current_product_count > 0:
            self.current_product_count -= 1
            self.save()

    def __str__(self):
        return f"{self.customer.username}"

class Moderator(models.Model):
    moderator = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)  # Add this default)
    approval_status = models.CharField(max_length=20, choices=[('pending','Pending'),('approved','Approved'),('rejected','Rejected')], default='pending')

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

    def __str__(self):
        return f"Notification {self.id} for {self.user.username}"
    
class OTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    otp = models.CharField(max_length=10)
    sent_at = models.DateTimeField(auto_now_add=True)
    expired_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expired_at:
            self.expired_at = timezone.now() + timedelta(minutes=5)
        super().save(*args,**kwargs)

    def is_expired(self):
        """Check if OTP is expired."""
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
    # Physical dimensions
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

    @property
    def active_report_count(self):
        return self.reports_against.filter(status__in=['pending', 'under_review']).count()

    def clean(self):
        """Validate product limit before saving"""
        if self.customer and not self.customer.can_add_product():
            raise ValidationError(f"Customer cannot add more than {self.customer.product_limit} products")

    def save(self, *args, **kwargs):
        """Override save to handle product count"""
        is_new = self._state.adding
        
        if is_new and self.customer:
            self.customer.increment_product_count()
        
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Override delete to handle product count"""
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

    # Backwards-compatible properties (quantity/price removed, keep properties so older code doesn't break)
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
    value = models.CharField(max_length=100, blank=True, null=True)  # e.g., "5 products", "Higher ranking"
    
    class Meta:
        unique_together = ['boost_plan', 'feature']
    
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
    
    def save(self, *args, **kwargs):
        if not self.end_date and self.boost_plan:
            # Calculate end date based on boost plan duration
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
    # Add the missing attributes
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_vouchers'
    )
    is_active = models.BooleanField(default=True)

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
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'user']

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Unknown Product'}"


class ShippingAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shipping_addresses'
    )
    # Recipient information
    recipient_name = models.CharField(max_length=200)
    recipient_phone = models.CharField(max_length=20)
    
    # Address information
    street = models.CharField(max_length=200)
    barangay = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default='')
    zip_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Philippines')
    
    # Additional details
    building_name = models.CharField(max_length=200, blank=True, default='')
    floor_number = models.CharField(max_length=50, blank=True, default='')
    unit_number = models.CharField(max_length=50, blank=True, default='')
    landmark = models.CharField(max_length=300, blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    
    # Address type and preferences
    address_type = models.CharField(max_length=20, choices=[
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other')
    ], default='home')
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name_plural = "Shipping Addresses"
    
    def __str__(self):
        return f"{self.recipient_name} - {self.street}, {self.barangay}, {self.city}"
    
    def get_full_address(self):
        """Get the complete formatted address"""
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
        """Ensure only one default address per user"""
        if self.is_default:
            # Remove default status from other addresses of this user
            ShippingAddress.objects.filter(
                user=self.user, 
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


# Also update the Order model to use ShippingAddress
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
    # Keep delivery_address as a text field for backup/archival purposes
    delivery_address_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.order} by {self.user.username}"
    
    def save(self, *args, **kwargs):
        # Store the shipping address as text for archival purposes
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

    def __str__(self):
        return f"Review by {self.customer} - {self.rating} stars"

class Delivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    rider = models.ForeignKey(Rider, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=[('pending','Pending'),('picked_up','Picked Up'),('delivered','Delivered')])
    picked_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Delivery {self.id} for Order {self.order.order}"
    
class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=[('success','Success'),('failed','Failed')])
    transaction_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"Payment {self.id} for Order {self.order.order}"

class Refund(models.Model):
    refund = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='refunds_requested')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='refunds_processed')
    reason = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=[('pending','Pending'),('approved','Approved'),('rejected','Rejected'), ('waiting','Waiting'), ('to process','To Process'), ('completed','Completed')])
    requested_at = models.DateTimeField(auto_now_add=True)
    logistic_service = models.CharField(max_length=100, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True)
    preferred_refund_method = models.CharField(max_length=100, null=True, blank=True)
    final_refund_method = models.CharField(max_length=100, null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

class RefundMedias(models.Model):
    refund_media = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund = models.ForeignKey(Refund, on_delete=models.CASCADE)
    file_data = models.FileField(upload_to="refunds/")
    file_type = models.TextField()

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
    
    # Generic foreign key fields - only one will be filled based on report_type
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
    
    def clean(self):
        """Validate that only one report target is set based on report_type"""
        targets = [self.reported_account, self.reported_product, self.reported_shop]
        set_targets = [target for target in targets if target is not None]
        
        if len(set_targets) != 1:
            raise ValidationError("Exactly one report target must be set based on report_type")
        
        # Validate report_type matches the target
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
        """Get the actual reported object"""
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
    
    def __str__(self):
        return f"Comment by {self.user.username} on Report {self.report.id}"
    
# Add this after the User model and before the Customer model


class ProductSKU(models.Model):
    """SKU combination for a product (generated from variants)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='skus'
    )
    # Store option ids and map as JSON for easy reconstruction
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

    # Swap-related per-SKU
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

    def __str__(self):
        return f"SKU for {self.product.name} ({self.sku_code or 'no-code'})"