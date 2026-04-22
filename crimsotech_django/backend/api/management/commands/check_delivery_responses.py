# backend/api/management/commands/check_delivery_responses.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import requests
import math
from decimal import Decimal
from api.models import Delivery, Order, Notification, Rider
from django.conf import settings

class Command(BaseCommand):
    help = 'Check for expired delivery offers and reassign to nearest available rider'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed logs',
        )

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)
        
        self.stdout.write("=" * 80)
        self.stdout.write(f"[{timezone.now()}] 🔍 Checking delivery responses...")
        self.stdout.write("=" * 80)
        
        # Find deliveries that are pending and older than 10 minutes
        expired_deliveries = Delivery.objects.filter(
            status='pending_offer',
            created_at__lte=timezone.now() - timedelta(minutes=10)
        )
        
        self.stdout.write(f"📊 Found {expired_deliveries.count()} expired deliveries")
        
        for delivery in expired_deliveries:
            self.stdout.write(f"\n⏰ Processing expired delivery: {delivery.id}")
            self.stdout.write(f"   Order: {delivery.order.order}")
            self.stdout.write(f"   Rider: {delivery.rider.rider.username if delivery.rider else 'None'}")
            self.stdout.write(f"   Created: {delivery.created_at}")
            
            # Mark as expired
            delivery.status = 'expired'
            delivery.save()
            
            # Notify the rider
            if delivery.rider:
                Notification.objects.create(
                    user=delivery.rider.rider,
                    title='Delivery Offer Expired',
                    type='delivery',
                    message=f'Your delivery offer for order #{str(delivery.order.order)[:8]} has expired. '
                            f'The order has been reassigned to another rider.',
                    is_read=False
                )
                self.stdout.write(f"   📧 Notified rider {delivery.rider.rider.username}")
            
            self.stdout.write(f"   ❌ Delivery expired - will reassign")
            
            # Reassign to nearest available rider
            self.reassign_nearest_rider(delivery.order, exclude_rider_id=delivery.rider.id if delivery.rider else None, verbose=verbose)
        
        # Find deliveries that were rejected
        rejected_deliveries = Delivery.objects.filter(
            status='rejected',
            updated_at__gte=timezone.now() - timedelta(minutes=1)
        )
        
        self.stdout.write(f"\n📊 Found {rejected_deliveries.count()} rejected deliveries")
        
        for delivery in rejected_deliveries:
            self.stdout.write(f"\n❌ Rejected delivery: {delivery.id}")
            self.stdout.write(f"   Order: {delivery.order.order}")
            self.stdout.write(f"   Rider: {delivery.rider.rider.username if delivery.rider else 'Unknown'}")
            self.stdout.write(f"   Rejected at: {delivery.updated_at}")
            
            # Reassign to nearest available rider
            self.reassign_nearest_rider(delivery.order, exclude_rider_id=delivery.rider.id if delivery.rider else None, verbose=verbose)
        
        # Find deliveries that were accepted but not picked up within 30 minutes
        accepted_not_picked = Delivery.objects.filter(
            status='accepted',
            updated_at__lte=timezone.now() - timedelta(minutes=30)
        )
        
        self.stdout.write(f"\n📊 Found {accepted_not_picked.count()} accepted but not picked up deliveries")
        
        for delivery in accepted_not_picked:
            self.stdout.write(f"\n⚠️ No-show delivery: {delivery.id}")
            self.stdout.write(f"   Order: {delivery.order.order}")
            self.stdout.write(f"   Rider: {delivery.rider.rider.username if delivery.rider else 'None'}")
            self.stdout.write(f"   Accepted at: {delivery.updated_at}")
            
            delivery.status = 'expired'
            delivery.save()
            
            Notification.objects.create(
                user=delivery.rider.rider,
                title='Delivery Cancelled - No Show',
                type='delivery',
                message=f'Your accepted delivery for order #{str(delivery.order.order)[:8]} has been cancelled '
                        f'because you did not pick it up within 30 minutes.',
                is_read=False
            )
            
            self.stdout.write(f"   📧 Notified rider {delivery.rider.rider.username}")
            self.stdout.write(f"   ❌ Delivery cancelled - will reassign")
            
            # Reassign to another rider
            self.reassign_nearest_rider(delivery.order, exclude_rider_id=delivery.rider.id if delivery.rider else None, verbose=verbose)
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("✅ Delivery response check completed")
        self.stdout.write("=" * 80)
    
    def reassign_nearest_rider(self, order, exclude_rider_id=None, verbose=False):
        """Reassign the nearest available rider to an order with comparison logs"""
        
        self.stdout.write(f"\n🔄 REASSIGNING order {order.order} to nearest available rider...")
        
        # Get pickup location
        checkout_item = order.checkout_set.first()
        if not checkout_item:
            self.stdout.write(self.style.WARNING(f"   ❌ Cannot find order items for reassignment"))
            return False
        
        # Get shop coordinates
        pickup_lat = None
        pickup_lng = None
        pickup_name = None
        
        if checkout_item.direct_shop_id:
            try:
                from api.models import Shop
                shop = Shop.objects.get(id=checkout_item.direct_shop_id)
                if shop.latitude and shop.longitude:
                    pickup_lat = float(shop.latitude)
                    pickup_lng = float(shop.longitude)
                    pickup_name = shop.name
            except:
                pass
        elif checkout_item.cart_item and checkout_item.cart_item.product:
            product = checkout_item.cart_item.product
            if product.shop and product.shop.latitude and product.shop.longitude:
                pickup_lat = float(product.shop.latitude)
                pickup_lng = float(product.shop.longitude)
                pickup_name = product.shop.name
        
        if not pickup_lat or not pickup_lng:
            self.stdout.write(self.style.WARNING(f"   ❌ Cannot get pickup location for reassignment"))
            return False
        
        # Get destination
        dest_lat = None
        dest_lng = None
        if order.shipping_address and order.shipping_address.latitude and order.shipping_address.longitude:
            dest_lat = float(order.shipping_address.latitude)
            dest_lng = float(order.shipping_address.longitude)
        elif order.user.latitude and order.user.longitude:
            dest_lat = float(order.user.latitude)
            dest_lng = float(order.user.longitude)
        
        if not dest_lat or not dest_lng:
            self.stdout.write(self.style.WARNING(f"   ❌ Cannot get destination for reassignment"))
            return False
        
        # Get available riders
        available_riders = Rider.objects.filter(
            verified=True,
            availability_status='available',
            is_accepting_deliveries=True
        ).exclude(rider__id=exclude_rider_id).select_related('rider')
        
        if not available_riders.exists():
            self.stdout.write(self.style.WARNING(f"   ❌ No available riders for reassignment"))
            return False
        
        self.stdout.write(f"   👥 Available riders for reassignment: {available_riders.count()}")
        
        # Calculate distances for each rider
        rider_distances = []
        for rider in available_riders:
            if not (rider.rider.latitude and rider.rider.longitude):
                continue
            
            rider_lat = float(rider.rider.latitude)
            rider_lng = float(rider.rider.longitude)
            
            # Check if this rider has rejected this order
            rejected_before = Delivery.objects.filter(
                order=order,
                rider=rider,
                status='rejected'
            ).exists()
            
            if rejected_before:
                continue
            
            # Calculate distances
            distance_to_pickup = self._get_driving_distance(rider_lat, rider_lng, pickup_lat, pickup_lng)
            distance_pickup_to_dest = self._get_driving_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
            total_distance = distance_to_pickup + distance_pickup_to_dest
            
            rider_distances.append({
                'rider': rider,
                'total_distance': total_distance,
                'distance_to_pickup': distance_to_pickup,
                'distance_pickup_to_dest': distance_pickup_to_dest,
                'rider_lat': rider_lat,
                'rider_lng': rider_lng
            })
        
        if not rider_distances:
            self.stdout.write(self.style.WARNING(f"   ❌ No eligible riders for reassignment"))
            return False
        
        # Sort by distance and select nearest
        rider_distances.sort(key=lambda x: x['total_distance'])
        
        # Show ranking
        self.stdout.write(f"   🏆 Reassignment ranking:")
        for idx, rd in enumerate(rider_distances[:5], 1):
            self.stdout.write(f"      {idx}. {rd['rider'].rider.username} - {rd['total_distance']:.2f} km")
        
        nearest = rider_distances[0]
        selected_rider = nearest['rider']
        total_distance = nearest['total_distance']
        
        delivery_fee = self._calculate_delivery_fee(total_distance)
        estimated_minutes = self._calculate_estimated_time(total_distance)
        
        self.stdout.write(self.style.SUCCESS(
            f"   ✅ Selected: {selected_rider.rider.username} ({total_distance:.2f} km)"
        ))
        
        # Create new delivery
        delivery = Delivery.objects.create(
            order=order,
            rider=selected_rider,
            status='pending_offer',
            created_at=timezone.now(),
            distance_km=Decimal(str(total_distance)),
            estimated_minutes=estimated_minutes,
            delivery_fee=Decimal(str(delivery_fee)),
            metadata={
                'distance_to_pickup': nearest['distance_to_pickup'],
                'distance_pickup_to_dest': nearest['distance_pickup_to_dest'],
                'rider_location_at_assignment': {
                    'lat': nearest['rider_lat'],
                    'lng': nearest['rider_lng']
                },
                'reassignment': True
            }
        )
        
        # Notify the new rider
        Notification.objects.create(
            user=selected_rider.rider,
            title='New Delivery Assignment (Reassigned)',
            type='delivery',
            message=f'You have been assigned to deliver order #{str(order.order)[:8]}. '
                    f'Distance: {total_distance:.1f}km, Fee: ₱{delivery_fee:.2f}. '
                    f'Please respond within 10 minutes.',
            is_read=False
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ Reassigned to {selected_rider.rider.username}"))
        return True
    
    def _get_driving_distance(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """Calculate driving distance using Google Maps API"""
        GOOGLE_MAPS_API_KEY = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        
        if not GOOGLE_MAPS_API_KEY:
            return self._haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        
        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                'origins': f"{origin_lat},{origin_lng}",
                'destinations': f"{dest_lat},{dest_lng}",
                'key': GOOGLE_MAPS_API_KEY,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data.get('status') == 'OK':
                rows = data.get('rows', [])
                if rows:
                    elements = rows[0].get('elements', [])
                    if elements and elements[0].get('status') == 'OK':
                        distance_meters = elements[0].get('distance', {}).get('value', 0)
                        if distance_meters > 0:
                            return distance_meters / 1000
            
            return self._haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        except Exception:
            return self._haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    
    def _haversine_distance(self, lat1, lng1, lat2, lng2):
        """Calculate straight-line distance using Haversine formula"""
        R = 6371
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _calculate_delivery_fee(self, distance_km):
        """Calculate delivery fee based on distance"""
        if distance_km <= 0:
            return 40.00
        fee = distance_km * 40.00
        return min(fee, 300.00)
    
    def _calculate_estimated_time(self, distance_km):
        """Calculate estimated delivery time in minutes"""
        if distance_km <= 0:
            return 15
        time_minutes = distance_km / 0.5
        return max(15, int(time_minutes))