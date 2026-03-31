# backend/api/management/commands/assign_deliveries.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import random
from api.models import Order, Delivery, Rider, Notification

class Command(BaseCommand):
    help = 'Automatically assign riders to pending delivery orders'

    def handle(self, *args, **options):
        self.stdout.write(f"[{timezone.now()}] Starting delivery assignment...")
        
        # Get all orders that need delivery assignment
        # Orders with status 'ready_to_ship' (seller marked as ready) or 'waiting_for_rider' (arrange shipment clicked)
        # and no active delivery
        pending_orders = Order.objects.filter(
            Q(status='ready_to_ship') | Q(status='waiting_for_rider'),
            delivery_method__icontains='delivery'  # Not pickup orders
        ).exclude(
            delivery__status__in=['accepted', 'picked_up', 'delivered', 'in_progress']  # Exclude orders with active deliveries
        ).distinct()
        
        self.stdout.write(f"Found {pending_orders.count()} orders pending delivery assignment")
        
        # Get all active and available riders
        available_riders = Rider.objects.filter(
            verified=True,
            availability_status='available',
            is_accepting_deliveries=True
        ).select_related('rider')
        
        if not available_riders.exists():
            self.stdout.write(self.style.WARNING("No available riders found"))
            return
        
        for order in pending_orders:
            self.assign_rider_to_order(order, available_riders)
    
    def assign_rider_to_order(self, order, available_riders):
        """Assign a random rider to the order"""
        
        # Check if there's already a pending delivery for this order
        existing_delivery = Delivery.objects.filter(
            order=order, status__in=['pending', 'pending_offer', 'accepted', 'picked_up', 'in_progress']
        ).first()
        
        if existing_delivery:
            # Check if the existing delivery has expired (no response for 10 minutes)
            time_since_creation = timezone.now() - existing_delivery.created_at
            if time_since_creation < timedelta(minutes=10):
                self.stdout.write(f"Order {order.order} already has pending delivery (waiting for response)")
                return
            else:
                # Mark the existing delivery as expired
                existing_delivery.status = 'expired'
                existing_delivery.save()
                self.stdout.write(f"Previous delivery for order {order.order} expired")
        
        # Get riders who haven't rejected this order
        eligible_riders = []
        for rider in available_riders:
            # Check if this rider has rejected this order before
            rejected_before = Delivery.objects.filter(
                order=order,
                rider=rider,
                status='rejected'
            ).exists()
            
            if not rejected_before:
                eligible_riders.append(rider)
        
        if not eligible_riders:
            self.stdout.write(self.style.WARNING(f"No eligible riders for order {order.order}"))
            return
        
        # Randomly select a rider
        selected_rider = random.choice(eligible_riders)
        
        # Create delivery record
        delivery = Delivery.objects.create(
            order=order,
            rider=selected_rider,
            status='pending_offer',
            created_at=timezone.now(),
            delivery_fee=50,
            distance_km=5.0,
            estimated_minutes=30
        )
        
        # Create notification for the rider
        Notification.objects.create(
            user=selected_rider.rider,
            title='New Delivery Assignment',
            type='delivery',
            message=f'You have been assigned to deliver order #{str(order.order)[:8]}. Please respond within 10 minutes.',
            is_read=False
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Assigned rider {selected_rider.rider.username} to order {order.order}"
            )
        )