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
        
        # # Check if data already exists
        # if Shop.objects.exists():
        #     self.stdout.write(self.style.WARNING("⚠️  Data already exists, skipping seed..."))
        #     return
        
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
                products = self.create_products(customers, shops, categories, admin_user)
                # self.create_engagement_data()
                
                # # Create boosts and boost plans
                self.create_boosts_and_plans(shops, customers, admin_user)
                
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
        """Create products with real customer and shop references, including variants"""
        # First, get or create admin categories dynamically
        try:
            admin_user_obj = User.objects.get(id=admin_user.id)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Admin user with ID {admin_user.user_id} not found"))
            return []
        
        # Define products data with variant information
        products_data = [
            # GOOD PRODUCTS 1-10
            {
                'name': 'iPhone 15 Pro Max 1TB - Sealed',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Brand new sealed iPhone 15 Pro Max with 1TB storage. Full warranty, original accessories included. Never opened.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'Natural Titanium 1TB',
                        'price': Decimal('1599.99'),
                        'quantity': 5,
                        'sku_code': 'IP15-NT-1TB',
                        'option_map': {'Color': 'Natural Titanium'},
                        'is_refundable': True,
                        'refund_days': 30,
                    }
                ]
            },
            {
                'name': 'Sony WH-1000XM5 Headphones',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Industry-leading noise canceling headphones with 30hr battery life. Includes carrying case and audio cable.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('399.99'),
                        'quantity': 15,
                        'sku_code': 'SONY-XM5-BLK',
                        'option_map': {'Color': 'Black'},
                    },
                    {
                        'title': 'Silver',
                        'price': Decimal('399.99'),
                        'quantity': 12,
                        'sku_code': 'SONY-XM5-SIL',
                        'option_map': {'Color': 'Silver'},
                    }
                ]
            },
            {
                'name': 'Samsung 49" Odyssey G9 Gaming Monitor',
                'category': 'TVs & Monitors',
                'shop': 'Display Masters',
                'condition': 'Like New',
                'status': 'Active',
                'description': '49-inch Dual QHD curved gaming monitor, 240Hz, 1ms response time. Used for 1 month, perfect condition, original box.',
                'is_refundable': True,
                'refund_days': 14,
                'variants': [
                    {
                        'title': 'G95SC Model with Smart Features',
                        'price': Decimal('1299.99'),
                        'quantity': 3,
                        'sku_code': 'SAM-OD9-G95',
                        'option_map': {'Model': 'G95SC'},
                    }
                ]
            },
            {
                'name': 'MacBook Pro 14" M3 Pro',
                'category': 'Laptops & Computers',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Apple MacBook Pro with M3 Pro chip, 18GB RAM, 512GB SSD. Space Black. Full factory warranty.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'Space Black 18GB/512GB',
                        'price': Decimal('1999.99'),
                        'quantity': 8,
                        'sku_code': 'MBP14-M3-18-512',
                        'option_map': {'Color': 'Space Black', 'RAM': '18GB', 'Storage': '512GB'},
                    }
                ]
            },
            {
                'name': 'DJI Mini 4 Pro Drone',
                'category': 'Cameras & Photography',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'DJI Mini 4 Pro with RC 2 controller, 4K/60fps HDR video, obstacle sensing. Includes 3 batteries and charging hub.',
                'is_refundable': True,
                'refund_days': 14,
                'variants': [
                    {
                        'title': 'Fly More Combo Plus',
                        'price': Decimal('1099.99'),
                        'quantity': 6,
                        'sku_code': 'DJI-M4P-FMC',
                        'option_map': {'Kit': 'Fly More Combo'},
                    }
                ]
            },
            {
                'name': 'Logitech MX Master 3S Mouse',
                'category': 'Computer Accessories',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Logitech MX Master 3S wireless mouse, 8K DPI, quiet clicks, MagSpeed scrolling. Compatible with Mac and Windows.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'Graphite',
                        'price': Decimal('99.99'),
                        'quantity': 25,
                        'sku_code': 'LOG-MX3S-GPH',
                        'option_map': {'Color': 'Graphite'},
                    },
                    {
                        'title': 'Pale Gray',
                        'price': Decimal('99.99'),
                        'quantity': 20,
                        'sku_code': 'LOG-MX3S-GRY',
                        'option_map': {'Color': 'Pale Gray'},
                    }
                ]
            },
            {
                'name': 'Apple Watch Series 9 GPS + Cellular',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Apple Watch Series 9 with blood oxygen app, ECG, always-on Retina display. Aluminum case with sport band.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': '45mm Midnight Aluminum',
                        'price': Decimal('499.99'),
                        'quantity': 10,
                        'sku_code': 'AW9-45-MID',
                        'option_map': {'Size': '45mm', 'Color': 'Midnight', 'Case': 'Aluminum'},
                    },
                    {
                        'title': '41mm Starlight Aluminum',
                        'price': Decimal('479.99'),
                        'quantity': 8,
                        'sku_code': 'AW9-41-STAR',
                        'option_map': {'Size': '41mm', 'Color': 'Starlight', 'Case': 'Aluminum'},
                    }
                ]
            },
            {
                'name': 'Nintendo Switch OLED Model',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Nintendo Switch OLED model with 7-inch OLED screen, 64GB internal storage, white Joy-Con controllers included.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'White Set',
                        'price': Decimal('349.99'),
                        'quantity': 12,
                        'sku_code': 'NS-OLED-WHT',
                        'option_map': {'Color': 'White'},
                    },
                    {
                        'title': 'Neon Red/Blue Set',
                        'price': Decimal('349.99'),
                        'quantity': 15,
                        'sku_code': 'NS-OLED-NEO',
                        'option_map': {'Color': 'Neon Red/Blue'},
                    }
                ]
            },
            {
                'name': 'Samsung Galaxy Tab S9 Ultra',
                'category': 'Smartphones & Tablets',
                'shop': 'Display Masters',
                'condition': 'Like New',
                'status': 'Active',
                'description': '14.6-inch Dynamic AMOLED 2X display, Snapdragon 8 Gen 2, 12GB RAM, 256GB storage. S Pen included.',
                'is_refundable': True,
                'refund_days': 14,
                'variants': [
                    {
                        'title': 'Graphite 12GB/256GB WiFi',
                        'price': Decimal('999.99'),
                        'quantity': 5,
                        'sku_code': 'S23U-GPH-256',
                        'option_map': {'Color': 'Graphite', 'Storage': '256GB'},
                    }
                ]
            },
            {
                'name': 'Bose QuietComfort Ultra Earbuds',
                'category': 'Audio & Headphones',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Bose QuietComfort Ultra wireless earbuds with spatial audio, immersive noise cancellation, and waterproof design.',
                'is_refundable': True,
                'refund_days': 30,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('299.99'),
                        'quantity': 18,
                        'sku_code': 'BOSE-QCU-BLK',
                        'option_map': {'Color': 'Black'},
                    },
                    {
                        'title': 'White Smoke',
                        'price': Decimal('299.99'),
                        'quantity': 15,
                        'sku_code': 'BOSE-QCU-WHT',
                        'option_map': {'Color': 'White Smoke'},
                    }
                ]
            },
            # PROBLEMATIC PRODUCTS 11-20 (Prohibited Items)
            {
                'name': 'Vintage Cigarette Collection',
                'category': 'Collectibles',
                'shop': 'Gadget World',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Collection of rare vintage cigarettes from 1980s. Unopened packs. Perfect for collectors. Smoke-free home.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '10 Pack Assortment',
                        'price': Decimal('199.99'),
                        'quantity': 2,
                        'sku_code': 'CIG-VINT-10',
                        'option_map': {'Pack': '10 Pack'},
                    }
                ]
            },
            {
                'name': 'Prescription Pain Killers',
                'category': 'Health & Wellness',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Unused prescription painkillers, still in original packaging. Expires 2025. Never opened.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '30 tablets',
                        'price': Decimal('150.00'),
                        'quantity': 1,
                        'sku_code': 'MEDS-PAIN-30',
                        'option_map': {'Quantity': '30 tablets'},
                    }
                ]
            },
            {
                'name': 'Replica Rolex Watch',
                'category': 'Fashion Accessories',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'High-quality replica Rolex Submariner. Looks exactly like the real thing. Stainless steel, automatic movement.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black Dial',
                        'price': Decimal('299.99'),
                        'quantity': 5,
                        'sku_code': 'REP-ROLEX-BLK',
                        'option_map': {'Color': 'Black Dial'},
                    }
                ]
            },
            {
                'name': 'Driver License Template',
                'category': 'Digital Products',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Editable driver license template for Photoshop. Create custom IDs. For entertainment purposes only.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'US License Template',
                        'price': Decimal('49.99'),
                        'quantity': 999,
                        'sku_code': 'DL-TEMP-US',
                        'option_map': {'Country': 'USA'},
                    }
                ]
            },
            {
                'name': 'Knife Collection - Tactical',
                'category': 'Sports & Outdoors',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Collection of tactical knives including switchblades and butterfly knives. Sharp blades, perfect for collection.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '5-Piece Set',
                        'price': Decimal('199.99'),
                        'quantity': 3,
                        'sku_code': 'KNIFE-TAC-5',
                        'option_map': {'Set': '5-Piece'},
                    }
                ]
            },
            {
                'name': 'Fake University Diploma',
                'category': 'Novelty',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Custom printed fake diploma from any university. Frame-ready, looks authentic. Great for pranks or decor.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Harvard Custom',
                        'price': Decimal('89.99'),
                        'quantity': 10,
                        'sku_code': 'DIPL-HARV',
                        'option_map': {'University': 'Harvard'},
                    },
                    {
                        'title': 'Yale Custom',
                        'price': Decimal('89.99'),
                        'quantity': 8,
                        'sku_code': 'DIPL-YALE',
                        'option_map': {'University': 'Yale'},
                    }
                ]
            },
            {
                'name': 'Lock Picking Set',
                'category': 'Tools',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional lock picking tools set. Includes tension wrenches, picks, and practice lock. For locksmiths only.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': '20-Piece Professional Kit',
                        'price': Decimal('79.99'),
                        'quantity': 7,
                        'sku_code': 'LOCK-PICK-20',
                        'option_map': {'Set': '20-Piece'},
                    }
                ]
            },
            {
                'name': 'Anabolic Steroids',
                'category': 'Sports Supplements',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Bodybuilding anabolic steroids for muscle growth. Fast results. Discreet packaging.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '12 week cycle',
                        'price': Decimal('499.99'),
                        'quantity': 2,
                        'sku_code': 'STER-12WK',
                        'option_map': {'Cycle': '12 weeks'},
                    }
                ]
            },
            {
                'name': 'Fireworks Assortment',
                'category': 'Party Supplies',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional grade fireworks assortment. Includes roman candles, mortars, and sparklers. Ground shipping only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Deluxe Show Box',
                        'price': Decimal('299.99'),
                        'quantity': 2,
                        'sku_code': 'FIRE-DELUXE',
                        'option_map': {'Box': 'Deluxe'},
                    }
                ]
            },
            {
                'name': 'Hacking Software Bundle',
                'category': 'Software',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Complete hacking software bundle with keyloggers, password crackers, and network intrusion tools. For educational use.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Ultimate Hacker Pack',
                        'price': Decimal('199.99'),
                        'quantity': 999,
                        'sku_code': 'HACK-ULT',
                        'option_map': {'Version': 'Ultimate'},
                    }
                ]
            },
            # 21-30: Products with misleading descriptions
            {
                'name': 'Vintage Apple Computer - Rare',
                'category': 'Collectibles',
                'shop': 'Tech Haven',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Rare vintage Apple computer from the 80s. Fully restored and working. Perfect for collectors.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Apple IIe',
                        'price': Decimal('1499.99'),
                        'quantity': 1,
                        'sku_code': 'VINT-APP2E',
                        'option_map': {'Model': 'Apple IIe'},
                    }
                ]
            },
            {
                'name': 'Genuine Leather Jacket',
                'category': 'Fashion',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '100% genuine leather jacket, premium quality, made in Italy.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Size M Black',
                        'price': Decimal('299.99'),
                        'quantity': 5,
                        'sku_code': 'LTHR-JKT-M',
                        'option_map': {'Size': 'M', 'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Gaming PC - RTX 4090',
                'category': 'Computers',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'High-end gaming PC with RTX 4090, i9-13900K, 64GB RAM, 2TB SSD. Perfect for 4K gaming.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'RTX 4090 Build',
                        'price': Decimal('3999.99'),
                        'quantity': 2,
                        'sku_code': 'PC-RTX4090',
                        'option_map': {'GPU': 'RTX 4090'},
                    }
                ]
            },
            {
                'name': 'Solid Gold Chain',
                'category': 'Jewelry',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '24k solid gold chain, 20 inches, heavy weight. Comes with certificate.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '20" Cuban Link',
                        'price': Decimal('1999.99'),
                        'quantity': 2,
                        'sku_code': 'GOLD-CHAIN-20',
                        'option_map': {'Length': '20"'},
                    }
                ]
            },
            {
                'name': 'New iPhone 15 - Unlocked',
                'category': 'Smartphones',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Brand new iPhone 15, factory unlocked, sealed in box. Full warranty.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'iPhone 15 Black 128GB',
                        'price': Decimal('799.99'),
                        'quantity': 3,
                        'sku_code': 'IP15-BLK-128',
                        'option_map': {'Color': 'Black', 'Storage': '128GB'},
                    }
                ]
            },
            {
                'name': 'Vintage Rolex Submariner',
                'category': 'Watches',
                'shop': 'Tech Haven',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Authentic vintage Rolex Submariner from 1970s. Serviced and running perfectly. Rare patina.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Ref 1680',
                        'price': Decimal('12999.99'),
                        'quantity': 1,
                        'sku_code': 'ROLEX-1680',
                        'option_map': {'Reference': '1680'},
                    }
                ]
            },
            {
                'name': 'Organic Essential Oils',
                'category': 'Health',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '100% organic, therapeutic grade essential oils. Cures anxiety, depression, and insomnia naturally.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Lavender 10ml',
                        'price': Decimal('29.99'),
                        'quantity': 20,
                        'sku_code': 'OIL-LAV-10',
                        'option_map': {'Type': 'Lavender'},
                    }
                ]
            },
            {
                'name': 'Miracle Weight Loss Pills',
                'category': 'Health',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Lose 10 pounds in 1 week guaranteed! Natural formula, no side effects. Doctor recommended.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '30 Day Supply',
                        'price': Decimal('89.99'),
                        'quantity': 50,
                        'sku_code': 'MIRACLE-30',
                        'option_map': {'Supply': '30 Days'},
                    }
                ]
            },
            {
                'name': 'Photography Workshop',
                'category': 'Services',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Learn photography from National Geographic photographer. Guaranteed to make you pro in 1 week.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Online Course',
                        'price': Decimal('499.99'),
                        'quantity': 999,
                        'sku_code': 'WORKSHOP-ONLINE',
                        'option_map': {'Format': 'Online'},
                    }
                ]
            },
            {
                'name': 'Unlocked Cell Phone',
                'category': 'Smartphones',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Unlocked smartphone, works with all carriers. Latest Android version. Great condition.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Generic Smartphone',
                        'price': Decimal('199.99'),
                        'quantity': 10,
                        'sku_code': 'GEN-SMART',
                        'option_map': {'Model': 'Generic'},
                    }
                ]
            },
            # 31-40: Products with inappropriate content
            {
                'name': 'Political Propaganda Posters',
                'category': 'Art',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Collection of political propaganda posters with offensive content and hate speech.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '10 Poster Set',
                        'price': Decimal('199.99'),
                        'quantity': 3,
                        'sku_code': 'POL-PROP-10',
                        'option_map': {'Set': '10 Posters'},
                    }
                ]
            },
            {
                'name': 'Adult Novelty Items',
                'category': 'Novelty',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Adult themed novelty items with explicit content. Not suitable for minors.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Explicit Gift Set',
                        'price': Decimal('79.99'),
                        'quantity': 5,
                        'sku_code': 'ADULT-GIFT',
                        'option_map': {'Set': 'Gift Set'},
                    }
                ]
            },
            {
                'name': 'Racist Memorabilia',
                'category': 'Collectibles',
                'shop': 'Display Masters',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Historical racist memorabilia from early 1900s. For museum display only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Collection of 5 Items',
                        'price': Decimal('599.99'),
                        'quantity': 1,
                        'sku_code': 'RACIST-COL',
                        'option_map': {'Set': '5 Items'},
                    }
                ]
            },
            {
                'name': 'Violent Video Game Mod',
                'category': 'Software',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Mod that adds extreme violence and gore to popular video games. Realistic blood and dismemberment.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Blood Mod Pack',
                        'price': Decimal('29.99'),
                        'quantity': 999,
                        'sku_code': 'MOD-BLOOD',
                        'option_map': {'Mod': 'Blood Pack'},
                    }
                ]
            },
            {
                'name': 'Offensive T-Shirts',
                'category': 'Fashion',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'T-shirts with offensive slogans and explicit language. Various sizes available.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Size L - Offensive Slogan',
                        'price': Decimal('29.99'),
                        'quantity': 10,
                        'sku_code': 'TSHIRT-OFF-L',
                        'option_map': {'Size': 'L'},
                    }
                ]
            },
            {
                'name': 'How to Hack Guide',
                'category': 'Books',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Complete guide to hacking social media accounts and stealing personal data. Step by step instructions.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'PDF Download',
                        'price': Decimal('49.99'),
                        'quantity': 999,
                        'sku_code': 'HACK-GUIDE',
                        'option_map': {'Format': 'PDF'},
                    }
                ]
            },
            {
                'name': 'Nude Art Photography',
                'category': 'Art',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Artistic nude photography collection. Explicit content. Adults only. Limited edition prints.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Print Set of 5',
                        'price': Decimal('299.99'),
                        'quantity': 2,
                        'sku_code': 'NUDE-ART-5',
                        'option_map': {'Set': '5 Prints'},
                    }
                ]
            },
            {
                'name': 'Drug Paraphernalia',
                'category': 'Novelty',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Decorative items that resemble drug paraphernalia. For collection only, not for actual use.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Smoking Accessory Set',
                        'price': Decimal('89.99'),
                        'quantity': 4,
                        'sku_code': 'SMOKE-SET',
                        'option_map': {'Set': 'Accessory Set'},
                    }
                ]
            },
            {
                'name': 'Hate Group Merchandise',
                'category': 'Fashion',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Merchandise from known hate groups. Flags, shirts, and accessories with hate symbols.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Flag',
                        'price': Decimal('59.99'),
                        'quantity': 2,
                        'sku_code': 'HATE-FLAG',
                        'option_map': {'Item': 'Flag'},
                    }
                ]
            },
            {
                'name': 'Explosive Instructions',
                'category': 'Books',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'The Anarchist Cookbook - Complete instructions for making explosives and illegal substances.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Digital Copy',
                        'price': Decimal('99.99'),
                        'quantity': 999,
                        'sku_code': 'ANARCHY-BOOK',
                        'option_map': {'Format': 'Digital'},
                    }
                ]
            },
            # 41-50: Products with intellectual property violations
            {
                'name': 'Counterfeit Nike Air Force 1',
                'category': 'Footwear',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Nike Air Force 1 shoes, exactly like originals. Unboxed, all sizes available.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Size 9 White',
                        'price': Decimal('89.99'),
                        'quantity': 15,
                        'sku_code': 'NIKE-AF1-9',
                        'option_map': {'Size': '9', 'Color': 'White'},
                    }
                ]
            },
            {
                'name': 'Bootleg Movie Collection',
                'category': 'Media',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Collection of 100+ recent Hollywood movies on USB drive. Still in theaters!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': '128GB USB - Movies',
                        'price': Decimal('49.99'),
                        'quantity': 20,
                        'sku_code': 'BOOT-MOV-128',
                        'option_map': {'Storage': '128GB'},
                    }
                ]
            },
            {
                'name': 'Fake Louis Vuitton Bag',
                'category': 'Fashion',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Louis Vuitton Neverfull replica, high quality, indistinguishable from original.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'MM Size',
                        'price': Decimal('199.99'),
                        'quantity': 3,
                        'sku_code': 'LV-REP-MM',
                        'option_map': {'Size': 'MM'},
                    }
                ]
            },
            {
                'name': 'Pirated Software Bundle',
                'category': 'Software',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Adobe Creative Cloud full suite - cracked version. Photoshop, Premiere, After Effects included.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Lifetime License',
                        'price': Decimal('99.99'),
                        'quantity': 999,
                        'sku_code': 'ADOBE-CRACK',
                        'option_map': {'Suite': 'Creative Cloud'},
                    }
                ]
            },
            {
                'name': 'Streaming Service Accounts',
                'category': 'Digital',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Premium Netflix accounts for sale. Lifetime access, 4K streaming, all devices.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Year Access',
                        'price': Decimal('29.99'),
                        'quantity': 100,
                        'sku_code': 'NETFLIX-1Y',
                        'option_map': {'Duration': '1 Year'},
                    }
                ]
            },
            {
                'name': 'Fake Supreme Clothing',
                'category': 'Fashion',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Supreme box logo hoodies, authentic looking, all colors and sizes.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Red Box Logo L',
                        'price': Decimal('79.99'),
                        'quantity': 8,
                        'sku_code': 'SUPREME-RED-L',
                        'option_map': {'Color': 'Red', 'Size': 'L'},
                    }
                ]
            },
            {
                'name': 'eBook Collection',
                'category': 'Books',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '10,000 bestselling eBooks in one download. All genres included. Instant access.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Complete Library',
                        'price': Decimal('19.99'),
                        'quantity': 999,
                        'sku_code': 'EBOOKS-10K',
                        'option_map': {'Collection': '10,000 Books'},
                    }
                ]
            },
            {
                'name': 'Replica Designer Sunglasses',
                'category': 'Accessories',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Replica Ray-Ban and Oakley sunglasses. UV protection included. Look like originals.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Aviator Style',
                        'price': Decimal('39.99'),
                        'quantity': 12,
                        'sku_code': 'SUN-REP-AV',
                        'option_map': {'Style': 'Aviator'},
                    }
                ]
            },
            {
                'name': 'Gaming Console Emulator',
                'category': 'Software',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Nintendo Switch emulator with 100+ pre-loaded ROMs. Play Switch games on PC.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Full Setup',
                        'price': Decimal('59.99'),
                        'quantity': 999,
                        'sku_code': 'SWITCH-EMU',
                        'option_map': {'Package': 'Full'},
                    }
                ]
            },
            {
                'name': 'Fake AirPods Pro',
                'category': 'Audio',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'AirPods Pro replica with noise cancellation and wireless charging. 1:1 copy.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'White',
                        'price': Decimal('49.99'),
                        'quantity': 25,
                        'sku_code': 'AIRPODS-REP',
                        'option_map': {'Color': 'White'},
                    }
                ]
            },
            # 51-60: Products with incomplete/insufficient information
            {
                'name': 'Electronic Device',
                'category': 'Electronics',
                'shop': 'Tech Haven',
                'condition': 'Unknown',
                'status': 'Active',
                'description': 'Some electronic device, works good.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('99.99'),
                        'quantity': 1,
                        'sku_code': 'ELEC-DEV-1',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Used Phone',
                'category': 'Smartphones',
                'shop': 'Gadget World',
                'condition': 'Used',
                'status': 'Active',
                'description': 'Phone for sale, works. Comes with charger.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Unknown Model',
                        'price': Decimal('149.99'),
                        'quantity': 1,
                        'sku_code': 'PHONE-USED',
                        'option_map': {'Type': 'Smartphone'},
                    }
                ]
            },
            {
                'name': 'Laptop',
                'category': 'Computers',
                'shop': 'Display Masters',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Good laptop for work and school. Fast.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Silver',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'LAPTOP-1',
                        'option_map': {'Color': 'Silver'},
                    }
                ]
            },
            {
                'name': 'Watch',
                'category': 'Watches',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Nice watch for men. Good condition.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Silver',
                        'price': Decimal('79.99'),
                        'quantity': 3,
                        'sku_code': 'WATCH-1',
                        'option_map': {'Color': 'Silver'},
                    }
                ]
            },
            {
                'name': 'Camera',
                'category': 'Photography',
                'shop': 'KeyClack',
                'condition': 'Used',
                'status': 'Active',
                'description': 'Digital camera, takes pictures. Includes battery.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('199.99'),
                        'quantity': 1,
                        'sku_code': 'CAM-1',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Gaming Chair',
                'category': 'Furniture',
                'shop': 'Tech Haven',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Comfortable gaming chair, good condition.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black/Red',
                        'price': Decimal('149.99'),
                        'quantity': 1,
                        'sku_code': 'CHAIR-1',
                        'option_map': {'Color': 'Black/Red'},
                    }
                ]
            },
            {
                'name': 'Headphones',
                'category': 'Audio',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Good sound quality.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('49.99'),
                        'quantity': 5,
                        'sku_code': 'HEAD-1',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Tablet',
                'category': 'Tablets',
                'shop': 'Display Masters',
                'condition': 'Used',
                'status': 'Active',
                'description': 'Android tablet, 10 inches.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Gray',
                        'price': Decimal('129.99'),
                        'quantity': 1,
                        'sku_code': 'TAB-1',
                        'option_map': {'Color': 'Gray'},
                    }
                ]
            },
            {
                'name': 'Keyboard',
                'category': 'Accessories',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Wireless keyboard for computer.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('34.99'),
                        'quantity': 10,
                        'sku_code': 'KEY-1',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Speakers',
                'category': 'Audio',
                'shop': 'KeyClack',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Computer speakers, loud.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black Pair',
                        'price': Decimal('29.99'),
                        'quantity': 2,
                        'sku_code': 'SPK-1',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            # 61-70: Products with suspicious pricing
            {
                'name': 'PlayStation 5 Console',
                'category': 'Gaming',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'PS5 Digital Edition, brand new, sealed. Too good to be true price!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Digital Edition',
                        'price': Decimal('199.99'),
                        'quantity': 10,
                        'sku_code': 'PS5-SUSPECT',
                        'option_map': {'Edition': 'Digital'},
                    }
                ]
            },
            {
                'name': 'RTX 4090 Graphics Card',
                'category': 'Computer Components',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'NVIDIA RTX 4090 24GB, brand new in box. Must sell quick!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Founders Edition',
                        'price': Decimal('899.99'),
                        'quantity': 3,
                        'sku_code': 'RTX4090-SCAM',
                        'option_map': {'Model': 'Founders'},
                    }
                ]
            },
            {
                'name': 'Apple Mac Studio',
                'category': 'Computers',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'M2 Ultra Mac Studio, top spec. Price reduced for quick sale!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'M2 Ultra 128GB/4TB',
                        'price': Decimal('2499.99'),
                        'quantity': 2,
                        'sku_code': 'MAC-STUDIO',
                        'option_map': {'Spec': 'Ultra'},
                    }
                ]
            },
            {
                'name': 'iPhone 15 Pro Max',
                'category': 'Smartphones',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Brand new iPhone 15 Pro Max 1TB. Cheap price!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Natural Titanium 1TB',
                        'price': Decimal('699.99'),
                        'quantity': 5,
                        'sku_code': 'IPHONE-CHEAP',
                        'option_map': {'Color': 'Natural'},
                    }
                ]
            },
            {
                'name': 'Samsung 85" 8K TV',
                'category': 'TVs',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Samsung 85-inch 8K QLED TV, moving sale, must go!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'QN900C Model',
                        'price': Decimal('1999.99'),
                        'quantity': 1,
                        'sku_code': 'TV-85-SCAM',
                        'option_map': {'Size': '85"'},
                    }
                ]
            },
            {
                'name': 'Gold Bullion Bars',
                'category': 'Investments',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '1kg gold bars, 99.99% pure. Selling below market price.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1kg Bar',
                        'price': Decimal('19999.99'),
                        'quantity': 2,
                        'sku_code': 'GOLD-1KG',
                        'option_map': {'Weight': '1kg'},
                    }
                ]
            },
            {
                'name': 'Diamond Ring',
                'category': 'Jewelry',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '3 carat diamond ring, GIA certified. Emergency sale!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Platinum Setting',
                        'price': Decimal('2999.99'),
                        'quantity': 1,
                        'sku_code': 'DIAMOND-SCAM',
                        'option_map': {'Metal': 'Platinum'},
                    }
                ]
            },
            {
                'name': 'Canon R3 Camera',
                'category': 'Photography',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Canon EOS R3 professional camera, shop liquidation sale!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Body Only',
                        'price': Decimal('1999.99'),
                        'quantity': 2,
                        'sku_code': 'CANON-R3',
                        'option_map': {'Config': 'Body'},
                    }
                ]
            },
            {
                'name': 'Herman Miller Chair',
                'category': 'Furniture',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Herman Miller Aeron chair, fully loaded. Too cheap to pass up!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Size B Graphite',
                        'price': Decimal('299.99'),
                        'quantity': 3,
                        'sku_code': 'HM-AERON',
                        'option_map': {'Size': 'B'},
                    }
                ]
            },
            {
                'name': 'Louis Vuitton Bag',
                'category': 'Fashion',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Authentic Louis Vuitton Neverfull, desperate seller!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'GM Size',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'LV-SCAM',
                        'option_map': {'Size': 'GM'},
                    }
                ]
            },
            # 71-80: Products with policy violations (bulk/wholesale on consumer platform)
            {
                'name': 'Wholesale Pallet - Mixed Electronics',
                'category': 'Wholesale',
                'shop': 'Tech Haven',
                'condition': 'Mixed',
                'status': 'Active',
                'description': 'Full pallet of returned electronics. 100+ items including phones, tablets, laptops. As-is condition.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Standard Pallet',
                        'price': Decimal('2999.99'),
                        'quantity': 1,
                        'sku_code': 'PALLET-1',
                        'option_map': {'Type': 'Mixed Electronics'},
                    }
                ]
            },
            {
                'name': 'Bulk Lot 100 iPhones',
                'category': 'Wholesale',
                'shop': 'Gadget World',
                'condition': 'Used',
                'status': 'Active',
                'description': 'Lot of 100 used iPhones, various models. Perfect for resellers. Unlocked.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '100 Units Mixed',
                        'price': Decimal('19999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-100',
                        'option_map': {'Quantity': '100 Units'},
                    }
                ]
            },
            {
                'name': 'Case of 50 AirPods',
                'category': 'Wholesale',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Wholesale case of 50 AirPods Pro. Sealed units. Bulk pricing.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '50 Units',
                        'price': Decimal('7499.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-AIRPODS',
                        'option_map': {'Quantity': '50'},
                    }
                ]
            },
            {
                'name': 'Wholesale Samsung Phones',
                'category': 'Wholesale',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '20 Samsung S24 Ultras, wholesale lot. Factory sealed. Bulk discount.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '20 Units',
                        'price': Decimal('19999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-S24',
                        'option_map': {'Quantity': '20'},
                    }
                ]
            },
            {
                'name': 'Pallet of Video Games',
                'category': 'Wholesale',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Pallet of 500+ video games for PS5, Xbox, Switch. Mixed titles.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '500+ Games',
                        'price': Decimal('4999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-GAMES',
                        'option_map': {'Quantity': '500+'},
                    }
                ]
            },
            {
                'name': 'Bulk Laptop Lot',
                'category': 'Wholesale',
                'shop': 'Tech Haven',
                'condition': 'Refurbished',
                'status': 'Active',
                'description': '30 refurbished business laptops, Dell and HP. Grade A condition. Perfect for business.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '30 Units',
                        'price': Decimal('8999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-LAPTOP',
                        'option_map': {'Quantity': '30'},
                    }
                ]
            },
            {
                'name': 'Wholesale Smart Watches',
                'category': 'Wholesale',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '50 smart watches, various brands. Bulk lot for resellers.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '50 Units',
                        'price': Decimal('2499.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-WATCH',
                        'option_map': {'Quantity': '50'},
                    }
                ]
            },
            {
                'name': 'Case of 100 Power Banks',
                'category': 'Wholesale',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '100 power banks, 10000mAh each. Wholesale case, retail packaging.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '100 Units',
                        'price': Decimal('1499.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-POWER',
                        'option_map': {'Quantity': '100'},
                    }
                ]
            },
            {
                'name': 'Bulk Headphones Lot',
                'category': 'Wholesale',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '200 pairs of wireless earbuds, bulk wholesale lot. White label.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '200 Units',
                        'price': Decimal('3999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-EAR',
                        'option_map': {'Quantity': '200'},
                    }
                ]
            },
            {
                'name': 'Wholesale Phone Cases',
                'category': 'Wholesale',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '500 phone cases, assorted models and colors. Bulk reseller lot.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '500 Units',
                        'price': Decimal('999.99'),
                        'quantity': 1,
                        'sku_code': 'BULK-CASES',
                        'option_map': {'Quantity': '500'},
                    }
                ]
            },
            # 81-90: Products with seller credibility issues
            {
                'name': 'iPhone 14 Pro Max',
                'category': 'Smartphones',
                'shop': 'Tech Haven',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'iPhone 14 Pro Max, works perfectly. Selling because I got new phone.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Deep Purple 256GB',
                        'price': Decimal('699.99'),
                        'quantity': 1,
                        'sku_code': 'IP14-SELLER1',
                        'option_map': {'Color': 'Deep Purple'},
                    }
                ]
            },
            {
                'name': 'PlayStation 5 Console',
                'category': 'Gaming',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'PS5 Disc Version, brand new. DM me for details.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Disc Version',
                        'price': Decimal('649.99'),
                        'quantity': 2,
                        'sku_code': 'PS5-NEW',
                        'option_map': {'Version': 'Disc'},
                    }
                ]
            },
            {
                'name': 'MacBook Pro M3',
                'category': 'Laptops',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Brand new MacBook Pro M3, still sealed. Need cash urgently.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Space Black',
                        'price': Decimal('1799.99'),
                        'quantity': 1,
                        'sku_code': 'MBP-SCAM',
                        'option_map': {'Color': 'Space Black'},
                    }
                ]
            },
            {
                'name': 'Samsung 65" OLED TV',
                'category': 'TVs',
                'shop': 'Connect Tech',
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Samsung S95B OLED, used 1 month. Moving abroad.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': '65" S95B',
                        'price': Decimal('1299.99'),
                        'quantity': 1,
                        'sku_code': 'TV-SCAM',
                        'option_map': {'Size': '65"'},
                    }
                ]
            },
            {
                'name': 'Nintendo Switch OLED',
                'category': 'Gaming',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Switch OLED White, brand new. Cheap!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'White',
                        'price': Decimal('279.99'),
                        'quantity': 1,
                        'sku_code': 'NS-SCAM',
                        'option_map': {'Color': 'White'},
                    }
                ]
            },
            {
                'name': 'Canon EOS R6',
                'category': 'Cameras',
                'shop': 'Tech Haven',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Canon R6 with low shutter count. Great condition.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Body Only',
                        'price': Decimal('1599.99'),
                        'quantity': 1,
                        'sku_code': 'CAM-SCAM',
                        'option_map': {'Config': 'Body'},
                    }
                ]
            },
            {
                'name': 'DJI Mavic 3 Pro',
                'category': 'Drones',
                'shop': 'Gadget World',
                'condition': 'Like New',
                'status': 'Active',
                'description': 'DJI Mavic 3 Pro Fly More Combo, barely used.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Fly More Combo',
                        'price': Decimal('1899.99'),
                        'quantity': 1,
                        'sku_code': 'DRONE-SCAM',
                        'option_map': {'Kit': 'Fly More'},
                    }
                ]
            },
            {
                'name': 'iPad Pro 12.9"',
                'category': 'Tablets',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'iPad Pro M2, WiFi + Cellular, 1TB. Unopened.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Space Gray 1TB',
                        'price': Decimal('1299.99'),
                        'quantity': 1,
                        'sku_code': 'IPAD-SCAM',
                        'option_map': {'Color': 'Space Gray'},
                    }
                ]
            },
            {
                'name': 'Bose Soundbar 900',
                'category': 'Audio',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Bose Smart Soundbar 900 with Dolby Atmos. Still in box.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Black',
                        'price': Decimal('699.99'),
                        'quantity': 1,
                        'sku_code': 'BOSE-SCAM',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': 'Xbox Series X',
                'category': 'Gaming',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Xbox Series X, brand new. Includes extra controller.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Xbox Series X',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'XBOX-SCAM',
                        'option_map': {'Console': 'Series X'},
                    }
                ]
            },
            # 91-100: Borderline cases - products that need moderator review
            {
                'name': 'Refurbished iPhone 12 - No Battery',
                'category': 'Smartphones',
                'shop': 'Tech Haven',
                'condition': 'Refurbished',
                'status': 'Active',
                'description': 'Refurbished iPhone 12, fully functional except needs new battery. Great project phone.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '64GB Blue',
                        'price': Decimal('199.99'),
                        'quantity': 3,
                        'sku_code': 'IP12-REFURB',
                        'option_map': {'Storage': '64GB'},
                    }
                ]
            },
            {
                'name': 'Custom Built PC - No OS',
                'category': 'Computers',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Custom gaming PC with RTX 3070, 32GB RAM. No operating system installed. Buyer needs to install OS.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'RTX 3070 Build',
                        'price': Decimal('899.99'),
                        'quantity': 2,
                        'sku_code': 'PC-NOOS',
                        'option_map': {'GPU': 'RTX 3070'},
                    }
                ]
            },
            {
                'name': 'Vintage Sony Walkman - Parts Only',
                'category': 'Collectibles',
                'shop': 'Display Masters',
                'condition': 'For Parts',
                'status': 'Active',
                'description': 'Vintage Sony Walkman TPS-L2. For parts/repair only. Does not power on. Great for display or restoration project.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Yellowed condition',
                        'price': Decimal('149.99'),
                        'quantity': 1,
                        'sku_code': 'WALKMAN-PARTS',
                        'option_map': {'Condition': 'Parts Only'},
                    }
                ]
            },
            {
                'name': 'Drone with Damaged Propellers',
                'category': 'Drones',
                'shop': 'Connect Tech',
                'condition': 'Used - Fair',
                'status': 'Active',
                'description': 'DJI Mini 2, works perfectly but needs new propellers. Minor scratches. Includes extra batteries.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Needs Propellers',
                        'price': Decimal('249.99'),
                        'quantity': 1,
                        'sku_code': 'DJI-DAMAGE',
                        'option_map': {'Condition': 'For Repair'},
                    }
                ]
            },
            {
                'name': 'Graphics Card - Fan Noise',
                'category': 'Components',
                'shop': 'KeyClack',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'RTX 3080 Ti, works great but one fan makes noise. Easy fan replacement or use with custom loop.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'ASUS TUF',
                        'price': Decimal('499.99'),
                        'quantity': 1,
                        'sku_code': 'RTX3080-NOISY',
                        'option_map': {'Brand': 'ASUS'},
                    }
                ]
            },
            {
                'name': 'Smartwatch - Screen Burn In',
                'category': 'Wearables',
                'shop': 'Tech Haven',
                'condition': 'Used - Fair',
                'status': 'Active',
                'description': 'Apple Watch Series 7, has slight screen burn-in from always-on display. Still functional.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '45mm Aluminum',
                        'price': Decimal('199.99'),
                        'quantity': 1,
                        'sku_code': 'AW7-BURN',
                        'option_map': {'Size': '45mm'},
                    }
                ]
            },
            {
                'name': 'Laptop - Hinge Broken',
                'category': 'Laptops',
                'shop': 'Gadget World',
                'condition': 'Used - Fair',
                'status': 'Active',
                'description': 'Dell XPS 13, broken hinge but works perfectly when connected to external monitor. Great for desktop use.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'XPS 13 9310',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'XPS-BROKEN',
                        'option_map': {'Model': '9310'},
                    }
                ]
            },
            {
                'name': 'Mechanical Keyboard - Missing Keys',
                'category': 'Accessories',
                'shop': 'Display Masters',
                'condition': 'Used - Fair',
                'status': 'Active',
                'description': 'Custom mechanical keyboard, missing 3 keycaps. Cherry MX Brown switches. Great for parts or repair.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': '60% Layout',
                        'price': Decimal('49.99'),
                        'quantity': 1,
                        'sku_code': 'KB-MISSING',
                        'option_map': {'Size': '60%'},
                    }
                ]
            },
            {
                'name': 'Monitor - Scratch on Screen',
                'category': 'Monitors',
                'shop': 'Connect Tech',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'LG 27" 4K monitor, has small scratch on screen but not noticeable during use. Perfect otherwise.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '27UK850-W',
                        'price': Decimal('249.99'),
                        'quantity': 1,
                        'sku_code': 'LG-SCRATCH',
                        'option_map': {'Model': '27UK850'},
                    }
                ]
            },
            {
                'name': 'Camera Lens - Haze Inside',
                'category': 'Photography',
                'shop': 'KeyClack',
                'condition': 'Used - Fair',
                'status': 'Active',
                'description': 'Canon 24-70mm f/2.8L, has internal haze but doesn\'t affect image quality. Great for vintage look.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Mark I',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'LENS-HAZE',
                        'option_map': {'Version': 'Mark I'},
                    }
                ]
            },
            # ADDITIONAL 100 PRODUCTS (101-200)
            # Time-limited deals (101-110)
            {
                'name': 'FLASH SALE! iPhone 15 Pro Max 50% OFF TODAY ONLY',
                'category': 'Smartphones & Tablets',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '🔥 LAST DAY! 🔥 iPhone 15 Pro Max 1TB. Regular price $1599, today only $799! Limited stock! 10 units available! ⏰ Sale ends midnight!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Natural Titanium 1TB - FLASH SALE',
                        'price': Decimal('799.99'),
                        'quantity': 10,
                        'sku_code': 'IP15-FLASH-NT',
                        'option_map': {'Color': 'Natural Titanium', 'Promo': 'Flash Sale'},
                    }
                ]
            },
            {
                'name': 'PlayStation 5 - 24 HOUR DEAL!!!',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '🚨🚨🚨 24 HOURS ONLY! 🚨🚨🚨 PS5 Disc Version with extra controller. Normally $560, now $449! Hurry! ⏰⏰⏰',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'PS5 Disc Edition + Extra Controller',
                        'price': Decimal('449.99'),
                        'quantity': 5,
                        'sku_code': 'PS5-24HR',
                        'option_map': {'Bundle': 'With Extra Controller'},
                    }
                ]
            },
            {
                'name': 'MacBook Pro M3 - WEEKEND SPECIAL',
                'category': 'Laptops & Computers',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '⚡⚡ WEEKEND FLASH SALE! ⚡⚡ MacBook Pro 14" M3 Pro. Save $500 this weekend only! Don\'t miss out!',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Space Black 18GB/512GB',
                        'price': Decimal('1499.99'),
                        'quantity': 3,
                        'sku_code': 'MBP-WKND',
                        'option_map': {'Color': 'Space Black', 'Storage': '512GB'},
                    }
                ]
            },
            {
                'name': 'Samsung 85" 8K TV - PRICE DROP!!!',
                'category': 'TVs & Monitors',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '💰💰 PRICE DROP! 💰💰 Samsung 85" 8K QLED. Was $5000, NOW $2999! LIMITED TIME! FREE delivery!',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'QN900C 85"',
                        'price': Decimal('2999.99'),
                        'quantity': 2,
                        'sku_code': 'TV-PRICEDROP',
                        'option_map': {'Size': '85"', 'Model': 'QN900C'},
                    }
                ]
            },
            {
                'name': 'AirPods Max - TODAY ONLY $399!!!',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '🎧🎧 TODAY ONLY! 🎧🎧 AirPods Max Silver. Regular $549, today $399! 5 units available! First come first served!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Silver - Today Only',
                        'price': Decimal('399.99'),
                        'quantity': 5,
                        'sku_code': 'APM-FLASH',
                        'option_map': {'Color': 'Silver'},
                    }
                ]
            },
            {
                'name': 'LIMITED TIME! DJI Mini 4 Pro Bundle',
                'category': 'Cameras & Photography',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '🎁🎁 LIMITED TIME BUNDLE! 🎁🎁 DJI Mini 4 Pro Fly More Combo + Extra Battery + Hard Case. 72 hours only!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Fly More Plus Bundle',
                        'price': Decimal('1199.99'),
                        'quantity': 4,
                        'sku_code': 'DJI-LTD',
                        'option_map': {'Bundle': 'Ultimate'},
                    }
                ]
            },
            {
                'name': 'Xbox Series X - MIDNIGHT SALE!!!',
                'category': 'Gaming Consoles & Accessories',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '🌙🌙 MIDNIGHT SALE! 🌙🌙 Xbox Series X + Game Pass 3 Months. 50% OFF for next 6 hours! 🌙🌙',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Xbox Series X Midnight Bundle',
                        'price': Decimal('299.99'),
                        'quantity': 3,
                        'sku_code': 'XBOX-MID',
                        'option_map': {'Bundle': 'Game Pass'},
                    }
                ]
            },
            {
                'name': 'Sony A7 IV - 48 HOUR SALE',
                'category': 'Cameras & Photography',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '📸📸 48 HOUR SALE! 📸📸 Sony A7 IV with 28-70mm lens. Save $600! Includes free memory card and bag!',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Kit with Lens',
                        'price': Decimal('2199.99'),
                        'quantity': 2,
                        'sku_code': 'SONY-48HR',
                        'option_map': {'Kit': 'With Lens'},
                    }
                ]
            },
            {
                'name': 'Apple Watch Ultra 2 - PRICE ERROR???',
                'category': 'Smartwatches & Wearables',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '🚨🚨 PRICE ERROR? 🚨🚨 Apple Watch Ultra 2 showing $599 instead of $799! Grab before they fix it!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Titanium Alpine Loop',
                        'price': Decimal('599.99'),
                        'quantity': 2,
                        'sku_code': 'AWU-PRICE',
                        'option_map': {'Band': 'Alpine Loop'},
                    }
                ]
            },
            {
                'name': 'Bose QuietComfort Ultra - 12 HOURS LEFT!!!',
                'category': 'Audio & Headphones',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '⏰⏰ 12 HOURS LEFT! ⏰⏰ Bose QuietComfort Ultra headphones. Lowest price ever! Don\'t miss out!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Black - Limited Time',
                        'price': Decimal('329.99'),
                        'quantity': 6,
                        'sku_code': 'BOSE-12HR',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            # Gift Certificates & Vouchers (111-120)
            {
                'name': '💝 $500 Apple Store Gift Card - DIGITAL CODE 💝',
                'category': 'Gift Cards',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '🎁 DIGITAL GIFT CARD 🎁 $500 Apple Store gift card. Code will be emailed instantly. Perfect for gifts!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$500 Apple Gift Card',
                        'price': Decimal('475.00'),
                        'quantity': 999,
                        'sku_code': 'GIFT-APPLE-500',
                        'option_map': {'Value': '$500', 'Brand': 'Apple'},
                    }
                ]
            },
            {
                'name': '🎮 PlayStation Store $100 Gift Card 🎮',
                'category': 'Gift Cards',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'PlayStation Store $100 gift card. Digital delivery. Works for PS5/PS4 games, DLC, and subscriptions.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$100 PSN Card',
                        'price': Decimal('100.00'),
                        'quantity': 999,
                        'sku_code': 'GIFT-PSN-100',
                        'option_map': {'Value': '$100', 'Platform': 'PlayStation'},
                    }
                ]
            },
            {
                'name': '🎁 Starbucks $50 eGift Card - Instant Delivery 🎁',
                'category': 'Gift Cards',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Starbucks $50 digital gift card. Sent to your email within 5 minutes. Redeem at any Starbucks!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$50 Starbucks Card',
                        'price': Decimal('47.50'),
                        'quantity': 999,
                        'sku_code': 'GIFT-SBUX-50',
                        'option_map': {'Value': '$50', 'Brand': 'Starbucks'},
                    }
                ]
            },
            {
                'name': 'Netflix Premium 1-Year Subscription',
                'category': 'Gift Cards',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Netflix Premium 4K account for 1 year. Works on all devices. Email delivery with instructions.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Year Premium',
                        'price': Decimal('89.99'),
                        'quantity': 100,
                        'sku_code': 'GIFT-NFLX-1Y',
                        'option_map': {'Service': 'Netflix', 'Duration': '1 Year'},
                    }
                ]
            },
            {
                'name': 'Amazon $200 Gift Card - DIGITAL',
                'category': 'Gift Cards',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Amazon.com $200 gift card. Instant email delivery. Redeem for millions of items!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$200 Amazon Card',
                        'price': Decimal('195.00'),
                        'quantity': 999,
                        'sku_code': 'GIFT-AMZN-200',
                        'option_map': {'Value': '$200', 'Brand': 'Amazon'},
                    }
                ]
            },
            {
                'name': 'Spotify Premium 6-Month Code',
                'category': 'Gift Cards',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Spotify Premium 6-month subscription code. Works for new and existing users. Instant delivery!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '6 Months Spotify',
                        'price': Decimal('49.99'),
                        'quantity': 200,
                        'sku_code': 'GIFT-SPOT-6M',
                        'option_map': {'Service': 'Spotify', 'Duration': '6 Months'},
                    }
                ]
            },
            {
                'name': '🎬 Disney+ 1 Year Subscription 🎬',
                'category': 'Gift Cards',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Disney+ annual subscription code. Watch Disney, Marvel, Star Wars, Pixar, and National Geographic!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Year Disney+',
                        'price': Decimal('79.99'),
                        'quantity': 150,
                        'sku_code': 'GIFT-DIS-1Y',
                        'option_map': {'Service': 'Disney+', 'Duration': '1 Year'},
                    }
                ]
            },
            {
                'name': 'Steam Wallet $50 Digital Code',
                'category': 'Gift Cards',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Steam Wallet $50 code. Add funds to your Steam account for games and more. Instant delivery!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$50 Steam Card',
                        'price': Decimal('50.00'),
                        'quantity': 999,
                        'sku_code': 'GIFT-STEAM-50',
                        'option_map': {'Value': '$50', 'Platform': 'Steam'},
                    }
                ]
            },
            {
                'name': 'Xbox Game Pass Ultimate 3-Month',
                'category': 'Gift Cards',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Xbox Game Pass Ultimate 3-month code. Includes Xbox Live Gold and Game Pass for console/PC.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '3 Months Ultimate',
                        'price': Decimal('34.99'),
                        'quantity': 300,
                        'sku_code': 'GIFT-XBOX-3M',
                        'option_map': {'Service': 'Game Pass', 'Duration': '3 Months'},
                    }
                ]
            },
            {
                'name': 'Google Play $25 Gift Card',
                'category': 'Gift Cards',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Google Play $25 code. Use for apps, games, movies, books, and more on Android!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '$25 Google Play',
                        'price': Decimal('23.99'),
                        'quantity': 999,
                        'sku_code': 'GIFT-GPLAY-25',
                        'option_map': {'Value': '$25', 'Platform': 'Google Play'},
                    }
                ]
            },
            # Services (121-130)
            {
                'name': 'Professional iPhone Screen Repair Service',
                'category': 'Services',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional iPhone screen repair service. We fix cracked screens same day! Local pickup only. Message for address.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'iPhone 15 Pro Max Screen Repair',
                        'price': Decimal('199.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-IP15PM',
                        'option_map': {'Service': 'Screen Repair', 'Device': 'iPhone 15 Pro Max'},
                    },
                    {
                        'title': 'iPhone 15 Screen Repair',
                        'price': Decimal('149.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-IP15',
                        'option_map': {'Service': 'Screen Repair', 'Device': 'iPhone 15'},
                    },
                ]
            },
            {
                'name': 'PC Building Service - Custom Build',
                'category': 'Services',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional PC building service. You provide parts, I build and test. Cable management, BIOS setup, driver installation included.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Standard Build Service',
                        'price': Decimal('149.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-PC-STD',
                        'option_map': {'Service': 'PC Building'},
                    },
                    {
                        'title': 'Premium Build + Cable Management',
                        'price': Decimal('199.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-PC-PREM',
                        'option_map': {'Service': 'Premium Build'},
                    },
                ]
            },
            {
                'name': 'Drone Photography Session - 1 Hour',
                'category': 'Services',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional drone photography/videography. 1 hour session with edited photos and video. Local area only. Call or text 555-0123.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Hour Session + Editing',
                        'price': Decimal('299.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-DRONE-1H',
                        'option_map': {'Service': 'Drone Photography', 'Duration': '1 Hour'},
                    }
                ]
            },
            {
                'name': 'iPhone Data Recovery Service',
                'category': 'Services',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Recover deleted photos, messages, and data from iPhones. 70% success rate. No recovery, no fee! Contact us: support@datarecovery.com',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Standard Recovery Attempt',
                        'price': Decimal('149.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-DATA-STD',
                        'option_map': {'Service': 'Data Recovery'},
                    }
                ]
            },
            {
                'name': 'Vintage Console Repair Service',
                'category': 'Services',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Repair service for vintage consoles: NES, SNES, Sega Genesis, PlayStation 1/2. Cartridge cleaning, capacitor replacement, modding available.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'NES/SNES Repair',
                        'price': Decimal('89.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-NES',
                        'option_map': {'Console': 'NES/SNES'},
                    },
                    {
                        'title': 'PlayStation 1/2 Repair',
                        'price': Decimal('99.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-PS1',
                        'option_map': {'Console': 'PlayStation'},
                    },
                ]
            },
            {
                'name': 'Smart Home Installation Service',
                'category': 'Services',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional smart home device installation. Cameras, thermostats, smart locks, lights. Local service only. Call John: 555-0199',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Per Device Installation',
                        'price': Decimal('49.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-SMART',
                        'option_map': {'Service': 'Smart Home Install'},
                    }
                ]
            },
            {
                'name': 'MacBook Deep Cleaning Service',
                'category': 'Services',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional deep cleaning for MacBooks. Remove dust, thermal paste replacement, keyboard cleaning. Extend your Mac\'s life!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'MacBook Air Cleaning',
                        'price': Decimal('79.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-MBA',
                        'option_map': {'Service': 'Deep Cleaning', 'Model': 'MacBook Air'},
                    },
                    {
                        'title': 'MacBook Pro Cleaning',
                        'price': Decimal('99.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-MBP',
                        'option_map': {'Service': 'Deep Cleaning', 'Model': 'MacBook Pro'},
                    },
                ]
            },
            {
                'name': 'Custom Mechanical Keyboard Build',
                'category': 'Services',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Custom mechanical keyboard building service. Choose switches, keycaps, case. I assemble, lube, and tune. DM on Instagram @keyboardbuilder',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Full Custom Build',
                        'price': Decimal('199.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-KB-FULL',
                        'option_map': {'Service': 'Custom Keyboard'},
                    },
                    {
                        'title': 'Switch Lubing Service',
                        'price': Decimal('49.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-KB-LUBE',
                        'option_map': {'Service': 'Switch Lubing'},
                    },
                ]
            },
            {
                'name': 'TV Wall Mounting Service',
                'category': 'Services',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional TV wall mounting. Includes mount, hides cables. Local area only. Text for appointment: 555-0177',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Up to 55" TV',
                        'price': Decimal('149.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-TV-55',
                        'option_map': {'Service': 'TV Mounting', 'Size': 'Up to 55"'},
                    },
                    {
                        'title': '65" and larger',
                        'price': Decimal('199.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-TV-65',
                        'option_map': {'Service': 'TV Mounting', 'Size': '65" +'},
                    },
                ]
            },
            {
                'name': 'Phone Unlocking Service',
                'category': 'Services',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Permanently unlock any phone from any carrier. Works for iPhone and Android. Remote service, instant unlock. WhatsApp +1-555-0198',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'iPhone Unlock',
                        'price': Decimal('49.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-UNLOCK-IP',
                        'option_map': {'Service': 'Phone Unlock', 'Device': 'iPhone'},
                    },
                    {
                        'title': 'Android Unlock',
                        'price': Decimal('39.99'),
                        'quantity': 999,
                        'sku_code': 'SVC-UNLOCK-AD',
                        'option_map': {'Service': 'Phone Unlock', 'Device': 'Android'},
                    },
                ]
            },
            # Digital Goods (131-140)
            {
                'name': 'Adobe Creative Cloud ALL APPS - 1 Year',
                'category': 'Digital Goods',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Adobe Creative Cloud All Apps 1 year license. Includes Photoshop, Premiere, After Effects, Illustrator. Email delivery.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Year - All Apps',
                        'price': Decimal('299.99'),
                        'quantity': 500,
                        'sku_code': 'DIG-ADOBE-1Y',
                        'option_map': {'Product': 'Creative Cloud', 'Duration': '1 Year'},
                    }
                ]
            },
            {
                'name': 'Windows 11 Pro License Key',
                'category': 'Digital Goods',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Genuine Windows 11 Pro license key. Instant email delivery. Works for 1 PC. Lifetime activation.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Windows 11 Pro - 1 PC',
                        'price': Decimal('29.99'),
                        'quantity': 1000,
                        'sku_code': 'DIG-WIN11',
                        'option_map': {'Product': 'Windows 11 Pro'},
                    }
                ]
            },
            {
                'name': 'Microsoft Office 2021 Pro Plus',
                'category': 'Digital Goods',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Microsoft Office 2021 Professional Plus license. Word, Excel, PowerPoint, Outlook, Access. Lifetime license for 1 PC.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Office 2021 Pro - 1 PC',
                        'price': Decimal('49.99'),
                        'quantity': 800,
                        'sku_code': 'DIG-OFFICE',
                        'option_map': {'Product': 'Office 2021'},
                    }
                ]
            },
            {
                'name': '🎵 FL Studio Producer Edition - Lifetime License 🎵',
                'category': 'Digital Goods',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'FL Studio Producer Edition lifetime license. Includes all future updates. Email delivery with registration instructions.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Producer Edition',
                        'price': Decimal('149.99'),
                        'quantity': 300,
                        'sku_code': 'DIG-FLSTUDIO',
                        'option_map': {'Product': 'FL Studio', 'Edition': 'Producer'},
                    }
                ]
            },
            {
                'name': 'Ableton Live 11 Suite',
                'category': 'Digital Goods',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Ableton Live 11 Suite music production software. Full version with all features. Digital download and license key.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Suite Edition',
                        'price': Decimal('399.99'),
                        'quantity': 200,
                        'sku_code': 'DIG-ABLE',
                        'option_map': {'Product': 'Ableton Live', 'Edition': 'Suite'},
                    }
                ]
            },
            {
                'name': '4K Video Editing LUTs Bundle',
                'category': 'Digital Goods',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '500+ professional LUTs for video editing. Cinematic color grades. Compatible with Premiere, Final Cut, DaVinci. Instant download.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Cinematic LUT Pack',
                        'price': Decimal('19.99'),
                        'quantity': 999,
                        'sku_code': 'DIG-LUTS',
                        'option_map': {'Product': 'LUTs Bundle'},
                    }
                ]
            },
            {
                'name': 'iPhone 15 Pro Max 3D Model Files',
                'category': 'Digital Goods',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'High-quality 3D model files of iPhone 15 Pro Max. STL, OBJ, and BLEND formats. Perfect for 3D printing or rendering.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Complete Model Pack',
                        'price': Decimal('14.99'),
                        'quantity': 999,
                        'sku_code': 'DIG-IP15-3D',
                        'option_map': {'Product': '3D Models'},
                    }
                ]
            },
            {
                'name': 'Preset Collection - Lightroom Mobile',
                'category': 'Digital Goods',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '200 premium Lightroom presets for mobile and desktop. Includes travel, portrait, film looks, and more. Instant download.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'Ultimate Preset Bundle',
                        'price': Decimal('9.99'),
                        'quantity': 999,
                        'sku_code': 'DIG-LRPRESET',
                        'option_map': {'Product': 'Lightroom Presets'},
                    }
                ]
            },
            {
                'name': 'Ebook: YouTube Automation Course',
                'category': 'Digital Goods',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Complete guide to YouTube automation. Learn how to grow your channel and make money. PDF download. 200+ pages.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'PDF Ebook',
                        'price': Decimal('29.99'),
                        'quantity': 999,
                        'sku_code': 'DIG-YTCOURSE',
                        'option_map': {'Product': 'Ebook'},
                    }
                ]
            },
            {
                'name': 'Printable Wall Art Bundle',
                'category': 'Digital Goods',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '50 high-resolution printable wall art designs. Instant download, print at home. Includes various sizes and styles.',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': '50 Designs Bundle',
                        'price': Decimal('12.99'),
                        'quantity': 999,
                        'sku_code': 'DIG-WALLART',
                        'option_map': {'Product': 'Printable Art'},
                    }
                ]
            },
            # Subscription Boxes (141-150)
            {
                'name': 'Monthly Gadget Box - Premium Tech',
                'category': 'Subscription Boxes',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly subscription box with premium gadgets. Each box includes $100+ value of curated tech accessories. Cancel anytime.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Month Subscription',
                        'price': Decimal('49.99'),
                        'quantity': 50,
                        'sku_code': 'SUB-GADGET-1M',
                        'option_map': {'Box': 'Gadget Box', 'Duration': '1 Month'},
                    },
                    {
                        'title': '3 Month Subscription',
                        'price': Decimal('129.99'),
                        'quantity': 50,
                        'sku_code': 'SUB-GADGET-3M',
                        'option_map': {'Box': 'Gadget Box', 'Duration': '3 Months'},
                    },
                    {
                        'title': '6 Month Subscription',
                        'price': Decimal('239.99'),
                        'quantity': 50,
                        'sku_code': 'SUB-GADGET-6M',
                        'option_map': {'Box': 'Gadget Box', 'Duration': '6 Months'},
                    },
                ]
            },
            {
                'name': 'Vinyl Record of the Month Club',
                'category': 'Subscription Boxes',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly vinyl record subscription. Curated selections from indie to classic rock. Limited edition pressings.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Month',
                        'price': Decimal('34.99'),
                        'quantity': 30,
                        'sku_code': 'SUB-VINYL-1M',
                        'option_map': {'Box': 'Vinyl Club', 'Duration': '1 Month'},
                    }
                ]
            },
            {
                'name': 'Gaming Mystery Box - Level Up!',
                'category': 'Subscription Boxes',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly gaming mystery box. Contains games, accessories, collectibles, and more. $75+ value guaranteed!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Starter Box',
                        'price': Decimal('39.99'),
                        'quantity': 40,
                        'sku_code': 'SUB-GAME-1M',
                        'option_map': {'Box': 'Gaming Box', 'Tier': 'Starter'},
                    },
                    {
                        'title': 'Pro Box',
                        'price': Decimal('69.99'),
                        'quantity': 30,
                        'sku_code': 'SUB-GAME-PRO',
                        'option_map': {'Box': 'Gaming Box', 'Tier': 'Pro'},
                    },
                ]
            },
            {
                'name': 'Coffee Lover\'s Subscription',
                'category': 'Subscription Boxes',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly coffee subscription. Fresh roasted beans from around the world. Includes tasting notes and brewing guide.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Bag per Month',
                        'price': Decimal('24.99'),
                        'quantity': 100,
                        'sku_code': 'SUB-COFFEE-1',
                        'option_map': {'Box': 'Coffee', 'Quantity': '1 Bag'},
                    },
                    {
                        'title': '2 Bags per Month',
                        'price': Decimal('44.99'),
                        'quantity': 75,
                        'sku_code': 'SUB-COFFEE-2',
                        'option_map': {'Box': 'Coffee', 'Quantity': '2 Bags'},
                    },
                ]
            },
            {
                'name': 'Mechanical Keyboard Parts Box',
                'category': 'Subscription Boxes',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly box of mechanical keyboard parts. Switches, keycaps, cables, and more. Perfect for enthusiasts!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Starter Box',
                        'price': Decimal('44.99'),
                        'quantity': 25,
                        'sku_code': 'SUB-KEY-1M',
                        'option_map': {'Box': 'Keyboard Parts', 'Tier': 'Starter'},
                    },
                    {
                        'title': 'Enthusiast Box',
                        'price': Decimal('79.99'),
                        'quantity': 20,
                        'sku_code': 'SUB-KEY-PRO',
                        'option_map': {'Box': 'Keyboard Parts', 'Tier': 'Enthusiast'},
                    },
                ]
            },
            {
                'name': 'Smart Home Device Box',
                'category': 'Subscription Boxes',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly smart home device subscription. Build your smart home one device at a time. Includes setup guide.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Quarterly Plan',
                        'price': Decimal('149.99'),
                        'quantity': 15,
                        'sku_code': 'SUB-SMART-3M',
                        'option_map': {'Box': 'Smart Home', 'Duration': '3 Months'},
                    }
                ]
            },
            {
                'name': 'DIY Electronics Kit Club',
                'category': 'Subscription Boxes',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly DIY electronics project kit. Learn to solder and build your own gadgets. Perfect for beginners and experts.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Beginner Track',
                        'price': Decimal('29.99'),
                        'quantity': 40,
                        'sku_code': 'SUB-DIY-BEG',
                        'option_map': {'Box': 'DIY Kit', 'Level': 'Beginner'},
                    },
                    {
                        'title': 'Advanced Track',
                        'price': Decimal('49.99'),
                        'quantity': 30,
                        'sku_code': 'SUB-DIY-ADV',
                        'option_map': {'Box': 'DIY Kit', 'Level': 'Advanced'},
                    },
                ]
            },
            {
                'name': 'Camera Gear Rental Box',
                'category': 'Subscription Boxes',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Try before you buy! Monthly rental box with camera gear. Keep what you love, return the rest.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '1 Month Rental',
                        'price': Decimal('99.99'),
                        'quantity': 10,
                        'sku_code': 'SUB-CAM-1M',
                        'option_map': {'Box': 'Camera Gear', 'Duration': '1 Month'},
                    }
                ]
            },
            {
                'name': 'Vintage Game Restoration Box',
                'category': 'Subscription Boxes',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly box with vintage games that need restoration. Includes cleaning supplies and instructions.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Monthly Restoration Project',
                        'price': Decimal('59.99'),
                        'quantity': 15,
                        'sku_code': 'SUB-VINTAGE',
                        'option_map': {'Box': 'Game Restoration'},
                    }
                ]
            },
            {
                'name': 'Photography Prop Box',
                'category': 'Subscription Boxes',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Monthly box of photography props and backgrounds. Perfect for product and portrait photographers.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Monthly Props',
                        'price': Decimal('39.99'),
                        'quantity': 20,
                        'sku_code': 'SUB-PHOTO',
                        'option_map': {'Box': 'Photo Props'},
                    }
                ]
            },
            # Handmade Items (151-160)
            {
                'name': 'Handmade Wooden Headphone Stand',
                'category': 'Handmade',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Handcrafted wooden headphone stand from solid walnut. Each piece is unique with natural wood grain. Hand-rubbed oil finish.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Walnut - Standard',
                        'price': Decimal('89.99'),
                        'quantity': 3,
                        'sku_code': 'HAND-HP-WAL',
                        'option_map': {'Material': 'Walnut', 'Type': 'Headphone Stand'},
                    },
                    {
                        'title': 'Oak - Standard',
                        'price': Decimal('79.99'),
                        'quantity': 2,
                        'sku_code': 'HAND-HP-OAK',
                        'option_map': {'Material': 'Oak', 'Type': 'Headphone Stand'},
                    },
                ]
            },
            {
                'name': 'Custom Leather Watch Strap',
                'category': 'Handmade',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Handmade leather watch strap. Full-grain vegetable tanned leather. Available in various colors and sizes. Hand-stitched.',
                'is_refundable': True,
                'refund_days': 5,
                'variants': [
                    {
                        'title': 'Brown - 20mm',
                        'price': Decimal('49.99'),
                        'quantity': 5,
                        'sku_code': 'HAND-STRAP-BR-20',
                        'option_map': {'Color': 'Brown', 'Size': '20mm'},
                    },
                    {
                        'title': 'Black - 20mm',
                        'price': Decimal('49.99'),
                        'quantity': 4,
                        'sku_code': 'HAND-STRAP-BK-20',
                        'option_map': {'Color': 'Black', 'Size': '20mm'},
                    },
                    {
                        'title': 'Brown - 22mm',
                        'price': Decimal('49.99'),
                        'quantity': 3,
                        'sku_code': 'HAND-STRAP-BR-22',
                        'option_map': {'Color': 'Brown', 'Size': '22mm'},
                    },
                ]
            },
            {
                'name': 'Hand-Knitted Cable Organizer',
                'category': 'Handmade',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-knitted cable organizers made from recycled cotton. Eco-friendly and stretchy. Keeps cables tangle-free.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Set of 3 - Assorted Colors',
                        'price': Decimal('24.99'),
                        'quantity': 8,
                        'sku_code': 'HAND-CABLE-3',
                        'option_map': {'Product': 'Cable Organizer', 'Set': '3 Pack'},
                    }
                ]
            },
            {
                'name': 'Custom Engraved AirPods Case',
                'category': 'Handmade',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-engraved leather AirPods case. Personalize with initials or name. Made from full-grain leather.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'AirPods Pro - Brown',
                        'price': Decimal('39.99'),
                        'quantity': 2,
                        'sku_code': 'HAND-AIRP-BR',
                        'option_map': {'Device': 'AirPods Pro', 'Color': 'Brown'},
                    }
                ]
            },
            {
                'name': 'Handmade Resin Keyboard Keycap',
                'category': 'Handmade',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Handmade resin artisan keycap. Each piece is unique with different colors and inclusions. Cherry MX compatible.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'Ocean Blue Escape Key',
                        'price': Decimal('34.99'),
                        'quantity': 1,
                        'sku_code': 'HAND-KEY-OCEAN',
                        'option_map': {'Design': 'Ocean Blue', 'Key': 'Escape'},
                    },
                    {
                        'title': 'Galaxy Purple Escape Key',
                        'price': Decimal('34.99'),
                        'quantity': 1,
                        'sku_code': 'HAND-KEY-GAL',
                        'option_map': {'Design': 'Galaxy', 'Key': 'Escape'},
                    },
                ]
            },
            {
                'name': 'Handmade Wool Laptop Sleeve',
                'category': 'Handmade',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-felted wool laptop sleeve. Natural materials, machine washable. Custom sizes available upon request.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': '13" MacBook Air',
                        'price': Decimal('59.99'),
                        'quantity': 2,
                        'sku_code': 'HAND-SLV-13',
                        'option_map': {'Size': '13"', 'Color': 'Gray'},
                    },
                    {
                        'title': '14" MacBook Pro',
                        'price': Decimal('64.99'),
                        'quantity': 2,
                        'sku_code': 'HAND-SLV-14',
                        'option_map': {'Size': '14"', 'Color': 'Gray'},
                    },
                ]
            },
            {
                'name': 'Hand-Carved Wooden Phone Stand',
                'category': 'Handmade',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-carved wooden phone stand from reclaimed wood. Unique designs, each piece is one of a kind.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Minimalist Design',
                        'price': Decimal('29.99'),
                        'quantity': 3,
                        'sku_code': 'HAND-PHONE-MIN',
                        'option_map': {'Design': 'Minimalist'},
                    }
                ]
            },
            {
                'name': 'Handmade Ceramic Bluetooth Speaker',
                'category': 'Handmade',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-thrown ceramic Bluetooth speaker. Unique glaze patterns. High-quality sound in an artistic package.',
                'is_refundable': True,
                'refund_days': 5,
                'variants': [
                    {
                        'title': 'Blue Glaze',
                        'price': Decimal('129.99'),
                        'quantity': 1,
                        'sku_code': 'HAND-SPK-BLU',
                        'option_map': {'Color': 'Blue Glaze'},
                    }
                ]
            },
            {
                'name': 'Handmade Leather Camera Strap',
                'category': 'Handmade',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Handmade leather camera strap. Full-grain leather, adjustable length. Comfortable for all-day shooting.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Brown - Standard',
                        'price': Decimal('69.99'),
                        'quantity': 3,
                        'sku_code': 'HAND-CAM-BR',
                        'option_map': {'Color': 'Brown'},
                    },
                    {
                        'title': 'Black - Standard',
                        'price': Decimal('69.99'),
                        'quantity': 2,
                        'sku_code': 'HAND-CAM-BK',
                        'option_map': {'Color': 'Black'},
                    },
                ]
            },
            {
                'name': 'Handmade Copper Cable Sleeve',
                'category': 'Handmade',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Hand-braided copper cable sleeve for mechanical keyboard cables. Adds a premium look to your setup.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': '1 Meter Length',
                        'price': Decimal('24.99'),
                        'quantity': 5,
                        'sku_code': 'HAND-COPPER-1M',
                        'option_map': {'Length': '1m', 'Material': 'Copper'},
                    }
                ]
            },
            # Local Pickup Only (161-170)
            {
                'name': 'Gaming PC Setup - LOCAL PICKUP ONLY',
                'category': 'Computers',
                'shop': 'Tech Haven',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Full gaming PC setup with monitor, keyboard, mouse. Too heavy to ship. Local pickup only in Los Angeles. Cash only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Full Setup',
                        'price': Decimal('1499.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-PC-1',
                        'option_map': {'Type': 'Full Setup'},
                    }
                ]
            },
            {
                'name': '65" OLED TV - MUST PICK UP',
                'category': 'TVs',
                'shop': 'Gadget World',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'LG 65" OLED TV. Selling because moving. Local pickup only in Chicago. Cash or Venmo. Bring help, it\'s heavy!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '65" LG OLED',
                        'price': Decimal('899.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-TV-1',
                        'option_map': {'Size': '65"'},
                    }
                ]
            },
            {
                'name': 'Home Theater Speakers - Pickup Only',
                'category': 'Audio',
                'shop': 'Display Masters',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': '5.1 channel home theater speaker system. Large speakers, cannot ship. Local pickup in NYC area. Text for address.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Full 5.1 System',
                        'price': Decimal('499.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-SPK-1',
                        'option_map': {'System': '5.1 Channel'},
                    }
                ]
            },
            {
                'name': 'Pool Table - LOCAL PICKUP',
                'category': 'Sports',
                'shop': 'Connect Tech',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Professional pool table. 8ft slate top. Must disassemble and pickup in Miami. Serious inquiries only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '8ft Pool Table',
                        'price': Decimal('799.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-POOL-1',
                        'option_map': {'Size': '8ft'},
                    }
                ]
            },
            {
                'name': 'Arcade Machine - Pickup Only',
                'category': 'Gaming',
                'shop': 'KeyClack',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Full-size arcade machine with 1000+ games. Too large to ship. Local pickup in Seattle area. Cash only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Multicade Machine',
                        'price': Decimal('1299.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-ARCADE-1',
                        'option_map': {'Type': 'Multicade'},
                    }
                ]
            },
            {
                'name': 'Studio Monitors - Local Pickup',
                'category': 'Audio',
                'shop': 'Tech Haven',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Pair of KRK studio monitors. Heavy professional speakers. Local pickup only in Austin. Demo available.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'KRK Rokit 8 G4',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-KRK-1',
                        'option_map': {'Model': 'Rokit 8 G4'},
                    }
                ]
            },
            {
                'name': 'Server Rack - MUST PICKUP',
                'category': 'Computers',
                'shop': 'Gadget World',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': '42U server rack with equipment. Too heavy for shipping. Local pickup in Dallas. Need truck and help.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '42U Rack with Gear',
                        'price': Decimal('599.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-RACK-1',
                        'option_map': {'Size': '42U'},
                    }
                ]
            },
            {
                'name': 'Piano Keyboard - Pickup Only',
                'category': 'Music',
                'shop': 'Display Masters',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': '88-key weighted digital piano. Heavy item, local pickup only in Portland. Includes stand and bench.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Digital Piano',
                        'price': Decimal('449.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-PIANO-1',
                        'option_map': {'Type': 'Digital Piano'},
                    }
                ]
            },
            {
                'name': 'Gaming Desk - Local Pickup',
                'category': 'Furniture',
                'shop': 'Connect Tech',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Large L-shaped gaming desk. Must disassemble and pickup in Denver. Message for address.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'L-Shaped Desk',
                        'price': Decimal('149.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-DESK-1',
                        'option_map': {'Type': 'Gaming Desk'},
                    }
                ]
            },
            {
                'name': 'Professional Camera Gear - Local Only',
                'category': 'Cameras',
                'shop': 'KeyClack',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Complete camera kit with lenses and lights. Expensive gear, local pickup only in San Francisco. Cash only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Full Kit',
                        'price': Decimal('3499.99'),
                        'quantity': 1,
                        'sku_code': 'LOCAL-CAM-1',
                        'option_map': {'Kit': 'Complete'},
                    }
                ]
            },
            # Age-Restricted Items (171-180)
            {
                'name': 'Craft Beer Making Kit',
                'category': 'Food & Beverage',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Complete home brewing kit. Makes 5 gallons of craft beer. Includes ingredients. MUST BE 21+ TO PURCHASE. ID required upon delivery.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'IPA Starter Kit',
                        'price': Decimal('89.99'),
                        'quantity': 5,
                        'sku_code': 'AGE-BEER-IPA',
                        'option_map': {'Type': 'IPA Kit'},
                    },
                    {
                        'title': 'Starter Kit',
                        'price': Decimal('79.99'),
                        'quantity': 8,
                        'sku_code': 'AGE-BEER-START',
                        'option_map': {'Type': 'Starter'},
                    },
                ]
            },
            {
                'name': 'Wine Aerator Set',
                'category': 'Kitchen',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional wine aerator and decanter set. For wine enthusiasts. Age verification required at delivery.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'Aerator + 4 Glasses',
                        'price': Decimal('59.99'),
                        'quantity': 10,
                        'sku_code': 'AGE-WINE-1',
                        'option_map': {'Set': 'Complete'},
                    }
                ]
            },
            {
                'name': 'Whiskey Glass Set',
                'category': 'Kitchen',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'Set of 4 crystal whiskey glasses with whiskey stones. Perfect gift. Age verification required.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': '4 Glasses + Stones',
                        'price': Decimal('49.99'),
                        'quantity': 15,
                        'sku_code': 'AGE-WHISKEY-4',
                        'option_map': {'Set': '4 Glasses'},
                    }
                ]
            },
            {
                'name': 'Cigar Humidor',
                'category': 'Accessories',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Spanish cedar cigar humidor with hygrometer. Holds up to 50 cigars. Adult signature required.',
                'is_refundable': True,
                'refund_days': 5,
                'variants': [
                    {
                        'title': '50-Count Humidor',
                        'price': Decimal('129.99'),
                        'quantity': 4,
                        'sku_code': 'AGE-CIGAR-50',
                        'option_map': {'Capacity': '50 Count'},
                    }
                ]
            },
            {
                'name': 'Wine Fridge',
                'category': 'Appliances',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '32-bottle dual zone wine refrigerator. Thermoelectric cooling. Age verification upon delivery.',
                'is_refundable': True,
                'refund_days': 14,
                'variants': [
                    {
                        'title': '32 Bottle',
                        'price': Decimal('299.99'),
                        'quantity': 3,
                        'sku_code': 'AGE-WINEF-32',
                        'option_map': {'Capacity': '32 Bottles'},
                    }
                ]
            },
            {
                'name': 'Mature Rated Video Game (18+)',
                'category': 'Gaming',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': 'Mature rated game with violent content. ID check at delivery. Not suitable for minors.',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'PS5 - Mature Game',
                        'price': Decimal('69.99'),
                        'quantity': 20,
                        'sku_code': 'AGE-GAME-PS5',
                        'option_map': {'Platform': 'PS5'},
                    },
                    {
                        'title': 'Xbox Series X - Mature Game',
                        'price': Decimal('69.99'),
                        'quantity': 15,
                        'sku_code': 'AGE-GAME-XBX',
                        'option_map': {'Platform': 'Xbox'},
                    },
                ]
            },
            {
                'name': 'Bar Tool Set',
                'category': 'Kitchen',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': 'Professional 12-piece bar tool set. Includes shaker, jigger, strainer, and more. Adult signature required.',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': '12-Piece Set',
                        'price': Decimal('79.99'),
                        'quantity': 12,
                        'sku_code': 'AGE-BAR-12',
                        'option_map': {'Set': '12-Piece'},
                    }
                ]
            },
            {
                'name': 'Mature Content VR Game',
                'category': 'Gaming',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': 'VR game with mature themes. Requires ID verification. Oculus/Meta Quest compatible.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Digital Code',
                        'price': Decimal('39.99'),
                        'quantity': 999,
                        'sku_code': 'AGE-VR-GAME',
                        'option_map': {'Platform': 'Meta Quest'},
                    }
                ]
            },
            {
                'name': 'Alcohol Infusion Kit',
                'category': 'Kitchen',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'Make your own flavored spirits at home. Includes jars and ingredients. Age verification required.',
                'is_refundable': True,
                'refund_days': 5,
                'variants': [
                    {
                        'title': 'Complete Kit',
                        'price': Decimal('44.99'),
                        'quantity': 8,
                        'sku_code': 'AGE-INFUSE',
                        'option_map': {'Kit': 'Complete'},
                    }
                ]
            },
            {
                'name': 'Cigar Cutter and Lighter Set',
                'category': 'Accessories',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': 'Premium cigar cutter and torch lighter set. Leather case included. Adult signature required.',
                'is_refundable': True,
                'refund_days': 5,
                'variants': [
                    {
                        'title': 'Cutter + Lighter Set',
                        'price': Decimal('69.99'),
                        'quantity': 6,
                        'sku_code': 'AGE-CIGAR-SET',
                        'option_map': {'Set': 'Cutter & Lighter'},
                    }
                ]
            },
            # ALL CAPS / Flashy Titles (181-190)
            {
                'name': '🔥🔥 AMAZING DEAL!!! BRAND NEW IPHONE 15 PRO MAX 🔥🔥',
                'category': 'Smartphones',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️ 100% BRAND NEW SEALED IPHONE 15 PRO MAX 1TB 🔥🔥 BEST PRICE ON THE INTERNET 🔥🔥 WILL NOT LAST ⚡⚡⚡',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'NATURAL TITANIUM 1TB',
                        'price': Decimal('1499.99'),
                        'quantity': 3,
                        'sku_code': 'CAPS-IP15',
                        'option_map': {'Color': 'Natural Titanium'},
                    }
                ]
            },
            {
                'name': '‼️‼️ SAMSUNG 85" 8K TV 50% OFF ‼️‼️',
                'category': 'TVs',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️ SAMSUNG 85" 8K QLED TV 🔥🔥🔥 WAS $8000 NOW $3999 🔥🔥🔥 LIMITED STOCK ‼️‼️‼️',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': '85" 8K QLED',
                        'price': Decimal('3999.99'),
                        'quantity': 2,
                        'sku_code': 'CAPS-TV85',
                        'option_map': {'Size': '85"'},
                    }
                ]
            },
            {
                'name': '⚠️⚠️⚠️ GAMING PC RTX 4090 ULTRA BUNDLE ⚠️⚠️⚠️',
                'category': 'Computers',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '⚡⚡⚡ ULTIMATE GAMING PC ⚡⚡⚡ RTX 4090 + i9-13900K + 64GB RAM + 4TB SSD 🔥🔥 MAX SETTINGS 4K 240FPS 🔥🔥 READY TO SHIP TOMORROW!!!',
                'is_refundable': True,
                'refund_days': 3,
                'variants': [
                    {
                        'title': 'ULTIMATE BUILD',
                        'price': Decimal('3999.99'),
                        'quantity': 2,
                        'sku_code': 'CAPS-PC',
                        'option_map': {'Build': 'Ultimate'},
                    }
                ]
            },
            {
                'name': '🎮🎮🎮 NINTENDO SWITCH OLED FREE GAME 🎮🎮🎮',
                'category': 'Gaming',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '🎁🎁🎁 FREE GAME INCLUDED! 🎁🎁🎁 NINTENDO SWITCH OLED WHITE 🎮 EXTRA JOY-CONS 🎮 CARRYING CASE 🎮 ALL FOR ONE LOW PRICE!',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'ULTIMATE BUNDLE',
                        'price': Decimal('399.99'),
                        'quantity': 5,
                        'sku_code': 'CAPS-NS',
                        'option_map': {'Bundle': 'Ultimate'},
                    }
                ]
            },
            {
                'name': '💸💸💸 AIRPODS MAX CHEAP 💸💸💸',
                'category': 'Audio',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '💰💰💰 LOWEST PRICE EVER 💰💰💰 AirPods Max Space Gray 🔥🔥 50% OFF RETAIL 🔥🔥 DON\'T MISS THIS DEAL ‼️‼️',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'SPACE GRAY',
                        'price': Decimal('299.99'),
                        'quantity': 4,
                        'sku_code': 'CAPS-APM',
                        'option_map': {'Color': 'Space Gray'},
                    }
                ]
            },
            {
                'name': '⚡⚡⚡ PS5 PRO CONSOLE REVEALED ⚡⚡⚡',
                'category': 'Gaming',
                'shop': 'Tech Haven',
                'condition': 'New',
                'status': 'Active',
                'description': '‼️‼️‼️ PS5 PRO EARLY RELEASE ‼️‼️‼️ NOT AVAILABLE IN STORES YET 🔥🔥 BE THE FIRST TO OWN 🔥🔥 LIMITED UNITS AVAILABLE!!!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'PS5 PRO',
                        'price': Decimal('899.99'),
                        'quantity': 2,
                        'sku_code': 'CAPS-PS5P',
                        'option_map': {'Console': 'PS5 Pro'},
                    }
                ]
            },
            {
                'name': '🎧🎧🎧 BEST WIRELESS EARBUDS EVER 🎧🎧🎧',
                'category': 'Audio',
                'shop': 'Gadget World',
                'condition': 'New',
                'status': 'Active',
                'description': '🔥🔥🔥 SONY WF-1000XM5 🔥🔥🔥 INDUSTRY LEADING NOISE CANCELLATION ⚡⚡⚡ 30 HOUR BATTERY ⚡⚡⚡ MUST SEE!',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'BLACK',
                        'price': Decimal('279.99'),
                        'quantity': 8,
                        'sku_code': 'CAPS-SONY',
                        'option_map': {'Color': 'Black'},
                    }
                ]
            },
            {
                'name': '📸📸📸 SONY A7 IV CAMERA KIT 📸📸📸',
                'category': 'Cameras',
                'shop': 'Display Masters',
                'condition': 'New',
                'status': 'Active',
                'description': '‼️‼️‼️ SONY A7 IV WITH LENS ‼️‼️‼️ FREE 64GB CARD + BAG + EXTRA BATTERY 🔥🔥 PROFESSIONAL GRADE 🔥🔥',
                'is_refundable': True,
                'refund_days': 7,
                'variants': [
                    {
                        'title': 'KIT WITH 28-70MM',
                        'price': Decimal('2499.99'),
                        'quantity': 3,
                        'sku_code': 'CAPS-SONYA7',
                        'option_map': {'Kit': 'With Lens'},
                    }
                ]
            },
            {
                'name': '⌚⌚⌚ APPLE WATCH ULTRA 2 CHEAP ⌚⌚⌚',
                'category': 'Wearables',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': '⚡⚡⚡ APPLE WATCH ULTRA 2 ⚡⚡⚡ TITANIUM CASE + ALPINE LOOP 🔥🔥 50% OFF RETAIL 🔥🔥 HURRY LIMITED TIME!',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'TITANIUM',
                        'price': Decimal('399.99'),
                        'quantity': 3,
                        'sku_code': 'CAPS-AWU',
                        'option_map': {'Model': 'Ultra 2'},
                    }
                ]
            },
            {
                'name': '💻💻💻 MACBOOK PRO M3 MAX BEST PRICE 💻💻💻',
                'category': 'Computers',
                'shop': 'KeyClack',
                'condition': 'New',
                'status': 'Active',
                'description': '‼️‼️‼️ MACBOOK PRO 16" M3 MAX ‼️‼️‼️ 48GB RAM + 1TB SSD 🔥🔥 CANNOT BEAT THIS PRICE 🔥🔥 24 HOURS ONLY!',
                'is_refundable': True,
                'refund_days': 1,
                'variants': [
                    {
                        'title': 'SPACE BLACK',
                        'price': Decimal('2999.99'),
                        'quantity': 2,
                        'sku_code': 'CAPS-MBP',
                        'option_map': {'Color': 'Space Black'},
                    }
                ]
            },
            # Phone numbers / Contact info in description (191-200)
            {
                'name': 'iPhone 14 Pro Max - Text for details',
                'category': 'Smartphones',
                'shop': 'Tech Haven',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'iPhone 14 Pro Max 256GB in excellent condition. Text or call 555-0123 for more info and price negotiation. Serious buyers only.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Deep Purple 256GB',
                        'price': Decimal('699.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-IP14',
                        'option_map': {'Color': 'Deep Purple'},
                    }
                ]
            },
            {
                'name': 'Gaming Laptop - Contact me',
                'category': 'Computers',
                'shop': 'Gadget World',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'ASUS ROG gaming laptop with RTX 3070. For questions and offers, email me at gamer@email.com or DM on Instagram @gaming_deals',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'ASUS ROG',
                        'price': Decimal('899.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-LAP',
                        'option_map': {'Brand': 'ASUS'},
                    }
                ]
            },
            {
                'name': 'DJI Drone - WhatsApp for price',
                'category': 'Drones',
                'shop': 'Display Masters',
                'condition': 'Like New',
                'status': 'Active',
                'description': 'DJI Mavic 3 with Fly More Combo. WhatsApp me at +1-555-0199 for best price. Also available for local pickup.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Mavic 3',
                        'price': Decimal('1299.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-DJI',
                        'option_map': {'Model': 'Mavic 3'},
                    }
                ]
            },
            {
                'name': 'PS5 Disc Version - Call or Text',
                'category': 'Gaming',
                'shop': 'Connect Tech',
                'condition': 'New',
                'status': 'Active',
                'description': 'PlayStation 5 Disc Version. Call 555-0166 for availability and pricing. Willing to negotiate for quick sale.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'PS5 Disc',
                        'price': Decimal('549.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-PS5',
                        'option_map': {'Version': 'Disc'},
                    }
                ]
            },
            {
                'name': 'Camera Lens - Message for details',
                'category': 'Photography',
                'shop': 'KeyClack',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Canon 70-200mm f/2.8L IS III USM. Contact me on Telegram @cameradeals or email lens@photography.com for more photos.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Canon 70-200mm',
                        'price': Decimal('1599.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-LENS',
                        'option_map': {'Brand': 'Canon'},
                    }
                ]
            },
            {
                'name': 'Gaming Monitor - Text me',
                'category': 'Monitors',
                'shop': 'Tech Haven',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Samsung Odyssey G7 32" curved gaming monitor. For more info, text 555-0144. Open to trades and offers.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': '32" G7',
                        'price': Decimal('399.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-MON',
                        'option_map': {'Size': '32"'},
                    }
                ]
            },
            {
                'name': 'Mechanical Keyboard - Discord',
                'category': 'Accessories',
                'shop': 'Gadget World',
                'condition': 'Like New',
                'status': 'Active',
                'description': 'Custom mechanical keyboard with GMK keycaps. Join my Discord for more info: discord.gg/keyboarddeals or DM @keyboardtrader',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Custom KB',
                        'price': Decimal('299.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-KB',
                        'option_map': {'Type': 'Custom'},
                    }
                ]
            },
            {
                'name': 'Smartwatch - Contact via Signal',
                'category': 'Wearables',
                'shop': 'Display Masters',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'Samsung Galaxy Watch 6 Classic. Contact me on Signal at 555-0188 for questions and negotiation.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Galaxy Watch 6',
                        'price': Decimal('199.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-WATCH',
                        'option_map': {'Model': 'Watch 6'},
                    }
                ]
            },
            {
                'name': 'Speakers - Call for price',
                'category': 'Audio',
                'shop': 'Connect Tech',
                'condition': 'Used - Excellent',
                'status': 'Active',
                'description': 'Klipsch RP-600M bookshelf speakers. Call 555-0177 for best price. Local pickup only, can demo before purchase.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'Klipsch Pair',
                        'price': Decimal('449.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-SPK',
                        'option_map': {'Brand': 'Klipsch'},
                    }
                ]
            },
            {
                'name': 'Graphics Card - Telegram',
                'category': 'Components',
                'shop': 'KeyClack',
                'condition': 'Used - Good',
                'status': 'Active',
                'description': 'RTX 4080 Founders Edition. Contact on Telegram @gpu_trader or email gpu@deals.com for more details and benchmarks.',
                'is_refundable': False,
                'refund_days': 0,
                'variants': [
                    {
                        'title': 'RTX 4080 FE',
                        'price': Decimal('899.99'),
                        'quantity': 1,
                        'sku_code': 'CONTACT-GPU',
                        'option_map': {'Model': 'RTX 4080'},
                    }
                ]
            },
        {
            'name': 'Perpetual Motion Machine - Infinite Energy',
            'category': 'Collectibles',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Revolutionary perpetual motion machine generates unlimited free energy. Never needs fuel. Patent pending. Scientists hate this!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Home Edition',
                    'price': Decimal('9999.99'),
                    'quantity': 1,
                    'sku_code': 'SCAM-PMM-1',
                    'option_map': {'Model': 'Home Edition'},
                }
            ]
        },
        {
            'name': 'Miracle Hair Growth Serum - 10000% Growth',
            'category': 'Beauty',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Grow hair back in 3 days! Clinical trials show 10000% hair growth. Works on bald spots. Money back guarantee!',
            'is_refundable': True,
            'refund_days': 30,
            'variants': [
                {
                    'title': '3 Month Supply',
                    'price': Decimal('199.99'),
                    'quantity': 50,
                    'sku_code': 'SCAM-HAIR-3M',
                    'option_map': {'Supply': '3 Months'},
                }
            ]
        },
        {
            'name': 'Psychic Reading via Email',
            'category': 'Services',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Accurate psychic reading delivered to your email. I can predict your future, love life, and career. 100% accurate!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Basic Reading',
                    'price': Decimal('49.99'),
                    'quantity': 999,
                    'sku_code': 'SCAM-PSYCHIC-1',
                    'option_map': {'Type': 'Basic'},
                },
                {
                    'title': 'Premium Reading + Questions',
                    'price': Decimal('99.99'),
                    'quantity': 999,
                    'sku_code': 'SCAM-PSYCHIC-2',
                    'option_map': {'Type': 'Premium'},
                },
            ]
        },
        {
            'name': 'Weight Loss Patch - Lose 20lbs Overnight',
            'category': 'Health',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Wear this patch while you sleep and wake up 20lbs lighter! FDA approved. Celebrity secret!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '7 Day Supply',
                    'price': Decimal('79.99'),
                    'quantity': 200,
                    'sku_code': 'SCAM-PATCH-7',
                    'option_map': {'Supply': '7 Days'},
                }
            ]
        },
        {
            'name': 'Magnetic Bracelet for Pain Relief',
            'category': 'Health',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Powerful magnetic bracelet eliminates arthritis pain, improves circulation, and boosts energy. Worn by athletes!',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Titanium Model',
                    'price': Decimal('129.99'),
                    'quantity': 75,
                    'sku_code': 'SCAM-MAG-1',
                    'option_map': {'Material': 'Titanium'},
                }
            ]
        },
        {
            'name': 'Secret Government Phone',
            'category': 'Electronics',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Genuine secret government phone used by agents. Untraceable, encrypted, impossible to hack. Limited stock!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Black Ops Edition',
                    'price': Decimal('2999.99'),
                    'quantity': 3,
                    'sku_code': 'SCAM-GOV-1',
                    'option_map': {'Edition': 'Black Ops'},
                }
            ]
        },
        {
            'name': 'Alien Artifact - Genuine',
            'category': 'Collectibles',
            'shop': 'Gadget World',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Genuine artifact from crashed UFO. Carbon dated to 10,000 BC. Comes with certificate of authenticity from "Dr. Smith".',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Mystery Metal Piece',
                    'price': Decimal('4999.99'),
                    'quantity': 1,
                    'sku_code': 'SCAM-ALIEN-1',
                    'option_map': {'Type': 'Artifact'},
                }
            ]
        },
        {
            'name': 'Invisibility Cloak - Real Magic',
            'category': 'Novelty',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Actually works! Harry Potter style invisibility cloak. Advanced metamaterials. Makes you completely invisible!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Full Size',
                    'price': Decimal('599.99'),
                    'quantity': 2,
                    'sku_code': 'SCAM-CLOAK-1',
                    'option_map': {'Size': 'Full'},
                }
            ]
        },
        {
            'name': 'Time Travel Device - Works!',
            'category': 'Electronics',
            'shop': 'Connect Tech',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Working time machine from the future. Go back and fix your mistakes! Includes instruction manual in future language.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Mark 1 Model',
                    'price': Decimal('99999.99'),
                    'quantity': 1,
                    'sku_code': 'SCAM-TIME-1',
                    'option_map': {'Model': 'Mark 1'},
                }
            ]
        },
        {
            'name': 'Mind Reading Headphones',
            'category': 'Audio',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Revolutionary neural interface headphones. Read minds, send thoughts, control devices with your brain. Military tech!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Neural Interface Pro',
                    'price': Decimal('1499.99'),
                    'quantity': 5,
                    'sku_code': 'SCAM-MIND-1',
                    'option_map': {'Model': 'Pro'},
                }
            ]
        },
        # 211-220: Products with pricing issues
        {
            'name': 'iPhone 15 Pro Max',
            'category': 'Smartphones',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Brand new iPhone 15 Pro Max. Selling for $1 because I\'m moving to Mars.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Natural Titanium 1TB',
                    'price': Decimal('1.00'),
                    'quantity': 1,
                    'sku_code': 'PRICE-IP15-1',
                    'option_map': {'Color': 'Natural Titanium'},
                }
            ]
        },
        {
            'name': 'PlayStation 5 Console',
            'category': 'Gaming',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'PS5 Disc Edition. Price includes shipping from North Korea. Very rare!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Disc Version',
                    'price': Decimal('9999.99'),
                    'quantity': 1,
                    'sku_code': 'PRICE-PS5-1',
                    'option_map': {'Version': 'Disc'},
                }
            ]
        },
        {
            'name': 'MacBook Pro M3',
            'category': 'Laptops',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'MacBook Pro M3 Max. Price keeps changing every hour! Check back for best price.',
            'is_refundable': True,
            'refund_days': 1,
            'variants': [
                {
                    'title': 'Space Black',
                    'price': Decimal('1999.99'),
                    'quantity': 2,
                    'sku_code': 'PRICE-MBP-1',
                    'option_map': {'Color': 'Space Black'},
                }
            ]
        },
        {
            'name': 'Samsung 85" TV',
            'category': 'TVs',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Samsung 85" 8K TV. Price in Bitcoin only. Current BTC price: 0.05 BTC',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '85" QLED',
                    'price': Decimal('2999.99'),
                    'quantity': 1,
                    'sku_code': 'PRICE-TV-1',
                    'option_map': {'Size': '85"'},
                }
            ]
        },
        {
            'name': 'Graphics Card RTX 4090',
            'category': 'Components',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'RTX 4090. Price varies by country. Contact for pricing in your location.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Founders Edition',
                    'price': Decimal('1599.99'),
                    'quantity': 3,
                    'sku_code': 'PRICE-RTX-1',
                    'option_map': {'Model': 'Founders'},
                }
            ]
        },
        {
            'name': 'Diamond Ring',
            'category': 'Jewelry',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': '5 carat diamond ring. Price is negotiable. Will trade for car or motorcycle.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Platinum',
                    'price': Decimal('49999.99'),
                    'quantity': 1,
                    'sku_code': 'PRICE-DIA-1',
                    'option_map': {'Metal': 'Platinum'},
                }
            ]
        },
        {
            'name': 'Gold Bars',
            'category': 'Investments',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': '1kg gold bars. Price updates with market. Currently $10 below spot!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '1kg PAMP',
                    'price': Decimal('64999.99'),
                    'quantity': 2,
                    'sku_code': 'PRICE-GOLD-1',
                    'option_map': {'Weight': '1kg'},
                }
            ]
        },
        {
            'name': 'Vintage Ferrari',
            'category': 'Vehicles',
            'shop': 'Display Masters',
            'condition': 'Used',
            'status': 'Active',
            'description': '1985 Ferrari Testarossa. Price includes shipping worldwide. Very rare color.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Red',
                    'price': Decimal('299999.99'),
                    'quantity': 1,
                    'sku_code': 'PRICE-CAR-1',
                    'option_map': {'Color': 'Red'},
                }
            ]
        },
        {
            'name': 'Private Island',
            'category': 'Real Estate',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Private island in the Caribbean. Price includes helicopter transfer. Financing available!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '1 Acre',
                    'price': Decimal('1999999.99'),
                    'quantity': 1,
                    'sku_code': 'PRICE-ISLAND-1',
                    'option_map': {'Size': '1 Acre'},
                }
            ]
        },
        {
            'name': 'SpaceX Flight Ticket',
            'category': 'Travel',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Ticket for SpaceX lunar mission. Price includes training. Limited seats!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Economy Class',
                    'price': Decimal('499999.99'),
                    'quantity': 3,
                    'sku_code': 'PRICE-SPACE-1',
                    'option_map': {'Class': 'Economy'},
                }
            ]
        },
        # 221-230: Products with category mismatches
        {
            'name': 'Refrigerator',
            'category': 'Smartphones & Tablets',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Samsung 4-door refrigerator with smart display. Keeps your food cold and browses the web!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Stainless Steel',
                    'price': Decimal('1999.99'),
                    'quantity': 2,
                    'sku_code': 'MISMATCH-FRIDGE-1',
                    'option_map': {'Color': 'Stainless'},
                }
            ]
        },
        {
            'name': 'Dog Food',
            'category': 'Laptops & Computers',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Premium organic dog food. Grain-free, high protein. Your dog will love it!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '25lb Bag',
                    'price': Decimal('89.99'),
                    'quantity': 50,
                    'sku_code': 'MISMATCH-DOG-1',
                    'option_map': {'Size': '25lb'},
                }
            ]
        },
        {
            'name': 'Motorcycle Helmet',
            'category': 'Audio & Headphones',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Full-face motorcycle helmet with Bluetooth speakers. Listen to music while riding!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Matte Black - Large',
                    'price': Decimal('299.99'),
                    'quantity': 8,
                    'sku_code': 'MISMATCH-HELMET-1',
                    'option_map': {'Size': 'Large', 'Color': 'Black'},
                }
            ]
        },
        {
            'name': 'Garden Shovel',
            'category': 'Cameras & Photography',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Heavy-duty garden shovel for digging. Ergonomic handle. Perfect for photographers?',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Steel Blade',
                    'price': Decimal('34.99'),
                    'quantity': 20,
                    'sku_code': 'MISMATCH-SHOVEL-1',
                    'option_map': {'Material': 'Steel'},
                }
            ]
        },
        {
            'name': 'Yoga Mat',
            'category': 'Gaming Consoles & Accessories',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Non-slip yoga mat with carrying strap. Great for gaming floor exercises!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Purple - 6mm',
                    'price': Decimal('49.99'),
                    'quantity': 30,
                    'sku_code': 'MISMATCH-YOGA-1',
                    'option_map': {'Color': 'Purple', 'Thickness': '6mm'},
                }
            ]
        },
        {
            'name': 'Coffee Maker',
            'category': 'Smartwatches & Wearables',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Programmable coffee maker with thermal carafe. Brews 12 cups. Wear it on your wrist!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Black',
                    'price': Decimal('129.99'),
                    'quantity': 6,
                    'sku_code': 'MISMATCH-COFFEE-1',
                    'option_map': {'Color': 'Black'},
                }
            ]
        },
        {
            'name': 'Tent',
            'category': 'Home Electronics',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': '4-person camping tent with rain fly. Waterproof. For your smart home setup!',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Green - 4 Person',
                    'price': Decimal('199.99'),
                    'quantity': 5,
                    'sku_code': 'MISMATCH-TENT-1',
                    'option_map': {'Capacity': '4 Person'},
                }
            ]
        },
        {
            'name': 'Bicycle',
            'category': 'Computer Accessories',
            'shop': 'Display Masters',
            'condition': 'Used - Good',
            'status': 'Active',
            'description': 'Mountain bike, 21 speeds. Perfect for commuting to your computer!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Red/Black',
                    'price': Decimal('299.99'),
                    'quantity': 1,
                    'sku_code': 'MISMATCH-BIKE-1',
                    'option_map': {'Color': 'Red/Black'},
                }
            ]
        },
        {
            'name': 'Running Shoes',
            'category': 'Mobile Accessories',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Men\'s running shoes, size 10. Comfortable for chasing your mobile devices!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Blue/White',
                    'price': Decimal('89.99'),
                    'quantity': 10,
                    'sku_code': 'MISMATCH-SHOES-1',
                    'option_map': {'Size': '10', 'Color': 'Blue/White'},
                }
            ]
        },
        {
            'name': 'Pillow',
            'category': 'Gift Cards',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Memory foam pillow with cooling gel. Sleep better. Redeemable for sleep!',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Queen Size',
                    'price': Decimal('59.99'),
                    'quantity': 15,
                    'sku_code': 'MISMATCH-PILLOW-1',
                    'option_map': {'Size': 'Queen'},
                }
            ]
        },
        # 231-240: Products with forbidden words/profanity
        {
            'name': 'F***ing Awesome T-Shirt',
            'category': 'Fashion',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Super cool t-shirt with profanity. Makes you look edgy and cool. Various sizes.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Size L - Black',
                    'price': Decimal('29.99'),
                    'quantity': 10,
                    'sku_code': 'PROFANE-TEE-1',
                    'option_map': {'Size': 'L', 'Color': 'Black'},
                }
            ]
        },
        {
            'name': 'S**t Happens Mug',
            'category': 'Kitchen',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Coffee mug with profane message. Dishwasher safe. Makes mornings better!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '11oz White',
                    'price': Decimal('14.99'),
                    'quantity': 25,
                    'sku_code': 'PROFANE-MUG-1',
                    'option_map': {'Size': '11oz'},
                }
            ]
        },
        {
            'name': 'B******t Detector',
            'category': 'Novelty',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Electronic device that lights up when it detects BS. Perfect for office meetings!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Desk Model',
                    'price': Decimal('39.99'),
                    'quantity': 8,
                    'sku_code': 'PROFANE-DET-1',
                    'option_map': {'Model': 'Desk'},
                }
            ]
        },
        {
            'name': 'Hate My Job Mousepad',
            'category': 'Computer Accessories',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Mousepad with explicit message about hating work. Makes WFH more honest.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Standard Size',
                    'price': Decimal('19.99'),
                    'quantity': 15,
                    'sku_code': 'PROFANE-MPAD-1',
                    'option_map': {'Size': 'Standard'},
                }
            ]
        },
        {
            'name': 'Adult Coloring Book - Swear Words',
            'category': 'Books',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Relaxing coloring book for adults featuring intricate patterns and swear words. Stress relief!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Volume 1',
                    'price': Decimal('12.99'),
                    'quantity': 40,
                    'sku_code': 'PROFANE-BOOK-1',
                    'option_map': {'Volume': '1'},
                }
            ]
        },
        {
            'name': 'Explicit Lyrics Vinyl',
            'category': 'Music',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Rap album with explicit lyrics. Parental advisory sticker. Contains strong language.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Vinyl LP',
                    'price': Decimal('34.99'),
                    'quantity': 6,
                    'sku_code': 'PROFANE-VINYL-1',
                    'option_map': {'Format': 'Vinyl'},
                }
            ]
        },
        {
            'name': 'Offensive Bumper Sticker Pack',
            'category': 'Automotive',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Pack of 10 offensive bumper stickers. Guaranteed to offend everyone. Weather resistant!',
            'is_refundable': True,
            'refund_days': 3,
            'variants': [
                {
                    'title': 'Mixed Pack',
                    'price': Decimal('24.99'),
                    'quantity': 20,
                    'sku_code': 'PROFANE-STICK-1',
                    'option_map': {'Pack': '10 Stickers'},
                }
            ]
        },
        {
            'name': 'Rude Door Mat',
            'category': 'Home',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Welcome mat with rude message. Let your guests know what you really think!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Standard Size',
                    'price': Decimal('29.99'),
                    'quantity': 12,
                    'sku_code': 'PROFANE-MAT-1',
                    'option_map': {'Size': 'Standard'},
                }
            ]
        },
        {
            'name': 'NSFW Phone Case',
            'category': 'Mobile Accessories',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Phone case with explicit image. Not safe for work. For iPhone 15 Pro Max.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'iPhone 15 Pro Max',
                    'price': Decimal('39.99'),
                    'quantity': 8,
                    'sku_code': 'PROFANE-CASE-1',
                    'option_map': {'Model': 'iPhone 15 Pro Max'},
                }
            ]
        },
        {
            'name': 'Sarcastic Greeting Card Set',
            'category': 'Stationery',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Set of 6 sarcastic greeting cards with snarky messages. Perfect for passive aggressive people.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Assorted',
                    'price': Decimal('19.99'),
                    'quantity': 25,
                    'sku_code': 'PROFANE-CARDS-1',
                    'option_map': {'Set': '6 Cards'},
                }
            ]
        },
        # 241-250: Products with multiple variants and complex options
        {
            'name': 'Custom Gaming PC Builder',
            'category': 'Computers',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Build your own gaming PC with our component selection. Choose CPU, GPU, RAM, storage, and more!',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'RTX 4060 + i5',
                    'price': Decimal('1299.99'),
                    'quantity': 3,
                    'sku_code': 'CUSTOM-PC-1',
                    'option_map': {'GPU': 'RTX 4060', 'CPU': 'i5-13400F', 'RAM': '16GB', 'Storage': '512GB'},
                },
                {
                    'title': 'RTX 4070 + i7',
                    'price': Decimal('1899.99'),
                    'quantity': 2,
                    'sku_code': 'CUSTOM-PC-2',
                    'option_map': {'GPU': 'RTX 4070', 'CPU': 'i7-13700F', 'RAM': '32GB', 'Storage': '1TB'},
                },
                {
                    'title': 'RTX 4080 + i9',
                    'price': Decimal('2799.99'),
                    'quantity': 1,
                    'sku_code': 'CUSTOM-PC-3',
                    'option_map': {'GPU': 'RTX 4080', 'CPU': 'i9-13900K', 'RAM': '64GB', 'Storage': '2TB'},
                },
                {
                    'title': 'RTX 4090 + i9',
                    'price': Decimal('3999.99'),
                    'quantity': 1,
                    'sku_code': 'CUSTOM-PC-4',
                    'option_map': {'GPU': 'RTX 4090', 'CPU': 'i9-13900KS', 'RAM': '128GB', 'Storage': '4TB'},
                },
            ]
        },
        {
            'name': 'Mechanical Keyboard Switch Sampler',
            'category': 'Computer Accessories',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Try before you buy! 20 different mechanical keyboard switches to test. Find your perfect switch!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Cherry MX Sampler',
                    'price': Decimal('29.99'),
                    'quantity': 15,
                    'sku_code': 'SWITCH-CHERRY',
                    'option_map': {'Brand': 'Cherry MX', 'Switches': 'Red, Blue, Brown, Black, Silver'},
                },
                {
                    'title': 'Gateron Sampler',
                    'price': Decimal('29.99'),
                    'quantity': 12,
                    'sku_code': 'SWITCH-GATERON',
                    'option_map': {'Brand': 'Gateron', 'Switches': 'Red, Blue, Brown, Yellow, Black'},
                },
                {
                    'title': 'Kailh Sampler',
                    'price': Decimal('34.99'),
                    'quantity': 10,
                    'sku_code': 'SWITCH-KAILH',
                    'option_map': {'Brand': 'Kailh', 'Switches': 'Box Red, Box White, Box Brown, Speed Silver, Pro Purple'},
                },
                {
                    'title': 'Premium Mix Sampler',
                    'price': Decimal('49.99'),
                    'quantity': 8,
                    'sku_code': 'SWITCH-PREMIUM',
                    'option_map': {'Brands': 'Zeal, TTC, Durock, JWK', 'Switches': '10 Premium Switches'},
                },
            ]
        },
        {
            'name': 'Camera Lens Bundle',
            'category': 'Cameras & Photography',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Professional camera lens bundle for Sony E-mount. Choose your focal lengths!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '16-35mm + 24-70mm',
                    'price': Decimal('3499.99'),
                    'quantity': 2,
                    'sku_code': 'LENS-SONY-1',
                    'option_map': {'Lenses': '16-35mm f/2.8, 24-70mm f/2.8'},
                },
                {
                    'title': '24-70mm + 70-200mm',
                    'price': Decimal('3999.99'),
                    'quantity': 2,
                    'sku_code': 'LENS-SONY-2',
                    'option_map': {'Lenses': '24-70mm f/2.8, 70-200mm f/2.8'},
                },
                {
                    'title': '16-35mm + 24-70mm + 70-200mm',
                    'price': Decimal('5999.99'),
                    'quantity': 1,
                    'sku_code': 'LENS-SONY-3',
                    'option_map': {'Lenses': 'Holy Trinity'},
                },
                {
                    'title': 'Prime Trio: 24mm + 50mm + 85mm',
                    'price': Decimal('2499.99'),
                    'quantity': 3,
                    'sku_code': 'LENS-SONY-4',
                    'option_map': {'Lenses': '24mm f/1.4, 50mm f/1.2, 85mm f/1.4'},
                },
            ]
        },
        {
            'name': 'Smart Home Starter Kit',
            'category': 'Home Electronics',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Complete smart home starter kit. Mix and match devices to build your system!',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Basic: Hub + 2 Bulbs',
                    'price': Decimal('149.99'),
                    'quantity': 10,
                    'sku_code': 'SMART-BASIC',
                    'option_map': {'Kit': 'Basic', 'Includes': 'Hub, 2 Smart Bulbs'},
                },
                {
                    'title': 'Security: Hub + Cameras',
                    'price': Decimal('299.99'),
                    'quantity': 5,
                    'sku_code': 'SMART-SEC',
                    'option_map': {'Kit': 'Security', 'Includes': 'Hub, 2 Cameras, Door Sensor'},
                },
                {
                    'title': 'Comfort: Hub + Thermostat',
                    'price': Decimal('249.99'),
                    'quantity': 7,
                    'sku_code': 'SMART-COMFORT',
                    'option_map': {'Kit': 'Comfort', 'Includes': 'Hub, Thermostat, 2 Sensors'},
                },
                {
                    'title': 'Ultimate: Everything',
                    'price': Decimal('599.99'),
                    'quantity': 3,
                    'sku_code': 'SMART-ULT',
                    'option_map': {'Kit': 'Ultimate', 'Includes': 'Hub, 4 Bulbs, 2 Cameras, Thermostat, 3 Sensors, Lock'},
                },
            ]
        },
        {
            'name': 'Gaming Chair',
            'category': 'Furniture',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Ergonomic gaming chair with multiple color options and features.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Black/Red - Standard',
                    'price': Decimal('199.99'),
                    'quantity': 8,
                    'sku_code': 'CHAIR-BR-S',
                    'option_map': {'Color': 'Black/Red', 'Model': 'Standard'},
                },
                {
                    'title': 'Black/Blue - Standard',
                    'price': Decimal('199.99'),
                    'quantity': 6,
                    'sku_code': 'CHAIR-BB-S',
                    'option_map': {'Color': 'Black/Blue', 'Model': 'Standard'},
                },
                {
                    'title': 'White/Pink - Standard',
                    'price': Decimal('199.99'),
                    'quantity': 4,
                    'sku_code': 'CHAIR-WP-S',
                    'option_map': {'Color': 'White/Pink', 'Model': 'Standard'},
                },
                {
                    'title': 'Black/Red - Premium (Lumbar)',
                    'price': Decimal('299.99'),
                    'quantity': 5,
                    'sku_code': 'CHAIR-BR-P',
                    'option_map': {'Color': 'Black/Red', 'Model': 'Premium', 'Features': 'Adjustable Lumbar'},
                },
                {
                    'title': 'Black - Executive',
                    'price': Decimal('399.99'),
                    'quantity': 3,
                    'sku_code': 'CHAIR-BLK-E',
                    'option_map': {'Color': 'Black', 'Model': 'Executive', 'Material': 'Leather'},
                },
            ]
        },
        {
            'name': 'Smartphone Case Variety Pack',
            'category': 'Mobile Accessories',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Mix and match cases for different iPhone models. Perfect for families!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'iPhone 15 Pro Max - Clear',
                    'price': Decimal('29.99'),
                    'quantity': 15,
                    'sku_code': 'CASE-15PM-CLR',
                    'option_map': {'Model': 'iPhone 15 Pro Max', 'Type': 'Clear'},
                },
                {
                    'title': 'iPhone 15 Pro Max - Silicone',
                    'price': Decimal('39.99'),
                    'quantity': 12,
                    'sku_code': 'CASE-15PM-SIL',
                    'option_map': {'Model': 'iPhone 15 Pro Max', 'Type': 'Silicone'},
                },
                {
                    'title': 'iPhone 15 Pro - Clear',
                    'price': Decimal('29.99'),
                    'quantity': 10,
                    'sku_code': 'CASE-15P-CLR',
                    'option_map': {'Model': 'iPhone 15 Pro', 'Type': 'Clear'},
                },
                {
                    'title': 'iPhone 15 - Silicone',
                    'price': Decimal('34.99'),
                    'quantity': 8,
                    'sku_code': 'CASE-15-SIL',
                    'option_map': {'Model': 'iPhone 15', 'Type': 'Silicone'},
                },
                {
                    'title': 'Family Pack - All Models',
                    'price': Decimal('129.99'),
                    'quantity': 3,
                    'sku_code': 'CASE-FAMILY',
                    'option_map': {'Includes': '4 Cases for different models'},
                },
            ]
        },
        {
            'name': 'Coffee Subscription',
            'category': 'Subscription Boxes',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Monthly coffee subscription with beans from around the world. Choose your roast!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Light Roast - Monthly',
                    'price': Decimal('24.99'),
                    'quantity': 100,
                    'sku_code': 'COFFEE-LT-M',
                    'option_map': {'Roast': 'Light', 'Frequency': 'Monthly'},
                },
                {
                    'title': 'Medium Roast - Monthly',
                    'price': Decimal('24.99'),
                    'quantity': 100,
                    'sku_code': 'COFFEE-MD-M',
                    'option_map': {'Roast': 'Medium', 'Frequency': 'Monthly'},
                },
                {
                    'title': 'Dark Roast - Monthly',
                    'price': Decimal('24.99'),
                    'quantity': 100,
                    'sku_code': 'COFFEE-DK-M',
                    'option_map': {'Roast': 'Dark', 'Frequency': 'Monthly'},
                },
                {
                    'title': 'Variety Pack - Monthly',
                    'price': Decimal('29.99'),
                    'quantity': 75,
                    'sku_code': 'COFFEE-VAR-M',
                    'option_map': {'Roast': 'Variety', 'Frequency': 'Monthly'},
                },
                {
                    'title': 'Light Roast - Bi-Weekly',
                    'price': Decimal('44.99'),
                    'quantity': 50,
                    'sku_code': 'COFFEE-LT-BW',
                    'option_map': {'Roast': 'Light', 'Frequency': 'Bi-Weekly'},
                },
            ]
        },
        {
            'name': 'Streaming Microphone',
            'category': 'Audio',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Professional USB microphone for streaming and podcasting. Multiple pickup patterns.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Black - Cardioid Only',
                    'price': Decimal('99.99'),
                    'quantity': 12,
                    'sku_code': 'MIC-BLK-CARD',
                    'option_map': {'Color': 'Black', 'Pattern': 'Cardioid'},
                },
                {
                    'title': 'White - Cardioid Only',
                    'price': Decimal('99.99'),
                    'quantity': 8,
                    'sku_code': 'MIC-WHT-CARD',
                    'option_map': {'Color': 'White', 'Pattern': 'Cardioid'},
                },
                {
                    'title': 'Black - Multi-Pattern',
                    'price': Decimal('149.99'),
                    'quantity': 6,
                    'sku_code': 'MIC-BLK-MULTI',
                    'option_map': {'Color': 'Black', 'Pattern': 'Cardioid, Bidirectional, Stereo, Omnidirectional'},
                },
                {
                    'title': 'White - Multi-Pattern',
                    'price': Decimal('149.99'),
                    'quantity': 4,
                    'sku_code': 'MIC-WHT-MULTI',
                    'option_map': {'Color': 'White', 'Pattern': 'Cardioid, Bidirectional, Stereo, Omnidirectional'},
                },
                {
                    'title': 'Studio Bundle with Arm',
                    'price': Decimal('199.99'),
                    'quantity': 5,
                    'sku_code': 'MIC-BUNDLE',
                    'option_map': {'Includes': 'Microphone, Arm, Pop Filter, Shock Mount'},
                },
            ]
        },
        {
            'name': 'External SSD',
            'category': 'Computer Accessories',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Portable external SSD with fast transfer speeds. Multiple sizes available.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': '500GB - USB 3.2',
                    'price': Decimal('89.99'),
                    'quantity': 20,
                    'sku_code': 'SSD-500G-USB',
                    'option_map': {'Capacity': '500GB', 'Interface': 'USB 3.2'},
                },
                {
                    'title': '1TB - USB 3.2',
                    'price': Decimal('149.99'),
                    'quantity': 15,
                    'sku_code': 'SSD-1T-USB',
                    'option_map': {'Capacity': '1TB', 'Interface': 'USB 3.2'},
                },
                {
                    'title': '2TB - USB 3.2',
                    'price': Decimal('249.99'),
                    'quantity': 10,
                    'sku_code': 'SSD-2T-USB',
                    'option_map': {'Capacity': '2TB', 'Interface': 'USB 3.2'},
                },
                {
                    'title': '1TB - Thunderbolt 3',
                    'price': Decimal('199.99'),
                    'quantity': 8,
                    'sku_code': 'SSD-1T-TB3',
                    'option_map': {'Capacity': '1TB', 'Interface': 'Thunderbolt 3'},
                },
                {
                    'title': '2TB - Thunderbolt 3',
                    'price': Decimal('299.99'),
                    'quantity': 5,
                    'sku_code': 'SSD-2T-TB3',
                    'option_map': {'Capacity': '2TB', 'Interface': 'Thunderbolt 3'},
                },
            ]
        },
        {
            'name': 'Fitness Tracker',
            'category': 'Smartwatches & Wearables',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Advanced fitness tracker with heart rate monitoring, GPS, and sleep tracking.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Black - Small',
                    'price': Decimal('129.99'),
                    'quantity': 15,
                    'sku_code': 'FIT-BLK-S',
                    'option_map': {'Color': 'Black', 'Size': 'Small'},
                },
                {
                    'title': 'Black - Large',
                    'price': Decimal('129.99'),
                    'quantity': 12,
                    'sku_code': 'FIT-BLK-L',
                    'option_map': {'Color': 'Black', 'Size': 'Large'},
                },
                {
                    'title': 'Blue - Small',
                    'price': Decimal('129.99'),
                    'quantity': 8,
                    'sku_code': 'FIT-BLU-S',
                    'option_map': {'Color': 'Blue', 'Size': 'Small'},
                },
                {
                    'title': 'Blue - Large',
                    'price': Decimal('129.99'),
                    'quantity': 6,
                    'sku_code': 'FIT-BLU-L',
                    'option_map': {'Color': 'Blue', 'Size': 'Large'},
                },
                {
                    'title': 'Pink - Small',
                    'price': Decimal('129.99'),
                    'quantity': 10,
                    'sku_code': 'FIT-PNK-S',
                    'option_map': {'Color': 'Pink', 'Size': 'Small'},
                },
                {
                    'title': 'Pink - Large',
                    'price': Decimal('129.99'),
                    'quantity': 7,
                    'sku_code': 'FIT-PNK-L',
                    'option_map': {'Color': 'Pink', 'Size': 'Large'},
                },
            ]
        },
        # 251-260: Products with shipping restrictions
        {
            'name': 'Lithium Battery Pack - Air Shipping Restricted',
            'category': 'Electronics',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'High capacity lithium battery pack. Cannot ship by air. Ground shipping only due to regulations.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '50000mAh',
                    'price': Decimal('199.99'),
                    'quantity': 5,
                    'sku_code': 'SHIP-BATT-1',
                    'option_map': {'Capacity': '50000mAh'},
                }
            ]
        },
        {
            'name': 'Perfume - Alcohol Based',
            'category': 'Beauty',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Luxury perfume with alcohol. Hazardous material shipping restrictions apply. Ground only.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '50ml',
                    'price': Decimal('89.99'),
                    'quantity': 8,
                    'sku_code': 'SHIP-PERF-1',
                    'option_map': {'Size': '50ml'},
                }
            ]
        },
        {
            'name': 'Aerosol Spray Paint',
            'category': 'Art Supplies',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Aerosol spray paint cans. Pressurized containers - cannot ship airmail. Ground only.',
            'is_refundable': True,
            'refund_days': 3,
            'variants': [
                {
                    'title': '12 Color Set',
                    'price': Decimal('79.99'),
                    'quantity': 4,
                    'sku_code': 'SHIP-SPRAY-1',
                    'option_map': {'Set': '12 Colors'},
                }
            ]
        },
        {
            'name': 'Nail Polish Set',
            'category': 'Beauty',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Flammable nail polish set. Shipping restrictions apply. Cannot ship to PO boxes.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '24 Color Set',
                    'price': Decimal('49.99'),
                    'quantity': 6,
                    'sku_code': 'SHIP-NAIL-1',
                    'option_map': {'Set': '24 Colors'},
                }
            ]
        },
        {
            'name': 'Camping Stove Fuel',
            'category': 'Outdoors',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Camping stove fuel canisters. Hazardous material - ground shipping only. Adult signature required.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '4 Pack',
                    'price': Decimal('39.99'),
                    'quantity': 3,
                    'sku_code': 'SHIP-FUEL-1',
                    'option_map': {'Pack': '4 Canisters'},
                }
            ]
        },
        {
            'name': 'Essential Oils Set',
            'category': 'Health',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Concentrated essential oils. Flammable liquid class 3. Shipping restrictions apply.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '10 Bottle Set',
                    'price': Decimal('59.99'),
                    'quantity': 5,
                    'sku_code': 'SHIP-OIL-1',
                    'option_map': {'Set': '10 Scents'},
                }
            ]
        },
        {
            'name': 'Fire Extinguisher',
            'category': 'Safety',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Pressurized fire extinguisher. Cannot ship by air. Ground shipping only. Safety equipment.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '5lb ABC',
                    'price': Decimal('49.99'),
                    'quantity': 4,
                    'sku_code': 'SHIP-FIRE-1',
                    'option_map': {'Size': '5lb'},
                }
            ]
        },
        {
            'name': 'Magnetic Tools Set',
            'category': 'Tools',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Strong magnetic tools. May interfere with electronics. Special shipping packaging required.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '15 Piece Set',
                    'price': Decimal('69.99'),
                    'quantity': 3,
                    'sku_code': 'SHIP-MAG-1',
                    'option_map': {'Set': '15 Pieces'},
                }
            ]
        },
        {
            'name': 'Mercury Thermometer',
            'category': 'Health',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Traditional mercury thermometer. Contains mercury - hazardous material. Special shipping required.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Glass',
                    'price': Decimal('19.99'),
                    'quantity': 2,
                    'sku_code': 'SHIP-MERC-1',
                    'option_map': {'Type': 'Glass'},
                }
            ]
        },
        {
            'name': 'Bleach Cleaning Solution',
            'category': 'Household',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Concentrated bleach cleaning solution. Corrosive material. Ground shipping only. Cannot ship internationally.',
            'is_refundable': True,
            'refund_days': 3,
            'variants': [
                {
                    'title': '1 Gallon',
                    'price': Decimal('24.99'),
                    'quantity': 6,
                    'sku_code': 'SHIP-BLEACH-1',
                    'option_map': {'Size': '1 Gallon'},
                }
            ]
        },
        # 261-270: Products with unusual measurements/units
        {
            'name': 'Giant USB Cable - 100 Feet',
            'category': 'Computer Accessories',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Extremely long USB-C cable. 100 feet long. Use your devices from across the house!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'USB-C to USB-C',
                    'price': Decimal('49.99'),
                    'quantity': 5,
                    'sku_code': 'UNIT-CABLE-100',
                    'option_map': {'Length': '100ft', 'Type': 'USB-C'},
                }
            ]
        },
        {
            'name': 'Tiny Bluetooth Speaker - 1 inch',
            'category': 'Audio',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'World\'s smallest Bluetooth speaker. Only 1 inch in diameter. Surprisingly loud!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Micro Speaker',
                    'price': Decimal('29.99'),
                    'quantity': 20,
                    'sku_code': 'UNIT-SPKR-MICRO',
                    'option_map': {'Size': '1"'},
                }
            ]
        },
        {
            'name': 'Extra Large Mouse Pad - 4 feet',
            'category': 'Computer Accessories',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Giant desk mat covering your entire desk. 4 feet wide. Fits full keyboard and mouse.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': 'Black - 48" x 24"',
                    'price': Decimal('49.99'),
                    'quantity': 8,
                    'sku_code': 'UNIT-MPAD-XL',
                    'option_map': {'Size': '48"x24"', 'Color': 'Black'},
                }
            ]
        },
        {
            'name': 'Micro SD Card - 2TB',
            'category': 'Storage',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Massive 2TB micro SD card. Store your entire life on this tiny card!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '2TB A2 V30',
                    'price': Decimal('199.99'),
                    'quantity': 3,
                    'sku_code': 'UNIT-SD-2TB',
                    'option_map': {'Capacity': '2TB', 'Speed': 'V30'},
                }
            ]
        },
        {
            'name': 'Heavy Duty Power Strip - 1000J',
            'category': 'Electronics',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Surge protector with 1000 Joule rating. Protects your expensive electronics.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': '12 Outlet + USB',
                    'price': Decimal('59.99'),
                    'quantity': 6,
                    'sku_code': 'UNIT-POWER-1000J',
                    'option_map': {'Joules': '1000J', 'Outlets': '12'},
                }
            ]
        },
        {
            'name': 'Ultra Thin Laptop - 0.5 inches',
            'category': 'Laptops',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Incredibly thin laptop. Only half an inch thick. Lightweight and portable.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': '13" 4K',
                    'price': Decimal('1299.99'),
                    'quantity': 2,
                    'sku_code': 'UNIT-LAPTOP-THIN',
                    'option_map': {'Thickness': '0.5"', 'Screen': '13"'},
                }
            ]
        },
        {
            'name': 'Industrial Strength Adhesive - 5000 PSI',
            'category': 'Tools',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Super strong epoxy with 5000 PSI bond strength. Industrial grade.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Dual Syringe 50ml',
                    'price': Decimal('24.99'),
                    'quantity': 15,
                    'sku_code': 'UNIT-EPOXY-5000',
                    'option_map': {'Strength': '5000 PSI', 'Size': '50ml'},
                }
            ]
        },
        {
            'name': 'High Speed HDMI Cable - 48Gbps',
            'category': 'Cables',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'Ultra high speed HDMI 2.1 cable. 48Gbps bandwidth. Supports 8K 120Hz.',
            'is_refundable': True,
            'refund_days': 14,
            'variants': [
                {
                    'title': '6ft - 48Gbps',
                    'price': Decimal('29.99'),
                    'quantity': 12,
                    'sku_code': 'UNIT-HDMI-48G',
                    'option_map': {'Speed': '48Gbps', 'Length': '6ft'},
                }
            ]
        },
        {
            'name': 'Powerful LED Flashlight - 100000 Lumens',
            'category': 'Tools',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Insanely bright flashlight. 100000 lumens. Lights up the entire neighborhood!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Rechargeable',
                    'price': Decimal('89.99'),
                    'quantity': 4,
                    'sku_code': 'UNIT-FLASH-100K',
                    'option_map': {'Brightness': '100000 Lumens'},
                }
            ]
        },
        {
            'name': 'Precision Scale - 0.001g Accuracy',
            'category': 'Tools',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Professional precision scale with 0.001 gram accuracy. Perfect for jewelry or lab work.',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '100g Capacity',
                    'price': Decimal('79.99'),
                    'quantity': 6,
                    'sku_code': 'UNIT-SCALE-001G',
                    'option_map': {'Accuracy': '0.001g', 'Capacity': '100g'},
                }
            ]
        },
        # 271-280: Products with suspicious seller notes
        {
            'name': 'iPhone 14 Pro Max - Friend\'s Phone',
            'category': 'Smartphones',
            'shop': 'Tech Haven',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Selling for my friend who is in hospital. Need money for medical bills. Very cheap!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Purple 256GB',
                    'price': Decimal('299.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-IP14-1',
                    'option_map': {'Color': 'Purple', 'Storage': '256GB'},
                }
            ]
        },
        {
            'name': 'MacBook Pro - Found in Office',
            'category': 'Laptops',
            'shop': 'Gadget World',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Found this in my office after company closed. No one claimed it. Selling as is.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Space Gray 16"',
                    'price': Decimal('599.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-MBP-1',
                    'option_map': {'Color': 'Space Gray', 'Size': '16"'},
                }
            ]
        },
        {
            'name': 'PS5 - Ex-girlfriend left it',
            'category': 'Gaming',
            'shop': 'Display Masters',
            'condition': 'Used',
            'status': 'Active',
            'description': 'My ex left this at my place. Need to sell quick before she comes back. No controllers.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Disc Version',
                    'price': Decimal('299.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-PS5-1',
                    'option_map': {'Version': 'Disc'},
                }
            ]
        },
        {
            'name': 'Camera Gear - Moving Overseas',
            'category': 'Cameras',
            'shop': 'Connect Tech',
            'condition': 'Like New',
            'status': 'Active',
            'description': 'Moving overseas tomorrow! Must sell everything today. Cash only, local pickup.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Sony A7III Kit',
                    'price': Decimal('899.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-CAM-1',
                    'option_map': {'Model': 'A7III'},
                }
            ]
        },
        {
            'name': 'Gold Jewelry - Grandmother\'s',
            'category': 'Jewelry',
            'shop': 'KeyClack',
            'condition': 'Used',
            'status': 'Active',
            'description': 'My grandmother passed away and left me these. I have no use for them. Real gold!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Necklace + Earrings',
                    'price': Decimal('499.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-GOLD-1',
                    'option_map': {'Set': 'Necklace + Earrings'},
                }
            ]
        },
        {
            'name': 'DJI Drone - Gift from Ex',
            'category': 'Drones',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Gift from ex that I don\'t want anymore. Never opened. Just want it gone.',
            'is_refundable': True,
            'refund_days': 1,
            'variants': [
                {
                    'title': 'Mavic Air 2',
                    'price': Decimal('399.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-DRONE-1',
                    'option_map': {'Model': 'Mavic Air 2'},
                }
            ]
        },
        {
            'name': 'Nintendo Switch - Kids don\'t use',
            'category': 'Gaming',
            'shop': 'Gadget World',
            'condition': 'Used',
            'status': 'Active',
            'description': 'My kids never play with this. Selling to buy them something else. Works perfectly.',
            'is_refundable': True,
            'refund_days': 3,
            'variants': [
                {
                    'title': 'V1 Unpatched',
                    'price': Decimal('199.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-NS-1',
                    'option_map': {'Model': 'V1'},
                }
            ]
        },
        {
            'name': 'Gaming PC - Urgent Sale',
            'category': 'Computers',
            'shop': 'Display Masters',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Need money for rent tomorrow! Selling my gaming PC. Specs in photos. Must sell TODAY!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'RTX 3080 Build',
                    'price': Decimal('699.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-PC-1',
                    'option_map': {'GPU': 'RTX 3080'},
                }
            ]
        },
        {
            'name': 'AirPods Pro - Found on Subway',
            'category': 'Audio',
            'shop': 'Connect Tech',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Found these on the subway. Tried to find owner but no luck. Selling cheap!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'AirPods Pro',
                    'price': Decimal('99.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-AIR-1',
                    'option_map': {'Model': 'AirPods Pro'},
                }
            ]
        },
        {
            'name': 'Samsung TV - Landlord left',
            'category': 'TVs',
            'shop': 'KeyClack',
            'condition': 'Used',
            'status': 'Active',
            'description': 'Landlord left this in my apartment when I moved in. Moving out now, can\'t take it.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '65" 4K',
                    'price': Decimal('299.99'),
                    'quantity': 1,
                    'sku_code': 'SUSPECT-TV-1',
                    'option_map': {'Size': '65"'},
                }
            ]
        },
        # 281-290: Products with quantity issues
        {
            'name': 'iPhone 15 Pro Max',
            'category': 'Smartphones',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'iPhone 15 Pro Max 1TB. Selling in bulk quantity. 1000 units available!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Natural Titanium',
                    'price': Decimal('1599.99'),
                    'quantity': 1000,
                    'sku_code': 'QUANTITY-IP15-1',
                    'option_map': {'Color': 'Natural Titanium'},
                }
            ]
        },
        {
            'name': 'RTX 4090 Graphics Card',
            'category': 'Components',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'NVIDIA RTX 4090. Huge stock available. 500 units ready to ship!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Founders Edition',
                    'price': Decimal('1599.99'),
                    'quantity': 500,
                    'sku_code': 'QUANTITY-RTX-1',
                    'option_map': {'Model': 'Founders'},
                }
            ]
        },
        {
            'name': 'PlayStation 5 Console',
            'category': 'Gaming',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'PS5 Disc Edition. Limited stock? Actually we have 2000 units. Bulk pricing available.',
            'is_refundable': True,
            'refund_days': 3,
            'variants': [
                {
                    'title': 'Disc Version',
                    'price': Decimal('499.99'),
                    'quantity': 2000,
                    'sku_code': 'QUANTITY-PS5-1',
                    'option_map': {'Version': 'Disc'},
                }
            ]
        },
        {
            'name': 'AirPods Pro',
            'category': 'Audio',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'AirPods Pro 2nd gen. Bulk wholesale lot. 10000 units available. Dropshippers welcome!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'USB-C Version',
                    'price': Decimal('199.99'),
                    'quantity': 10000,
                    'sku_code': 'QUANTITY-AIR-1',
                    'option_map': {'Version': 'USB-C'},
                }
            ]
        },
        {
            'name': 'Samsung 65" OLED TV',
            'category': 'TVs',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Samsung S95C OLED TV. Only 2 left in stock! (Actually showing 2 but we have more)',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '65" S95C',
                    'price': Decimal('2499.99'),
                    'quantity': 2,
                    'sku_code': 'QUANTITY-TV-1',
                    'option_map': {'Size': '65"', 'Model': 'S95C'},
                }
            ]
        },
        {
            'name': 'MacBook Pro M3',
            'category': 'Laptops',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'MacBook Pro M3 Max. Quantity: -5 (pre-orders)',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Space Black',
                    'price': Decimal('3499.99'),
                    'quantity': -5,
                    'sku_code': 'QUANTITY-MBP-1',
                    'option_map': {'Color': 'Space Black'},
                }
            ]
        },
        {
            'name': 'Gaming Chair',
            'category': 'Furniture',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'Ergonomic gaming chair. Quantity: 999999 in stock! Unlimited supply!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Black/Red',
                    'price': Decimal('199.99'),
                    'quantity': 999999,
                    'sku_code': 'QUANTITY-CHAIR-1',
                    'option_map': {'Color': 'Black/Red'},
                }
            ]
        },
        {
            'name': 'USB-C Cable',
            'category': 'Cables',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'USB-C charging cable. Quantity: 0 but we can get more. Backorder allowed!',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '6ft Braided',
                    'price': Decimal('14.99'),
                    'quantity': 0,
                    'sku_code': 'QUANTITY-CABLE-1',
                    'option_map': {'Length': '6ft', 'Type': 'Braided'},
                }
            ]
        },
        {
            'name': 'External Hard Drive',
            'category': 'Storage',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': '5TB external hard drive. Quantity changes based on stock. Currently 1.5?',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': '5TB Portable',
                    'price': Decimal('129.99'),
                    'quantity': 1,
                    'sku_code': 'QUANTITY-HDD-1',
                    'option_map': {'Capacity': '5TB'},
                }
            ]
        },
        {
            'name': 'Wireless Mouse',
            'category': 'Accessories',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Wireless gaming mouse. Limited stock! Only 1 left! (We have 50)',
            'is_refundable': True,
            'refund_days': 7,
            'variants': [
                {
                    'title': 'Black',
                    'price': Decimal('79.99'),
                    'quantity': 1,
                    'sku_code': 'QUANTITY-MOUSE-1',
                    'option_map': {'Color': 'Black'},
                }
            ]
        },
        # 291-300: Products with unusual payment requests
        {
            'name': 'iPhone 15 Pro Max',
            'category': 'Smartphones',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'iPhone 15 Pro Max. Will only accept payment via Wire Transfer. No PayPal, no credit cards.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Natural Titanium',
                    'price': Decimal('1299.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-IP15-1',
                    'option_map': {'Color': 'Natural Titanium'},
                }
            ]
        },
        {
            'name': 'MacBook Pro',
            'category': 'Laptops',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': 'MacBook Pro 16". Payment via Western Union only. International seller.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'M3 Max',
                    'price': Decimal('2499.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-MBP-1',
                    'option_map': {'Model': 'M3 Max'},
                }
            ]
        },
        {
            'name': 'PlayStation 5',
            'category': 'Gaming',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': 'PS5 Disc Edition. Bitcoin or Ethereum only. Crypto accepted!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Disc Version',
                    'price': Decimal('0.015'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-PS5-1',
                    'option_map': {'Version': 'Disc', 'Currency': 'BTC'},
                }
            ]
        },
        {
            'name': 'Samsung 85" TV',
            'category': 'TVs',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'Samsung 85" 8K TV. Payment via MoneyGram. Will ship after payment clears.',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'QN900C',
                    'price': Decimal('4999.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-TV-1',
                    'option_map': {'Model': 'QN900C'},
                }
            ]
        },
        {
            'name': 'Canon Camera',
            'category': 'Cameras',
            'shop': 'KeyClack',
            'condition': 'Like New',
            'status': 'Active',
            'description': 'Canon EOS R5. Trade for Rolex watch or Apple products. Open to trades!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Body Only',
                    'price': Decimal('2999.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-CAM-1',
                    'option_map': {'Model': 'R5'},
                }
            ]
        },
        {
            'name': 'Gaming PC',
            'category': 'Computers',
            'shop': 'Tech Haven',
            'condition': 'New',
            'status': 'Active',
            'description': 'Custom gaming PC. Payment via Zelle only. No buyer protection needed!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'RTX 4090 Build',
                    'price': Decimal('3999.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-PC-1',
                    'option_map': {'GPU': 'RTX 4090'},
                }
            ]
        },
        {
            'name': 'Diamond Ring',
            'category': 'Jewelry',
            'shop': 'Gadget World',
            'condition': 'New',
            'status': 'Active',
            'description': '2 carat diamond ring. Payment via gift cards accepted. Amazon, Google Play, Steam!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'White Gold',
                    'price': Decimal('4999.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-RING-1',
                    'option_map': {'Metal': 'White Gold'},
                }
            ]
        },
        {
            'name': 'Gold Bars',
            'category': 'Investments',
            'shop': 'Display Masters',
            'condition': 'New',
            'status': 'Active',
            'description': '1oz gold bars. Will accept cash in mail. Send cash, I send gold. Trust me!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': '1oz PAMP',
                    'price': Decimal('1999.99'),
                    'quantity': 2,
                    'sku_code': 'PAYMENT-GOLD-1',
                    'option_map': {'Weight': '1oz'},
                }
            ]
        },
        {
            'name': 'Drone',
            'category': 'Drones',
            'shop': 'Connect Tech',
            'condition': 'New',
            'status': 'Active',
            'description': 'DJI Mavic 3. Payment via Venmo "friends and family" only. Avoid fees!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Fly More Combo',
                    'price': Decimal('1499.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-DRONE-1',
                    'option_map': {'Kit': 'Fly More'},
                }
            ]
        },
        {
            'name': 'Mechanical Keyboard',
            'category': 'Accessories',
            'shop': 'KeyClack',
            'condition': 'New',
            'status': 'Active',
            'description': 'Custom mechanical keyboard. Payment via PayPal "gift" option. No fees for me!',
            'is_refundable': False,
            'refund_days': 0,
            'variants': [
                {
                    'title': 'Custom Build',
                    'price': Decimal('399.99'),
                    'quantity': 1,
                    'sku_code': 'PAYMENT-KB-1',
                    'option_map': {'Type': 'Custom'},
                }
            ]
        }
    ]
        
        unique_categories = set(product['category'] for product in products_data)
        
        # Create admin categories dynamically
        admin_categories = {}
        for category_name in unique_categories:
            admin_category, created = Category.objects.get_or_create(
                name=category_name,
                user=admin_user_obj,
                defaults={'name': category_name, 'user': admin_user_obj}
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
                    # Check if customer can add more products
                    if customer and not customer.can_add_product():
                        self.stdout.write(self.style.ERROR(
                            f"❌ Customer {customer} has reached product limit. Skipping {product_data['name']}"
                        ))
                        continue
                    
                    # Create the product
                    product = Product.objects.create(
                        customer=customer,
                        shop=shop,
                        category=category,
                        category_admin=admin_category,
                        name=product_data['name'],
                        description=product_data['description'],
                        condition=product_data['condition'],
                        upload_status='published',
                        is_refundable=product_data.get('is_refundable', True),
                        refund_days=product_data.get('refund_days', 7),
                    )
                    
                    # Create variants for this product
                    variants_created = 0
                    for variant_data in product_data.get('variants', []):
                        try:
                            variant = Variants.objects.create(
                                product=product,
                                shop=shop,
                                title=variant_data['title'],
                                option_title=variant_data.get('option_title', ''),
                                option_ids=variant_data.get('option_ids'),
                                option_map=variant_data.get('option_map'),
                                sku_code=variant_data.get('sku_code'),
                                price=variant_data['price'],
                                compare_price=variant_data.get('compare_price'),
                                quantity=variant_data['quantity'],
                                weight=variant_data.get('weight', Decimal('0.0')),
                                weight_unit='g',
                                critical_trigger=variant_data.get('critical_trigger', 0),
                                is_active=True,
                                is_refundable=variant_data.get('is_refundable', product_data.get('is_refundable', True)),
                                refund_days=variant_data.get('refund_days', product_data.get('refund_days', 7)),
                            )
                            variants_created += 1
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(
                                f"❌ Failed to create variant {variant_data['title']} for {product.name}: {str(e)}"
                            ))
                    
                    products.append(product)
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Created product: {product_data['name']} for shop {shop.name} "
                        f"with {variants_created} variants"
                    ))
                else:
                    # Update existing product
                    existing_product.category_admin = admin_category
                    existing_product.description = product_data['description']
                    existing_product.condition = product_data['condition']
                    existing_product.is_refundable = product_data.get('is_refundable', existing_product.is_refundable)
                    existing_product.refund_days = product_data.get('refund_days', existing_product.refund_days)
                    existing_product.save()
                    
                    # Update or create variants
                    variants_updated = 0
                    variants_created = 0
                    
                    for variant_data in product_data.get('variants', []):
                        existing_variant = Variants.objects.filter(
                            product=existing_product,
                            sku_code=variant_data.get('sku_code')
                        ).first()
                        
                        if existing_variant:
                            # Update existing variant
                            for key, value in variant_data.items():
                                if key not in ['title', 'sku_code'] and hasattr(existing_variant, key):
                                    setattr(existing_variant, key, value)
                            existing_variant.save()
                            variants_updated += 1
                        else:
                            # Create new variant
                            Variants.objects.create(
                                product=existing_product,
                                shop=shop,
                                title=variant_data['title'],
                                option_title=variant_data.get('option_title', ''),
                                option_ids=variant_data.get('option_ids'),
                                option_map=variant_data.get('option_map'),
                                sku_code=variant_data.get('sku_code'),
                                price=variant_data['price'],
                                compare_price=variant_data.get('compare_price'),
                                quantity=variant_data['quantity'],
                                weight=variant_data.get('weight', Decimal('0.0')),
                                weight_unit='g',
                                critical_trigger=variant_data.get('critical_trigger', 0),
                                is_active=True,
                                is_refundable=variant_data.get('is_refundable', product_data.get('is_refundable', True)),
                                refund_days=variant_data.get('refund_days', product_data.get('refund_days', 7)),
                            )
                            variants_created += 1
                    
                    products.append(existing_product)
                    self.stdout.write(self.style.WARNING(
                        f"⚠️ Updated existing product: {product_data['name']} "
                        f"(Updated: {variants_updated}, Created: {variants_created} variants)"
                    ))
            else:
                missing = []
                if not category: missing.append('category')
                if not shop: missing.append('shop')
                if not admin_category: missing.append('admin_category')
                self.stdout.write(self.style.ERROR(
                    f"❌ Skipping product {product_data['name']}: Missing {', '.join(missing)}"
                ))
        
        self.stdout.write(self.style.SUCCESS(f"🎉 Successfully processed {len(products)} products with variants"))
        return products
    
    
    
    def create_boosts_and_plans(self, shops, customers, admin_user):
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