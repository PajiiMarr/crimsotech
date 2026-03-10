
# backend/api/management/commands/check_delivery_responses.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from api.models import Delivery, Order, Notification

class Command(BaseCommand):
    help = 'Check for expired delivery offers and reassign'

    def handle(self, *args, **options):
        self.stdout.write(f"[{timezone.now()}] Checking delivery responses...")
        
        # Find deliveries that are pending and older than 10 minutes
        expired_deliveries = Delivery.objects.filter(
            status='pending_offer',
            created_at__lte=timezone.now() - timedelta(minutes=10)
        )
        
        self.stdout.write(f"Found {expired_deliveries.count()} expired deliveries")
        
        for delivery in expired_deliveries:
            # Mark as expired
            delivery.status = 'expired'
            delivery.save()
            
            # Notify the rider
            if delivery.rider:
                Notification.objects.create(
                    user=delivery.rider.rider,
                    title='Delivery Offer Expired',
                    type='delivery',
                    message=f'Your delivery offer for order #{str(delivery.order.order)[:8]} has expired.',
                    is_read=False
                )
            
            self.stdout.write(f"Delivery {delivery.id} for order {delivery.order.order} expired")
        
        # Find deliveries that were rejected
        rejected_deliveries = Delivery.objects.filter(
            status='rejected',
            updated_at__gte=timezone.now() - timedelta(minutes=1)  # Recently rejected
        )
        
        for delivery in rejected_deliveries:
            self.stdout.write(f"Delivery {delivery.id} for order {delivery.order.order} was rejected")
            # The next cron run will reassign a new rider


