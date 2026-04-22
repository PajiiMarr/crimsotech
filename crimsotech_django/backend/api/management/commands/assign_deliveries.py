# backend/api/management/commands/assign_deliveries.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import requests
import math
from decimal import Decimal
from api.models import Order, Delivery, Rider, Notification, Shop, User
from django.conf import settings

class Command(BaseCommand):
    help = 'Automatically assign nearest rider to pending delivery orders using Google Maps API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--order-id',
            type=str,
            help='Specific order ID to assign (optional)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed logs',
        )

    def handle(self, *args, **options):
        order_id_filter = options.get('order-id')
        verbose = options.get('verbose', False)
        
        self.stdout.write("=" * 80)
        self.stdout.write(f"[{timezone.now()}] 🚚 Starting delivery assignment...")
        self.stdout.write("=" * 80)
        
        # Get all orders that need delivery assignment
        pending_orders = Order.objects.filter(
            Q(status='ready_to_ship') | Q(status='waiting_for_rider'),
            delivery_method__icontains='delivery'
        ).exclude(
            delivery__status__in=['accepted', 'picked_up', 'delivered', 'in_progress']
        ).distinct()
        
        if order_id_filter:
            pending_orders = pending_orders.filter(order=order_id_filter)
            self.stdout.write(f"🎯 Filtered to specific order: {order_id_filter}")
        
        self.stdout.write(f"📊 Found {pending_orders.count()} orders pending delivery assignment")
        
        # Get all active and available riders
        available_riders = Rider.objects.filter(
            verified=True,
            availability_status='available',
            is_accepting_deliveries=True
        ).select_related('rider')
        
        self.stdout.write(f"👥 Total available riders: {available_riders.count()}")
        
        if not available_riders.exists():
            self.stdout.write(self.style.WARNING("⚠️ No available riders found"))
            return
        
        # Show all available riders
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("📋 LIST OF AVAILABLE RIDERS:")
        self.stdout.write("=" * 80)
        for idx, rider in enumerate(available_riders, 1):
            has_coords = "✅" if (rider.rider.latitude and rider.rider.longitude) else "❌"
            self.stdout.write(f"  {idx}. {has_coords} {rider.rider.username} - {rider.rider.first_name} {rider.rider.last_name}")
            self.stdout.write(f"     📍 Location: ({rider.rider.latitude or 'N/A'}, {rider.rider.longitude or 'N/A'})")
            self.stdout.write(f"     🚗 Vehicle: {rider.vehicle_type or 'N/A'} | Plate: {rider.plate_number or 'N/A'}")
        self.stdout.write("=" * 80 + "\n")
        
        for order in pending_orders:
            self.assign_nearest_rider_to_order(order, available_riders, verbose)
    
    def get_coordinates_from_address(self, address):
        """Get coordinates from address using Google Maps Geocoding API"""
        if not address:
            return None, None
        
        GOOGLE_MAPS_API_KEY = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        if not GOOGLE_MAPS_API_KEY:
            self.stdout.write(self.style.WARNING("⚠️ Google Maps API key not configured"))
            return None, None
        
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                'address': address,
                'key': GOOGLE_MAPS_API_KEY,
                'components': 'country:PH'
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('status') == 'OK' and data.get('results'):
                location = data['results'][0]['geometry']['location']
                return location['lat'], location['lng']
            else:
                self.stdout.write(f"⚠️ Geocoding failed for address: {address} - {data.get('status')}")
                return None, None
                
        except Exception as e:
            self.stdout.write(f"❌ Geocoding error: {str(e)}")
            return None, None
    
    def get_driving_distance(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """Calculate actual driving distance using Google Maps Distance Matrix API"""
        GOOGLE_MAPS_API_KEY = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        
        if not GOOGLE_MAPS_API_KEY:
            return self.haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        
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
            
            return self.haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
            
        except Exception as e:
            self.stdout.write(f"❌ Distance calculation error: {str(e)}")
            return self.haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    
    def haversine_distance(self, lat1, lng1, lat2, lng2):
        """Calculate straight-line distance using Haversine formula (fallback)"""
        R = 6371
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def get_order_pickup_location(self, order):
        """Get the pickup location (shop or seller address) for the order"""
        checkout_item = order.checkout_set.first()
        if not checkout_item:
            return None, None, None
        
        if checkout_item.direct_shop_id:
            try:
                shop = Shop.objects.get(id=checkout_item.direct_shop_id)
                if shop.latitude and shop.longitude:
                    return float(shop.latitude), float(shop.longitude), shop.name
                
                address = f"{shop.street}, {shop.barangay}, {shop.city}, {shop.province}, Philippines"
                lat, lng = self.get_coordinates_from_address(address)
                if lat and lng:
                    shop.latitude = Decimal(str(lat))
                    shop.longitude = Decimal(str(lng))
                    shop.save()
                    return lat, lng, shop.name
            except Shop.DoesNotExist:
                pass
        
        elif checkout_item.cart_item and checkout_item.cart_item.product:
            product = checkout_item.cart_item.product
            if product.shop:
                shop = product.shop
                if shop.latitude and shop.longitude:
                    return float(shop.latitude), float(shop.longitude), shop.name
                
                address = f"{shop.street}, {shop.barangay}, {shop.city}, {shop.province}, Philippines"
                lat, lng = self.get_coordinates_from_address(address)
                if lat and lng:
                    shop.latitude = Decimal(str(lat))
                    shop.longitude = Decimal(str(lng))
                    shop.save()
                    return lat, lng, shop.name
            elif product.customer:
                seller = product.customer.customer
                if seller.latitude and seller.longitude:
                    return float(seller.latitude), float(seller.longitude), f"{seller.first_name} {seller.last_name}"
                
                address = f"{seller.street}, {seller.barangay}, {seller.city}, {seller.province}, Philippines"
                lat, lng = self.get_coordinates_from_address(address)
                if lat and lng:
                    seller.latitude = Decimal(str(lat))
                    seller.longitude = Decimal(str(lng))
                    seller.save()
                    return lat, lng, f"{seller.first_name} {seller.last_name}"
        
        return None, None, None
    
    def get_rider_location(self, rider):
        """Get rider's current location"""
        if rider.rider.latitude and rider.rider.longitude:
            return float(rider.rider.latitude), float(rider.rider.longitude)
        return None, None
    
    def get_customer_destination(self, order):
        """Get customer destination coordinates from shipping address or user profile"""
        if order.shipping_address and order.shipping_address.latitude and order.shipping_address.longitude:
            return float(order.shipping_address.latitude), float(order.shipping_address.longitude)
        
        if order.user.latitude and order.user.longitude:
            return float(order.user.latitude), float(order.user.longitude)
        
        if order.shipping_address and order.shipping_address.get_full_address():
            address = order.shipping_address.get_full_address()
            lat, lng = self.get_coordinates_from_address(f"{address}, Philippines")
            if lat and lng:
                order.shipping_address.latitude = Decimal(str(lat))
                order.shipping_address.longitude = Decimal(str(lng))
                order.shipping_address.save()
                return lat, lng
        
        return None, None
    
    def calculate_delivery_fee(self, distance_km):
        """Calculate delivery fee based on distance (₱40/km, capped at ₱300)"""
        if distance_km <= 0:
            return 40.00
        fee = distance_km * 40.00
        return min(fee, 300.00)
    
    def calculate_estimated_time(self, distance_km):
        """Calculate estimated delivery time in minutes"""
        if distance_km <= 0:
            return 15
        time_minutes = distance_km / 0.5
        return max(15, int(time_minutes))
    
    def assign_nearest_rider_to_order(self, order, available_riders, verbose=False):
        """Assign the nearest rider to the order with detailed comparison logs"""
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(f"📦 PROCESSING ORDER: {order.order}")
        self.stdout.write(f"   Status: {order.status} | Delivery Method: {order.delivery_method}")
        self.stdout.write("=" * 80)
        
        # Check existing delivery
        existing_delivery = Delivery.objects.filter(
            order=order, status__in=['pending', 'pending_offer', 'accepted', 'picked_up', 'in_progress']
        ).first()
        
        if existing_delivery:
            time_since_creation = timezone.now() - existing_delivery.created_at
            if time_since_creation < timedelta(minutes=10):
                self.stdout.write(f"⏳ Order {order.order} already has pending delivery (waiting for response)")
                return
            else:
                existing_delivery.status = 'expired'
                existing_delivery.save()
                self.stdout.write(f"⌛ Previous delivery for order {order.order} expired")
        
        # Get pickup location
        pickup_lat, pickup_lng, pickup_name = self.get_order_pickup_location(order)
        if not pickup_lat or not pickup_lng:
            self.stdout.write(self.style.WARNING(f"❌ Cannot get pickup location for order {order.order}"))
            return
        
        self.stdout.write(f"\n📍 PICKUP LOCATION:")
        self.stdout.write(f"   Name: {pickup_name}")
        self.stdout.write(f"   Coordinates: ({pickup_lat}, {pickup_lng})")
        
        # Get delivery destination
        dest_lat, dest_lng = self.get_customer_destination(order)
        if not dest_lat or not dest_lng:
            self.stdout.write(self.style.WARNING(f"❌ Cannot get destination for order {order.order}"))
            return
        
        self.stdout.write(f"\n📍 DESTINATION LOCATION:")
        self.stdout.write(f"   Coordinates: ({dest_lat}, {dest_lng})")
        
        # Calculate distances for each rider
        rider_distances = []
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("📊 COMPARING RIDER DISTANCES:")
        self.stdout.write("=" * 80)
        
        for rider in available_riders:
            # Get rider location
            rider_lat, rider_lng = self.get_rider_location(rider)
            if not rider_lat or not rider_lng:
                self.stdout.write(f"\n⚠️ Rider {rider.rider.username} has NO location data - SKIPPING")
                continue
            
            # Check if this rider has rejected this order before
            rejected_before = Delivery.objects.filter(
                order=order,
                rider=rider,
                status='rejected'
            ).exists()
            
            if rejected_before:
                self.stdout.write(f"\n⚠️ Rider {rider.rider.username} previously rejected this order - SKIPPING")
                continue
            
            # Calculate distances
            distance_to_pickup = self.get_driving_distance(rider_lat, rider_lng, pickup_lat, pickup_lng)
            distance_pickup_to_dest = self.get_driving_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
            total_distance = distance_to_pickup + distance_pickup_to_dest
            
            rider_distances.append({
                'rider': rider,
                'distance_to_pickup': distance_to_pickup,
                'distance_pickup_to_dest': distance_pickup_to_dest,
                'total_distance': total_distance,
                'rider_lat': rider_lat,
                'rider_lng': rider_lng
            })
            
            # Show comparison
            self.stdout.write(f"\n🏍️ Rider: {rider.rider.username}")
            self.stdout.write(f"   📍 Rider Location: ({rider_lat}, {rider_lng})")
            self.stdout.write(f"   🚗 To Pickup: {distance_to_pickup:.2f} km")
            self.stdout.write(f"   📦 Pickup to Destination: {distance_pickup_to_dest:.2f} km")
            self.stdout.write(f"   📊 TOTAL DISTANCE: {total_distance:.2f} km")
        
        if not rider_distances:
            self.stdout.write(self.style.WARNING(f"\n❌ No eligible riders with location for order {order.order}"))
            return
        
        # Sort by total distance (nearest first)
        rider_distances.sort(key=lambda x: x['total_distance'])
        
        # Display ranking
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("🏆 RIDER RANKING (Nearest to Farthest):")
        self.stdout.write("=" * 80)
        for idx, rd in enumerate(rider_distances, 1):
            medal = "🥇" if idx == 1 else "🥈" if idx == 2 else "🥉" if idx == 3 else f"{idx}."
            self.stdout.write(f"{medal} {rd['rider'].rider.username} - {rd['total_distance']:.2f} km total")
        
        # Select the nearest rider
        nearest = rider_distances[0]
        selected_rider = nearest['rider']
        total_distance = nearest['total_distance']
        distance_to_pickup = nearest['distance_to_pickup']
        distance_pickup_to_dest = nearest['distance_pickup_to_dest']
        
        # Calculate delivery fee and ETA
        delivery_fee = self.calculate_delivery_fee(total_distance)
        estimated_minutes = self.calculate_estimated_time(total_distance)
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("🎉 SELECTED NEAREST RIDER:"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"   ✅ Rider: {selected_rider.rider.username}")
        self.stdout.write(f"   📍 Name: {selected_rider.rider.first_name} {selected_rider.rider.last_name}")
        self.stdout.write(f"   🚗 Vehicle: {selected_rider.vehicle_type or 'N/A'}")
        self.stdout.write(f"   📊 Total Distance: {total_distance:.2f} km")
        self.stdout.write(f"   💰 Delivery Fee: ₱{delivery_fee:.2f}")
        self.stdout.write(f"   ⏱️ Estimated Time: {estimated_minutes} minutes")
        self.stdout.write("=" * 80)
        
        # Create delivery record
        delivery = Delivery.objects.create(
            order=order,
            rider=selected_rider,
            status='pending_offer',
            created_at=timezone.now(),
            distance_km=Decimal(str(total_distance)),
            estimated_minutes=estimated_minutes,
            delivery_fee=Decimal(str(delivery_fee))
        )
        
        # Store metadata
        delivery.metadata = {
            'distance_to_pickup': distance_to_pickup,
            'distance_pickup_to_dest': distance_pickup_to_dest,
            'rider_location_at_assignment': {
                'lat': nearest['rider_lat'],
                'lng': nearest['rider_lng']
            },
            'pickup_location': {
                'lat': pickup_lat,
                'lng': pickup_lng,
                'name': pickup_name
            },
            'destination_location': {
                'lat': dest_lat,
                'lng': dest_lng
            },
            'all_riders_considered': [
                {
                    'username': rd['rider'].rider.username,
                    'total_distance': rd['total_distance']
                }
                for rd in rider_distances[:10]
            ]
        }
        delivery.save()
        
        # Create notification for the rider
        Notification.objects.create(
            user=selected_rider.rider,
            title='New Delivery Assignment',
            type='delivery',
            message=f'You have been assigned to deliver order #{str(order.order)[:8]}. '
                    f'Distance: {total_distance:.1f}km, Fee: ₱{delivery_fee:.2f}. '
                    f'Please respond within 10 minutes.',
            is_read=False
        )
        
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ SUCCESS: Assigned nearest rider {selected_rider.rider.username} to order {order.order}\n"
        ))