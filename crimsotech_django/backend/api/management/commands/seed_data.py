from django.apps import apps
from django.db.models import Count, Q, Sum
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import *
from django.contrib.auth.hashers import make_password
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
import random

class Command(BaseCommand):
    help = "Seed the database with comprehensive shop and product data"

    def handle(self, *args, **kwargs):
        """Only seed if database is empty"""
        
        # Check if data already exists
        if Shop.objects.exists():
            self.stdout.write(self.style.WARNING("⚠️  Data already exists, skipping seed..."))
            return
        
        self.stdout.write("🌱 Starting comprehensive shop data seeding...")
        
        try:
            with transaction.atomic():
                # Create admin user first
                admin_user = self.create_admin_user()
                
                # Create customers and shops matching frontend data
                customers, shops = self.create_customers_and_shops()
                
                # Create categories
                categories = self.create_categories(shops, admin_user)
                
                # # Create products matching frontend data
                # products = self.create_products(customers, shops, categories, admin_user)
                # self.create_engagement_data()
                
                # # Create boosts and boost plans
                # self.create_boosts_and_plans(products, shops, customers, admin_user)
                
                # # Create shop follows (followers)
                # self.create_shop_follows(shops, customers)
                
                # # Create reviews for shops and products
                # self.create_reviews(products, shops, customers)
                
                # # Create additional data
                # self.create_additional_data(products, customers, shops)
                
                # # Create customer activities
                # self.create_customer_activities(products, customers)
                
                # # Create comprehensive boost analytics data
                # # self.create_boost_analytics_data(products, shops, customers, admin_user)
                # # Create order data
                # self.create_order_data(products, customers, shops, admin_user)
                # # Create checkout data
                # self.create_checkout_data(products, customers, shops, admin_user)
                
                # # Create checkout analytics data
                # self.create_order_analytics_data()
                # # Create rider data
                self.create_rider_data(customers, shops, admin_user)
                
                # # CREATE REFUND DATA
                # # self.create_refund_data(products, customers, shops, admin_user)
                
                # # CREATE REFUND ANALYTICS DATA
                # # self.create_refund_analytics_data()
                
                # # CREATE REPORT DATA - ADD ALL REPORT FUNCTIONS HERE
                # self.create_report_data(products, customers, shops, admin_user)
                
                self.stdout.write(self.style.SUCCESS("✅ Comprehensive shop data seeded successfully!"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error seeding data: {str(e)}"))
            raise


    def create_admin_user(self):
        """Create admin user if not exists"""
        user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "password": make_password("crimsotech_admin"),
                "email": "admin@crimsotech.com",
                "first_name": "System",
                "last_name": "Admin",
                "is_admin": True,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS("✅ Admin user created successfully!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin user already exists."))

        admin, admin_created = Admin.objects.get_or_create(
            admin=user,
        )

        if admin_created:
            self.stdout.write(self.style.SUCCESS(f"✅ Admin record created for user_id={user.id}!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin record already exists."))
        
        return user

    def create_customers_and_shops(self):
        """Create customers and shops with real customer references"""
        print("Creating customers and shops...")
        customers = []
        shops = []
        
        # Customer data matching frontend shops
        customer_data = [
            {
                'username': 'tech_haven_owner',
                'email': 'john@techhaven.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'shop_name': 'Tech Haven',
                'location': 'Manila',
                'verified': True,
                'joined_date': '2023-01-15'
            },
            {
                'username': 'gadget_world_owner',
                'email': 'jane@gadgetworld.com',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'shop_name': 'Gadget World',
                'location': 'Quezon City',
                'verified': True,
                'joined_date': '2023-03-22'
            },
            {
                'username': 'keyclack_owner',
                'email': 'mike@keyclack.com',
                'first_name': 'Mike',
                'last_name': 'Johnson',
                'shop_name': 'KeyClack',
                'location': 'Cebu',
                'verified': True,
                'joined_date': '2022-11-08'
            },
            {
                'username': 'display_masters_owner',
                'email': 'sarah@displaymasters.com',
                'first_name': 'Sarah',
                'last_name': 'Lee',
                'shop_name': 'Display Masters',
                'location': 'Manila',
                'verified': False,
                'joined_date': '2023-06-12'
            },
            {
                'username': 'connect_tech_owner',
                'email': 'david@connecttech.com',
                'first_name': 'David',
                'last_name': 'Wong',
                'shop_name': 'Connect Tech',
                'location': 'Davao',
                'verified': True,
                'joined_date': '2023-08-05'
            },
            {
                'username': 'fashion_hub_owner',
                'email': 'maria@fashionhub.com',
                'first_name': 'Maria',
                'last_name': 'Garcia',
                'shop_name': 'Fashion Hub',
                'location': 'Manila',
                'verified': True,
                'joined_date': '2023-02-20'
            },
        ]
        
        for data in customer_data:
            # Create or get user
            user, user_created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'password': make_password('password123'),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'is_customer': True,
                }
            )
            
            # Create or get customer - this ensures we have a real Customer object
            customer, cust_created = Customer.objects.get_or_create(
                customer=user
            )
            
            if cust_created or user_created:
                customers.append(customer)
                self.stdout.write(self.style.SUCCESS(f"✅ Created customer: {data['first_name']} {data['last_name']}"))
            
            # Check if shop already exists for this customer
            existing_shop = Shop.objects.filter(customer=customer, name=data['shop_name']).first()
            
            if not existing_shop:
                # Create shop with the real customer reference
                shop = Shop.objects.create(
                    customer=customer,  # This is the real Customer object
                    name=data['shop_name'],
                    description=f"Official {data['shop_name']} store - {data['location']}",
                    province="Metro Manila",
                    city=data['location'],
                    barangay="Barangay Test",
                    street="Test Street",
                    contact_number="+639123456789",
                    verified=data['verified']
                )
                
                # Set custom created_at to match frontend joinedDate
                if data['joined_date']:
                    shop.created_at = datetime.strptime(data['joined_date'], '%Y-%m-%d')
                    shop.save()
                
                shops.append(shop)
                self.stdout.write(self.style.SUCCESS(f"✅ Created shop: {data['shop_name']} for customer {user.first_name}"))
            else:
                shops.append(existing_shop)
                self.stdout.write(self.style.WARNING(f"⚠️ Shop already exists: {data['shop_name']}"))
        
        return customers, shops

    def create_categories(self, shops, admin_user):
        """Create product categories"""
        categories_data = [
            'Cameras & Photography',
            'Mobile Accessories',
            'Mobile Phones',
            'Desktop and Laptops',
            'Audio Devices',
            'Controllers',
            'Wearables',
            'Televisions',
            'Storage Devices',
            'Home Appliances',
        ]
        
        categories = []
        for name in categories_data:
            # Check if category already exists
            existing_category = Category.objects.filter(name=name).first()
            
            if not existing_category:
                category = Category.objects.create(
                    name=name,
                    user=admin_user
                )
                categories.append(category)
                self.stdout.write(self.style.SUCCESS(f"✅ Created category: {name}"))
            else:
                categories.append(existing_category)
                self.stdout.write(self.style.WARNING(f"⚠️ Category already exists: {name}"))
        
        return categories

    def create_products(self, customers, shops, categories, admin_user):
        """Create products with real customer and shop references"""
        # First, get or create admin categories dynamically
        try:
            admin_user_obj = User.objects.get(id=admin_user.id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Admin user with ID {admin_user.user_id} not found"))
            return []
        
        # Define products data first to extract unique categories
        products_data = [
            # Tech Haven products
            {
                'name': 'iPhone 15 Pro Max 1TB',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'price': Decimal('1599.99'),
                'quantity': 8,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Latest iPhone with 1TB storage, perfect condition with original box',
            },
            {
                'name': 'MacBook Pro 16" M3 Max',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('3499.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Professional laptop for creatives, professionally refurbished',
            },
            # Gadget World products
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('1299.99'),
                'quantity': 15,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Flagship Samsung smartphone, minimal signs of use',
            },
            {
                'name': 'iPhone 15 Leather Case',
                'category': 'Mobile Accessories',
                'shop': 'Gadget World',
                'price': Decimal('59.99'),
                'quantity': 45,
                'condition': 'New',
                'status': 'Active',
                'description': 'Premium leather case for iPhone 15, genuine leather',
            },
            # KeyClack products
            {
                'name': 'Mechanical Keyboard Pro',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('199.99'),
                'quantity': 12,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Professional mechanical keyboard with customizable RGB lighting',
            },
            # Display Masters products
            {
                'name': '4K Gaming Monitor',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('499.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '27-inch 4K gaming monitor, 144Hz refresh rate',
            },
            # Connect Tech products
            {
                'name': 'Wireless Earbuds Pro',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('129.99'),
                'quantity': 25,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Noise cancelling wireless earbuds with charging case',
            },
            # New electronics-focused products to match all categories
            {
                'name': 'Sony A7 III Mirrorless Camera',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('1799.99'),
                'quantity': 6,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Full-frame mirrorless camera with 24.2MP sensor',
            },
            {
                'name': 'PlayStation 5 Digital Edition',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('449.99'),
                'quantity': 10,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'PS5 Digital Edition with controller, professionally tested',
            },
            {
                'name': 'Apple Watch Series 9',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'price': Decimal('399.99'),
                'quantity': 18,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Latest Apple Watch with cellular option',
            },
            {
                'name': 'Google Nest Hub (2nd Gen)',
                'category': 'Home Electronics',
                'shop': 'Display Masters',
                'price': Decimal('89.99'),
                'quantity': 22,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Smart display with Google Assistant',
            },
            {
                'name': 'AirPods Max Silver',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'price': Decimal('449.99'),
                'quantity': 7,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Premium over-ear headphones with active noise cancellation',
            },
            {
                'name': 'Dell XPS 15 Laptop',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('1299.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '15-inch laptop with 4K display, i7 processor',
            },
            {
                'name': 'Samsung 55" 4K Smart TV',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'price': Decimal('699.99'),
                'quantity': 4,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': '55-inch 4K UHD Smart TV with built-in streaming apps',
            },
            {
                'name': 'Logitech MX Master 3S Mouse',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('79.99'),
                'quantity': 30,
                'condition': 'New',
                'status': 'Active',
                'description': 'Wireless mouse with precision scrolling',
            },
            {
                'name': 'Anker Power Bank 20,000mAh',
                'category': 'Mobile Accessories',
                'shop': 'Gadget World',
                'price': Decimal('49.99'),
                'quantity': 35,
                'condition': 'New',
                'status': 'Active',
                'description': 'High-capacity power bank with fast charging',
            },
            {
                'name': 'iPad Pro 12.9" M2',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'price': Decimal('1099.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '12.9-inch iPad Pro with M2 chip and ProMotion display',
            },
            {
                'name': 'Samsung Galaxy Tab S9',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('899.99'),
                'quantity': 14,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Premium Android tablet with S Pen included',
            },
            {
                'name': 'Google Pixel 8 Pro',
                'category': 'Smartphones & Tablets',
                'shop': 'Connect Tech',
                'price': Decimal('999.99'),
                'quantity': 13,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Flagship Pixel phone with advanced camera features',
            },
            {
                'name': 'OnePlus 12',
                'category': 'Smartphones & Tablets',
                'shop': 'KeyClack',
                'price': Decimal('799.99'),
                'quantity': 18,
                'condition': 'New',
                'status': 'Active',
                'description': 'High-performance Android phone with fast charging',
            },
            {
                'name': 'ASUS ROG Zephyrus G14',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('1499.99'),
                'quantity': 7,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Gaming laptop with Ryzen 9 processor and RTX 4060',
            },
            {
                'name': 'Lenovo ThinkPad X1 Carbon',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('1299.99'),
                'quantity': 9,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Business laptop with durable carbon fiber construction',
            },
            {
                'name': 'Apple Mac Mini M2',
                'category': 'Laptops & Computers',
                'shop': 'Connect Tech',
                'price': Decimal('699.99'),
                'quantity': 12,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Compact desktop computer with Apple Silicon',
            },
            {
                'name': 'Microsoft Surface Laptop 5',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('1199.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Slim Windows laptop with touchscreen display',
            },
            {
                'name': 'Bose QuietComfort 45',
                'category': 'Audio & Headphones',
                'shop': 'Tech Haven',
                'price': Decimal('329.99'),
                'quantity': 15,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Noise-cancelling over-ear headphones with premium sound',
            },
            {
                'name': 'Sony WH-1000XM5',
                'category': 'Audio & Headphones',
                'shop': 'Gadget World',
                'price': Decimal('399.99'),
                'quantity': 11,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Industry-leading noise cancellation headphones',
            },
            {
                'name': 'JBL Flip 6 Bluetooth Speaker',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('129.99'),
                'quantity': 22,
                'condition': 'New',
                'status': 'Active',
                'description': 'Portable waterproof speaker with powerful bass',
            },
            {
                'name': 'Samsung Odyssey G9',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('1299.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '49-inch super ultrawide gaming monitor, 240Hz',
            },
            {
                'name': 'LG OLED C3 65"',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'price': Decimal('1699.99'),
                'quantity': 4,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'OLED TV with perfect blacks and infinite contrast',
            },
            {
                'name': 'Dell UltraSharp 32" 4K',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('899.99'),
                'quantity': 10,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Professional color-accurate monitor for design work',
            },
            {
                'name': 'Apple Studio Display',
                'category': 'TVs & Monitors',
                'shop': 'Tech Haven',
                'price': Decimal('1599.99'),
                'quantity': 6,
                'condition': 'Like New',
                'status': 'Active',
                'description': '27-inch 5K Retina display with camera and speakers',
            },
            {
                'name': 'Nikon Z6 II',
                'category': 'Cameras & Photography',
                'shop': 'Gadget World',
                'price': Decimal('1999.99'),
                'quantity': 4,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Full-frame mirrorless camera with dual processors',
            },
            {
                'name': 'Canon EOS R5',
                'category': 'Cameras & Photography',
                'shop': 'Display Masters',
                'price': Decimal('3899.99'),
                'quantity': 3,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Professional mirrorless camera with 8K video',
            },
            {
                'name': 'GoPro Hero 12 Black',
                'category': 'Cameras & Photography',
                'shop': 'Connect Tech',
                'price': Decimal('399.99'),
                'quantity': 16,
                'condition': 'New',
                'status': 'Active',
                'description': 'Action camera with hyper-smooth stabilization',
            },
            {
                'name': 'Sony ZV-1',
                'category': 'Cameras & Photography',
                'shop': 'KeyClack',
                'price': Decimal('749.99'),
                'quantity': 12,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Compact camera designed for vloggers and creators',
            },
            {
                'name': 'Xbox Series X',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('499.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Microsoft gaming console with 4K gaming capability',
            },
            {
                'name': 'Nintendo Switch OLED',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('349.99'),
                'quantity': 14,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Handheld gaming console with vibrant OLED screen',
            },
            {
                'name': 'PlayStation VR2',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('549.99'),
                'quantity': 7,
                'condition': 'New',
                'status': 'Active',
                'description': 'Virtual reality headset for PlayStation 5',
            },
            {
                'name': 'Steam Deck 512GB',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Display Masters',
                'price': Decimal('649.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Handheld gaming PC with SteamOS',
            },
            {
                'name': 'Samsung Galaxy Watch 6',
                'category': 'Smartwatches & Wearables',
                'shop': 'Tech Haven',
                'price': Decimal('299.99'),
                'quantity': 18,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Advanced smartwatch with comprehensive health tracking',
            },
            {
                'name': 'Garmin Fenix 7',
                'category': 'Smartwatches & Wearables',
                'shop': 'Gadget World',
                'price': Decimal('699.99'),
                'quantity': 9,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Premium multisport GPS watch with solar charging',
            },
            {
                'name': 'Fitbit Charge 6',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'price': Decimal('159.99'),
                'quantity': 25,
                'condition': 'New',
                'status': 'Active',
                'description': 'Fitness tracker with built-in GPS and heart rate monitor',
            },
            {
                'name': 'Oura Ring Gen 3',
                'category': 'Smartwatches & Wearables',
                'shop': 'KeyClack',
                'price': Decimal('299.99'),
                'quantity': 15,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Smart ring tracking sleep, activity, and recovery',
            },
            {
                'name': 'Amazon Echo Show 15',
                'category': 'Home Electronics',
                'shop': 'Display Masters',
                'price': Decimal('249.99'),
                'quantity': 12,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': '15-inch smart display with Alexa for home management',
            },
            {
                'name': 'Philips Hue Starter Kit',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('199.99'),
                'quantity': 17,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smart lighting system with bridge and color bulbs',
            },
            {
                'name': 'Nest Learning Thermostat',
                'category': 'Home Electronics',
                'shop': 'Tech Haven',
                'price': Decimal('249.99'),
                'quantity': 14,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Smart thermostat that learns your schedule',
            },
            {
                'name': 'Roomba i7+',
                'category': 'Home Electronics',
                'shop': 'Gadget World',
                'price': Decimal('799.99'),
                'quantity': 8,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Self-emptying robot vacuum with smart mapping',
            },
            {
                'name': 'Blue Yeti USB Microphone',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('129.99'),
                'quantity': 22,
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional USB condenser microphone for streaming',
            },
            {
                'name': 'Samsung T7 Portable SSD 2TB',
                'category': 'Computer Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('189.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'High-speed portable solid state drive',
            },
            {
                'name': 'Docking Station Dual 4K',
                'category': 'Computer Accessories',
                'shop': 'Gadget World',
                'price': Decimal('149.99'),
                'quantity': 16,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'USB-C docking station supporting dual 4K displays',
            },
            {
                'name': 'Ergonomic Office Chair',
                'category': 'Computer Accessories',
                'shop': 'Display Masters',
                'price': Decimal('299.99'),
                'quantity': 6,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'High-back ergonomic chair with lumbar support',
            },
            {
                'name': 'MagSafe Charger Duo',
                'category': 'Mobile Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('129.99'),
                'quantity': 28,
                'condition': 'New',
                'status': 'Active',
                'description': 'Apple MagSafe charger for iPhone and Apple Watch',
            },
            {
                'name': 'Spigen Tough Armor Case',
                'category': 'Mobile Accessories',
                'shop': 'KeyClack',
                'price': Decimal('39.99'),
                'quantity': 42,
                'condition': 'New',
                'status': 'Active',
                'description': 'Rugged protective case for Samsung Galaxy S24',
            },
            {
                'name': 'Belkin 3-in-1 Wireless Charger',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('159.99'),
                'quantity': 15,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Charging stand for iPhone, AirPods, and Apple Watch',
            },
            {
                'name': 'Screen Protector Glass 3-Pack',
                'category': 'Mobile Accessories',
                'shop': 'Gadget World',
                'price': Decimal('24.99'),
                'quantity': 50,
                'condition': 'New',
                'status': 'Active',
                'description': 'Tempered glass screen protectors for various phone models',
            },
            {
                'name': 'OnePlus 11 5G',
                'category': 'Smartphones & Tablets',
                'shop': 'Display Masters',
                'price': Decimal('699.99'),
                'quantity': 16,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Flagship killer with Hasselblad camera system',
            },
            {
                'name': 'Samsung Galaxy Z Flip5',
                'category': 'Smartphones & Tablets',
                'shop': 'Connect Tech',
                'price': Decimal('999.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Compact foldable smartphone with flexible display',
            },
            {
                'name': 'Microsoft Surface Pro 9',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'price': Decimal('1299.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '2-in-1 tablet with detachable keyboard and pen',
            },
            {
                'name': 'Google Pixel Tablet',
                'category': 'Smartphones & Tablets',
                'shop': 'KeyClack',
                'price': Decimal('499.99'),
                'quantity': 13,
                'condition': 'New',
                'status': 'Active',
                'description': 'Android tablet with charging speaker dock included',
            },
            {
                'name': 'HP Spectre x360 14',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('1399.99'),
                'quantity': 7,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Convertible laptop with OLED touchscreen display',
            },
            {
                'name': 'Alienware Aurora R15',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('2499.99'),
                'quantity': 4,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Gaming desktop with liquid cooling and RTX 4080',
            },
            {
                'name': 'Framework Laptop 13',
                'category': 'Laptops & Computers',
                'shop': 'Connect Tech',
                'price': Decimal('1099.99'),
                'quantity': 10,
                'condition': 'New',
                'status': 'Active',
                'description': 'Modular, repairable laptop with upgradeable components',
            },
            {
                'name': 'Sony WF-1000XM5',
                'category': 'Audio & Headphones',
                'shop': 'Tech Haven',
                'price': Decimal('299.99'),
                'quantity': 19,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Premium true wireless earbuds with noise cancellation',
            },
            {
                'name': 'Sennheiser HD 660S',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'price': Decimal('499.99'),
                'quantity': 8,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Open-back audiophile headphones with detailed sound',
            },
            {
                'name': 'Sonos Beam Gen 2',
                'category': 'Audio & Headphones',
                'shop': 'Gadget World',
                'price': Decimal('449.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Compact soundbar with Dolby Atmos and voice control',
            },
            {
                'name': 'LG UltraGear 34" Curved',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('799.99'),
                'quantity': 9,
                'condition': 'Like New',
                'status': 'Active',
                'description': '34-inch ultra-wide gaming monitor with 160Hz refresh',
            },
            {
                'name': 'Sony Bravia XR 75"',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'price': Decimal('2499.99'),
                'quantity': 3,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Large-screen OLED TV with Cognitive Processor XR',
            },
            {
                'name': 'Fujifilm X-T5',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('1699.99'),
                'quantity': 6,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'APS-C mirrorless camera with 40MP sensor',
            },
            {
                'name': 'DJI Mavic 3 Pro',
                'category': 'Cameras & Photography',
                'shop': 'Gadget World',
                'price': Decimal('2199.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Professional drone with triple camera system',
            },
            {
                'name': 'Nintendo Switch Pro Controller',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'KeyClack',
                'price': Decimal('69.99'),
                'quantity': 24,
                'condition': 'New',
                'status': 'Active',
                'description': 'Premium game controller for Nintendo Switch',
            },
            {
                'name': 'Xbox Elite Series 2',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Display Masters',
                'price': Decimal('179.99'),
                'quantity': 14,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Customizable pro controller with adjustable tension sticks',
            },
            {
                'name': 'Withings ScanWatch',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'price': Decimal('279.99'),
                'quantity': 16,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Hybrid smartwatch with medical-grade sensors',
            },
            {
                'name': 'Samsung SmartThings Hub',
                'category': 'Home Electronics',
                'shop': 'Tech Haven',
                'price': Decimal('79.99'),
                'quantity': 18,
                'condition': 'New',
                'status': 'Active',
                'description': 'Central hub for controlling smart home devices',
            },
            {
                'name': 'Elgato Stream Deck XL',
                'category': 'Computer Accessories',
                'shop': 'Gadget World',
                'price': Decimal('249.99'),
                'quantity': 12,
                'condition': 'Like New',
                'status': 'Active',
                'description': '32-key customizable control pad for streamers',
            },
            {
                'name': 'Anker 735 Charger GaNPrime',
                'category': 'Mobile Accessories',
                'shop': 'KeyClack',
                'price': Decimal('89.99'),
                'quantity': 26,
                'condition': 'New',
                'status': 'Active',
                'description': '65W fast charger with three ports and GaN technology',
            },
            {
                'name': 'Nothing Phone (2)',
                'category': 'Smartphones & Tablets',
                'shop': 'Display Masters',
                'price': Decimal('599.99'),
                'quantity': 17,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Unique transparent design with Glyph Interface lighting',
            },
            {
                'name': 'iPad Air 5th Gen',
                'category': 'Smartphones & Tablets',
                'shop': 'Connect Tech',
                'price': Decimal('599.99'),
                'quantity': 15,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '10.9-inch iPad with M1 chip and Center Stage camera',
            },
            {
                'name': 'Acer Predator Helios 300',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('1299.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Gaming laptop with high refresh rate display',
            },
            {
                'name': 'Apple Mac Studio M2 Ultra',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('3999.99'),
                'quantity': 3,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Professional desktop computer for intensive workflows',
            },
            {
                'name': 'Audio-Technica ATH-M50x',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'price': Decimal('149.99'),
                'quantity': 21,
                'condition': 'New',
                'status': 'Active',
                'description': 'Studio monitor headphones with exceptional clarity',
            },
            {
                'name': 'Samsung 32" Smart Monitor',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('299.99'),
                'quantity': 13,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '4K monitor with built-in streaming apps and smart features',
            },
            {
                'name': 'Panasonic Lumix S5II',
                'category': 'Cameras & Photography',
                'shop': 'Connect Tech',
                'price': Decimal('1999.99'),
                'quantity': 7,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Full-frame hybrid camera with phase detection autofocus',
            },
            {
                'name': 'Meta Quest 3',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('499.99'),
                'quantity': 11,
                'condition': 'New',
                'status': 'Active',
                'description': 'Mixed reality headset with color passthrough',
            },
            {
                'name': 'Amazfit GTR 4',
                'category': 'Smartwatches & Wearables',
                'shop': 'Gadget World',
                'price': Decimal('199.99'),
                'quantity': 22,
                'condition': 'New',
                'status': 'Active',
                'description': 'GPS smartwatch with long battery life and health tracking',
            },
            {
                'name': 'Ring Video Doorbell Pro 2',
                'category': 'Home Electronics',
                'shop': 'Display Masters',
                'price': Decimal('249.99'),
                'quantity': 15,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Wired video doorbell with 3D motion detection',
            },
            {
                'name': 'Corsair K70 RGB TKL',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('159.99'),
                'quantity': 17,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Tenkeyless mechanical keyboard with Cherry MX switches',
            },
            {
                'name': 'Mophie 3-in-1 Travel Charger',
                'category': 'Mobile Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('139.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'Portable charging stand for iPhone, AirPods, and Apple Watch',
            },
            {
                'name': 'ASUS Zenbook 14 OLED',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('999.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Ultra-portable laptop with vibrant OLED display',
            },
            {
                'name': 'Samsung Galaxy Book3 Ultra',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('2399.99'),
                'quantity': 5,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Powerful laptop with RTX 4070 and AMOLED display',
            },
            {
                'name': 'Bang & Olufsen Beoplay Portal',
                'category': 'Audio & Headphones',
                'shop': 'Display Masters',
                'price': Decimal('499.99'),
                'quantity': 8,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Premium wireless headphones with Xbox connectivity',
            },
            {
                'name': 'LG 42" OLED TV',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'price': Decimal('899.99'),
                'quantity': 7,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Mid-size OLED perfect for gaming and media consumption',
            },
            {
                'name': 'Insta360 X3',
                'category': 'Cameras & Photography',
                'shop': 'KeyClack',
                'price': Decimal('449.99'),
                'quantity': 14,
                'condition': 'New',
                'status': 'Active',
                'description': '360-degree action camera with 5.7K video recording',
            },
            {
                'name': 'Razer Blade 15',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('2199.99'),
                'quantity': 6,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Slim gaming laptop with premium aluminum chassis',
            },
            {
                'name': 'Samsung Galaxy A54 5G',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('449.99'),
                'quantity': 25,
                'condition': 'New',
                'status': 'Active',
                'description': 'Mid-range smartphone with excellent camera and battery',
            },
            {
                'name': 'Apple TV 4K (3rd Gen)',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('129.99'),
                'quantity': 20,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Streaming device with A15 Bionic chip and Dolby Vision',
            },
            {
                'name': 'HyperX Cloud II Wireless',
                'category': 'Audio & Headphones',
                'shop': 'Display Masters',
                'price': Decimal('149.99'),
                'quantity': 16,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Wireless gaming headset with virtual 7.1 surround sound',
            },
            {
                'name': 'WD Black SN850X 2TB',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('159.99'),
                'quantity': 23,
                'condition': 'New',
                'status': 'Active',
                'description': 'High-performance NVMe SSD for gaming and workstations',
            },
            {
                'name': 'ESR HaloLock Magnetic Case',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('34.99'),
                'quantity': 38,
                'condition': 'New',
                'status': 'Active',
                'description': 'MagSafe compatible case with kickstand for iPhone',
            },
            {
                'name': 'Lenovo Yoga 9i Gen 8',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('1599.99'),
                'quantity': 8,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Premium convertible laptop with rotating soundbar',
            },
            {
                'name': 'Sony HT-A5000 Soundbar',
                'category': 'Audio & Headphones',
                'shop': 'Display Masters',
                'price': Decimal('899.99'),
                'quantity': 6,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Dolby Atmos soundbar with built-in subwoofers',
            },
            {
                'name': 'Dell 49" Curved Monitor',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'price': Decimal('1299.99'),
                'quantity': 5,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Ultra-wide business monitor with KVM switch',
            },
            {
                'name': 'Sony Alpha 6700',
                'category': 'Cameras & Photography',
                'shop': 'KeyClack',
                'price': Decimal('1399.99'),
                'quantity': 9,
                'condition': 'New',
                'status': 'Active',
                'description': 'APS-C mirrorless camera with AI processing unit',
            },
            {
                'name': 'Valve Index VR Kit',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('999.99'),
                'quantity': 4,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'High-end PC VR system with knuckles controllers',
            },
            {
                'name': 'Garmin Venu 3',
                'category': 'Smartwatches & Wearables',
                'shop': 'Gadget World',
                'price': Decimal('449.99'),
                'quantity': 17,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Advanced health smartwatch with ECG and sleep coach',
            },
            {
                'name': 'Arlo Pro 4 Security Camera',
                'category': 'Home Electronics',
                'shop': 'Display Masters',
                'price': Decimal('199.99'),
                'quantity': 14,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Wire-free security camera with 2K video and color night vision',
            },
            {
                'name': 'Logitech G Pro X Superlight',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('149.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'Ultra-lightweight wireless gaming mouse',
            },
            {
                'name': 'Ugreen 100W USB-C Cable',
                'category': 'Mobile Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('29.99'),
                'quantity': 45,
                'condition': 'New',
                'status': 'Active',
                'description': 'Braided USB-C to USB-C cable supporting 100W charging',
            },
            {
                'name': 'Google Pixel 7a',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'price': Decimal('499.99'),
                'quantity': 21,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Budget-friendly Pixel phone with flagship camera features',
            },
            {
                'name': 'Samsung Galaxy S23 FE',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('599.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'Fan Edition smartphone with premium features at mid-range price',
            },
            {
                'name': 'HP Omen 45L Desktop',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('2299.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'High-performance gaming PC with liquid cooling system',
            },
            {
                'name': 'Apple AirPods Pro 2',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('249.99'),
                'quantity': 26,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Wireless earbuds with adaptive transparency and Find My',
            },
            {
                'name': 'Samsung 43" QLED 4K',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('549.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'QLED TV with Quantum HDR and gaming features',
            },
            {
                'name': 'Canon RF 24-70mm f/2.8',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('2299.99'),
                'quantity': 4,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Professional standard zoom lens for Canon R series',
            },
            {
                'name': 'PlayStation 5 DualSense Edge',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('199.99'),
                'quantity': 16,
                'condition': 'New',
                'status': 'Active',
                'description': 'Pro controller with customizable controls and back buttons',
            },
            {
                'name': 'Fitbit Sense 2',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('299.99'),
                'quantity': 14,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Advanced health smartwatch with stress management tools',
            },
            {
                'name': 'Eero Pro 6E Mesh System',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('399.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Wi-Fi 6E mesh system for whole-home coverage',
            },
            {
                'name': 'Samsung Galaxy Buds2 Pro',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'price': Decimal('169.99'),
                'quantity': 24,
                'condition': 'New',
                'status': 'Active',
                'description': 'True wireless earbuds with 24-bit Hi-Fi sound',
            },
            {
                'name': 'Anker 737 Power Bank',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('129.99'),
                'quantity': 18,
                'condition': 'New',
                'status': 'Active',
                'description': '140W power bank with digital display and multiple ports',
            },
            {
                'name': 'ASUS ROG Phone 8 Pro',
                'category': 'Smartphones & Tablets',
                'shop': 'Display Masters',
                'price': Decimal('1299.99'),
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'description': 'Gaming smartphone with AirTrigger buttons and advanced cooling',
            },
            {
                'name': 'Motorola Razr 40 Ultra',
                'category': 'Smartphones & Tablets',
                'shop': 'Connect Tech',
                'price': Decimal('999.99'),
                'quantity': 11,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Compact foldable phone with large cover display',
            },
            {
                'name': 'Amazon Fire Max 11',
                'category': 'Smartphones & Tablets',
                'shop': 'KeyClack',
                'price': Decimal('229.99'),
                'quantity': 25,
                'condition': 'New',
                'status': 'Active',
                'description': 'Budget tablet with 11-inch display and long battery life',
            },
            {
                'name': 'Apple iPad Mini 6',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'price': Decimal('499.99'),
                'quantity': 19,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Compact 8.3-inch tablet with A15 Bionic chip',
            },
            {
                'name': 'MSI Stealth 16 Studio',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('2399.99'),
                'quantity': 6,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Slim gaming laptop with Mini LED display',
            },
            {
                'name': 'Intel NUC 13 Extreme',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('1299.99'),
                'quantity': 7,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Compact gaming PC with desktop graphics card support',
            },
            {
                'name': 'Microsoft Surface Laptop Studio',
                'category': 'Laptops & Computers',
                'shop': 'Connect Tech',
                'price': Decimal('2099.99'),
                'quantity': 5,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Convertible laptop with haptic touchpad and dedicated GPU',
            },
            {
                'name': 'Acer Swift X 14',
                'category': 'Laptops & Computers',
                'shop': 'KeyClack',
                'price': Decimal('1099.99'),
                'quantity': 12,
                'condition': 'New',
                'status': 'Active',
                'description': 'Creator laptop with OLED display and RTX graphics',
            },
            {
                'name': 'Shure Aonic 215',
                'category': 'Audio & Headphones',
                'shop': 'Tech Haven',
                'price': Decimal('279.99'),
                'quantity': 16,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'True wireless earphones with modular design',
            },
            {
                'name': 'Beats Studio Pro',
                'category': 'Audio & Headphones',
                'shop': 'Gadget World',
                'price': Decimal('349.99'),
                'quantity': 14,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Over-ear headphones with spatial audio and noise cancellation',
            },
            {
                'name': 'Marshall Woburn III',
                'category': 'Audio & Headphones',
                'shop': 'Display Masters',
                'price': Decimal('499.99'),
                'quantity': 8,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Bluetooth speaker with iconic Marshall design',
            },
            {
                'name': 'Samsung HW-Q990C Soundbar',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('1399.99'),
                'quantity': 5,
                'condition': 'Like New',
                'status': 'Active',
                'description': '11.1.4 channel soundbar with wireless subwoofer and rear speakers',
            },
            {
                'name': 'ASUS ProArt PA329CV',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('899.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '32-inch 4K professional monitor with Calman Verified certification',
            },
            {
                'name': 'LG 48" OLED Flex',
                'category': 'TVs & Monitors',
                'shop': 'Tech Haven',
                'price': Decimal('2499.99'),
                'quantity': 4,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Curveable OLED gaming monitor/TV with adjustable curvature',
            },
            {
                'name': 'Samsung Odyssey Neo G8',
                'category': 'TVs & Monitors',
                'shop': 'Gadget World',
                'price': Decimal('1499.99'),
                'quantity': 6,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '32-inch 4K gaming monitor with 240Hz refresh rate',
            },
            {
                'name': 'Apple Pro Display XDR',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('4999.99'),
                'quantity': 2,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Professional 32-inch 6K Retina display with extreme dynamic range',
            },
            {
                'name': 'Sony FX30 Cinema Camera',
                'category': 'Cameras & Photography',
                'shop': 'Connect Tech',
                'price': Decimal('1799.99'),
                'quantity': 7,
                'condition': 'New',
                'status': 'Active',
                'description': 'Super 35mm cinema camera with dual native ISO',
            },
            {
                'name': 'Fujifilm Instax Mini 12',
                'category': 'Cameras & Photography',
                'shop': 'KeyClack',
                'price': Decimal('79.99'),
                'quantity': 32,
                'condition': 'New',
                'status': 'Active',
                'description': 'Instant camera with automatic exposure and selfie mode',
            },
            {
                'name': 'Blackmagic Pocket Cinema 6K',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('2499.99'),
                'quantity': 5,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Professional cinema camera with Super 35 sensor',
            },
            {
                'name': 'Olympus OM-D E-M1 Mark III',
                'category': 'Cameras & Photography',
                'shop': 'Gadget World',
                'price': Decimal('1699.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Micro Four Thirds camera with advanced computational photography',
            },
            {
                'name': 'Xbox Series S',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Display Masters',
                'price': Decimal('299.99'),
                'quantity': 18,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'All-digital next-gen console with Game Pass',
            },
            {
                'name': 'Nintendo Switch Lite',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('199.99'),
                'quantity': 22,
                'condition': 'New',
                'status': 'Active',
                'description': 'Dedicated handheld gaming console in various colors',
            },
            {
                'name': 'PlayStation VR2 Sense Controller',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'KeyClack',
                'price': Decimal('89.99'),
                'quantity': 28,
                'condition': 'New',
                'status': 'Active',
                'description': 'Pair of VR controllers with haptic feedback and adaptive triggers',
            },
            {
                'name': 'Razer Wolverine V2 Pro',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('249.99'),
                'quantity': 13,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Wireless pro controller with interchangeable thumbsticks',
            },
            {
                'name': 'Apple Watch Ultra 2',
                'category': 'Smartwatches & Wearables',
                'shop': 'Gadget World',
                'price': Decimal('799.99'),
                'quantity': 9,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Rugged smartwatch for extreme sports and outdoor activities',
            },
            {
                'name': 'Samsung Galaxy Ring',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('399.99'),
                'quantity': 16,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smart ring with health tracking and NFC payments',
            },
            {
                'name': 'Garmin Forerunner 965',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'price': Decimal('599.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Advanced running watch with AMOLED display and mapping',
            },
            {
                'name': 'Fitbit Versa 4',
                'category': 'Smartwatches & Wearables',
                'shop': 'KeyClack',
                'price': Decimal('229.99'),
                'quantity': 24,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smartwatch with Google integration and fitness tracking',
            },
            {
                'name': 'Google Nest Thermostat',
                'category': 'Home Electronics',
                'shop': 'Tech Haven',
                'price': Decimal('129.99'),
                'quantity': 21,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smart thermostat with energy saving features',
            },
            {
                'name': 'Ecobee SmartThermostat Premium',
                'category': 'Home Electronics',
                'shop': 'Gadget World',
                'price': Decimal('249.99'),
                'quantity': 15,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Smart thermostat with built-in Alexa and air quality monitor',
            },
            {
                'name': 'Philips Hue Gradient Lightstrip',
                'category': 'Home Electronics',
                'shop': 'Display Masters',
                'price': Decimal('199.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'Multi-color LED strip with gradient effect for TVs',
            },
            {
                'name': 'August Wi-Fi Smart Lock',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('229.99'),
                'quantity': 16,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Smart lock with auto-lock/unlock and remote access',
            },
            {
                'name': 'Keychron Q3 Mechanical Keyboard',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('189.99'),
                'quantity': 14,
                'condition': 'New',
                'status': 'Active',
                'description': 'Custom mechanical keyboard with gasket mount design',
            },
            {
                'name': 'Logitech MX Keys Mini',
                'category': 'Computer Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('99.99'),
                'quantity': 27,
                'condition': 'New',
                'status': 'Active',
                'description': 'Compact wireless keyboard for Mac and Windows',
            },
            {
                'name': 'Samsung T9 Portable SSD 4TB',
                'category': 'Computer Accessories',
                'shop': 'Gadget World',
                'price': Decimal('399.99'),
                'quantity': 11,
                'condition': 'New',
                'status': 'Active',
                'description': 'High-speed portable SSD with USB 3.2 Gen 2x2 interface',
            },
            {
                'name': 'Caldigit TS4 Thunderbolt Dock',
                'category': 'Computer Accessories',
                'shop': 'Display Masters',
                'price': Decimal('399.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Thunderbolt 4 dock with 18 ports and 98W charging',
            },
            {
                'name': 'ESR MagSafe Car Mount',
                'category': 'Mobile Accessories',
                'shop': 'Connect Tech',
                'price': Decimal('39.99'),
                'quantity': 35,
                'condition': 'New',
                'status': 'Active',
                'description': 'Magnetic car vent mount for iPhone with MagSafe',
            },
            {
                'name': 'Spigen Slim Armor Case',
                'category': 'Mobile Accessories',
                'shop': 'KeyClack',
                'price': Decimal('44.99'),
                'quantity': 41,
                'condition': 'New',
                'status': 'Active',
                'description': 'Protective case with kickstand for various phone models',
            },
            {
                'name': 'Anker 511 Power Bank',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('49.99'),
                'quantity': 32,
                'condition': 'New',
                'status': 'Active',
                'description': 'Compact power bank with built-in charging cable',
            },
            {
                'name': 'UGREEN 9-in-1 USB-C Hub',
                'category': 'Mobile Accessories',
                'shop': 'Gadget World',
                'price': Decimal('89.99'),
                'quantity': 24,
                'condition': 'New',
                'status': 'Active',
                'description': 'USB-C hub with 4K HDMI, Ethernet, SD card slots and USB ports',
            },
            {
                'name': 'Google Pixel Fold',
                'category': 'Smartphones & Tablets',
                'shop': 'Display Masters',
                'price': Decimal('1799.99'),
                'quantity': 6,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Google first foldable phone with Tensor G2 chip',
            },
            {
                'name': 'Samsung Galaxy Tab S9 Ultra',
                'category': 'Smartphones & Tablets',
                'shop': 'Connect Tech',
                'price': Decimal('1199.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '14.6-inch premium Android tablet with S Pen',
            },
            {
                'name': 'Microsoft Surface Duo 2',
                'category': 'Smartphones & Tablets',
                'shop': 'KeyClack',
                'price': Decimal('999.99'),
                'quantity': 9,
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Dual-screen foldable phone with 90Hz displays',
            },
            {
                'name': 'Lenovo Legion Pro 7i',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'price': Decimal('2799.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'High-end gaming laptop with RTX 4090 graphics',
            },
            {
                'name': 'Apple iMac 24" M3',
                'category': 'Laptops & Computers',
                'shop': 'Gadget World',
                'price': Decimal('1499.99'),
                'quantity': 8,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'All-in-one desktop computer in vibrant colors',
            },
            {
                'name': 'Dell Precision 7780',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('3499.99'),
                'quantity': 4,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Mobile workstation with professional-grade graphics',
            },
            {
                'name': 'Sennheiser Momentum 4',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('349.99'),
                'quantity': 15,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Wireless headphones with 60-hour battery life',
            },
            {
                'name': 'Sonos Era 300',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'price': Decimal('449.99'),
                'quantity': 12,
                'condition': 'New',
                'status': 'Active',
                'description': 'Spatial audio smart speaker for Dolby Atmos music',
            },
            {
                'name': 'JBL Bar 1000 Soundbar',
                'category': 'Audio & Headphones',
                'shop': 'Tech Haven',
                'price': Decimal('1199.99'),
                'quantity': 7,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '7.1.4 channel soundbar with detachable wireless speakers',
            },
            {
                'name': 'ASUS ROG Swift PG27AQDM',
                'category': 'TVs & Monitors',
                'shop': 'Gadget World',
                'price': Decimal('999.99'),
                'quantity': 8,
                'condition': 'Like New',
                'status': 'Active',
                'description': '27-inch OLED gaming monitor with 240Hz refresh rate',
            },
            {
                'name': 'Dell UltraSharp U4025QW',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('2399.99'),
                'quantity': 4,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '40-inch 5K2K ultra-wide curved monitor for productivity',
            },
            {
                'name': 'Leica Q3',
                'category': 'Cameras & Photography',
                'shop': 'Connect Tech',
                'price': Decimal('5999.99'),
                'quantity': 3,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Full-frame compact camera with 60MP sensor',
            },
            {
                'name': 'DJI Osmo Pocket 3',
                'category': 'Cameras & Photography',
                'shop': 'KeyClack',
                'price': Decimal('669.99'),
                'quantity': 17,
                'condition': 'New',
                'status': 'Active',
                'description': 'Pocket-sized gimbal camera with 1-inch sensor',
            },
            {
                'name': 'PlayStation Portal Remote Player',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('199.99'),
                'quantity': 14,
                'condition': 'New',
                'status': 'Active',
                'description': 'Remote play device for PlayStation 5 with DualSense features',
            },
            {
                'name': 'Backbone One PlayStation Edition',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('99.99'),
                'quantity': 26,
                'condition': 'New',
                'status': 'Active',
                'description': 'Mobile gaming controller for iPhone with PlayStation styling',
            },
            {
                'name': 'Suunto Vertical Titanium',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('799.99'),
                'quantity': 9,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Outdoor watch with solar charging and topographic maps',
            },
            {
                'name': 'Amazon Astro Home Robot',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('1599.99'),
                'quantity': 5,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Home monitoring robot with Alexa and periscope camera',
            },
            {
                'name': 'Razer Huntsman V3 Pro',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('249.99'),
                'quantity': 13,
                'condition': 'New',
                'status': 'Active',
                'description': 'Optical mechanical keyboard with adjustable actuation',
            },
            {
                'name': 'Pitaka MagEZ Case Pro',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('89.99'),
                'quantity': 29,
                'condition': 'New',
                'status': 'Active',
                'description': 'Aramid fiber case with MagSafe compatibility',
            },
            {
                'name': 'Xiaomi 13 Ultra',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('1299.99'),
                'quantity': 10,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Photography-focused smartphone with 1-inch main sensor',
            },
            {
                'name': 'ASUS Zenbook Pro 14 Duo',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('2199.99'),
                'quantity': 6,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Dual-screen laptop with 14.5-inch main and 12.7-inch ScreenPad Plus',
            },
            {
                'name': 'Focal Bathys Wireless',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('799.99'),
                'quantity': 8,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'High-fidelity wireless headphones with DAC mode',
            },
            {
                'name': 'Samsung The Frame 65"',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('1999.99'),
                'quantity': 5,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Art mode TV that displays artwork when not in use',
            },
            {
                'name': 'Sony Alpha 7RV',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('3899.99'),
                'quantity': 4,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '61MP full-frame camera with AI autofocus',
            },
            {
                'name': 'Logitech G Cloud Gaming Handheld',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('349.99'),
                'quantity': 15,
                'condition': 'New',
                'status': 'Active',
                'description': 'Cloud gaming device with 7-inch display and Xbox Cloud Gaming',
            },
            {
                'name': 'Garmin Epix Pro Gen 2',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('999.99'),
                'quantity': 7,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Premium outdoor watch with AMOLED display and flashlight',
            },
            {
                'name': 'Lutron Caséta Smart Dimmer',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('79.99'),
                'quantity': 32,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smart lighting control system with dimmer switch',
            },
            {
                'name': 'Satechi Thunderbolt 4 Dock',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('299.99'),
                'quantity': 16,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Thunderbolt dock with 12 ports including SD card reader',
            },
            {
                'name': 'ESR MagSafe Wallet',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('29.99'),
                'quantity': 48,
                'condition': 'New',
                'status': 'Active',
                'description': 'Magnetic wallet that attaches to MagSafe compatible phones',
            },
            {
                'name': 'Huawei MatePad Pro 13.2"',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('1199.99'),
                'quantity': 9,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Large tablet with OLED display and stylus support',
            },
            {
                'name': 'HP Victus 15L Gaming Desktop',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('999.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Entry-level gaming PC with upgradable components',
            },
            {
                'name': 'Master & Dynamic MW75',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('549.99'),
                'quantity': 10,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Premium headphones with lambskin leather and noise cancellation',
            },
            {
                'name': 'LG UltraFine 5K Display',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('1299.99'),
                'quantity': 8,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '27-inch 5K monitor developed with Apple for Mac compatibility',
            },
            {
                'name': 'Sigma 85mm f/1.4 DG DN',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('1199.99'),
                'quantity': 12,
                'condition': 'New',
                'status': 'Active',
                'description': 'Art series portrait lens for Sony E-mount and L-mount',
            },
            {
                'name': '8BitDo Ultimate Controller',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('69.99'),
                'quantity': 31,
                'condition': 'New',
                'status': 'Active',
                'description': 'Versatile game controller with charging dock',
            },
            {
                'name': 'Polar Grit X Pro Titan',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('599.99'),
                'quantity': 13,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Outdoor watch with military durability standards',
            },
            {
                'name': 'Netgear Orbi 970 Mesh System',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('2299.99'),
                'quantity': 6,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Wi-Fi 7 mesh system with 10Gbps wired connectivity',
            },
            {
                'name': 'Glorious Model O Wireless',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('79.99'),
                'quantity': 24,
                'condition': 'New',
                'status': 'Active',
                'description': 'Honeycomb shell gaming mouse with RGB lighting',
            },
            {
                'name': 'Anker 3-in-1 Cube with MagSafe',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('109.99'),
                'quantity': 22,
                'condition': 'New',
                'status': 'Active',
                'description': 'Compact charging station for iPhone, AirPods, and Apple Watch',
            },
            {
                'name': 'Realme GT5 Pro',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('799.99'),
                'quantity': 17,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Performance-focused smartphone with periscope telephoto camera',
            },
            {
                'name': 'Samsung Galaxy Book4 Ultra',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('2699.99'),
                'quantity': 5,
                'condition': 'New',
                'status': 'Active',
                'description': 'Ultrabook with Intel Core Ultra 9 and RTX 4070 graphics',
            },
            {
                'name': 'Klipsch The Fives',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('799.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Powered bookshelf speakers with HDMI-ARC and phono input',
            },
            {
                'name': 'Corsair Xeneon Flex 45WQHD240',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('1499.99'),
                'quantity': 7,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Bendable OLED gaming monitor with adjustable curvature',
            },
            {
                'name': 'Tamron 35-150mm f/2-2.8',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('1899.99'),
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'description': 'Versatile zoom lens covering popular focal lengths',
            },
            {
                'name': 'Thrustmaster T248 Racing Wheel',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('349.99'),
                'quantity': 13,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Hybrid racing wheel with force feedback for PS5 and PC',
            },
            {
                'name': 'Xiaomi Watch S3',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('199.99'),
                'quantity': 21,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smartwatch with interchangeable bezels and long battery',
            },
            {
                'name': 'Yale Assure Lock 2',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('279.99'),
                'quantity': 14,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Smart lock with fingerprint, keypad, and Bluetooth',
            },
            {
                'name': 'Lian Li O11 Dynamic Mini',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('119.99'),
                'quantity': 18,
                'condition': 'New',
                'status': 'Active',
                'description': 'Compact PC case with dual chamber design',
            },
            {
                'name': 'Mous Limitless 5.0 Case',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('59.99'),
                'quantity': 33,
                'condition': 'New',
                'status': 'Active',
                'description': 'Protective case with AiroShock technology and MagSafe',
            },
            {
                'name': 'Honor Magic V2',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('1699.99'),
                'quantity': 7,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Ultra-thin foldable phone with dual 120Hz displays',
            },
            {
                'name': 'Framework Laptop 16',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'price': Decimal('1699.99'),
                'quantity': 8,
                'condition': 'New',
                'status': 'Active',
                'description': 'Modular laptop with upgradeable graphics module',
            },
            {
                'name': 'Devialet Gemini II',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'price': Decimal('349.99'),
                'quantity': 14,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'True wireless earbuds with active noise cancellation',
            },
            {
                'name': 'ViewSonic Elite XG272G-2K',
                'category': 'TVs & Monitors',
                'shop': 'KeyClack',
                'price': Decimal('799.99'),
                'quantity': 11,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '27-inch gaming monitor with 300Hz refresh rate',
            },
            {
                'name': 'Panasonic GH6',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'price': Decimal('2199.99'),
                'quantity': 6,
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Micro Four Thirds camera with 5.7K video recording',
            },
            {
                'name': 'Nacon Revolution X Pro',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'price': Decimal('199.99'),
                'quantity': 17,
                'condition': 'New',
                'status': 'Active',
                'description': 'Pro controller with four programmable back buttons',
            },
            {
                'name': 'Amazfit Balance',
                'category': 'Smartwatches & Wearables',
                'shop': 'Display Masters',
                'price': Decimal('229.99'),
                'quantity': 19,
                'condition': 'New',
                'status': 'Active',
                'description': 'Smartwatch with body composition analysis and stress monitoring',
            },
            {
                'name': 'Brilliant Smart Home Control',
                'category': 'Home Electronics',
                'shop': 'Connect Tech',
                'price': Decimal('299.99'),
                'quantity': 12,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Smart light switch with touchscreen and voice control',
            },
            {
                'name': 'Arctic Liquid Freezer III',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'price': Decimal('119.99'),
                'quantity': 21,
                'condition': 'New',
                'status': 'Active',
                'description': 'CPU liquid cooler with VRM fan and ARGB lighting',
            },
            {
                'name': 'Spigen ArcField MagSafe Charger',
                'category': 'Mobile Accessories',
                'shop': 'Tech Haven',
                'price': Decimal('59.99'),
                'quantity': 28,
                'condition': 'New',
                'status': 'Active',
                'description': 'MagSafe charger with adjustable stand and 15W fast charging',
            },
            {
                'name': 'Vivo X100 Pro',
                'category': 'Smartphones & Tablets',
                'shop': 'Gadget World',
                'price': Decimal('1099.99'),
                'quantity': 12,
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Smartphone with Zeiss APO telephoto camera and Dimensity 9300',
            },
            {
                'name': 'Alienware AW3423DWF',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'price': Decimal('1099.99'),
                'quantity': 9,
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '34-inch QD-OLED gaming monitor with 165Hz refresh rate',
            },

        ]
                # Extract unique categories from products data dynamically
                
        unique_categories = set(product['category'] for product in products_data)
        
        # Create admin categories dynamically based on the unique categories found
        admin_categories = {}
        for category_name in unique_categories:
            admin_category, created = Category.objects.get_or_create(
                name=category_name,
                user=admin_user_obj,
                defaults={'name': category_name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created admin category: {category_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Admin category already exists: {category_name}"))
            admin_categories[category_name] = admin_category
        
        self.stdout.write(self.style.SUCCESS(f"📊 Created {len(admin_categories)} admin categories: {', '.join(admin_categories.keys())}"))
        
        products = []
        category_map = {cat.name: cat for cat in categories}
        shop_map = {shop.name: shop for shop in shops}
        
        for product_data in products_data:
            category = category_map.get(product_data['category'])
            shop = shop_map.get(product_data['shop'])
            admin_category = admin_categories.get(product_data['category'])
            
            if category and shop and admin_category:
                # Get the real customer from the shop
                customer = shop.customer
                
                # Check if product already exists
                existing_product = Product.objects.filter(
                    name=product_data['name'],
                    shop=shop,
                    customer=customer
                ).first()
                
                if not existing_product:
                    product = Product.objects.create(
                        customer=customer,           # Real customer from shop
                        shop=shop,                  # Real shop
                        category=category,          # Real category (customer category)
                        category_admin=admin_category,  # Admin category
                        name=product_data['name'],
                        description=product_data['description'],
                        quantity=product_data['quantity'],
                        price=product_data['price'],
                        status=product_data['status'],
                        condition=product_data['condition'],
                    )
                    
                    products.append(product)
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Created product: {product_data['name']} for shop {shop.name} "
                        f"(Customer Category: {category.name}, Admin Category: {admin_category.name})"
                    ))
                else:
                    # Update existing product with admin category
                    existing_product.category_admin = admin_category
                    existing_product.save()
                    products.append(existing_product)
                    self.stdout.write(self.style.WARNING(
                        f"⚠️ Updated existing product: {product_data['name']} with admin category {admin_category.name}"
                    ))
            else:
                missing = []
                if not category: missing.append('category')
                if not shop: missing.append('shop')
                if not admin_category: missing.append('admin_category')
                self.stdout.write(self.style.ERROR(
                    f"❌ Skipping product {product_data['name']}: Missing {', '.join(missing)}"
                ))
        
        self.stdout.write(self.style.SUCCESS(f"🎉 Successfully created/updated {len(products)} products"))
        return products

    def create_boosts_and_plans(self, products, shops, customers, admin_user):
        """Create boost plans, features, and active boosts with real references"""
        # First, let's clean up duplicate BoostPlans if they exist
        self.cleanup_duplicate_boost_plans()
        
        # Define boost plans
        boost_plans_data = [
            {
                'name': 'Basic', 
                'price': Decimal('29.00'), 
                'duration': 1, 
                'time_unit': 'months', 
                'status': 'active',
                'features': [
                    ('Product Highlights', '1 product'),
                    ('Validity Period', '30 days'),
                    ('Search Visibility', 'Improved'),
                ]
            },
            {
                'name': 'Pro', 
                'price': Decimal('99.00'), 
                'duration': 1, 
                'time_unit': 'months', 
                'status': 'active',
                'features': [
                    ('Product Highlights', '5 products'),
                    ('Validity Period', '30 days'),
                    ('Search Visibility', 'Improved'),
                    ('Analytics Dashboard', 'Basic'),
                ]
            },
            {
                'name': 'Premium', 
                'price': Decimal('249.00'), 
                'duration': 1, 
                'time_unit': 'months', 
                'status': 'active',
                'features': [
                    ('Product Highlights', '15 products'),
                    ('Validity Period', '30 days'),
                    ('Search Visibility', 'Enhanced'),
                    ('Search Ranking', 'Higher ranking'),
                    ('Analytics Dashboard', 'Advanced'),
                    ('Priority Support', 'Yes'),
                ]
            },
        ]
        
        # Define feature descriptions (optional but helpful)
        feature_descriptions = {
            'Product Highlights': 'Number of products that can be highlighted',
            'Validity Period': 'How long the boost lasts',
            'Search Visibility': 'Level of visibility in search results',
            'Search Ranking': 'Position in search results',
            'Analytics Dashboard': 'Access to performance analytics',
            'Priority Support': 'Get faster support response',
        }
        
        # Create or get boost plans
        boost_plans = []
        for plan_data in boost_plans_data:
            # Use filter().first() instead of get() to handle duplicates
            existing_plan = BoostPlan.objects.filter(name=plan_data['name']).first()
            
            if existing_plan:
                plan = existing_plan
                self.stdout.write(self.style.WARNING(f"⚠️ Boost plan already exists: {plan_data['name']}"))
            else:
                plan = BoostPlan.objects.create(
                    name=plan_data['name'],
                    price=plan_data['price'],
                    duration=plan_data['duration'],
                    time_unit=plan_data['time_unit'],
                    status=plan_data['status'],
                    user=admin_user
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Created boost plan: {plan_data['name']}"))
            
            boost_plans.append(plan)
            
            # Create or get features for this plan
            for feature_name, feature_value in plan_data['features']:
                # Get or create the feature
                feature, created = BoostFeature.objects.get_or_create(
                    name=feature_name,
                    defaults={
                        'description': feature_descriptions.get(feature_name, ''),
                    }
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created feature: {feature_name}"))
                
                # Create or update the plan-feature relationship
                plan_feature, created = BoostPlanFeature.objects.get_or_create(
                    boost_plan=plan,
                    feature=feature,
                    defaults={'value': feature_value}
                )
                
                if not created:
                    # Update value if it exists but is different
                    if plan_feature.value != feature_value:
                        plan_feature.value = feature_value
                        plan_feature.save()
                        self.stdout.write(self.style.WARNING(f"⚠️ Updated feature value for {plan.name}: {feature_name} = {feature_value}"))
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {len(boost_plans)} boost plans with features"))
        
        # Create active boosts with real references
        boost_assignments = [
            ('Tech Haven', 3, 'Premium'),
            ('Gadget World', 1, 'Basic'),
            ('KeyClack', 5, 'Premium'),
            ('Connect Tech', 2, 'Premium'),
            ('Fashion Hub', 4, 'Premium'),
        ]
        
        total_boosts_created = 0
        
        for shop_name, boost_count, plan_name in boost_assignments:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop:
                shop_products = Product.objects.filter(shop=shop)
                plan = BoostPlan.objects.filter(name=plan_name).first()
                
                if shop_products.exists() and plan:
                    created_count = 0
                    for i in range(min(boost_count, len(shop_products))):
                        # Check if boost already exists
                        existing_boost = Boost.objects.filter(
                            product=shop_products[i],
                            shop=shop,
                            customer=shop.customer
                        ).first()
                        
                        if not existing_boost:
                            # Create boost with appropriate dates
                            from datetime import datetime
                            start_date = datetime(2025, 1, 15)  # Example start date
                            
                            Boost.objects.create(
                                product=shop_products[i],
                                boost_plan=plan,
                                shop=shop,
                                customer=shop.customer,
                                start_date=start_date,
                                # end_date will be auto-calculated in save() method
                            )
                            created_count += 1
                    
                    total_boosts_created += created_count
                    if created_count > 0:
                        self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} boosts for {shop_name}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"⚠️ All boosts already exist for {shop_name}"))
        
        self.stdout.write(self.style.SUCCESS(f"✅ Total boosts created: {total_boosts_created}"))
        
        # Optional: Display summary of created plans and features
        self.stdout.write("\n" + "="*50)
        self.stdout.write("BOOST PLANS SUMMARY")
        self.stdout.write("="*50)
        
        for plan in BoostPlan.objects.all():
            self.stdout.write(f"\n📋 {plan.name} (${plan.price}):")
            features = plan.features.select_related('feature').all()
            for pf in features:
                self.stdout.write(f"   • {pf.feature.name}: {pf.value}")
        
        return boost_plans

    def cleanup_duplicate_boost_plans(self):
        """Clean up duplicate BoostPlan records"""
        plan_names = ['Basic', 'Premium', 'Ultimate']
        
        for plan_name in plan_names:
            duplicates = BoostPlan.objects.filter(name=plan_name)
            if duplicates.count() > 1:
                self.stdout.write(self.style.WARNING(f"⚠️ Found {duplicates.count()} duplicate BoostPlans for {plan_name}"))
                
                # Keep the first one and delete the rest
                first_plan = duplicates.first()
                duplicates.exclude(id=first_plan.id).delete()
                
                self.stdout.write(self.style.SUCCESS(f"✅ Cleaned up duplicate BoostPlans for {plan_name}"))

    def create_shop_follows(self, shops, customers):
        """Create shop follows with real customer references"""
        follower_data = [
            ('Tech Haven', 1250),
            ('Gadget World', 890),
            ('KeyClack', 2100),
            ('Display Masters', 670),
            ('Connect Tech', 450),
            ('Fashion Hub', 1580),
        ]
        
        for shop_name, follower_count in follower_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop:
                created_count = 0
                # Create followers for this shop (limited to available customers)
                for i in range(min(follower_count, len(customers))):
                    customer = customers[i % len(customers)]
                    
                    # Check if follow already exists
                    existing_follow = ShopFollow.objects.filter(
                        customer=customer,
                        shop=shop
                    ).first()
                    
                    if not existing_follow:
                        ShopFollow.objects.create(
                            customer=customer,  # Real customer
                            shop=shop,         # Real shop
                        )
                        created_count += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} followers for {shop_name}"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ All followers already exist for {shop_name}"))

    def create_reviews(self, products, shops, customers):
        """Create reviews with real customer and shop references"""
        shop_rating_data = [
            ('Tech Haven', 4.8, 234),
            ('Gadget World', 4.5, 178),
            ('KeyClack', 4.9, 456),
            ('Display Masters', 4.7, 145),
            ('Connect Tech', 4.2, 89),
            ('Fashion Hub', 4.6, 312),
        ]
        
        for shop_name, avg_rating, total_ratings in shop_rating_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop and customers:  # Add check for empty customers list
                # Create reviews to achieve the target average and count
                ratings_to_create = self._calculate_ratings_for_average(avg_rating, total_ratings)
                created_count = 0
                
                for rating in ratings_to_create:
                    # Use different customers for reviews - handle empty customers list
                    customer_index = created_count % len(customers) if customers else 0
                    customer = customers[customer_index] if customers else None
                    
                    if customer:  # Only proceed if we have a customer
                        # Check if review already exists
                        existing_review = Review.objects.filter(
                            customer=customer,
                            shop=shop
                        ).first()
                        
                        if not existing_review:
                            Review.objects.create(
                                customer=customer,  # Real customer
                                shop=shop,         # Real shop
                                rating=rating,
                                comment=f"Great shop! Rating: {rating} stars for {shop_name}",
                            )
                            created_count += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} reviews for {shop_name} (avg: {avg_rating})"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ All reviews already exist for {shop_name}"))
            else:
                if not customers:
                    self.stdout.write(self.style.WARNING(f"⚠️ No customers available to create reviews for {shop_name}"))
                else:
                    self.stdout.write(self.style.WARNING(f"⚠️ Shop not found: {shop_name}"))

    def _calculate_ratings_for_average(self, target_avg, total_ratings):
        """Calculate ratings distribution to achieve target average"""
        import math
        
        ratings = []
        base_rating = math.floor(target_avg)
        decimal_part = target_avg - base_rating
        
        # Calculate how many of each rating we need
        higher_count = int(total_ratings * decimal_part)
        base_count = total_ratings - higher_count
        
        # Add ratings
        for i in range(higher_count):
            ratings.append(base_rating + 1)
        for i in range(base_count):
            ratings.append(base_rating)
        
        # Shuffle to mix ratings
        random.shuffle(ratings)
        return ratings
    
    def create_additional_data(self, products, customers, shops):
        """Create additional related data with real references"""
        # Create variants
        variant_count = 0
        for product in products:
            for i in range(min(3, 2)):
                variant, created = Variants.objects.get_or_create(
                    product=product,
                    shop=product.shop,
                    title=f"{product.name} - Variant {i+1}"
                )
                
                if created:
                    variant_count += 1
                    # Create variant options
                    for j in range(2):
                        VariantOptions.objects.get_or_create(
                            variant=variant,
                            title=f"Option {j+1}",
                            defaults={}
                        )
        
        if variant_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {variant_count} variants"))
        
        # Create some issues
        issue_count = 0
        for product in products[:8]:
            for i in range(min(2, 1)):
                issue, created = Issues.objects.get_or_create(
                    product=product,
                    description=f"Reported issue with {product.name}"
                )
                if created:
                    issue_count += 1
        
        if issue_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {issue_count} issues"))
        
        # Create favorites
        favorite_count = 0
        for i, customer in enumerate(customers[:5]):
            for j in range(3):
                if products:
                    favorite, created = Favorites.objects.get_or_create(
                        customer=customer,
                        product=products[(i + j) % len(products)],
                    )
                    if created:
                        favorite_count += 1
        
        if favorite_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {favorite_count} favorites"))

    def create_customer_activities(self, products, customers):
        """Create customer activities for engagement"""
        activity_count = 0
        
        # First, delete any existing duplicate CustomerActivity records
        self.stdout.write("🧹 Cleaning up duplicate customer activities...")
        
        # Find and delete duplicates (same customer, product, and activity_type)
        duplicates = CustomerActivity.objects.values(
            'customer', 'product', 'activity_type'
        ).annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        for dup in duplicates:
            # Keep the first one, delete the rest
            activities = CustomerActivity.objects.filter(
                customer=dup['customer'],
                product=dup['product'], 
                activity_type=dup['activity_type']
            ).order_by('created_at')
            
            if activities.count() > 1:
                # Delete all but the first one
                activities.exclude(id=activities.first().id).delete()
                self.stdout.write(f"   🗑️  Cleaned {activities.count() - 1} duplicates for customer {dup['customer']}")
        
        # Now create new activities safely
        for product in products:
            view_count = 100
            for i in range(min(view_count, len(customers))):
                customer = customers[i % len(customers)]
                
                # Use filter().first() instead of get_or_create() to avoid the unique constraint issue
                existing_activity = CustomerActivity.objects.filter(
                    customer=customer,
                    product=product,
                    activity_type='view'
                ).first()
                
                if not existing_activity:
                    activity_date = timezone.now() - timedelta(days=random.randint(1, 30))
                    
                    CustomerActivity.objects.create(
                        customer=customer,
                        product=product,
                        activity_type='view',
                        created_at=activity_date
                    )
                    activity_count += 1
        
        if activity_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {activity_count} customer activities"))

    # def create_boost_analytics_data(self, products, shops, customers, admin_user):
    #     """Create comprehensive boost analytics data for AdminBoosting ViewSet"""
    #     self.stdout.write("📊 Creating comprehensive boost analytics data...")
        
    #     # First, clean up any existing boost plans to avoid duplicates
    #     self.cleanup_duplicate_boost_plans()
        
    #     # Create comprehensive boost plans with different statuses
    #     boost_plans_data = [
    #         {'name': 'Basic Boost', 'price': Decimal('9.99'), 'duration': 7, 'time_unit': 'days', 'status': 'active'},
    #         {'name': 'Premium Boost', 'price': Decimal('19.99'), 'duration': 14, 'time_unit': 'days', 'status': 'active'},
    #         {'name': 'Ultimate Boost', 'price': Decimal('29.99'), 'duration': 30, 'time_unit': 'days', 'status': 'active'},
    #         {'name': 'Starter Boost', 'price': Decimal('4.99'), 'duration': 3, 'time_unit': 'days', 'status': 'archived'},
    #         {'name': 'Pro Boost', 'price': Decimal('49.99'), 'duration': 60, 'time_unit': 'days', 'status': 'active'},
    #     ]
        
    #     boost_plans = []
    #     for plan_data in boost_plans_data:
    #         existing_plan = BoostPlan.objects.filter(name=plan_data['name']).first()
            
    #         if not existing_plan:
    #             plan = BoostPlan.objects.create(
    #                 name=plan_data['name'],
    #                 price=plan_data['price'],
    #                 duration=plan_data['duration'],
    #                 time_unit=plan_data['time_unit'],
    #                 status=plan_data['status'],
    #                 user=admin_user
    #             )
    #             boost_plans.append(plan)
    #             self.stdout.write(self.style.SUCCESS(f"✅ Created boost plan: {plan_data['name']}"))
    #         else:
    #             boost_plans.append(existing_plan)
    #             self.stdout.write(self.style.WARNING(f"⚠️ Boost plan already exists: {plan_data['name']}"))
        
    #     # Create comprehensive boost records with different statuses and dates
    #     self.create_comprehensive_boosts(products, shops, customers, boost_plans)
        
    #     # Create boost usage patterns for analytics
    #     self.create_boost_usage_patterns(boost_plans, products, shops, customers)
        
    #     self.stdout.write(self.style.SUCCESS("✅ Comprehensive boost analytics data created!"))

    def create_comprehensive_boosts(self, products, shops, customers, boost_plans):
        """Create comprehensive boost records with various statuses and dates"""
        boost_statuses = ['active', 'expired', 'cancelled', 'pending']
        
        # Map shops to their products
        shop_products = {}
        for shop in shops:
            shop_products[shop.name] = Product.objects.filter(shop=shop)
        
        # Create boosts for different scenarios
        boost_assignments = [
            # Active boosts (current)
            ('Tech Haven', 3, 'Premium Boost', 'active', 0),
            ('Gadget World', 2, 'Basic Boost', 'active', 1),
            ('KeyClack', 4, 'Ultimate Boost', 'active', 2),
            ('Connect Tech', 2, 'Premium Boost', 'active', 3),
            ('Fashion Hub', 3, 'Pro Boost', 'active', 4),
            
            # Expired boosts (past end date)
            ('Tech Haven', 2, 'Basic Boost', 'expired', -10),
            ('Gadget World', 1, 'Premium Boost', 'expired', -15),
            ('Display Masters', 2, 'Basic Boost', 'expired', -20),
            
            # Expiring soon (within 7 days)
            ('KeyClack', 1, 'Premium Boost', 'active', 3),
            ('Connect Tech', 1, 'Basic Boost', 'active', 5),
            ('Fashion Hub', 2, 'Ultimate Boost', 'active', 6),
            
            # Cancelled boosts
            ('Display Masters', 1, 'Basic Boost', 'cancelled', -5),
            ('Gadget World', 1, 'Premium Boost', 'cancelled', -8),
        ]
        
        total_boosts_created = 0
        
        for shop_name, boost_count, plan_name, status, days_offset in boost_assignments:
            shop = Shop.objects.filter(name=shop_name).first()
            plan = BoostPlan.objects.filter(name=plan_name).first()
            
            if shop and plan and shop_products.get(shop_name):
                products_for_shop = shop_products[shop_name]
                
                created_count = 0
                for i in range(min(boost_count, len(products_for_shop))):
                    product = products_for_shop[i]
                    
                    # Check if boost already exists
                    existing_boost = Boost.objects.filter(
                        product=product,
                        shop=shop,
                        customer=shop.customer,
                        boost_plan=plan
                    ).first()
                    
                    if not existing_boost:
                        # Calculate dates based on status and offset using timezone-aware datetime
                        start_date = timezone.now() + timedelta(days=days_offset)
                        
                        if status == 'expired':
                            end_date = timezone.now() - timedelta(days=1)
                        elif status == 'cancelled':
                            end_date = timezone.now() + timedelta(days=days_offset + plan.duration)
                        else:  # active or pending
                            end_date = start_date + timedelta(days=plan.duration)
                        
                        boost = Boost.objects.create(
                            product=product,
                            boost_plan=plan,
                            shop=shop,
                            customer=shop.customer,
                            status=status,
                            start_date=start_date,
                            end_date=end_date
                        )
                        
                        # Set custom created_at for trend analysis using timezone-aware datetime
                        if days_offset < 0:
                            boost.created_at = timezone.now() + timedelta(days=days_offset)
                            boost.save()
                        
                        created_count += 1
                        total_boosts_created += 1
                
                if created_count > 0:
                    self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} {status} boosts for {shop_name}"))
        
        if total_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created total of {total_boosts_created} comprehensive boosts"))

    def create_boost_usage_patterns(self, boost_plans, products, shops, customers):
        """Create historical boost usage patterns for analytics"""
        self.stdout.write("📈 Creating boost usage patterns for analytics...")
        
        # Create historical boosts for trend analysis (last 6 months)
        months_data = [
            (-150, 8, 2),   # 5 months ago: 8 new, 2 expired
            (-120, 12, 4),  # 4 months ago: 12 new, 4 expired
            (-90, 15, 6),   # 3 months ago: 15 new, 6 expired
            (-60, 18, 8),   # 2 months ago: 18 new, 8 expired
            (-30, 22, 10),  # 1 month ago: 22 new, 10 expired
            (0, 25, 12),    # Current month: 25 new, 12 expired
        ]
        
        historical_boosts_created = 0
        
        for days_offset, new_boosts_count, expired_boosts_count in months_data:
            # Create new boosts for this period
            for i in range(new_boosts_count):
                shop = shops[i % len(shops)]
                plan = boost_plans[i % len(boost_plans)]
                shop_products = Product.objects.filter(shop=shop)
                
                if shop_products.exists():
                    product = shop_products[i % len(shop_products)]
                    
                    # Calculate dates for historical data using timezone-aware datetime
                    created_date = timezone.now() + timedelta(days=days_offset)
                    start_date = created_date
                    
                    if i < expired_boosts_count:
                        # Create expired boosts
                        end_date = created_date + timedelta(days=plan.duration - 15)  # Make them expired
                        status = 'expired'
                    else:
                        # Create active boosts (some might still be active)
                        end_date = created_date + timedelta(days=plan.duration)
                        status = 'active' if end_date > timezone.now() else 'expired'
                    
                    # Check if historical boost already exists
                    existing_boost = Boost.objects.filter(
                        product=product,
                        shop=shop,
                        customer=shop.customer,
                        boost_plan=plan,
                        created_at__date=created_date.date()
                    ).first()
                    
                    if not existing_boost:
                        boost = Boost.objects.create(
                            product=product,
                            boost_plan=plan,
                            shop=shop,
                            customer=shop.customer,
                            status=status,
                            start_date=start_date,
                            end_date=end_date
                        )
                        
                        # Set historical created_at using timezone-aware datetime
                        boost.created_at = created_date
                        boost.save()
                        
                        historical_boosts_created += 1
        
        if historical_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {historical_boosts_created} historical boosts for trend analysis"))
        
        # Create boost plan usage patterns
        self.create_boost_plan_usage(boost_plans, products, shops, customers)
        
        # Verify analytics data matches expected API response structure
        self.verify_analytics_data()

    def create_boost_plan_usage(self, boost_plans, products, shops, customers):
        """Create realistic boost plan usage patterns"""
        self.stdout.write("📊 Creating boost plan usage patterns...")
        
        # Define usage patterns for each plan
        usage_patterns = [
            ('Premium Boost', 15),  # Premium: 15 uses
            ('Basic Boost', 12),    # Basic: 12 uses
            ('Ultimate Boost', 8),  # Ultimate: 8 uses
            ('Pro Boost', 5),       # Pro: 5 uses
            ('Starter Boost', 3),   # Starter: 3 uses (archived)
        ]
        
        additional_boosts_created = 0
        
        for plan_name, usage_count in usage_patterns:
            plan = BoostPlan.objects.filter(name=plan_name).first()
            
            if plan:
                # Check current usage
                current_usage = Boost.objects.filter(boost_plan=plan).count()
                needed_usage = max(0, usage_count - current_usage)
                
                if needed_usage > 0:
                    # Create additional boosts to reach target usage
                    for i in range(needed_usage):
                        shop_index = i % len(shops)
                        shop = shops[shop_index]
                        shop_products = Product.objects.filter(shop=shop)
                        
                        if shop_products.exists():
                            product = shop_products[i % len(shop_products)]
                            
                            # Create boost with realistic dates using timezone-aware datetime
                            days_ago = (i % 30) + 1  # Spread over last 30 days
                            start_date = timezone.now() - timedelta(days=days_ago)
                            end_date = start_date + timedelta(days=plan.duration)
                            
                            status = 'active' if end_date > timezone.now() else 'expired'
                            
                            boost = Boost.objects.create(
                                product=product,
                                boost_plan=plan,
                                shop=shop,
                                customer=shop.customer,
                                status=status,
                                start_date=start_date,
                                end_date=end_date
                            )
                            
                            # Set historical created_at using timezone-aware datetime
                            boost.created_at = start_date
                            boost.save()
                            
                            additional_boosts_created += 1
        
        if additional_boosts_created > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Created {additional_boosts_created} additional boosts for usage patterns"))

    def verify_analytics_data(self):
        """Verify that the seeded data matches the expected API response structure"""
        self.stdout.write("🔍 Verifying analytics data structure...")
        
        # Check total metrics
        total_boosts = Boost.objects.count()
        active_boosts = Boost.objects.filter(status='active').count()
        total_boost_plans = BoostPlan.objects.count()
        active_boost_plans = BoostPlan.objects.filter(status='active').count()
        
        # Calculate revenue (sum of all boost plan prices)
        total_revenue_result = BoostPlan.objects.aggregate(
            total_revenue=Sum('price')
        )
        total_revenue = total_revenue_result['total_revenue'] or Decimal('0')
        
        # Calculate expiring soon (within 7 days)
        seven_days_later = timezone.now() + timedelta(days=7)
        expiring_soon = Boost.objects.filter(
            status='active',
            end_date__lte=seven_days_later,
            end_date__gte=timezone.now()
        ).count()
        
        self.stdout.write(self.style.SUCCESS("📊 Boost Analytics Summary:"))
        self.stdout.write(f"   • Total Boosts: {total_boosts}")
        self.stdout.write(f"   • Active Boosts: {active_boosts}")
        self.stdout.write(f"   • Total Boost Plans: {total_boost_plans}")
        self.stdout.write(f"   • Active Boost Plans: {active_boost_plans}")
        self.stdout.write(f"   • Total Revenue: ${float(total_revenue):.2f}")
        self.stdout.write(f"   • Expiring Soon: {expiring_soon}")
        
        # Check top plans by usage
        top_plans = BoostPlan.objects.annotate(
            usage_count=Count('boost')
        ).filter(usage_count__gt=0).order_by('-usage_count')[:5]
        
        self.stdout.write("🏆 Top Plans by Usage:")
        for plan in top_plans:
            self.stdout.write(f"   • {plan.name}: {plan.usage_count} uses")
        
        # Verify trend data
        try:
            # Get boosts created in the last 6 months
            six_months_ago = timezone.now() - timedelta(days=180)
            recent_boosts = Boost.objects.filter(created_at__gte=six_months_ago)
            
            # Group by month for trend analysis
            from django.db.models.functions import TruncMonth
            monthly_data = recent_boosts.annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_boosts=Count('id'),
                expired_boosts=Count('id', filter=Q(status='expired'))
            ).order_by('month')
            
            self.stdout.write("📈 Trend Data Available:")
            for data in monthly_data:
                month_name = data['month'].strftime('%B %Y')
                self.stdout.write(f"   • {month_name}: {data['new_boosts']} new, {data['expired_boosts']} expired")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Could not generate trend data: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("✅ Analytics data verification complete!"))

    def create_engagement_data(self):
        """Create only the engagement data that's missing"""
        self.stdout.write("🎯 Creating missing engagement data...")
        
        # Get existing products and customers
        products = Product.objects.all()
        customers = Customer.objects.all()
        
        if not products.exists():
            self.stdout.write(self.style.ERROR("❌ No products found. Please run full seeder first."))
            return
            
        if not customers.exists():
            self.stdout.write(self.style.ERROR("❌ No customers found. Please run full seeder first."))
            return
        
        # 1. Create Customer Activities (views)
        self.stdout.write("👀 Creating customer view activities...")
        activity_count = 0
        
        # Define view counts for each product to make it realistic
        view_counts = {
            'Running Shoes': 150,
            'Designer Handbag': 120,
            'Wireless Earbuds': 200,
            '4K Gaming Monitor': 80,
            'Mechanical Keyboard Pro': 95,
            'iPhone 15 Leather Case': 180,
            'Samsung Galaxy S24 Ultra': 220,
            'MacBook Pro 16" M3 Max': 75,
            'iPhone 15 Pro Max 1TB': 160,
        }
        
        for product in products:
            view_count = view_counts.get(product.name, 100)
            existing_views = CustomerActivity.objects.filter(product=product, activity_type='view').count()
            
            # Only create additional views if we don't have enough
            if existing_views < view_count:
                views_to_create = view_count - existing_views
                
                for i in range(min(views_to_create, len(customers) * 3)):
                    customer = customers[i % len(customers)]
                    
                    # Create view activity with random date in the past 30 days
                    activity_date = timezone.now() - timedelta(days=random.randint(1, 30))
                    
                    activity, created = CustomerActivity.objects.get_or_create(
                        customer=customer,
                        product=product,
                        activity_type='view',
                        created_at=activity_date,
                        defaults={}
                    )
                    if created:
                        activity_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {activity_count} customer view activities"))
        
        # 2. Create Favorites
        self.stdout.write("❤️ Creating favorites...")
        favorite_count = 0
        
        favorite_counts = {
            'Running Shoes': 25,
            'Designer Handbag': 18,
            'Wireless Earbuds': 30,
            '4K Gaming Monitor': 12,
            'Mechanical Keyboard Pro': 15,
            'iPhone 15 Leather Case': 22,
            'Samsung Galaxy S24 Ultra': 28,
            'MacBook Pro 16" M3 Max': 10,
            'iPhone 15 Pro Max 1TB': 20,
        }
        
        for product in products:
            target_favorites = favorite_counts.get(product.name, 15)
            existing_favorites = Favorites.objects.filter(product=product).count()
            
            if existing_favorites < target_favorites:
                favorites_to_create = target_favorites - existing_favorites
                
                for i in range(min(favorites_to_create, len(customers))):
                    customer = customers[i]
                    
                    favorite, created = Favorites.objects.get_or_create(
                        customer=customer,
                        product=product,
                    )
                    if created:
                        favorite_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {favorite_count} favorites"))
        
        # 3. Create Cart Items and Checkouts (simulating purchases)
        self.stdout.write("🛒 Creating cart items and checkouts...")
        cart_item_count = 0
        checkout_count = 0
        
        purchase_counts = {
            'Running Shoes': 45,
            'Designer Handbag': 28,
            'Wireless Earbuds': 35,
            '4K Gaming Monitor': 12,
            'Mechanical Keyboard Pro': 18,
            'iPhone 15 Leather Case': 40,
            'Samsung Galaxy S24 Ultra': 25,
            'MacBook Pro 16" M3 Max': 8,
            'iPhone 15 Pro Max 1TB': 15,
        }
        
        for product in products:
            target_purchases = purchase_counts.get(product.name, 10)
            existing_cart_items = CartItem.objects.filter(product=product).count()
            
            if existing_cart_items < target_purchases:
                cart_items_to_create = target_purchases - existing_cart_items
                
                for i in range(min(cart_items_to_create, len(customers))):
                    customer = customers[i]
                    
                    # Get the user from customer
                    user = customer.customer
                    
                    # Create cart item
                    cart_item, created = CartItem.objects.get_or_create(
                        product=product,
                        user=user,
                        defaults={
                            'quantity': 1,
                        }
                    )
                    if created:
                        cart_item_count += 1
                        
                        # Create checkout for this cart item (simulating completed purchase)
                        checkout_date = timezone.now() - timedelta(days=random.randint(1, 60))
                        
                        checkout, checkout_created = Checkout.objects.get_or_create(
                            cart_item=cart_item,
                            defaults={
                                'quantity': cart_item.quantity,
                                'total_amount': product.price * cart_item.quantity,
                                'status': 'completed',
                                'created_at': checkout_date,
                            }
                        )
                        if checkout_created:
                            checkout_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {cart_item_count} cart items and {checkout_count} checkouts"))
        
        # 4. Create Reviews with proper distribution
        self.stdout.write("⭐ Creating reviews with proper rating distribution...")
        review_count = 0
        
        shop_rating_data = [
            ('Tech Haven', 4.8, 23),
            ('Gadget World', 4.5, 17),
            ('KeyClack', 4.9, 21),
            ('Display Masters', 4.7, 14),
            ('Connect Tech', 4.2, 8),
            ('Fashion Hub', 4.6, 31),
        ]
        
        for shop_name, avg_rating, total_ratings in shop_rating_data:
            shop = Shop.objects.filter(name=shop_name).first()
            if shop and customers:
                existing_reviews = Review.objects.filter(shop=shop).count()
                
                if existing_reviews < total_ratings:
                    reviews_to_create = total_ratings - existing_reviews
                    ratings_to_create = self._calculate_ratings_for_average(avg_rating, reviews_to_create)
                    
                    for rating in ratings_to_create:
                        customer_index = review_count % len(customers)
                        customer = customers[customer_index]
                        
                        review, created = Review.objects.get_or_create(
                            customer=customer,
                            shop=shop,
                            rating=rating,
                            defaults={
                                'comment': f"Great shop! Rating: {rating} stars for {shop_name}",
                            }
                        )
                        if created:
                            review_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {review_count} reviews"))
        
        # 5. Verify the data was created
        self.verify_engagement_data()

    def verify_engagement_data(self):
        """Verify that engagement data was created properly"""
        self.stdout.write("🔍 Verifying engagement data...")
        
        # Check product engagement data
        products_with_engagement = Product.objects.annotate(
            view_count=Count('customeractivity'),
            favorite_count=Count('favorites'),
            cart_item_count=Count('cartitem')
        ).order_by('-view_count')
        
        self.stdout.write("📊 Product Engagement Summary:")
        for product in products_with_engagement:
            # Get checkout count for this product
            checkout_count = Checkout.objects.filter(
                cart_item__product=product,
                status='completed'
            ).count()
            
            total_engagement = product.view_count + product.favorite_count + product.cart_item_count
            self.stdout.write(f"   • {product.name}:")
            self.stdout.write(f"     - Views: {product.view_count}")
            self.stdout.write(f"     - Favorites: {product.favorite_count}")
            self.stdout.write(f"     - Cart Items: {product.cart_item_count}")
            self.stdout.write(f"     - Completed Checkouts: {checkout_count}")
            self.stdout.write(f"     - Total Engagement: {total_engagement}")
        
        # Check rating distribution
        rating_distribution = Review.objects.values('rating').annotate(
            count=Count('id')
        ).order_by('-rating')
        
        self.stdout.write("⭐ Rating Distribution:")
        for rating_data in rating_distribution:
            self.stdout.write(f"   • {rating_data['rating']} Stars: {rating_data['count']} reviews")
        
        self.stdout.write(self.style.SUCCESS("✅ Engagement data verification complete!"))
  
    def create_order_analytics_data(self):
        """Create analytics data for orders dashboard matching AdminOrders API"""
        self.stdout.write("📊 Creating order analytics data...")
        
        # Get actual data from the database to match the API response
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        # Create daily orders for the past 7 days (matching _get_analytics_data)
        daily_orders = []
        for i in range(6, -1, -1):  # Last 7 days including today
            date = today - timedelta(days=i)
            day_data = Order.objects.filter(created_at__date=date).aggregate(
                count=Count('order'),
                revenue=Sum('total_amount')
            )
            
            daily_orders.append({
                'date': date.strftime('%b %d'),
                'count': day_data['count'] or 0,
                'revenue': float(day_data['revenue'] or 0)
            })
        
        # Status distribution (matching _get_analytics_data)
        status_distribution = []
        status_counts = Order.objects.values('status').annotate(count=Count('order'))
        
        for status_data in status_counts:
            status_distribution.append({
                'name': status_data['status'].capitalize(),
                'value': status_data['count']
            })
        
        # Payment method distribution (matching _get_analytics_data)
        payment_method_distribution = []
        payment_counts = Order.objects.values('payment_method').annotate(count=Count('order'))
        
        for payment_data in payment_counts:
            payment_method_distribution.append({
                'name': payment_data['payment_method'],
                'value': payment_data['count']
            })
        
        self.stdout.write("📈 Order Analytics Summary:")
        self.stdout.write(f"   • Daily Orders: {len(daily_orders)} days of data")
        self.stdout.write(f"   • Status Distribution: {len(status_distribution)} statuses")
        self.stdout.write(f"   • Payment Methods: {len(payment_method_distribution)} methods")
        
        # Show sample data
        if daily_orders:
            self.stdout.write(f"   • Recent Daily Data: {daily_orders[-1]['count']} orders on {daily_orders[-1]['date']}")
        
        self.stdout.write(self.style.SUCCESS("✅ Order analytics data prepared matching AdminOrders API structure"))
        
    def create_order_data(self, products, customers, shops, admin_user):
        """Create order data first"""
        self.stdout.write("📦 Creating order data...")
        
        # Use existing customers or create test users if none exist
        if customers:
            order_users = [customer.customer for customer in customers[:10]]
        else:
            self.stdout.write("   ⚠️ No customers found, creating test users for orders...")
            order_users = []
            for i in range(5):
                user = User.objects.create(
                    username=f'ice_order_{i}',
                    email=f'order_user_{i}@example.com',
                    first_name=f'OrderUser{i}',
                    last_name='Test',
                    password=make_password('password123'),
                    is_customer=True
                )
                customer = Customer.objects.create(customer=user)
                order_users.append(user)
                self.stdout.write(f"   ✅ Created order user: {user.username}")
        
        # Payment methods for orders
        payment_methods = ['GCash', 'Credit Card', 'Bank Transfer', 'Cash']
        
        # Create Orders with different statuses
        all_orders = []
        
        # Create 20 orders with different statuses
        for i in range(20):
            user = random.choice(order_users)
            status = random.choice(['delivered', 'pending', 'cancelled'])
            
            order = Order.objects.create(
                user=user,
                status=status,
                total_amount=Decimal('0'),  # Will be updated with checkouts
                payment_method=random.choice(payment_methods),
                delivery_address_text=f"{random.randint(100, 999)} Main Street, City {random.randint(1, 10)}",
                created_at=timezone.now() - timedelta(days=random.randint(1, 30))
            )
            all_orders.append(order)
            self.stdout.write(f"   ✅ Created order {order.order} for {user.username}")
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {len(all_orders)} orders"))
        return all_orders

    def create_checkout_data(self, products, customers, shops, admin_user):
        """Create checkout data with order associations"""
        self.stdout.write("🛒 Creating checkout data...")
        
        # Create orders first
        orders = self.create_order_data(products, customers, shops, admin_user)
        
        # Create vouchers
        vouchers = [
            Voucher.objects.create(
                name="Winter Sale",
                code="WINTER50",
                discount_type="fixed",
                value=50.00,
                valid_until=timezone.now().date() + timedelta(days=30),
                created_by=admin_user,
                is_active=True
            ),
            Voucher.objects.create(
                name="Summer Discount", 
                code="SUMMER25",
                discount_type="fixed",
                value=25.00,
                valid_until=timezone.now().date() + timedelta(days=30),
                created_by=admin_user,
                is_active=True
            )
        ]
        
        # Get existing cart items instead of creating new ones
        cart_items = list(CartItem.objects.all())
        
        self.stdout.write(f"   🛍️ Found {len(cart_items)} existing cart items")
        
        # If no cart items exist, create some
        if not cart_items:
            self.stdout.write("   ⚠️ No cart items found, creating new ones...")
            # Use the same users that were created for orders
            order_users = User.objects.filter(username__startswith='order_user_')
            
            if not order_users.exists():
                # If no order users, get any available users
                order_users = User.objects.filter(is_customer=True)[:5]
                if not order_users.exists():
                    order_users = User.objects.all()[:5]
            
            for i, user in enumerate(order_users):
                if products:  # Check if products exist
                    product = products[i % len(products)]
                    # Use get_or_create to avoid duplicates
                    cart_item, created = CartItem.objects.get_or_create(
                        product=product,
                        user=user,
                        defaults={
                            'quantity': random.randint(1, 3),
                            'added_at': timezone.now() - timedelta(days=random.randint(1, 30))
                        }
                    )
                    if created:
                        cart_items.append(cart_item)
                        self.stdout.write(f"   ✅ Created cart item for {user.username}")
                    else:
                        cart_items.append(cart_item)
                        self.stdout.write(f"   ℹ️  Using existing cart item for {user.username}")
        
        # Check if we have cart items before proceeding
        if not cart_items:
            self.stdout.write("   ❌ No cart items could be created, skipping checkout creation")
            return
        
        self.stdout.write(f"   🛍️ Using {len(cart_items)} cart items")
        
        # Create checkouts and associate with orders
        checkout_count = 0
        
        for order in orders:
            # Each order gets 1-3 checkouts
            num_checkouts = random.randint(1, 3)
            order_total = Decimal('0')
            
            for i in range(num_checkouts):
                cart_item = random.choice(cart_items)
                use_voucher = random.choice([True, False])
                
                base_amount = cart_item.product.price * cart_item.quantity
                voucher_value = Decimal(str(vouchers[0].value)) if use_voucher else Decimal('0')
                total_amount = max(base_amount - voucher_value, Decimal('0'))
                order_total += total_amount
                
                # Create checkout with order foreign key
                Checkout.objects.create(
                    order=order,  # Foreign key to Order
                    cart_item=cart_item,
                    quantity=cart_item.quantity,
                    total_amount=total_amount,
                    status=order.status,  # Same status as order
                    voucher=vouchers[0] if use_voucher else None,
                    remarks=random.choice(['', 'Fast shipping', 'Gift wrapping']) if random.random() < 0.3 else '',
                    created_at=order.created_at
                )
                checkout_count += 1
            
            # Update order total amount
            order.total_amount = order_total
            order.save()
            self.stdout.write(f"   ✅ Created {num_checkouts} checkouts for order {order.order}")
        
        self.stdout.write(self.style.SUCCESS(f"✅ Created {checkout_count} checkouts with order associations"))

    def create_rider_data(self, customers, shops, admin_user):
        """Create comprehensive rider data with all related entities"""
        self.stdout.write("🏍️ Creating rider data...")
        
        # Create simple placeholder images (text-based)
        self.stdout.write("   🖼️ Creating placeholder images...")
        
        # Create rider users
        rider_users = []
        rider_data = [
            {
                'username': 'rider_john',
                'email': 'john.rider@example.com',
                'first_name': 'John',
                'last_name': 'Dela Cruz',
                'contact_number': '+639171234567',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'ABC123',
                'vehicle_brand': 'Honda',
                'vehicle_model': 'Click 125',
                'license_number': 'L123456789',
                'verified': True,
            },
            {
                'username': 'rider_maria',
                'email': 'maria.santos@example.com',
                'first_name': 'Maria',
                'last_name': 'Santos',
                'contact_number': '+639271234568',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'XYZ789',
                'vehicle_brand': 'Yamaha',
                'vehicle_model': 'NMAX',
                'license_number': 'L987654321',
                'verified': True,
            },
            {
                'username': 'rider_carlos',
                'email': 'carlos.gomez@example.com',
                'first_name': 'Carlos',
                'last_name': 'Gomez',
                'contact_number': '+639371234569',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'DEF456',
                'vehicle_brand': 'Suzuki',
                'vehicle_model': 'Skydrive',
                'license_number': 'L456789123',
                'verified': False,
            },
            {
                'username': 'rider_anna',
                'email': 'anna.reyes@example.com',
                'first_name': 'Anna',
                'last_name': 'Reyes',
                'contact_number': '+639471234570',
                'vehicle_type': 'Bicycle',
                'plate_number': 'GHI789',
                'vehicle_brand': 'Trinx',
                'vehicle_model': 'M136',
                'license_number': 'L789123456',
                'verified': True,
            },
            {
                'username': 'rider_miguel',
                'email': 'miguel.tan@example.com',
                'first_name': 'Miguel',
                'last_name': 'Tan',
                'contact_number': '+639571234571',
                'vehicle_type': 'Motorcycle',
                'plate_number': 'JKL012',
                'vehicle_brand': 'Kawasaki',
                'vehicle_model': 'Rouser',
                'license_number': 'L321654987',
                'verified': False,
            }
        ]
        
        riders = []
        for data in rider_data:
            # Create user
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'password': make_password('rider123'),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'contact_number': data['contact_number'],
                    'is_rider': True,
                }
            )
            
            if created:
                rider_users.append(user)
                self.stdout.write(f"   ✅ Created rider user: {user.username}")
            
            # Create placeholder image file names
            vehicle_image_name = f"vehicle_{data['plate_number']}.jpg"
            license_image_name = f"license_{data['license_number']}.jpg"
            
            # Create rider profile
            rider, rider_created = Rider.objects.get_or_create(
                rider=user,
                defaults={
                    'vehicle_type': data['vehicle_type'],
                    'plate_number': data['plate_number'],
                    'vehicle_brand': data['vehicle_brand'],
                    'vehicle_model': data['vehicle_model'],
                    'vehicle_image': f"riders/vehicles/{vehicle_image_name}",
                    'license_number': data['license_number'],
                    'license_image': f"riders/licenses/{license_image_name}",
                    'verified': data['verified'],
                    'approved_by': admin_user if data['verified'] else None,
                    'approval_date': timezone.now() if data['verified'] else None,
                }
            )
            
            if rider_created:
                riders.append(rider)
                status = "approved" if data['verified'] else "pending"
                self.stdout.write(f"   ✅ Created {status} rider: {user.first_name} {user.last_name}")
                self.stdout.write(f"      Vehicle: {data['vehicle_brand']} {data['vehicle_model']} ({data['plate_number']})")
                self.stdout.write(f"      License: {data['license_number']}")
        
        # Create actual placeholder image files
        self.create_placeholder_images(riders)
        
        # Rest of the method remains the same...
        self.stdout.write("   📦 Creating deliveries...")
        # ... (keep all the existing delivery, log, notification, review creation code)
        
        return riders

    def create_placeholder_images(self, riders):
        """Create simple placeholder image files for riders"""
        import os
        from django.conf import settings
        from PIL import Image, ImageDraw, ImageFont
        import random
        
        # Create directories if they don't exist
        vehicle_dir = os.path.join(settings.MEDIA_ROOT, 'riders/vehicles')
        license_dir = os.path.join(settings.MEDIA_ROOT, 'riders/licenses')
        
        os.makedirs(vehicle_dir, exist_ok=True)
        os.makedirs(license_dir, exist_ok=True)
        
        # Colors for different vehicle types
        vehicle_colors = {
            'Motorcycle': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
            'Bicycle': ['#A29BFE', '#FD79A8', '#FDCB6E', '#00B894', '#74B9FF']
        }
        
        created_count = 0
        
        for rider in riders:
            # Vehicle Image
            vehicle_color = random.choice(vehicle_colors.get(rider.vehicle_type, ['#3498db']))
            vehicle_image = Image.new('RGB', (400, 300), color=vehicle_color)
            draw = ImageDraw.Draw(vehicle_image)
            
            # Add some simple graphics
            draw.rectangle([50, 100, 350, 180], fill='#2c3e50')  # Vehicle body
            draw.ellipse([80, 200, 150, 270], fill='#34495e')    # Wheel
            draw.ellipse([250, 200, 320, 270], fill='#34495e')   # Wheel
            
            # Add text
            try:
                # Try to use a default font
                font = ImageFont.load_default()
                draw.text((200, 50), f"{rider.vehicle_brand}", fill='white', font=font, anchor='mm')
                draw.text((200, 250), rider.plate_number, fill='white', font=font, anchor='mm')
            except:
                # Fallback if font loading fails
                draw.text((200, 50), f"{rider.vehicle_brand}", fill='white', anchor='mm')
                draw.text((200, 250), rider.plate_number, fill='white', anchor='mm')
            
            vehicle_filename = f"vehicle_{rider.plate_number}.jpg"
            vehicle_path = os.path.join(vehicle_dir, vehicle_filename)
            vehicle_image.save(vehicle_path, 'JPEG', quality=85)
            
            # License Image
            license_image = Image.new('RGB', (400, 250), color='#f8f9fa')
            draw = ImageDraw.Draw(license_image)
            
            # License card design
            draw.rectangle([10, 10, 390, 240], outline='#dee2e6', width=2)
            draw.rectangle([15, 15, 385, 60], fill='#007bff')
            
            try:
                font = ImageFont.load_default()
                draw.text((200, 35), "DRIVER'S LICENSE", fill='white', font=font, anchor='mm')
                draw.text((50, 90), f"Name: {rider.rider.first_name} {rider.rider.last_name}", fill='black', font=font)
                draw.text((50, 120), f"License No: {rider.license_number}", fill='black', font=font)
                draw.text((50, 150), f"Vehicle: {rider.vehicle_type}", fill='black', font=font)
                draw.text((50, 180), f"Expires: 12/2026", fill='black', font=font)
            except:
                draw.text((200, 35), "DRIVER'S LICENSE", fill='white', anchor='mm')
                draw.text((50, 90), f"Name: {rider.rider.first_name} {rider.rider.last_name}", fill='black')
                draw.text((50, 120), f"License No: {rider.license_number}", fill='black')
                draw.text((50, 150), f"Vehicle: {rider.vehicle_type}", fill='black')
                draw.text((50, 180), f"Expires: 12/2026", fill='black')
            
            license_filename = f"license_{rider.license_number}.jpg"
            license_path = os.path.join(license_dir, license_filename)
            license_image.save(license_path, 'JPEG', quality=85)
            
            created_count += 1
        
        self.stdout.write(f"   🖼️ Created {created_count * 2} placeholder images (vehicles & licenses)")

    def cleanup_existing_data(self):
        """Delete existing data to prevent duplicates"""
        self.stdout.write("🧹 Cleaning up existing data...")
        
        # Define deletion order (respect foreign key constraints)
        models_to_clean = [
            'Checkout', 'Order', 'CartItem', 'CustomerActivity', 'Favorite', 'Review',
            'ShopReview', 'ShopFollower', 'Boost', 'BoostPlan', 'Product', 'Category', 
            'Shop', 'Customer', 'Rider', 'Voucher'
        ]
        
        for model_name in models_to_clean:
            try:
                model = apps.get_model('api', model_name)
                count, _ = model.objects.all().delete()
                if count:
                    self.stdout.write(f"   🗑️  Deleted {count} {model_name} records")
            except Exception as e:
                self.stdout.write(f"   ⚠️  Could not delete {model_name}: {e}")
        
        # Keep admin user but delete other users (except superusers)
        try:
            user_count = User.objects.filter(is_superuser=False).delete()[0]
            if user_count:
                self.stdout.write(f"   🗑️  Deleted {user_count} non-admin users")
        except Exception as e:
            self.stdout.write(f"   ⚠️  Could not delete users: {e}")

    
    def create_counter_refund_request(self, refund, shops):
        """Create counter refund request for negotiation"""
        try:
            # Find the shop for this order
            order = refund.order_id
            shop = Shop.objects.filter(customer__customer=order.user).first()
            
            if not shop:
                shop = random.choice(shops)
            
            counter_type = random.choice(['return', 'keep'])
            
            CounterRefundRequest.objects.create(
                counter_id=uuid.uuid4(),
                refund_id=refund,
                requested_by='seller',
                seller_id=shop.customer.customer if shop.customer else order.user,
                shop_id=shop,
                counter_refund_method=random.choice(['wallet', 'bank', 'voucher']),
                counter_refund_amount=Decimal(str(float(refund.total_refund_amount or 0) * random.uniform(0.3, 0.8))),
                counter_refund_type=counter_type,
                status='pending' if random.random() < 0.5 else 'accepted',
                notes=f"Counter offer from seller: {random.choice(['Partial refund', 'Store credit', 'Replacement'])}"
            )
        except Exception as e:
            self.stdout.write(f"⚠️ Error creating counter request: {str(e)}")
    
    def create_dispute_request(self, refund):
        """Create dispute request"""
        try:
            DisputeRequest.objects.create(
                id=uuid.uuid4(),
                refund_id=refund,
                requested_by=refund.requested_by,
                reason=f"Dispute regarding refund {refund.refund_id}: {random.choice(['Amount incorrect', 'Process too slow', 'Seller unresponsive'])}",
                status=random.choice(['filed', 'under_review', 'approved', 'rejected'])
            )
        except Exception as e:
            self.stdout.write(f"⚠️ Error creating dispute: {str(e)}")    
    
    def create_refund_media(self, refund):
        """Create sample refund media attachments"""
        media_types = [
            {'file_type': 'image', 'description': 'Damaged product photo'},
            {'file_type': 'image', 'description': 'Wrong item received'},
            {'file_type': 'image', 'description': 'Defective product'},
            {'file_type': 'video', 'description': 'Product unboxing video'},
            {'file_type': 'document', 'description': 'Return shipping label'},
            {'file_type': 'document', 'description': 'Proof of payment'}
        ]
        
        # Create 1-3 media files per refund
        for _ in range(random.randint(1, 3)):
            media_type = random.choice(media_types)
            RefundMedia.objects.create(
                refund=refund,
                file_data=f"refunds/sample_{media_type['file_type']}_{random.randint(1, 10)}.jpg",
                file_type=media_type['file_type']
            )

    def create_sample_orders(self, products, customers, shops):
        """Create sample orders if none exist"""
        self.stdout.write("   Creating sample orders for refunds...")
        
        orders = []
        for i in range(20):
            customer = random.choice(customers)
            order = Order.objects.create(
                order=uuid.uuid4(),
                user=customer.customer,
                status=random.choice(['completed', 'pending', 'cancelled']),
                total_amount=Decimal(random.uniform(100, 5000)),
                payment_method=random.choice(['Credit Card', 'GCash', 'PayMaya', 'Bank Transfer']),
                delivery_address=f"{random.randint(1, 999)} Sample Street, Barangay {random.randint(1, 99)}, Sample City",
                created_at=timezone.now() - timedelta(days=random.randint(1, 90))
            )
            orders.append(order)
        
        return orders


    def create_refund_data(self, products, customers, shops, admin_user):
        """Create comprehensive refund data for testing with correct field names"""
        self.stdout.write("💰 Creating refund data with correct field names...")
        
        try:
            from api.models import Refund
            self.stdout.write(f"Debug: Refund model fields: {[f.name for f in Refund._meta.fields]}")
            
            # Get some orders to create refunds for - only orders that can be refunded
            orders = Order.objects.filter(
                status__in=['delivered', 'processing', 'shipped'],
                total_amount__gt=0
            )[:5]  # Start with fewer for testing
            
            if not orders.exists():
                self.stdout.write(self.style.WARNING("⚠️ No refundable orders found."))
                return []
            
            refund_reasons = [
                "Product damaged during shipping",
                "Wrong item received", 
                "Product not as described",
                "Changed my mind",
                "Product arrived too late"
            ]
            
            refunds_created = []
            
            for i, order in enumerate(orders):
                try:
                    # Create the refund object first WITHOUT saving
                    refund = Refund(
                        order_id=order,
                        requested_by=order.user,
                        reason=random.choice(refund_reasons),
                        refund_type=random.choice(['return', 'keep']),
                        status='pending',
                        buyer_preferred_refund_method=random.choice(['wallet', 'bank', 'voucher']),
                        total_refund_amount=order.total_amount * Decimal('0.8'),  # 80% refund
                        approved_refund_amount=None,  # Will be set when processed
                    )
                    
                    # Save the refund
                    refund.save()
                    
                    refunds_created.append(refund)
                    self.stdout.write(f"  ✓ Created refund ID: {refund.refund_id} for order: {order.order}")
                    
                    # Create related refund data based on refund type
                    if refund.refund_type == 'return':
                        # Create return request
                        self.create_return_request(refund)
                        
                        # Create return address
                        if random.random() < 0.7:
                            shop = order.checkout_set.first().cart_item.product.shop if hasattr(order, 'checkout_set') else None
                            if shop:
                                ReturnAddress.objects.create(
                                    refund=refund,
                                    shop=shop,
                                    seller=shop.customer.customer if shop.customer else None,
                                    recipient_name=f"{shop.customer.customer.first_name} {shop.customer.customer.last_name}",
                                    contact_number=shop.customer.customer.contact_number or "09123456789",
                                    country="Philippines",
                                    province=shop.province,
                                    city=shop.city,
                                    barangay=shop.barangay,
                                    street=shop.street,
                                    zip_code="1234",
                                    created_by=shop.customer.customer
                                )
                    
                    # Create refund media for some refunds
                    if random.random() < 0.4:
                        RefundMedia.objects.create(
                            refund_id=refund,
                            file_type=random.choice(['image/jpeg', 'image/png']),
                            uploaded_by=refund.requested_by
                        )
                    
                except Exception as e:
                    self.stdout.write(f"  ✗ Error creating refund {i}: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            self.stdout.write(self.style.SUCCESS(f"✅ Created {len(refunds_created)} refund records"))
            return refunds_created
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error in create_refund_data: {str(e)}"))
            import traceback
            traceback.print_exc()
            return []
    

    def create_return_request(self, refund):
        """Create return request for return-type refunds"""
        try:
            # Check if ReturnRequestItem model exists and has correct fields
            return_request = ReturnRequestItem.objects.create(
                # Primary key is 'return_id' based on your model
                refund_id=refund,
                return_method=random.choice(['LBC Express', 'J&T Express', 'Ninja Van']),
                logistic_service=random.choice(['LBC Express', 'J&T Express', 'Ninja Van']),
                tracking_number=f"RTN{random.randint(1000000000, 9999999999)}",
                status='shipped' if random.random() < 0.5 else 'pending',
                shipped_at=timezone.now() - timedelta(days=random.randint(1, 7)) if random.random() < 0.5 else None,
                return_deadline=timezone.now() + timedelta(days=random.randint(7, 30))
            )
            
            # Create return media for some return requests
            if random.random() < 0.4:
                ReturnRequestMedia.objects.create(
                    return_id=return_request,
                    file_type=random.choice(['image/jpeg', 'image/png', 'application/pdf']),
                    file_data='',  # In real scenario, would have actual file
                    uploaded_by=refund.requested_by
                )
            
            return return_request
        except Exception as e:
            self.stdout.write(f"⚠️ Error creating return request: {str(e)}")
            return None

    def create_refund_analytics_data(self):
        """Create refund analytics data spanning multiple months"""
        self.stdout.write("📊 Creating refund analytics data...")
        
        # Create refunds spread across last 12 months for trend analysis
        current_date = timezone.now()
        
        for month_offset in range(12):
            month_date = current_date - timedelta(days=30 * month_offset)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Create 5-15 refunds per month
            num_refunds = random.randint(5, 15)
            
            for i in range(num_refunds):
                # Get random order
                order = Order.objects.order_by('?').first()
                if not order:
                    continue
                    
                # Random date within the month
                refund_date = month_start + timedelta(days=random.randint(0, 27))
                
                # Status distribution changes over time (more recent = more pending)
                if month_offset == 0:  # Current month
                    status_weights = {'pending': 6, 'waiting': 3, 'to process': 1}
                elif month_offset < 3:  # Last 3 months
                    status_weights = {'completed': 3, 'approved': 2, 'rejected': 1, 'pending': 2}
                else:  # Older months
                    status_weights = {'completed': 5, 'approved': 3, 'rejected': 2}
                
                status = random.choices(
                    list(status_weights.keys()), 
                    weights=list(status_weights.values())
                )[0]
                
                Refund.objects.create(
                    order_id=order,
                    requested_by=order.user,
                    reason=random.choice([
                        "Product damaged during shipping",
                        "Wrong item received",
                        "Product not as described",
                        "Changed my mind"
                    ]),
                    status=status,
                    requested_at=refund_date,
                    processed_at=refund_date + timedelta(days=random.randint(1, 14)) if status in ['completed', 'approved', 'rejected'] else None,
                    buyer_preferred_refund_method=random.choice(['wallet', 'bank', 'remittance', 'voucher']),
                    final_refund_method=random.choice(['wallet', 'bank', 'remittance', 'voucher']) if status in ['completed', 'approved'] else None
                    # REMOVED: preferred_refund_method_details and final_refund_method_details
                )


    def create_report_data(self, products, customers, shops, admin_user):
        """Create comprehensive report data for admin dashboard"""
        self.stdout.write("📊 Creating report data...")
        
        # Get or create moderators
        moderator_users = self.get_or_create_moderators()
        existing_users = User.objects.filter(is_customer=True)[:50]
        
        # Create reports
        reports = self.create_reports(existing_users, shops, products, moderator_users)
        
        # Create report actions
        self.create_report_actions(reports, admin_user, moderator_users)
        
        # Create report comments
        self.create_report_comments(reports, admin_user, moderator_users)
        
        # Update user and shop status based on reports
        self.update_suspension_status(reports)

    def get_or_create_moderators(self):
        """Get or create moderator users"""
        moderators = User.objects.filter(is_moderator=True)
        if not moderators.exists():
            moderators = []
            for i in range(3):
                moderator_user = User.objects.create(
                    username=f'moderator_{i+1}',
                    email=f'moderator_{i+1}@example.com',
                    password=make_password('temp_password_123'),
                    first_name=f'Moderator',
                    last_name=f'User {i+1}',
                    is_moderator=True
                )
                Moderator.objects.create(
                    moderator=moderator_user,
                    approval_status='approved'
                )
                moderators.append(moderator_user)
        return list(moderators)

    def create_reports(self, users, shops, products, moderators):
        """Create realistic report data"""
        self.stdout.write("📝 Creating reports...")
        
        report_reasons = [
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
        
        status_weights = [
            ('pending', 25),
            ('under_review', 20),
            ('resolved', 20),
            ('dismissed', 15),
            ('action_taken', 20),
        ]
        
        reports = []
        
        # Create account reports (67 as per your metrics)
        for i in range(67):
            reporter = random.choice(users)
            reported_user = random.choice([u for u in users if u != reporter])
            
            reason, reason_display = random.choice(report_reasons)
            status = self.weighted_choice(status_weights)
            
            report = Report.objects.create(
                reporter=reporter,
                report_type='account',
                reason=reason,
                description=f"User {reported_user.username} reported for {reason_display}. Additional details: {self.get_report_description(reason)}",
                status=status,
                reported_account=reported_user,
                assigned_moderator=random.choice(moderators) if status in ['under_review', 'resolved', 'action_taken'] else None,
                created_at=timezone.now() - timedelta(days=random.randint(1, 180)),
                resolved_at=timezone.now() - timedelta(days=random.randint(1, 30)) if status in ['resolved', 'action_taken', 'dismissed'] else None
            )
            reports.append(report)
        
        # Create product reports (45 as per your metrics)
        for i in range(45):
            reporter = random.choice(users)
            reported_product = random.choice(products)
            
            reason, reason_display = random.choice([r for r in report_reasons if r[0] in ['counterfeit', 'misleading', 'fraud', 'other']])
            status = self.weighted_choice(status_weights)
            
            report = Report.objects.create(
                reporter=reporter,
                report_type='product',
                reason=reason,
                description=f"Product '{reported_product.name}' reported for {reason_display}. Issues: {self.get_product_issues(reason)}",
                status=status,
                reported_product=reported_product,
                assigned_moderator=random.choice(moderators) if status in ['under_review', 'resolved', 'action_taken'] else None,
                created_at=timezone.now() - timedelta(days=random.randint(1, 180)),
                resolved_at=timezone.now() - timedelta(days=random.randint(1, 30)) if status in ['resolved', 'action_taken', 'dismissed'] else None
            )
            reports.append(report)
        
        # Create shop reports (44 as per your metrics)
        for i in range(44):
            reporter = random.choice(users)
            reported_shop = random.choice(shops)
            
            reason, reason_display = random.choice([r for r in report_reasons if r[0] in ['fraud', 'counterfeit', 'misleading', 'other']])
            status = self.weighted_choice(status_weights)
            
            report = Report.objects.create(
                reporter=reporter,
                report_type='shop',
                reason=reason,
                description=f"Shop '{reported_shop.name}' reported for {reason_display}. Concerns: {self.get_shop_issues(reason)}",
                status=status,
                reported_shop=reported_shop,
                assigned_moderator=random.choice(moderators) if status in ['under_review', 'resolved', 'action_taken'] else None,
                created_at=timezone.now() - timedelta(days=random.randint(1, 180)),
                resolved_at=timezone.now() - timedelta(days=random.randint(1, 30)) if status in ['resolved', 'action_taken', 'dismissed'] else None
            )
            reports.append(report)
        
        return reports

    def create_report_actions(self, reports, admin_user, moderators):
        """Create report actions for resolved reports"""
        self.stdout.write("⚡ Creating report actions...")
        
        action_types = [
            ('warning', 'Warning Issued'),
            ('suspension', 'Account Suspension'),
            ('product_removal', 'Product Removed'),
            ('shop_suspension', 'Shop Suspended'),
            ('content_removal', 'Content Removed'),
            ('no_action', 'No Action Taken'),
            ('other', 'Other'),
        ]
        
        for report in reports:
            if report.status in ['resolved', 'action_taken']:
                action_type, action_display = random.choice(action_types)
                
                ReportAction.objects.create(
                    report=report,
                    action_type=action_type,
                    description=f"Action taken: {action_display}. {self.get_action_description(action_type, report)}",
                    taken_by=random.choice([admin_user] + moderators),
                    duration_days=random.randint(1, 30) if action_type == 'suspension' else None,
                    taken_at=report.resolved_at or report.created_at + timedelta(days=random.randint(1, 7))
                )

    def create_report_comments(self, reports, admin_user, moderators):
        """Create internal comments for reports"""
        self.stdout.write("💬 Creating report comments...")
        
        comment_templates = [
            "Reviewing this case for potential policy violations.",
            "Need more information from the reporting user.",
            "This appears to be a legitimate concern.",
            "No clear violation detected based on current evidence.",
            "Escalating to senior moderator for review.",
            "Contacted the reported user for their response.",
            "Evidence collected and under analysis.",
            "Recommend {} action for this case.",
            "This user has previous similar reports.",
            "Case appears to be resolved appropriately."
        ]
        
        for report in reports:
            # Create 1-3 comments per report
            for _ in range(random.randint(1, 3)):
                commenter = random.choice([admin_user] + moderators)
                comment_text = random.choice(comment_templates)
                
                ReportComment.objects.create(
                    report=report,
                    user=commenter,
                    comment=comment_text,
                    is_internal=True,
                    created_at=report.created_at + timedelta(hours=random.randint(1, 48))
                )

    def update_suspension_status(self, reports):
        """Update user and shop suspension status based on reports"""
        self.stdout.write("🔄 Updating suspension status...")
        
        # Suspend some users based on report severity
        user_reports = [r for r in reports if r.report_type == 'account' and r.status == 'action_taken']
        for report in random.sample(user_reports, min(5, len(user_reports))):
            if report.reported_account:
                report.reported_account.is_suspended = True
                report.reported_account.suspension_reason = f"Multiple violations reported: {report.reason}"
                report.reported_account.suspended_until = timezone.now() + timedelta(days=30)
                report.reported_account.warning_count += 1
                report.reported_account.save()
        
        # Suspend some shops based on report severity
        shop_reports = [r for r in reports if r.report_type == 'shop' and r.status == 'action_taken']
        for report in random.sample(shop_reports, min(3, len(shop_reports))):
            if report.reported_shop:
                report.reported_shop.is_suspended = True
                report.reported_shop.suspension_reason = f"Multiple violations reported: {report.reason}"
                report.reported_shop.suspended_until = timezone.now() + timedelta(days=30)
                report.reported_shop.save()
        
        # Remove some products based on reports
        product_reports = [r for r in reports if r.report_type == 'product' and r.status == 'action_taken']
        for report in random.sample(product_reports, min(4, len(product_reports))):
            if report.reported_product:
                report.reported_product.is_removed = True
                report.reported_product.removal_reason = f"Reported for: {report.reason}"
                report.reported_product.removed_at = timezone.now()
                report.reported_product.save()

    def weighted_choice(self, choices):
        """Make a weighted random choice"""
        total = sum(weight for choice, weight in choices)
        r = random.uniform(0, total)
        upto = 0
        for choice, weight in choices:
            if upto + weight >= r:
                return choice
            upto += weight
        return choices[-1][0]

    def get_report_description(self, reason):
        """Get detailed description based on report reason"""
        descriptions = {
            'spam': 'User sending unsolicited messages and promotional content repeatedly.',
            'inappropriate_content': 'User sharing offensive or explicit content in public spaces.',
            'harassment': 'User engaging in targeted bullying and threatening behavior.',
            'fake_account': 'Profile appears to be impersonating someone or using fake identity.',
            'fraud': 'Suspicious financial activities and attempted scams detected.',
            'counterfeit': 'Selling replica items as genuine products.',
            'misleading': 'False advertising and inaccurate product descriptions.',
            'intellectual_property': 'Unauthorized use of copyrighted material or brand names.',
            'other': 'General community guideline violation requiring review.'
        }
        return descriptions.get(reason, 'Report requires moderator review.')

    def get_product_issues(self, reason):
        """Get product-specific issues"""
        issues = {
            'counterfeit': 'Product appears to be counterfeit or unauthorized replica.',
            'misleading': 'Product images and description do not match actual item.',
            'fraud': 'Pricing and availability information appears fraudulent.',
            'other': 'Product violates marketplace policies.'
        }
        return issues.get(reason, 'Product requires quality review.')

    def get_shop_issues(self, reason):
        """Get shop-specific issues"""
        issues = {
            'fraud': 'Shop engaging in fraudulent business practices.',
            'counterfeit': 'Multiple counterfeit products listed in shop.',
            'misleading': 'Shop information and policies are misleading.',
            'other': 'Shop operations violate marketplace terms.'
        }
        return issues.get(reason, 'Shop requires compliance review.')

    def get_action_description(self, action_type, report):
        """Get action description based on action type"""
        descriptions = {
            'warning': f'Formal warning issued for {report.reason} violation.',
            'suspension': f'Temporary suspension applied due to severity of {report.reason}.',
            'product_removal': f'Product removed from marketplace for {report.reason}.',
            'shop_suspension': f'Shop temporarily suspended pending investigation.',
            'content_removal': f'Violating content removed and user notified.',
            'no_action': f'No violation found after thorough investigation.',
            'other': f'Custom resolution applied based on case specifics.'
        }
        return descriptions.get(action_type, 'Action completed.')