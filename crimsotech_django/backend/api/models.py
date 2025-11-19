from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
from django.db import models

class User(models.Model):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
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

    def __str__(self):
        return f"User {self.user_id}"

class Customer(models.Model):
    customer_id = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='customer_id')

    def __str__(self):
        return f"{self.customer_id.username}"
        
class Moderator(models.Model):
    moderator_id = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='moderator_id')

    def __str__(self):
        return f"Moderator: {self.moderator_id.username}"

class Rider(models.Model):
    rider_id = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='rider_id')
    vehicle_type = models.CharField(max_length=50, blank=True)  # e.g., Motorcycle, Bicycle
    plate_number = models.CharField(max_length=20, blank=True)
    vehicle_brand = models.CharField(max_length=50, blank=True)
    vehicle_model = models.CharField(max_length=50, blank=True)
    vehicle_image = models.ImageField(upload_to='riders/vehicles/', null=True, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    license_image = models.ImageField(upload_to='riders/licenses/', null=True, blank=True)
    # administrative attributes
    verified = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_riders')
    approval_date = models.DateTimeField(null=True, blank=True)

    

    def __str__(self):
        return f"Rider: {self.rider_id.username}"
    
class Admin(models.Model):
    admin_id = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='admin_id')

    def __str__(self):
        return f"Admin: {self.admin_id.username}"
    
class Logs(models.Model):
    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log {self.log_id} by {self.user.username} at {self.timestamp}"
    
class Notification(models.Model):
    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=500)
    type = models.CharField(max_length=50)
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification {self.notification_id} for {self.user.username}"
    
class OTP(models.Model):
    user_otp_id = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='user_otp_id')
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
        return f"OTP for {self.user_otp_id.username} (Expires at {self.expired_at})"
    
class Shop(models.Model):
    shop_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    shop_picture = models.ImageField(upload_to='shop/picture/', null=True, blank=True)
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='owned_shops'  # ✅ clearer and unique
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
 

class ShopFollow(models.Model): 
    shop_follow_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    followed_at = models.DateTimeField(auto_now_add=True)
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='shop_follows'  # ✅ unique name to avoid clash
    )
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='followers'  # ✅ unique name to avoid clash
    )




class Category(models.Model):
    category_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=50)
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
    )
    user_id = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
    )


class Product(models.Model):
    product_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='added_by'  # ✅ unique name to avoid clashx``
    )
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='added_by'  # ✅ unique name to avoid clashx``
    )
    category_id = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='categorized'  # ✅ unique name to avoid clashx``
    )
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=1000)
    quantity = models.IntegerField(default=0)
    used_for = models.CharField(max_length=1000)
    price = models.DecimalField(decimal_places=2, max_digits=9)
    status = models.TextField()
    condition = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # queries:
    # ano yang product_type

class Favorites(models.Model):
    favorite_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    
    

class ProductMedia(models.Model):
    pm_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    file_data = models.FileField(upload_to="product/")
    file_type = models.TextField()
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
    )

class Variants(models.Model):
    variant_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100)

class VariantOptions(models.Model):
    variant_option_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    variant_id = models.ForeignKey(
        Variants,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100)
    quantity = models.IntegerField()
    price = models.DecimalField(decimal_places=2, max_digits=9)

class Issues(models.Model):
    issue_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    description = models.CharField(max_length=300)

class BoostPlan(models.Model):
    boost_plan_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
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

class Boost(models.Model):
    boost_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    boost_plan_id = models.ForeignKey(
        BoostPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    customer_id = models.ForeignKey(
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
    created_at = models.DateTimeField(default=timezone.now)  # Changed from auto_now_add=True
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.end_date and self.boost_plan_id:
            # Calculate end date based on boost plan duration
            duration_map = {
                'hours': timedelta(hours=self.boost_plan_id.duration),
                'days': timedelta(days=self.boost_plan_id.duration),
                'weeks': timedelta(weeks=self.boost_plan_id.duration),
                ('months', 'Months'): timedelta(days=self.boost_plan_id.duration * 30)
            }
            self.end_date = self.start_date + duration_map.get(self.boost_plan_id.time_unit, timedelta(days=7))
        super().save(*args, **kwargs)


class Voucher(models.Model):
    voucher_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20)
    discount_type = models.TextField()
    value = models.DecimalField(decimal_places=2, max_digits=9)
    valid_until = models.DateField()
    added_at = models.DateField(auto_now_add=True)
    
class RefundPolicy(models.Model):
    policy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    # balance = models.DecimalField(decimal_places=2, max_digits=9)
    main_title = models.CharField(max_length=100)
    section_title = models.CharField(max_length=100)
    content = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CustomerActivity(models.Model):
    ca_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    activity_type = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class AiRecommendation(models.Model):
    ar_id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class CartItem(models.Model):
    cartitem_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    product_id = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    user_id = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

class Checkout(models.Model):
    checkout_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)    
    voucher_id = models.ForeignKey(
        Voucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    cartitem_id = models.ForeignKey(
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


class Review(models.Model):
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    customer_id = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='reviews'  # ✅ unique name to avoid clash
    )
    shop_id = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True,  # ✅ required for SET_NULL
        blank=True,
        related_name='reviews'  # ✅ unique name to avoid clash
    )
    product_id = models.ForeignKey(
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