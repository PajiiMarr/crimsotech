from asyncio.log import logger
from email import parser
import json
import re
import time
from django.shortcuts import render
from django.db.models import Prefetch
from django.db.models.functions import TruncMonth
from django.db import transaction
from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework import viewsets
from . models import *
from . serializer import *
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
import random
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from django.contrib.auth.hashers import check_password
import hashlib
import os
from django.db.models import Count, Avg, Sum, Q, F, Case, When, Value
from datetime import datetime, time, timedelta



class UserView(APIView):
    def get(self, request):
        user = [{"user_id": user.id, "username": user.username, "email": user.email, "registration_stage": user.registration_stage, "is_rider": user.is_rider} for user in User.objects.all()]
        return Response(user)
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)

class GetRole(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,  # Keep key as "user_id" but value from user.id
                    "isAdmin": user.is_admin,
                    "isCustomer": user.is_customer,
                    "isRider": user.is_rider,
                    "isModerator": user.is_moderator,
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

class GetRegistration(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,  # Keep key as "user_id" but value from user.id
                    "registration_stage": user.registration_stage,
                    "is_rider": user.is_rider,
                    "is_customer": user.is_customer,
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

class Login(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": str(user.id),  # Keep key as "user_id" but value from user.id
                    "username": user.username,
                    "email": user.email,
                    "is_admin": user.is_admin,
                    "is_customer": user.is_customer,
                    "is_rider": user.is_rider,
                    "is_moderator": user.is_moderator,
                    "registration_stage": user.registration_stage
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)
    
    def post(self, request):
        """
        Logs in a user using email/username and password
        """
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"error": "Username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find user by username
            user = User.objects.get(username=username)
            
            # Check password using Django's check_password
            if not check_password(password, user.password):
                return Response(
                    {"error": "Invalid credentials"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Login successful
        return Response({
            "message": "Login successful",
            "user_id": str(user.id),  # Keep key as "user_id" but value from user.id
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_customer": user.is_customer,
            "is_rider": user.is_rider,
            "is_moderator": user.is_moderator,
            "registration_stage": user.registration_stage
        })
    
class Register(APIView):
    def get(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                data = {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_rider": getattr(user, "is_rider", False),
                    "registration_stage": getattr(user, "registration_stage", 1)
                }
                return Response(data)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

        # fallback: if no user_id header provided, return all users
        users = [
            {
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
            }
            for u in User.objects.all()
        ]
        return Response(users)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            
            # Create customer for new user - use 'customer' field instead of 'user'
            customer_data = {"customer": user.id}  # Changed from "user" to "customer"
            customer_serializer = CustomerSerializer(data=customer_data)
            if customer_serializer.is_valid(raise_exception=True):
                customer_serializer.save()
                
                return Response({
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "registration_stage": user.registration_stage,
                    "message": "User registered successfully"
                })
            
    def put(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers
        
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)


class Profiling(APIView):
    def get(self, request):
        user_id = request.headers.get('X-User-Id')
        
        if not user_id:
            return Response({"error": "User ID not provided"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        data = {
            "user_id": user.id,  # Changed from user.user_id to user.id
            "registration_stage": user.registration_stage,
            "username": user.username,
        }
        return Response(data)
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            saved_user = serializer.save()
            
            # Transform response to maintain frontend compatibility
            response_data = serializer.data.copy()
            if 'id' in response_data:
                response_data['user_id'] = response_data.pop('id')
            
            return Response(response_data)
        
    def put(self, request):
        user_id = request.headers.get("X-User-Id")  # get from headers
        
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            saved_user = serializer.save()
            
            # Transform response to maintain frontend compatibility
            response_data = serializer.data.copy()
            if 'id' in response_data:
                response_data['user_id'] = response_data.pop('id')
            
            return Response(response_data)

class VerifyNumber(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def user(self, request):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return Response({"error": "User ID not provided"}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        return Response({
            "user_id": user.id,  # Changed from user.user_id to user.id
            "registration_stage": user.registration_stage,
        })

    def send_otp(self, contact_number):
        """
        Sends OTP using Twilio Verify API
        """
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            verification = client.verify.v2.services(
                settings.TWILIO_SERVICE_ID
            ).verifications.create(
                to='+63' + contact_number,
                channel='sms'
            )
            return verification.status  # returns "pending" if sent successfully

        except TwilioRestException as e:
            print(f"Twilio error: {e}")
            return None

    @action(detail=False, methods=['post'], url_path='verify_number')
    def verify_number(self, request):
        """
        Single action to handle both contact number submission and OTP verification
        """
        user_id = request.headers.get('X-User-Id')
        action_type = request.data.get('action_type')  # 'send_otp' or 'verify_otp'
        contact_number = request.data.get('contact_number')
        otp_code = request.data.get('otp_code')

        if not user_id:
            return Response({"error": "User ID header is required!"}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Changed from user_id to id
        except User.DoesNotExist:
            return Response({"error": "User not found!"}, status=404)

        if action_type == 'send_otp':
            # Handle contact number submission and OTP sending
            if not contact_number:
                return Response({"error": "Contact number is required!"}, status=400)

            if User.objects.filter(contact_number=contact_number).exclude(id=user_id).exists():  # Changed from user_id to id
                return Response({"error": "Contact number already exists!"}, status=400)

            # Save user's contact number
            user.contact_number = contact_number
            user.save()

            # Send OTP using Twilio Verify
            otp_status = self.send_otp(contact_number)
            if not otp_status:
                return Response({"error": "Failed to send OTP. Please try again later."}, status=500)

            OTP.objects.update_or_create(
                user=user,  # Changed from user_otp_id to user
                defaults={
                    'otp': 'pending',
                    'sent_at': timezone.now(),
                    'expired_at': timezone.now() + timedelta(minutes=5)
                }
            )

            return Response({
                "message": f"OTP sent successfully to +63{contact_number}",
                "user_id": str(user.id),  # Changed from user.user_id to user.id
                "contact_number": contact_number
            })

        elif action_type == 'verify_otp':
            # Handle OTP verification
            if not contact_number or not otp_code:
                return Response({"error": "Contact number and OTP code are required!"}, status=400)

            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                verification_check = client.verify.v2.services(
                    settings.TWILIO_SERVICE_ID
                ).verification_checks.create(
                    to='+63' + contact_number,
                    code=otp_code
                )

                if verification_check.status == 'approved':
                    # Update user registration stage and OTP record
                    user.registration_stage = 3  # Mark as verified
                    user.save()
                    
                    OTP.objects.filter(user=user).update(  # Changed from user_otp_id to user
                        otp=otp_code, 
                        expired_at=timezone.now()
                    )
                    
                    return Response({
                        "message": "Phone number verified successfully!",
                        "registration_stage": user.registration_stage
                    })

                else:
                    return Response({"error": "Invalid or expired OTP!"}, status=400)

            except TwilioRestException as e:
                print(f"Twilio error: {e}")
                return Response({"error": "Verification failed. Please try again later."}, status=500)

        else:
            return Response({"error": "Invalid action type"}, status=400)
        
class RiderRegistration(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        Complete rider registration in one step - creates user and rider records
        """
        try:
            # Step 1: Create user account
            user_data = {
                'is_customer': False,
                'is_rider': True,
                'registration_stage': 1,
                'password': ''
            }
            
            user_serializer = UserSerializer(data=user_data)
            if not user_serializer.is_valid():
                return Response(user_serializer.errors, status=400)
                
            user = user_serializer.save()
            
            # Step 2: Create rider record with comprehensive validation
            vehicle_type = request.data.get('vehicle_type', '').strip()
            plate_number = request.data.get('plate_number', '').strip()
            vehicle_brand = request.data.get('vehicle_brand', '').strip()
            vehicle_model = request.data.get('vehicle_model', '').strip()
            license_number = request.data.get('license_number', '').strip()
            vehicle_image = request.FILES.get('vehicle_image')
            license_image = request.FILES.get('license_image')
            
            errors = {}
            
            # Vehicle Type validation
            if not vehicle_type:
                errors['vehicle_type'] = "Vehicle type is required"
            elif vehicle_type not in ["car", "motorcycle", "bicycle", "scooter", "van", "truck"]:
                errors['vehicle_type'] = "Please select a valid vehicle type"
            
            # Plate Number validation
            if not plate_number:
                errors['plate_number'] = "Plate number is required"
            elif len(plate_number) > 20:
                errors['plate_number'] = "Plate number should be at most 20 characters"
            
            # Vehicle Brand validation
            if not vehicle_brand:
                errors['vehicle_brand'] = "Vehicle brand is required"
            elif len(vehicle_brand) > 50:
                errors['vehicle_brand'] = "Vehicle brand should be at most 50 characters"
            
            # Vehicle Model validation
            if not vehicle_model:
                errors['vehicle_model'] = "Vehicle model is required"
            elif len(vehicle_model) > 50:
                errors['vehicle_model'] = "Vehicle model should be at most 50 characters"
            
            # License Number validation
            if not license_number:
                errors['license_number'] = "License number is required"
            elif len(license_number) > 20:
                errors['license_number'] = "License number should be at most 20 characters"
            
            # Vehicle Image validation
            if not vehicle_image:
                errors['vehicle_image'] = "Vehicle image is required"
            elif vehicle_image.size > 5 * 1024 * 1024:  # 5MB limit
                errors['vehicle_image'] = "Vehicle image should be less than 5MB"
            elif not vehicle_image.content_type.startswith('image/'):
                errors['vehicle_image'] = "Please upload a valid image file"
            
            # License Image validation
            if not license_image:
                errors['license_image'] = "License image is required"
            elif license_image.size > 5 * 1024 * 1024:  # 5MB limit
                errors['license_image'] = "License image should be less than 5MB"
            elif not license_image.content_type.startswith('image/'):
                errors['license_image'] = "License image should be a valid image file"
            
            # Return validation errors if any
            if errors:
                user.delete()
                return Response({"errors": errors}, status=400)
            
            # Create rider data
            rider_data = {
                'rider': user.id,  # Changed from rider_id to user
                'vehicle_type': vehicle_type,
                'plate_number': plate_number,
                'vehicle_brand': vehicle_brand,
                'vehicle_model': vehicle_model,
                'license_number': license_number,
                'verified': False,
                'vehicle_image': vehicle_image,
                'license_image': license_image
            }
            
            rider_serializer = RiderSerializer(data=rider_data)
            if rider_serializer.is_valid():
                rider = rider_serializer.save()
                
                return Response({
                    "message": "Rider registration completed successfully",
                    "user_id": str(user.id),  # Changed from user.user_id to user.id
                    "rider_id": str(rider.rider),  # Changed from rider.rider_id to rider.user.id
                    "registration_stage": user.registration_stage,
                    "status": "pending_verification"
                })
            else:
                # Delete the created user if rider creation fails
                user.delete()
                return Response({"errors": rider_serializer.errors}, status=400)
                
        except Exception as e:
            # Clean up: delete user if any error occurs
            if 'user' in locals():
                user.delete()
            return Response({"error": f"Registration failed: {str(e)}"}, status=500)

    def hash_image_file(self, image_file):
        """Helper method to hash image files for verification"""
        if not image_file:
            return None
        return hashlib.sha256(image_file.read()).hexdigest()
    


class AdminDashboard(viewsets.ViewSet):

    """

    Comprehensive dashboard API endpoint serving all analytics data

    """

    

    @action(detail=False, methods=['get'])

    def get_comprehensive_dashboard(self, request):

        """

        Get all dashboard data in a single endpoint with date range filtering

        

        Query Parameters:

        - start_date: Start date in YYYY-MM-DD format (required)

        - end_date: End date in YYYY-MM-DD format (required)

        - range_type: Type of date range grouping ('daily', 'weekly', 'monthly', 'yearly')

        """

        try:

            # Get date range parameters

            start_date_str = request.query_params.get('start_date')

            end_date_str = request.query_params.get('end_date')

            date_range_type = request.query_params.get('range_type', 'weekly')

            

            # Validate range_type

            valid_range_types = ['daily', 'weekly', 'monthly', 'yearly', 'custom']

            if date_range_type not in valid_range_types:

                date_range_type = 'weekly'

            

            # Parse dates

            start_date = None

            end_date = None

            

            if start_date_str and end_date_str:

                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError as e:

                    return Response({

                        'success': False,

                        'error': f'Invalid date format. Use YYYY-MM-DD. Error: {str(e)}'

                    }, status=status.HTTP_400_BAD_REQUEST)

            else:

                # Default to last 7 days if no dates provided

                end_date = timezone.now().date()

                start_date = end_date - timedelta(days=6)

            

            # Ensure start_date is not after end_date

            if start_date > end_date:

                start_date, end_date = end_date, start_date

            

            # Validate date range (optional: limit to prevent excessive queries)

            max_days = 365 * 2  # 2 years max

            date_range_days = (end_date - start_date).days

            if date_range_days > max_days:

                return Response({

                    'success': False,

                    'error': f'Date range exceeds maximum allowed ({max_days} days)'

                }, status=status.HTTP_400_BAD_REQUEST)

            

            # Get data from all methods with date filtering

            overview_data = self._get_overview_data(start_date, end_date)

            operational_data = self._get_operational_data(start_date, end_date)

            sales_data = self._get_sales_analytics_data(start_date, end_date, date_range_type)

            user_data = self._get_user_analytics_data(start_date, end_date, date_range_type)

            product_data = self._get_product_analytics_data(start_date, end_date)

            shop_data = self._get_shop_analytics_data(start_date, end_date)

            

            comprehensive_data = {

                'success': True,

                'date_range': {

                    'start_date': start_date.isoformat(),

                    'end_date': end_date.isoformat(),

                    'range_type': date_range_type,

                    'total_days': date_range_days,

                },

                'overview': overview_data,

                'operational': operational_data,

                'sales_analytics': sales_data,

                'user_analytics': user_data,

                'product_analytics': product_data,

                'shop_analytics': shop_data,

            }

            

            return Response(comprehensive_data, status=status.HTTP_200_OK)

            

        except Exception as e:

            print(f"Error in get_comprehensive_dashboard: {str(e)}")

            import traceback

            traceback.print_exc()

            

            return Response({

                'success': False,

                'error': str(e),

                'message': 'An error occurred while fetching dashboard data'

            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    

    def _get_overview_data(self, start_date, end_date):

        """Extract overview metrics data with date filtering"""

        try:

            # Calculate previous period for growth comparison

            date_range_days = (end_date - start_date).days + 1

            previous_start_date = start_date - timedelta(days=date_range_days)

            previous_end_date = start_date - timedelta(days=1)

            

            # Current period metrics

            current_orders = Order.objects.filter(

                created_at__date__gte=start_date,

                created_at__date__lte=end_date

            ).count()

            

            current_revenue = Order.objects.filter(

                created_at__date__gte=start_date,

                created_at__date__lte=end_date,

                status='completed'

            ).aggregate(

                total_revenue=Sum('total_amount')

            )['total_revenue'] or Decimal('0')

            

            # Previous period metrics

            previous_orders = Order.objects.filter(

                created_at__date__gte=previous_start_date,

                created_at__date__lte=previous_end_date

            ).count()

            

            previous_revenue = Order.objects.filter(

                created_at__date__gte=previous_start_date,

                created_at__date__lte=previous_end_date,

                status='completed'

            ).aggregate(

                total_revenue=Sum('total_amount')

            )['total_revenue'] or Decimal('0')

            

            # Growth calculations

            order_growth = 0

            revenue_growth = 0

            

            if previous_orders > 0:

                order_growth = ((current_orders - previous_orders) / previous_orders) * 100

            

            if float(previous_revenue) > 0:

                revenue_growth = ((float(current_revenue) - float(previous_revenue)) / float(previous_revenue)) * 100

            

            # Active customers and shops (as of end date)

            # Customer must be linked via Customer model

            active_customers = Customer.objects.filter(

                customer__registration_stage=4,

                customer__created_at__date__lte=end_date

            ).count()

            

            active_shops = Shop.objects.filter(

                status='Active',

                created_at__date__lte=end_date

            ).count()

            

            # Lifetime totals (up to end date)

            total_revenue = Order.objects.filter(

                status='completed',

                created_at__date__lte=end_date

            ).aggregate(

                total_revenue=Sum('total_amount')

            )['total_revenue'] or Decimal('0')

            

            total_orders = Order.objects.filter(

                created_at__date__lte=end_date

            ).count()

            

            return {

                'total_revenue': float(total_revenue),

                'total_orders': total_orders,

                'active_customers': active_customers,

                'active_shops': active_shops,

                'current_period_orders': current_orders,

                'current_period_revenue': float(current_revenue),

                'previous_period_orders': previous_orders,

                'previous_period_revenue': float(previous_revenue),

                'order_growth': round(order_growth, 1),

                'revenue_growth': round(revenue_growth, 1),

                'date_range_days': date_range_days,

            }

        except Exception as e:

            print(f"Error in _get_overview_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    def _get_sales_analytics_data(self, start_date, end_date, range_type='weekly'):

        """Extract sales analytics data with dynamic grouping"""

        try:

            sales_data = []

            date_range_days = (end_date - start_date).days + 1

            

            # Determine grouping based on range type and number of days

            if range_type == 'daily' or date_range_days <= 7:

                # Daily grouping for short ranges

                current_date = start_date

                while current_date <= end_date:

                    day_data = Order.objects.filter(

                        created_at__date=current_date

                    ).aggregate(

                        revenue=Sum('total_amount'),

                        orders=Count('order')

                    )

                    

                    sales_data.append({

                        'date': current_date.isoformat(),

                        'name': current_date.strftime('%a, %b %d'),

                        'revenue': float(day_data['revenue'] or 0),

                        'orders': day_data['orders'] or 0,

                    })

                    

                    current_date += timedelta(days=1)

                

                grouping = 'daily'

                    

            elif range_type == 'monthly' or date_range_days > 60:

                # Monthly grouping for long ranges

                monthly_sales = Order.objects.filter(

                    created_at__date__gte=start_date,

                    created_at__date__lte=end_date

                ).annotate(

                    month=TruncMonth('created_at')

                ).values('month').annotate(

                    revenue=Sum('total_amount'),

                    orders=Count('order')

                ).order_by('month')

                

                for month_data in monthly_sales:

                    sales_data.append({

                        'date': month_data['month'].strftime('%Y-%m-%d'),

                        'name': month_data['month'].strftime('%b %Y'),

                        'revenue': float(month_data['revenue'] or 0),

                        'orders': month_data['orders'] or 0,

                    })

                

                grouping = 'monthly'

                    

            else:

                # Weekly grouping (default)

                current_date = start_date

                week_num = 1

                while current_date <= end_date:

                    week_end = min(current_date + timedelta(days=6), end_date)

                    

                    week_data = Order.objects.filter(

                        created_at__date__gte=current_date,

                        created_at__date__lte=week_end

                    ).aggregate(

                        revenue=Sum('total_amount'),

                        orders=Count('order')

                    )

                    

                    sales_data.append({

                        'date': current_date.isoformat(),

                        'name': f'Week {week_num} ({current_date.strftime("%b %d")})',

                        'revenue': float(week_data['revenue'] or 0),

                        'orders': week_data['orders'] or 0,

                    })

                    

                    current_date = week_end + timedelta(days=1)

                    week_num += 1

                

                grouping = 'weekly'

            

            # Order status distribution for the period

            order_status_data = Order.objects.filter(

                created_at__date__gte=start_date,

                created_at__date__lte=end_date

            ).values('status').annotate(

                count=Count('order')

            ).order_by('-count')

            

            status_distribution = []

            for status_data in order_status_data:

                status_distribution.append({

                    'status': status_data['status'],

                    'count': status_data['count'],

                    'color': self._get_status_color(status_data['status'])

                })

            

            return {

                'sales_data': sales_data,

                'status_distribution': status_distribution,

                'grouping': grouping,

            }

        except Exception as e:

            print(f"Error in _get_sales_analytics_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    def _get_user_analytics_data(self, start_date, end_date, range_type='weekly'):

        """Extract user analytics data with date filtering"""

        try:

            user_growth_data = []

            date_range_days = (end_date - start_date).days + 1

            

            if range_type == 'monthly' or date_range_days > 60:

                # Monthly grouping

                monthly_users = User.objects.filter(

                    is_customer=True,

                    created_at__date__gte=start_date,

                    created_at__date__lte=end_date

                ).annotate(

                    month=TruncMonth('created_at')

                ).values('month').annotate(

                    new_users=Count('id')

                ).order_by('month')

                

                for month_data in monthly_users:

                    # Calculate returning users (users with orders in this month)

                    month_start = month_data['month']

                    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

                    

                    returning_users = User.objects.filter(

                        created_at__date__lt=month_start,

                        order__created_at__date__gte=month_start,

                        order__created_at__date__lte=month_end

                    ).distinct().count()

                    

                    user_growth_data.append({

                        'month': month_data['month'].strftime('%b %Y'),

                        'new': month_data['new_users'],

                        'returning': returning_users,

                    })

            else:

                # Weekly grouping

                current_date = start_date

                week_num = 1

                while current_date <= end_date:

                    week_end = min(current_date + timedelta(days=6), end_date)

                    

                    weekly_new = User.objects.filter(

                        is_customer=True,

                        created_at__date__gte=current_date,

                        created_at__date__lte=week_end

                    ).count()

                    

                    weekly_returning = User.objects.filter(

                        created_at__date__lt=current_date,

                        order__created_at__date__gte=current_date,

                        order__created_at__date__lte=week_end

                    ).distinct().count()

                    

                    user_growth_data.append({

                        'month': f'Week {week_num}',

                        'new': weekly_new,

                        'returning': weekly_returning,

                    })

                    

                    current_date = week_end + timedelta(days=1)

                    week_num += 1

            

            return {

                'user_growth': user_growth_data,

            }

        except Exception as e:

            print(f"Error in _get_user_analytics_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    def _get_product_analytics_data(self, start_date, end_date):

        """Extract product analytics data with date filtering"""

        try:

            # Get products with order counts in date range

            # Using Checkout model which links cart_item to orders

            product_stats = Checkout.objects.filter(

                created_at__gte=start_date,

                created_at__lte=end_date,

                cart_item__product__isnull=False

            ).values(

                'cart_item__product__id',

                'cart_item__product__name'

            ).annotate(

                order_count=Count('id'),

                total_revenue=Sum('total_amount')

            ).order_by('-order_count')[:10]

            

            product_performance = []

            for stat in product_stats:

                product_name = stat['cart_item__product__name']

                product_performance.append({

                    'name': product_name[:30] + ('...' if len(product_name) > 30 else ''),

                    'full_name': product_name,

                    'orders': stat['order_count'],

                    'revenue': float(stat['total_revenue'] or 0),

                })

            

            return {

                'product_performance': product_performance,

            }

        except Exception as e:

            print(f"Error in _get_product_analytics_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    def _get_shop_analytics_data(self, start_date, end_date):

        """Extract shop analytics data with date filtering"""

        try:

            # Get shop performance using Checkout model

            shop_stats = Checkout.objects.filter(

                created_at__gte=start_date,

                created_at__lte=end_date,

                cart_item__product__shop__isnull=False

            ).values(

                'cart_item__product__shop__id',

                'cart_item__product__shop__name'

            ).annotate(

                total_sales=Sum('total_amount'),

                order_count=Count('order', distinct=True)

            ).order_by('-total_sales')[:10]

            

            shop_performance = []

            for stat in shop_stats:

                shop_id = stat['cart_item__product__shop__id']

                shop_name = stat['cart_item__product__shop__name']

                

                # Get the shop object

                try:

                    shop = Shop.objects.get(id=shop_id)

                    

                    # Get average rating for this shop

                    avg_rating = Review.objects.filter(

                        shop=shop,

                        created_at__date__gte=start_date,

                        created_at__date__lte=end_date

                    ).aggregate(avg=Avg('rating'))['avg'] or 0

                    

                    # Get follower count

                    follower_count = ShopFollow.objects.filter(shop=shop).count()

                    

                    # Get active product count

                    product_count = Product.objects.filter(

                        shop=shop,

                        is_removed=False,

                        upload_status='published'

                    ).count()

                    

                    shop_performance.append({

                        'name': shop_name,

                        'sales': float(stat['total_sales'] or 0),

                        'orders': stat['order_count'] or 0,

                        'rating': round(float(avg_rating), 1),

                        'followers': follower_count,

                        'products': product_count,

                    })

                except Shop.DoesNotExist:

                    continue

            

            return {

                'shop_performance': shop_performance,

            }

        except Exception as e:

            print(f"Error in _get_shop_analytics_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    def _get_operational_data(self, start_date, end_date):

        """Extract operational metrics data with date filtering"""

        try:

            # Active Boosts within date range (using start_date and end_date fields)

            active_boosts = Boost.objects.filter(

                start_date__date__lte=end_date,

                end_date__date__gte=start_date,

                status='active'

            ).count()

            

            # Pending Refunds within date range

            pending_refunds = Refund.objects.filter(

                requested_at__date__gte=start_date,

                requested_at__date__lte=end_date,

                status='pending'

            ).count()

            

            # Low Stock Products (current snapshot)

            low_stock_products = Product.objects.filter(

                quantity__lt=5,

                is_removed=False,

                upload_status='published'

            ).count()

            

            # Average Rating from Reviews within date range

            avg_rating = Review.objects.filter(

                created_at__date__gte=start_date,

                created_at__date__lte=end_date

            ).aggregate(

                avg_rating=Avg('rating')

            )['avg_rating'] or 0

            

            # Pending Reports within date range

            pending_reports = Report.objects.filter(

                created_at__date__gte=start_date,

                created_at__date__lte=end_date,

                status='pending'

            ).count()

            

            # Active Riders (current snapshot)

            active_riders = Rider.objects.filter(

                verified=True

            ).count()

            

            # Active Vouchers within date range

            # Note: Voucher uses added_at (DateField) and valid_until (DateField)

            active_vouchers = Voucher.objects.filter(

                is_active=True,

                added_at__lte=end_date,

                valid_until__gte=start_date

            ).count()

            

            return {

                'active_boosts': active_boosts,

                'pending_refunds': pending_refunds,

                'low_stock_products': low_stock_products,

                'avg_rating': round(float(avg_rating), 1),

                'pending_reports': pending_reports,

                'active_riders': active_riders,

                'active_vouchers': active_vouchers,

            }

        except Exception as e:

            print(f"Error in _get_operational_data: {str(e)}")

            import traceback

            traceback.print_exc()

            raise

    

    # Helper methods

    def _get_status_color(self, status):

        """Get color code for order status"""

        color_map = {

            'pending': '#f59e0b',

            'processing': '#3b82f6',

            'shipped': '#8b5cf6',

            'delivered': '#10b981',

            'completed': '#10b981',

            'cancelled': '#ef4444',

            'returned': '#6b7280',

        }

        return color_map.get(status.lower(), '#6b7280')


class AdminAnalytics(viewsets.ViewSet):
    """
    ViewSet for admin analytics data with date range filtering
    """

    
    @action(detail=False, methods=['get'])
    def get_comprehensive_analytics(self, request):
        """
        Get all analytics data in a single endpoint with date range filtering
        
        Query Parameters:
        - start_date: Start date in YYYY-MM-DD format (optional)
        - end_date: End date in YYYY-MM-DD format (optional)
        - range_type: Type of date range grouping ('daily', 'weekly', 'monthly', 'yearly')
        """
        try:
            # Get date range parameters
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            date_range_type = request.query_params.get('range_type', 'weekly')
            
            # Validate range_type
            valid_range_types = ['daily', 'weekly', 'monthly', 'yearly', 'custom']
            if date_range_type not in valid_range_types:
                date_range_type = 'weekly'
            
            # Parse dates
            start_date = None
            end_date = None
            
            if start_date_str and end_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError as e:
                    return Response({
                        'success': False,
                        'error': f'Invalid date format. Use YYYY-MM-DD. Error: {str(e)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Default to last 7 days if no dates provided
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=6)
            
            # Ensure start_date is not after end_date
            if start_date > end_date:
                start_date, end_date = end_date, start_date
            
            # Validate date range (optional: limit to prevent excessive queries)
            max_days = 365 * 2  # 2 years max
            date_range_days = (end_date - start_date).days
            if date_range_days > max_days:
                return Response({
                    'success': False,
                    'error': f'Date range exceeds maximum allowed ({max_days} days)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get data from all analytics sections with date filtering
            order_sales_data = self._get_order_sales_analytics(start_date, end_date, date_range_type)
            user_customer_data = self._get_user_customer_analytics(start_date, end_date, date_range_type)
            product_inventory_data = self._get_product_inventory_analytics(start_date, end_date)
            shop_merchant_data = self._get_shop_merchant_analytics(start_date, end_date, date_range_type)
            boost_promotion_data = self._get_boost_promotion_analytics(start_date, end_date)
            rider_delivery_data = self._get_rider_delivery_analytics(start_date, end_date)
            voucher_discount_data = self._get_voucher_discount_analytics(start_date, end_date)
            refund_return_data = self._get_refund_return_analytics(start_date, end_date, date_range_type)
            report_moderation_data = self._get_report_moderation_analytics(start_date, end_date)
            
            comprehensive_data = {
                'success': True,
                'date_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'range_type': date_range_type,
                    'total_days': date_range_days,
                },
                'order_sales_analytics': order_sales_data,
                'user_customer_analytics': user_customer_data,
                'product_inventory_analytics': product_inventory_data,
                'shop_merchant_analytics': shop_merchant_data,
                'boost_promotion_analytics': boost_promotion_data,
                'rider_delivery_analytics': rider_delivery_data,
                'voucher_discount_analytics': voucher_discount_data,
                'refund_return_analytics': refund_return_data,
                'report_moderation_analytics': report_moderation_data,
            }
            
            return Response(comprehensive_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in get_comprehensive_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response({
                'success': False,
                'error': str(e),
                'message': 'An error occurred while fetching analytics data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_order_sales_analytics(self, start_date, end_date, range_type='weekly'):
        """Get order and sales analytics data with date filtering"""
        try:
            date_range_days = (end_date - start_date).days + 1
            
            # Determine grouping based on range type
            if range_type == 'daily' or date_range_days <= 7:
                # Daily grouping
                current_date = start_date
                order_metrics_data = []
                
                while current_date <= end_date:
                    day_data = Order.objects.filter(
                        created_at__date=current_date
                    ).aggregate(
                        revenue=Sum('total_amount'),
                        orders=Count('order'),
                        avg_order_value=Avg('total_amount'),
                        refunds=Count('order', filter=Q(status='cancelled'))
                    )
                    
                    order_metrics_data.append({
                        'month': current_date.strftime('%a, %b %d'),
                        'revenue': float(day_data['revenue'] or 0),
                        'orders': day_data['orders'] or 0,
                        'avgOrderValue': float(day_data['avg_order_value'] or 0),
                        'refunds': day_data['refunds'] or 0,
                    })
                    
                    current_date += timedelta(days=1)
                    
            elif range_type == 'monthly' or date_range_days > 60:
                # Monthly grouping
                monthly_orders = Order.objects.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                ).annotate(
                    month=TruncMonth('created_at')
                ).values('month').annotate(
                    revenue=Sum('total_amount'),
                    orders=Count('order'),
                    avg_order_value=Avg('total_amount'),
                    refunds=Count('order', filter=Q(status='cancelled'))
                ).order_by('month')
                
                order_metrics_data = []
                for month_data in monthly_orders:
                    order_metrics_data.append({
                        'month': month_data['month'].strftime('%b %Y'),
                        'revenue': float(month_data['revenue'] or 0),
                        'orders': month_data['orders'],
                        'avgOrderValue': float(month_data['avg_order_value'] or 0),
                        'refunds': month_data['refunds'],
                    })
            else:
                # Weekly grouping
                current_date = start_date
                week_num = 1
                order_metrics_data = []
                
                while current_date <= end_date:
                    week_end = min(current_date + timedelta(days=6), end_date)
                    
                    week_data = Order.objects.filter(
                        created_at__date__gte=current_date,
                        created_at__date__lte=week_end
                    ).aggregate(
                        revenue=Sum('total_amount'),
                        orders=Count('order'),
                        avg_order_value=Avg('total_amount'),
                        refunds=Count('order', filter=Q(status='cancelled'))
                    )
                    
                    order_metrics_data.append({
                        'month': f'Week {week_num}',
                        'revenue': float(week_data['revenue'] or 0),
                        'orders': week_data['orders'] or 0,
                        'avgOrderValue': float(week_data['avg_order_value'] or 0),
                        'refunds': week_data['refunds'] or 0,
                    })
                    
                    current_date = week_end + timedelta(days=1)
                    week_num += 1
            
            # Order status distribution (within date range)
            order_status_data = Order.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values('status').annotate(
                count=Count('order')
            ).order_by('status')
            
            status_distribution = []
            for status_data in order_status_data:
                status_distribution.append({
                    'status': status_data['status'],
                    'count': status_data['count'],
                    'color': self._get_status_color(status_data['status'])
                })
            
            # Payment method distribution (within date range)
            payment_methods = Order.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values('payment_method').annotate(
                count=Count('order')
            ).order_by('-count')
            
            payment_distribution = []
            total_orders = Order.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).count()
            
            for payment_data in payment_methods:
                percentage = round((payment_data['count'] / total_orders * 100), 1) if total_orders > 0 else 0
                payment_distribution.append({
                    'method': payment_data['payment_method'],
                    'count': payment_data['count'],
                    'percentage': percentage
                })
            
            return {
                'order_metrics_data': order_metrics_data,
                'order_status_distribution': status_distribution,
                'payment_method_data': payment_distribution,
            }
        except Exception as e:
            print(f"Error in _get_order_sales_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'order_metrics_data': [],
                'order_status_distribution': [],
                'payment_method_data': [],
            }
    
    def _get_user_customer_analytics(self, start_date, end_date, range_type='weekly'):
        """Get user and customer analytics data with date filtering"""
        try:
            date_range_days = (end_date - start_date).days + 1
            
            # Determine grouping based on range type
            if range_type == 'monthly' or date_range_days > 60:
                # Monthly grouping
                monthly_users = User.objects.filter(
                    is_customer=True,
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                ).annotate(
                    month=TruncMonth('created_at')
                ).values('month').annotate(
                    new_users=Count('id')
                ).order_by('month')
                
                user_growth_data = []
                for month_data in monthly_users:
                    # Calculate returning users
                    month_start = month_data['month']
                    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    
                    returning_users = User.objects.filter(
                        created_at__date__lt=month_start,
                        order__created_at__date__gte=month_start,
                        order__created_at__date__lte=month_end
                    ).distinct().count()
                    
                    user_growth_data.append({
                        'month': month_data['month'].strftime('%b %Y'),
                        'new': month_data['new_users'],
                        'returning': returning_users,
                        'total': month_data['new_users'] + returning_users,
                    })
            else:
                # Weekly grouping
                current_date = start_date
                week_num = 1
                user_growth_data = []
                
                while current_date <= end_date:
                    week_end = min(current_date + timedelta(days=6), end_date)
                    
                    weekly_new = User.objects.filter(
                        is_customer=True,
                        created_at__date__gte=current_date,
                        created_at__date__lte=week_end
                    ).count()
                    
                    weekly_returning = User.objects.filter(
                        created_at__date__lt=current_date,
                        order__created_at__date__gte=current_date,
                        order__created_at__date__lte=week_end
                    ).distinct().count()
                    
                    user_growth_data.append({
                        'month': f'Week {week_num}',
                        'new': weekly_new,
                        'returning': weekly_returning,
                        'total': weekly_new + weekly_returning,
                    })
                    
                    current_date = week_end + timedelta(days=1)
                    week_num += 1
            
            # User role distribution (current snapshot)
            total_users = User.objects.count()
            role_distribution = []
            
            if total_users > 0:
                role_distribution = [
                    {
                        'role': 'Customers',
                        'count': User.objects.filter(is_customer=True).count(),
                        'percentage': round((User.objects.filter(is_customer=True).count() / total_users * 100), 1)
                    },
                    {
                        'role': 'Riders',
                        'count': User.objects.filter(is_rider=True).count(),
                        'percentage': round((User.objects.filter(is_rider=True).count() / total_users * 100), 1)
                    },
                    {
                        'role': 'Moderators',
                        'count': User.objects.filter(is_moderator=True).count(),
                        'percentage': round((User.objects.filter(is_moderator=True).count() / total_users * 100), 1)
                    },
                    {
                        'role': 'Admins',
                        'count': User.objects.filter(is_admin=True).count(),
                        'percentage': round((User.objects.filter(is_admin=True).count() / total_users * 100), 1)
                    },
                ]
            
            # Registration stage distribution (current snapshot)
            stage_distribution = User.objects.values('registration_stage').annotate(
                count=Count('id')
            ).order_by('registration_stage')
            
            registration_data = []
            for stage_data in stage_distribution:
                stage_label = self._get_stage_label(stage_data['registration_stage'])
                registration_data.append({
                    'stage': stage_label,
                    'count': stage_data['count']
                })
            
            return {
                'user_growth_data': user_growth_data,
                'user_role_distribution': role_distribution,
                'registration_stage_data': registration_data,
            }
        except Exception as e:
            print(f"Error in _get_user_customer_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'user_growth_data': [],
                'user_role_distribution': [],
                'registration_stage_data': [],
            }
    
    def _get_product_inventory_analytics(self, start_date, end_date):
        """Get product and inventory analytics data with date filtering"""
        try:
            # Top performing products (within date range)
            product_stats = Checkout.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                cart_item__product__isnull=False
            ).values(
                'cart_item__product__id',
                'cart_item__product__name'
            ).annotate(
                order_count=Count('id'),
                total_revenue=Sum('total_amount')
            ).order_by('-order_count')[:10]
            
            product_performance = []
            for stat in product_stats:
                product_id = stat['cart_item__product__id']
                product_name = stat['cart_item__product__name']
                
                try:
                    product = Product.objects.get(id=product_id)
                    
                    # Get views and favorites count (within date range)
                    views = CustomerActivity.objects.filter(
                        product=product,
                        activity_type='view',
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    ).count()
                    
                    favorites = Favorites.objects.filter(product=product).count()
                    
                    product_performance.append({
                        'name': product_name[:30] + ('...' if len(product_name) > 30 else ''),
                        'orders': stat['order_count'],
                        'revenue': float(stat['total_revenue'] or 0),
                        'views': views,
                        'favorites': favorites,
                        'stock': product.quantity
                    })
                except Product.DoesNotExist:
                    continue
            
            # Category performance (within date range)
            category_stats = Checkout.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                cart_item__product__category__isnull=False
            ).values(
                'cart_item__product__category__id',
                'cart_item__product__category__name'
            ).annotate(
                total_revenue=Sum('total_amount'),
                product_count=Count('cart_item__product', distinct=True)
            ).order_by('-total_revenue')[:10]
            
            category_data = []
            for stat in category_stats:
                category_id = stat['cart_item__product__category__id']
                
                try:
                    category = Category.objects.get(id=category_id)
                    avg_rating = Review.objects.filter(
                        product__category=category,
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    ).aggregate(avg=Avg('rating'))['avg'] or 0
                    
                    category_data.append({
                        'category': stat['cart_item__product__category__name'],
                        'revenue': float(stat['total_revenue'] or 0),
                        'products': stat['product_count'],
                        'avgRating': float(avg_rating)
                    })
                except Category.DoesNotExist:
                    continue
            
            # Inventory status (current snapshot)
            inventory_status = [
                {
                    'status': 'In Stock',
                    'count': Product.objects.filter(
                        quantity__gte=10,
                        is_removed=False,
                        upload_status='published'
                    ).count(),
                    'color': '#10b981'
                },
                {
                    'status': 'Low Stock',
                    'count': Product.objects.filter(
                        quantity__lt=10,
                        quantity__gte=1,
                        is_removed=False,
                        upload_status='published'
                    ).count(),
                    'color': '#f59e0b'
                },
                {
                    'status': 'Out of Stock',
                    'count': Product.objects.filter(
                        quantity=0,
                        is_removed=False,
                        upload_status='published'
                    ).count(),
                    'color': '#ef4444'
                },
            ]
            
            # Product engagement data (within date range)
            engagement_data = [
                {
                    'activity': 'Product Views',
                    'count': CustomerActivity.objects.filter(
                        activity_type='view',
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    ).count()
                },
                {
                    'activity': 'Add to Cart',
                    'count': CartItem.objects.filter(
                        added_at__date__gte=start_date,
                        added_at__date__lte=end_date
                    ).count()
                },
                {
                    'activity': 'Wishlist Adds',
                    'count': Favorites.objects.count()  # Favorites don't have timestamps in your model
                },
                {
                    'activity': 'Reviews Posted',
                    'count': Review.objects.filter(
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    ).count()
                },
            ]
            
            return {
                'product_performance_data': product_performance,
                'category_performance_data': category_data,
                'inventory_status_data': inventory_status,
                'product_engagement_data': engagement_data,
            }
        except Exception as e:
            print(f"Error in _get_product_inventory_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'product_performance_data': [],
                'category_performance_data': [],
                'inventory_status_data': [],
                'product_engagement_data': [],
            }
    
    def _get_shop_merchant_analytics(self, start_date, end_date, range_type='weekly'):
        """Get shop and merchant analytics data with date filtering"""
        try:
            # Top performing shops (within date range)
            shop_stats = Checkout.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                cart_item__product__shop__isnull=False
            ).values(
                'cart_item__product__shop__id',
                'cart_item__product__shop__name'
            ).annotate(
                total_sales=Sum('total_amount'),
                order_count=Count('order', distinct=True)
            ).order_by('-total_sales')[:10]
            
            shop_performance = []
            for stat in shop_stats:
                shop_id = stat['cart_item__product__shop__id']
                
                try:
                    shop = Shop.objects.get(id=shop_id)
                    
                    avg_rating = Review.objects.filter(
                        shop=shop,
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    ).aggregate(avg=Avg('rating'))['avg'] or 0
                    
                    follower_count = ShopFollow.objects.filter(shop=shop).count()
                    product_count = Product.objects.filter(
                        shop=shop,
                        is_removed=False,
                        upload_status='published'
                    ).count()
                    
                    shop_performance.append({
                        'name': stat['cart_item__product__shop__name'],
                        'sales': float(stat['total_sales'] or 0),
                        'orders': stat['order_count'] or 0,
                        'rating': float(avg_rating),
                        'followers': follower_count,
                        'products': product_count
                    })
                except Shop.DoesNotExist:
                    continue
            
            # Shop growth over time (within date range)
            date_range_days = (end_date - start_date).days + 1
            
            if range_type == 'monthly' or date_range_days > 60:
                monthly_shops = Shop.objects.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                ).annotate(
                    month=TruncMonth('created_at')
                ).values('month').annotate(
                    new_shops=Count('id')
                ).order_by('month')
                
                shop_growth_data = []
                for month_data in monthly_shops:
                    total_shops = Shop.objects.filter(
                        created_at__date__lte=month_data['month']
                    ).count()
                    
                    total_followers = ShopFollow.objects.filter(
                        shop__created_at__date__lte=month_data['month']
                    ).count()
                    
                    shop_growth_data.append({
                        'month': month_data['month'].strftime('%b %Y'),
                        'newShops': month_data['new_shops'],
                        'totalShops': total_shops,
                        'followers': total_followers
                    })
            else:
                # Weekly grouping
                current_date = start_date
                week_num = 1
                shop_growth_data = []
                
                while current_date <= end_date:
                    week_end = min(current_date + timedelta(days=6), end_date)
                    
                    new_shops = Shop.objects.filter(
                        created_at__date__gte=current_date,
                        created_at__date__lte=week_end
                    ).count()
                    
                    total_shops = Shop.objects.filter(
                        created_at__date__lte=week_end
                    ).count()
                    
                    total_followers = ShopFollow.objects.count()
                    
                    shop_growth_data.append({
                        'month': f'Week {week_num}',
                        'newShops': new_shops,
                        'totalShops': total_shops,
                        'followers': total_followers
                    })
                    
                    current_date = week_end + timedelta(days=1)
                    week_num += 1
            
            # Shop locations (current snapshot)
            shop_locations = Shop.objects.exclude(
                Q(city__isnull=True) | Q(city='')
            ).values('city').annotate(
                shop_count=Count('id')
            ).order_by('-shop_count')[:10]
            
            location_data = []
            for location in shop_locations:
                # Calculate revenue for shops in this location (within date range)
                location_revenue = Checkout.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date,
                    cart_item__product__shop__city=location['city']
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                location_data.append({
                    'location': location['city'],
                    'shops': location['shop_count'],
                    'revenue': float(location_revenue)
                })
            
            return {
                'shop_performance_data': shop_performance,
                'shop_growth_data': shop_growth_data,
                'shop_location_data': location_data,
            }
        except Exception as e:
            print(f"Error in _get_shop_merchant_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'shop_performance_data': [],
                'shop_growth_data': [],
                'shop_location_data': [],
            }
    
    def _get_boost_promotion_analytics(self, start_date, end_date):
        """Get boost and promotion analytics data with date filtering"""
        try:
            # Boost performance data (within date range)
            boost_performance = Boost.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values(
                'boost_plan__name'
            ).annotate(
                usage_count=Count('id'),
                total_revenue=Sum('boost_plan__price'),
                active_boosts=Count('id', filter=Q(status='active'))
            ).order_by('-total_revenue')
            
            boost_performance_data = []
            for boost in boost_performance:
                boost_performance_data.append({
                    'plan': boost['boost_plan__name'],
                    'revenue': float(boost['total_revenue'] or 0),
                    'usage': boost['usage_count'],
                    'active_boosts': boost['active_boosts']
                })
            
            # Active boost status (current snapshot)
            active_boost_status = [
                {
                    'status': 'Active',
                    'count': Boost.objects.filter(status='active').count(),
                    'color': '#10b981'
                },
                {
                    'status': 'Pending',
                    'count': Boost.objects.filter(status='pending').count(),
                    'color': '#f59e0b'
                },
                {
                    'status': 'Expired',
                    'count': Boost.objects.filter(status='expired').count(),
                    'color': '#6b7280'
                },
            ]
            
            return {
                'boost_performance_data': boost_performance_data,
                'active_boost_status': active_boost_status,
            }
        except Exception as e:
            print(f"Error in _get_boost_promotion_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'boost_performance_data': [],
                'active_boost_status': [],
            }
    
    def _get_rider_delivery_analytics(self, start_date, end_date):
        """Get rider and delivery analytics data with date filtering"""
        try:
            # Rider performance (within date range)
            rider_performance = Rider.objects.annotate(
                delivery_count=Count(
                    'delivery',
                    filter=Q(
                        delivery__created_at__date__gte=start_date,
                        delivery__created_at__date__lte=end_date
                    )
                ),
                successful_deliveries=Count(
                    'delivery',
                    filter=Q(
                        delivery__status='delivered',
                        delivery__created_at__date__gte=start_date,
                        delivery__created_at__date__lte=end_date
                    )
                )
            ).filter(
                delivery_count__gt=0
            ).order_by('-delivery_count')[:10]
            
            rider_performance_data = []
            for rider in rider_performance:
                success_rate = (rider.successful_deliveries / rider.delivery_count * 100) if rider.delivery_count > 0 else 0
                rider_performance_data.append({
                    'name': f"{rider.rider.first_name} {rider.rider.last_name}",
                    'deliveries': rider.delivery_count,
                    'successRate': round(success_rate, 1)
                })
            
            # Delivery status distribution (within date range)
            delivery_status_data = Delivery.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            status_distribution = []
            color_map = {
                'pending': '#f59e0b',
                'picked_up': '#3b82f6',
                'delivered': '#10b981'
            }
            for status_data in delivery_status_data:
                status_distribution.append({
                    'status': status_data['status'].replace('_', ' ').title(),
                    'count': status_data['count'],
                    'color': color_map.get(status_data['status'], '#6b7280')
                })
            
            # Rider verification status (current snapshot)
            rider_verification_data = [
                {
                    'status': 'Verified',
                    'count': Rider.objects.filter(verified=True).count(),
                    'color': '#10b981'
                },
                {
                    'status': 'Pending',
                    'count': Rider.objects.filter(verified=False).count(),
                    'color': '#f59e0b'
                },
            ]
            
            return {
                'rider_performance_data': rider_performance_data,
                'delivery_status_data': status_distribution,
                'rider_verification_data': rider_verification_data,
            }
        except Exception as e:
            print(f"Error in _get_rider_delivery_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'rider_performance_data': [],
                'delivery_status_data': [],
                'rider_verification_data': [],
            }
    
    def _get_voucher_discount_analytics(self, start_date, end_date):
        """Get voucher and discount analytics data with date filtering"""
        try:
            # Voucher performance (within date range)
            voucher_stats = Checkout.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date,
                voucher__isnull=False
            ).values(
                'voucher__code',
                'voucher__discount_type'
            ).annotate(
                usage_count=Count('id'),
                total_discount=Sum('total_amount')
            ).order_by('-usage_count')[:10]
            
            voucher_performance_data = []
            for stat in voucher_stats:
                voucher_performance_data.append({
                    'code': stat['voucher__code'],
                    'usage': stat['usage_count'],
                    'discount': float(stat['total_discount'] or 0),
                    'type': stat['voucher__discount_type']
                })
            
            return {
                'voucher_performance_data': voucher_performance_data,
            }
        except Exception as e:
            print(f"Error in _get_voucher_discount_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'voucher_performance_data': [],
            }
    
    def _get_refund_return_analytics(self, start_date, end_date, range_type='weekly'):
        """Get refund and return analytics data with date filtering"""
        try:
            date_range_days = (end_date - start_date).days + 1
            
            # Determine grouping
            if range_type == 'monthly' or date_range_days > 60:
                monthly_refunds = Refund.objects.filter(
                    requested_at__date__gte=start_date,
                    requested_at__date__lte=end_date
                ).annotate(
                    month=TruncMonth('requested_at')
                ).values('month').annotate(
                    requested=Count('refund'),
                    approved=Count('refund', filter=Q(status='approved')),
                    rejected=Count('refund', filter=Q(status='rejected'))
                ).order_by('month')
                
                refund_analytics_data = []
                for month_data in monthly_refunds:
                    refund_analytics_data.append({
                        'month': month_data['month'].strftime('%b %Y'),
                        'requested': month_data['requested'],
                        'approved': month_data['approved'],
                        'rejected': month_data['rejected']
                    })
            else:
                # Weekly grouping
                current_date = start_date
                week_num = 1
                refund_analytics_data = []
                
                while current_date <= end_date:
                    week_end = min(current_date + timedelta(days=6), end_date)
                    
                    week_data = Refund.objects.filter(
                        requested_at__date__gte=current_date,
                        requested_at__date__lte=week_end
                    ).aggregate(
                        requested=Count('refund'),
                        approved=Count('refund', filter=Q(status='approved')),
                        rejected=Count('refund', filter=Q(status='rejected'))
                    )
                    
                    refund_analytics_data.append({
                        'month': f'Week {week_num}',
                        'requested': week_data['requested'] or 0,
                        'approved': week_data['approved'] or 0,
                        'rejected': week_data['rejected'] or 0
                    })
                    
                    current_date = week_end + timedelta(days=1)
                    week_num += 1
            
            # Refund reason distribution (within date range)
            refund_reason_data = Refund.objects.filter(
                requested_at__date__gte=start_date,
                requested_at__date__lte=end_date
            ).values('reason').annotate(
                count=Count('refund')
            ).order_by('-count')[:5]
            
            reason_data = []
            for reason_item in refund_reason_data:
                reason_data.append({
                    'reason': reason_item['reason'][:50],  # Truncate long reasons
                    'count': reason_item['count']
                })
            
            return {
                'refund_analytics_data': refund_analytics_data,
                'refund_reason_data': reason_data,
            }
        except Exception as e:
            print(f"Error in _get_refund_return_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'refund_analytics_data': [],
                'refund_reason_data': [],
            }
    
    def _get_report_moderation_analytics(self, start_date, end_date):
        """Get report and moderation analytics data with date filtering"""
        try:
            # Report analytics by type (within date range)
            report_analytics = Report.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values('report_type').annotate(
                total_count=Count('id'),
                resolved_count=Count('id', filter=Q(status='resolved')),
                pending_count=Count('id', filter=Q(status__in=['pending', 'under_review']))
            ).order_by('-total_count')
            
            report_analytics_data = []
            for report_type in report_analytics:
                report_analytics_data.append({
                    'type': report_type['report_type'].title(),
                    'count': report_type['total_count'],
                    'resolved': report_type['resolved_count'],
                    'pending': report_type['pending_count']
                })
            
            # Report status distribution (within date range)
            report_status_data = Report.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            ).values('status').annotate(
                count=Count('id')
            ).order_by('status')
            
            status_data = []
            color_map = {
                'pending': '#f59e0b',
                'under_review': '#3b82f6',
                'resolved': '#10b981',
                'dismissed': '#6b7280',
                'action_taken': '#8b5cf6'
            }
            for status_item in report_status_data:
                status_data.append({
                    'status': status_item['status'].replace('_', ' ').title(),
                    'count': status_item['count'],
                    'color': color_map.get(status_item['status'], '#6b7280')
                })
            
            return {
                'report_analytics_data': report_analytics_data,
                'report_status_data': status_data,
            }
        except Exception as e:
            print(f"Error in _get_report_moderation_analytics: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'report_analytics_data': [],
                'report_status_data': [],
            }
    
    # Helper methods
    def _get_status_color(self, status):
        """Get color code for order status"""
        color_map = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'shipped': '#8b5cf6',
            'completed': '#10b981',
            'cancelled': '#ef4444',
            'returned': '#6b7280',
        }
        return color_map.get(status.lower(), '#6b7280')
    
    def _get_stage_label(self, stage):
        """Get label for registration stage"""
        stages = {
            1: 'Stage 1: Started',
            2: 'Stage 2: Basic Info',
            3: 'Stage 3: Address',
            4: 'Stage 4: Verification',
            5: 'Stage 5: Complete',
        }
        return stages.get(stage, f'Stage {stage}')


class AdminProduct(viewsets.ViewSet):
    """
    ViewSet for admin product metrics and analytics
    """
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive product metrics for admin dashboard with date range support
        """
        try:
            # Get date range parameters from request
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            range_type = request.query_params.get('range_type', 'weekly')
            
            # Set up date range filters
            date_filters = {}
            if start_date and end_date:
                try:
                    # Use datetime class from datetime module
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    
                    # Adjust end date to include the entire day
                    end_date_obj_with_time = datetime.combine(end_date_obj, time.max)
                    
                    # Create timezone aware datetimes
                    tz = timezone.get_current_timezone()
                    start_datetime = timezone.make_aware(datetime.combine(start_date_obj, time.min), tz)
                    end_datetime = timezone.make_aware(end_date_obj_with_time, tz)
                    
                    date_filters = {
                        'created_at__gte': start_datetime,
                        'created_at__lte': end_datetime
                    }
                    
                except ValueError as e:
                    print(f"Date parsing error: {str(e)}")
                    # If date parsing fails, use default (all time)
                    pass
            
            # Total products within date range
            total_products = Product.objects.filter(**date_filters).count()
            
            # Low Stock Alert (quantity < 5) with fallback
            low_stock_count = Product.objects.filter(
                quantity__lt=5,
                **date_filters
            ).count()
            
            # Active Boosts within date range with fallback
            active_boosts_count = Boost.objects.filter(
                product__isnull=False,
                status='active',
                **date_filters
            ).count()
            
            # Compute average rating from Reviews within date range (using product-based reviews)
            rating_agg = Review.objects.filter(
                product__isnull=False,
                created_at__gte=date_filters.get('created_at__gte', datetime.min),
                created_at__lte=date_filters.get('created_at__lte', datetime.max)
            ).aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('id')
            )
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Compute engagement metrics from CustomerActivity within date range
            engagement_filters = {}
            if 'created_at__gte' in date_filters and 'created_at__lte' in date_filters:
                engagement_filters = {
                    'created_at__gte': date_filters['created_at__gte'],
                    'created_at__lte': date_filters['created_at__lte']
                }
            
            engagement_data = CustomerActivity.objects.filter(
                product__isnull=False,
                **engagement_filters
            ).values('product', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            # Create a dictionary to store engagement metrics per product
            product_engagement = {}
            for engagement in engagement_data:
                product_id = engagement['product']
                activity_type = engagement['activity_type']
                count = engagement['count']
                
                if product_id not in product_engagement:
                    product_engagement[product_id] = {
                        'views': 0,
                        'purchases': 0,
                        'favorites': 0,
                        'total_engagement': 0
                    }
                
                if activity_type == 'view':
                    product_engagement[product_id]['views'] = count
                elif activity_type == 'purchase':
                    product_engagement[product_id]['purchases'] = count
                elif activity_type == 'favorite':
                    product_engagement[product_id]['favorites'] = count
                
                # Calculate total engagement
                product_engagement[product_id]['total_engagement'] = (
                    product_engagement[product_id]['views'] +
                    product_engagement[product_id]['purchases'] +
                    product_engagement[product_id]['favorites']
                )
            
            # Get top products by engagement within date range
            top_products_data = []
            if product_engagement:
                # Get product details for top engaged products
                top_product_ids = sorted(
                    product_engagement.keys(),
                    key=lambda x: product_engagement[x]['total_engagement'],
                    reverse=True
                )[:5]
                
                # Apply date filters to products
                top_products_qs = Product.objects.filter(id__in=top_product_ids)
                if date_filters:
                    top_products_qs = top_products_qs.filter(**date_filters)
                
                top_products = top_products_qs.all()
                product_map = {product.id: product for product in top_products}
                
                for product_id in top_product_ids:
                    if product_id in product_map:
                        product = product_map[product_id]
                        engagement = product_engagement[product_id]
                        top_products_data.append({
                            'name': product.name,
                            'views': engagement['views'],
                            'purchases': engagement['purchases'],
                            'favorites': engagement['favorites'],
                            'total_engagement': engagement['total_engagement']
                        })
            
            # If no engagement data, get top products by creation date as fallback
            if not top_products_data:
                top_products = Product.objects.filter(**date_filters).order_by('-created_at')[:5]
                top_products_data = [
                    {
                        'name': product.name,
                        'views': 0,
                        'purchases': 0,
                        'favorites': 0,
                        'total_engagement': 0
                    }
                    for product in top_products
                ]
            
            # Rating Distribution from Reviews (product-based) within date range
            rating_distribution = Review.objects.filter(
                created_at__gte=date_filters.get('created_at__gte', datetime.min),
                created_at__lte=date_filters.get('created_at__lte', datetime.max)
            ).values('rating').annotate(
                count=Count('rating')
            ).order_by('-rating')
            
            rating_distribution_data = [
                {
                    'name': f'{rating["rating"]} Stars',
                    'value': rating['count']
                }
                for rating in rating_distribution
                if rating['rating'] is not None
            ]
            
            # Fill in missing ratings
            existing_ratings = {rd['name'][0] for rd in rating_distribution_data}
            for rating_val in [5, 4, 3, 2, 1]:
                if str(rating_val) not in existing_ratings:
                    rating_distribution_data.append({
                        'name': f'{rating_val} Stars',
                        'value': 0
                    })
            
            # Sort rating distribution
            rating_distribution_data.sort(key=lambda x: x['name'], reverse=True)
            
            # Calculate growth metrics if comparing to previous period
            growth_metrics = {}
            if start_date and end_date and start_date_obj and end_date_obj:
                try:
                    # Calculate previous period (same duration before start date)
                    period_days = (end_date_obj - start_date_obj).days + 1
                    prev_end_date = start_date_obj - timedelta(days=1)
                    prev_start_date = prev_end_date - timedelta(days=period_days - 1)
                    
                    prev_start_datetime = timezone.make_aware(
                        datetime.combine(prev_start_date, time.min), tz
                    )
                    prev_end_datetime = timezone.make_aware(
                        datetime.combine(prev_end_date, time.max), tz
                    )
                    
                    # Previous period total products
                    prev_total_products = Product.objects.filter(
                        created_at__gte=prev_start_datetime,
                        created_at__lte=prev_end_datetime
                    ).count()
                    
                    # Previous period low stock
                    prev_low_stock = Product.objects.filter(
                        quantity__lt=5,
                        created_at__gte=prev_start_datetime,
                        created_at__lte=prev_end_datetime
                    ).count()
                    
                    # Calculate growth percentages
                    if prev_total_products > 0:
                        product_growth = ((total_products - prev_total_products) / prev_total_products) * 100
                    else:
                        product_growth = 100 if total_products > 0 else 0
                    
                    if prev_low_stock > 0:
                        low_stock_growth = ((low_stock_count - prev_low_stock) / prev_low_stock) * 100
                    else:
                        low_stock_growth = 100 if low_stock_count > 0 else 0
                    
                    growth_metrics = {
                        'product_growth': round(product_growth, 1),
                        'low_stock_growth': round(low_stock_growth, 1),
                        'previous_period_total': prev_total_products,
                        'previous_period_low_stock': prev_low_stock,
                        'period_days': period_days
                    }
                    
                except Exception as e:
                    print(f"Error calculating growth metrics: {str(e)}")
                    growth_metrics = {}
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_products': total_products,
                    'low_stock_alert': low_stock_count,
                    'active_boosts': active_boosts_count,
                    'avg_rating': round(avg_rating, 1),
                    'top_products': top_products_data,
                    'rating_distribution': rating_distribution_data,
                    'growth_metrics': growth_metrics,
                    'has_data': any([
                        total_products > 0,
                        low_stock_count > 0,
                        active_boosts_count > 0,
                        avg_rating > 0,
                        len(top_products_data) > 0
                    ]),
                    'date_range': {
                        'start_date': start_date,
                        'end_date': end_date,
                        'range_type': range_type
                    } if start_date and end_date else None
                },
                'message': 'Metrics retrieved successfully',
                'data_source': 'database'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error retrieving metrics: {str(e)}")
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'])
    def get_products_list(self, request):
        """
        Get paginated list of products for admin with search, filter, and date range support
        """
        try:
            # Get query parameters
            search = request.query_params.get('search', '')
            category = request.query_params.get('category', 'all')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            
            # Get date range parameters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            range_type = request.query_params.get('range_type', 'weekly')
            
            # Start with base query
            products = Product.objects.all().order_by('name').select_related('shop', 'category')
            
            # Apply date range filter if provided
            start_datetime = None
            end_datetime = None
            
            if start_date and end_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    
                    # Adjust end date to include the entire day
                    end_date_obj_with_time = datetime.combine(end_date_obj, time.max)
                    
                    # Create timezone aware datetimes
                    tz = timezone.get_current_timezone()
                    start_datetime = timezone.make_aware(datetime.combine(start_date_obj, time.min), tz)
                    end_datetime = timezone.make_aware(end_date_obj_with_time, tz)
                    
                    products = products.filter(
                        created_at__gte=start_datetime,
                        created_at__lte=end_datetime
                    )
                    
                except ValueError as e:
                    print(f"Date parsing error in get_products_list: {str(e)}")
                    # If date parsing fails, ignore date filter
                    pass
            
            # Apply search filter
            if search:
                products = products.filter(
                    Q(name__icontains=search) | 
                    Q(description__icontains=search)
                )
            
            # Apply category filter
            if category != 'all':
                products = products.filter(category__name=category)
            
            # Get product IDs for related data queries
            product_ids = list(products.values_list('id', flat=True))
            
            # Compute engagement data from CustomerActivity with date range
            engagement_filters = {}
            if start_datetime and end_datetime:
                engagement_filters = {
                    'created_at__gte': start_datetime,
                    'created_at__lte': end_datetime
                }
            
            engagement_data = CustomerActivity.objects.filter(
                product__in=product_ids,
                **engagement_filters
            ).values('product', 'activity_type').annotate(
                count=Count('activity_type')
            )
            
            engagement_map = {}
            for engagement in engagement_data:
                product_id = engagement['product']
                activity_type = engagement['activity_type']
                count = engagement['count']
                
                if product_id not in engagement_map:
                    engagement_map[product_id] = {'views': 0, 'purchases': 0, 'favorites': 0}
                
                if activity_type == 'view':
                    engagement_map[product_id]['views'] = count
                elif activity_type == 'purchase':
                    engagement_map[product_id]['purchases'] = count
                elif activity_type == 'favorite':
                    engagement_map[product_id]['favorites'] = count
            
            # Compute variants count
            variants_data = Variants.objects.filter(
                product__in=product_ids
            ).values('product').annotate(
                variants_count=Count('id')
            )
            
            variants_map = {vd['product']: vd['variants_count'] for vd in variants_data}
            
            # Compute issues count
            issues_data = Issues.objects.filter(
                product__in=product_ids
            ).values('product').annotate(
                issues_count=Count('id')
            )
            
            issues_map = {id['product']: id['issues_count'] for id in issues_data}
            
            # Compute boost plan
            boost_data = Boost.objects.filter(
                product__in=product_ids
            ).select_related('boost_plan')
            
            boost_map = {}
            for boost in boost_data:
                if boost.boost_plan:
                    boost_map[boost.product.id] = boost.boost_plan.name
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            paginated_products = products[start_index:end_index]
            total_count = products.count()
            
            # Serialize with computed fields
            products_data = []
            for product in paginated_products:
                product_id = product.id
                
                # Get computed engagement data
                engagement = engagement_map.get(product_id, {'views': 0, 'purchases': 0, 'favorites': 0})
                
                # Get product rating from reviews with date range
                review_filters = {'product': product}
                if start_datetime and end_datetime:
                    review_filters.update({
                        'created_at__gte': start_datetime,
                        'created_at__lte': end_datetime
                    })
                
                product_rating = Review.objects.filter(**review_filters).aggregate(
                    avg_rating=Avg('rating')
                )['avg_rating'] or 0.0
                
                # Get computed counts
                variants_count = variants_map.get(product_id, 0)
                issues_count = issues_map.get(product_id, 0)
                
                # Get boost plan
                boost_plan = boost_map.get(product_id, 'None')
                
                # Determine low stock
                low_stock = product.quantity < 5
                
                # Build product data
                product_data = {
                    'id': str(product_id),
                    'name': product.name,
                    'category': product.category.name if product.category else 'Uncategorized',
                    'shop': product.shop.name if product.shop else 'No Shop',
                    'price': str(product.price),
                    'quantity': product.quantity,
                    'condition': product.condition,
                    'status': product.status,
                    'views': engagement['views'],
                    'purchases': engagement['purchases'],
                    'favorites': engagement['favorites'],
                    'rating': round(product_rating, 1),
                    'boostPlan': boost_plan,
                    'variants': variants_count,
                    'issues': issues_count,
                    'lowStock': low_stock,
                    'created_at': product.created_at.isoformat() if product.created_at else None,
                    'updated_at': product.updated_at.isoformat() if product.updated_at else None
                }
                products_data.append(product_data)
            
            response_data = {
                'success': True,
                'products': products_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'range_type': range_type
                } if start_date and end_date else None,
                'message': 'Products retrieved successfully',
                'data_source': 'database'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error retrieving products: {str(e)}")
            return Response(
                {'success': False, 'error': f'Error retrieving products: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])    
    def get_product(self, request):
        product_id = request.query_params.get('product_id')
        
        # Validate product_id parameter
        if not product_id:
            return Response(
                {"error": "product_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate UUID format
        try:
            uuid.UUID(product_id)
        except ValueError:
            return Response(
                {"error": "Invalid product ID format"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get product with all related data
            product = Product.objects.select_related(
                'shop',
                'customer',
                'category_admin',
                'category',
                'customer__customer'  # Access the User through Customer
            ).prefetch_related(
                'productmedia_set',
                'variants_set',
                'variants_set__variantoptions_set',
                'reviews',
                'reviews__customer__customer',  # Access User through Customer for reviews
                'favorites_set',
                'favorites_set__customer__customer',
                'boost_set',
                'boost_set__boost_plan',
                'reports_against',
                'reports_against__reporter'
            ).get(id=product_id)
            
            # Build the response data
            product_data = {
                "id": str(product.id),
                "name": product.name,
                "description": product.description,
                "quantity": product.quantity,
                "price": str(product.price),
                "upload_status": product.upload_status,
                "status": product.status,
                "condition": product.condition,
                "created_at": product.created_at.isoformat(),
                "updated_at": product.updated_at.isoformat(),
                "is_removed": product.is_removed,
                "removal_reason": product.removal_reason,
                "removed_at": product.removed_at.isoformat() if product.removed_at else None,
                "active_report_count": product.active_report_count,
                "favorites_count": product.favorites_set.count(),
            }
            
            # Shop data
            if product.shop:
                product_data["shop"] = {
                    "id": str(product.shop.id),
                    "name": product.shop.name,
                    "verified": product.shop.verified,
                    "city": product.shop.city,
                    "barangay": product.shop.barangay,
                    "total_sales": str(product.shop.total_sales),
                    "created_at": product.shop.created_at.isoformat(),
                    "is_suspended": product.shop.is_suspended,
                }
            else:
                product_data["shop"] = None
            
            # Customer data
            if product.customer:
                product_data["customer"] = {
                    "username": product.customer.customer.username if product.customer.customer else None,
                    "email": product.customer.customer.email if product.customer.customer else None,
                    "contact_number": product.customer.customer.contact_number if product.customer.customer else None,
                    "product_limit": product.customer.product_limit,
                    "current_product_count": product.customer.current_product_count,
                }
            else:
                product_data["customer"] = None
            
            # Category data
            if product.category:
                product_data["category"] = {
                    "id": str(product.category.id),
                    "name": product.category.name,
                }
            else:
                product_data["category"] = None
            
            # Admin category data
            if product.category_admin:
                product_data["category_admin"] = {
                    "id": str(product.category_admin.id),
                    "name": product.category_admin.name,
                }
            else:
                product_data["category_admin"] = None
            
            # Media files
            product_data["media"] = [
                {
                    "id": str(media.id),
                    "file_data": media.file_data.url if media.file_data else None,
                    "file_type": media.file_type,
                }
                for media in product.productmedia_set.all()
            ]
            
            # Variants
            product_data["variants"] = [
                {
                    "id": str(variant.id),
                    "title": variant.title,
                    "options": [
                        {
                            "id": str(option.id),
                            "title": option.title,
                            "quantity": option.quantity,
                            "price": str(option.price),
                        }
                        for option in variant.variantoptions_set.all()
                    ]
                }
                for variant in product.variants_set.all()
            ]
            
            # Reviews
            product_data["reviews"] = [
                {
                    "id": str(review.id),
                    "rating": review.rating,
                    "comment": review.comment,
                    "customer": review.customer.customer.username if review.customer and review.customer.customer else None,
                    "created_at": review.created_at.isoformat(),
                }
                for review in product.reviews.all()
            ]
            
            # Active boost
            active_boost = product.boost_set.filter(
                status='active',
                end_date__gt=timezone.now()
            ).first()
            
            if active_boost:
                product_data["boost"] = {
                    "id": str(active_boost.id),
                    "status": active_boost.status,
                    "plan": active_boost.boost_plan.name if active_boost.boost_plan else None,
                    "end_date": active_boost.end_date.isoformat(),
                }
            else:
                product_data["boost"] = None
            
            # Reports summary
            product_data["reports"] = {
                "active": product.reports_against.filter(status__in=['pending', 'under_review']).count(),
                "total": product.reports_against.count(),
            }
            
            return Response(product_data, status=status.HTTP_200_OK)
            
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": "An error occurred while fetching product data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['put'])
    def update_product_status(self, request):
        """
        Update product status based on the requested action.
        Actions: publish, deleteDraft, unpublish, archive, restore, 
                remove, restoreRemoved, suspend, unsuspend
        """
        print(request.body)
        # Parse request data
        try:
            data = json.loads(request.body)
            product_id = data.get('product_id')
            action_type = data.get('action_type')
            user_id = data.get('user_id')  # Get user_id from request data
            reason = data.get('reason', '')
            suspension_days = data.get('suspension_days', 7)  # Default 7 days
            
            # Validate required fields
            if not product_id:
                return Response(
                    {"error": "product_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not action_type:
                return Response(
                    {"error": "action_type is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not user_id:
                return Response(
                    {"error": "user_id is required to identify the admin performing the action"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate UUID format
            try:
                uuid.UUID(product_id)
            except ValueError:
                return Response(
                    {"error": "Invalid product ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                uuid.UUID(user_id)
            except ValueError:
                return Response(
                    {"error": "Invalid user ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate action type
            valid_actions = [
                'publish', 'deleteDraft', 'unpublish', 'archive', 'restore',
                'remove', 'restoreRemoved', 'suspend', 'unsuspend'
            ]
            
            if action_type not in valid_actions:
                return Response(
                    {"error": f"Invalid action_type. Must be one of: {', '.join(valid_actions)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid JSON data"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get product with related data
            product = Product.objects.select_related(
                'customer',
                'shop'
            ).get(id=product_id)
            
            # Get admin user from user_id
            try:
                admin_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "Admin user not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify user is an admin
            if not admin_user.is_admin:
                return Response(
                    {"error": "Only admin users can perform this action"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Perform action based on action_type
            with transaction.atomic():
                if action_type == 'publish':
                    # Validate product can be published
                    if product.upload_status != 'draft':
                        return Response(
                            {"error": f"Product is not in draft status. Current status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate product has required fields
                    if not product.name or not product.description or not product.price:
                        return Response(
                            {"error": "Product must have name, description, and price before publishing"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if product.quantity < 0:
                        return Response(
                            {"error": "Product quantity cannot be negative"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.upload_status = 'published'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Published product: {product.name}"
                    )
                    
                    return Response({
                        "message": "Product published successfully",
                        "upload_status": product.upload_status,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'deleteDraft':
                    # Validate product can be deleted
                    if product.upload_status != 'draft':
                        return Response(
                            {"error": f"Only draft products can be deleted. Current status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Decrement customer product count
                    if product.customer:
                        product.customer.decrement_product_count()
                    
                    # Create log entry before deletion
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Deleted draft product: {product.name}"
                    )
                    
                    # Delete the product
                    product.delete()
                    
                    return Response({
                        "message": "Draft product deleted successfully",
                        "deleted_at": timezone.now().isoformat()
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'unpublish':
                    # Validate product can be unpublished
                    if product.upload_status != 'published':
                        return Response(
                            {"error": f"Only published products can be unpublished. Current status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.upload_status = 'draft'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Unpublished product: {product.name}"
                    )
                    
                    return Response({
                        "message": "Product unpublished successfully",
                        "upload_status": product.upload_status,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'archive':
                    # Validate product can be archived
                    if product.upload_status != 'published' and product.upload_status != 'draft':
                        return Response(
                            {"error": f"Only published or draft products can be archived. Current status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.upload_status = 'archived'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Archived product: {product.name}"
                    )
                    
                    return Response({
                        "message": "Product archived successfully",
                        "upload_status": product.upload_status,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'restore':
                    # Validate product can be restored (from archived)
                    if product.upload_status != 'archived':
                        return Response(
                            {"error": f"Only archived products can be restored. Current status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Default to published, but could be based on previous state if tracked
                    product.upload_status = 'published'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Restored product from archive: {product.name}"
                    )
                    
                    return Response({
                        "message": "Product restored successfully",
                        "upload_status": product.upload_status,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'remove':
                    # Validate product can be removed
                    if product.is_removed:
                        return Response(
                            {"error": "Product is already removed"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.is_removed = True
                    product.removal_reason = reason
                    product.removed_at = timezone.now()
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Removed product: {product.name}. Reason: {reason}"
                    )
                    
                    # Get user to send notification (customer)
                    if product.customer and product.customer.customer:
                        Notification.objects.create(
                            user=product.customer.customer,
                            title="Product Removal",
                            type="product_removal",
                            message=f"Your product '{product.name}' has been removed by admin. Reason: {reason}",
                            is_read=False
                        )
                    
                    return Response({
                        "message": "Product removed successfully",
                        "is_removed": product.is_removed,
                        "removal_reason": product.removal_reason,
                        "removed_at": product.removed_at,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'restoreRemoved':
                    # Validate product can be restored (from removed)
                    if not product.is_removed:
                        return Response(
                            {"error": "Product is not removed"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.is_removed = False
                    product.removal_reason = None
                    product.removed_at = None
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Restored removed product: {product.name}"
                    )
                    
                    # Get user to send notification (customer)
                    if product.customer and product.customer.customer:
                        Notification.objects.create(
                            user=product.customer.customer,
                            title="Product Restored",
                            type="product_restoration",
                            message=f"Your product '{product.name}' has been restored by admin.",
                            is_read=False
                        )
                    
                    return Response({
                        "message": "Product restored successfully",
                        "is_removed": product.is_removed,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'suspend':
                    # Validate product can be suspended
                    if product.status == 'Suspended':
                        return Response(
                            {"error": "Product is already suspended"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if product.is_removed:
                        return Response(
                            {"error": "Cannot suspend a removed product"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if product.upload_status != 'published':
                        return Response(
                            {"error": f"Only published products can be suspended. Current upload status: {product.upload_status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    previous_status = product.status
                    product.status = 'Suspended'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Suspended product: {product.name}. Previous status: {previous_status}. Reason: {reason}"
                    )
                    
                    # Create suspension record (optional - if you have a Suspension model)
                    # Suspension.objects.create(
                    #     product=product,
                    #     suspended_by=admin_user,
                    #     reason=reason,
                    #     suspension_days=suspension_days,
                    #     suspended_until=timezone.now() + timedelta(days=suspension_days)
                    # )
                    
                    # Get user to send notification (customer)
                    if product.customer and product.customer.customer:
                        Notification.objects.create(
                            user=product.customer.customer,
                            title="Product Suspension",
                            type="product_suspension",
                            message=f"Your product '{product.name}' has been suspended for {suspension_days} days. Reason: {reason}",
                            is_read=False
                        )
                    
                    return Response({
                        "message": "Product suspended successfully",
                        "status": product.status,
                        "suspension_days": suspension_days,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                    
                elif action_type == 'unsuspend':
                    # Validate product can be unsuspended
                    if product.status != 'Suspended':
                        return Response(
                            {"error": f"Product is not suspended. Current status: {product.status}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Update product
                    product.status = 'Active'
                    product.save()
                    
                    # Create log entry
                    Logs.objects.create(
                        user=admin_user,
                        action=f"Unsuspended product: {product.name}"
                    )
                    
                    # Update suspension record if exists (optional)
                    # suspension = Suspension.objects.filter(
                    #     product=product,
                    #     is_active=True
                    # ).first()
                    # if suspension:
                    #     suspension.is_active = False
                    #     suspension.unsuspended_at = timezone.now()
                    #     suspension.save()
                    
                    # Get user to send notification (customer)
                    if product.customer and product.customer.customer:
                        Notification.objects.create(
                            user=product.customer.customer,
                            title="Product Unsuspended",
                            type="product_unsuspension",
                            message=f"Your product '{product.name}' has been unsuspended by admin.",
                            is_read=False
                        )
                    
                    return Response({
                        "message": "Product unsuspended successfully",
                        "status": product.status,
                        "updated_at": product.updated_at
                    }, status=status.HTTP_200_OK)
                
                else:
                    return Response(
                        {"error": "Invalid action type"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating product status: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while updating product status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminShops(viewsets.ViewSet):
    """
    ViewSet for admin shop management and analytics
    """
    
    def parse_date(self, date_str):
        """Parse date string in multiple formats"""
        if not date_str:
            return None
            
        try:
            # Try ISO format with timezone (2025-12-07T03:21:09.209Z)
            if re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', date_str):
                if date_str.endswith('Z'):
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return datetime.fromisoformat(date_str)
            
            # Try simple date format (2025-12-07)
            elif re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                return datetime.strptime(date_str, '%Y-%m-%d')
            
            # Try other common formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y/%m/%d', '%m/%d/%Y']:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
                    
            return None
            
        except (ValueError, TypeError) as e:
            print(f"Date parsing error for '{date_str}': {e}")
            return None
    
    def get_date_range_filter(self, start_date_str, end_date_str):
        """Get date range filter or return default (last 30 days)"""
        # Default to last 30 days if no date range provided
        if not start_date_str and not end_date_str:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            return start_date, end_date
        
        # Parse provided dates
        start_date = self.parse_date(start_date_str) if start_date_str else None
        end_date = self.parse_date(end_date_str) if end_date_str else None
        
        # Validate dates
        if start_date_str and not start_date:
            raise ValueError(f"Invalid start_date format: {start_date_str}")
        
        if end_date_str and not end_date:
            raise ValueError(f"Invalid end_date format: {end_date_str}")
        
        # Make dates timezone aware if needed
        if start_date and not timezone.is_aware(start_date):
            start_date = timezone.make_aware(start_date, timezone.get_current_timezone())
        
        if end_date and not timezone.is_aware(end_date):
            end_date = timezone.make_aware(end_date, timezone.get_current_timezone())
        
        # If only start date provided, end date defaults to now
        if start_date and not end_date:
            end_date = timezone.now()
        
        # If only end date provided, start date defaults to 30 days before end date
        if end_date and not start_date:
            start_date = end_date - timedelta(days=30)
        
        return start_date, end_date
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive shop metrics for admin dashboard with date range support
        """
        try:
            start_date_str = request.GET.get('start_date')
            end_date_str = request.GET.get('end_date')
            
            # Get date range
            try:
                start_date, end_date = self.get_date_range_filter(start_date_str, end_date_str)
            except ValueError as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # DEBUG: Print date range for troubleshooting
            print(f"Date range filter: {start_date} to {end_date}")
            
            # Base queryset for ALL shops (not filtered by date for total counts)
            all_shops_qs = Shop.objects.all()
            total_shops = all_shops_qs.count()
            
            # Get shop IDs for the date range (shops created in that period)
            date_filtered_shops_qs = Shop.objects.all()
            if start_date and end_date:
                date_filtered_shops_qs = date_filtered_shops_qs.filter(
                    created_at__range=[start_date, end_date]
                )
            
            date_filtered_shop_ids = list(date_filtered_shops_qs.values_list('id', flat=True))
            
            # Calculate total followers from ShopFollow (for all shops, not just date-filtered)
            total_followers = ShopFollow.objects.count()
            
            # Calculate average rating from Reviews (for all shops)
            rating_agg = Review.objects.aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('id')
            )
            avg_rating = rating_agg['avg_rating'] or 0.0
            
            # Get verified shops count (for all shops)
            verified_shops = all_shops_qs.filter(verified=True).count()
            
            # Get top shop by rating (for all shops)
            top_shop = all_shops_qs.annotate(
                avg_rating=Avg('reviews__rating'),
                followers_count=Count('followers')
            ).filter(avg_rating__isnull=False).order_by('-avg_rating').first()
            
            top_shop_name = top_shop.name if top_shop else "No shops"
            
            # Additional metrics for date range
            new_shops_in_period = date_filtered_shops_qs.count()
            verified_shops_in_period = date_filtered_shops_qs.filter(verified=True).count()
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_shops': total_shops,
                    'total_followers': total_followers,
                    'avg_rating': round(float(avg_rating), 1),
                    'verified_shops': verified_shops,
                    'top_shop_name': top_shop_name,
                    'new_shops_in_period': new_shops_in_period,
                    'verified_shops_in_period': verified_shops_in_period,
                },
                'message': 'Metrics retrieved successfully',
                'date_range': {
                    'start_date': start_date_str or start_date.isoformat(),
                    'end_date': end_date_str or end_date.isoformat(),
                    'actual_start': start_date.isoformat() if start_date else None,
                    'actual_end': end_date.isoformat() if end_date else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_shops_list(self, request):
        """
        Get list of all shops with computed metrics with optional date range filtering
        """
        try:
            start_date_str = request.GET.get('start_date')
            end_date_str = request.GET.get('end_date')
            
            # Get date range
            try:
                start_date, end_date = self.get_date_range_filter(start_date_str, end_date_str)
            except ValueError as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Base queryset - filter by date range if provided
            shops_qs = Shop.objects.all().select_related('customer__customer')
            
            if start_date and end_date:
                shops_qs = shops_qs.filter(created_at__range=[start_date, end_date])
            
            # DEBUG: Print query info
            print(f"Found {shops_qs.count()} shops in date range")
            
            # Get shop IDs for related data queries
            shop_ids = list(shops_qs.values_list('id', flat=True))
            
            # Compute followers count for each shop
            followers_data = ShopFollow.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                followers_count=Count('id')
            )
            followers_map = {fd['shop']: fd['followers_count'] for fd in followers_data}
            
            # Compute products count for each shop
            products_data = Product.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                products_count=Count('id')
            )
            products_map = {pd['shop']: pd['products_count'] for pd in products_data}
            
            # Compute ratings for each shop
            ratings_data = Review.objects.filter(
                shop__in=shop_ids
            ).values('shop').annotate(
                avg_rating=Avg('rating'),
                total_ratings=Count('id')
            )
            ratings_map = {rd['shop']: rd for rd in ratings_data}
            
            # Compute active boosts for each shop
            boosts_data = Boost.objects.filter(
                shop__in=shop_ids,
                status='active'
            ).values('shop').annotate(
                active_boosts=Count('id')
            )
            boosts_map = {bd['shop']: bd['active_boosts'] for bd in boosts_data}
            
            # Build shops data
            shops_data = []
            for shop in shops_qs:
                shop_id = shop.id
                
                # Get owner name
                customer = shop.customer
                if customer and customer.customer:
                    user = customer.customer
                    owner_name = f"{user.first_name} {user.last_name}".strip()
                    if not owner_name:
                        owner_name = user.username or "Unknown"
                else:
                    owner_name = "Unknown Owner"
                
                # Get computed metrics
                followers = followers_map.get(shop_id, 0)
                products_count = products_map.get(shop_id, 0)
                rating_info = ratings_map.get(shop_id, {'avg_rating': 0.0, 'total_ratings': 0})
                active_boosts = boosts_map.get(shop_id, 0)
                
                shop_data = {
                    'id': str(shop_id),
                    'name': shop.name,
                    'owner': owner_name,
                    'location': f"{shop.city}, {shop.province}" if shop.city and shop.province else shop.city or shop.province or 'Unknown',
                    'followers': followers,
                    'products': products_count,
                    'rating': round(float(rating_info['avg_rating']), 1),
                    'totalRatings': rating_info['total_ratings'],
                    'status': shop.status,
                    'joinedDate': shop.created_at.isoformat() if shop.created_at else None,
                    'totalSales': float(shop.total_sales),
                    'activeBoosts': active_boosts,
                    'verified': shop.verified
                }
                shops_data.append(shop_data)
            
            response_data = {
                'success': True,
                'shops': shops_data,
                'total_count': len(shops_data),
                'message': 'Shops retrieved successfully',
                'date_range': {
                    'start_date': start_date_str or start_date.isoformat(),
                    'end_date': end_date_str or end_date.isoformat(),
                    'actual_start': start_date.isoformat() if start_date else None,
                    'actual_end': end_date.isoformat() if end_date else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving shops: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

class AdminBoosting(viewsets.ViewSet):
    """
    ViewSet for admin boost management and analytics
    """
    
    def parse_date(self, date_str):
        """Parse date string in multiple formats"""
        if not date_str:
            return None
            
        try:
            # Try ISO format with timezone (2025-12-07T03:21:09.209Z)
            if re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', date_str):
                if date_str.endswith('Z'):
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return datetime.fromisoformat(date_str)
            
            # Try simple date format (2025-12-07)
            elif re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                return datetime.strptime(date_str, '%Y-%m-%d')
            
            # Try other common formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y/%m/%d', '%m/%d/%Y']:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
                    
            return None
            
        except (ValueError, TypeError) as e:
            print(f"Date parsing error for '{date_str}': {e}")
            return None
    
    def get_date_range_filter(self, start_date_str, end_date_str):
        """Get date range filter or return default (last 30 days)"""
        # Default to last 30 days if no date range provided
        if not start_date_str and not end_date_str:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            return start_date, end_date
        
        # Parse provided dates
        start_date = self.parse_date(start_date_str) if start_date_str else None
        end_date = self.parse_date(end_date_str) if end_date_str else None
        
        # Validate dates
        if start_date_str and not start_date:
            raise ValueError(f"Invalid start_date format: {start_date_str}")
        
        if end_date_str and not end_date:
            raise ValueError(f"Invalid end_date format: {end_date_str}")
        
        # Make dates timezone aware if needed
        if start_date and not timezone.is_aware(start_date):
            start_date = timezone.make_aware(start_date, timezone.get_current_timezone())
        
        if end_date and not timezone.is_aware(end_date):
            end_date = timezone.make_aware(end_date, timezone.get_current_timezone())
        
        # If only start date provided, end date defaults to now
        if start_date and not end_date:
            end_date = timezone.now()
        
        # If only end date provided, start date defaults to 30 days before end date
        if end_date and not start_date:
            start_date = end_date - timedelta(days=30)
        
        return start_date, end_date
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get comprehensive boost metrics for admin dashboard with date range support
        """
        try:
            start_date_str = request.GET.get('start_date')
            end_date_str = request.GET.get('end_date')
            
            # Get date range
            try:
                start_date, end_date = self.get_date_range_filter(start_date_str, end_date_str)
            except ValueError as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # DEBUG: Print date range for troubleshooting
            print(f"Boost metrics date range filter: {start_date} to {end_date}")
            
            # Base queryset for all boosts (not filtered by date for total counts)
            all_boosts_qs = Boost.objects.all()
            total_boosts = all_boosts_qs.count()
            
            # Calculate date-filtered metrics
            date_filtered_boosts_qs = Boost.objects.all()
            if start_date and end_date:
                date_filtered_boosts_qs = date_filtered_boosts_qs.filter(
                    created_at__range=[start_date, end_date]
                )
            
            # Active boosts in the date range
            active_boosts_in_period = date_filtered_boosts_qs.filter(status='active').count()
            
            # Calculate revenue from boosts in the date range
            # Note: Since Boost model doesn't store price, we need to get it from BoostPlan
            boosts_in_period = date_filtered_boosts_qs.select_related('boost_plan')
            total_revenue_in_period = sum(
                float(boost.boost_plan.price) if boost.boost_plan else 0
                for boost in boosts_in_period
            )
            
            # Get all boost plans for metrics
            total_boost_plans = BoostPlan.objects.count()
            active_boost_plans = BoostPlan.objects.filter(status='active').count()
            
            # Calculate expiring soon (within 7 days) from ALL boosts (not date-filtered)
            seven_days_later = timezone.now() + timedelta(days=7)
            expiring_soon = Boost.objects.filter(
                status='active',
                end_date__lte=seven_days_later,
                end_date__gte=timezone.now()
            ).count()
            
            # Get most popular boost plan in the period (based on usage)
            popular_plan_data = boosts_in_period.values('boost_plan__name').annotate(
                usage_count=Count('id')
            ).order_by('-usage_count').first()
            
            most_popular_boost = popular_plan_data['boost_plan__name'] if popular_plan_data else "No boosts"
            
            # Additional metrics for the date range
            new_boosts_in_period = date_filtered_boosts_qs.count()
            
            # Get pending boosts in the date range
            pending_boosts_in_period = date_filtered_boosts_qs.filter(status='pending').count()
            
            # Get cancelled boosts in the date range
            cancelled_boosts_in_period = date_filtered_boosts_qs.filter(status='cancelled').count()
            
            # Calculate total revenue from all boosts (not date-filtered)
            all_boosts_revenue = sum(
                float(boost.boost_plan.price) if boost.boost_plan else 0
                for boost in all_boosts_qs.select_related('boost_plan')
            )
            
            response_data = {
                'success': True,
                'metrics': {
                    'total_boosts': total_boosts,
                    'active_boosts': active_boosts_in_period,
                    'total_boost_plans': total_boost_plans,
                    'active_boost_plans': active_boost_plans,
                    'total_revenue': float(total_revenue_in_period),
                    'expiring_soon': expiring_soon,
                    'most_popular_boost': most_popular_boost,
                    'new_boosts_in_period': new_boosts_in_period,
                    'pending_boosts': pending_boosts_in_period,
                    'cancelled_boosts': cancelled_boosts_in_period,
                    'all_time_revenue': float(all_boosts_revenue)
                },
                'message': 'Metrics retrieved successfully',
                'date_range': {
                    'start_date': start_date_str or start_date.isoformat(),
                    'end_date': end_date_str or end_date.isoformat(),
                    'actual_start': start_date.isoformat() if start_date else None,
                    'actual_end': end_date.isoformat() if end_date else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving metrics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_boost_plans(self, request):
        """
        Get all boost plans with features and additional data with date range support
        """
        try:
            start_date_str = request.GET.get('start_date')
            end_date_str = request.GET.get('end_date')
            
            # Get date range
            try:
                start_date, end_date = self.get_date_range_filter(start_date_str, end_date_str)
            except ValueError as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Base queryset for boost plans with features
            boost_plans = BoostPlan.objects.all().select_related('user').prefetch_related(
                Prefetch(
                    'features',
                    queryset=BoostPlanFeature.objects.select_related('feature'),
                    to_attr='plan_features'
                )
            )
            
            # Get boosts for usage calculation within date range
            boosts_qs = Boost.objects.all()
            if start_date and end_date:
                boosts_qs = boosts_qs.filter(
                    created_at__range=[start_date, end_date]
                )
            
            # Calculate usage count for each plan within date range
            plan_usage = boosts_qs.values('boost_plan').annotate(
                usage_count=Count('id')
            )
            usage_map = {item['boost_plan']: item['usage_count'] for item in plan_usage}
            
            # Calculate revenue for each plan within date range
            plan_revenue = boosts_qs.values('boost_plan').annotate(
                revenue=Sum('boost_plan__price')
            )
            revenue_map = {item['boost_plan']: float(item['revenue'] or 0) for item in plan_revenue}
            
            plans_data = []
            for plan in boost_plans:
                # Get features for this plan
                features_data = []
                for plan_feature in getattr(plan, 'plan_features', []):
                    features_data.append({
                        'name': plan_feature.feature.name,
                        'description': plan_feature.feature.description,
                        'value': plan_feature.value
                    })
                
                plan_data = {
                    'boost_plan_id': str(plan.id),
                    'name': plan.name,
                    'price': float(plan.price),
                    'duration': plan.duration,
                    'time_unit': plan.time_unit,
                    'status': plan.status,
                    'user_id': str(plan.user.id) if plan.user else None,
                    'user_name': plan.user.username if plan.user else 'System',
                    'user_email': plan.user.email if plan.user else None,
                    'features': features_data,
                    'usage_count': usage_map.get(plan.id, 0),
                    'revenue': revenue_map.get(plan.id, 0),
                    'created_at': plan.created_at.isoformat(),
                    'updated_at': plan.updated_at.isoformat(),
                }
                plans_data.append(plan_data)
            
            response_data = {
                'success': True,
                'boost_plans': plans_data,
                'message': 'Boost plans retrieved successfully',
                'date_range': {
                    'start_date': start_date_str or start_date.isoformat(),
                    'end_date': end_date_str or end_date.isoformat(),
                    'actual_start': start_date.isoformat() if start_date else None,
                    'actual_end': end_date.isoformat() if end_date else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving boost plans: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_active_boosts(self, request):
        """
        Get all boosts with related data with date range support
        """
        try:
            start_date_str = request.GET.get('start_date')
            end_date_str = request.GET.get('end_date')
            
            # Get date range
            try:
                start_date, end_date = self.get_date_range_filter(start_date_str, end_date_str)
            except ValueError as e:
                return Response(
                    {'success': False, 'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Base queryset - filter by date range if provided
            boosts_qs = Boost.objects.all().order_by('-created_at').select_related(
                'product',
                'boost_plan',
                'shop',
                'customer',
                'customer__customer'
            )
            
            if start_date and end_date:
                boosts_qs = boosts_qs.filter(
                    created_at__range=[start_date, end_date]
                )
            
            # DEBUG: Print query info
            print(f"Found {boosts_qs.count()} boosts in date range")
            
            boosts_data = []
            for boost in boosts_qs:
                # Get customer info
                customer_name = "Unknown"
                customer_email = "No email"
                if boost.customer and boost.customer.customer:
                    user = boost.customer.customer
                    customer_name = f"{user.first_name} {user.last_name}".strip()
                    if not customer_name:
                        customer_name = user.username
                    customer_email = user.email or "No email"
                
                # Get shop info
                shop_name = boost.shop.name if boost.shop else "No shop"
                shop_id = str(boost.shop.id) if boost.shop else None
                
                # Get product info
                product_name = boost.product.name if boost.product else "No product"
                product_id = str(boost.product.id) if boost.product else None
                
                # Get boost plan info
                boost_plan_name = boost.boost_plan.name if boost.boost_plan else "No plan"
                boost_plan_price = float(boost.boost_plan.price) if boost.boost_plan else 0.0
                
                # Calculate duration in days for display
                duration_days = 0
                if boost.start_date and boost.end_date:
                    duration_days = (boost.end_date - boost.start_date).days
                
                boost_data = {
                    'boost_id': str(boost.id),
                    'product_id': product_id,
                    'product_name': product_name,
                    'boost_plan_id': str(boost.boost_plan.id) if boost.boost_plan else None,
                    'boost_plan_name': boost_plan_name,
                    'shop_id': shop_id,
                    'shop_name': shop_name,
                    'customer_id': str(boost.customer.customer) if boost.customer else None,
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'status': boost.status,
                    'amount': boost_plan_price,
                    'start_date': boost.start_date.isoformat() if boost.start_date else None,
                    'end_date': boost.end_date.isoformat() if boost.end_date else None,
                    'duration_days': duration_days,
                    'created_at': boost.created_at.isoformat(),
                    'updated_at': boost.updated_at.isoformat(),
                }
                boosts_data.append(boost_data)
            
            response_data = {
                'success': True,
                'boosts': boosts_data,
                'total_count': len(boosts_data),
                'message': 'Boosts retrieved successfully',
                'date_range': {
                    'start_date': start_date_str or start_date.isoformat(),
                    'end_date': end_date_str or end_date.isoformat(),
                    'actual_start': start_date.isoformat() if start_date else None,
                    'actual_end': end_date.isoformat() if end_date else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error retrieving boosts: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_plan_revenue_data(self, start_date=None, end_date=None):
        """Get revenue distribution across boost plans within date range"""
        boosts_qs = Boost.objects.all()
        if start_date and end_date:
            boosts_qs = boosts_qs.filter(
                created_at__range=[start_date, end_date]
            )
        
        # Calculate revenue per plan in the date range
        plan_revenue = boosts_qs.values('boost_plan__name').annotate(
            revenue=Sum('boost_plan__price')
        ).filter(revenue__gt=0)
        
        total_revenue = sum(item['revenue'] or 0 for item in plan_revenue)
        
        plan_revenue_data = []
        for item in plan_revenue:
            plan_revenue_value = float(item['revenue'] or 0)
            percentage = (plan_revenue_value / total_revenue * 100) if total_revenue > 0 else 0
            
            plan_revenue_data.append({
                'name': item['boost_plan__name'],
                'value': plan_revenue_value,
                'percentage': round(percentage, 1)
            })
        
        return plan_revenue_data
    
    @action(detail=False, methods=['post'])
    def create_boost_plan(self, request):
        """
        Create a new boost plan
        """
        try:
            required_fields = ['name', 'price', 'duration', 'time_unit']
            for field in required_fields:
                if field not in request.data:
                    return Response(
                        {'success': False, 'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate time_unit
            valid_time_units = ['hours', 'days', 'weeks', 'months']
            if request.data['time_unit'] not in valid_time_units:
                return Response(
                    {'success': False, 'error': f'Invalid time_unit. Must be one of: {valid_time_units}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            boost_plan = BoostPlan.objects.create(
                name=request.data['name'],
                price=request.data['price'],
                duration=request.data['duration'],
                time_unit=request.data['time_unit'],
                status=request.data.get('status', 'active'),
                user=request.user if request.user.is_authenticated else None
            )
            
            response_data = {
                'success': True,
                'boost_plan': {
                    'boost_plan_id': str(boost_plan.id),
                    'name': boost_plan.name,
                    'price': float(boost_plan.price),
                    'duration': boost_plan.duration,
                    'time_unit': boost_plan.time_unit,
                    'status': boost_plan.status,
                    'created_at': boost_plan.created_at.isoformat(),
                },
                'message': 'Boost plan created successfully'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error creating boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['put'])
    def update_boost_plan(self, request):
        """
        Update an existing boost plan
        """
        try:
            boost_plan_id = request.data.get('boost_plan_id')
            if not boost_plan_id:
                return Response(
                    {'success': False, 'error': 'boost_plan_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                boost_plan = BoostPlan.objects.get(id=boost_plan_id)
            except BoostPlan.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Boost plan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update fields
            updatable_fields = ['name', 'price', 'duration', 'time_unit', 'status']
            for field in updatable_fields:
                if field in request.data:
                    setattr(boost_plan, field, request.data[field])
            
            boost_plan.save()
            
            response_data = {
                'success': True,
                'boost_plan': {
                    'boost_plan_id': str(boost_plan.id),
                    'name': boost_plan.name,
                    'price': float(boost_plan.price),
                    'duration': boost_plan.duration,
                    'time_unit': boost_plan.time_unit,
                    'status': boost_plan.status,
                    'updated_at': boost_plan.updated_at.isoformat(),
                },
                'message': 'Boost plan updated successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error updating boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['delete'])
    def delete_boost_plan(self, request):
        """
        Delete a boost plan (soft delete by setting status to archived)
        """
        try:
            boost_plan_id = request.data.get('boost_plan_id')
            if not boost_plan_id:
                return Response(
                    {'success': False, 'error': 'boost_plan_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                boost_plan = BoostPlan.objects.get(id=boost_plan_id)
            except BoostPlan.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Boost plan not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if plan is being used
            active_boosts = Boost.objects.filter(boost_plan=boost_plan, status='active').count()
            if active_boosts > 0:
                return Response(
                    {'success': False, 'error': f'Cannot delete plan with {active_boosts} active boosts'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete by archiving
            boost_plan.status = 'archived'
            boost_plan.save()
            
            response_data = {
                'success': True,
                'message': 'Boost plan archived successfully'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'success': False, 'error': f'Error deleting boost plan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
             

class AdminOrders(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get order metrics and analytics data for admin dashboard"""
        try:
            # Calculate date ranges
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Calculate metrics based on Orders
            total_orders = Order.objects.count()
            completed_orders = Order.objects.filter(status='completed').count()
            pending_orders = Order.objects.filter(status='pending').count()
            cancelled_orders = Order.objects.filter(status='cancelled').count()
            
            # Calculate revenue from Orders
            revenue_data = Order.objects.filter(status='completed').aggregate(
                total_revenue=Sum('total_amount')
            )
            total_revenue = revenue_data['total_revenue'] or Decimal('0')
            
            # Today's orders
            today_orders = Order.objects.filter(
                created_at__date=today
            ).count()
            
            # Monthly orders
            monthly_orders = Order.objects.filter(
                created_at__date__gte=month_ago
            ).count()
            
            # Average order value
            avg_order_value = Decimal('0')
            if completed_orders > 0:
                avg_order_value = total_revenue / completed_orders
            
            # Success rate
            success_rate = Decimal('0')
            if total_orders > 0:
                success_rate = (completed_orders / total_orders) * 100
            
            # Compile metrics
            order_metrics = {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'completed_orders': completed_orders,
                'cancelled_orders': cancelled_orders,
                'total_revenue': float(total_revenue),
                'today_orders': today_orders,
                'monthly_orders': monthly_orders,
                'avg_order_value': float(avg_order_value),
                'success_rate': float(success_rate),
            }
            
            # Get analytics data
            analytics_data = self._get_analytics_data()
            
            # Get recent orders with related data
            recent_orders = self._get_recent_orders()
            
            return Response({
                'success': True,
                'metrics': order_metrics,
                'analytics': analytics_data,
                'orders': recent_orders
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_analytics_data(self):
        """Generate analytics data for charts"""
        # Daily orders for the past 7 days
        daily_orders = []
        today = timezone.now().date()
        
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
        
        # Status distribution
        status_distribution = []
        status_counts = Order.objects.values('status').annotate(count=Count('order'))
        
        for status_data in status_counts:
            status_distribution.append({
                'name': status_data['status'].capitalize(),
                'value': status_data['count']
            })
        
        # Payment method distribution (from Order model)
        payment_method_distribution = []
        payment_counts = Order.objects.values('payment_method').annotate(count=Count('order'))
        
        for payment_data in payment_counts:
            payment_method_distribution.append({
                'name': payment_data['payment_method'],
                'value': payment_data['count']
            })
        
        return {
            'daily_orders': daily_orders,
            'status_distribution': status_distribution,
            'payment_method_distribution': payment_method_distribution
        }
    
    def _get_recent_orders(self, limit=50):
        """Get recent orders with all related data"""
        orders = Order.objects.select_related(
            'user'
        ).prefetch_related(
            'checkout_set',
            'checkout_set__cart_item',
            'checkout_set__cart_item__product',
            'checkout_set__cart_item__product__shop',
            'checkout_set__voucher'
        ).order_by('-created_at')[:limit]
        
        order_list = []
        
        for order in orders:
            # Get all checkouts for this order
            order_checkouts = order.checkout_set.select_related(
                'cart_item',
                'cart_item__product',
                'cart_item__product__shop',
                'cart_item__user',
                'voucher'
            ).all()
            
            # Process items in the order
            items = []
            for checkout in order_checkouts:
                cart_item = checkout.cart_item
                product = cart_item.product if cart_item else None
                shop = product.shop if product else None
                user = cart_item.user if cart_item else None
                
                item_data = {
                    'id': str(checkout.id),
                    'cart_item': {
                        'id': str(cart_item.id) if cart_item else None,
                        'product': {
                            'id': str(product.id) if product else None,
                            'name': product.name if product else 'Unknown Product',
                            'price': float(product.price) if product else 0,
                            'shop': {
                                'id': str(shop.id) if shop else None,
                                'name': shop.name if shop else 'Unknown Shop'
                            }
                        },
                        'quantity': cart_item.quantity if cart_item else 0,
                        'user': {
                            'id': str(user.id) if user else None,
                            'username': user.username if user else 'Unknown User',
                            'email': user.email if user else '',
                            'first_name': user.first_name if user else '',
                            'last_name': user.last_name if user else ''
                        }
                    },
                    'quantity': checkout.quantity,
                    'total_amount': float(checkout.total_amount),
                    'status': checkout.status,
                    'remarks': checkout.remarks or '',
                }
                
                # Add voucher data if exists
                if checkout.voucher:
                    item_data['voucher'] = {
                        'id': str(checkout.voucher.id),
                        'name': checkout.voucher.name,
                        'code': checkout.voucher.code,
                        'value': float(checkout.voucher.value)
                    }
                
                items.append(item_data)
            
            order_data = {
                'order_id': str(order.order),
                'user': {
                    'id': str(order.user.id),
                    'username': order.user.username,
                    'email': order.user.email,
                    'first_name': order.user.first_name,
                    'last_name': order.user.last_name
                },
                'status': order.status,
                'total_amount': float(order.total_amount),
                'payment_method': order.payment_method,
                'delivery_address': order.delivery_address,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'updated_at': order.updated_at.isoformat() if order.updated_at else None,
                'items': items
            }
            
            order_list.append(order_data)
        
        return order_list
    
    @action(detail=False, methods=['get'])
    def get_order_details(self, request):
        """Get detailed order information"""
        order_id = request.query_params.get('order_id')
        
        if not order_id:
            return Response({
                'success': False,
                'error': 'Order ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.select_related(
                'user'
            ).prefetch_related(
                'checkout_set',
                'checkout_set__cart_item',
                'checkout_set__cart_item__product',
                'checkout_set__cart_item__product__shop',
                'checkout_set__voucher'
            ).get(order=order_id)
            
            # Process order items
            items = []
            for checkout in order.checkout_set.all():
                cart_item = checkout.cart_item
                product = cart_item.product if cart_item else None
                shop = product.shop if product else None
                user = cart_item.user if cart_item else None
                
                item_data = {
                    'id': str(checkout.id),
                    'cart_item': {
                        'id': str(cart_item.id) if cart_item else None,
                        'product': {
                            'id': str(product.id) if product else None,
                            'name': product.name if product else 'Unknown Product',
                            'description': product.description if product else '',
                            'price': float(product.price) if product else 0,
                            'quantity': product.quantity if product else 0,
                            'condition': product.condition if product else '',
                            'shop': {
                                'id': str(shop.id) if shop else None,
                                'name': shop.name if shop else 'Unknown Shop',
                                'contact_number': shop.contact_number if shop else ''
                            }
                        },
                        'quantity': cart_item.quantity if cart_item else 0,
                        'user': {
                            'id': str(user.id) if user else None,
                            'username': user.username if user else 'Unknown User',
                            'email': user.email if user else '',
                            'first_name': user.first_name if user else '',
                            'last_name': user.last_name if user else '',
                            'contact_number': user.contact_number if user else ''
                        }
                    },
                    'quantity': checkout.quantity,
                    'total_amount': float(checkout.total_amount),
                    'status': checkout.status,
                    'remarks': checkout.remarks or '',
                }
                
                if checkout.voucher:
                    item_data['voucher'] = {
                        'id': str(checkout.voucher.id),
                        'name': checkout.voucher.name,
                        'code': checkout.voucher.code,
                        'value': float(checkout.voucher.value),
                        'discount_type': checkout.voucher.discount_type
                    }
                
                items.append(item_data)
            
            order_data = {
                'order_id': str(order.order),
                'user': {
                    'id': str(order.user.id),
                    'username': order.user.username,
                    'email': order.user.email,
                    'first_name': order.user.first_name,
                    'last_name': order.user.last_name,
                    'contact_number': order.user.contact_number
                },
                'status': order.status,
                'total_amount': float(order.total_amount),
                'payment_method': order.payment_method,
                'delivery_address': order.delivery_address,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items': items
            }
            
            return Response({
                'success': True,
                'order': order_data
            })
            
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def update_order_status(self, request):
        """Update order status"""
        order_id = request.data.get('order_id')
        new_status = request.data.get('status')
        
        if not order_id or not new_status:
            return Response({
                'success': False,
                'error': 'Order ID and status are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.get(order=order_id)
            order.status = new_status
            order.save()
            
            return Response({
                'success': True,
                'message': f'Order status updated to {new_status}'
            })
            
        except Order.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def get_order_stats(self, request):
        """Get additional order statistics"""
        try:
            # Time-based statistics
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Revenue statistics
            daily_revenue = Order.objects.filter(
                status='completed',
                created_at__date=today
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            weekly_revenue = Order.objects.filter(
                status='completed',
                created_at__date__gte=week_ago
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            monthly_revenue = Order.objects.filter(
                status='completed',
                created_at__date__gte=month_ago
            ).aggregate(revenue=Sum('total_amount'))['revenue'] or Decimal('0')
            
            # Top customers by order count
            top_customers = Order.objects.values(
                'user__username',
                'user__first_name',
                'user__last_name'
            ).annotate(
                order_count=Count('order'),
                total_spent=Sum('total_amount')
            ).order_by('-total_spent')[:10]
            
            # Top products by order count (through checkouts)
            top_products = Checkout.objects.filter(
                order__isnull=False,
                cart_item__product__isnull=False
            ).values(
                'cart_item__product__name'
            ).annotate(
                order_count=Count('order', distinct=True)
            ).order_by('-order_count')[:10]
            
            stats = {
                'revenue_today': float(daily_revenue),
                'revenue_week': float(weekly_revenue),
                'revenue_month': float(monthly_revenue),
                'top_customers': list(top_customers),
                'top_products': list(top_products)
            }
            
            return Response({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminRiders(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get rider metrics and analytics data for admin dashboard"""
        try:
            # Calculate date ranges
            today = timezone.now().date()
            month_ago = today - timedelta(days=30)
            
            # Get all riders
            all_riders = Rider.objects.all()
            total_riders = all_riders.count()
            
            # Calculate rider status counts based on verification and approval
            pending_riders = all_riders.filter(verified=False, approval_date__isnull=True).count()
            approved_riders = all_riders.filter(verified=True, approval_date__isnull=False).count()
            
            # Get active riders (those with deliveries in the last 30 days)
            active_rider_ids = Delivery.objects.filter(
                created_at__date__gte=month_ago
            ).values_list('rider_id', flat=True).distinct()
            active_riders = all_riders.filter(rider_id__in=active_rider_ids).count()
            
            # Delivery statistics
            total_deliveries = Delivery.objects.count()
            completed_deliveries = Delivery.objects.filter(status='delivered').count()
            
            # Success rate
            success_rate = Decimal('0')
            if total_deliveries > 0:
                success_rate = (completed_deliveries / total_deliveries) * 100
            
            # Average rating from reviews (assuming reviews can be for riders via deliveries)
            # This would need a proper relationship between reviews and riders
            average_rating = Decimal('4.5')  # Placeholder - you'd need to implement this
            
            # Total earnings (from completed deliveries)
            # This would need a proper earnings model or calculation
            total_earnings = Decimal('0')  # Placeholder
            
            # Compile metrics
            rider_metrics = {
                'total_riders': total_riders,
                'pending_riders': pending_riders,
                'approved_riders': approved_riders,
                'active_riders': active_riders,
                'total_deliveries': total_deliveries,
                'completed_deliveries': completed_deliveries,
                'success_rate': float(success_rate),
                'average_rating': float(average_rating),
                'total_earnings': float(total_earnings),
            }
            
            # Get analytics data
            analytics_data = self._get_analytics_data()
            
            # Get riders with related data
            riders_data = self._get_riders_data()
            
            return Response({
                'success': True,
                'metrics': rider_metrics,
                'analytics': analytics_data,
                'riders': riders_data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_analytics_data(self):
        """Generate analytics data for charts"""
        today = timezone.now().date()
        
        # Rider registrations for the past 30 days
        rider_registrations = []
        for i in range(29, -1, -1):  # Last 30 days including today
            date = today - timedelta(days=i)
            count = Rider.objects.filter(
                rider__created_at__date=date
            ).count()
            
            rider_registrations.append({
                'date': date.strftime('%b %d'),
                'count': count
            })
        
        # Status distribution
        status_distribution = [
            {
                'name': 'Approved',
                'value': Rider.objects.filter(verified=True, approval_date__isnull=False).count()
            },
            {
                'name': 'Pending',
                'value': Rider.objects.filter(verified=False, approval_date__isnull=True).count()
            },
            {
                'name': 'Rejected',
                'value': Rider.objects.filter(verified=False, approval_date__isnull=False).count()
            }
        ]
        
        # Vehicle type distribution
        vehicle_type_distribution = []
        vehicle_counts = Rider.objects.exclude(vehicle_type='').values('vehicle_type').annotate(count=Count('rider'))
        
        for vehicle_data in vehicle_counts:
            vehicle_type_distribution.append({
                'name': vehicle_data['vehicle_type'],
                'value': vehicle_data['count']
            })
        
        # Performance trends (last 6 months)
        performance_trends = []
        for i in range(5, -1, -1):
            month_start = today.replace(day=1) - timedelta(days=30*i)
            month_name = month_start.strftime('%b %Y')
            
            # This would need proper implementation based on your business logic
            performance_trends.append({
                'month': month_name,
                'deliveries': Delivery.objects.filter(
                    created_at__year=month_start.year,
                    created_at__month=month_start.month
                ).count(),
                'earnings': 0,  # Placeholder - implement based on your earnings model
                'rating': 4.5   # Placeholder - implement based on your rating system
            })
        
        return {
            'rider_registrations': rider_registrations,
            'status_distribution': status_distribution,
            'vehicle_type_distribution': vehicle_type_distribution,
            'performance_trends': performance_trends
        }
    
    def _get_riders_data(self, limit=50):
        """Get riders with all related data"""
        riders = Rider.objects.select_related(
            'rider',
            'approved_by'
        ).prefetch_related(
            'delivery_set'
        ).order_by('-rider__created_at')[:limit]
        
        rider_list = []
        
        for rider in riders:
            # Calculate performance metrics for this rider
            rider_deliveries = rider.delivery_set.all()
            total_deliveries = rider_deliveries.count()
            completed_deliveries = rider_deliveries.filter(status='delivered').count()
            
            # Compute rider status based on verification and approval
            if rider.verified and rider.approval_date:
                rider_status = 'approved'
            elif not rider.verified and not rider.approval_date:
                rider_status = 'pending'
            elif not rider.verified and rider.approval_date:
                rider_status = 'rejected'
            else:
                rider_status = 'pending'
            
            rider_data = {
                'rider': {
                    'id': str(rider.rider.id),
                    'username': rider.rider.username,
                    'email': rider.rider.email,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'contact_number': rider.rider.contact_number,
                    'created_at': rider.rider.created_at.isoformat() if rider.rider.created_at else None,
                    'is_rider': rider.rider.is_rider,
                },
                'vehicle_type': rider.vehicle_type,
                'plate_number': rider.plate_number,
                'vehicle_brand': rider.vehicle_brand,
                'vehicle_model': rider.vehicle_model,
                'vehicle_image': rider.vehicle_image.url if rider.vehicle_image else None,
                'license_number': rider.license_number,
                'license_image': rider.license_image.url if rider.license_image else None,
                'verified': rider.verified,
                'approved_by': {
                    'id': str(rider.approved_by.id),
                    'username': rider.approved_by.username,
                } if rider.approved_by else None,
                'approval_date': rider.approval_date.isoformat() if rider.approval_date else None,
                # Computed fields for frontend
                'total_deliveries': total_deliveries,
                'completed_deliveries': completed_deliveries,
                'average_rating': 4.5,  # Placeholder - implement proper rating calculation
                'total_earnings': 0,    # Placeholder - implement proper earnings calculation
                'rider_status': rider_status,
            }
            
            rider_list.append(rider_data)
        
        return rider_list
    
    @action(detail=False, methods=['get'])
    def get_rider_details(self, request):
        """Get detailed rider information"""
        rider_id = request.query_params.get('rider_id')
        
        if not rider_id:
            return Response({
                'success': False,
                'error': 'Rider ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rider = Rider.objects.select_related(
                'rider',
                'approved_by'
            ).prefetch_related(
                'delivery_set',
                'delivery_set__order'
            ).get(rider_id=rider_id)
            
            # Get rider's delivery history
            deliveries = rider.delivery_set.select_related('order').all()
            delivery_history = []
            
            for delivery in deliveries:
                delivery_data = {
                    'id': str(delivery.id),
                    'order_id': str(delivery.order.order),
                    'status': delivery.status,
                    'picked_at': delivery.picked_at.isoformat() if delivery.picked_at else None,
                    'delivered_at': delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                    'created_at': delivery.created_at.isoformat(),
                }
                delivery_history.append(delivery_data)
            
            # Calculate performance metrics
            total_deliveries = deliveries.count()
            completed_deliveries = deliveries.filter(status='delivered').count()
            success_rate = (completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
            
            rider_details = {
                'rider': {
                    'id': str(rider.rider.id),
                    'username': rider.rider.username,
                    'email': rider.rider.email,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'contact_number': rider.rider.contact_number,
                    'created_at': rider.rider.created_at.isoformat(),
                    'is_rider': rider.rider.is_rider,
                },
                'vehicle_info': {
                    'type': rider.vehicle_type,
                    'plate_number': rider.plate_number,
                    'brand': rider.vehicle_brand,
                    'model': rider.vehicle_model,
                    'vehicle_image': rider.vehicle_image.url if rider.vehicle_image else None,
                },
                'license_info': {
                    'number': rider.license_number,
                    'image': rider.license_image.url if rider.license_image else None,
                },
                'verification_info': {
                    'verified': rider.verified,
                    'approved_by': rider.approved_by.username if rider.approved_by else None,
                    'approval_date': rider.approval_date.isoformat() if rider.approval_date else None,
                },
                'performance': {
                    'total_deliveries': total_deliveries,
                    'completed_deliveries': completed_deliveries,
                    'success_rate': float(success_rate),
                    'average_rating': 4.5,  # Placeholder
                    'total_earnings': 0,    # Placeholder
                },
                'delivery_history': delivery_history,
            }
            
            return Response({
                'success': True,
                'rider': rider_details
            })
            
        except Rider.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Rider not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def update_rider_status(self, request):
        """Approve or reject rider"""
        rider_id = request.data.get('rider_id')
        action_type = request.data.get('action')  # 'approve' or 'reject'
        
        if not rider_id or not action_type:
            return Response({
                'success': False,
                'error': 'Rider ID and action are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rider = Rider.objects.get(rider_id=rider_id)
            
            if action_type == 'approve':
                rider.verified = True
                rider.approval_date = timezone.now()
                rider.approved_by = request.user
                message = 'Rider approved successfully'
            elif action_type == 'reject':
                rider.verified = False
                rider.approval_date = timezone.now()
                rider.approved_by = request.user
                message = 'Rider rejected successfully'
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid action. Use "approve" or "reject"'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            rider.save()
            
            return Response({
                'success': True,
                'message': message
            })
            
        except Rider.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Rider not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def get_rider_stats(self, request):
        """Get additional rider statistics"""
        try:
            # Time-based statistics
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Delivery statistics
            weekly_deliveries = Delivery.objects.filter(
                created_at__date__gte=week_ago
            ).count()
            
            monthly_deliveries = Delivery.objects.filter(
                created_at__date__gte=month_ago
            ).count()
            
            # Top riders by delivery count
            top_riders = Rider.objects.annotate(
                delivery_count=Count('delivery'),
                completed_deliveries=Count('delivery', filter=Q(delivery__status='delivered'))
            ).filter(delivery_count__gt=0).order_by('-delivery_count')[:10]
            
            top_riders_data = []
            for rider in top_riders:
                top_riders_data.append({
                    'username': rider.rider.username,
                    'first_name': rider.rider.first_name,
                    'last_name': rider.rider.last_name,
                    'delivery_count': rider.delivery_count,
                    'completed_deliveries': rider.completed_deliveries,
                    'success_rate': (rider.completed_deliveries / rider.delivery_count * 100) if rider.delivery_count > 0 else 0
                })
            
            # Vehicle type statistics
            vehicle_stats = Rider.objects.exclude(vehicle_type='').values('vehicle_type').annotate(
                count=Count('rider'),
                active_count=Count('rider', filter=Q(delivery__created_at__date__gte=month_ago))
            )
            
            stats = {
                'weekly_deliveries': weekly_deliveries,
                'monthly_deliveries': monthly_deliveries,
                'top_riders': top_riders_data,
                'vehicle_stats': list(vehicle_stats)
            }
            
            return Response({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminVouchers(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get voucher metrics for admin dashboard
        """
        try:
            # Calculate total vouchers
            total_vouchers = Voucher.objects.count()
            
            # Calculate active vouchers (is_active=True and not expired)
            now = timezone.now().date()
            active_vouchers = Voucher.objects.filter(
                is_active=True,
                valid_until__gte=now
            ).count()
            
            # Calculate expired vouchers
            expired_vouchers = Voucher.objects.filter(
                valid_until__lt=now
            ).count()
            
            # Calculate total usage from Checkout model
            total_usage = Checkout.objects.filter(
                voucher__isnull=False
            ).count()
            
            # Calculate total discount amount
            # This would need to be calculated based on actual usage
            # For now, we'll use a placeholder calculation
            total_discount = Checkout.objects.filter(
                voucher__isnull=False
            ).aggregate(
                total_discount=Sum('voucher__value')
            )['total_discount'] or 0
            
            metrics = {
                'total_vouchers': total_vouchers,
                'active_vouchers': active_vouchers,
                'expired_vouchers': expired_vouchers,
                'total_usage': total_usage,
                'total_discount': float(total_discount),
            }
            
            return Response({
                'success': True,
                'metrics': metrics
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def vouchers_list(self, request):
        """
        Get paginated list of vouchers with all required fields
        """
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            search = request.GET.get('search', '')
            status_filter = request.GET.get('status', '')
            discount_type = request.GET.get('discount_type', '')
            shop_filter = request.GET.get('shop', '')
            
            # Start with all vouchers
            vouchers_qs = Voucher.objects.select_related(
                'shop', 'created_by'
            ).prefetch_related(
                'checkout_set'
            ).all()
            
            # Apply search filter
            if search:
                vouchers_qs = vouchers_qs.filter(
                    Q(name__icontains=search) |
                    Q(code__icontains=search)
                )
            
            # Apply status filter
            now = timezone.now().date()
            if status_filter:
                if status_filter == 'active':
                    vouchers_qs = vouchers_qs.filter(
                        is_active=True,
                        valid_until__gte=now
                    )
                elif status_filter == 'expired':
                    vouchers_qs = vouchers_qs.filter(
                        valid_until__lt=now
                    )
                elif status_filter == 'scheduled':
                    vouchers_qs = vouchers_qs.filter(
                        is_active=False,
                        valid_until__gte=now
                    )
            
            # Apply discount type filter
            if discount_type:
                vouchers_qs = vouchers_qs.filter(discount_type=discount_type)
            
            # Apply shop filter
            if shop_filter:
                if shop_filter == 'Global':
                    vouchers_qs = vouchers_qs.filter(shop__isnull=True)
                else:
                    vouchers_qs = vouchers_qs.filter(shop__name=shop_filter)
            
            # Calculate total count before pagination
            total_count = vouchers_qs.count()
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            vouchers_page = vouchers_qs[start_index:end_index]
            
            # Serialize voucher data
            vouchers_data = []
            for voucher in vouchers_page:
                # Calculate usage count for this voucher
                usage_count = voucher.checkout_set.count()
                
                # Get shop data if exists
                shop_data = None
                if voucher.shop:
                    shop_data = {
                        'id': str(voucher.shop.id),
                        'name': voucher.shop.name
                    }
                
                # Get created_by data if exists
                created_by_data = None
                if voucher.created_by:
                    created_by_data = {
                        'id': str(voucher.created_by.id),
                        'username': voucher.created_by.username,
                        'first_name': voucher.created_by.first_name,
                        'last_name': voucher.created_by.last_name
                    }
                
                # Determine status
                status_value = 'active'
                if not voucher.is_active:
                    if voucher.valid_until >= now:
                        status_value = 'scheduled'
                    else:
                        status_value = 'expired'
                elif voucher.valid_until < now:
                    status_value = 'expired'
                
                voucher_data = {
                    'id': str(voucher.id),
                    'name': voucher.name,
                    'code': voucher.code,
                    'shop': shop_data,
                    'discount_type': voucher.discount_type,
                    'value': float(voucher.value),
                    'minimum_spend': float(voucher.minimum_spend),
                    'maximum_usage': voucher.maximum_usage,
                    'valid_until': voucher.valid_until.isoformat(),
                    'added_at': voucher.added_at.isoformat(),
                    'created_by': created_by_data,
                    'is_active': voucher.is_active,
                    'usage_count': usage_count,
                    'status': status_value,
                    'shopName': shop_data['name'] if shop_data else 'Global'
                }
                vouchers_data.append(voucher_data)
            
            # Get filter options for frontend
            filter_options = {
                'discount_types': list(Voucher.objects.values_list('discount_type', flat=True).distinct()),
                'shops': list(Shop.objects.values_list('name', flat=True).distinct()),
                'statuses': ['active', 'expired', 'scheduled']
            }
            
            return Response({
                'success': True,
                'vouchers': vouchers_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                },
                'filter_options': filter_options
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle voucher active status
        """
        try:
            voucher = Voucher.objects.get(id=pk)
            voucher.is_active = not voucher.is_active
            voucher.save()
            
            return Response({
                'success': True,
                'is_active': voucher.is_active,
                'message': f'Voucher {"activated" if voucher.is_active else "deactivated"} successfully'
            })
            
        except Voucher.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Voucher not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def delete_voucher(self, request, pk=None):
        """
        Delete a voucher
        """
        try:
            voucher = Voucher.objects.get(id=pk)
            voucher_name = voucher.name
            voucher.delete()
            
            return Response({
                'success': True,
                'message': f'Voucher "{voucher_name}" deleted successfully'
            })
            
        except Voucher.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Voucher not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Perform bulk actions on vouchers
        """
        try:
            voucher_ids = request.data.get('voucher_ids', [])
            action_type = request.data.get('action', '')
            
            if not voucher_ids:
                return Response({
                    'success': False,
                    'error': 'No vouchers selected'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            vouchers = Voucher.objects.filter(id__in=voucher_ids)
            
            if action_type == 'activate':
                vouchers.update(is_active=True)
                message = f'{vouchers.count()} vouchers activated successfully'
            elif action_type == 'deactivate':
                vouchers.update(is_active=False)
                message = f'{vouchers.count()} vouchers deactivated successfully'
            elif action_type == 'delete':
                count = vouchers.count()
                vouchers.delete()
                message = f'{count} vouchers deleted successfully'
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': message
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
  
class AdminRefunds(viewsets.ViewSet):    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get refund metrics for admin dashboard"""
        try:
            # Calculate all metrics with proper model relationships
            refunds_queryset = Refund.objects.select_related(
                'order', 
                'requested_by', 
                'processed_by'
            )
            
            # Total counts by status
            status_counts = refunds_queryset.values('status').annotate(
                count=Count('refund')
            )
            
            status_count_map = {item['status']: item['count'] for item in status_counts}
            
            # Total refund amount (only approved/completed refunds)
            total_refund_amount = refunds_queryset.filter(
                status__in=['approved', 'completed']
            ).aggregate(
                total_amount=Sum('order__total_amount')
            )['total_amount'] or Decimal('0.00')
            
            # Average processing time in hours (for completed refunds)
            completed_refunds = refunds_queryset.filter(
                status='completed',
                processed_at__isnull=False,
                requested_at__isnull=False
            )
            
            if completed_refunds.exists():
                total_seconds = sum(
                    (refund.processed_at - refund.requested_at).total_seconds()
                    for refund in completed_refunds
                )
                avg_processing_hours = total_seconds / (len(completed_refunds) * 3600)
            else:
                avg_processing_hours = Decimal('0.00')
            
            # Most common reason (excluding empty reasons)
            common_reason = refunds_queryset.exclude(
                Q(reason__isnull=True) | Q(reason__exact='')
            ).values('reason').annotate(
                count=Count('refund')
            ).order_by('-count').first()
            
            # This month's refunds
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            refunds_this_month = refunds_queryset.filter(
                requested_at__month=current_month,
                requested_at__year=current_year
            ).count()
            
            # Average refund amount
            avg_refund_amount = refunds_queryset.filter(
                status__in=['approved', 'completed']
            ).aggregate(
                avg_amount=Avg('order__total_amount')
            )['avg_amount'] or Decimal('0.00')
            
            metrics = {
                'total_refunds': refunds_queryset.count(),
                'pending_refunds': status_count_map.get('pending', 0),
                'approved_refunds': status_count_map.get('approved', 0),
                'rejected_refunds': status_count_map.get('rejected', 0),
                'waiting_refunds': status_count_map.get('waiting', 0),
                'to_process_refunds': status_count_map.get('to process', 0),
                'completed_refunds': status_count_map.get('completed', 0),
                'total_refund_amount': float(total_refund_amount),
                'avg_processing_time_hours': round(float(avg_processing_hours), 1),
                'most_common_reason': common_reason['reason'] if common_reason else "No refunds available",
                'refunds_this_month': refunds_this_month,
                'avg_refund_amount': round(float(avg_refund_amount), 2),
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Metrics error: {str(e)}")  # Debug print
            return Response(
                {
                    'error': f'Model access error: {str(e)}',
                    'model_check': 'Refund model may not be properly defined or imported',
                    'fallback_metrics': {
                        'total_refunds': 0,
                        'pending_refunds': 0,
                        'approved_refunds': 0,
                        'rejected_refunds': 0,
                        'waiting_refunds': 0,
                        'to_process_refunds': 0,
                        'completed_refunds': 0,
                        'total_refund_amount': 0.0,
                        'avg_processing_time_hours': 0.0,
                        'most_common_reason': "System configuration issue",
                        'refunds_this_month': 0,
                        'avg_refund_amount': 0.0,
                    }
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'])
    def get_analytics(self, request):
        """Get analytics data for charts"""
        try:
            # Use the correct model reference (based on which solution you chose)
            # If you used Solution 1 (explicit imports), use Refund
            # If you used Solution 2 (alias), use RefundModel
            
            # Status distribution - ACTUALLY QUERY THE DATABASE
            status_distribution = Refund.objects.values('status').annotate(
                count=Count('refund')
            ).order_by('status')
            
            total_refunds = sum(item['count'] for item in status_distribution)
            
            status_data = []
            for item in status_distribution:
                percentage = (item['count'] / total_refunds * 100) if total_refunds > 0 else 0
                status_data.append({
                    'status': item['status'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Monthly trend data (last 12 months)
            from django.db.models.functions import TruncMonth
            from datetime import timedelta
            
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            monthly_data = Refund.objects.filter(
                requested_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('requested_at')
            ).values('month').annotate(
                requested=Count('refund'),
                processed=Count('refund', filter=Q(status__in=['completed', 'approved']))
            ).order_by('month')
            
            monthly_trend = []
            for item in monthly_data:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'requested': item['requested'],
                    'processed': item['processed'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Refund reasons (top 10)
            refund_reasons = Refund.objects.exclude(
                Q(reason__isnull=True) | Q(reason__exact='')
            ).values('reason').annotate(
                count=Count('refund')
            ).order_by('-count')[:10]
            
            total_with_reasons = sum(item['count'] for item in refund_reasons)
            
            reasons_data = []
            for item in refund_reasons:
                percentage = (item['count'] / total_with_reasons * 100) if total_with_reasons > 0 else 0
                reasons_data.append({
                    'reason': item['reason'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Refund methods distribution
            refund_methods = Refund.objects.exclude(
                Q(preferred_refund_method__isnull=True) | 
                Q(preferred_refund_method__exact='')
            ).values('preferred_refund_method').annotate(
                count=Count('refund')
            ).order_by('-count')
            
            total_with_methods = sum(item['count'] for item in refund_methods)
            
            methods_data = []
            for item in refund_methods:
                percentage = (item['count'] / total_with_methods * 100) if total_with_methods > 0 else 0
                methods_data.append({
                    'method': item['preferred_refund_method'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            analytics_data = {
                'status_distribution': status_data,
                'monthly_trend_data': monthly_trend,
                'refund_reasons': reasons_data,
                'refund_methods': methods_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Analytics error: {str(e)}")  # Debug print
            # Return fallback data with error info
            return Response(
                {
                    'error': f'Analytics error: {str(e)}',
                    'fallback_data': {
                        'status_distribution': [
                            {'status': 'pending', 'count': 0, 'percentage': 0},
                            {'status': 'approved', 'count': 0, 'percentage': 0},
                            {'status': 'rejected', 'count': 0, 'percentage': 0},
                            {'status': 'waiting', 'count': 0, 'percentage': 0},
                            {'status': 'to process', 'count': 0, 'percentage': 0},
                            {'status': 'completed', 'count': 0, 'percentage': 0}
                        ],
                        'monthly_trend_data': [],
                        'refund_reasons': [],
                        'refund_methods': []
                    }
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def refund_list(self, request):
        """Simple refund list endpoint"""
        try:
            # Return empty array if models work but no data
            refunds_data = []
            
            # Try to get actual data if models are accessible
            if hasattr(Refund, 'objects'):
                refunds = Refund.objects.all()
                for refund in refunds:
                    refunds_data.append({
                        'refund': str(refund.refund),
                        'order_id': str(refund.order.order) if refund.order else 'N/A',
                        'order_total_amount': float(refund.order.total_amount) if refund.order else 0.0,
                        'requested_by_username': refund.requested_by.username if refund.requested_by else 'Unknown',
                        'status': refund.status or 'pending',
                        'requested_at': refund.requested_at.isoformat() if refund.requested_at else None,
                        'reason': refund.reason or 'No reason provided',
                    })
            
            return Response(refunds_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Refund list error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class AdminUsers(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get user metrics for admin dashboard"""
        try:
            # Calculate today's date for new users calculation
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            # Get base queryset
            users_queryset = User.objects.all()
            
            # Calculate metrics using actual model fields
            total_users = users_queryset.count()
            
            # Count users by role using the actual boolean fields
            total_customers = users_queryset.filter(is_customer=True).count()
            total_riders = users_queryset.filter(is_rider=True).count()
            total_moderators = users_queryset.filter(is_moderator=True).count()
            total_admins = users_queryset.filter(is_admin=True).count()
            
            # New users today
            new_users_today = users_queryset.filter(created_at__gte=today_start).count()
            
            # Profile completion metrics
            users_with_complete_profile = users_queryset.filter(
                Q(username__isnull=False) & ~Q(username=''),
                Q(email__isnull=False) & ~Q(email=''),
                Q(contact_number__isnull=False) & ~Q(contact_number=''),
                registration_stage=5
            ).count()
            
            users_with_incomplete_profile = total_users - users_with_complete_profile
            
            # Average registration stage
            avg_registration_stage = users_queryset.aggregate(
                avg_stage=Avg('registration_stage')
            )['avg_stage'] or 0
            
            # Most common city
            most_common_city_data = users_queryset.exclude(
                Q(city__isnull=True) | Q(city='')
            ).values('city').annotate(
                count=Count('id')
            ).order_by('-count').first()
            
            most_common_city = most_common_city_data['city'] if most_common_city_data else "No data"
            
            metrics = {
                'total_users': total_users,
                'total_customers': total_customers,
                'total_riders': total_riders,
                'total_moderators': total_moderators,
                'total_admins': total_admins,
                'new_users_today': new_users_today,
                'users_with_complete_profile': users_with_complete_profile,
                'users_with_incomplete_profile': users_with_incomplete_profile,
                'avg_registration_stage': round(float(avg_registration_stage), 1),
                'most_common_city': most_common_city,
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating user metrics: {str(e)}")
            return Response(
                {'error': f'Error calculating metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_analytics(self, request):
        """Get analytics data for charts"""
        try:
            # Role distribution based on actual boolean fields
            role_distribution = []
            total_users = User.objects.count()
            
            if total_users > 0:
                # Count users for each role (users can have multiple roles)
                customer_count = User.objects.filter(is_customer=True).count()
                rider_count = User.objects.filter(is_rider=True).count()
                moderator_count = User.objects.filter(is_moderator=True).count()
                admin_count = User.objects.filter(is_admin=True).count()
                
                # Count incomplete profiles (no roles assigned and low registration stage)
                incomplete_count = User.objects.filter(
                    is_customer=False,
                    is_rider=False, 
                    is_moderator=False,
                    is_admin=False,
                    registration_stage__lt=3
                ).count()
                
                role_distribution = [
                    {
                        'role': 'Customers',
                        'count': customer_count,
                        'percentage': round((customer_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Riders', 
                        'count': rider_count,
                        'percentage': round((rider_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Moderators',
                        'count': moderator_count, 
                        'percentage': round((moderator_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Admins',
                        'count': admin_count,
                        'percentage': round((admin_count / total_users) * 100, 1)
                    },
                    {
                        'role': 'Incomplete',
                        'count': incomplete_count,
                        'percentage': round((incomplete_count / total_users) * 100, 1)
                    }
                ]
            
            # Registration trend (last 12 months)
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            registration_trend = User.objects.filter(
                created_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_users=Count('id')
            ).order_by('month')
            
            monthly_trend = []
            for item in registration_trend:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'new_users': item['new_users'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Location distribution
            location_distribution = User.objects.exclude(
                Q(city__isnull=True) | Q(city='')
            ).values('city').annotate(
                count=Count('id')
            ).order_by('-count')[:6]  # Top 6 cities
            
            total_with_location = sum(item['count'] for item in location_distribution)
            
            location_data = []
            for item in location_distribution:
                percentage = (item['count'] / total_with_location * 100) if total_with_location > 0 else 0
                location_data.append({
                    'city': item['city'],
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # Registration stage distribution
            stage_distribution = User.objects.values('registration_stage').annotate(
                count=Count('id')
            ).order_by('registration_stage')
            
            stage_data = []
            for item in stage_distribution:
                stage = item['registration_stage'] or 0
                stage_label = self._get_stage_label(stage)
                percentage = (item['count'] / total_users * 100) if total_users > 0 else 0
                stage_data.append({
                    'stage': stage_label,
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            analytics_data = {
                'role_distribution': role_distribution,
                'registration_trend': monthly_trend,
                'location_distribution': location_data,
                'registration_stage_distribution': stage_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating user analytics: {str(e)}")
            return Response(
                {'error': f'Error generating analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def users_list(self, request):
        """Get paginated list of users with related data"""
        try:
            
            # Get query parameters
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            user_type = request.query_params.get('user_type')
            status_filter = request.query_params.get('status')
            search = request.query_params.get('search')
            
            # Build queryset with all necessary relationships
            users_queryset = User.objects.select_related().prefetch_related(
                Prefetch('customer', queryset=Customer.objects.all()),
                Prefetch('rider', queryset=Rider.objects.all()),
                Prefetch('moderator', queryset=Moderator.objects.all()),
                Prefetch('admin', queryset=Admin.objects.all())
            ).order_by('-created_at')
            
            # Apply filters
            if user_type:
                if user_type.lower() == 'customer':
                    users_queryset = users_queryset.filter(is_customer=True)
                elif user_type.lower() == 'rider':
                    users_queryset = users_queryset.filter(is_rider=True)
                elif user_type.lower() == 'moderator':
                    users_queryset = users_queryset.filter(is_moderator=True)
                elif user_type.lower() == 'admin':
                    users_queryset = users_queryset.filter(is_admin=True)
            
            if status_filter:
                if status_filter.lower() == 'active':
                    users_queryset = users_queryset.filter(
                        registration_stage__gte=3,
                        updated_at__gte=timezone.now() - timedelta(days=30)
                    )
                elif status_filter.lower() == 'inactive':
                    users_queryset = users_queryset.filter(
                        Q(registration_stage__lt=3) | 
                        Q(updated_at__lt=timezone.now() - timedelta(days=30))
                    )
            
            if search:
                users_queryset = users_queryset.filter(
                    Q(username__icontains=search) |
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            total_count = users_queryset.count()
            users_page = users_queryset[start_index:end_index]
            
            # Serialize data with all model fields
            users_data = []
            for user in users_page:
                user_data = {
                    # Core User model fields
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'password': user.password,  # Included but should be handled securely in production
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'middle_name': user.middle_name,
                    'contact_number': user.contact_number,
                    'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                    'age': user.age,
                    'sex': user.sex,
                    'street': user.street,
                    'barangay': user.barangay,
                    'city': user.city,
                    'province': user.province,
                    'state': user.state,
                    'zip_code': user.zip_code,
                    'country': user.country,
                    'is_admin': user.is_admin,
                    'is_customer': user.is_customer,
                    'is_moderator': user.is_moderator,
                    'is_rider': user.is_rider,
                    'registration_stage': user.registration_stage,
                    'created_at': user.created_at.isoformat(),
                    'updated_at': user.updated_at.isoformat(),
                    
                    # Related model data
                    'customer_data': None,
                    'rider_data': None,
                    'moderator_data': None,
                    'admin_data': None,
                }
                
                # Add customer data if exists
                if hasattr(user, 'customer'):
                    user_data['customer_data'] = {
                        'product_limit': user.customer.product_limit,
                        'current_product_count': user.customer.current_product_count
                    }
                
                # Add rider data if exists
                if hasattr(user, 'rider'):
                    user_data['rider_data'] = {
                        'vehicle_type': user.rider.vehicle_type,
                        'plate_number': user.rider.plate_number,
                        'vehicle_brand': user.rider.vehicle_brand,
                        'vehicle_model': user.rider.vehicle_model,
                        'license_number': user.rider.license_number,
                        'verified': user.rider.verified
                    }
                
                # Add moderator data if exists
                if hasattr(user, 'moderator'):
                    user_data['moderator_data'] = {
                        # Add moderator specific fields if needed
                    }
                
                # Add admin data if exists
                if hasattr(user, 'admin'):
                    user_data['admin_data'] = {
                        # Add admin specific fields if needed
                    }
                
                users_data.append(user_data)
            
            response_data = {
                'results': users_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': end_index < total_count,
                    'has_previous': page > 1
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error fetching user list: {str(e)}")
            return Response(
                {'error': f'Error fetching user list: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_stage_label(self, stage):
        """Helper method to get registration stage label"""
        if not stage:
            return 'Not Started'
        stages = {
            1: 'Started',
            2: 'Basic Info', 
            3: 'Address',
            4: 'Verification',
            5: 'Complete'
        }
        return stages.get(stage, f'Stage {stage}')

class AdminTeam(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_team_metrics(self, request):
        """Get team metrics for admin dashboard"""
        try:
            # Calculate today's date for new team members
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            
            # Get team members (admins and moderators only)
            team_queryset = User.objects.filter(Q(is_admin=True) | Q(is_moderator=True))
            
            # Calculate metrics
            total_team_members = team_queryset.count()
            total_admins = team_queryset.filter(is_admin=True).count()
            total_moderators = team_queryset.filter(is_moderator=True).count()
            
            # New team members today
            new_team_members_today = team_queryset.filter(created_at__gte=today_start).count()
            
            # Active team members (based on recent activity and registration stage)
            active_team_members = team_queryset.filter(
                registration_stage__gte=3,
                updated_at__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            inactive_team_members = total_team_members - active_team_members
            
            # Average registration stage
            avg_registration_stage = team_queryset.aggregate(
                avg_stage=Avg('registration_stage')
            )['avg_stage'] or 0
            
            # Pending moderator approvals
            pending_moderator_approvals = Moderator.objects.filter(
                approval_status='pending'
            ).count()
            
            metrics = {
                'total_team_members': total_team_members,
                'total_admins': total_admins,
                'total_moderators': total_moderators,
                'new_team_members_today': new_team_members_today,
                'active_team_members': active_team_members,
                'inactive_team_members': inactive_team_members,
                'avg_registration_stage': round(float(avg_registration_stage), 1),
                'pending_moderator_approvals': pending_moderator_approvals,
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating team metrics: {str(e)}")
            return Response(
                {'error': f'Error calculating team metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_team_analytics(self, request):
        """Get analytics data for team charts"""
        try:
            # Team role distribution
            total_team_members = User.objects.filter(Q(is_admin=True) | Q(is_moderator=True)).count()
            
            role_distribution = []
            if total_team_members > 0:
                admin_count = User.objects.filter(is_admin=True).count()
                moderator_count = User.objects.filter(is_moderator=True).count()
                
                role_distribution = [
                    {
                        'role': 'Admins',
                        'count': admin_count,
                        'percentage': round((admin_count / total_team_members) * 100, 1)
                    },
                    {
                        'role': 'Moderators',
                        'count': moderator_count,
                        'percentage': round((moderator_count / total_team_members) * 100, 1)
                    }
                ]
            
            # Registration trend (last 12 months for team members)
            twelve_months_ago = timezone.now() - timedelta(days=365)
            
            registration_trend = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True),
                created_at__gte=twelve_months_ago
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                new_members=Count('id')
            ).order_by('month')
            
            monthly_trend = []
            for item in registration_trend:
                monthly_trend.append({
                    'month': item['month'].strftime('%b %Y'),
                    'new_members': item['new_members'],
                    'full_month': item['month'].strftime('%B %Y')
                })
            
            # Approval status distribution for moderators
            approval_status_distribution = Moderator.objects.values('approval_status').annotate(
                count=Count('moderator')
            ).order_by('approval_status')
            
            approval_data = []
            for item in approval_status_distribution:
                # Safely get the approval_status with a default value
                approval_status = item.get('approval_status', 'unknown')
                status_label = approval_status.capitalize() if approval_status != 'unknown' else 'Unknown'
                
                # Calculate percentage safely
                total_moderators = Moderator.objects.count()
                percentage = (item['count'] / total_moderators * 100) if total_moderators > 0 else 0
                
                approval_data.append({
                    'status': status_label,
                    'count': item['count'],
                    'percentage': round(percentage, 1)
                })
            
            # If no moderator records exist, provide default approval data
            if not approval_data:
                approval_data = [
                    {
                        'status': 'Pending',
                        'count': 0,
                        'percentage': 0.0
                    },
                    {
                        'status': 'Approved', 
                        'count': 0,
                        'percentage': 0.0
                    },
                    {
                        'status': 'Rejected',
                        'count': 0,
                        'percentage': 0.0
                    }
                ]
            
            # Activity distribution
            active_members = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True),
                registration_stage__gte=3,
                updated_at__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            inactive_members = total_team_members - active_members
            
            activity_data = [
                {
                    'status': 'Active',
                    'count': active_members,
                    'percentage': round((active_members / total_team_members * 100), 1) if total_team_members > 0 else 0
                },
                {
                    'status': 'Inactive',
                    'count': inactive_members,
                    'percentage': round((inactive_members / total_team_members * 100), 1) if total_team_members > 0 else 0
                }
            ]
            
            analytics_data = {
                'role_distribution': role_distribution,
                'registration_trend': monthly_trend,
                'approval_status_distribution': approval_data,
                'activity_distribution': activity_data
            }
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating team analytics: {str(e)}")
            return Response(
                {'error': f'Error generating team analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def team_list(self, request):
        """Get paginated list of team members (admins and moderators)"""
        try:
            # Get query parameters
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            role_filter = request.query_params.get('role')
            status_filter = request.query_params.get('status')
            approval_filter = request.query_params.get('approval_status')
            search = request.query_params.get('search')
            
            # Build queryset for team members only (admins and moderators)
            team_queryset = User.objects.filter(
                Q(is_admin=True) | Q(is_moderator=True)
            ).select_related().prefetch_related(
                Prefetch('moderator', queryset=Moderator.objects.all()),
                Prefetch('admin', queryset=Admin.objects.all())
            ).order_by('-created_at')
            
            # Apply filters
            if role_filter:
                if role_filter.lower() == 'admin':
                    team_queryset = team_queryset.filter(is_admin=True)
                elif role_filter.lower() == 'moderator':
                    team_queryset = team_queryset.filter(is_moderator=True)
            
            if status_filter:
                if status_filter.lower() == 'active':
                    team_queryset = team_queryset.filter(
                        registration_stage__gte=3,
                        updated_at__gte=timezone.now() - timedelta(days=30)
                    )
                elif status_filter.lower() == 'inactive':
                    team_queryset = team_queryset.filter(
                        Q(registration_stage__lt=3) | 
                        Q(updated_at__lt=timezone.now() - timedelta(days=30))
                    )
            
            if approval_filter:
                if approval_filter.lower() in ['pending', 'approved', 'rejected']:
                    team_queryset = team_queryset.filter(
                        moderator__approval_status=approval_filter.lower()
                    )
            
            if search:
                team_queryset = team_queryset.filter(
                    Q(username__icontains=search) |
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            
            # Pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            total_count = team_queryset.count()
            team_page = team_queryset[start_index:end_index]
            
            # Serialize data
            team_data = []
            for user in team_page:
                user_data = {
                    # Core User model fields
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'password': user.password,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'middle_name': user.middle_name,
                    'contact_number': user.contact_number,
                    'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                    'age': user.age,
                    'sex': user.sex,
                    'street': user.street,
                    'barangay': user.barangay,
                    'city': user.city,
                    'province': user.province,
                    'state': user.state,
                    'zip_code': user.zip_code,
                    'country': user.country,
                    'is_admin': user.is_admin,
                    'is_customer': user.is_customer,
                    'is_moderator': user.is_moderator,
                    'is_rider': user.is_rider,
                    'registration_stage': user.registration_stage,
                    'created_at': user.created_at.isoformat(),
                    'updated_at': user.updated_at.isoformat(),
                    
                    # Related model data
                    'moderator_data': None,
                    'admin_data': None,
                }
                
                # Add moderator data if exists
                if hasattr(user, 'moderator'):
                    user_data['moderator_data'] = {
                        'approval_status': user.moderator.approval_status
                    }
                
                # Add admin data if exists
                if hasattr(user, 'admin'):
                    user_data['admin_data'] = {
                        # Add admin specific fields if needed
                    }
                
                team_data.append(user_data)
            
            response_data = {
                'results': team_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                    'has_next': end_index < total_count,
                    'has_previous': page > 1
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error fetching team list: {str(e)}")
            return Response(
                {'error': f'Error fetching team list: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminReports(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """Get report metrics for admin dashboard"""
        try:
            # Calculate basic metrics
            total_reports = Report.objects.count()
            pending_reports = Report.objects.filter(status='pending').count()
            under_review_reports = Report.objects.filter(status='under_review').count()
            resolved_reports = Report.objects.filter(status='resolved').count()
            dismissed_reports = Report.objects.filter(status='dismissed').count()
            action_taken_reports = Report.objects.filter(status='action_taken').count()
            
            # Calculate reports by type
            accounts_reported = Report.objects.filter(report_type='account').count()
            products_reported = Report.objects.filter(report_type='product').count()
            shops_reported = Report.objects.filter(report_type='shop').count()
            
            # Calculate weekly resolution rate
            week_ago = timezone.now() - timedelta(days=7)
            reports_this_week = Report.objects.filter(created_at__gte=week_ago).count()
            resolved_this_week = Report.objects.filter(
                resolved_at__gte=week_ago,
                status__in=['resolved', 'action_taken']
            ).count()
            
            resolution_rate = 0
            if reports_this_week > 0:
                resolution_rate = round((resolved_this_week / reports_this_week) * 100, 1)
            
            # Calculate average resolution time (in days)
            resolved_reports_with_date = Report.objects.filter(
                status__in=['resolved', 'action_taken'],
                resolved_at__isnull=False
            )
            total_resolution_time = 0
            count_with_resolution = 0
            
            for report in resolved_reports_with_date:
                if report.resolved_at and report.created_at:
                    resolution_time = (report.resolved_at - report.created_at).total_seconds() / (24 * 3600)  # Convert to days
                    total_resolution_time += resolution_time
                    count_with_resolution += 1
            
            avg_resolution_time = round(total_resolution_time / count_with_resolution, 1) if count_with_resolution > 0 else 0

            metrics = {
                'total_reports': total_reports,
                'pending_reports': pending_reports + under_review_reports,  # Combine pending and under_review for UI
                'resolved_this_week': resolved_this_week,
                'resolution_rate': resolution_rate,
                'avg_resolution_time': avg_resolution_time,
                'accounts_reported': accounts_reported,
                'products_reported': products_reported,
                'shops_reported': shops_reported,
                'detailed_status': {
                    'pending': pending_reports,
                    'under_review': under_review_reports,
                    'resolved': resolved_reports,
                    'dismissed': dismissed_reports,
                    'action_taken': action_taken_reports,
                }
            }
            
            return Response(metrics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error calculating report metrics: {str(e)}")
            return Response(
                {'error': f'Error calculating report metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])        
    def get_analytics(self, request):
        """Get analytics data for charts and graphs"""
        try:
            # Reports by type for pie chart
            reports_by_type = Report.objects.values('report_type').annotate(
                count=Count('id')
            ).order_by('-count')
            
            total_reports = Report.objects.count()
            reports_type_data = []
            for item in reports_by_type:
                percentage = round((item['count'] / total_reports) * 100) if total_reports > 0 else 0
                reports_type_data.append({
                    'type': item['report_type'].title(),
                    'count': item['count'],
                    'percentage': percentage
                })

            # Reports trend over time (last 6 months)
            six_months_ago = timezone.now() - timedelta(days=180)
            monthly_reports = Report.objects.filter(
                created_at__gte=six_months_ago
            ).extra({
                'month': "EXTRACT(month FROM created_at)",
                'year': "EXTRACT(year FROM created_at)"
            }).values('month', 'year').annotate(
                new_reports=Count('id'),
                resolved=Count('id', filter=Q(status__in=['resolved', 'action_taken'])),
                pending=Count('id', filter=Q(status__in=['pending', 'under_review']))
            ).order_by('year', 'month')
            
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            reports_trend_data = []
            for item in monthly_reports:
                month_name = month_names[int(item['month']) - 1]
                full_month = f"{month_name} {int(item['year'])}"
                reports_trend_data.append({
                    'date': month_name,
                    'full_month': full_month,
                    'new_reports': item['new_reports'],
                    'resolved': item['resolved'],
                    'pending': item['pending']
                })

            # Top reporting reasons
            top_reasons = Report.objects.values('reason').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            
            top_reasons_data = []
            for item in top_reasons:
                # Get the most common type for this reason
                common_type = Report.objects.filter(reason=item['reason']).values(
                    'report_type'
                ).annotate(
                    type_count=Count('id')
                ).order_by('-type_count').first()
                
                top_reasons_data.append({
                    'reason': item['reason'].replace('_', ' ').title(),
                    'count': item['count'],
                    'type': common_type['report_type'].title() if common_type else 'All'
                })

            analytics = {
                'reports_by_type': reports_type_data,
                'reports_trend': reports_trend_data,
                'top_reasons': top_reasons_data,
            }
            
            return Response(analytics, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating analytics: {str(e)}")
            return Response(
                {'error': f'Error generating analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def reports_list(self, request):
        """Get paginated list of reports with filtering and search"""
        try:
            # Get query parameters
            report_type = request.GET.get('type', None)
            status_filter = request.GET.get('status', None)
            search = request.GET.get('search', None)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            
            # Start with all reports
            reports = Report.objects.select_related(
                'reporter',
                'reported_account',
                'reported_product',
                'reported_shop',
                'assigned_moderator'
            ).prefetch_related('media', 'action', 'comments').all()
            
            # Apply filters
            if report_type and report_type != 'all':
                reports = reports.filter(report_type=report_type)
                
            if status_filter and status_filter != 'all':
                reports = reports.filter(status=status_filter)
                
            if search:
                reports = reports.filter(
                    Q(reported_account__username__icontains=search) |
                    Q(reported_product__name__icontains=search) |
                    Q(reported_shop__name__icontains=search) |
                    Q(reason__icontains=search) |
                    Q(description__icontains=search)
                )
            
            # Calculate pagination
            total_count = reports.count()
            total_pages = (total_count + page_size - 1) // page_size
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            # Get paginated results
            paginated_reports = reports.order_by('-created_at')[start_index:end_index]
            
            # Transform data for frontend
            reports_data = []
            for report in paginated_reports:
                report_data = {
                    'id': str(report.id),
                    'report_type': report.report_type,
                    'reason': report.reason,
                    'description': report.description,
                    'status': report.status,
                    'reporter_username': report.reporter.username if report.reporter else 'Unknown',
                    'created_at': report.created_at.isoformat(),
                    'updated_at': report.updated_at.isoformat(),
                    'resolved_at': report.resolved_at.isoformat() if report.resolved_at else None,
                    'assigned_moderator': report.assigned_moderator.username if report.assigned_moderator else None,
                }
                
                # Add type-specific data
                if report.report_type == 'account' and report.reported_account:
                    report_data.update({
                        'reported_object': {
                            'id': str(report.reported_account.id),
                            'username': report.reported_account.username,
                            'email': report.reported_account.email,
                            'user_type': self._get_user_type(report.reported_account),
                            'is_suspended': report.reported_account.is_suspended,
                            'warning_count': report.reported_account.warning_count,
                        }
                    })
                elif report.report_type == 'product' and report.reported_product:
                    report_data.update({
                        'reported_object': {
                            'id': str(report.reported_product.id),
                            'name': report.reported_product.name,
                            'price': float(report.reported_product.price),
                            'shop_name': report.reported_product.shop.name if report.reported_product.shop else 'No Shop',
                            'is_removed': report.reported_product.is_removed,
                            'category': report.reported_product.category.name if report.reported_product.category else 'Uncategorized',
                        }
                    })
                elif report.report_type == 'shop' and report.reported_shop:
                    report_data.update({
                        'reported_object': {
                            'id': str(report.reported_shop.id),
                            'name': report.reported_shop.name,
                            'owner': report.reported_shop.customer.customer.username if report.reported_shop.customer else 'Unknown',
                            'is_suspended': report.reported_shop.is_suspended,
                            'total_products': report.reported_shop.products.count(),
                            'verified': report.reported_shop.verified,
                        }
                    })
                
                # Add action data if exists
                if hasattr(report, 'action'):
                    report_data['action'] = {
                        'action_type': report.action.action_type,
                        'description': report.action.description,
                        'taken_by': report.action.taken_by.username if report.action.taken_by else None,
                        'taken_at': report.action.taken_at.isoformat(),
                    }
                
                reports_data.append(report_data)

            response_data = {
                'reports': reports_data,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'page_size': page_size,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                },
                'filters': {
                    'type': report_type,
                    'status': status_filter,
                    'search': search,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error fetching reports list: {str(e)}")
            return Response(
                {'error': f'Error fetching reports list: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_user_type(self, user):
        """Helper method to determine user type"""
        if user.is_admin:
            return 'admin'
        elif user.is_moderator:
            return 'moderator'
        elif user.is_rider:
            return 'rider'
        elif user.is_customer:
            return 'customer'
        return 'unknown'


class CustomerProducts(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_products(self, request):
        shop_id = request.query_params.get('shop_id')

        products = (
            Product.objects
            .filter(shop=shop_id)            # WHERE shop_id = ?
            .order_by('name')
            .select_related('shop', 'category')
        )

        serializer = ProductSerializer(products, many=True)

        return Response({
            'success': True,
            'products': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def create_product(self, request):
        """
        Create a new product without authentication
        POST /api/your-endpoint/create_product/
        """
        try:
            # Validate required fields
            required_fields = ['shop', 'category', 'category_admin', 'name', 'price', 'quantity', 'customer']
            missing_fields = [field for field in required_fields if field not in request.data]
            
            if missing_fields:
                return Response(
                    {
                        "error": "Missing required fields",
                        "missing_fields": missing_fields
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get customer
            customer_id = request.data.get('customer')
            try:
                customer = Customer.objects.get(customer_id=customer_id)
            except Customer.DoesNotExist:
                return Response(
                    {"error": "Customer not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check product limit
            if not customer.can_add_product():
                return Response(
                    {
                        "error": "Product limit reached",
                        "detail": f"Customer has reached the limit of {customer.product_limit} products",
                        "current_count": customer.current_product_count,
                        "limit": customer.product_limit
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate shop ownership
            shop_id = request.data.get('shop')
            try:
                shop = Shop.objects.get(id=shop_id)
                if shop.customer != customer:
                    return Response(
                        {
                            "error": "Shop ownership validation failed",
                            "detail": "Customer can only add products to their own shops"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Shop.DoesNotExist:
                return Response(
                    {"error": "Shop not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate category exists
            category_id = request.data.get('category')
            category_admin_id = request.data.get('category_admin')
            
            try:
                category = Category.objects.get(id=category_id)
                category_admin = Category.objects.get(id=category_admin_id)
            except Category.DoesNotExist:
                return Response(
                    {"error": "Category not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate category user types
            # For category (customer category) - should be created by the same customer
            if category.user:
                if category.user.is_customer and category.user.customer != customer:
                    return Response(
                        {
                            "error": "Category ownership validation failed",
                            "detail": "You can only use your own customer categories"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # For category_admin - should be created by an admin
            if category_admin.user:
                if not category_admin.user.is_admin:
                    return Response(
                        {
                            "error": "Admin category validation failed",
                            "detail": "category_admin must be created by an admin"
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # category_admin has no user - might be system category
                # You can decide whether to allow this or not
                pass
            
            # Use serializer for creation
            serializer = ProductCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                try:
                    with transaction.atomic():
                        product = serializer.save()
                        
                        # Success response
                        return Response(
                            {
                                "success": True,
                                "message": "Product created successfully",
                                "product": {
                                    "id": str(product.id),
                                    "name": product.name,
                                    "shop": shop.name,
                                    "category": category.name,
                                    "category_type": "Customer" if category.user and category.user.is_customer else "System",
                                    "category_admin": category_admin.name,
                                    "category_admin_type": "Admin" if category_admin.user and category_admin.user.is_admin else "System",
                                    "price": str(product.price),
                                    "quantity": product.quantity,
                                    "status": product.status,
                                    "condition": product.condition,
                                    "created_at": product.created_at
                                },
                                "customer_stats": {
                                    "customer_id": str(customer.customer_id),
                                    "current_product_count": customer.current_product_count,
                                    "product_limit": customer.product_limit,
                                    "remaining_slots": customer.product_limit - customer.current_product_count
                                }
                            },
                            status=status.HTTP_201_CREATED
                        )
                        
                except Exception as e:
                    return Response(
                        {
                            "error": "Failed to create product",
                            "detail": str(e)
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            return Response(
                {
                    "error": "Validation failed",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            return Response(
                {
                    "error": "Internal server error",
                    "detail": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        
class RiderStatus(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_rider_status(self, request):
        rider_id = request.headers.get('X-User-Id')

        try: 
            rider_status = Rider.objects.get(rider_id=rider_id)

            return Response({
                'success': True,
                'rider_status': rider_status.verified
            }, status=status.HTTP_200_OK)
        except Rider.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Rider not found'
            }, status=status.HTTP_404_NOT_FOUND)


class CustomerShops(APIView):
    def get(self, request):
        # Get customer_id from query parameters
        customer_id = request.query_params.get('customer_id')
        
        if not customer_id:
            return Response({
                "success": False,
                "error": "customer_id parameter is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the customer object
            customer = Customer.objects.get(customer_id=customer_id)
            
            # Filter shops by this customer
            shops_queryset = Shop.objects.filter(customer=customer).order_by('name')
            serializer = ShopSerializer(shops_queryset, many=True, context={'request': request})
            
            return Response({
                "success": True,
                "shops": serializer.data,
                "message": "Shops retrieved successfully",
                "data_source": "database"
            }, status=status.HTTP_200_OK)
            
        except Customer.DoesNotExist:
            return Response({
                "success": True,
                "shops": [],
                "message": "No customer found with this ID",
                "data_source": "database"
            }, status=status.HTTP_200_OK) 
            
    def post(self, request):
            """
            Create a new shop for a customer
            """
            try:
                # Get user ID from request data (passed from frontend)
                user_id = request.data.get('customer')
                
                if not user_id:
                    return Response(
                        {'error': 'User ID is required'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate that the user exists and is a customer
                try:
                    user = User.objects.get(id=user_id)
                    
                    # Check if user is a customer
                    if not user.is_customer:
                        return Response(
                            {'error': 'User is not registered as a customer'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Get or create Customer instance
                    customer, created = Customer.objects.get_or_create(customer=user)
                    
                except User.DoesNotExist:
                    return Response(
                        {'error': 'User not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Validate required fields
                required_fields = ['name', 'description', 'province', 'city', 'barangay', 'street', 'contact_number']
                missing_fields = []
                
                for field in required_fields:
                    if field not in request.data or not request.data.get(field):
                        missing_fields.append(field)
                
                if missing_fields:
                    return Response(
                        {'error': f'Missing required fields: {", ".join(missing_fields)}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate field lengths based on model
                validation_errors = {}
                
                # Validate name (max 50 characters in model)
                name = request.data.get('name', '').strip()
                if len(name) > 50:
                    validation_errors['name'] = 'Shop name must be 50 characters or less'
                
                # Validate description (max 200 characters in model)
                description = request.data.get('description', '').strip()
                if len(description) > 200:
                    validation_errors['description'] = 'Description must be 200 characters or less'
                
                # Validate location fields (max 50 characters each in model)
                location_fields = ['province', 'city', 'barangay', 'street']
                for field in location_fields:
                    value = request.data.get(field, '').strip()
                    if len(value) > 50:
                        validation_errors[field] = f'{field.capitalize()} must be 50 characters or less'
                
                # Validate contact number (max 20 characters in model)
                contact_number = request.data.get('contact_number', '').strip()
                if len(contact_number) > 20:
                    validation_errors['contact_number'] = 'Contact number must be 20 characters or less'
                
                if validation_errors:
                    return Response(
                        {'errors': validation_errors}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if customer already has a shop (optional, based on business logic)
                # Remove this if customers can have multiple shops
                existing_shop = Shop.objects.filter(customer=customer).first()
                if existing_shop:
                    return Response(
                        {'error': 'Customer already has a shop'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Use atomic transaction for data integrity
                with transaction.atomic():
                    # Create the shop
                    shop = Shop.objects.create(
                        id=uuid.uuid4(),
                        name=name,
                        description=description,
                        province=request.data.get('province', '').strip(),
                        city=request.data.get('city', '').strip(),
                        barangay=request.data.get('barangay', '').strip(),
                        street=request.data.get('street', '').strip(),
                        contact_number=contact_number,
                        customer=customer,
                        # Set default values
                        verified=False,
                        status="Active",
                        total_sales=0,
                        is_suspended=False,
                        created_at=timezone.now(),
                        updated_at=timezone.now()
                    )
                    
                    # Handle shop picture if provided
                    shop_picture = request.FILES.get('shop_picture')
                    if shop_picture:
                        # Validate file type
                        valid_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
                        valid_mime_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                        
                        # Get file extension
                        file_extension = shop_picture.name.split('.')[-1].lower()
                        
                        # Validate both extension and content type
                        if (file_extension not in valid_extensions or 
                            shop_picture.content_type not in valid_mime_types):
                            raise ValueError(
                                'Invalid file type. Supported formats: JPEG, PNG, GIF, WebP'
                            )
                        
                        # Validate file size (5MB limit as in frontend)
                        if shop_picture.size > 5 * 1024 * 1024:
                            raise ValueError('File size must be less than 5MB')
                        
                        shop.shop_picture = shop_picture
                        shop.save()
                    
                    # Prepare response data
                    shop_data = {
                        'id': str(shop.id),
                        'name': shop.name,
                        'description': shop.description,
                        'province': shop.province,
                        'city': shop.city,
                        'barangay': shop.barangay,
                        'street': shop.street,
                        'contact_number': shop.contact_number,
                        'customer': str(shop.customer.customer_id) if shop.customer else None,
                        'verified': shop.verified,
                        'status': shop.status,
                        'total_sales': str(shop.total_sales),
                        'created_at': shop.created_at.isoformat(),
                        'updated_at': shop.updated_at.isoformat(),
                    }
                    
                    if shop.shop_picture:
                        shop_data['shop_picture'] = request.build_absolute_uri(shop.shop_picture.url)
                    
                    logger.info(f"Shop created successfully: {shop.name} by user {user_id}")
                    
                    return Response({
                        'success': True,
                        'message': 'Shop created successfully',
                        'shop': shop_data,
                        'id': str(shop.id)
                    }, status=status.HTTP_201_CREATED)
                    
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Shop creation failed: {str(e)}", exc_info=True)
                return Response(
                    {
                        'error': 'An error occurred while creating the shop',
                        'details': str(e)
                    }, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

class CustomerShopsAddSeller(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_shop(self, request):
        shop_id = request.headers.get('X-Shop-Id')

        try: 
            shop = Shop.objects.get(id=shop_id)

            serializer = ShopSerializer(shop, context={'request': request})

            return Response({
                'success': True,
                'shop': serializer.data
            }, status=status.HTTP_200_OK)
        except Shop.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Shop not found'
            }, status=status.HTTP_404_NOT_FOUND)

class SellerProducts(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    
    @action(detail=False, methods=['get'], url_path='global-categories')    
    def get_global_categories(self, request):
        """
        Fetch global categories (where shop_id is null/empty)
        """
        try:
            # Fetch categories where shop is null (global categories)
            global_categories = Category.objects.filter(shop__isnull=True).order_by('name')
            
            # Serialize the data
            categories_data = []
            for category in global_categories:
                category_data = {
                    "id": str(category.id),
                    "name": category.name,
                    "shop": None,  # Explicitly set to null since we're filtering for null shop
                    "user": {
                        "id": str(category.user.id),
                        "username": category.user.username
                    } if category.user else None,
                }
                categories_data.append(category_data)
            
            return Response({
                "success": True,
                "categories": categories_data,
                "message": "Global categories retrieved successfully",
                "total_count": len(categories_data),
                "is_global": True
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch global categories",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=False, methods=['post'], url_path='global-categories/predict')    
    def predict_category(self, request):
        """
        Predict category for a product - FIXED VERSION with UUIDs
        """
        try:
            import pandas as pd
            import numpy as np
            import tensorflow as tf
            import joblib
            import os
            
            CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
            MODEL_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'model')
            
            print(f"Looking for models in: {MODEL_DIR}")

            # Load the trained models
            try:
                category_le = joblib.load(os.path.join(MODEL_DIR, 'category_label_encoder.pkl'))
                scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
                model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'category_classifier.keras'))
                
                # Load the EXACT feature columns used during training
                feature_columns = joblib.load(os.path.join(MODEL_DIR, 'feature_columns.pkl'))
                
                print(f"✅ Models loaded successfully!")
                print(f"Model expects {len(feature_columns)} features: {feature_columns}")

                print(f"Model input shape: {model.input_shape}")
                print(f"Model expects {model.input_shape[1]} features")
                print(f"Loaded {len(feature_columns)} features from file")
                
            except FileNotFoundError as e:
                print(f"❌ Model file not found: {str(e)}")
                return Response(
                    {'success': False, 'error': f'Model files not found. Please train the model first.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Extract data from request
            data = request.data
            
            # Required fields from UI
            required_fields = ['name', 'description', 'quantity', 'price', 'condition']
            
            # Validate required fields
            for field in required_fields:
                if field not in data:
                    return Response(
                        {'success': False, 'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Prepare item data
            item_data = {
                'name': str(data['name']),
                'description': str(data['description']),
                'quantity': int(data['quantity']),
                'price': float(data['price']),
                'condition': str(data['condition'])
            }
            
            print(f"\n=== PREDICTION STARTED ===")
            print(f"Product: {item_data['name']}")
            print(f"Price: ${item_data['price']}, Quantity: {item_data['quantity']}")
            
            # ================================================
            # CREATE FEATURES - EXACTLY AS DURING TRAINING
            # ================================================
            
            # Initialize all features to 0
            features = {col: 0 for col in feature_columns}
            
            # Basic numeric features - only if they're in feature_columns
            price = item_data['price']
            quantity = item_data['quantity']
            
            # Set only the features that exist in feature_columns
            if 'price' in feature_columns:
                features['price'] = price
            if 'quantity' in feature_columns:
                features['quantity'] = quantity
            if 'price_quantity_interaction' in feature_columns:
                features['price_quantity_interaction'] = price * np.log1p(quantity + 1)
            if 'log_price' in feature_columns:
                features['log_price'] = np.log1p(price)
            if 'price_per_unit' in feature_columns:
                features['price_per_unit'] = price / (quantity + 1)
            if 'price_to_quantity_ratio' in feature_columns:
                features['price_to_quantity_ratio'] = price / (quantity + 1e-5)
            if 'price_scaled' in feature_columns:
                features['price_scaled'] = price / 10000  # Use same scaling as training
            if 'quantity_scaled' in feature_columns:
                features['quantity_scaled'] = quantity / 100  # Use same scaling as training
            
            # Condition features
            condition_lower = item_data['condition'].lower()
            
            if 'condition_score' in feature_columns:
                if 'new' in condition_lower:
                    features['condition_score'] = 3
                elif 'like new' in condition_lower:
                    features['condition_score'] = 2
                elif 'refurbished' in condition_lower:
                    features['condition_score'] = 1
                elif 'excellent' in condition_lower:
                    features['condition_score'] = 0
                elif 'good' in condition_lower:
                    features['condition_score'] = -1
                elif 'fair' in condition_lower:
                    features['condition_score'] = -2
                else:
                    features['condition_score'] = 0
            
            # is_refurbished feature (if present)
            if 'is_refurbished' in feature_columns:
                features['is_refurbished'] = 1 if 'refurbished' in condition_lower else 0
            
            # Text features
            name_lower = item_data['name'].lower()
            desc_lower = item_data['description'].lower()
            all_text = name_lower + ' ' + desc_lower
            
            if 'name_length' in feature_columns:
                features['name_length'] = len(item_data['name'])
            if 'desc_length' in feature_columns:
                features['desc_length'] = len(item_data['description'])
            if 'name_desc_ratio' in feature_columns:
                desc_len = len(item_data['description'])
                if desc_len > 0:
                    features['name_desc_ratio'] = len(item_data['name']) / desc_len
                else:
                    features['name_desc_ratio'] = len(item_data['name'])
            
            # Keyword features - only for features that start with 'has_' AND are in feature_columns
            for feature in feature_columns:
                if feature.startswith('has_'):
                    keyword = feature[4:]  # Remove 'has_' prefix
                    features[feature] = 1 if keyword in all_text else 0
            
            # Price bins - only if they're in feature_columns
            if 'price_bin_0' in feature_columns:
                features['price_bin_0'] = 1 if price < 100 else 0
            if 'price_bin_1' in feature_columns:
                features['price_bin_1'] = 1 if 100 <= price < 500 else 0
            if 'price_bin_2' in feature_columns:
                features['price_bin_2'] = 1 if 500 <= price < 1000 else 0
            if 'price_bin_3' in feature_columns:
                features['price_bin_3'] = 1 if 1000 <= price < 2000 else 0
            if 'price_bin_4' in feature_columns:
                features['price_bin_4'] = 1 if price >= 2000 else 0
            
            # Category-specific features (these use category stats, so set to 0 for prediction)
            if 'price_category_zscore' in feature_columns:
                features['price_category_zscore'] = 0  # Can't compute without category
            if 'quantity_category_zscore' in feature_columns:
                features['quantity_category_zscore'] = 0  # Can't compute without category
            if 'price_category_quartile' in feature_columns:
                features['price_category_quartile'] = 2  # Default middle quartile
            
            # Additional simple text features
            if 'name_word_count' in feature_columns:
                features['name_word_count'] = len(item_data['name'].split())
            if 'desc_word_count' in feature_columns:
                features['desc_word_count'] = len(item_data['description'].split())
            if 'keyword_count' in feature_columns:
                # Count keyword features that are set to 1
                keyword_features = [f for f in feature_columns if f.startswith('has_')]
                features['keyword_count'] = sum(1 for f in keyword_features if features.get(f, 0) == 1)
            if 'unique_keywords' in feature_columns:
                # Same as keyword_count for prediction
                keyword_features = [f for f in feature_columns if f.startswith('has_')]
                features['unique_keywords'] = sum(1 for f in keyword_features if features.get(f, 0) == 1)
            
            # Brand mentions
            for brand_feature in ['has_iphone', 'has_samsung', 'has_apple', 'has_sony']:
                if brand_feature in feature_columns:
                    brand_name = brand_feature[4:]  # Remove 'has_' prefix
                    features[brand_feature] = 1 if brand_name in all_text else 0
            
            # New/Used flags
            if 'is_new' in feature_columns:
                features['is_new'] = 1 if 'new' in condition_lower else 0
            if 'is_used' in feature_columns:
                features['is_used'] = 1 if 'used' in condition_lower else 0
            
            print(f"\n=== FEATURE SUMMARY ===")
            print(f"Total features created: {len(features)}")
            print(f"Features expected: {len(feature_columns)}")
            
            # Create DataFrame with EXACTLY the expected features
            X_item = pd.DataFrame([features])
            
            # Ensure we only have the expected features (remove extras, add missing)
            for col in feature_columns:
                if col not in X_item.columns:
                    X_item[col] = 0
            
            # Remove any columns not in feature_columns
            extra_cols = [col for col in X_item.columns if col not in feature_columns]
            if extra_cols:
                print(f"Removing extra columns: {extra_cols}")
                X_item = X_item.drop(columns=extra_cols)
            
            # Reorder columns to match training order
            X_item = X_item[feature_columns]
            
            print(f"DataFrame shape: {X_item.shape}")
            print(f"Columns: {list(X_item.columns)}")
            
            # Show top non-zero features
            non_zero = X_item.loc[:, (X_item != 0).any()].columns.tolist()
            print(f"Non-zero features ({len(non_zero)}): {non_zero}")
            
            # ================================================
            # SCALE AND PREDICT
            # ================================================
            
            try:
                X_scaled = scaler.transform(X_item)
                print(f"Scaled successfully to shape: {X_scaled.shape}")
            except Exception as e:
                print(f"Scaling error: {e}, using raw features")
                X_scaled = X_item.values.astype(np.float32)
            
            # Make prediction
            prediction_probs = model.predict(X_scaled, verbose=0)
            predicted_class = np.argmax(prediction_probs, axis=1)[0]
            confidence = np.max(prediction_probs, axis=1)[0]
            
            # Convert predicted class to actual category label
            predicted_label = category_le.inverse_transform([predicted_class])[0]
            
            print(f"\n✅ PREDICTION SUCCESSFUL!")
            print(f"Predicted: {predicted_label}")
            print(f"Confidence: {confidence:.2%}")
            
            # ================================================
            # GET UUID FROM DATABASE (NEW CODE)
            # ================================================
            
            # Try to find the category in the database
            try:
                # First, try to find the category by name (case-insensitive)
                category_obj = Category.objects.filter(
                    name__iexact=predicted_label,
                    shop__isnull=True  # Only global categories
                ).first()
                
                if category_obj:
                    category_uuid = str(category_obj.id)
                    category_name = category_obj.name
                    print(f"✅ Found category in DB: {category_name} (UUID: {category_uuid})")
                else:
                    # If not found by exact name, try to find similar
                    # You might need to adjust this based on your category naming
                    similar_categories = Category.objects.filter(
                        name__icontains=predicted_label,
                        shop__isnull=True
                    ).first()
                    
                    if similar_categories:
                        category_uuid = str(similar_categories.id)
                        category_name = similar_categories.name
                        print(f"✅ Found similar category in DB: {category_name} (UUID: {category_uuid})")
                    else:
                        # Fallback: get the first available global category
                        first_category = Category.objects.filter(shop__isnull=True).first()
                        if first_category:
                            category_uuid = str(first_category.id)
                            category_name = first_category.name
                            print(f"⚠️  Category not found, using first available: {category_name}")
                        else:
                            # No categories in database
                            category_uuid = None
                            category_name = predicted_label
                            print(f"❌ No categories found in database")
                            
            except Exception as db_error:
                print(f"Database lookup error: {db_error}")
                category_uuid = None
                category_name = predicted_label
            
            # ================================================
            # PREPARE RESPONSE WITH UUIDs
            # ================================================
            
            # Get all category names from database (not just from model)
            try:
                all_categories_objs = Category.objects.filter(shop__isnull=True)
                all_categories_list = []
                
                for cat in all_categories_objs:
                    all_categories_list.append({
                        'uuid': str(cat.id),
                        'name': cat.name,
                        'id': str(cat.id)  # Include both uuid and id for compatibility
                    })
            except Exception as e:
                print(f"Error fetching categories from DB: {e}")
                all_categories_list = list(category_le.classes_)
            
            # Prepare top 3 categories
            top_3_indices = np.argsort(prediction_probs[0])[-3:][::-1]
            top_categories = []
            
            for idx in top_3_indices:
                category_label = category_le.inverse_transform([idx])[0]
                
                # Try to find this category in DB for UUID
                try:
                    cat_obj = Category.objects.filter(
                        name__iexact=category_label,
                        shop__isnull=True
                    ).first()
                    
                    if cat_obj:
                        category_uuid_for_alt = str(cat_obj.id)
                        category_name_for_alt = cat_obj.name
                    else:
                        category_uuid_for_alt = None
                        category_name_for_alt = category_label
                        
                except Exception:
                    category_uuid_for_alt = None
                    category_name_for_alt = category_label
                
                top_categories.append({
                    'category_id': int(idx),  # Keep numeric ID for model reference
                    'category_uuid': category_uuid_for_alt,  # Add UUID for database
                    'category_name': category_name_for_alt,
                    'confidence': float(prediction_probs[0][idx])
                })
            
            # Get keywords found
            keyword_cols = [col for col in feature_columns if col.startswith('has_')]
            keywords_found = [col.replace('has_', '') for col in keyword_cols if features.get(col, 0) == 1]
            
            # Determine price range
            if price < 100:
                price_range = 'Ultra Budget'
            elif price < 500:
                price_range = 'Budget'
            elif price < 1000:
                price_range = 'Mid-range'
            elif price < 2000:
                price_range = 'Premium'
            else:
                price_range = 'Luxury'
            
            # Build the response
            result = {
                'success': True,
                'predicted_category': {
                    'category_id': int(predicted_class),  # Numeric ID from model
                    'category_uuid': category_uuid,  # UUID from database
                    'category_name': predicted_label,
                    'confidence': float(confidence)
                },
                'alternative_categories': top_categories[1:] if len(top_categories) > 1 else [],
                'all_categories': all_categories_list,
                'feature_insights': {
                    'keywords_found': keywords_found,
                    'price_range': price_range,
                    'price': float(price),
                    'quantity': int(quantity),
                    'condition': item_data['condition']
                }
            }
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"\n❌ PREDICTION ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response(
                {
                    'success': False, 
                    'error': f'Prediction failed: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def get_queryset(self):
        # Get user_id from request data instead of authenticated user
        user_id = self.request.data.get('customer_id')
        if user_id:
            try:
                seller = Customer.objects.get(customer_id=user_id)
                return Product.objects.filter(customer=seller).order_by('-created_at')
            except Customer.DoesNotExist:
                return Product.objects.none()
        return Product.objects.none()

    def create(self, request):
        # Validate required fields for seller product creation
        required_fields = ["name", "description", "quantity", "price", "condition", "shop", "customer_id"]
        missing_fields = [f for f in required_fields if f not in request.data]

        if missing_fields:
            return Response({
                "error": "Missing required fields",
                "missing_fields": missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the user ID from session (sent from frontend)
        user_id = request.data.get("customer_id")
        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Get seller using the user_id from session
        try:
            seller = Customer.objects.get(customer_id=user_id)
        except Customer.DoesNotExist:
            return Response({"error": "Seller not found"}, status=status.HTTP_404_NOT_FOUND)

        shop_id = request.data.get("shop")
        
        # Verify the shop belongs to the seller
        try:
            shop = Shop.objects.get(id=shop_id, customer=seller)
        except Shop.DoesNotExist:
            return Response({
                "error": "Shop not found or does not belong to you"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if seller can add more products
        if not seller.can_add_product():
            return Response({
                "error": f"Cannot add more than {seller.product_limit} products. Current count: {seller.current_product_count}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prepare data with the seller from session user_id
        product_data = request.data.copy()
        product_data['customer'] = seller.customer_id
        
        # Handle category_admin_id for global categories
        category_admin_id = request.data.get('category_admin_id')
        if category_admin_id and category_admin_id != "none":
            try:
                category_admin = Category.objects.get(id=category_admin_id, shop__isnull=True)
                product_data['category_admin'] = category_admin_id
            except Category.DoesNotExist:
                return Response({
                    "error": "Invalid global category selected"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductCreateSerializer(data=product_data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                try:
                    product = serializer.save()
                    
                    # Handle media files if any
                    media_files = request.FILES.getlist('media_files')
                    print(f"Number of media files received: {len(media_files)}")  # Debug
                    for i, media_file in enumerate(media_files):
                        print(f"Media file {i}: name={media_file.name}, size={media_file.size}, type={media_file.content_type}")  # Debug
                        try:
                            product_media = ProductMedia.objects.create(
                                product=product,
                                file_data=media_file,
                                file_type=media_file.content_type
                            )
                            print(f"Created ProductMedia: {product_media.id}, file saved to: {product_media.file_data}")  # Debug
                        except Exception as e:
                            print(f"Error creating ProductMedia: {e}")  # Debug
                    # Handle variants if any (simple approach)
                    variant_title = request.data.get('variant_title')
                    variant_option_title = request.data.get('variant_option_title')
                    variant_option_quantity = request.data.get('variant_option_quantity')
                    variant_option_price = request.data.get('variant_option_price')
                    
                    if variant_title and variant_option_title:
                        variant = Variants.objects.create(
                            product=product,
                            shop=shop,
                            title=variant_title
                        )
                        
                        VariantOptions.objects.create(
                            variant=variant,
                            title=variant_option_title,
                            quantity=int(variant_option_quantity) if variant_option_quantity else 0,
                            price=float(variant_option_price) if variant_option_price else 0
                        )
                    
                    # Return same format as get_product_list
                    return Response({
                        "success": True,
                        "products": [
                            {
                                "id": str(product.id),
                                "name": product.name,
                                "description": product.description,
                                "quantity": product.quantity,
                                "price": str(product.price),
                                "status": product.status,
                                "condition": product.condition,
                                "shop": {
                                    "id": str(product.shop.id),
                                    "name": product.shop.name
                                } if product.shop else None,
                                "category_admin": {
                                    "id": str(product.category_admin.id),
                                    "name": product.category_admin.name
                                } if product.category_admin else None,
                                "category": {
                                    "id": str(product.category.id),
                                    "name": product.category.name
                                } if product.category else None,
                                "created_at": product.created_at.isoformat() if product.created_at else None,
                                "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                            }
                        ],
                        "message": "Product created successfully",
                        "data_source": "database",
                        "product_limit_info": {
                            "current_count": seller.current_product_count,
                            "limit": seller.product_limit,
                            "remaining": seller.product_limit - seller.current_product_count
                        }
                    }, status=status.HTTP_201_CREATED)
                except ValidationError as e:
                    return Response({
                        "error": "Validation failed",
                        "details": str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                "error": "Validation failed",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request):
        # For listing, we need to get user_id from request data or query params
        user_id = request.data.get('customer_id') or request.query_params.get('customer_id')
        
        if not user_id:
            return Response({
                "error": "User ID is required"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            seller = Customer.objects.get(customer_id=user_id)
            # Prefetch variants and variant options to avoid N+1 queries
            queryset = Product.objects.filter(customer=seller)\
                .prefetch_related('variants_set__variantoptions_set')\
                .order_by('-created_at')
            
            # Build response manually like in create method
            products_data = []
            for product in queryset:
                # Build variants data
                variants_data = []
                # Get all variants for this product
                for variant in product.variants_set.all():
                    variant_data = {
                        "id": str(variant.id),
                        "title": variant.title,
                        "options": []
                    }
                    # Get all options for this variant
                    for option in variant.variantoptions_set.all():
                        variant_data["options"].append({
                            "id": str(option.id),
                            "title": option.title,
                            "quantity": option.quantity,
                            "price": str(option.price)
                        })
                    variants_data.append(variant_data)
                
                product_data = {
                    "id": str(product.id),
                    "name": product.name,
                    "description": product.description,
                    "quantity": product.quantity,
                    "price": str(product.price),
                    "status": product.status,
                    "upload_status": product.upload_status,
                    "condition": product.condition,
                    "shop": {
                        "id": str(product.shop.id),
                        "name": product.shop.name
                    } if product.shop else None,
                    "category_admin": {
                        "id": str(product.category_admin.id),
                        "name": product.category_admin.name
                    } if product.category_admin else None,
                    "category": {
                        "id": str(product.category.id),
                        "name": product.category.name
                    } if product.category else None,
                    "variants": variants_data,  # ADD VARIANTS HERE
                    "created_at": product.created_at.isoformat() if product.created_at else None,
                    "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                }
                products_data.append(product_data)
            
            return Response({
                "success": True,
                "products": products_data,
                "message": "Products retrieved successfully",
                "data_source": "database"
            }, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({
                "success": True,
                "products": [],
                "message": "No seller found for this user",
                "data_source": "database"
            }, status=status.HTTP_200_OK)
        
class CustomerProducts(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    
    @action(detail=False, methods=['get'], url_path='global-categories')    
    def get_global_categories(self, request):
        """
        Fetch global categories (where shop_id is null/empty)
        """
        try:
            # Fetch categories where shop is null (global categories)
            global_categories = Category.objects.filter(shop__isnull=True).order_by('name')
            
            # Serialize the data
            categories_data = []
            for category in global_categories:
                category_data = {
                    "id": str(category.id),
                    "name": category.name,
                    "shop": None,  # Explicitly set to null since we're filtering for null shop
                    "user": {
                        "id": str(category.user.id),
                        "username": category.user.username
                    } if category.user else None,
                }
                categories_data.append(category_data)
            
            return Response({
                "success": True,
                "categories": categories_data,
                "message": "Global categories retrieved successfully",
                "total_count": len(categories_data),
                "is_global": True
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch global categories",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_queryset(self):
        user_id = self.request.query_params.get('customer_id')
        if user_id:
            try:
                seller = Customer.objects.get(customer_id=user_id)
                return Product.objects.filter(customer=seller).order_by('-created_at')
            except Customer.DoesNotExist:
                return Product.objects.none()
        return Product.objects.none()

    def create(self, request):
        print("Request FILES:", request.FILES)
        print("Request data keys:", request.data.keys())
        media_files = request.FILES.getlist('media_files')
        print(f"Number of media files: {len(media_files)}")
        
        for file in media_files:
            print(f"File: {file.name}, Size: {file.size}, Type: {file.content_type}")
            
        required_fields = ["name", "description", "quantity", "price", "condition", "customer_id"]
        missing_fields = [f for f in required_fields if f not in request.data]

        if missing_fields:
            return Response({
                "error": "Missing required fields",
                "missing_fields": missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the user ID from session (sent from frontend)
        user_id = request.data.get("customer_id")
        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Get customer using the user_id from session
        try:
            customer = Customer.objects.get(customer_id=user_id)
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if customer can add more personal listings
        if not customer.can_add_product():
            return Response({
                "error": f"Cannot add more than {customer.product_limit} personal listings. Current count: {customer.current_product_count}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prepare data with the customer from session user_id
        product_data = request.data.copy()
        product_data['customer'] = customer.customer_id
        
        # For personal listings, ensure no shop is attached
        product_data['shop'] = None
        
        # Handle category_admin_id for global categories
        category_admin_id = request.data.get('category_admin_id')
        if category_admin_id and category_admin_id != "none":
            try:
                category_admin = Category.objects.get(id=category_admin_id, shop__isnull=True)
                product_data['category_admin'] = category_admin_id
            except Category.DoesNotExist:
                return Response({
                    "error": "Invalid global category selected"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductCreateSerializer(data=product_data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                try:
                    product = serializer.save()
                    
                    # Handle media files if any
                    media_files = request.FILES.getlist('media_files')
                    for media_file in media_files:
                        ProductMedia.objects.create(
                            product=product,
                            file_data=media_file,
                            file_type=media_file.content_type
                        )
                    
                    # Handle variants if any (simplified for personal listings)
                    variant_title = request.data.get('variant_title')
                    variant_option_title = request.data.get('variant_option_title')
                    variant_option_quantity = request.data.get('variant_option_quantity')
                    variant_option_price = request.data.get('variant_option_price')
                    
                    if variant_title and variant_option_title:
                        variant = Variants.objects.create(
                            product=product,
                            shop=None,  # No shop for personal listings
                            title=variant_title
                        )
                        
                        VariantOptions.objects.create(
                            variant=variant,
                            title=variant_option_title,
                            quantity=int(variant_option_quantity) if variant_option_quantity else 0,
                            price=float(variant_option_price) if variant_option_price else 0
                        )
                    
                    # Return same format as get_product_list
                    return Response({
                        "success": True,
                        "products": [
                            {
                                "id": str(product.id),
                                "name": product.name,
                                "description": product.description,
                                "quantity": product.quantity,
                                "price": str(product.price),
                                "status": product.status,
                                "condition": product.condition,
                                "customer": {
                                    "id": str(customer.customer_id),
                                    "username": customer.username
                                } if customer else None,
                                "category_admin": {
                                    "id": str(product.category_admin.id),
                                    "name": product.category_admin.name
                                } if product.category_admin else None,
                                "category": {
                                    "id": str(product.category.id),
                                    "name": product.category.name
                                } if product.category else None,
                                "created_at": product.created_at.isoformat() if product.created_at else None,
                                "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                            }
                        ],
                        "message": "Personal listing created successfully",
                        "data_source": "database",
                        "product_limit_info": {
                            "current_count": customer.current_product_count,
                            "limit": customer.product_limit,
                            "remaining": customer.product_limit - customer.current_product_count
                        }
                    }, status=status.HTTP_201_CREATED)
                except ValidationError as e:
                    return Response({
                        "error": "Validation failed",
                        "details": str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                "error": "Validation failed",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request):
        # For listing, we need to get user_id from request data or query params
        user_id = request.data.get('customer_id') or request.query_params.get('customer_id')
        
        if not user_id:
            return Response({
                "error": "User ID is required"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            customer = Customer.objects.get(customer_id=user_id)
            # Prefetch variants and variant options to avoid N+1 queries
            # Only get personal listings (no shop)
            queryset = Product.objects.filter(customer=customer, shop__isnull=True)\
                .prefetch_related('variants_set__variantoptions_set')\
                .order_by('-created_at')
            
            # Build response manually like in create method
            products_data = []
            for product in queryset:
                # Build variants data
                variants_data = []
                # Get all variants for this product
                for variant in product.variants_set.all():
                    variant_data = {
                        "id": str(variant.id),
                        "title": variant.title,
                        "options": []
                    }
                    # Get all options for this variant
                    for option in variant.variantoptions_set.all():
                        variant_data["options"].append({
                            "id": str(option.id),
                            "title": option.title,
                            "quantity": option.quantity,
                            "price": str(option.price)
                        })
                    variants_data.append(variant_data)
                
                product_data = {
                    "id": str(product.id),
                    "name": product.name,
                    "description": product.description,
                    "quantity": product.quantity,
                    "price": str(product.price),
                    "status": product.status,
                    "upload_status": product.upload_status,
                    "condition": product.condition,
                    "customer": {
                        "id": str(customer.customer_id),
                        "username": customer.username
                    } if customer else None,
                    "category_admin": {
                        "id": str(product.category_admin.id),
                        "name": product.category_admin.name
                    } if product.category_admin else None,
                    "category": {
                        "id": str(product.category.id),
                        "name": product.category.name
                    } if product.category else None,
                    "variants": variants_data,
                    "created_at": product.created_at.isoformat() if product.created_at else None,
                    "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                }
                products_data.append(product_data)
            
            return Response({
                "success": True,
                "products": products_data,
                "message": "Personal listings retrieved successfully",
                "data_source": "database"
            }, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({
                "success": True,
                "products": [],
                "message": "No customer found for this user",
                "data_source": "database"
            }, status=status.HTTP_200_OK)
        
class PublicProducts(viewsets.ReadOnlyModelViewSet):

    serializer_class = ProductSerializer

    def get_queryset(self):
        user_id = self.request.headers.get('X-User-Id')
        print(f"DEBUG: user_id = {user_id}")
        total_products = Product.objects.filter(
            upload_status='published',
            is_removed=False
        ).count()
        print(f"DEBUG: Total published products = {total_products}")

        user_products_customer = Product.objects.filter(
            upload_status='published',
            is_removed=False,
            customer__customer__id=user_id
        ).count()
        print(f"DEBUG: Products owned via customer = {user_products_customer}")

        user_products_shop = Product.objects.filter(
            upload_status='published',
            is_removed=False,
            shop__customer__customer__id=user_id
        ).count()
        print(f"DEBUG: Products owned via shop = {user_products_shop}")

        queryset = Product.objects.filter(
            upload_status='published',
            is_removed=False
        ).select_related(
            'shop',
            'customer',
            'category',
            'category_admin'
        ).prefetch_related(
            Prefetch(
                'productmedia_set',
                queryset=ProductMedia.objects.all()
            ),
            Prefetch(
                'variants_set',
                queryset=Variants.objects.all().prefetch_related('variantoptions_set')
            )
        )

        if user_id:

            queryset = queryset.exclude(

                Q(customer__customer__id=user_id) | 

                Q(shop__customer__customer__id=user_id)

            )

        

        final_count = queryset.count()

        print(f"DEBUG: Final count after exclusion = {final_count}")

        

        return queryset.order_by('-created_at')

    


class AddToCartView(APIView):

    def post(self, request):
        user_id = request.data.get("user_id") 
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))
       

        if not product_id:
            return Response({"success": False, "error": "Product ID is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not user_id:
            return Response({"success": False, "error": "Customer ID is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Find user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"success": False, "error": "User not found."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"success": False, "error": "Product not found."},
                            status=status.HTTP_404_NOT_FOUND)

        cart_item, created = CartItem.objects.get_or_create(
            user=user,
            product=product,
            defaults={"quantity": quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = CartItemSerializer(cart_item)
        return Response({"success": True, "cart_item": serializer.data})



class CartListView(APIView):
    """
    Returns all cart items for a given session user.
    Frontend passes user_id from loader session.
    Latest items first with product images included.
    """
    def get(self, request):
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        # Optimized query with prefetch for media files
        cart_items = CartItem.objects.filter(user=user)\
            .select_related("product", "product__shop")\
            .prefetch_related('product__productmedia_set')\
            .order_by('-added_at')
        
        serializer = CartItemSerializer(cart_items, many=True)
        return Response({"success": True, "cart_items": serializer.data})    

class CheckoutView(viewsets.ViewSet):

    @action(methods=["post"], detail=False)
    def checkout(self, request):
        """
        Cart-based checkout
        Request body:
        {
            "user_id": "uuid",
            "payment_method": "cod | gcash | paymaya | paypal",
            "delivery_method": "pickup | standard",
            "delivery_address": "string"
        }
        """
        try:
            data = request.data

            user_id = data.get("user_id")
            payment_method = data.get("payment_method")
            delivery_method = data.get("delivery_method")
            delivery_address = data.get("delivery_address")

            # ---- VALIDATION ----
            if not user_id:
                return Response({"error": "user_id is required"}, status=400)

            if not payment_method:
                return Response({"error": "payment_method is required"}, status=400)

            if not delivery_address:
                return Response({"error": "delivery_address is required"}, status=400)

            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)

            cart_items = CartItem.objects.select_related("product").filter(user=user)

            if not cart_items.exists():
                return Response({"error": "Cart is empty"}, status=400)

            # ---- TRANSACTION ----
            with transaction.atomic():
                total_amount = Decimal("0.00")

                # Create order
                order = Order.objects.create(
                    user=user,
                    status="pending",
                    payment_method=payment_method,
                    delivery_method=delivery_method,
                    delivery_address=delivery_address,
                    total_amount=0  # temporary
                )

                for cart_item in cart_items:
                    product = cart_item.product

                    if not product:
                        continue

                    if product.quantity < cart_item.quantity:
                        raise Exception(f"Insufficient stock for {product.name}")

                    line_total = product.price * cart_item.quantity
                    total_amount += line_total

                    # Deduct stock
                    product.quantity -= cart_item.quantity
                    product.save(update_fields=["quantity"])

                    # Create checkout row
                    Checkout.objects.create(
                        order=order,
                        cart_item=cart_item,
                        quantity=cart_item.quantity,
                        total_amount=line_total,
                        status="pending"
                    )

                # Update order total
                order.total_amount = total_amount
                order.save(update_fields=["total_amount"])

                # Clear cart
                cart_items.delete()

            return Response({
                "success": True,
                "message": "Checkout successful",
                "order_id": str(order.order),
                "total_amount": str(order.total_amount),
                "payment_method": order.payment_method,
                "delivery_method": order.delivery_method,
                "delivery_address": order.delivery_address
            }, status=201)

        except Exception as e:
            return Response(
                {"error": "Checkout failed", "details": str(e)},
                status=500
            )



class CustomerBoostPlan(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_boost_plans(self, request):
        try: 
            plans = BoostPlan.objects.all()
            serializer = BoostPlanSerializer(plans, many=True)

            return Response({
                'success': True,
                'plans': serializer.data 
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e),
            })
        



class CustomerFavoritesView(APIView):
    def get(self, request):
        try:
            # Identify user by X-User-Id header (set by frontend) or query param
            user_id = request.headers.get('X-User-Id') or request.GET.get('userId')
            if not user_id:
                # Gracefully return empty favorites when no user id is provided
                return Response({'success': True, 'favorites': []})

            try:
                user = User.objects.get(id=user_id)
                customer = user.customer
            except (User.DoesNotExist, Customer.DoesNotExist):
                # No user/customer => return empty list
                return Response({'success': True, 'favorites': []})     

            favorites = Favorites.objects.filter(customer=customer).order_by('-id')
            serializer = FavoritesSerializer(favorites, many=True)
            return Response({
                'success': True,
                'favorites': serializer.data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):

        try:
            # Get customer ID from request body or header
            user_id = request.data.get("customer") or request.headers.get('X-User-Id') or request.GET.get('userId')
            product_id = request.data.get("product")

            print(f"POST /customer-favorites/ - user_id: {user_id}, product_id: {product_id}")

            if not user_id:
                return Response({"success": False, "message": "Customer ID required"}, status=status.HTTP_400_BAD_REQUEST)

            if not product_id:
                return Response({"success": False, "message": "Product ID required"}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch user
            try:
                user = User.objects.get(id=user_id)
                print(f"User found: {user.id}")
            except User.DoesNotExist:
                print(f"User {user_id} not found")
                return Response({"success": False, "message": f"User {user_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            # Ensure customer profile exists
            customer, created = Customer.objects.get_or_create(customer=user)
            if created:
                print(f"Created customer profile for user {user_id}")
            else:
                print(f"Customer profile found for user {user_id}")

            # Ensure product exists
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                print(f"Product {product_id} not found")
                return Response({"success": False, "message": f"Product {product_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            if Favorites.objects.filter(customer=customer, product=product).exists():
                return Response({"success": False, "message": "Already favorited"}, status=status.HTTP_400_BAD_REQUEST)

            favorite = Favorites.objects.create(customer=customer, product=product)
            print(f"Favorite created: {favorite.id} for product {product.id} and customer {customer.customer.id}")

            serializer = FavoritesSerializer(favorite)
            return Response({"success": True, "favorite": serializer.data}, status=status.HTTP_201_CREATED)


        except Exception as e:
            print(f"Error in POST /customer-favorites/: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {
                    "success": False,
                    "message": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

    def delete(self, request, pk=None):
        """Remove a product from customer favorites"""
        try:
            # Get customer ID from request body or header
            user_id = request.data.get("customer") or request.headers.get('X-User-Id') or request.GET.get('userId')
            product_id = pk or request.data.get("product")
            
            if not user_id:
                return Response({"success": False, "message": "Customer ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not product_id:
                return Response({"success": False, "message": "Product ID required"}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"success": False, "message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            # Fetch or create customer profile
            try:
                customer = user.customer
            except Customer.DoesNotExist:
                return Response({"success": False, "message": "Favorite not found"}, status=status.HTTP_404_NOT_FOUND)

            # Find favorite and delete
            favorite = Favorites.objects.filter(customer=customer, product_id=product_id).first()
            if not favorite:
                return Response({"success": False, "message": "Favorite not found"}, status=status.HTTP_404_NOT_FOUND)

            favorite.delete()
            print(f"Favorite removed for product {product_id} by user {user_id}")
            return Response({"success": True, "message": "Removed from favorites"}, status=status.HTTP_200_OK)


        except Exception as e:
            return Response({
                "success": False,
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            
class SellerOrderList(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def order_list(self, request):
        """
        Get seller orders with shop_id parameter
        Query param: shop_id - Required shop ID
        """
        try:
            # Get shop_id from query parameters
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required",
                    "data": []
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get seller's shop
            from .models import Shop
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Shop not found",
                    "data": []
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get all orders for this shop
            from .models import Order, Delivery, Checkout, CartItem, Product
            
            # Prefetch related data efficiently
            deliveries_prefetch = Prefetch(
                'delivery_set',
                queryset=Delivery.objects.select_related('rider__rider')
            )
            
            product_prefetch = Prefetch(
                'product',
                queryset=Product.objects.select_related('shop')
            )
            
            cart_item_prefetch = Prefetch(
                'cart_item',
                queryset=CartItem.objects.select_related('product').prefetch_related(product_prefetch)
            )
            
            checkouts_prefetch = Prefetch(
                'checkout_set',
                queryset=Checkout.objects.select_related(
                    'cart_item',
                    'cart_item__product',
                    'voucher'
                ).prefetch_related(cart_item_prefetch)
            )
            
            # Get all orders with prefetched data
            orders = Order.objects.filter(
                checkout__cart_item__product__shop=shop
            ).select_related(
                'user'
            ).prefetch_related(
                deliveries_prefetch,
                checkouts_prefetch
            ).distinct().order_by('-created_at')
            
            # Prepare response data
            orders_data = []
            
            for order in orders:
                # Get delivery status
                delivery_status = None
                delivery = order.delivery_set.first()
                if delivery:
                    delivery_status = delivery.status
                
                # Calculate shipping status
                shipping_status = self._get_shipping_status(order.status, delivery_status)
                
                # Get checkouts for this shop only
                shop_checkouts = []
                for checkout in order.checkout_set.all():
                    if checkout.cart_item and checkout.cart_item.product.shop == shop:
                        shop_checkouts.append(checkout)
                
                if not shop_checkouts:
                    continue
                
                # Prepare order items
                order_items = []
                total_amount = 0
                
                for checkout in shop_checkouts:
                    cart_item = checkout.cart_item
                    if not cart_item or not cart_item.product:
                        continue
                    
                    product = cart_item.product
                    
                    # Get delivery info for this order
                    tracking_number = None
                    shipping_method = None
                    estimated_delivery = None
                    
                    if delivery:
                        tracking_number = f"TRK-{str(delivery.id)[:10]}"
                        shipping_method = "Standard Shipping"
                        if delivery.delivered_at:
                            estimated_delivery = delivery.delivered_at.strftime('%Y-%m-%d')
                        else:
                            estimated_delivery = (timezone.now() + timedelta(days=3)).strftime('%Y-%m-%d')
                    
                    order_items.append({
                        "id": str(checkout.id),
                        "cart_item": {
                            "id": str(cart_item.id),
                            "product": {
                                "id": str(product.id),
                                "name": product.name,
                                "price": float(product.price),
                                "variant": product.condition,  # Using condition as variant placeholder
                                "shop": {
                                    "id": str(shop.id),
                                    "name": shop.name
                                }
                            },
                            "quantity": cart_item.quantity
                        },
                        "quantity": checkout.quantity,
                        "total_amount": float(checkout.total_amount),
                        "status": shipping_status,
                        "created_at": checkout.created_at.isoformat(),
                        "shipping_status": shipping_status,
                        "is_shipped": shipping_status in ['shipped', 'in_transit', 'out_for_delivery', 'completed'],
                        "is_processed": shipping_status not in ['pending_shipment'],
                        "tracking_number": tracking_number,
                        "shipping_method": shipping_method,
                        "estimated_delivery": estimated_delivery
                    })
                    
                    total_amount += float(checkout.total_amount)
                
                # Format customer name
                customer_name = f"{order.user.first_name} {order.user.last_name}"
                if not customer_name.strip():
                    customer_name = order.user.username
                
                orders_data.append({
                    "order_id": str(order.order),
                    "user": {
                        "id": str(order.user.id),
                        "username": order.user.username,
                        "email": order.user.email,
                        "first_name": order.user.first_name,
                        "last_name": order.user.last_name,
                        "phone": order.user.contact_number or None
                    },
                    "status": shipping_status,
                    "total_amount": total_amount,
                    "payment_method": order.payment_method,
                    "delivery_address": order.delivery_address,
                    "created_at": order.created_at.isoformat(),
                    "updated_at": order.updated_at.isoformat(),
                    "items": order_items
                })
            
            return Response({
                "success": True,
                "message": "Orders retrieved successfully",
                "data": orders_data,
                "data_source": "database"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error retrieving orders: {str(e)}",
                "data": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_shipping_status(self, order_status, delivery_status):
        """Map order and delivery status to shipping status for UI"""
        if order_status == 'cancelled':
            return 'cancelled'
        elif order_status == 'completed':
            return 'completed'
        elif delivery_status:
            # Map delivery status to UI status
            status_map = {
                'pending': 'pending_shipment',
                'picked_up': 'in_transit',
                'delivered': 'completed'
            }
            return status_map.get(delivery_status, 'pending_shipment')
        else:
            return 'pending_shipment'
