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
        return f"OTP for {self.user.username} (Expires at {self.expired_at})"