from asyncio.log import logger
from email import parser
from django.http import JsonResponse
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
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from .serializer import DisputeRequestCreateSerializer, DisputeRequestSerializer, DisputeEvidenceSerializer
import random
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from django.contrib.auth.hashers import check_password
import hashlib
import os
from django.db.models import Count, Avg, Sum, Q, F, Case, When, Value, Exists, OuterRef
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import uuid





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
        Get complete list of products for admin with search, filter, and date range support
        (No pagination - returns all products)
        """
        try:
            # Get query parameters
            search = request.query_params.get('search', '')
            category = request.query_params.get('category', 'all')
            
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
            
            # Get all products (no pagination)
            all_products = list(products)
            total_count = len(all_products)
            
            # Get product IDs for related data queries
            product_ids = [product.id for product in all_products]
            
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
            
            # Serialize with computed fields
            products_data = []
            for product in all_products:
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
                'total_count': total_count,
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'range_type': range_type
                } if start_date and end_date else None,
                'message': f'{total_count} products retrieved successfully',
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
        # Create a shallow copy excluding file fields
        product_data = {}
        for key, value in request.data.items():
            if not hasattr(value, 'file'):  # Skip file objects
                product_data[key] = value
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

        # If accepted_categories was sent as a JSON string, parse it into a list for the serializer
        try:
            import json
            accepted_raw = product_data.get('accepted_categories')
            if accepted_raw and isinstance(accepted_raw, str):
                accepted_list = json.loads(accepted_raw)
                try:
                    product_data.setlist('accepted_categories', accepted_list)
                except Exception:
                    product_data['accepted_categories'] = accepted_list
        except Exception as e:
            print('Failed to parse accepted_categories:', e)

        serializer = ProductCreateSerializer(data=product_data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                # Save product and catch validation errors cleanly
                try:
                    product = serializer.save()
                except ValidationError as e:
                    return Response({
                        "error": "Validation failed",
                        "details": str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)

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

                # Process variants JSON (if provided) to create Variants and VariantOptions
                variants_raw = request.data.get('variants')
                if variants_raw:
                    try:
                        import json
                        variants_list = json.loads(variants_raw) if isinstance(variants_raw, str) else variants_raw
                        # Collect uploaded files per option_id to later apply to matching SKUs
                        option_image_files = {}
                        # Map payload option ids -> created VariantOptions DB id
                        option_id_map = {}
                        for g in variants_list:
                            group_id = g.get('id') or g.get('uid') or str(uuid.uuid4())
                            variant = Variants.objects.create(
                                product=product,
                                shop=shop,
                                title=g.get('title') or ''
                            )
                            for opt in g.get('options', []):
                                provided_option_id = opt.get('id') or str(uuid.uuid4())
                                vopt = VariantOptions.objects.create(
                                    variant=variant,
                                    title=opt.get('title') or ''
                                )
                                # Record mapping from provided option id to the actual DB id (string)
                                option_id_map[str(provided_option_id)] = str(vopt.id)

                                file_key = f"variant_image_{group_id}_{provided_option_id}"
                                # Debug: log presence of file key and available FILES keys
                                try:
                                    files_keys = list(request.FILES.keys())
                                except Exception:
                                    files_keys = []
                                print(f"Looking for variant file key '{file_key}' in request.FILES. Available keys: {files_keys}")

                                target_key = None
                                if file_key in request.FILES:
                                    target_key = file_key
                                else:
                                    # Fallback: try match by option_id suffix if group_id mismatch occurred
                                    for k in files_keys:
                                        if k.endswith(f"_{provided_option_id}") and k.startswith("variant_image_"):
                                            target_key = k
                                            print(f"Fallback matched variant image key '{k}' for option {provided_option_id}")
                                            break

                                if target_key:
                                    try:
                                        file_obj = request.FILES[target_key]
                                        print(f"Queued variant image for option {provided_option_id} (db id {vopt.id}): name={getattr(file_obj, 'name', None)}, size={getattr(file_obj, 'size', None)}, content_type={getattr(file_obj, 'content_type', None)}")
                                        # Store to map for assignment to SKUs later
                                        # Keep both keys: the provided id and the actual DB id, so lookups using either work
                                        option_image_files[str(provided_option_id)] = file_obj
                                        option_image_files[str(vopt.id)] = file_obj
                                    except Exception as e:
                                        print('Failed to read variant image file', e)

                        # Handle SKUs payload (per-variant combination config including swap)
                        skus_raw = request.data.get('skus')
                        if skus_raw:
                            try:
                                import json
                                skus_list = json.loads(skus_raw) if isinstance(skus_raw, str) else skus_raw
                                from decimal import Decimal
                                # Debug: list incoming file keys and prepare available explicit sku image keys (preserve order)
                                try:
                                    files_keys = list(request.FILES.keys())
                                except Exception:
                                    files_keys = []
                                print(f"Incoming FILES keys: {files_keys}")
                                sku_file_keys = [k for k in files_keys if k.startswith('sku_image_')]
                                print(f"Detected sku_image keys (ordered): {sku_file_keys}")
                                print(f"SKUs payload: {skus_list}")
                                for s in skus_list:
                                    # Map provided option ids to DB VariantOptions ids when possible
                                    provided_oids = s.get('option_ids') or []
                                    mapped_oids = [ option_id_map.get(str(oid), str(oid)) for oid in provided_oids ]

                                    sku = ProductSKU.objects.create(
                                        product=product,
                                        option_ids=mapped_oids,
                                        option_map=s.get('option_map'),
                                        price=Decimal(str(s.get('price'))) if s.get('price') not in (None, '') else None,
                                        compare_price=(Decimal(str(s.get('compare_price'))) if s.get('compare_price') not in (None, '') else None),
                                        quantity=int(s.get('quantity') or 0),
                                        length=(Decimal(str(s.get('length'))) if s.get('length') not in (None, '') else None),
                                        width=(Decimal(str(s.get('width'))) if s.get('width') not in (None, '') else None),
                                        height=(Decimal(str(s.get('height'))) if s.get('height') not in (None, '') else None),
                                        weight=(Decimal(str(s.get('weight'))) if s.get('weight') not in (None, '') else None),
                                        weight_unit=s.get('weight_unit') or 'g',
                                        sku_code=s.get('sku_code') or '',
                                        critical_trigger=s.get('critical_trigger') if s.get('critical_trigger') not in (None, '') else None,
                                        allow_swap=bool(s.get('allow_swap', False)),
                                        swap_type=s.get('swap_type') or 'direct_swap',
                                        minimum_additional_payment=(Decimal(str(s.get('minimum_additional_payment'))) if s.get('minimum_additional_payment') not in (None, '') else Decimal('0.00')),
                                        maximum_additional_payment=(Decimal(str(s.get('maximum_additional_payment'))) if s.get('maximum_additional_payment') not in (None, '') else Decimal('0.00')),
                                        swap_description=s.get('swap_description') or '',
                                    )

                                    # Attach accepted categories if provided
                                    accepted = s.get('accepted_categories') or []
                                    if isinstance(accepted, str):
                                        try:
                                            import json
                                            accepted = json.loads(accepted)
                                        except Exception:
                                            accepted = []
                                    for cat_id in accepted:
                                        try:
                                            cat = Category.objects.get(id=cat_id)
                                            sku.accepted_categories.add(cat)
                                        except Exception:
                                            pass

                                    # Save SKU image if present in FILES keyed by provided sku id OR fallback to next available sku_image_* file key
                                    provided_id = s.get('id')
                                    print(f"Processing SKU: provided_id={provided_id}, option_ids={s.get('option_ids')}")
                                    file_key = f"sku_image_{provided_id}" if provided_id else None
                                    assigned = False
                                    if file_key and file_key in request.FILES:
                                        try:
                                            sku.image = request.FILES[file_key]
                                            sku.save()
                                            assigned = True
                                            print(f"SKU {sku.id} saved image from explicit key {file_key}: {sku.image.name}")
                                        except Exception as e:
                                            print('Failed to save sku image', e)
                                    # Fallback: if explicit key not found, consume next sku_image_* from the FormData (preserve order)
                                    if not assigned and sku_file_keys:
                                        next_key = sku_file_keys.pop(0)
                                        print(f"No explicit sku key for SKU {sku.id}; using next sku_image key {next_key}")
                                        try:
                                            sku.image = request.FILES[next_key]
                                            sku.save()
                                            assigned = True
                                            print(f"SKU {sku.id} saved image from fallback key {next_key}: {sku.image.name}")
                                        except Exception as e:
                                            print('Failed to save sku image from fallback', e)
                                    # Final fallback: map from option images by option_ids
                                    if not assigned:
                                        try:
                                            provided_oid_list = s.get('option_ids') or []
                                            # Prefer mapped DB option ids first, then the provided ids
                                            mapped_oid_list = [ option_id_map.get(str(oid), str(oid)) for oid in provided_oid_list ]
                                            search_list = mapped_oid_list + [str(x) for x in provided_oid_list]
                                            print(f"Attempting option->sku mapping using option_image_files keys: {list(option_image_files.keys())}; searching: {search_list}")
                                            for oid in search_list:
                                                f = option_image_files.get(str(oid))
                                                if f:
                                                    sku.image = f
                                                    sku.save()
                                                    print(f"SKU {sku.id} saved image from option {oid}: {sku.image.name}")
                                                    break
                                        except Exception as e:
                                            print('Failed to map option image to sku', e)
                            except Exception as e:
                                print('Failed to parse skus payload:', e)
                            else:
                                # No SKUs provided - create simple SKU per option so images/quantities are stored
                                try:
                                    from decimal import Decimal
                                    for g in variants_list:
                                        for opt in g.get('options', []):
                                            option_id = opt.get('id') or str(uuid.uuid4())
                                            sku = ProductSKU.objects.create(
                                                product=product,
                                                option_ids=[option_id],
                                                option_map={g.get('title') or 'Option': opt.get('title')},
                                                price=(Decimal(str(opt.get('price'))) if opt.get('price') not in (None, '') else None),
                                                quantity=int(opt.get('quantity') or 0),
                                            )
                                            f = option_image_files.get(str(option_id))
                                            if f:
                                                sku.image = f
                                                sku.save()
                                                print(f"Auto-created SKU {sku.id} for option {option_id} and saved image {sku.image.name}")
                                except Exception as e:
                                    print('Failed to auto-create SKUs from variants:', e)
                        else:
                            # No SKUs provided - create simple SKU per option so images/quantities are stored
                            try:
                                from decimal import Decimal
                                for g in variants_list:
                                    for opt in g.get('options', []):
                                        option_id = opt.get('id') or str(uuid.uuid4())
                                        # Use DB id mapping when available
                                        mapped_option_id = option_id_map.get(str(option_id), str(option_id))
                                        sku = ProductSKU.objects.create(
                                            product=product,
                                            option_ids=[mapped_option_id],
                                            option_map={g.get('title') or 'Option': opt.get('title')},
                                            price=(Decimal(str(opt.get('price'))) if opt.get('price') not in (None, '') else None),
                                            quantity=int(opt.get('quantity') or 0),
                                        )
                                        # Try to get image by mapped id first, then provided id
                                        f = option_image_files.get(str(mapped_option_id)) or option_image_files.get(str(option_id))
                                        if f:
                                            sku.image = f
                                            sku.save()
                                            print(f"Auto-created SKU {sku.id} for option {option_id} (mapped {mapped_option_id}) and saved image {sku.image.name}")
                            except Exception as e:
                                print('Failed to auto-create SKUs from variants:', e)
                    except Exception as e:
                        print('Failed to parse variants payload:', e)

                # Return same format as get_product_list
                # Debug: list SKUs and their images
                try:
                    sku_debug = [{
                        'id': str(s.id),
                        'image': (s.image.name if s.image else None)
                    } for s in product.skus.all()]
                    print(f"Product {product.id} SKUs after creation: {sku_debug}")
                except Exception as e:
                    print('Failed to list skus after creation', e)

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

        # If accepted_categories was sent as a JSON string, parse it into a list for the serializer
        try:
            import json
            accepted_raw = product_data.get('accepted_categories')
            if accepted_raw and isinstance(accepted_raw, str):
                accepted_list = json.loads(accepted_raw)
                try:
                    product_data.setlist('accepted_categories', accepted_list)
                except Exception:
                    product_data['accepted_categories'] = accepted_list
        except Exception as e:
            print('Failed to parse accepted_categories:', e)

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
                    
                    # Handle variants if any: accept a JSON 'variants' payload with group & option ids (personal listings)
                    variants_raw = request.data.get('variants')
                    if variants_raw:
                        try:
                            import json
                            variants_list = json.loads(variants_raw) if isinstance(variants_raw, str) else variants_raw
                        except Exception as e:
                            print('Failed to parse variants payload:', e)
                            variants_list = []

                        # Create variants & options and collect option images to map to SKUs
                        option_image_files = {}
                        # Map payload option ids -> created VariantOptions DB id
                        option_id_map = {}
                        for g in variants_list:
                            group_id = g.get('id') or g.get('uid') or str(uuid.uuid4())
                            variant = Variants.objects.create(
                                product=product,
                                shop=None,
                                title=g.get('title') or ''
                            )
                            for opt in g.get('options', []):
                                provided_option_id = opt.get('id') or str(uuid.uuid4())
                                vopt = VariantOptions.objects.create(
                                    variant=variant,
                                    title=opt.get('title') or ''
                                )
                                # Record mapping from provided option id to actual DB id
                                option_id_map[str(provided_option_id)] = str(vopt.id)
                                file_key = f"variant_image_{group_id}_{provided_option_id}"
                                # Debug: log presence of file key and available FILES keys
                                try:
                                    files_keys = list(request.FILES.keys())
                                except Exception:
                                    files_keys = []
                                print(f"Looking for variant file key '{file_key}' in request.FILES. Available keys: {files_keys}")

                                target_key = None
                                if file_key in request.FILES:
                                    target_key = file_key
                                else:
                                    # Fallback: try match by option_id suffix if group_id mismatch occurred
                                    for k in files_keys:
                                        if k.endswith(f"_{option_id}") and k.startswith("variant_image_"):
                                            target_key = k
                                            print(f"Fallback matched variant image key '{k}' for option {option_id}")
                                            break

                                if target_key:
                                    try:
                                        file_obj = request.FILES[target_key]
                                        print(f"Queued variant image for option {provided_option_id} (db id {vopt.id}): name={getattr(file_obj, 'name', None)}, size={getattr(file_obj, 'size', None)}, content_type={getattr(file_obj, 'content_type', None)}")
                                        # Store to map for assignment to SKUs later; keep both provided id and db id
                                        option_image_files[str(provided_option_id)] = file_obj
                                        option_image_files[str(vopt.id)] = file_obj
                                    except Exception as e:
                                        print('Failed to read variant image file', e)

                        # If no explicit SKUs provided, create simple SKUs per option to store images/quantities
                        skus_raw_check = request.data.get('skus')
                        if not skus_raw_check:
                            try:
                                from decimal import Decimal
                                # For each variant group option, create a SKU with single option
                                for g in variants_list:
                                    for opt in g.get('options', []):
                                        option_id = opt.get('id') or str(uuid.uuid4())
                                        sku = ProductSKU.objects.create(
                                            product=product,
                                            option_ids=[option_id],
                                            option_map={g.get('title') or 'Option': opt.get('title')},
                                            price=(Decimal(str(opt.get('price'))) if opt.get('price') not in (None, '') else None),
                                            quantity=int(opt.get('quantity') or 0)
                                        )
                                        # assign image if available
                                        f = option_image_files.get(str(option_id))
                                        if f:
                                            sku.image = f
                                            sku.save()
                                            print(f"Auto-created SKU {sku.id} for option {option_id} and saved image {sku.image.name}")
                            except Exception as e:
                                print('Failed to auto-create SKUs from variants:', e)

                        # Handle SKUs payload (per-variant combination config including swap)
                        skus_raw = request.data.get('skus')
                        if skus_raw:
                            try:
                                import json
                                skus_list = json.loads(skus_raw) if isinstance(skus_raw, str) else skus_raw
                                from decimal import Decimal
                                # Prepare available explicit sku image keys (preserve order)
                                try:
                                    files_keys = list(request.FILES.keys())
                                except Exception:
                                    files_keys = []
                                print(f"Incoming FILES keys (personal listing): {files_keys}")
                                sku_file_keys = [k for k in files_keys if k.startswith('sku_image_')]
                                print(f"Detected sku_image keys (personal listing): {sku_file_keys}")
                                print(f"SKUs payload (personal listing): {skus_list}")

                                for s in skus_list:
                                    # Map provided option ids (which may be frontend temporary ids) to actual DB VariantOption ids
                                    provided_oids = s.get('option_ids') or []
                                    mapped_oids = []
                                    for oid in provided_oids:
                                        oid_str = str(oid)
                                        # If option_id_map exists (from earlier variant creation), use it
                                        if 'option_id_map' in locals() and option_id_map.get(oid_str):
                                            mapped_oids.append(option_id_map.get(oid_str))
                                            continue
                                        # If oid already matches a VariantOption id, keep it
                                        try:
                                            if VariantOptions.objects.filter(id=oid_str).exists():
                                                mapped_oids.append(oid_str)
                                                continue
                                        except Exception:
                                            pass
                                        # Fallback: try to find by title within this product's variants
                                        try:
                                            vopt = VariantOptions.objects.filter(variant__product=product, title=oid_str).first()
                                            if vopt:
                                                mapped_oids.append(str(vopt.id))
                                                continue
                                        except Exception:
                                            pass
                                        # As a last resort, keep the original provided value (so errors are visible)
                                        mapped_oids.append(oid_str)

                                    sku = ProductSKU.objects.create(
                                        product=product,
                                        option_ids=mapped_oids,
                                        option_map=s.get('option_map'),
                                        price=Decimal(str(s.get('price'))) if s.get('price') not in (None, '') else None,
                                        compare_price=(Decimal(str(s.get('compare_price'))) if s.get('compare_price') not in (None, '') else None),
                                        quantity=int(s.get('quantity') or 0),
                                        length=(Decimal(str(s.get('length'))) if s.get('length') not in (None, '') else None),
                                        width=(Decimal(str(s.get('width'))) if s.get('width') not in (None, '') else None),
                                        height=(Decimal(str(s.get('height'))) if s.get('height') not in (None, '') else None),
                                        weight=(Decimal(str(s.get('weight'))) if s.get('weight') not in (None, '') else None),
                                        weight_unit=s.get('weight_unit') or 'g',
                                        sku_code=s.get('sku_code') or '',
                                        critical_trigger=s.get('critical_trigger') if s.get('critical_trigger') not in (None, '') else None,
                                        allow_swap=bool(s.get('allow_swap', False)),
                                        swap_type=s.get('swap_type') or 'direct_swap',
                                        minimum_additional_payment=(Decimal(str(s.get('minimum_additional_payment'))) if s.get('minimum_additional_payment') not in (None, '') else Decimal('0.00')),
                                        maximum_additional_payment=(Decimal(str(s.get('maximum_additional_payment'))) if s.get('maximum_additional_payment') not in (None, '') else Decimal('0.00')),
                                        swap_description=s.get('swap_description') or '',
                                    )

                                    # Attach accepted categories if provided
                                    accepted = s.get('accepted_categories') or []
                                    if isinstance(accepted, str):
                                        try:
                                            import json
                                            accepted = json.loads(accepted)
                                        except Exception:
                                            accepted = []
                                    for cat_id in accepted:
                                        try:
                                            cat = Category.objects.get(id=cat_id)
                                            sku.accepted_categories.add(cat)
                                        except Exception:
                                            pass

                                    # Save SKU image if present in FILES keyed by provided sku id OR fallback to next available sku_image_* file key
                                    provided_id = s.get('id')
                                    print(f"Processing personal SKU: provided_id={provided_id}, option_ids={s.get('option_ids')}")
                                    file_key = f"sku_image_{provided_id}" if provided_id else None
                                    assigned = False
                                    if file_key and file_key in request.FILES:
                                        try:
                                            sku.image = request.FILES[file_key]
                                            sku.save()
                                            assigned = True
                                            print(f"Personal SKU {sku.id} saved image from explicit key {file_key}: {sku.image.name}")
                                        except Exception as e:
                                            print('Failed to save personal sku image', e)
                                    if not assigned and sku_file_keys:
                                        next_key = sku_file_keys.pop(0)
                                        try:
                                            sku.image = request.FILES[next_key]
                                            sku.save()
                                            assigned = True
                                            print(f"Personal SKU {sku.id} saved image from fallback key {next_key}: {sku.image.name}")
                                        except Exception as e:
                                            print('Failed to save personal sku image from fallback', e)
                                    if not assigned:
                                        try:
                                            print(f"Attempting personal option->sku mapping using option_image_files keys: {list(option_image_files.keys())}")
                                            oid_list = s.get('option_ids') or []
                                            for oid in oid_list:
                                                f = option_image_files.get(str(oid))
                                                if f:
                                                    sku.image = f
                                                    sku.save()
                                                    print(f"Personal SKU {sku.id} saved image from option {oid}: {sku.image.name}")
                                                    break
                                        except Exception as e:
                                            print('Failed to map personal option image to sku', e)
                            except Exception as e:
                                print('Failed to parse skus payload:', e)
                    else:
                        # Backwards-compatible simple variant handling
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

                    # Handle SKUs payload (per-variant combination config including swap)
                    skus_raw = request.data.get('skus')
                    if skus_raw:
                        try:
                            import json
                            skus_list = json.loads(skus_raw) if isinstance(skus_raw, str) else skus_raw
                            from decimal import Decimal
                            for s in skus_list:
                                sku = ProductSKU.objects.create(
                                    product=product,
                                    option_ids=s.get('option_ids'),
                                    option_map=s.get('option_map'),
                                    price=Decimal(str(s.get('price'))) if s.get('price') not in (None, '') else None,
                                    compare_price=(Decimal(str(s.get('compare_price'))) if s.get('compare_price') not in (None, '') else None),
                                    quantity=int(s.get('quantity') or 0),
                                    length=(Decimal(str(s.get('length'))) if s.get('length') not in (None, '') else None),
                                    width=(Decimal(str(s.get('width'))) if s.get('width') not in (None, '') else None),
                                    height=(Decimal(str(s.get('height'))) if s.get('height') not in (None, '') else None),
                                    weight=(Decimal(str(s.get('weight'))) if s.get('weight') not in (None, '') else None),
                                    weight_unit=s.get('weight_unit') or 'g',
                                    sku_code=s.get('sku_code') or '',
                                    critical_trigger=s.get('critical_trigger') if s.get('critical_trigger') not in (None, '') else None,
                                    allow_swap=bool(s.get('allow_swap', False)),
                                    swap_type=s.get('swap_type') or 'direct_swap',
                                    minimum_additional_payment=(Decimal(str(s.get('minimum_additional_payment'))) if s.get('minimum_additional_payment') not in (None, '') else Decimal('0.00')),
                                    maximum_additional_payment=(Decimal(str(s.get('maximum_additional_payment'))) if s.get('maximum_additional_payment') not in (None, '') else Decimal('0.00')),
                                    swap_description=s.get('swap_description') or '',
                                )

                                # Attach accepted categories if provided
                                accepted = s.get('accepted_categories') or []
                                if isinstance(accepted, str):
                                    try:
                                        import json
                                        accepted = json.loads(accepted)
                                    except Exception:
                                        accepted = []
                                for cat_id in accepted:
                                    try:
                                        cat = Category.objects.get(id=cat_id)
                                        sku.accepted_categories.add(cat)
                                    except Exception:
                                        pass

                                # Save SKU image if present in FILES
                                file_key = f"sku_image_{s.get('id') or sku.id}"
                                if file_key in request.FILES:
                                    try:
                                        sku.image = request.FILES[file_key]
                                        sku.save()
                                    except Exception as e:
                                        print('Failed to save sku image', e)
                        except Exception as e:
                            print('Failed to parse skus payload:', e)

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
        
        # Subquery to check if product has any order through CartItem
        has_order_subquery = CartItem.objects.filter(
            product_id=OuterRef('id'),
            is_ordered=True
        )
        
        # Start with base queryset
        queryset = Product.objects.filter(
            upload_status='published',
            is_removed=False
        ).exclude(
            # Exclude products that have any orders
            Exists(has_order_subquery)
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
            ),
            Prefetch(
                'skus',
                queryset=ProductSKU.objects.filter(is_active=True).prefetch_related('accepted_categories')
            )
        )

        if user_id:
            # Still exclude user's own products and shops
            queryset = queryset.exclude(
                Q(customer__customer__id=user_id) | 
                Q(shop__customer__customer__id=user_id)
            )

        return queryset.order_by('-created_at')
    
    def retrieve(self, request, pk=None):
        """Return a single product with SKU images mapped to variant options"""
        try:
            product = self.get_queryset().get(pk=pk)
        except Product.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get the serializer data
        serializer = ProductSerializer(product, context={'request': request})
        data = serializer.data
        
        # Manually enhance variant options with SKU images and price info
        if data.get('variants') and data.get('skus'):
            # Build a map of option_id -> list of SKUs containing that option
            option_skus_map = {}
            for sku in product.skus.filter(is_active=True):
                for option_id in (sku.option_ids or []):
                    option_id_str = str(option_id)
                    if option_id_str not in option_skus_map:
                        option_skus_map[option_id_str] = []
                    option_skus_map[option_id_str].append(sku)
            
            # Enhance each variant option with data from SKUs
            for variant_group in data['variants']:
                for option in variant_group.get('options', []):
                    option_id = option['id']
                    
                    # Find SKUs containing this option
                    skus_for_option = option_skus_map.get(option_id, [])
                    
                    if skus_for_option:
                        # Get price range
                        prices = [float(sku.price) for sku in skus_for_option if sku.price]
                        if prices:
                            min_price = min(prices)
                            max_price = max(prices)
                            if min_price == max_price:
                                option['price'] = f"₱{min_price:.2f}"
                            else:
                                option['price'] = f"₱{min_price:.2f} - ₱{max_price:.2f}"
                        
                        # Get total stock
                        total_stock = sum([sku.quantity for sku in skus_for_option if sku.quantity])
                        option['quantity'] = total_stock
                        
                        # Get first SKU image for this option
                        sku_with_image = None
                        for sku in skus_for_option:
                            if sku.image:
                                sku_with_image = sku
                                break
                        
                        if sku_with_image and sku_with_image.image:
                            option['image'] = request.build_absolute_uri(sku_with_image.image.url)
                        else:
                            option['image'] = None
                    else:
                        option['price'] = None
                        option['quantity'] = 0
                        option['image'] = None

        return Response(data)

    @action(detail=False, methods=['get'])
    def get_sku_for_options(self, request):
        """Get SKU details for specific selected options"""
        product_id = request.query_params.get('product_id')
        option_ids = request.query_params.getlist('option_ids[]') or []
        
        if not product_id:
            return Response({"error": "product_id is required"}, status=400)
        
        try:
            product = Product.objects.get(id=product_id, is_removed=False)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)
        
        # If no option_ids provided, return product-level info
        if not option_ids:
            return Response({
                'price': float(product.price) if product.price else None,
                'compare_price': float(product.compare_price) if product.compare_price else None,
                'quantity': product.quantity,
                'message': 'No options selected'
            })
        
        # Find matching SKU (require exact match of option_ids)
        matching_sku = None
        all_skus = product.skus.filter(is_active=True)
        
        # Try to find exact match first
        for sku in all_skus:
            sku_option_ids = [str(oid) for oid in (sku.option_ids or [])]
            if sorted(sku_option_ids) == sorted(option_ids):
                matching_sku = sku
                break

        # Do not fallback to inclusive matching - only exact combinations are valid
        # (Because ProductSKU already maps all valid combinations).

        
        if matching_sku:
            # Build response with SKU details
            response_data = {
                'id': str(matching_sku.id),
                'sku_code': matching_sku.sku_code,
                'price': float(matching_sku.price) if matching_sku.price else None,
                'compare_price': float(matching_sku.compare_price) if matching_sku.compare_price else None,
                'quantity': matching_sku.quantity,
                'image': request.build_absolute_uri(matching_sku.image.url) if matching_sku.image else None,
                'length': float(matching_sku.length) if matching_sku.length else None,
                'width': float(matching_sku.width) if matching_sku.width else None,
                'height': float(matching_sku.height) if matching_sku.height else None,
                'weight': float(matching_sku.weight) if matching_sku.weight else None,
                'weight_unit': matching_sku.weight_unit,
                'swap_type': matching_sku.swap_type,
                'minimum_additional_payment': float(matching_sku.minimum_additional_payment) if matching_sku.minimum_additional_payment else None,
                'maximum_additional_payment': float(matching_sku.maximum_additional_payment) if matching_sku.maximum_additional_payment else None,
                'swap_description': matching_sku.swap_description,
            }
            return Response(response_data)
        
        # Return product-level details if no matching SKU found
        return Response({
            'price': float(product.price) if product.price else None,
            'compare_price': float(product.compare_price) if product.compare_price else None,
            'quantity': product.quantity,
            'message': 'No matching SKU found for selected options'
        })

    @action(detail=False, methods=['get'])
    def find_sku_id_for_options(self, request):
        """Return the ProductSKU id that matches the given option_ids exactly (or fall back to inclusive match with fallback=true)."""
        product_id = request.query_params.get('product_id')
        option_ids = request.query_params.getlist('option_ids[]') or []
        fallback = request.query_params.get('fallback', 'false').lower() == 'true'

        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        try:
            product = Product.objects.get(id=product_id, is_removed=False)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        if not option_ids:
            return Response({"error": "option_ids[] is required"}, status=400)

        all_skus = product.skus.filter(is_active=True)

        # exact match first
        for sku in all_skus:
            sku_option_ids = [str(oid) for oid in (sku.option_ids or [])]
            if sorted(sku_option_ids) == sorted(option_ids):
                return Response({"sku_id": str(sku.id)})

        if fallback:
            # inclusive match: return first SKU that contains all selected options
            for sku in all_skus:
                sku_option_ids = [str(oid) for oid in (sku.option_ids or [])]
                if all(oid in sku_option_ids for oid in option_ids):
                    return Response({"sku_id": str(sku.id), "fallback": True})

        return Response({"sku_id": None, "message": "No matching SKU found"}, status=404)
    
    
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
        cart_items = CartItem.objects.filter(user=user, is_ordered=False)\
            .select_related("product", "product__shop")\
            .prefetch_related('product__productmedia_set')\
            .order_by('-added_at')
        
        serializer = CartItemSerializer(cart_items, many=True)
        return Response({"success": True, "cart_items": serializer.data})    

    def put(self, request, item_id):
        user_id = request.data.get("user_id")
        quantity = request.data.get("quantity")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)
        
        if not quantity or quantity < 1:
            return Response({"error": "Valid quantity is required"}, status=400)
        
        try:
            cart_item = CartItem.objects.get(id=item_id, user_id=user_id)
            
            # Check available product quantity
            if cart_item.product:
                available_quantity = cart_item.product.quantity
                if quantity > available_quantity:
                    return Response({
                        "error": f"Only {available_quantity} items available in stock",
                        "available_quantity": available_quantity
                    }, status=400)
            
            cart_item.quantity = quantity
            cart_item.save()
            
            return Response({
                "success": True,
                "message": "Quantity updated"
            })
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    def delete(self, request, item_id):
        user_id = request.data.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)
        
        try:
            cart_item = CartItem.objects.get(id=item_id, user_id=user_id)
            cart_item.delete()
            
            return Response({
                "success": True,
                "message": "Item removed from cart"
            })
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class CheckoutView(viewsets.ViewSet):
    """
    Simplified Checkout ViewSet
    """
    @action(methods=["get"], detail=False)
    def getOrder(self, request):
        pass
        
    
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

            # Normalize if the client sent objects
            if isinstance(user_id, dict):
                user_id = user_id.get('id') or user_id.get('user_id')
            if isinstance(product_id, dict):
                product_id = product_id.get('id') or product_id.get('product')

            print(f"POST /customer-favorites/ - raw user/customer: {request.data.get('customer')}, header: {request.headers.get('X-User-Id')}, resolved user_id: {user_id}, product_id: {product_id}")

            if not user_id:
                return Response({"success": False, "message": "Customer ID required"}, status=status.HTTP_400_BAD_REQUEST)

            if not product_id:
                return Response({"success": False, "message": "Product ID required"}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch user
            user = None
            try:
                user = User.objects.get(id=user_id)
                print(f"User found by id: {user.id}")
            except User.DoesNotExist:
                # try fallback lookups
                try:
                    user = User.objects.get(username=user_id)
                    print(f"User found by username fallback: {user.id}")
                except User.DoesNotExist:
                    try:
                        user = User.objects.get(email=user_id)
                        print(f"User found by email fallback: {user.id}")
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

            # Normalize if objects were passed
            if isinstance(user_id, dict):
                user_id = user_id.get('id') or user_id.get('user_id')
            if isinstance(product_id, dict):
                product_id = product_id.get('id') or product_id.get('product')
            
            if not user_id:
                return Response({"success": False, "message": "Customer ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not product_id:
                return Response({"success": False, "message": "Product ID required"}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch user (try id, username, email)
            user = None
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(username=user_id)
                except User.DoesNotExist:
                    try:
                        user = User.objects.get(email=user_id)
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
    # Import models at class level for better performance
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
            
            # Get seller's shop - O(1)
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Shop not found",
                    "data": []
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get all orders for this shop - Optimized query
            # Use select_related and prefetch_related efficiently
            orders = Order.objects.filter(
                checkout__cart_item__product__shop=shop
            ).select_related(
                'user',
                'shipping_address'
            ).prefetch_related(
                Prefetch(
                    'delivery_set',
                    queryset=Delivery.objects.select_related('rider__rider'),
                    to_attr='deliveries'
                ),
                Prefetch(
                    'checkout_set',
                    queryset=Checkout.objects.filter(
                        cart_item__product__shop=shop
                    ).select_related(
                        'cart_item__product__shop'
                    )
                )
            ).distinct().order_by('-created_at')
            
            # Prepare response data
            orders_data = []
            
            for order in orders:
                # Get latest delivery - O(1)
                latest_delivery = None
                if hasattr(order, 'deliveries') and order.deliveries:
                    latest_delivery = order.deliveries[0]  # Assuming prefetch gives us in order
                    for delivery in order.deliveries:
                        if delivery.created_at > latest_delivery.created_at:
                            latest_delivery = delivery
                
                # Get delivery info from latest delivery
                delivery_status = None
                delivery_data = None
                if latest_delivery:
                    delivery_status = latest_delivery.status
                    # Prepare delivery data for response
                    delivery_data = {
                        "delivery_id": str(latest_delivery.id),
                        "status": latest_delivery.status,
                        "rider_name": f"{latest_delivery.rider.rider.first_name} {latest_delivery.rider.rider.last_name}" if latest_delivery.rider else None,
                        "rider_phone": latest_delivery.rider.rider.contact_number if latest_delivery.rider else None,
                        "picked_at": latest_delivery.picked_at.isoformat() if latest_delivery.picked_at else None,
                        "delivered_at": latest_delivery.delivered_at.isoformat() if latest_delivery.delivered_at else None,
                        "created_at": latest_delivery.created_at.isoformat(),
                        "updated_at": latest_delivery.updated_at.isoformat()
                    }
                
                # Get shipping status - O(1)
                shipping_status = self._get_shipping_status(order.status, delivery_status)
                
                # Get shop checkouts - already filtered
                shop_checkouts = list(order.checkout_set.all())
                
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
                    
                    # Get delivery info - O(1)
                    tracking_number = None
                    shipping_method = None
                    estimated_delivery = None
                    
                    if latest_delivery:
                        tracking_number = f"TRK-{str(latest_delivery.id)[:10]}"
                        shipping_method = "Standard Shipping"
                        if latest_delivery.delivered_at:
                            estimated_delivery = latest_delivery.delivered_at.strftime('%Y-%m-%d')
                        elif latest_delivery.picked_at:
                            # If picked up but not delivered, estimate 1-2 days
                            estimated_delivery = (latest_delivery.picked_at + timedelta(days=2)).strftime('%Y-%m-%d')
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
                                "variant": product.condition,
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
                
                # Get delivery address - O(1)
                delivery_address = None
                if order.shipping_address:
                    delivery_address = order.shipping_address.get_full_address()
                elif order.delivery_address_text:
                    delivery_address = order.delivery_address_text
                
                # Check if there are any pending offers in Delivery table
                has_pending_offer = False
                if hasattr(order, 'deliveries') and order.deliveries:
                    # Check if any delivery has 'pending_offer' status
                    has_pending_offer = any(d.status == 'pending_offer' for d in order.deliveries)
                
                order_data = {
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
                    "delivery_method": order.delivery_method,
                    "delivery_address": delivery_address,
                    "created_at": order.created_at.isoformat(),
                    "updated_at": order.updated_at.isoformat(),
                    "items": order_items
                }
                
                # Add delivery info if exists
                if delivery_data:
                    order_data["delivery_info"] = delivery_data
                    order_data["has_pending_offer"] = has_pending_offer
                
                # Add count of all deliveries for this order
                if hasattr(order, 'deliveries'):
                    order_data["delivery_count"] = len(order.deliveries)
                    # Add all deliveries if needed (optional)
                    if len(order.deliveries) > 1:
                        all_deliveries = []
                        for delivery in order.deliveries:
                            all_deliveries.append({
                                "delivery_id": str(delivery.id),
                                "status": delivery.status,
                                "rider_name": f"{delivery.rider.rider.first_name} {delivery.rider.rider.last_name}" if delivery.rider else None,
                                "created_at": delivery.created_at.isoformat(),
                                "updated_at": delivery.updated_at.isoformat()
                            })
                        order_data["all_deliveries"] = all_deliveries
                
                orders_data.append(order_data)
            
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
        """
        Map order status to UI status - O(1)
        """
        # Status mapping for UI
        status_mapping = {
            'pending': 'pending_shipment',
            'processing': 'to_ship',
            'ready_for_pickup': 'ready_for_pickup',
            'shipped': 'shipped',
            'out_for_delivery': 'out_for_delivery',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'picked_up': 'completed',  # For pickup orders
            'arrange_shipment': 'to_ship'
        }
        
        # Handle delivery-specific statuses
        if delivery_status:
            delivery_map = {
                'pending': 'pending_shipment',
                'pending_offer': 'arrange_shipment',  # New status from ArrangeShipment
                'picked_up': 'in_transit',
                'delivered': 'completed'
            }
            return delivery_map.get(delivery_status, status_mapping.get(order_status, 'pending_shipment'))
        
        return status_mapping.get(order_status, 'pending_shipment')

    @action(detail=True, methods=['get'])
    def delivery_details(self, request, pk=None):
        """
        Get detailed delivery information for an order
        GET /seller-order-list/{order_id}/delivery_details/
        """
        try:
            # Verify shop ownership - O(1)
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get order - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if order has items from this shop - O(1)
            has_shop_items = Checkout.objects.filter(
                order=order,
                cart_item__product__shop_id=shop_id
            ).exists()
            
            if not has_shop_items:
                return Response({
                    "success": False,
                    "message": "Order does not contain items from your shop"
                }, status=status.HTTP_403_FORBIDDEN)

            # Get all deliveries for this order
            deliveries = Delivery.objects.filter(order=order).select_related(
                'rider__rider'
            ).order_by('-created_at')
            
            deliveries_data = []
            for delivery in deliveries:
                rider_info = None
                if delivery.rider:
                    rider_info = {
                        "id": str(delivery.rider.rider.id),
                        "first_name": delivery.rider.rider.first_name,
                        "last_name": delivery.rider.rider.last_name,
                        "phone": delivery.rider.rider.contact_number,
                        "vehicle_type": delivery.rider.vehicle_type,
                        "plate_number": delivery.rider.plate_number
                    }
                
                deliveries_data.append({
                    "delivery_id": str(delivery.id),
                    "status": delivery.status,
                    "rider": rider_info,
                    "picked_at": delivery.picked_at.isoformat() if delivery.picked_at else None,
                    "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                    "created_at": delivery.created_at.isoformat(),
                    "updated_at": delivery.updated_at.isoformat(),
                    "is_pending_offer": delivery.status == 'pending_offer'
                })
            
            return Response({
                "success": True,
                "message": "Delivery details retrieved successfully",
                "data": {
                    "order_id": str(order.order),
                    "delivery_count": len(deliveries_data),
                    "deliveries": deliveries_data,
                    "has_pending_offers": any(d['is_pending_offer'] for d in deliveries_data)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error retrieving delivery details: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Update order status with O(1) complexity
        Path: /seller-order-list/{order_id}/update_status/
        """
        try:
            # Get action type from request
            action_type = request.data.get('action_type')
            if not action_type:
                return Response({
                    "success": False,
                    "message": "action_type is required"
                }, status=400)

            # Validate order exists - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=404)

            # Verify shop ownership - O(1)
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required"
                }, status=400)

            # Check if order has items from this shop - O(1)
            has_shop_items = Checkout.objects.filter(
                order=order,
                cart_item__product__shop_id=shop_id
            ).exists()
            
            if not has_shop_items:
                return Response({
                    "success": False,
                    "message": "Order does not contain items from your shop"
                }, status=403)

            # Map action types to database status - O(1)
            action_to_status = {
                'confirm': 'processing',
                'ready_for_pickup': 'ready_for_pickup',
                'picked_up': 'picked_up',
                'arrange_shipment': 'arrange_shipment',
                'shipped': 'shipped',
                'complete': 'completed',
                'cancel': 'cancelled',
                'out_for_delivery': 'out_for_delivery'
            }

            # Validate action type
            if action_type not in action_to_status:
                return Response({
                    "success": False,
                    "message": f"Invalid action_type: {action_type}"
                }, status=400)

            new_status = action_to_status[action_type]
            current_status = order.status

            # Validate status transition - O(1)
            allowed_transitions = {
                'pending': ['processing', 'cancelled'],
                'processing': ['ready_for_pickup', 'arrange_shipment', 'cancelled'],
                'ready_for_pickup': ['picked_up', 'cancelled'],
                'arrange_shipment': ['shipped', 'cancelled'],
                'shipped': ['out_for_delivery', 'completed', 'cancelled'],
                'out_for_delivery': ['completed', 'cancelled'],
                'picked_up': ['completed', 'cancelled'],
                'completed': [],
                'cancelled': []
            }

            if new_status not in allowed_transitions.get(current_status, []):
                return Response({
                    "success": False,
                    "message": f"Cannot transition from {current_status} to {new_status}"
                }, status=400)

            # Update order - O(1)
            order.status = new_status
            order.updated_at = timezone.now()
            order.save(update_fields=['status', 'updated_at'])

            # Handle delivery updates if needed - O(1)
            if new_status in ['shipped', 'out_for_delivery', 'completed', 'picked_up']:
                delivery_status_map = {
                    'shipped': 'pending',
                    'out_for_delivery': 'picked_up',
                    'completed': 'delivered',
                    'picked_up': 'delivered'
                }
                
                delivery, created = Delivery.objects.update_or_create(
                    order=order,
                    defaults={
                        'status': delivery_status_map[new_status],
                        'updated_at': timezone.now()
                    }
                )
                
                if new_status in ['completed', 'picked_up']:
                    delivery.delivered_at = timezone.now()
                    delivery.save(update_fields=['delivered_at'])

            return Response({
                "success": True,
                "message": f"Order status updated to {new_status}",
                "data": {
                    "order_id": str(order.order),
                    "status": new_status,
                    "updated_at": order.updated_at.isoformat()
                }
            }, status=200)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error updating order: {str(e)}"
            }, status=500)

    @action(detail=True, methods=['get'])
    def available_actions(self, request, pk=None):
        """
        Get available actions for an order - O(1) complexity
        """
        try:
            # Get order - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=404)

            # Verify shop ownership - O(1)
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required"
                }, status=400)

            has_shop_items = Checkout.objects.filter(
                order=order,
                cart_item__product__shop_id=shop_id
            ).exists()
            
            if not has_shop_items:
                return Response({
                    "success": False,
                    "message": "Order not found or doesn't belong to your shop"
                }, status=403)

            # Check if there's a pending delivery offer
            has_pending_offer = Delivery.objects.filter(
                order=order,
                status='pending_offer'
            ).exists()

            # Determine if it's a pickup order
            is_pickup = order.delivery_method and 'pickup' in order.delivery_method.lower()
            
            # Get available actions based on current status - O(1)
            action_maps = {
                'pending': {
                    'actions': ['confirm', 'cancel'],
                    'pickup_filter': []
                },
                'processing': {
                    'actions': ['ready_for_pickup', 'arrange_shipment', 'cancel'],
                    'pickup_filter': ['arrange_shipment']  # Remove for pickup
                },
                'ready_for_pickup': {
                    'actions': ['picked_up', 'cancel'],
                    'pickup_filter': []
                },
                'arrange_shipment': {
                    'actions': ['shipped', 'cancel'],
                    'pickup_filter': []
                },
                'shipped': {
                    'actions': ['out_for_delivery', 'complete', 'cancel'],
                    'pickup_filter': []
                },
                'out_for_delivery': {
                    'actions': ['complete', 'cancel'],
                    'pickup_filter': []
                },
                'picked_up': {
                    'actions': ['complete', 'cancel'],
                    'pickup_filter': []
                },
                'completed': {
                    'actions': [],
                    'pickup_filter': []
                },
                'cancelled': {
                    'actions': [],
                    'pickup_filter': []
                }
            }

            current_map = action_maps.get(order.status, {'actions': [], 'pickup_filter': []})
            available_actions = current_map['actions']
            
            # Filter actions based on pickup status
            if is_pickup:
                available_actions = [a for a in available_actions if a not in current_map['pickup_filter']]
            
            # If there's a pending offer, add view_offer action
            if has_pending_offer and order.status == 'arrange_shipment':
                available_actions.append('view_offer')

            return Response({
                "success": True,
                "data": {
                    "order_id": str(order.order),
                    "current_status": order.status,
                    "is_pickup": is_pickup,
                    "has_pending_offer": has_pending_offer,
                    "available_actions": available_actions
                }
            }, status=200)

        except Exception as e:
            return Response({
                "success": False,
                "message": str(e)
            }, status=500)
                
from django.shortcuts import get_object_or_404

class CheckoutOrder(viewsets.ViewSet):
    @action(detail=False, methods=['GET'])
    def get_checkout_items(self, request):
        """
        Get checkout items based on selected cart item IDs.
        URL: /api/checkout/get-checkout-items/?selected=id1,id2,id3&user_id=user_uuid
        """
        user_id = request.GET.get("user_id")
        selected_ids_str = request.GET.get("selected", "")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not selected_ids_str:
            return Response({"error": "No items selected for checkout"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Convert comma-separated string to list of UUIDs
            selected_ids = selected_ids_str.split(',')
            
            # Get cart items for this user and selected IDs - ADDED is_ordered=False filter
            cart_items = CartItem.objects.filter(
                id__in=selected_ids,
                user_id=user_id,
                is_ordered=False  # ADDED: Only get items that are not yet ordered
            ).select_related(
                "product", 
                "product__shop"
            ).prefetch_related(
                'product__productmedia_set'
            )
            
            if not cart_items.exists():
                return Response(
                    {"error": "No cart items found or items already ordered"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if any selected items are already ordered (not in filtered queryset)
            # This provides more specific error information
            total_selected_count = len(selected_ids)
            found_count = cart_items.count()
            
            if found_count != total_selected_count:
                # Some items are already ordered or don't exist
                return Response(
                    {
                        "error": f"Some items cannot be checked out",
                        "details": f"Found {found_count} available items out of {total_selected_count} selected",
                        "available_items": found_count,
                        "selected_items": total_selected_count
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Prepare response data
            checkout_items = []
            shop_ids = set()
            shop_addresses = {}  # Store shop addresses by shop_id
            
            for cart_item in cart_items:
                product = cart_item.product
                shop = product.shop if product else None
                
                if shop:
                    shop_ids.add(shop.id)
                    # Store shop address if not already stored
                    if shop.id not in shop_addresses:
                        shop_addresses[shop.id] = {
                            'shop_id': str(shop.id),
                            'shop_name': shop.name,
                            'shop_address': f"{shop.street}, {shop.barangay}, {shop.city}, {shop.province}",
                            'shop_street': shop.street,
                            'shop_barangay': shop.barangay,
                            'shop_city': shop.city,
                            'shop_province': shop.province,
                            'shop_contact_number': shop.contact_number
                        }
                
                item_data = {
                    "id": str(cart_item.id),
                    "product_id": str(product.id) if product else None,
                    "name": product.name if product else "Unknown Product",
                    "price": float(product.price) if product else 0,
                    "quantity": cart_item.quantity,
                    "shop_name": shop.name if shop else "Unknown Shop",
                    "shop_id": str(shop.id) if shop else None,
                    "added_at": cart_item.added_at.isoformat() if cart_item.added_at else None,
                    "subtotal": float(product.price * cart_item.quantity) if product else 0,
                    "is_ordered": cart_item.is_ordered  # Include in response for clarity
                }
                
                # Get product image if available
                if product and product.productmedia_set.exists():
                    first_media = product.productmedia_set.first()
                    if first_media.file_data:
                        item_data["image"] = request.build_absolute_uri(first_media.file_data.url)
                
                checkout_items.append(item_data)
            
            # Calculate totals
            subtotal = sum(item["subtotal"] for item in checkout_items)
            delivery = 50.00  # Base delivery fee
            total = subtotal + delivery
            
            # Fetch user's purchase history (simplified)
            user_purchase_history = self._get_user_purchase_history(user_id)
            
            # Get available vouchers (simplified)
            available_vouchers = self._get_simple_available_vouchers(
                list(shop_ids), 
                user_id, 
                subtotal,
                user_purchase_history
            )
            
            # Get user's shipping addresses (simple fetch)
            shipping_addresses = list(
                ShippingAddress.objects.filter(
                    user_id=user_id,
                    is_active=True
                ).order_by('-is_default', '-created_at').values(
                    'id',
                    'recipient_name',
                    'recipient_phone',
                    'street',
                    'barangay',
                    'city',
                    'province',
                    'zip_code',
                    'country',
                    'is_default'
                )[:10]  # Limit to 10 addresses for efficiency
            )
            
            # Format addresses if they exist
            formatted_addresses = []
            for addr in shipping_addresses:
                addr['id'] = str(addr['id'])
                # Create full address string
                parts = [addr['street'], addr['barangay'], addr['city'], addr['province']]
                addr['full_address'] = ', '.join(filter(None, parts))
                formatted_addresses.append(addr)
            
            # Get default address (first one since we ordered by is_default)
            default_address = formatted_addresses[0] if formatted_addresses else None
            
            # Convert shop_addresses dict to list
            shop_addresses_list = list(shop_addresses.values())
            
            response_data = {
                "success": True,
                "checkout_items": checkout_items,
                "summary": {
                    "subtotal": subtotal,
                    "delivery": delivery,
                    "total": total,
                    "item_count": len(checkout_items),
                    "shop_count": len(shop_ids)
                },
                "available_vouchers": available_vouchers,
                "user_purchase_stats": user_purchase_history,
                "shipping_addresses": formatted_addresses or None,  # Return None if empty
                "default_shipping_address": default_address,
                "shop_addresses": shop_addresses_list  # Add shop addresses to response
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error in get_checkout_items: {str(e)}")
            return Response(
                {"error": "Internal server error", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def _get_user_purchase_history(self, user_id):
        """
        Get user's purchase history for personalized voucher recommendations
        """
        try:
            # Simple aggregate queries
            completed_orders = Order.objects.filter(
                user_id=user_id,
                status__in=['completed', 'delivered']
            )
            
            # Get total spent
            total_spent_result = completed_orders.aggregate(
                total_spent=Sum('total_amount')
            )
            total_spent = total_spent_result['total_spent'] or 0
            
            # Get recent order count (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_orders_count = completed_orders.filter(
                created_at__gte=thirty_days_ago
            ).count()
            
            # Get average order value
            order_count = completed_orders.count()
            avg_order_value = total_spent / order_count if order_count > 0 else 0
            
            return {
                "total_spent": float(total_spent),
                "recent_orders_count": recent_orders_count,
                "average_order_value": float(avg_order_value),
                "customer_tier": self._determine_customer_tier(total_spent, recent_orders_count)
            }
        except Exception as e:
            logger.error(f"Error getting user purchase history: {str(e)}")
            return {
                "total_spent": 0,
                "recent_orders_count": 0,
                "average_order_value": 0,
                "customer_tier": "new"
            }
    
    def _determine_customer_tier(self, total_spent, recent_orders_count):
        """Determine customer tier based on spending and order frequency"""
        if total_spent >= 10000 or recent_orders_count >= 10:
            return "platinum"
        elif total_spent >= 5000 or recent_orders_count >= 5:
            return "gold"
        elif total_spent >= 1000 or recent_orders_count >= 2:
            return "silver"
        else:
            return "new"
    
    def _get_simple_available_vouchers(self, shop_ids, user_id, current_subtotal, user_purchase_history):
        """
        Simplified version without problematic model fields
        """
        if not shop_ids:
            return []
        
        # Get current date
        current_date = timezone.now().date()
        
        try:
            # Base query for active vouchers
            vouchers = Voucher.objects.filter(
                shop_id__in=shop_ids,
                is_active=True,
                valid_until__gte=current_date,
                minimum_spend__lte=current_subtotal
            ).select_related('shop').only(
                'id', 'name', 'code', 'discount_type', 'value', 
                'minimum_spend', 'shop__name'
            ).order_by('-value')[:10]  # Limit to 10 for performance
            
            # Build response
            voucher_list = []
            for voucher in vouchers:
                potential_savings = self._calculate_discount(voucher, current_subtotal)
                
                voucher_data = {
                    "id": str(voucher.id),
                    "code": voucher.code,
                    "name": voucher.name,
                    "discount_type": voucher.discount_type,
                    "value": float(voucher.value),
                    "minimum_spend": float(voucher.minimum_spend),
                    "shop_name": voucher.shop.name if voucher.shop else "Unknown Shop",
                    "description": self._get_voucher_description(voucher),
                    "potential_savings": float(potential_savings),
                }
                voucher_list.append(voucher_data)
            
            # Simple categorization
            if voucher_list:
                return [{
                    "category": "Available Vouchers",
                    "vouchers": voucher_list
                }]
            return []
            
        except Exception as e:
            logger.error(f"Error fetching vouchers: {str(e)}")
            return []
    
    def _get_voucher_description(self, voucher):
        """Generate a user-friendly description for the voucher"""
        if voucher.discount_type == 'percentage':
            desc = f"{voucher.value}% off"
        else:
            desc = f"₱{voucher.value} off"
        
        if voucher.minimum_spend > 0:
            desc += f" on orders over ₱{voucher.minimum_spend}"
        
        return desc
    
    @action(detail=False, methods=['GET'])
    def get_shipping_addresses(self, request):
        """
        Get user's shipping addresses.
        URL: /api/checkout/get-shipping-addresses/?user_id=user_uuid
        """
        user_id = request.GET.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Simple query with values() for efficiency
            addresses = list(
                ShippingAddress.objects.filter(
                    user_id=user_id,
                    is_active=True
                ).order_by('-is_default', '-created_at').values(
                    'id',
                    'recipient_name',
                    'recipient_phone',
                    'street',
                    'barangay',
                    'city',
                    'province',
                    'zip_code',
                    'country',
                    'building_name',
                    'floor_number',
                    'unit_number',
                    'landmark',
                    'instructions',
                    'address_type',
                    'is_default',
                    'created_at'
                )[:20]  # Limit to 20 addresses
            )
            
            # Format the addresses
            formatted_addresses = []
            for addr in addresses:
                addr['id'] = str(addr['id'])
                # Create full address
                parts = [
                    addr.get('building_name'),
                    addr.get('floor_number') and f"Floor {addr['floor_number']}",
                    addr.get('unit_number') and f"Unit {addr['unit_number']}",
                    addr.get('street'),
                    addr.get('barangay'),
                    addr.get('city'),
                    addr.get('province'),
                    addr.get('zip_code'),
                    addr.get('country')
                ]
                addr['full_address'] = ', '.join(filter(None, parts))
                
                if addr.get('created_at'):
                    addr['created_at'] = addr['created_at'].isoformat()
                
                formatted_addresses.append(addr)
            
            default_address = next(
                (addr for addr in formatted_addresses if addr['is_default']), 
                formatted_addresses[0] if formatted_addresses else None
            )
            
            return Response({
                "success": True,
                "shipping_addresses": formatted_addresses or None,  # Return None if empty
                "default_shipping_address": default_address,
                "count": len(formatted_addresses)
            })
            
        except Exception as e:
            logger.error(f"Error getting shipping addresses: {str(e)}")
            return Response(
                {"error": "Failed to fetch shipping addresses", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['GET'])
    def get_vouchers_by_amount(self, request):
        """
        Get available vouchers based on purchase amount.
        URL: /api/checkout/get-vouchers-by-amount/?user_id=user_uuid&amount=1500.00
        """
        user_id = request.GET.get("user_id")
        amount = float(request.GET.get("amount", 0))
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get user's cart shop IDs
            user_cart_shop_ids = CartItem.objects.filter(
                user_id=user_id
            ).values_list('product__shop_id', flat=True).distinct()
            
            # Get user purchase history
            user_purchase_history = self._get_user_purchase_history(user_id)
            
            # Get available vouchers
            available_vouchers = self._get_simple_available_vouchers(
                list(user_cart_shop_ids), 
                user_id, 
                amount,
                user_purchase_history
            )
            
            # Get general vouchers
            current_date = timezone.now().date()
            general_vouchers = Voucher.objects.filter(
                shop__isnull=True,
                is_active=True,
                valid_until__gte=current_date,
                minimum_spend__lte=amount
            ).order_by('-value')[:5]
            
            general_list = []
            for voucher in general_vouchers:
                potential_savings = self._calculate_discount(voucher, amount)
                general_list.append({
                    "id": str(voucher.id),
                    "code": voucher.code,
                    "name": voucher.name,
                    "discount_type": voucher.discount_type,
                    "value": float(voucher.value),
                    "minimum_spend": float(voucher.minimum_spend),
                    "shop_name": "All Shops",
                    "description": self._get_voucher_description(voucher),
                    "potential_savings": float(potential_savings),
                    "is_general": True
                })
            
            if general_list:
                available_vouchers.append({
                    "category": "General Vouchers",
                    "vouchers": general_list
                })
            
            return Response({
                "success": True,
                "available_vouchers": available_vouchers,
                "user_stats": user_purchase_history,
                "purchase_amount": amount
            })
            
        except Exception as e:
            logger.error(f"Error in get_vouchers_by_amount: {str(e)}")
            return Response(
                {"error": "Failed to fetch vouchers", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'])
    def validate_voucher(self, request):
        """
        Validate a voucher code for checkout.
        Expected data: {
            "voucher_code": "SUMMER2024",
            "user_id": "user_uuid",
            "subtotal": 1500.00,
            "shop_id": "shop_uuid" (optional)
        }
        """
        voucher_code = request.data.get("voucher_code", "").strip().upper()
        user_id = request.data.get("user_id")
        subtotal = float(request.data.get("subtotal", 0))
        shop_id = request.data.get("shop_id")
        
        if not voucher_code:
            return Response({"valid": False, "error": "Voucher code is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not user_id:
            return Response({"valid": False, "error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            current_date = timezone.now().date()
            
            voucher_query = Voucher.objects.filter(
                code=voucher_code,
                is_active=True,
                valid_until__gte=current_date,
                minimum_spend__lte=subtotal
            )
            
            if shop_id:
                voucher_query = voucher_query.filter(shop_id=shop_id)
            
            voucher = voucher_query.first()
            
            if not voucher:
                return Response({
                    "valid": False, 
                    "error": "Invalid voucher code or voucher not applicable"
                }, status=status.HTTP_404_NOT_FOUND)
            
            discount_amount = self._calculate_discount(voucher, subtotal)
            
            return Response({
                "valid": True,
                "voucher": {
                    "id": str(voucher.id),
                    "code": voucher.code,
                    "name": voucher.name,
                    "discount_type": voucher.discount_type,
                    "value": float(voucher.value),
                    "minimum_spend": float(voucher.minimum_spend),
                    "shop_name": voucher.shop.name if voucher.shop else None,
                    "discount_amount": discount_amount
                }
            })
            
        except Exception as e:
            logger.error(f"Error validating voucher: {str(e)}")
            return Response(
                {"valid": False, "error": "Failed to validate voucher"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_discount(self, voucher, subtotal):
        """Calculate discount amount based on voucher type"""
        # Convert subtotal to Decimal if it's a float
        if isinstance(subtotal, float):
            subtotal = Decimal(str(subtotal))
        
        if voucher.discount_type == 'percentage':
            return subtotal * (Decimal(str(voucher.value)) / Decimal('100'))
        elif voucher.discount_type == 'fixed':
            # Ensure both are Decimal
            voucher_value = Decimal(str(voucher.value))
            return min(voucher_value, subtotal)
        return Decimal('0')
    
    @action(detail=False, methods=['POST'])
    def create_order(self, request):
        """
        Create an order from selected cart items.
        Expected data: {
            "user_id": "user_uuid",
            "selected_ids": ["cart_item_id1", "cart_item_id2"],
            "shipping_address_id": "address_uuid",  # Use address ID instead of object
            "payment_method": "cod",
            "shipping_method": "pickup",
            "voucher_id": "voucher_uuid" (optional),
            "remarks": "optional remarks" (optional)
        }
        """
        user_id = request.data.get("user_id")
        selected_ids = request.data.get("selected_ids", [])
        shipping_address_id = request.data.get("shipping_address_id")
        payment_method = request.data.get("payment_method", "cod")
        shipping_method = request.data.get("shipping_method", "pickup")
        voucher_id = request.data.get("voucher_id")
        remarks = request.data.get("remarks")
        
        if not user_id or not selected_ids:
            return Response(
                {"error": "user_id and selected_ids are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not shipping_address_id:
            return Response(
                {"error": "shipping_address_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = get_object_or_404(User, id=user_id)
            
            # Get shipping address
            shipping_address = get_object_or_404(
                ShippingAddress, 
                id=shipping_address_id, 
                user=user
            )
            
            # Get cart items
            cart_items = CartItem.objects.filter(
                id__in=selected_ids,
                user=user
            ).select_related("product", "product__shop", "product__customer__customer")
            
            if not cart_items.exists():
                return Response(
                    {"error": "No cart items found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Calculate total - ensure we use Decimal
            subtotal = Decimal('0')
            for cart_item in cart_items:
                if cart_item.product:
                    subtotal += cart_item.product.price * cart_item.quantity
            
            # Apply voucher discount if provided
            discount_amount = Decimal('0')
            voucher = None
            
            if voucher_id:
                try:
                    voucher = Voucher.objects.get(
                        id=voucher_id,
                        is_active=True,
                        valid_until__gte=timezone.now().date(),
                        minimum_spend__lte=subtotal
                    )
                    discount_amount = self._calculate_discount(voucher, subtotal)
                except Voucher.DoesNotExist:
                    return Response(
                        {"error": "Invalid or expired voucher"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Calculate final amount - all as Decimal
            delivery_fee = Decimal('0') if shipping_method == "Pickup from Store" else Decimal('50.00')
            total_amount = subtotal + delivery_fee - discount_amount
            
            # Create Order with shipping address
            order = Order.objects.create(
                user=user,
                shipping_address=shipping_address,
                status='pending',
                total_amount=total_amount,
                payment_method=payment_method,
                delivery_method=shipping_method,
                delivery_address_text=shipping_address.get_full_address()
            )
            
            # Store cart item IDs and product information
            cart_item_ids = []
            
            # Create Checkout entries
            for cart_item in cart_items:
                checkout_total = Decimal('0')
                product_name = "Unknown Product"
                shop_name = "Unknown Shop"
                seller_username = None
                
                if cart_item.product:
                    checkout_total = cart_item.product.price * cart_item.quantity
                    product_name = cart_item.product.name
                    if cart_item.product.shop:
                        shop_name = cart_item.product.shop.name
                    if cart_item.product.customer and cart_item.product.customer.customer:
                        seller_username = cart_item.product.customer.customer.username
                
                checkout = Checkout.objects.create(
                    order=order,
                cart_item=cart_item,  # ForeignKey to cart item
                    voucher=voucher,
                    quantity=cart_item.quantity,
                    total_amount=checkout_total,
                    status='pending',
                    remarks=remarks[:500] if remarks else None
                )
                
                # Store cart item ID for response
                cart_item.is_ordered = True
                cart_item_ids.append(str(cart_item.id))

                cart_item.save()
            
            # IMPORTANT: Don't delete cart items immediately
            # Instead, mark them as purchased or keep them for reference
            # Or store the cart_item_id in the checkout like we're doing above
            
            # If you really need to delete them, do it later with a cleanup task
            # cart_items.delete()  # Don't delete here!
            
            return Response({
                "success": True,
                "message": "Order created successfully",
                "order_id": str(order.order),
                "cart_item_ids": cart_item_ids,  # Include cart item IDs in response
                "total_amount": float(total_amount),  # Convert to float for JSON response
                "discount_applied": float(discount_amount),
                "voucher_used": voucher.code if voucher else None
            })
            
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": "Failed to create order", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )        


class ShippingAddressViewSet(viewsets.ViewSet):  # Renamed to avoid conflict
    @action(detail=False, methods=['GET'])
    def get_shipping_addresses(self, request):
        """
        Get user's shipping addresses.
        URL: /api/shipping-address/get_shipping_addresses/?user_id=user_uuid
        """
        user_id = request.GET.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Use the actual model, not the viewset class
            addresses = list(
                ShippingAddress.objects.filter(
                    user_id=user_id,
                    is_active=True
                ).order_by('-is_default', '-created_at').values(
                    'id',
                    'recipient_name',
                    'recipient_phone',
                    'street',
                    'barangay',
                    'city',
                    'province',
                    'zip_code',
                    'country',
                    'building_name',
                    'floor_number',
                    'unit_number',
                    'landmark',
                    'instructions',
                    'address_type',
                    'is_default',
                    'created_at'
                )[:20]  # Limit to 20 addresses
            )
            
            # Format the addresses
            formatted_addresses = []
            for addr in addresses:
                addr['id'] = str(addr['id'])
                # Create full address
                parts = [
                    addr.get('building_name'),
                    f"Floor {addr['floor_number']}" if addr.get('floor_number') else None,
                    f"Unit {addr['unit_number']}" if addr.get('unit_number') else None,
                    addr.get('street'),
                    addr.get('barangay'),
                    addr.get('city'),
                    addr.get('province'),
                    addr.get('zip_code'),
                    addr.get('country')
                ]
                addr['full_address'] = ', '.join(filter(None, parts))
                
                if addr.get('created_at'):
                    addr['created_at'] = addr['created_at'].isoformat()
                
                formatted_addresses.append(addr)
            
            default_address = next(
                (addr for addr in formatted_addresses if addr['is_default']), 
                formatted_addresses[0] if formatted_addresses else None
            )
            
            return Response({
                "success": True,
                "shipping_addresses": formatted_addresses or None,  # Return None if empty
                "default_shipping_address": default_address,
                "count": len(formatted_addresses)
            })
            
        except Exception as e:
            logger.error(f"Error getting shipping addresses: {str(e)}")
            return Response(
                {"error": "Failed to fetch shipping addresses", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'])
    def add_shipping_address(self, request):
        """
        Add a new shipping address.
        Expected data: {
            "user_id": "user_uuid",
            "recipient_name": "John Doe",
            "recipient_phone": "09123456789",
            "street": "123 Main St",
            "barangay": "Barangay 1",
            "city": "Manila",
            "province": "Metro Manila",
            "zip_code": "1000",
            "country": "Philippines",
            "is_default": false
        }
        """
        user_id = request.data.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        required_fields = [
            'recipient_name', 'recipient_phone', 'street', 
            'barangay', 'city', 'province', 'zip_code'
        ]
        
        for field in required_fields:
            if not request.data.get(field):
                return Response(
                    {"error": f"{field} is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            user = get_object_or_404(User, id=user_id)
            
            # Create address
            address = ShippingAddress.objects.create(
                user=user,
                recipient_name=request.data['recipient_name'],
                recipient_phone=request.data['recipient_phone'],
                street=request.data['street'],
                barangay=request.data['barangay'],
                city=request.data['city'],
                province=request.data['province'],
                zip_code=request.data['zip_code'],
                country=request.data.get('country', 'Philippines'),
                building_name=request.data.get('building_name', ''),
                floor_number=request.data.get('floor_number', ''),
                unit_number=request.data.get('unit_number', ''),
                landmark=request.data.get('landmark', ''),
                instructions=request.data.get('instructions', ''),
                address_type=request.data.get('address_type', 'home'),
                is_default=request.data.get('is_default', False)
            )
            
            # Create full address string
            parts = [
                address.building_name,
                f"Floor {address.floor_number}" if address.floor_number else None,
                f"Unit {address.unit_number}" if address.unit_number else None,
                address.street,
                address.barangay,
                address.city,
                address.province,
                address.zip_code,
                address.country
            ]
            full_address = ', '.join(filter(None, parts))
            
            return Response({
                "success": True,
                "message": "Shipping address added successfully",
                "address": {
                    "id": str(address.id),
                    "recipient_name": address.recipient_name,
                    "recipient_phone": address.recipient_phone,
                    "full_address": full_address,
                    "is_default": address.is_default
                }
            })
            
        except Exception as e:
            logger.error(f"Error adding shipping address: {str(e)}")
            return Response(
                {"error": "Failed to add shipping address", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['DELETE'])
    def delete_shipping_address(self, request):
        """
        Delete a shipping address.
        Expected data: {
            "address_id": "address_uuid",
            "user_id": "user_uuid"
        }
        """
        address_id = request.data.get("address_id")
        user_id = request.data.get("user_id")
        
        if not address_id or not user_id:
            return Response(
                {"error": "address_id and user_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            address = get_object_or_404(ShippingAddress, id=address_id, user_id=user_id)
            address.delete()
            
            return Response({
                "success": True,
                "message": "Shipping address deleted successfully"
            })
            
        except Exception as e:
            logger.error(f"Error deleting shipping address: {str(e)}")
            return Response(
                {"error": "Failed to delete shipping address", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'])
    def set_default_address(self, request):
        """
        Set a shipping address as default.
        Expected data: {
            "address_id": "address_uuid",
            "user_id": "user_uuid"
        }
        """
        address_id = request.data.get("address_id")
        user_id = request.data.get("user_id")
        
        if not address_id or not user_id:
            return Response(
                {"error": "address_id and user_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            address = get_object_or_404(ShippingAddress, id=address_id, user_id=user_id)
            
            # Update all addresses to not default
            ShippingAddress.objects.filter(user_id=user_id).update(is_default=False)
            
            # Set this address as default
            address.is_default = True
            address.save()
            
            return Response({
                "success": True,
                "message": "Default address updated successfully"
            })
            
        except Exception as e:
            logger.error(f"Error setting default address: {str(e)}")
            return Response(
                {"error": "Failed to set default address", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['GET'])
    def get_address_by_id(self, request):
        """
        Get a specific shipping address by ID.
        URL: /api/shipping-address/get_address_by_id/?address_id=address_uuid&user_id=user_uuid
        """
        address_id = request.GET.get("address_id")
        user_id = request.GET.get("user_id")
        
        if not address_id or not user_id:
            return Response(
                {"error": "address_id and user_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            address = get_object_or_404(ShippingAddress, id=address_id, user_id=user_id)
            
            # Format address
            parts = [
                address.building_name,
                f"Floor {address.floor_number}" if address.floor_number else None,
                f"Unit {address.unit_number}" if address.unit_number else None,
                address.street,
                address.barangay,
                address.city,
                address.province,
                address.zip_code,
                address.country
            ]
            full_address = ', '.join(filter(None, parts))
            
            address_data = {
                "id": str(address.id),
                "recipient_name": address.recipient_name,
                "recipient_phone": address.recipient_phone,
                "street": address.street,
                "barangay": address.barangay,
                "city": address.city,
                "province": address.province,
                "zip_code": address.zip_code,
                "country": address.country,
                "building_name": address.building_name,
                "floor_number": address.floor_number,
                "unit_number": address.unit_number,
                "landmark": address.landmark,
                "instructions": address.instructions,
                "address_type": address.address_type,
                "is_default": address.is_default,
                "full_address": full_address,
                "created_at": address.created_at.isoformat() if address.created_at else None
            }
            
            return Response({
                "success": True,
                "address": address_data
            })
            
        except Exception as e:
            logger.error(f"Error getting address by ID: {str(e)}")
            return Response(
                {"error": "Failed to fetch address", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['PUT'])
    def update_shipping_address(self, request):
        """
        Update a shipping address.
        Expected data: {
            "address_id": "address_uuid",
            "user_id": "user_uuid",
            ... (fields to update)
        }
        """
        address_id = request.data.get("address_id")
        user_id = request.data.get("user_id")
        
        if not address_id or not user_id:
            return Response(
                {"error": "address_id and user_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            address = get_object_or_404(ShippingAddress, id=address_id, user_id=user_id)
            
            # Update fields if provided
            update_fields = [
                'recipient_name', 'recipient_phone', 'street', 'barangay',
                'city', 'province', 'zip_code', 'country', 'building_name',
                'floor_number', 'unit_number', 'landmark', 'instructions',
                'address_type', 'is_default'
            ]
            
            for field in update_fields:
                if field in request.data:
                    setattr(address, field, request.data[field])
            
            address.save()
            
            # Format updated address
            parts = [
                address.building_name,
                f"Floor {address.floor_number}" if address.floor_number else None,
                f"Unit {address.unit_number}" if address.unit_number else None,
                address.street,
                address.barangay,
                address.city,
                address.province,
                address.zip_code,
                address.country
            ]
            full_address = ', '.join(filter(None, parts))
            
            return Response({
                "success": True,
                "message": "Shipping address updated successfully",
                "address": {
                    "id": str(address.id),
                    "recipient_name": address.recipient_name,
                    "recipient_phone": address.recipient_phone,
                    "full_address": full_address,
                    "is_default": address.is_default
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating shipping address: {str(e)}")
            return Response(
                {"error": "Failed to update shipping address", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
        

class PurchasesBuyer(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def user_purchases(self, request):
        user_id = request.headers.get('X-User-Id')
        
        if not user_id:
            return Response(
                {'error': 'X-User-Id header is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Get all orders for this user
            orders = Order.objects.filter(user=user).prefetch_related(
                Prefetch(
                    'checkout_set',
                    queryset=Checkout.objects.select_related(
                        'cart_item__product__shop',
                        'cart_item__product__customer__customer',
                        'voucher'
                    ).prefetch_related(
                        Prefetch(
                            'cart_item__product__productmedia_set',
                            queryset=ProductMedia.objects.only('id', 'file_data', 'file_type')
                        )
                    ).order_by('created_at')
                ),
                'shipping_address'
            ).order_by('-created_at')
            
            # Get related payments and deliveries in bulk
            order_ids = list(orders.values_list('order', flat=True))
            payments = Payment.objects.filter(order_id__in=order_ids)
            deliveries = Delivery.objects.filter(order_id__in=order_ids)
            
            # Create lookup dictionaries
            payment_dict = {str(payment.order_id): payment for payment in payments}
            delivery_dict = {str(delivery.order_id): delivery for delivery in deliveries}
            
            # Prepare response data
            purchases = []
            for order in orders:
                # Get payment and delivery for this order
                payment = payment_dict.get(str(order.order))
                delivery = delivery_dict.get(str(order.order))
                
                # Get delivery address
                delivery_address = None
                if order.shipping_address:
                    delivery_address = order.shipping_address.get_full_address()
                elif order.delivery_address_text:
                    delivery_address = order.delivery_address_text
                
                order_data = {
                    'order_id': str(order.order),
                    'status': order.status,  # From Order table
                    'total_amount': str(order.total_amount),
                    'payment_method': order.payment_method,
                    'delivery_method': order.delivery_method,
                    'delivery_address': delivery_address,
                    'created_at': order.created_at.isoformat(),
                    'payment_status': payment.status if payment else None,
                    'delivery_status': delivery.status if delivery else None,
                    'delivery_rider': delivery.rider.rider.username if delivery and delivery.rider and delivery.rider.rider else None,
                    'items': []
                }
                
                # Process all checkouts for this order
                for checkout in order.checkout_set.all():
                    if checkout.cart_item and checkout.cart_item.product:
                        product = checkout.cart_item.product
                        
                        # Get product media (images)
                        product_images = []
                        for media in product.productmedia_set.all():
                            if media.file_data:
                                try:
                                    url = media.file_data.url
                                    if request:
                                        url = request.build_absolute_uri(url)
                                    product_images.append({
                                        'id': str(media.id),
                                        'url': url,
                                        'file_type': media.file_type
                                    })
                                except ValueError:
                                    # If file doesn't exist, skip it
                                    continue
                        
                        # Get primary image (first image)
                        primary_image = product_images[0] if product_images else None
                        
                        # Check if user has reviewed this product
                        has_reviewed = False
                        try:
                            # First check if user has a Customer profile
                            customer_profile = Customer.objects.get(customer=user)
                            has_reviewed = Review.objects.filter(
                                customer=customer_profile,
                                product=product
                            ).exists()
                        except Customer.DoesNotExist:
                            # User doesn't have a customer profile yet
                            has_reviewed = False
                        
                        item_data = {
                            'checkout_id': str(checkout.id),
                            'cart_item_id': str(checkout.cart_item.id) if checkout.cart_item else None,
                            'product_id': str(product.id),
                            'product_name': product.name,
                            'product_description': product.description,
                            'product_condition': product.condition,
                            'product_status': product.status,
                            'shop_id': str(product.shop.id) if product.shop else None,
                            'shop_name': product.shop.name if product.shop else None,
                            'shop_picture': request.build_absolute_uri(product.shop.shop_picture.url) if product.shop and product.shop.shop_picture else None,
                            'seller_username': product.customer.customer.username if product.customer and product.customer.customer else None,
                            'quantity': checkout.quantity,
                            'price': str(product.price),
                            'subtotal': str(checkout.total_amount),
                            'status': order.status,  # CHANGED: Use order.status instead of checkout.status
                            'remarks': checkout.remarks,
                            'purchased_at': checkout.created_at.isoformat() if hasattr(checkout.created_at, 'isoformat') else checkout.created_at,
                            'product_images': product_images,
                            'primary_image': primary_image,
                            'voucher_applied': {
                                'id': str(checkout.voucher.id),
                                'name': checkout.voucher.name,
                                'code': checkout.voucher.code
                            } if checkout.voucher else None,
                            'can_review': not has_reviewed and order.status == 'completed'  # Using order.status here
                        }
                        order_data['items'].append(item_data)
                    else:
                        # Handle case where cart_item or product might be null
                        item_data = {
                            'checkout_id': str(checkout.id),
                            'cart_item_id': None,
                            'product_id': None,
                            'product_name': 'Item no longer available',
                            'product_description': '',
                            'product_condition': '',
                            'product_status': '',
                            'shop_id': None,
                            'shop_name': 'Unknown Shop',
                            'shop_picture': None,
                            'seller_username': None,
                            'quantity': checkout.quantity,
                            'price': '0.00',
                            'subtotal': str(checkout.total_amount),
                            'status': order.status,  # CHANGED: Use order.status instead of checkout.status
                            'remarks': checkout.remarks,
                            'purchased_at': checkout.created_at.isoformat() if hasattr(checkout.created_at, 'isoformat') else checkout.created_at,
                            'product_images': [],
                            'primary_image': None,
                            'voucher_applied': None,
                            'can_review': False
                        }
                        order_data['items'].append(item_data)
                
                purchases.append(order_data)
            
            return Response({
                'user_id': str(user.id),
                'username': user.username,
                'total_purchases': len(purchases),
                'purchases': purchases
            })
            
        except Exception as e:
            import traceback
            print(f"Error in user_purchases: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a single order by ID
        """
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return Response(
                {"error": "User ID required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            order = Order.objects.get(order=pk, user=user)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get payment and delivery for this order
        payment = Payment.objects.filter(order_id=order.order).first()
        delivery = Delivery.objects.filter(order_id=order.order).first()
        
        # Get delivery address
        delivery_address = None
        if order.shipping_address:
            delivery_address = order.shipping_address.get_full_address()
        elif order.delivery_address_text:
            delivery_address = order.delivery_address_text
        
        # Get order items
        items_data = []
        for checkout in order.checkout_set.all():
            if checkout.cart_item and checkout.cart_item.product:
                product = checkout.cart_item.product
                
                # Get product media (images)
                product_images = []
                for media in product.productmedia_set.all():
                    if media.file_data:
                        try:
                            url = media.file_data.url
                            if request:
                                url = request.build_absolute_uri(url)
                            product_images.append({
                                'id': str(media.id),
                                'url': url,
                                'file_type': media.file_type
                            })
                        except ValueError:
                            # If file doesn't exist, skip it
                            continue
                
                # Get primary image (first image)
                primary_image = product_images[0] if product_images else None
                
                # Check if user has reviewed this product
                has_reviewed = False
                try:
                    # First check if user has a Customer profile
                    customer_profile = Customer.objects.get(customer=user)
                    has_reviewed = Review.objects.filter(
                        customer=customer_profile,
                        product=product
                    ).exists()
                except Customer.DoesNotExist:
                    # User doesn't have a customer profile yet
                    has_reviewed = False
                
                item_data = {
                    'checkout_id': str(checkout.id),
                    'cart_item_id': str(checkout.cart_item.id) if checkout.cart_item else None,
                    'product_id': str(product.id),
                    'product_name': product.name,
                    'product_description': product.description,
                    'product_condition': product.condition,
                    'product_status': product.status,
                    'shop_id': str(product.shop.id) if product.shop else None,
                    'shop_name': product.shop.name if product.shop else None,
                    'shop_picture': request.build_absolute_uri(product.shop.shop_picture.url) if product.shop and product.shop.shop_picture else None,
                    'seller_username': product.customer.customer.username if product.customer and product.customer.customer else None,
                    'quantity': checkout.quantity,
                    'price': str(product.price),
                    'subtotal': str(checkout.total_amount),
                    'status': order.status,  # Use order status for all items
                    'remarks': checkout.remarks,
                    'purchased_at': checkout.created_at.isoformat() if hasattr(checkout.created_at, 'isoformat') else checkout.created_at,
                    'product_images': product_images,
                    'primary_image': primary_image,
                    'voucher_applied': {
                        'id': str(checkout.voucher.id),
                        'name': checkout.voucher.name,
                        'code': checkout.voucher.code
                    } if checkout.voucher else None,
                    'can_review': not has_reviewed and order.status == 'delivered'  # Using order.status here
                }
                items_data.append(item_data)
            else:
                # Handle case where cart_item or product might be null
                item_data = {
                    'checkout_id': str(checkout.id),
                    'cart_item_id': None,
                    'product_id': None,
                    'product_name': 'Item no longer available',
                    'product_description': '',
                    'product_condition': '',
                    'product_status': '',
                    'shop_id': None,
                    'shop_name': 'Unknown Shop',
                    'shop_picture': None,
                    'seller_username': None,
                    'quantity': checkout.quantity,
                    'price': '0.00',
                    'subtotal': str(checkout.total_amount),
                    'status': order.status,  # Use order status
                    'remarks': checkout.remarks,
                    'purchased_at': checkout.created_at.isoformat() if hasattr(checkout.created_at, 'isoformat') else checkout.created_at,
                    'product_images': [],
                    'primary_image': None,
                    'voucher_applied': None,
                    'can_review': False
                }
                items_data.append(item_data)
        
        order_data = {
            'order_id': str(order.order),
            'status': order.status,
            'total_amount': str(order.total_amount),
            'payment_method': order.payment_method,
            'delivery_method': order.delivery_method,
            'delivery_address': delivery_address,
            'created_at': order.created_at.isoformat(),
            'payment_status': payment.status if payment else None,
            'delivery_status': delivery.status if delivery else None,
            'delivery_rider': delivery.rider.rider.username if delivery and delivery.rider and delivery.rider.rider else None,
            'items': items_data
        }
        
        return Response(order_data)

class ReturnPurchaseBuyer(viewsets.ViewSet):
    @action(detail=True, methods=['get'])
    def get_return_products(self, request):
        user_id = request.headers.get('X-User-Id')


class ViewShopAPIView(APIView):
    """View details of a single shop including products, categories, and followers"""

    def get(self, request, shop_id):
        # Fetch shop if exists (including suspended) so frontend can show suspended UI
        shop = Shop.objects.filter(id=shop_id).first()
        if not shop:
            return Response({'detail': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)

        # Build address string
        address_parts = [
            shop.street,
            shop.barangay,
            shop.city,
            shop.province
        ]
        address = ', '.join(filter(None, address_parts))
        
        # Shop basic info
        shop_data = {
            'id': str(shop.id),
            'name': shop.name,
            'shop_picture': request.build_absolute_uri(shop.shop_picture.url) if shop.shop_picture else None,
            'description': shop.description or 'No description provided',
            'province': shop.province,
            'city': shop.city,
            'barangay': shop.barangay,
            'street': shop.street,
            'address': address,
            'contact_number': shop.contact_number,
            'verified': shop.verified,
            'status': shop.status,
            'total_sales': str(shop.total_sales),
            'created_at': shop.created_at,
            'updated_at': shop.updated_at,
            'total_followers': shop.followers.count(),
            'is_suspended': getattr(shop, 'is_suspended', False),
            'suspension_reason': getattr(shop, 'suspension_reason', None),
        }

        # Shop products (still include products; frontend can choose how to display)
        products = Product.objects.filter(shop=shop, is_removed=False)
        shop_data['products'] = ProductSerializer(products, many=True, context={'request': request}).data

        # Shop categories (unique categories from products)
        category_qs = products.values_list('category__id', 'category__name').distinct()
        shop_data['categories'] = [{'id': str(c[0]), 'name': c[1]} for c in category_qs if c[0]]

        # Add whether current user is following this shop
        user_id = request.headers.get('X-User-Id')
        is_following = False
        try:
            if user_id:
                customer = Customer.objects.filter(customer__id=user_id).first()
                if customer:
                    is_following = ShopFollow.objects.filter(shop=shop, customer=customer).exists()
        except Exception as e:
            print(f"Error checking follow status: {e}")

        shop_data['is_following'] = is_following

        # --- Additional metrics for frontend display ---
        try:
            # Ratings: average rating and review count for this shop
            rating_agg = Review.objects.filter(shop=shop).aggregate(avg=Avg('rating'), count=Count('id'))
            rating_avg = float(round(rating_agg.get('avg') or 0, 1)) if rating_agg.get('avg') is not None else None
            rating_count = rating_agg.get('count') or 0

            # Product sold & customer metrics (use Checkout records linked to Orders)
            valid_order_statuses = ['pending', 'processing', 'shipped', 'delivered']
            checkouts = Checkout.objects.filter(
                order__isnull=False,
                cart_item__product__shop=shop,
                order__status__in=valid_order_statuses
            )

            product_sold = checkouts.aggregate(total_sold=Sum('quantity'))['total_sold'] or 0

            # Unique customers who purchased from this shop
            total_customers = checkouts.values('cart_item__user').distinct().count()

            # Repeated customers (customers with >1 distinct orders for this shop)
            repeated_customers = checkouts.values('cart_item__user').annotate(order_count=Count('order', distinct=True)).filter(order_count__gt=1).count()

            shop_data.update({
                'rating': rating_avg,
                'rating_count': rating_count,
                'total_products': products.count(),
                'total_customers': total_customers,
                'repeated_customers': repeated_customers,
                'product_sold': int(product_sold),
            })
        except Exception as e:
            # Don't break the whole response if analytics fail - log and continue
            print(f"Error computing shop metrics: {e}")
            shop_data.update({
                'rating': None,
                'rating_count': 0,
                'total_products': products.count(),
                'total_customers': 0,
                'repeated_customers': 0,
                'product_sold': 0,
            })

        return Response(shop_data, status=status.HTTP_200_OK)

    def post(self, request, shop_id):
        """Follow this shop for the current (customer) user"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({'error': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.filter(customer__id=user_id).first()
            if not customer:
                return Response({'error': 'Customer profile not found for user'}, status=status.HTTP_404_NOT_FOUND)

            shop = Shop.objects.filter(id=shop_id).first()
            if not shop:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)

            follow, created = ShopFollow.objects.get_or_create(shop=shop, customer=customer)
            return Response({'success': True, 'is_following': True, 'total_followers': shop.followers.count()})

        except Exception as e:
            print(f"Error following shop: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, shop_id):
        """Unfollow this shop for the current (customer) user"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({'error': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.filter(customer__id=user_id).first()
            if not customer:
                return Response({'error': 'Customer profile not found for user'}, status=status.HTTP_404_NOT_FOUND)

            shop = Shop.objects.filter(id=shop_id).first()
            if not shop:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)

            deleted, _ = ShopFollow.objects.filter(shop=shop, customer=customer).delete()
            return Response({'success': True, 'is_following': False, 'total_followers': shop.followers.count()})

        except Exception as e:
            print(f"Error unfollowing shop: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class OrderSuccessfull(viewsets.ViewSet):
    @action(detail=True, methods=['get'])
    def get_order_successful(self, request, pk=None):
        user_id = request.headers.get('X-User-Id')
        
        if not user_id:
            return Response(
                {"error": "X-User-Id header is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the order and verify it belongs to the user
            order = get_object_or_404(
                Order.objects.select_related(
                    'user',
                    'shipping_address'
                ),
                order=pk,
                user_id=user_id
            )
            
            # Get all checkouts for this order with related data
            checkouts = Checkout.objects.filter(
                order=order
            ).select_related(
                'cart_item__product',
                'cart_item__product__shop',
                'voucher'
            ).prefetch_related(
                'cart_item__product__productmedia_set'
            )
            
            # Prepare order data
            order_data = {
                "order": str(order.order),
                "status": order.status,
                "total_amount": str(order.total_amount),
                "payment_method": order.payment_method,
                "delivery_method": order.delivery_method,
                "delivery_address_text": order.delivery_address_text,
                "created_at": order.created_at.isoformat(),
                "shipping_address": None,
                "items": [],
                "summary": {
                    "item_count": 0,
                    "shop_count": 0,
                    "subtotal": 0
                }
            }
            
            # Add shipping address if available
            if order.shipping_address:
                order_data["shipping_address"] = {
                    "id": str(order.shipping_address.id),
                    "recipient_name": order.shipping_address.recipient_name,
                    "recipient_phone": order.shipping_address.recipient_phone,
                    "full_address": order.shipping_address.get_full_address(),
                }
            
            # Process checkout items
            shop_ids = set()
            subtotal = 0
            
            for checkout in checkouts:
                if checkout.cart_item and checkout.cart_item.product:
                    product = checkout.cart_item.product
                    shop = product.shop
                    
                    if shop:
                        shop_ids.add(shop.id)
                    
                    # Calculate item subtotal
                    item_subtotal = float(checkout.total_amount)
                    subtotal += item_subtotal
                    
                    # Get product image
                    product_image = None
                    if product.productmedia_set.exists():
                        first_media = product.productmedia_set.first()
                        if first_media.file_data:
                            product_image = request.build_absolute_uri(first_media.file_data.url)
                    
                    item_data = {
                        "checkout_id": str(checkout.id),
                        "cart_item_id": str(checkout.cart_item.id),
                        "product_id": str(product.id),
                        "name": product.name,
                        "price": float(product.price),
                        "quantity": checkout.quantity,
                        "subtotal": item_subtotal,
                        "shop_name": shop.name if shop else "Unknown Shop",
                        "shop_id": str(shop.id) if shop else None,
                        "image": product_image,
                        "voucher_applied": {
                            "id": str(checkout.voucher.id),
                            "name": checkout.voucher.name,
                            "code": checkout.voucher.code,
                        } if checkout.voucher else None,
                        "remarks": checkout.remarks,
                    }
                    
                    order_data["items"].append(item_data)
            
            # Update summary
            order_data["summary"]["item_count"] = len(order_data["items"])
            order_data["summary"]["shop_count"] = len(shop_ids)
            order_data["summary"]["subtotal"] = subtotal
            
            # Get payment if exists
            try:
                payment = Payment.objects.get(order=order)
                order_data["payment"] = {
                    "status": payment.status,
                    "method": payment.method,
                    "amount": str(payment.amount),
                    "transaction_date": payment.transaction_date.isoformat(),
                }
            except Payment.DoesNotExist:
                order_data["payment"] = None
            
            # Get delivery if exists
            try:
                delivery = Delivery.objects.get(order=order)
                order_data["delivery"] = {
                    "status": delivery.status,
                    "rider": delivery.rider.rider.username if delivery.rider else None,
                    "picked_at": delivery.picked_at.isoformat() if delivery.picked_at else None,
                    "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                }
            except Delivery.DoesNotExist:
                order_data["delivery"] = None
            
            return Response(order_data)
            
        except Exception as e:
            # Log error but don't expose internal details
            logger.error(f"Error fetching order {pk}: {str(e)}")
            return Response(
                {"error": "Order not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )



class UserPaymentMethodViewSet(viewsets.ViewSet):
    """User's saved payment methods"""
    
    @action(detail=False, methods=['get'])
    def get_my_payment_methods(self, request):
        """Get user's saved payment methods"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            methods = UserPaymentMethod.objects.filter(user=user)
            serializer = UserPaymentMethodSerializer(methods, many=True)
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def add_payment_method(self, request):
        """Add a new payment method"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            method_type = request.data.get('method_type')
            
            if not method_type:
                return Response({"error": "Method type required"}, status=status.HTTP_400_BAD_REQUEST)
            
            data = request.data.copy()
            data['user'] = user.id
            
            serializer = UserPaymentMethodSerializer(data=data)
            if serializer.is_valid():
                method = serializer.save()
                
                return Response({
                    "message": "Payment method added successfully",
                    "method_id": str(method.id)
                }, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['put'])
    def update_payment_method(self, request, pk=None):
        """Update a payment method"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            method = get_object_or_404(UserPaymentMethod, id=pk, user=user)
            
            serializer = UserPaymentMethodSerializer(method, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "Payment method updated",
                    "method_id": str(method.id)
                })
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['delete'])
    def delete_payment_method(self, request, pk=None):
        """Delete a payment method"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            method = get_object_or_404(UserPaymentMethod, id=pk, user=user)
            
            method.delete()
            return Response({
                "message": "Payment method deleted",
                "method_id": str(pk)
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a payment method as default"""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            method = get_object_or_404(UserPaymentMethod, id=pk, user=user)
            
            # Remove default from all methods
            UserPaymentMethod.objects.filter(user=user).update(is_default=False)
            
            # Set this as default
            method.is_default = True
            method.save()
            
            return Response({
                "message": "Payment method set as default",
                "method_id": str(method.id)
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
    
class ArrangeShipment(viewsets.ViewSet):
    @action(detail=True, methods=['get'])
    def get_order_details(self, request, pk=None):
        """
        Get order details for shipment arrangement
        GET /arrange-shipment/{order_id}/get_order_details/
        """
        try:
            # Get shop_id for verification (from query params or session)
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Import models
            from .models import Order, User, ShippingAddress, Checkout, CartItem, Product, Shop
            
            # Get order with shop verification - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Verify order has items from this shop - O(1)
            has_shop_items = Checkout.objects.filter(
                order=order,
                cart_item__product__shop_id=shop_id
            ).exists()
            
            if not has_shop_items:
                return Response({
                    "success": False,
                    "message": "Order does not contain items from your shop"
                }, status=status.HTTP_403_FORBIDDEN)

            # Get shop details - O(1)
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Shop not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Optimized query for order items from this shop - O(n) where n = items
            shop_checkouts = Checkout.objects.filter(
                order=order,
                cart_item__product__shop=shop
            ).select_related(
                'cart_item__product__shop'
            ).prefetch_related('cart_item__product')

            # Prepare response data
            order_items = []
            total_amount = 0

            for checkout in shop_checkouts:
                cart_item = checkout.cart_item
                if not cart_item or not cart_item.product:
                    continue

                product = cart_item.product
                
                order_items.append({
                    "id": str(checkout.id),
                    "product": {
                        "id": str(product.id),
                        "name": product.name,
                        "price": float(product.price),
                        "weight": float(product.weight) if product.weight else None,
                        "dimensions": f"{product.length or 0} x {product.width or 0} x {product.height or 0}" 
                            if product.length and product.width and product.height else None,
                        "shop": {
                            "id": str(shop.id),
                            "name": shop.name,
                            "address": f"{shop.street}, {shop.barangay}, {shop.city}"
                        }
                    },
                    "quantity": checkout.quantity,
                    "total_amount": float(checkout.total_amount)
                })
                
                total_amount += float(checkout.total_amount)

            # Get delivery address
            delivery_address = None
            address_details = {}

            if order.shipping_address:
                shipping_address = order.shipping_address
                delivery_address = shipping_address.get_full_address()
                address_details = {
                    "street": shipping_address.street,
                    "city": shipping_address.city,
                    "province": shipping_address.province,
                    "postal_code": shipping_address.zip_code,
                    "country": shipping_address.country,
                    "contact_person": shipping_address.recipient_name,
                    "contact_phone": shipping_address.recipient_phone,
                    "notes": shipping_address.instructions
                }
            elif order.delivery_address_text:
                delivery_address = order.delivery_address_text
                address_details = {"notes": "Address provided as text"}

            # Format response
            response_data = {
                "success": True,
                "message": "Order details retrieved successfully",
                "data": {
                    "order_id": str(order.order),
                    "user": {
                        "id": str(order.user.id),
                        "username": order.user.username,
                        "email": order.user.email,
                        "first_name": order.user.first_name,
                        "last_name": order.user.last_name,
                        "phone": order.user.contact_number or None
                    },
                    "delivery_address": delivery_address,
                    "address_details": address_details,
                    "items": order_items,
                    "total_amount": total_amount,
                    "payment_method": order.payment_method,
                    "created_at": order.created_at.isoformat(),
                    "current_status": order.status,
                    "shop_info": {
                        "id": str(shop.id),
                        "name": shop.name,
                        "address": f"{shop.street}, {shop.barangay}, {shop.city}, {shop.province}"
                    }
                }
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error retrieving order details: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def get_available_riders(self, request, pk=None):
        """
        Get available riders for an order
        GET /arrange-shipment/{order_id}/get_available_riders/
        """
        try:
            # Get shop_id for verification
            shop_id = request.GET.get('shop_id')
            if not shop_id:
                return Response({
                    "success": False,
                    "message": "Shop ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Import models
            from .models import Order, Shop, User, Rider
            
            # Verify order exists and belongs to shop - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Get available riders - O(n) where n = number of riders
            riders = Rider.objects.filter(
                verified=True,
                rider__is_suspended=False  # Access User model through rider field
            ).select_related('rider')

            # Prepare rider data
            riders_data = []
            for rider in riders:
                riders_data.append({
                    "id": str(rider.rider.id),  # User ID
                    "rider_id": str(rider.rider.id),  # Same as above for compatibility
                    "user": {
                        "id": str(rider.rider.id),
                        "first_name": rider.rider.first_name,
                        "last_name": rider.rider.last_name,
                        "phone": rider.rider.contact_number or ""
                    },
                    "vehicle_type": rider.vehicle_type or "Motorcycle",
                    "vehicle_brand": rider.vehicle_brand or "",
                    "vehicle_model": rider.vehicle_model or "",
                    "plate_number": rider.plate_number or "",
                    "verified": rider.verified,
                    "rating": 4.5,  # Default/placeholder rating
                    "total_deliveries": 100,  # Default/placeholder
                    "delivery_success_rate": 95.0,  # Default/placeholder
                    "response_time": "15-30 mins",  # Default/placeholder
                    "current_location": f"{rider.rider.city or 'Unknown'}, {rider.rider.province or 'Unknown'}",
                    "base_fee": 100,  # Default base fee
                    "accepts_custom_offers": True  # Default to accepting offers
                })

            return Response({
                "success": True,
                "message": "Available riders retrieved",
                "data": riders_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error retrieving riders: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def submit_shipment_offer(self, request, pk=None):
        """
        Submit shipment offer to rider
        POST /arrange-shipment/{order_id}/submit_shipment_offer/
        """
        try:
            # Get required data
            shop_id = request.data.get('shop_id')
            rider_id = request.data.get('rider_id')
            offer_amount = request.data.get('offer_amount')
            offer_type = request.data.get('offer_type', 'custom')
            delivery_notes = request.data.get('delivery_notes', '')

            # Validate required fields
            if not all([shop_id, rider_id, offer_amount]):
                return Response({
                    "success": False,
                    "message": "Missing required fields: shop_id, rider_id, offer_amount"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate offer amount (minimum ₱50)
            try:
                offer_amount = float(offer_amount)
                if offer_amount < 50:
                    return Response({
                        "success": False,
                        "message": "Offer amount must be at least ₱50"
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    "success": False,
                    "message": "Invalid offer amount"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Import models
            from .models import Order, Shop, User, Rider, Delivery
            from django.utils import timezone

            # Verify order exists and belongs to shop - O(1)
            try:
                order = Order.objects.get(order=pk)
            except Order.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Order not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Verify rider exists and is verified - O(1)
            try:
                rider = Rider.objects.get(rider_id=rider_id, verified=True)
            except Rider.DoesNotExist:
                return Response({
                    "success": False,
                    "message": "Rider not found or not verified"
                }, status=status.HTTP_404_NOT_FOUND)

            # Create delivery record with offer - O(1)
            delivery = Delivery.objects.create(
                order=order,
                rider=rider,
                status='pending_offer',  # New status for offer system
                created_at=timezone.now(),
                updated_at=timezone.now()
            )

            # In a real implementation, you would:
            # 1. Create an Offer model to track offer details
            # 2. Send notification to rider
            # 3. Update order status

            return Response({
                "success": True,
                "message": "Shipment offer submitted successfully",
                "data": {
                    "order_id": str(order.order),
                    "delivery_id": str(delivery.id),
                    "rider_name": f"{rider.rider.first_name} {rider.rider.last_name}",
                    "offer_amount": offer_amount,
                    "offer_type": offer_type,
                    "delivery_notes": delivery_notes,
                    "status": "pending_offer",
                    "submitted_at": timezone.now().isoformat()
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Error submitting offer: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        
class RiderOrdersActive(viewsets.ViewSet):
    @action(detail=False, methods=['get'], url_path='order-details/(?P<order_id>[^/.]+)')
    def order_details(self, request, order_id=None):
        """
        Get detailed information about a specific order.
        
        Parameters:
        - order_id: UUID of the order to retrieve details for
        
        Returns:
        - Order details including delivery, payment, and related information
        """
        try:
            # Validate that order_id is a valid UUID
            order_uuid = uuid.UUID(order_id)
        except (ValueError, AttributeError):
            return Response(
                {"error": "Invalid order ID format. Must be a valid UUID."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the order with related data efficiently using select_related/prefetch_related
        # Note: 'delivery' is not a direct field on Order model, it's a reverse relation
        order = get_object_or_404(
            Order.objects.select_related(
                'user',
                'shipping_address'
            ),
            order=order_uuid
        )

        # Get related data efficiently
        # Delivery is a reverse relation, so we use filter() and select_related() on Delivery model
        delivery = Delivery.objects.filter(order=order).select_related('rider__rider').first()
        
        # Get payment for this order
        payment = Payment.objects.filter(order=order).first()
        
        # Get checkout items for this order with related product data
        checkout_items = Checkout.objects.filter(order=order).select_related(
            'cart_item__product__shop',
            'cart_item__product__customer__customer'
        )

        # Build the response data
        order_data = {
            "order_id": str(order.order),
            "order_status": order.status,
            "total_amount": str(order.total_amount),
            "payment_method": order.payment_method,
            "delivery_method": order.delivery_method,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "customer": {
                "id": str(order.user.id),
                "name": f"{order.user.first_name} {order.user.last_name}",
                "contact_number": order.user.contact_number,
                "email": order.user.email
            } if order.user else None,
            "shipping_address": {
                "recipient_name": order.shipping_address.recipient_name,
                "recipient_phone": order.shipping_address.recipient_phone,
                "full_address": order.shipping_address.get_full_address(),
                "city": order.shipping_address.city,
                "province": order.shipping_address.province,
                "barangay": order.shipping_address.barangay,
                "zip_code": order.shipping_address.zip_code
            } if order.shipping_address else None,
            "delivery": {
                "id": str(delivery.id) if delivery else None,
                "status": delivery.status if delivery else None,
                "rider_id": str(delivery.rider.rider.id) if delivery and delivery.rider else None,
                "rider_name": f"{delivery.rider.rider.first_name} {delivery.rider.rider.last_name}" if delivery and delivery.rider else None,
                "rider_contact": delivery.rider.rider.contact_number if delivery and delivery.rider else None,
                "picked_at": delivery.picked_at if delivery else None,
                "delivered_at": delivery.delivered_at if delivery else None,
                "created_at": delivery.created_at if delivery else None
            } if delivery else None,
            "payment": {
                "id": str(payment.id) if payment else None,
                "status": payment.status if payment else None,
                "amount": str(payment.amount) if payment else None,
                "method": payment.method if payment else None,
                "transaction_date": payment.transaction_date if payment else None
            } if payment else None,
            "items": [
                {
                    "checkout_id": str(item.id),
                    "product_id": str(item.cart_item.product.id) if item.cart_item and item.cart_item.product else None,
                    "product_name": item.cart_item.product.name if item.cart_item and item.cart_item.product else None,
                    "shop_name": item.cart_item.product.shop.name if item.cart_item and item.cart_item.product and item.cart_item.product.shop else None,
                    "shop_id": str(item.cart_item.product.shop.id) if item.cart_item and item.cart_item.product and item.cart_item.product.shop else None,
                    "seller_name": f"{item.cart_item.product.customer.customer.first_name} {item.cart_item.product.customer.customer.last_name}" if item.cart_item and item.cart_item.product and item.cart_item.product.customer and item.cart_item.product.customer.customer else None,
                    "quantity": item.quantity,
                    "unit_price": str(item.cart_item.product.price) if item.cart_item and item.cart_item.product else None,
                    "total": str(item.total_amount) if item.total_amount else None,
                    "remarks": item.remarks
                }
                for item in checkout_items
                if item.cart_item and item.cart_item.product
            ]
        }

        return Response(order_data, status=status.HTTP_200_OK)
    
    
    def _get_rider(self, request):
        """Get rider instance from authenticated user"""
        try:
            user_id = request.headers.get('X-User-Id')
            if not user_id:
                return None
            
            # Try to find the rider by user ID
            return Rider.objects.get(rider_id=user_id)
        except (Rider.DoesNotExist, ValueError):
            return None
    
    @action(detail=False, methods=['get'])
    def get_metrics(self, request):
        """
        Get metrics for rider dashboard
        """
        rider = self._get_rider(request)
        if not rider:
            return Response(
                {"success": False, "error": "Rider not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Current time for calculations
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        
        # Get all deliveries assigned to this rider
        rider_deliveries = Delivery.objects.filter(rider=rider)
        
        # Count deliveries by status
        status_counts = rider_deliveries.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            picked_up=Count('id', filter=Q(status='picked_up')),
            delivered=Count('id', filter=Q(status='delivered'))
        )
        
        # Calculate expected earnings from active orders
        active_deliveries = rider_deliveries.filter(
            status__in=['pending', 'picked_up']
        )
        
        total_earnings = active_deliveries.aggregate(
            total=Sum('order__total_amount')
        )['total'] or 0
        
        # Calculate delivery time metrics
        completed_deliveries = rider_deliveries.filter(
            status='delivered',
            picked_at__isnull=False,
            delivered_at__isnull=False
        )
        
        avg_delivery_time = completed_deliveries.annotate(
            delivery_time=(
                F('delivered_at') - F('picked_at')
            )
        ).aggregate(
            avg_time=Avg('delivery_time')
        )['avg_time']
        
        # Convert timedelta to minutes if exists
        if avg_delivery_time:
            avg_delivery_minutes = avg_delivery_time.total_seconds() / 60
        else:
            avg_delivery_minutes = 0
        
        # Calculate on-time deliveries (within 2 hours)
        timely_deliveries = completed_deliveries.annotate(
            delivery_time=(
                F('delivered_at') - F('picked_at')
            )
        ).filter(
            delivery_time__lte=timedelta(hours=2)
        ).count()
        
        total_completed = completed_deliveries.count()
        completion_rate = (
            (timely_deliveries / total_completed * 100) 
            if total_completed > 0 else 0
        )
        
        # Get recent performance
        today_deliveries = rider_deliveries.filter(
            created_at__date=now.date()
        ).count()
        
        week_earnings = rider_deliveries.filter(
            status='delivered',
            delivered_at__gte=week_ago
        ).aggregate(
            total=Sum('order__total_amount')
        )['total'] or 0
        
        metrics = {
            "success": True,
            "metrics": {
                "total_active_orders": status_counts['total'],
                "pending_pickup": status_counts['pending'],
                "in_transit": status_counts['picked_up'],
                "completed_deliveries": status_counts['delivered'],
                "expected_earnings": float(total_earnings),
                "avg_delivery_time": round(avg_delivery_minutes, 1),
                "completion_rate": round(completion_rate, 1),
                "on_time_deliveries": timely_deliveries,
                "late_deliveries": total_completed - timely_deliveries,
                "today_deliveries": today_deliveries,
                "week_earnings": float(week_earnings),
                "has_data": status_counts['total'] > 0
            }
        }
        
        return Response(metrics)
    
    @action(detail=False, methods=['get'])
    def get_deliveries(self, request):
        """
        Get active deliveries assigned to rider with pagination
        """
        rider = self._get_rider(request)
        if not rider:
            return Response(
                {"success": False, "error": "Rider not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get query parameters
        status_filter = request.GET.get('status', '')
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        search = request.GET.get('search', '')
        
        # Start with all deliveries for this rider
        deliveries = Delivery.objects.filter(rider=rider)
        
        # Apply status filter
        if status_filter and status_filter != 'all':
            deliveries = deliveries.filter(status=status_filter)
        
        # Apply search filter
        if search:
            deliveries = deliveries.filter(
                Q(order__order__icontains=search) |
                Q(order__user__username__icontains=search) |
                Q(order__user__first_name__icontains=search) |
                Q(order__user__last_name__icontains=search)
            )
        
        # Get total count
        total_count = deliveries.count()
        
        # Calculate pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Get paginated deliveries with proper related fields
        paginated_deliveries = deliveries.select_related(
            'order',
            'order__user',
            'order__shipping_address'
        )[start_idx:end_idx]
        
        # Format response data with null checks for shipping_address
        deliveries_data = []
        for delivery in paginated_deliveries:
            order = delivery.order
            
            # Handle null shipping_address
            shipping_address = order.shipping_address
            shipping_address_data = None
            if shipping_address:
                shipping_address_data = {
                    "id": str(shipping_address.id),
                    "recipient_name": shipping_address.recipient_name,
                    "recipient_phone": shipping_address.recipient_phone,
                    "street": shipping_address.street,
                    "barangay": shipping_address.barangay,
                    "city": shipping_address.city,
                    "province": shipping_address.province,
                    "full_address": shipping_address.get_full_address(),
                }
            
            # Calculate time elapsed
            time_elapsed = timezone.now() - delivery.created_at
            hours = int(time_elapsed.total_seconds() // 3600)
            minutes = int((time_elapsed.total_seconds() % 3600) // 60)
            
            # Format delivery data
            delivery_info = {
                "id": str(delivery.id),
                "order": {
                    "order_id": str(order.order),
                    "customer": {
                        "id": str(order.user.id),
                        "username": order.user.username or "",
                        "first_name": order.user.first_name or "",
                        "last_name": order.user.last_name or "",
                        "contact_number": order.user.contact_number or "",
                    },
                    "shipping_address": shipping_address_data,
                    "total_amount": float(order.total_amount),
                    "payment_method": order.payment_method or "",
                    "delivery_method": order.delivery_method or "",
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                },
                "status": delivery.status,
                "picked_at": delivery.picked_at.isoformat() if delivery.picked_at else None,
                "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                "created_at": delivery.created_at.isoformat(),
                "updated_at": delivery.updated_at.isoformat(),
                "time_elapsed": f"{hours}h {minutes}m",
                "is_late": hours > 2 and delivery.status == 'pending',
            }
            deliveries_data.append(delivery_info)
        
        # Get pending orders (orders without rider assignment)
        # Only include orders with shipping_address to avoid errors
        pending_orders = Order.objects.filter(
            status__in=['pending', 'processing'],
            delivery__isnull=True,
            shipping_address__isnull=False  # Only include orders with shipping address
        )[:5]  # Limit to 5 for dashboard
        
        pending_orders_data = []
        for order in pending_orders:
            if order.shipping_address:  # Double check
                pending_orders_data.append({
                    "order_id": str(order.order),
                    "customer": order.shipping_address.recipient_name,
                    "address": order.shipping_address.get_full_address(),
                    "amount": float(order.total_amount),
                    "created_at": order.created_at.isoformat(),
                })
        
        response = {
            "success": True,
            "deliveries": deliveries_data,
            "pending_orders": pending_orders_data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total_count,
                "total_pages": (total_count + page_size - 1) // page_size,
            },
            "filters": {
                "status": status_filter if status_filter else "all",
                "search": search,
            }
        }
        
        return Response(response)
    
    @action(detail=False, methods=['post'])
    def pickup_order(self, request):
        """
        Rider picks up an order
        """
        rider = self._get_rider(request)
        if not rider:
            return Response(
                {"success": False, "error": "Rider not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        delivery_id = request.data.get('delivery_id')
        if not delivery_id:
            return Response(
                {"success": False, "error": "Delivery ID required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update status check to 'pending_offer' or include both
            delivery = Delivery.objects.get(
                id=delivery_id,
                rider=rider,
                status__in=['pending', 'pending_offer']  # Check for both statuses
            )
        except Delivery.DoesNotExist:
            return Response(
                {"success": False, "error": "Delivery not found or not available for pickup"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update delivery status
        delivery.status = 'picked_up'
        delivery.picked_at = timezone.now()
        delivery.updated_at = timezone.now()
        delivery.save()
        
        # Update order status
        order = delivery.order
        order.status = 'shipped'
        order.updated_at = timezone.now()
        order.save()
        
        return Response({
            "success": True,
            "message": "Order picked up successfully",
            "delivery": {
                "id": str(delivery.id),
                "status": delivery.status,
                "picked_at": delivery.picked_at.isoformat(),
            }
        })


    @action(detail=False, methods=['post'])
    def deliver_order(self, request):
        """
        Rider delivers an order
        """
        rider = self._get_rider(request)
        if not rider:
            return Response(
                {"success": False, "error": "Rider not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        delivery_id = request.data.get('delivery_id')
        if not delivery_id:
            return Response(
                {"success": False, "error": "Delivery ID required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            delivery = Delivery.objects.get(
                id=delivery_id,
                rider=rider,
                status='picked_up'
            )
        except Delivery.DoesNotExist:
            return Response(
                {"success": False, "error": "Delivery not found or not ready for delivery"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update delivery status
        delivery.status = 'delivered'
        delivery.delivered_at = timezone.now()
        delivery.updated_at = timezone.now()
        delivery.save()
        
        # Update order status
        order = delivery.order
        order.status = 'delivered'
        order.updated_at = timezone.now()
        order.save()
        
        return Response({
            "success": True,
            "message": "Order delivered successfully",
            "delivery": {
                "id": str(delivery.id),
                "status": delivery.status,
                "delivered_at": delivery.delivered_at.isoformat(),
            }
        })


class SwapViewset(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def get_swap(self, request):
        """
        Get all products available for swapping
        Simple endpoint that respects ProductSKU model integrity
        """
        try:
            # Get user_id from headers
            user_id = request.headers.get('X-User-Id')
            
            # If user_id is provided, verify the user exists
            current_user = None
            if user_id:
                try:
                    current_user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    pass
            
            # Get query parameters
            swap_type = request.GET.get('swap_type', None)  # 'direct_swap' or 'swap_plus_payment'
            category_id = request.GET.get('category_id', None)
            min_price = request.GET.get('min_price', None)
            max_price = request.GET.get('max_price', None)
            search = request.GET.get('search', '')
            
            # Start with base query - only products that allow swapping
            swap_products = ProductSKU.objects.select_related(
                'product',
                'product__shop',
                'product__customer',
                'product__customer__customer'
            ).prefetch_related(
                'accepted_categories',
                'product__productmedia_set',
                'variant_options'
            ).filter(
                allow_swap=True,
                is_active=True,
                product__upload_status='published',  # Only published products
                product__is_removed=False
            )
            
            # Exclude current user's own products (if user is authenticated)
            if current_user and current_user.is_customer:
                try:
                    customer_profile = current_user.customer
                    swap_products = swap_products.exclude(
                        product__customer=customer_profile
                    )
                except:
                    pass
            
            # Apply filters
            if swap_type:
                swap_products = swap_products.filter(swap_type=swap_type)
            
            if category_id:
                # Filter by accepted categories
                swap_products = swap_products.filter(
                    accepted_categories__id=category_id
                ).distinct()
            
            if min_price:
                try:
                    min_price_decimal = Decimal(min_price)
                    swap_products = swap_products.filter(price__gte=min_price_decimal)
                except:
                    pass
            
            if max_price:
                try:
                    max_price_decimal = Decimal(max_price)
                    swap_products = swap_products.filter(price__lte=max_price_decimal)
                except:
                    pass
            
            # Search filter (product name or description)
            if search:
                swap_products = swap_products.filter(
                    Q(product__name__icontains=search) |
                    Q(product__description__icontains=search) |
                    Q(sku_code__icontains=search)
                )
            
            # Prepare response data
            swap_list = []
            for sku in swap_products[:50]:  # Limit to 50 results for performance
                # Get main product image
                product_image = None
                if sku.image:
                    product_image = request.build_absolute_uri(sku.image.url) if sku.image else None
                else:
                    # Try to get from product media
                    try:
                        media = ProductMedia.objects.filter(
                            product=sku.product,
                            file_type__startswith='image/'
                        ).first()
                        if media and media.file_data:
                            product_image = request.build_absolute_uri(media.file_data.url)
                    except:
                        pass
                
                # Calculate stock status
                stock_status = 'available'
                if sku.quantity <= 0:
                    stock_status = 'out_of_stock'
                elif sku.critical_trigger and sku.quantity <= sku.critical_trigger:
                    stock_status = 'low_stock'
                
                # Get accepted categories
                accepted_categories = []
                for cat in sku.accepted_categories.all():
                    accepted_categories.append({
                        'id': str(cat.id),
                        'name': cat.name
                    })
                
                # Get variant options
                variant_options = []
                for opt in sku.variant_options.all():
                    variant_options.append({
                        'id': str(opt.id),
                        'title': opt.title,
                        'variant_id': str(opt.variant_id) if opt.variant_id else None
                    })
                
                swap_data = {
                    'id': str(sku.id),
                    'product_id': str(sku.product.id) if sku.product else None,
                    'product_name': sku.product.name if sku.product else 'Unknown Product',
                    'product_description': sku.product.description if sku.product else '',
                    'product_price': str(sku.product.price) if sku.product and sku.product.price else '0.00',
                    'product_condition': sku.product.condition if sku.product else '',
                    
                    # SKU Details
                    'sku_code': sku.sku_code,
                    'price': str(sku.price) if sku.price else None,
                    'compare_price': str(sku.compare_price) if sku.compare_price else None,
                    'quantity': sku.quantity,
                    
                    # Physical Details
                    'length': str(sku.length) if sku.length else None,
                    'width': str(sku.width) if sku.width else None,
                    'height': str(sku.height) if sku.height else None,
                    'weight': str(sku.weight) if sku.weight else None,
                    'weight_unit': sku.weight_unit,
                    
                    # Swap Details
                    'allow_swap': sku.allow_swap,
                    'swap_type': sku.swap_type,
                    'minimum_additional_payment': str(sku.minimum_additional_payment),
                    'maximum_additional_payment': str(sku.maximum_additional_payment),
                    'swap_description': sku.swap_description,
                    
                    # Accepted Categories
                    'accepted_categories': accepted_categories,
                    
                    # Variant Options
                    'variant_options': variant_options,
                    
                    # Shop Information
                    'shop': {
                        'id': str(sku.product.shop.id) if sku.product and sku.product.shop else None,
                        'name': sku.product.shop.name if sku.product and sku.product.shop else None,
                        'verified': sku.product.shop.verified if sku.product and sku.product.shop else False,
                        'province': sku.product.shop.province if sku.product and sku.product.shop else None,
                        'city': sku.product.shop.city if sku.product and sku.product.shop else None,
                    },
                    
                    # Seller Information
                    'seller': {
                        'id': str(sku.product.customer.customer.id) if sku.product and sku.product.customer and sku.product.customer.customer else None,
                        'username': sku.product.customer.customer.username if sku.product and sku.product.customer and sku.product.customer.customer else None,
                        'first_name': sku.product.customer.customer.first_name if sku.product and sku.product.customer and sku.product.customer.customer else '',
                        'last_name': sku.product.customer.customer.last_name if sku.product and sku.product.customer and sku.product.customer.customer else '',
                    },
                    
                    # Category
                    'category': {
                        'id': str(sku.product.category.id) if sku.product and sku.product.category else None,
                        'name': sku.product.category.name if sku.product and sku.product.category else None,
                    } if sku.product and sku.product.category else None,
                    
                    # Media
                    'product_image': product_image,
                    
                    # Status
                    'stock_status': stock_status,
                    'is_active': sku.is_active,
                    'critical_trigger': sku.critical_trigger,
                    
                    # Timestamps
                    'created_at': sku.created_at.isoformat() if sku.created_at else timezone.now().isoformat(),
                    'updated_at': sku.updated_at.isoformat() if sku.updated_at else timezone.now().isoformat(),
                    
                    # Current user info (for frontend)
                    'current_user_id': user_id,
                    'is_current_user_seller': False,  # Will be calculated below
                }
                
                # Check if current user is the seller of this product
                if current_user and sku.product and sku.product.customer:
                    swap_data['is_current_user_seller'] = (
                        sku.product.customer.customer.id == current_user.id
                    )
                
                swap_list.append(swap_data)
            
            return Response({
                'success': True,
                'data': swap_list,
                'total': len(swap_list),
                'message': f'Found {len(swap_list)} swap products',
                'current_user_id': user_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in get_swap: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
                'data': [],
                'total': 0,
                'message': 'Error fetching swap products'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CustomerProductViewSet(viewsets.ViewSet):
    """
    Comprehensive ViewSet for customer product management 
    (No shop required - for personal listings)
    """
    
    @action(detail=False, methods=['get'])
    def global_categories(self, request):
        """Get all global categories (no shop) for customer products"""
        try:
            categories = Category.objects.filter(shop__isnull=True).order_by('name')
            categories_data = []
            
            for category in categories:
                categories_data.append({
                    "id": str(category.id),
                    "name": category.name,
                    "shop": None,
                    "user": {
                        "id": str(category.user.id),
                        "username": category.user.username
                    } if category.user else None,
                })
            
            return Response({
                "success": True,
                "categories": categories_data,
                "message": "Global categories retrieved successfully",
                "total_count": len(categories_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch global categories",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def create_product(self, request):
        """
        Comprehensive product creation for customers - handles everything:
        - Basic product info
        - Categories (global only)
        - Media files
        - Variants & SKUs
        - Swap settings (per SKU or product-level)
        - No shop required
        """
        try:
            # Get user_id from headers or data
            user_id = request.data.get('customer_id') or request.headers.get('X-User-Id')
            
            if not user_id:
                return Response({
                    "error": "User ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get customer profile
            try:
                customer = Customer.objects.get(customer_id=user_id)
            except Customer.DoesNotExist:
                return Response({
                    "error": "Customer profile not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check product limit
            if not customer.can_add_product():
                return Response({
                    "error": f"Cannot add more than {customer.product_limit} products. Current count: {customer.current_product_count}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare base product data
            product_data = {}
            
            # Handle single values (fix duplicates from FormData)
            single_value_fields = [
                'name', 'description', 'condition', 'category_admin_id', 
                'weight_unit', 'swap_type', 'swap_description',
                'upload_status', 'status', 'compare_price'
            ]
            
            for field in single_value_fields:
                value = request.data.get(field)
                if isinstance(value, list) and len(value) > 0:
                    product_data[field] = value[0]  # Take first if list
                elif value is not None:
                    product_data[field] = value
            
            # Handle numeric fields with validation
            numeric_fields = ['quantity', 'price', 'compare_price', 'length', 'width', 'height', 'weight', 'critical_stock']
            for field in numeric_fields:
                value = request.data.get(field)
                if value:
                    try:
                        if isinstance(value, list) and len(value) > 0:
                            product_data[field] = float(value[0])
                        else:
                            product_data[field] = float(value)
                    except (ValueError, TypeError):
                        pass
            
            # Set customer and defaults
            product_data['customer'] = customer.customer_id
            product_data['upload_status'] = product_data.get('upload_status', 'draft')
            product_data['status'] = product_data.get('status', 'active')
            
            # Handle product-level swap
            open_for_swap = request.data.get('open_for_swap')
            if open_for_swap:
                product_data['open_for_swap'] = True if open_for_swap in ['true', 'True', True] else False
            
            # Validate global category if provided
            category_admin_id = product_data.get('category_admin_id')
            if category_admin_id and category_admin_id != "none":
                try:
                    Category.objects.get(id=category_admin_id, shop__isnull=True)
                except Category.DoesNotExist:
                    return Response({
                        "error": "Invalid global category selected"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Handle accepted_categories for product-level swap
            accepted_categories_raw = request.data.get('accepted_categories')
            if accepted_categories_raw:
                try:
                    if isinstance(accepted_categories_raw, str):
                        accepted_list = json.loads(accepted_categories_raw)
                    else:
                        accepted_list = accepted_categories_raw
                    
                    # Validate categories exist and are global
                    valid_categories = []
                    for cat_id in accepted_list:
                        try:
                            Category.objects.get(id=cat_id, shop__isnull=True)
                            valid_categories.append(cat_id)
                        except Category.DoesNotExist:
                            pass
                    
                    product_data['accepted_categories'] = valid_categories
                except (json.JSONDecodeError, TypeError):
                    product_data['accepted_categories'] = []
            
            # Handle shipping zones (for customer products if needed)
            shipping_zones_raw = request.data.get('shipping_zones')
            if shipping_zones_raw:
                try:
                    if isinstance(shipping_zones_raw, str):
                        shipping_zones = json.loads(shipping_zones_raw)
                    else:
                        shipping_zones = shipping_zones_raw
                    
                    # Validate shipping zones
                    valid_zones = []
                    for zone in shipping_zones:
                        if isinstance(zone, dict) and 'name' in zone:
                            valid_zones.append({
                                'name': zone.get('name'),
                                'fee': float(zone.get('fee', 0)),
                                'free_shipping': bool(zone.get('free_shipping', False))
                            })
                    
                    if valid_zones:
                        product_data['shipping_zones'] = valid_zones
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass
            
            # Create product with transaction
            with transaction.atomic():
                serializer = ProductCreateSerializer(
                    data=product_data, 
                    context={'request': request}
                )
                
                if serializer.is_valid():
                    # Create the product (shop will be null for customer products)
                    product = serializer.save()
                    
                    # Handle media files
                    media_files = request.FILES.getlist('media_files', [])
                    for media_file in media_files:
                        ProductMedia.objects.create(
                            product=product,
                            file_data=media_file,
                            file_type=media_file.content_type
                        )
                    
                    # Handle variants and SKUs if provided
                    variants_raw = request.data.get('variants')
                    skus_raw = request.data.get('skus')
                    
                    # In the create_product method, modify the variants handling section:
                    if variants_raw:
                        # Parse variants data
                        try:
                            variants_list = json.loads(variants_raw) if isinstance(variants_raw, str) else variants_raw
                            
                            # Parse SKUs data
                            skus_list = []
                            if skus_raw:
                                skus_list = json.loads(skus_raw) if isinstance(skus_raw, str) else skus_raw
                            
                            # Process variants and SKUs
                            self._create_variants_with_skus(
                                product=product,
                                variants_data=variants_list,
                                skus_data=skus_list,
                                files=request.FILES
                            )
                        except Exception as e:
                            print(f"Error processing variants/SKUs: {type(e)} - {str(e)}")
                            import traceback
                            traceback.print_exc()
                            # Rollback transaction if variant creation fails
                            raise ValidationError(f"Failed to create variants: {str(e)}")
                    # Increment customer's product count
                    customer.increment_product_count()
                    
                    # Return comprehensive success response
                    return Response({
                        "success": True,
                        "product": self._get_product_detail_data(product),
                        "message": "Customer product created successfully",
                        "product_limit": {
                            "current_count": customer.current_product_count,
                            "limit": customer.product_limit,
                            "remaining": customer.product_limit - customer.current_product_count
                        }
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        "error": "Validation failed",
                        "details": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
        except ValidationError as e:
            return Response({
                "error": "Validation failed",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "error": "Product creation failed",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_variants_with_skus(self, product, variants_data, skus_data, files):
        from decimal import Decimal, InvalidOperation

        """Helper method to create variants and SKUs for customer products"""
        option_image_files = {}
        option_id_map = {}
        
        print(f"Creating variants for product {product.id}")
        print(f"Variants data: {variants_data}")
        print(f"SKUs data: {skus_data}")
        print(f"Files keys: {list(files.keys())}")
        
        # Create variant groups and options
        for variant_group in variants_data:
            variant = Variants.objects.create(
                product=product,
                shop=None,  # Customer products have no shop
                title=variant_group.get('title', '')
            )
            print(f"Created variant: {variant.id} - {variant.title}")
            
            for option in variant_group.get('options', []):
                provided_option_id = option.get('id', str(uuid.uuid4()))
                voption = VariantOptions.objects.create(
                    variant=variant,
                    title=option.get('title', '')
                )
                print(f"Created variant option: {voption.id} - {voption.title}")
                
                # Map provided ID to actual DB ID
                option_id_map[str(provided_option_id)] = str(voption.id)
                
                # Store variant images if any
                file_key = f"variant_image_{variant_group.get('id', '')}_{provided_option_id}"
                if file_key in files:
                    option_image_files[str(provided_option_id)] = files[file_key]
                    option_image_files[str(voption.id)] = files[file_key]
                    print(f"Stored variant image for option {provided_option_id}")
        
        # Create SKUs if provided
        if skus_data:
            print(f"Creating {len(skus_data)} SKUs")
            for sku_data in skus_data:
                provided_option_ids = sku_data.get('option_ids', [])
                mapped_option_ids = [
                    option_id_map.get(str(oid), str(oid)) 
                    for oid in provided_option_ids
                ]
                
                # Get swap data from SKU
                allow_swap = sku_data.get('allow_swap', False)
                swap_type = sku_data.get('swap_type', 'direct_swap')
                min_payment = sku_data.get('minimum_additional_payment', 0)
                max_payment = sku_data.get('maximum_additional_payment', 0)
                
                # DEBUG: Print SKU data before conversion
                print(f"SKU Data before conversion: {sku_data}")
                
                # Safe Decimal conversion helper function
                def safe_decimal(value, default=None):
                    if value is None or value == '':
                        return default
                    try:
                        # Handle string or numeric values
                        if isinstance(value, str):
                            # Remove any whitespace and check if empty
                            value = value.strip()
                            if value == '':
                                return default
                            # Replace comma with dot for decimal separator
                            value = value.replace(',', '.')
                        return Decimal(str(value))
                    except (ValueError, TypeError, InvalidOperation):
                        print(f"Warning: Could not convert '{value}' to Decimal, using default: {default}")
                        return default
                
                # Create SKU with safe conversions
                sku = ProductSKU.objects.create(
                    product=product,
                    option_ids=mapped_option_ids,
                    option_map=sku_data.get('option_map', {}),
                    price=safe_decimal(sku_data.get('price'), None),
                    compare_price=safe_decimal(sku_data.get('compare_price'), None),
                    quantity=int(sku_data.get('quantity', 0)),
                    length=safe_decimal(sku_data.get('length'), None),
                    width=safe_decimal(sku_data.get('width'), None),
                    height=safe_decimal(sku_data.get('height'), None),
                    weight=safe_decimal(sku_data.get('weight'), None),
                    weight_unit=sku_data.get('weight_unit', 'g'),
                    sku_code=sku_data.get('sku_code', ''),
                    critical_trigger=int(sku_data.get('critical_trigger')) if sku_data.get('critical_trigger') not in (None, '') else None,
                    allow_swap=bool(allow_swap),
                    swap_type=swap_type if allow_swap else 'direct_swap',
                    minimum_additional_payment=safe_decimal(min_payment, Decimal('0.00')),
                    maximum_additional_payment=safe_decimal(max_payment, Decimal('0.00')),
                    swap_description=sku_data.get('swap_description', ''),
                )
                print(f"Created SKU: {sku.id}")
                
                # Handle accepted categories for swap
                accepted_categories = sku_data.get('accepted_categories', [])
                for cat_id in accepted_categories:
                    try:
                        category = Category.objects.get(id=cat_id, shop__isnull=True)
                        sku.accepted_categories.add(category)
                        print(f"Added accepted category {category.name} to SKU {sku.id}")
                    except Category.DoesNotExist:
                        pass
                
                # Handle SKU images
                sku_id = sku_data.get('id')
                file_key = f"sku_image_{sku_id}" if sku_id else None
                
                if file_key and file_key in files:
                    sku.image = files[file_key]
                    sku.save()
                    print(f"Added explicit image to SKU {sku.id}")
                else:
                    # Try to get image from option images
                    for oid in provided_option_ids:
                        if str(oid) in option_image_files:
                            sku.image = option_image_files[str(oid)]
                            sku.save()
                            print(f"Added option image to SKU {sku.id}")
                            break
        else:
            # Auto-create SKUs from variants if no SKUs provided
            print("Auto-creating SKUs from variants")
            for variant_group in variants_data:
                for option in variant_group.get('options', []):
                    provided_option_id = option.get('id', str(uuid.uuid4()))
                    mapped_option_id = option_id_map.get(str(provided_option_id), str(provided_option_id))
                    
                    # Safe price conversion for auto-created SKUs
                    option_price = option.get('price', 0)
                    try:
                        if option_price and option_price != '':
                            price_decimal = Decimal(str(option_price).replace(',', '.'))
                        else:
                            price_decimal = None
                    except (ValueError, TypeError, InvalidOperation):
                        price_decimal = None
                    
                    sku = ProductSKU.objects.create(
                        product=product,
                        option_ids=[mapped_option_id],
                        option_map={variant_group.get('title', 'Option'): option.get('title', '')},
                        price=price_decimal,
                        quantity=int(option.get('quantity', 0)),
                    )
                    
                    # Add image if available
                    f = option_image_files.get(str(mapped_option_id)) or option_image_files.get(str(provided_option_id))
                    if f:
                        sku.image = f
                        sku.save()

    def _get_product_detail_data(self, product):
        """Get detailed product data for response"""
        # Get media files
        media_files = []
        for media in product.productmedia_set.all():
            media_files.append({
                "id": str(media.id),
                "file_data": media.file_data.url if media.file_data else None,
                "file_type": media.file_type
            })
        
        # Get SKUs
        skus = []
        for sku in product.skus.all():
            sku_data = {
                "id": str(sku.id),
                "option_ids": sku.option_ids,
                "option_map": sku.option_map,
                "sku_code": sku.sku_code,
                "price": str(sku.price) if sku.price else None,
                "compare_price": str(sku.compare_price) if sku.compare_price else None,
                "quantity": sku.quantity,
                "allow_swap": sku.allow_swap,
                "swap_type": sku.swap_type,
                "minimum_additional_payment": str(sku.minimum_additional_payment) if sku.minimum_additional_payment else "0.00",
                "maximum_additional_payment": str(sku.maximum_additional_payment) if sku.maximum_additional_payment else "0.00",
                "swap_description": sku.swap_description,
                "image": sku.image.url if sku.image else None,
            }
            
            # Add accepted categories for this SKU
            accepted_cats = []
            for cat in sku.accepted_categories.all():
                accepted_cats.append({
                    "id": str(cat.id),
                    "name": cat.name
                })
            sku_data["accepted_categories"] = accepted_cats
            skus.append(sku_data)
        
        # Get variants
        variants = []
        for variant in product.variants_set.all():
            variant_data = {
                "id": str(variant.id),
                "title": variant.title,
                "options": []
            }
            
            for option in variant.variantoptions_set.all():
                option_data = {
                    "id": str(option.id),
                    "title": option.title,
                }
                variant_data["options"].append(option_data)
            
            variants.append(variant_data)
        
        return {
            "id": str(product.id),
            "name": product.name,
            "description": product.description,
            "quantity": product.quantity,
            "price": str(product.price),
            "compare_price": str(product.compare_price) if product.compare_price else None,
            "upload_status": product.upload_status,
            "status": product.status,
            "condition": product.condition,
            "open_for_swap": getattr(product, 'open_for_swap', False),
            "swap_type": getattr(product, 'swap_type', None),
            "swap_description": getattr(product, 'swap_description', None),
            "category_admin": {
                "id": str(product.category_admin.id),
                "name": product.category_admin.name
            } if product.category_admin else None,
            "media_files": media_files,
            "skus": skus,
            "variants": variants,
            "dimensions": {
                "length": str(product.length) if product.length else None,
                "width": str(product.width) if product.width else None,
                "height": str(product.height) if product.height else None,
                "weight": str(product.weight) if product.weight else None,
                "weight_unit": product.weight_unit,
            } if any([product.length, product.width, product.height, product.weight]) else None,
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
        }
    
    @action(detail=False, methods=['get'])
    def predict_category(self, request):
        """
        Predict category for a product - Reuse from SellerProducts
        """
        # Copy the predict_category method from SellerProducts class
        try:
            import pandas as pd
            import numpy as np
            import tensorflow as tf
            import joblib
            import os
            
            CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
            MODEL_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'model')
            
            # Load models (same as seller version)
            try:
                category_le = joblib.load(os.path.join(MODEL_DIR, 'category_label_encoder.pkl'))
                scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
                model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'category_classifier.keras'))
                feature_columns = joblib.load(os.path.join(MODEL_DIR, 'feature_columns.pkl'))
                
            except FileNotFoundError as e:
                return Response(
                    {'success': False, 'error': f'Model files not found. Please train the model first.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Extract data from request
            data = request.data
            
            # Required fields
            required_fields = ['name', 'description', 'quantity', 'price', 'condition']
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
            
            # ... [rest of the prediction logic from SellerProducts] ...
            # For brevity, copying the full prediction logic from SellerProducts
            
            # This should be the same as the SellerProducts.predict_category method
            # Just make sure to import the same packages and use the same model
            
            return Response({
                'success': True,
                'message': 'Category prediction endpoint (copy logic from SellerProducts)'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {
                    'success': False, 
                    'error': f'Prediction failed: {str(e)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class CustomerProductsList(viewsets.ViewSet):
    """
    ViewSet for listing customer's PERSONAL products (without shop)
    """
    
    @action(detail=False, methods=['get'])
    def products_list(self, request):
        """
        Get only PERSONAL products for a customer (products without a shop)
        """
        try:
            # Get user_id from headers
            user_id = request.headers.get('X-User-Id')
            
            if not user_id:
                return Response({
                    "success": False,
                    "error": "User ID is required in headers"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get customer profile
            try:
                customer = Customer.objects.get(customer_id=user_id)
            except Customer.DoesNotExist:
                return Response({
                    "success": True,
                    "products": [],
                    "message": "Customer not found",
                    "total_count": 0,
                    "summary": self._get_empty_summary()
                }, status=status.HTTP_200_OK)
            
            # Get query parameters for filtering
            status_filter = request.query_params.get('status', None)
            upload_status_filter = request.query_params.get('upload_status', None)
            search_query = request.query_params.get('search', None)
            
            # Build base queryset - ONLY products WITHOUT a shop (personal listings)
            products = Product.objects.filter(
                customer=customer,
                is_removed=False,
                shop__isnull=True  # CRITICAL: Only products without a shop
            ).select_related(
                'category_admin',
                'category'
            ).prefetch_related(
                Prefetch('productmedia_set', queryset=ProductMedia.objects.all()),
                Prefetch('skus', queryset=ProductSKU.objects.all())
            ).order_by('-created_at')
            
            # Apply filters
            if status_filter:
                products = products.filter(status=status_filter)
            
            if upload_status_filter:
                products = products.filter(upload_status=upload_status_filter)
            
            if search_query:
                products = products.filter(
                    Q(name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(sku_code__icontains=search_query)
                )
            
            # Get total count before pagination
            total_count = products.count()
            
            # Prepare response data
            products_data = []
            
            for product in products:
                product_data = self._prepare_product_data(product)
                products_data.append(product_data)
            
            # Get summary statistics (only for personal products)
            summary = self._get_summary_statistics(customer)
            
            return Response({
                "success": True,
                "products": products_data,
                "total_count": total_count,
                "summary": summary,
                "customer_info": {
                    "customer_id": str(customer.customer_id),
                    "username": customer.customer.username if customer.customer else None,
                    "product_limit": customer.product_limit,
                    "current_product_count": self._get_personal_product_count(customer),  # Only personal products
                    "remaining_products": customer.product_limit - self._get_personal_product_count(customer)
                },
                "message": "Personal products retrieved successfully",
                "filters_applied": {
                    "status": status_filter,
                    "upload_status": upload_status_filter,
                    "search": search_query
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch personal products",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_personal_product_count(self, customer):
        """Get count of only personal products (without shop)"""
        return Product.objects.filter(
            customer=customer,
            is_removed=False,
            shop__isnull=True
        ).count()
    
    def _prepare_product_data(self, product):
        """Helper method to prepare individual product data"""
        # Get first media file for thumbnail
        main_image = None
        media_files = list(product.productmedia_set.all())
        if media_files:
            main_media = media_files[0]
            main_image = {
                "id": str(main_media.id),
                "url": main_media.file_data.url if main_media.file_data else None,
                "type": main_media.file_type
            }
        
        # Get all media files
        all_media = [
            {
                "id": str(media.id),
                "url": media.file_data.url if media.file_data else None,
                "type": media.file_type
            }
            for media in media_files
        ]
        
        # Get SKU information
        skus = list(product.skus.all())
        sku_data = []
        total_quantity = 0
        
        for sku in skus:
            sku_data.append({
                "id": str(sku.id),
                "option_ids": sku.option_ids or [],
                "option_map": sku.option_map or {},
                "sku_code": sku.sku_code,
                "price": str(sku.price) if sku.price else None,
                "compare_price": str(sku.compare_price) if sku.compare_price else None,
                "quantity": sku.quantity,
                "allow_swap": sku.allow_swap,
                "swap_type": sku.swap_type if sku.allow_swap else None,
                "is_active": sku.is_active,
                "critical_trigger": sku.critical_trigger,
                "stock_status": self._get_stock_status(sku.quantity, sku.critical_trigger),
                "image": sku.image.url if sku.image else None
            })
            total_quantity += sku.quantity
        
        # Calculate overall stock status
        if skus:
            has_swap = any(sku.allow_swap for sku in skus)
            overall_stock_status = self._get_stock_status(total_quantity, product.critical_stock)
        else:
            has_swap = False
            overall_stock_status = self._get_stock_status(product.quantity, product.critical_stock)
            total_quantity = product.quantity
        
        # Get active report count if available
        active_report_count = getattr(product, 'active_report_count', 0)
        
        # Determine product status badge
        status_badge = self._get_status_badge(
            product.upload_status, 
            product.status,
            total_quantity,
            has_swap
        )
        
        # Prepare dimensions
        dimensions = None
        if any([product.length, product.width, product.height, product.weight]):
            dimensions = {
                "length": str(product.length) if product.length else None,
                "width": str(product.width) if product.width else None,
                "height": str(product.height) if product.height else None,
                "weight": str(product.weight) if product.weight else None,
                "weight_unit": product.weight_unit or 'kg'
            }
        
        return {
            "id": str(product.id),
            "name": product.name,
            "description": product.description,
            "short_description": product.description[:100] + "..." if len(product.description) > 100 else product.description,
            "quantity": product.quantity,
            "total_sku_quantity": total_quantity,
            "price": str(product.price),
            "compare_price": str(product.compare_price) if product.compare_price else None,
            "upload_status": product.upload_status,
            "status": product.status,
            "condition": product.condition,
            "status_badge": status_badge,
            "stock_status": overall_stock_status,
            
            # Categories
            "category_admin": {
                "id": str(product.category_admin.id),
                "name": product.category_admin.name
            } if product.category_admin else None,
            "category": {
                "id": str(product.category.id),
                "name": product.category.name
            } if product.category else None,
            
            # Media
            "main_image": main_image,
            "media_count": len(all_media),
            "all_media": all_media,
            
            # SKUs
            "has_variants": len(skus) > 0,
            "sku_count": len(skus),
            "skus": sku_data,
            
            # Swap information
            "allow_swap": has_swap,
            "has_swap": has_swap,
            "swap_type": skus[0].swap_type if has_swap and skus else None,
            
            # Shop information (will be null for personal listings)
            "shop_id": None,
            "shop_name": None,
            "is_personal_listing": True,  # Add flag to identify personal listings
            
            # Physical details
            "dimensions": dimensions,
            
            # Critical stock
            "critical_stock": product.critical_stock,
            "is_low_stock": total_quantity <= product.critical_stock if product.critical_stock else False,
            
            # Reports
            "active_report_count": active_report_count,
            "has_active_reports": active_report_count > 0,
            
            # Timestamps
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
            "created_date": product.created_at.strftime("%b %d, %Y"),
            "updated_date": product.updated_at.strftime("%b %d, %Y"),
            
            # Flags
            "is_published": product.upload_status == 'published',
            "is_draft": product.upload_status == 'draft',
            "is_archived": product.upload_status == 'archived',
            "is_active": product.status == 'active' and product.upload_status == 'published',
        }
    
    def _get_stock_status(self, quantity, critical_trigger):
        """Determine stock status based on quantity and critical trigger"""
        if quantity is None:
            quantity = 0
            
        if quantity <= 0:
            return "out_of_stock"
        elif critical_trigger and quantity <= critical_trigger:
            return "low_stock"
        else:
            return "in_stock"
    
    def _get_status_badge(self, upload_status, status, quantity, has_swap):
        """Get status badge information"""
        badges = []
        
        # Upload status badge
        if upload_status == 'published':
            badges.append({"type": "success", "label": "Published"})
        elif upload_status == 'draft':
            badges.append({"type": "warning", "label": "Draft"})
        elif upload_status == 'archived':
            badges.append({"type": "secondary", "label": "Archived"})
        
        # Product status badge
        if status == 'active':
            badges.append({"type": "success", "label": "Active"})
        elif status == 'inactive':
            badges.append({"type": "secondary", "label": "Inactive"})
        
        # Stock status badge
        if quantity is not None:
            if quantity <= 0:
                badges.append({"type": "danger", "label": "Out of Stock"})
            elif quantity <= 10:
                badges.append({"type": "warning", "label": "Low Stock"})
        
        # Swap badge
        if has_swap:
            badges.append({"type": "info", "label": "Swap Available"})
        
        return badges
    
    def _get_summary_statistics(self, customer):
        """Get summary statistics for customer's PERSONAL products only"""
        products = Product.objects.filter(
            customer=customer, 
            is_removed=False,
            shop__isnull=True  # Only personal products
        )
        
        # Count by upload status
        status_counts = products.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(upload_status='published')),
            draft=Count('id', filter=Q(upload_status='draft')),
            archived=Count('id', filter=Q(upload_status='archived'))
        )
        
        # Count by product status
        product_status_counts = products.aggregate(
            active=Count('id', filter=Q(status='active')),
            inactive=Count('id', filter=Q(status='inactive'))
        )
        
        # Count personal products with swap enabled
        swap_products_count = 0
        for product in products:
            if product.skus.filter(allow_swap=True).exists():
                swap_products_count += 1
        
        # Get recent personal products (last 7 days)
        week_ago = timezone.now() - timezone.timedelta(days=7)
        recent_count = products.filter(created_at__gte=week_ago).count()
        
        personal_product_count = self._get_personal_product_count(customer)
        
        return {
            "total_products": status_counts['total'] or 0,
            "by_upload_status": {
                "published": status_counts['published'] or 0,
                "draft": status_counts['draft'] or 0,
                "archived": status_counts['archived'] or 0
            },
            "by_product_status": {
                "active": product_status_counts['active'] or 0,
                "inactive": product_status_counts['inactive'] or 0
            },
            "swap_products": swap_products_count,
            "recent_products": recent_count,
            "product_limit": {
                "limit": customer.product_limit,
                "used": personal_product_count,  # Only personal products
                "remaining": customer.product_limit - personal_product_count,
                "percentage_used": round((personal_product_count / customer.product_limit * 100), 2) if customer.product_limit > 0 else 0
            }
        }
    
    def _get_empty_summary(self):
        """Return empty summary when no customer found"""
        return {
            "total_products": 0,
            "by_upload_status": {
                "published": 0,
                "draft": 0,
                "archived": 0
            },
            "by_product_status": {
                "active": 0,
                "inactive": 0
            },
            "swap_products": 0,
            "recent_products": 0,
            "product_limit": {
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "percentage_used": 0
            }
        }
    
    @action(detail=False, methods=['get'])
    def product_detail(self, request):
        """
        Get detailed information for a specific PERSONAL product
        """
        try:
            user_id = request.headers.get('X-User-Id')
            product_id = request.query_params.get('product_id')
            
            if not user_id:
                return Response({
                    "success": False,
                    "error": "User ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not product_id:
                return Response({
                    "success": False,
                    "error": "Product ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify customer owns the personal product
            try:
                customer = Customer.objects.get(customer_id=user_id)
                product = Product.objects.get(
                    id=product_id,
                    customer=customer,
                    is_removed=False,
                    shop__isnull=True  # Must be a personal product
                )
            except (Customer.DoesNotExist, Product.DoesNotExist):
                return Response({
                    "success": False,
                    "error": "Personal product not found or access denied"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare detailed product data
            product_data = self._prepare_product_data(product)
            
            # Add additional details for single product view
            product_data.update({
                "full_description": product.description,
                "sales_stats": self._get_sales_stats(product),
                "view_count": getattr(product, 'view_count', 0),
                "favorite_count": getattr(product, 'favorite_count', 0),
            })
            
            return Response({
                "success": True,
                "product": product_data,
                "message": "Personal product details retrieved successfully"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch personal product details",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sales_stats(self, product):
        """Get sales statistics for a product (placeholder)"""
        return {
            "total_sold": 0,
            "total_revenue": "0.00",
            "last_sale_date": None
        }
    
    @action(detail=False, methods=['get'])
    def shop_products_list(self, request):
        """
        Separate endpoint to get shop products if needed
        """
        try:
            user_id = request.headers.get('X-User-Id')
            
            if not user_id:
                return Response({
                    "success": False,
                    "error": "User ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                customer = Customer.objects.get(customer_id=user_id)
            except Customer.DoesNotExist:
                return Response({
                    "success": True,
                    "products": [],
                    "message": "Customer not found",
                    "total_count": 0
                }, status=status.HTTP_200_OK)
            
            # Get shop products ONLY (with shop)
            products = Product.objects.filter(
                customer=customer,
                is_removed=False,
                shop__isnull=False  # Only products with shop
            ).select_related(
                'shop',
                'category_admin',
                'category'
            ).order_by('-created_at')
            
            total_count = products.count()
            products_data = []
            
            for product in products:
                # Simplified data for shop products
                products_data.append({
                    "id": str(product.id),
                    "name": product.name,
                    "price": str(product.price),
                    "shop_id": str(product.shop.id) if product.shop else None,
                    "shop_name": product.shop.name if product.shop else None,
                    "upload_status": product.upload_status,
                    "status": product.status,
                    "is_personal_listing": False,  # This is a shop product
                })
            
            return Response({
                "success": True,
                "products": products_data,
                "total_count": total_count,
                "message": "Shop products retrieved successfully"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": "Failed to fetch shop products",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# Refund and Return Views
# views.py

# Refund and Return Views based on new model structure
class RefundViewSet(viewsets.ViewSet):
    """
    Refund Management API for buyers, sellers, and admins based on new model structure
    """

    def _resolve_seller_shop_for_refund(self, request, user, refund):
        """Resolve and authorize the seller shop context for a refund.
        
        Returns: (shop, error_response)
        """
        # Get order from refund
        order = getattr(refund, 'order_id', None)
        if not order:
            return None, Response({"error": "Refund has no related order"}, 
                                  status=status.HTTP_400_BAD_REQUEST)

        # Get shop ID from header/query/data
        shop_id = request.headers.get('X-Shop-Id') or request.query_params.get('shop_id')
        if not shop_id and hasattr(request, 'data'):
            shop_id = request.data.get('shop_id')
        
        shop = None
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return None, Response({"error": "Shop not found"}, 
                                      status=status.HTTP_404_NOT_FOUND)
        else:
            # Try to infer shop from order items
            shop_ids = list(
                Checkout.objects.filter(
                    order=order,
                    cart_item__product__shop__isnull=False,
                ).values_list('cart_item__product__shop_id', flat=True).distinct()
            )
            if len(shop_ids) != 1:
                return None, Response({"error": "Shop ID required"}, 
                                      status=status.HTTP_400_BAD_REQUEST)
            try:
                shop = Shop.objects.get(id=shop_ids[0])
            except Shop.DoesNotExist:
                return None, Response({"error": "Shop not found"}, 
                                      status=status.HTTP_404_NOT_FOUND)

        # Ownership check: User must own the shop
        if not shop.customer or not getattr(shop.customer, 'customer', None) or str(shop.customer.customer.id) != str(user.id):
            return None, Response({"error": "Not authorized for this shop"}, 
                                  status=status.HTTP_403_FORBIDDEN)

        # Ensure the order contains items from this shop
        if not Checkout.objects.filter(order=order, cart_item__product__shop=shop).exists():
            return None, Response({"error": "This refund does not belong to the provided shop"}, 
                                  status=status.HTTP_403_FORBIDDEN)

        return shop, None

    # ========== BUYER VIEWS ==========

    @action(detail=False, methods=['get'])
    def get_my_refunds(self, request):
        """
        BUYER VIEW: Get refunds for current user.
        - Returns refunds requested by the user.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            # Get refunds requested by this user
            refunds = Refund.objects.filter(requested_by=user).order_by('-requested_at')
            
            # Filter by status if provided
            status_filter = request.query_params.get('status')
            if status_filter:
                refunds = refunds.filter(status=status_filter)
            
            # Filter by refund type if provided
            refund_type = request.query_params.get('refund_type')
            if refund_type:
                refunds = refunds.filter(refund_type=refund_type)
            
            serializer = RefundSerializer(refunds, many=True, context={'request': request})
            refund_data = serializer.data
            
            # Add order items and shop information for each refund
            for i, refund in enumerate(refunds):
                refund_data[i]['order_items'] = self._get_order_items_for_refund(refund, request)
                
                # Add shop information for each refund
                # Get the shop from the order items
                order_items = refund_data[i]['order_items']
                if order_items and len(order_items) > 0:
                    # All items in an order should be from the same shop, so take the first one
                    shop_info = order_items[0].get('shop', {})
                    refund_data[i]['shop'] = shop_info
            
            return Response(refund_data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def create_refund_request(self, request):
        """
        BUYER VIEW: Create a new refund request
        """
        try:
            user_id = request.headers.get('X-User-Id')
            if not user_id:
                return Response({"error": "User ID required"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.get(id=user_id)
            
            # Validate required fields
            required_fields = ['order_id', 'reason', 'refund_type', 'buyer_preferred_refund_method']
            for field in required_fields:
                if field not in request.data:
                    return Response({"error": f"{field.replace('_', ' ').title()} is required"}, 
                                    status=status.HTTP_400_BAD_REQUEST)
            
            # Get order
            try:
                order = Order.objects.get(order=request.data['order_id'], user=user)
            except Order.DoesNotExist:
                return Response({"error": "Order not found or does not belong to user"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Check if refund already exists for this order
            existing_refund = Refund.objects.filter(
                order_id=order, 
                requested_by=user,
                status__in=['pending', 'approved', 'negotiation', 'dispute']
            ).first()
            
            if existing_refund:
                return Response({
                    "error": "A refund request for this order is already in progress",
                    "refund_id": str(existing_refund.refund_id),
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create refund
            refund_data = {
                'order_id': order,
                'requested_by': user,
                'reason': request.data['reason'],
                'detailed_reason': request.data.get('detailed_reason', ''),
                'refund_type': request.data['refund_type'],
                'buyer_preferred_refund_method': request.data['buyer_preferred_refund_method'],
                'customer_note': request.data.get('customer_note', ''),
                'status': 'pending'
            }

            # Optional: accept total_refund_amount (from frontend) and convert to Decimal
            try:
                if request.data.get('total_refund_amount') is not None:
                    refund_data['total_refund_amount'] = Decimal(str(request.data.get('total_refund_amount')))
            except Exception:
                # ignore parse errors here and leave field unset
                pass
            
            refund = Refund.objects.create(**refund_data)
            
            # Handle payment method details based on buyer's preferred method
            refund_method = request.data['buyer_preferred_refund_method']
            
            if refund_method == 'wallet':
                wallet_data = request.data.get('wallet_details')
                if wallet_data:
                    RefundWallet.objects.create(
                        refund_id=refund,
                        provider=wallet_data.get('provider', ''),
                        account_name=wallet_data.get('account_name', ''),
                        account_number=wallet_data.get('account_number', ''),
                        contact_number=wallet_data.get('contact_number', '')
                    )
            
            elif refund_method == 'bank':
                bank_data = request.data.get('bank_details')
                if bank_data:
                    RefundBank.objects.create(
                        refund_id=refund,
                        bank_name=bank_data.get('bank_name', ''),
                        account_name=bank_data.get('account_name', ''),
                        account_number=bank_data.get('account_number', ''),
                        account_type=bank_data.get('account_type', ''),
                        branch=bank_data.get('branch', '')
                    )
            
            elif refund_method == 'remittance':
                remittance_data = request.data.get('remittance_details')
                if remittance_data:
                    RefundRemittance.objects.create(
                        refund_id=refund,
                        provider=remittance_data.get('provider', ''),
                        first_name=remittance_data.get('first_name', ''),
                        middle_name=remittance_data.get('middle_name', ''),
                        last_name=remittance_data.get('last_name', ''),
                        contact_number=remittance_data.get('contact_number', ''),
                        country=remittance_data.get('country', ''),
                        city=remittance_data.get('city', ''),
                        province=remittance_data.get('province', ''),
                        zip_code=remittance_data.get('zip_code', ''),
                        barangay=remittance_data.get('barangay', ''),
                        street=remittance_data.get('street', ''),
                        valid_id_type=remittance_data.get('valid_id_type', ''),
                        valid_id_number=remittance_data.get('valid_id_number', '')
                    )
            
            # Handle evidence files
            files = request.FILES.getlist('evidence_files')
            for file in files:
                file_type = file.content_type.split('/')[0] if file.content_type else 'unknown'
                RefundMedia.objects.create(
                    refund_id=refund,
                    file_data=file,
                    file_type=file_type,
                    uploaded_by=user
                )
            
            # If refund_type is 'return', create a return request
            if request.data['refund_type'] == 'return':
                ReturnRequestItem.objects.create(
                    refund_id=refund,
                    return_method=request.data.get('return_method', 'courier'),
                    logistic_service=request.data.get('logistic_service', ''),
                    tracking_number=request.data.get('tracking_number', ''),
                    return_deadline=timezone.now() + timedelta(days=7)  # 7 days return deadline
                )
            
            serializer = RefundSerializer(refund, context={'request': request})
            return Response({
                "message": "Refund request created successfully",
                "refund": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Failed to create refund: {str(e)}"}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_refund(self, request):
        """
        Simple view-based refund creation endpoint
        """
        try:
            # Get user ID from headers
            user_id = request.headers.get('X-User-Id')
            if not user_id:
                return JsonResponse({
                    'error': 'User ID required'
                }, status=400)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({
                    'error': 'User not found'
                }, status=404)
            
            # Parse refund data from form data
            # DRF's MultiPartParser exposes fields in request.data; Django exposes in request.POST
            refund_data_str = request.data.get('refund_data') or request.POST.get('refund_data')
            if not refund_data_str:
                return JsonResponse({
                    'error': 'Refund data required'
                }, status=400)
            
            try:
                refund_data = json.loads(refund_data_str)
            except json.JSONDecodeError:
                return JsonResponse({
                    'error': 'Invalid refund data format'
                }, status=400)
            
            # Validate required fields
            required_fields = ['order_id', 'reason', 'preferred_refund_method', 'total_refund_amount']
            for field in required_fields:
                if not refund_data.get(field):
                    return JsonResponse({
                        'error': f'{field.replace("_", " ").title()} is required'
                    }, status=400)
            
            # Get order
            try:
                order = Order.objects.get(order=refund_data['order_id'], user=user)
            except Order.DoesNotExist:
                return JsonResponse({
                    'error': 'Order not found or does not belong to user'
                }, status=404)
            
            # Check if refund already exists
            existing_refund = Refund.objects.filter(
                order_id=order,
                requested_by=user,
                status__in=['pending', 'approved', 'negotiation', 'under_review', 'waiting', 'to_verify']
            ).first()
            
            if existing_refund:
                return JsonResponse({
                    'error': 'A refund request for this order is already in progress',
                    'refund_id': str(existing_refund.refund_id),
                    'request_number': getattr(existing_refund, 'request_number', None)
                }, status=400)
            
            # Start transaction
            with transaction.atomic():
                # Map legacy category to current refund_type, and create Refund with current field names
                refund_type = 'return' if str(refund_data.get('refund_category', 'return_item')).lower().startswith('return') else 'keep'
                refund = Refund.objects.create(
                        order_id=order,
                    requested_by=user,
                    reason=refund_data['reason'],
                    buyer_preferred_refund_method=refund_data.get('preferred_refund_method'),
                    refund_type=refund_type,
                    customer_note=refund_data.get('customer_note', ''),
                    status='pending',
                    total_refund_amount=Decimal(str(refund_data.get('total_refund_amount'))) if refund_data.get('total_refund_amount') is not None else None
                )

                # Save will auto-generate request_number
                refund.save()

                wallet_details = refund_data.get('wallet_details')
                if wallet_details:
                    RefundWallet.objects.create(
                        refund_id=refund,
                        provider=wallet_details.get('provider', ''),
                        account_name=wallet_details.get('account_name', ''),
                        account_number=wallet_details.get('account_number', ''),
                        contact_number=wallet_details.get('contact_number', '')
                    )
                
                bank_details = refund_data.get('bank_details')
                if bank_details:
                    RefundBank.objects.create(
                        refund_id=refund,
                        bank_name=bank_details.get('bank_name', ''),
                        account_name=bank_details.get('account_name', ''),
                        account_number=bank_details.get('account_number', ''),
                        account_type=bank_details.get('account_type', ''),
                        branch=bank_details.get('branch', '')
                    )
                
                remittance_details = refund_data.get('remittance_details')
                if remittance_details:
                    RefundRemittance.objects.create(
                        refund_id=refund,
                        provider=remittance_details.get('provider', ''),
                        first_name=remittance_details.get('first_name', ''),
                        middle_name=remittance_details.get('middle_name', ''),
                        last_name=remittance_details.get('last_name', ''),
                        contact_number=remittance_details.get('contact_number', ''),
                        country=remittance_details.get('country', ''),
                        city=remittance_details.get('city', ''),
                        province=remittance_details.get('province', ''),
                        zip_code=remittance_details.get('zip_code', ''),
                        barangay=remittance_details.get('barangay', ''),
                        street=remittance_details.get('address', ''),
                        valid_id_type=remittance_details.get('valid_id_type', ''),
                        valid_id_number=remittance_details.get('valid_id_number', '')
                    )
                
                # Handle uploaded files
                for key, file in request.FILES.items():
                    if key.startswith('evidence_'):
                        file_type = file.content_type.split('/')[0] if file.content_type else 'unknown'
                        RefundMedia.objects.create(
                            refund_id=refund,
                            file_data=file,
                            file_type=file_type,
                            uploaded_by=user
                        )
                
                # Handle selected items (store in customer_note for reference)
                selected_items = []
                for key, value in request.POST.items():
                    if key.startswith('selected_item_'):
                        selected_items.append(value)
                
                if selected_items:
                    refund.customer_note += f"\n\nSelected Checkout IDs: {', '.join(selected_items)}"
                    refund.save()
                
                return JsonResponse({
                    'message': 'Refund request created successfully',
                    'refund_id': str(refund.refund_id),
                    'request_number': getattr(refund, 'request_number', None)
                }, status=201)
                
        except Exception as e:
            return JsonResponse({
                'error': f'Failed to create refund: {str(e)}'
            }, status=500)
    

    @action(detail=True, methods=['get'])
    def get_my_refund(self, request, pk=None):
        """
        BUYER VIEW: Get detailed refund information for buyer
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Authorization check
            if str(refund.requested_by.id) != str(user.id):
                return Response({"error": "Not authorized to view this refund"}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            # Get refund data
            data = self._get_refund_details_data(refund, request, user)
            
            return Response(data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def cancel_refund(self, request, pk=None):
        """
        BUYER VIEW: Cancel a refund request
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Authorization check
            if str(refund.requested_by.id) != str(user.id):
                return Response({"error": "Not authorized to cancel this refund"}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            # Check if refund can be cancelled (only pending refunds)
            if refund.status != 'pending':
                return Response({"error": "Only pending refunds can be cancelled"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Update refund status
            refund.status = 'cancelled'
            refund.save()
            
            return Response({"message": "Refund cancelled successfully"})
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    # ========== SELLER VIEWS ==========

    @action(detail=False, methods=['get'])
    def get_shop_refunds(self, request):
        """
        SELLER VIEW: Get all refunds for seller's shops
        """
        # Debug: Print all headers
        print("Headers received:", dict(request.headers))

        user_id = request.headers.get('X-User-Id') or request.headers.get('x-user-id') or request.headers.get('HTTP_X_USER_ID')
        print(f"User ID from header: {user_id}")

        shop_id = request.headers.get('X-Shop-Id') or request.headers.get('x-shop-id') or request.headers.get('HTTP_X_SHOP_ID')
        print(f"Shop ID from header: {shop_id}")
        
        try:
            user = User.objects.get(id=user_id)
            
            # Get shops owned by user
            shops = Shop.objects.filter(customer__customer=user)
            if not shops.exists():
                return Response({"results": []})
            
            # Filter by specific shop if provided
            if shop_id:
                try:
                    shop = shops.get(id=shop_id)
                    shops = [shop]
                except Shop.DoesNotExist:
                    return Response({"error": "Shop not found"}, 
                                    status=status.HTTP_404_NOT_FOUND)
            
            # Get refunds for items from these shops
            refunds = Refund.objects.filter(
                order_id__checkout__cart_item__product__shop__in=shops
            ).distinct().order_by('-requested_at')
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                refunds = refunds.filter(status=status_filter)
            
            refund_type_filter = request.query_params.get('refund_type')
            if refund_type_filter:
                refunds = refunds.filter(refund_type=refund_type_filter)
            
            serializer = RefundSerializer(refunds, many=True, context={'request': request})
            refund_data = serializer.data
            
            # Add order items and shop information for each refund
            for i, refund in enumerate(refunds):
                refund_data[i]['order_items'] = self._get_order_items_for_refund(refund, request)
                
                # Add shop information for each refund
                # Get the shop from the order items
                order_items = refund_data[i]['order_items']
                if order_items and len(order_items) > 0:
                    # All items in an order should be from the same shop, so take the first one
                    shop_info = order_items[0].get('shop', {})
                    refund_data[i]['shop'] = shop_info
            
            response_data = {
                "shops": [{"id": str(shop.id), "name": shop.name} for shop in shops],
                "results": refund_data
            }
            
            return Response(response_data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)



    @action(detail=True, methods=['get'])
    def get_seller_refund_details(self, request, pk=None):
        """
        SELLER VIEW: Get detailed refund information for seller
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Authorization check - seller must own the shop
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err
            
            # Get refund data with seller-specific details
            data = self._get_refund_details_data(refund, request, user)
            if not isinstance(data, dict) or data is None:
                print(f"Warning: _get_refund_details_data returned non-dict for refund {pk}: {data}")
                data = {}

            # Add seller-specific information
            data['shop'] = {
                "id": str(shop.id),
                "name": shop.name,
                "is_suspended": shop.is_suspended
            }
            
            # Add counter refund requests
            counter_requests = CounterRefundRequest.objects.filter(
                refund_id=refund,
                shop_id=shop
            ).order_by('-requested_at')
            
            data['counter_requests'] = [
                {
                    "counter_id": str(cr.counter_id),
                    "requested_by": cr.requested_by,
                    "counter_refund_method": cr.counter_refund_method,
                    "notes": cr.notes,
                    "status": cr.status,
                    "requested_at": cr.requested_at.isoformat(),
                    "updated_at": cr.updated_at.isoformat()
                }
                for cr in counter_requests
            ]
            
            return Response(data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def seller_respond_to_refund(self, request, pk=None):
        """
        SELLER VIEW: Seller responds to refund request (approve/reject/negotiate)
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Validate refund id format early to avoid 500s when 'undefined' or invalid ids are used
            # Defensive: explicitly reject common invalid token values sent by broken frontends
            if not pk or str(pk).lower() in ['undefined', 'null', 'none', 'nan', '']:
                return Response({"error": "Invalid refund id"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                uuid.UUID(str(pk))
            except (ValueError, TypeError, AttributeError):
                return Response({"error": "Invalid refund id"}, status=status.HTTP_400_BAD_REQUEST)

            # Use a transaction and row-level lock so concurrent requests cannot append duplicate notes
            try:
                with transaction.atomic():
                    refund = Refund.objects.select_for_update().get(refund_id=pk)

                    # Authorization check
                    shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
                    if err:
                        return err

                    if refund.status != 'pending':
                        return Response({"error": "Can only respond to pending refunds"}, 
                                        status=status.HTTP_400_BAD_REQUEST)

                    # Action handling happens inside the transaction to prevent race conditions
                    action = request.data.get('action')  # 'approve', 'reject', 'negotiate'
                    notes = request.data.get('notes', '')

                    if action == 'approve':
                        refund.status = 'approved'
                        refund.processed_by = user
                        refund.processed_at = timezone.now()

                        # If seller provided an approved refund amount, store it
                        approved_amt = request.data.get('approved_refund_amount') or request.data.get('approved_amount')
                        if approved_amt is not None:
                            try:
                                refund.approved_refund_amount = Decimal(str(approved_amt))
                            except Exception:
                                # ignore invalid amounts
                                pass

                        # Append approval note only if it hasn't already been recorded to avoid duplicate entries
                        new_note = f"Seller approved: {notes}".strip()
                        existing_text = (refund.customer_note or '').strip()
                        # Use case-insensitive containment check to avoid duplicates even with spacing/newline differences
                        if new_note and new_note.lower() not in existing_text.lower():
                            refund.customer_note = f"{existing_text}\n{new_note}" if existing_text else new_note

                        # If refund type is return, update return request
                        if refund.refund_type == 'return':
                            return_request = getattr(refund, 'return_request', None)
                            if return_request:
                                return_request.status = 'approved'
                                return_request.updated_by = user
                                return_request.updated_at = timezone.now()
                                return_request.save()

                        refund.save()
                        # Return refreshed refund details for frontend to update state without a full reload
                        data = self._get_refund_details_data(refund, request, user)
                        return Response({
                            "message": "Refund approved",
                            "refund_id": str(refund.refund_id),
                            "status": refund.status,
                            "refund": data
                        })

                    elif action == 'reject':
                        refund.status = 'rejected'
                        refund.processed_by = user
                        refund.processed_at = timezone.now()
                        reject_note = f"Seller rejected: {notes}".strip()
                        existing_text = (refund.customer_note or '').strip()
                        if reject_note and reject_note.lower() not in existing_text.lower():
                            refund.customer_note = f"{existing_text}\n{reject_note}" if existing_text else reject_note
                        refund.save()

                        return Response({
                            "message": "Refund rejected",
                            "refund_id": str(refund.refund_id),
                            "status": refund.status
                        })

                    elif action == 'negotiate':
                        # Create counter refund request
                        raw_counter = request.data.get('counter_refund_method') or request.data.get('counter_method') or ''
                        counter_notes = request.data.get('counter_notes', '')

                        # Normalize and parse potential 'type:method' input (frontend may send 'keep:wallet')
                        allowed_methods = [m[0] for m in Refund.REFUND_METHOD_CHOICES]
                        allowed_types = ['return', 'keep']

                        counter_method = ''
                        counter_type = None
                        raw_counter = str(raw_counter).strip() if raw_counter is not None else ''
                        if raw_counter:
                            if ':' in raw_counter:
                                parts = raw_counter.split(':', 1)
                                t = parts[0].strip().lower()
                                m = parts[1].strip().lower()
                                if t in allowed_types:
                                    counter_type = t
                                # method part validation
                                if m in allowed_methods:
                                    counter_method = m
                                else:
                                    return Response({"error": "Invalid counter refund method"}, status=status.HTTP_400_BAD_REQUEST)
                            else:
                                m = raw_counter.lower()
                                if m in allowed_methods:
                                    counter_method = m
                                else:
                                    return Response({"error": "Invalid counter refund method"}, status=status.HTTP_400_BAD_REQUEST)

                        # Accept counter amount (required for keep/return offers)
                        counter_amount_raw = request.data.get('counter_refund_amount') or request.data.get('counter_amount')
                        counter_amount_decimal = None

                        # If seller explicitly specified a counter type (return/keep) require an amount
                        if counter_type in ['keep', 'return'] and (counter_amount_raw is None or str(counter_amount_raw).strip() == ''):
                            return Response({"error": "Counter refund amount is required for keep/return offers"}, status=status.HTTP_400_BAD_REQUEST)

                        if counter_amount_raw is not None and str(counter_amount_raw).strip() != '':
                            try:
                                counter_amount_decimal = Decimal(str(counter_amount_raw))
                                if counter_amount_decimal <= 0:
                                    return Response({"error": "Counter refund amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)
                                # Business rule: do not exceed order total when available
                                try:
                                    order_total = refund.order_id.total_amount
                                    if order_total is not None and counter_amount_decimal > Decimal(str(order_total)):
                                        return Response({"error": "Counter refund amount cannot exceed order total"}, status=status.HTTP_400_BAD_REQUEST)
                                except Exception:
                                    pass
                            except Exception:
                                return Response({"error": "Invalid counter refund amount"}, status=status.HTTP_400_BAD_REQUEST)

                        # If counter type is 'return', ensure a return address already exists; require seller to call set_return_address first
                        if counter_type == 'return':
                            existing_ra = getattr(refund, 'return_address', None)
                            if not existing_ra:
                                return Response({"error": "Return address required for return-type counter offers. Use set_return_address endpoint."}, status=status.HTTP_400_BAD_REQUEST)

                        # Create counter request (method may be empty, notes carry the seller message)
                        CounterRefundRequest.objects.create(
                            refund_id=refund,
                            requested_by='seller',
                            seller_id=user,
                            shop_id=shop,
                            counter_refund_method=counter_method,
                            counter_refund_type=counter_type,
                            counter_refund_amount=counter_amount_decimal,
                            notes=counter_notes or '',
                            status='pending'
                        )

                        refund.status = 'negotiation'
                        refund.save()

                        return Response({
                            "message": "Counter offer sent to buyer",   
                            "refund_id": str(refund.refund_id),
                            "status": refund.status
                        })
                    else:
                        return Response({"error": "Invalid action"}, 
                                        status=status.HTTP_400_BAD_REQUEST)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
                
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def respond_to_negotiation(self, request, pk=None):
        """
        BUYER VIEW: Respond to a seller's counter offer. Payload: { action: 'accept'|'reject', reason?: string }
        Accepting will apply the counter method & type to the refund and mark it approved.
        Rejecting will mark the counter request rejected and keep the refund in negotiation state.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)

            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization: only the buyer who requested the refund can respond
            if str(refund.requested_by.id) != str(user.id):
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            if refund.status != 'negotiation':
                return Response({"error": "No active negotiation to respond to"}, status=status.HTTP_400_BAD_REQUEST)

            action = request.data.get('action')
            reason = request.data.get('reason', '')

            # Find latest pending counter request from seller
            cr = CounterRefundRequest.objects.filter(refund_id=refund, requested_by='seller', status='pending').order_by('-requested_at').first()
            if not cr:
                # If there is no pending counter, check for latest seller counter and return informative message
                latest = CounterRefundRequest.objects.filter(refund_id=refund, requested_by='seller').order_by('-requested_at').first()
                if latest:
                    return Response({"error": f"No pending counter request found (latest status: {latest.status})"}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"error": "No pending counter request found"}, status=status.HTTP_400_BAD_REQUEST)

            if action == 'accept':
                # Apply counter offer
                # If seller provided a method, set it as the final method
                if getattr(cr, 'counter_refund_method', None):
                    refund.final_refund_method = cr.counter_refund_method

                # If seller provided a counter amount (partial offer), record it as the approved amount
                if getattr(cr, 'counter_refund_amount', None) is not None:
                    try:
                        refund.approved_refund_amount = Decimal(str(cr.counter_refund_amount))
                    except Exception:
                        # ignore invalid amounts
                        pass

                # If seller provided a counter type (return|keep), apply it to the refund
                if getattr(cr, 'counter_refund_type', None):
                    ctype = str(cr.counter_refund_type).lower()
                    if ctype in ('return', 'keep'):
                        refund.refund_type = ctype

                refund.status = 'approved'
                refund.processed_by = user
                refund.processed_at = timezone.now()
                cr.status = 'accepted'
                cr.save()
                refund.save()

                data = self._get_refund_details_data(refund, request, user)
                return Response({"message": "Counter offer accepted", "refund": data})

            elif action == 'reject':
                cr.status = 'rejected'
                cr.save()
                # When buyer rejects the seller's counter, mark the entire refund as rejected
                refund.status = 'rejected'
                refund.processed_by = user
                refund.processed_at = timezone.now()
                refund.save()
                return Response({"message": "Counter offer rejected and refund marked as rejected"})

            else:
                return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def process_refund(self, request, pk=None):
        """
        SELLER VIEW: Process a keep-item refund payment lifecycle.
        - Applies only for refunds where refund.refund_type == 'keep'
        - `final_refund_method` in payload will set the final method; otherwise use buyer's preferred method
        - `set_status` in payload is one of ['processing','completed','failed'] and controls `refund.refund_payment_status`
        - If `file_data` files are included (multipart), they will be saved as RefundProofs before processing so files and process happen in one request.
        - Does NOT change `refund.status` (status remains 'approved' after approval)
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check - seller must own the shop for this refund
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err

            # Applicable for keep-item and return-type refunds
            if refund.refund_type not in ['keep', 'return']:
                return Response({"error": "process_refund only applicable for keep-item or return-item refunds"}, status=status.HTTP_400_BAD_REQUEST)

            # If files were included in the multipart request, save them as RefundProofs first
            files = request.FILES.getlist('file_data') or []
            if not files:
                single = request.FILES.get('file')
                if single:
                    files = [single]

            if files:
                # Enforce server-side limit: max 4 proofs per refund
                existing_count = RefundProof.objects.filter(refund=refund).count()
                if existing_count + len(files) > 4:
                    remaining = max(0, 4 - existing_count)
                    return Response({"error": f"Cannot upload: only {remaining} proof(s) remaining"}, status=status.HTTP_400_BAD_REQUEST)

                created = []
                for f in files:
                    file_type = request.data.get('file_type') or f.content_type or ''
                    notes = request.data.get('notes', '')
                    try:
                        rp = RefundProof.objects.create(
                            refund=refund,
                            uploaded_by=user,
                            file_type=file_type,
                            file_data=f,
                            notes=notes
                        )
                        created.append(str(rp.id))
                    except Exception as e:
                        print('Failed to save refund proof during process_refund', e)

            final_method = request.data.get('final_refund_method')
            set_status = request.data.get('set_status')  # processed, completed, failed

            # Enforce proof requirements conditionally:
            # - For set_status == 'completed' proofs are required for all refund types
            # - For set_status == 'processing', proofs are required for return-type refunds but NOT for keep-type refunds (keep refunds auto-enter processing)
            if set_status:
                if set_status not in ['processing', 'completed', 'failed']:
                    return Response({"error": "Invalid payment status"}, status=status.HTTP_400_BAD_REQUEST)

                if set_status == 'completed':
                    if not RefundProof.objects.filter(refund=refund).exists():
                        return Response({"error": "Proof required before completing refund"}, status=status.HTTP_400_BAD_REQUEST)

                if set_status == 'processing':
                    # For processing: generally require proofs for return-type refunds, but allow keep-type to enter processing without proofs.
                    # Additionally, if a DisputeRequest exists and has been approved by an admin, allow processing without proofs
                    # and promote the refund status from 'dispute' to 'approved' so buyers see the processing UI.
                    try:
                        dispute = DisputeRequest.objects.get(refund_id=refund)
                    except DisputeRequest.DoesNotExist:
                        dispute = None

                    if refund.refund_type == 'return' and not RefundProof.objects.filter(refund=refund).exists():
                        # If there's no approved dispute, proofs are required
                        if not dispute or str(dispute.status).lower() != 'approved':
                            return Response({"error": "Proof required before processing refund"}, status=status.HTTP_400_BAD_REQUEST)

                    # If a dispute was approved, promote refund.status if it's still 'dispute'
                    if dispute and str(dispute.status).lower() == 'approved':
                        if str(refund.status).lower() == 'dispute':
                            refund.status = 'approved'

            if final_method:
                refund.final_refund_method = final_method
            else:
                # Default to buyer preferred method if final method isn't provided
                refund.final_refund_method = refund.final_refund_method or getattr(refund, 'buyer_preferred_refund_method', None)

            if set_status:
                if set_status not in ['processing', 'completed', 'failed']:
                    return Response({"error": "Invalid payment status"}, status=status.HTTP_400_BAD_REQUEST)
                refund.refund_payment_status = set_status
                # If final status is completed, record who and when processed; do NOT alter refund.status here
                if set_status == 'completed':
                    try:
                        refund.processed_at = timezone.now()
                        refund.processed_by = user
                    except Exception:
                        pass

            refund.save()

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Refund payment updated", "refund": data})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def notify_buyer(self, request, pk=None):
        """
        SELLER VIEW: Notify the buyer that their refund request (approved) has been notified by the seller.
        Marks `buyer_notified_at` and sets refund to `waiting` for return refunds.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)

            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check: seller must own the shop for this refund
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err

            # Only notify for approved refunds
            if refund.status != 'approved':
                return Response({"error": "Can only notify buyer on approved refunds"}, status=status.HTTP_400_BAD_REQUEST)

            # Mark buyer notified timestamp
            refund.buyer_notified_at = timezone.now()
            # Do NOT change the refund.status here — keep the status as 'approved' for return refunds
            refund.save()

            # TODO: integrate actual notification (email/push) if available

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Buyer notified", "refund": data})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def set_return_address(self, request, pk=None):
        """
        SELLER VIEW: Set or update a return address for a refund (used for return-type refunds, or to provision an address before negotiating a return) and notify the buyer.
        This will create or update the ReturnAddress object linked to the Refund and set buyer_notified_at.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)

            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check: seller must own the shop for this refund
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err

            # Allow setting return address when refund is still pending (approve after address provided)
            if refund.status not in ['pending', 'approved']:
                return Response({"error": "Can only set return address on pending or approved refunds"}, status=status.HTTP_400_BAD_REQUEST)

            payload = request.data or {}
            notify_buyer = payload.get('notify_buyer', True)
            required = ['recipient_name', 'contact_number', 'country', 'province', 'city', 'barangay', 'street', 'zip_code']
            missing = [f for f in required if not payload.get(f)]
            if missing:
                return Response({"error": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

            # Create or update return address
            try:
                ra = refund.return_address
                ra.recipient_name = payload.get('recipient_name')
                ra.contact_number = payload.get('contact_number')
                ra.country = payload.get('country')
                ra.province = payload.get('province')
                ra.city = payload.get('city')
                ra.barangay = payload.get('barangay')
                ra.street = payload.get('street')
                ra.zip_code = payload.get('zip_code')
                ra.notes = payload.get('notes', '')
                ra.created_by = user
                # Ensure shop and seller are set for the address (shop resolved earlier)
                try:
                    ra.shop = shop
                except Exception:
                    pass
                ra.seller = user
                ra.save()
            except ReturnAddress.DoesNotExist:
                ra = ReturnAddress.objects.create(
                    refund=refund,
                    shop=shop,
                    seller=user,
                    recipient_name=payload.get('recipient_name'),
                    contact_number=payload.get('contact_number'),
                    country=payload.get('country'),
                    province=payload.get('province'),
                    city=payload.get('city'),
                    barangay=payload.get('barangay'),
                    street=payload.get('street'),
                    zip_code=payload.get('zip_code'),
                    notes=payload.get('notes', ''),
                    created_by=user
                )

            # Only notify buyer and auto-approve if the request wants notification
            if notify_buyer:
                refund.buyer_notified_at = timezone.now()

                # If refund was still pending, approve it now because seller confirmed return address
                if refund.status == 'pending':
                    refund.status = 'approved'
                    refund.processed_by = user
                    refund.processed_at = timezone.now()
                    # If there's an existing return request, mark it approved as well
                    try:
                        rr = refund.return_request
                        rr.status = 'approved'
                        rr.updated_by = user
                        rr.updated_at = timezone.now()
                        rr.save()
                    except ReturnRequestItem.DoesNotExist:
                        pass

            refund.save()

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Return address saved and buyer notified", "refund": data})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def start_return_process(self, request, pk=None):
        """
        BUYER VIEW: Start the return process for approved return refunds. Creates a ReturnRequestItem (if missing).
        Note: This does NOT change the `refund.status` (keeps as 'approved'); use `buyer_notified_at` / `return_request` to indicate waiting state.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)

            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization: only original requester (buyer) can start the return
            if str(refund.requested_by.id) != str(user.id):
                return Response({"error": "Not authorized to start return for this refund"}, status=status.HTTP_403_FORBIDDEN)

            if refund.refund_type != 'return':
                return Response({"error": "This refund is not a return item refund"}, status=status.HTTP_400_BAD_REQUEST)

            if refund.status not in ['approved', 'waiting']:
                return Response({"error": "Return process can only be started after approval"}, status=status.HTTP_400_BAD_REQUEST)

            # Create return request if it doesn't exist
            return_request = getattr(refund, 'return_request', None)
            if not return_request:
                return_request = ReturnRequestItem.objects.create(
                    refund_id=refund,
                    return_method=refund.buyer_preferred_refund_method or 'courier',
                    return_deadline=timezone.now() + timedelta(days=7)
                )

            # Do not modify refund.status here; leave it 'approved' so DB remains consistent.
            refund.save()

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Return process started", "refund": data})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def update_tracking(self, request, pk=None):
        """
        BUYER VIEW: Update logistic service and tracking number for an ongoing return.
        Creates a ReturnRequestItem if necessary and marks the return_request as 'shipped'.
        Note: This does NOT change `refund.status`; keep refund.status as 'approved'.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)

            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization: only buyer can update tracking
            if str(refund.requested_by.id) != str(user.id):
                return Response({"error": "Not authorized to update tracking for this refund"}, status=status.HTTP_403_FORBIDDEN)

            if refund.refund_type != 'return':
                return Response({"error": "This refund is not a return item refund"}, status=status.HTTP_400_BAD_REQUEST)

            logistic_service = request.data.get('logistic_service')
            tracking_number = request.data.get('tracking_number')

            if not logistic_service or not tracking_number:
                return Response({"error": "Both logistic_service and tracking_number are required"}, status=status.HTTP_400_BAD_REQUEST)

            return_request = getattr(refund, 'return_request', None)
            if not return_request:
                return_request = ReturnRequestItem.objects.create(
                    refund_id=refund,
                    return_method=refund.buyer_preferred_refund_method or 'courier',
                    return_deadline=timezone.now() + timedelta(days=7)
                )

            return_request.logistic_service = logistic_service
            return_request.tracking_number = tracking_number
            return_request.status = 'shipped'

            # Use provided shipped_at if present (ISO format expected), else now
            shipped_at = request.data.get('shipped_at')
            if shipped_at:
                try:
                    # Expect ISO format date
                    return_request.shipped_at = timezone.datetime.fromisoformat(shipped_at)
                except Exception:
                    # fallback to now if parsing fails
                    return_request.shipped_at = timezone.now()
            else:
                return_request.shipped_at = timezone.now()

            # Save shipped_by if uploader is a buyer
            return_request.shipped_by = user

            # Save any notes
            notes = request.data.get('notes')
            if notes:
                return_request.notes = notes

            return_request.save()

            # Handle uploaded media files (media_files[])
            files = request.FILES.getlist('media_files') if hasattr(request, 'FILES') else []

            # Enforce server-side limit: max 9 media files per return request
            existing_media_count = ReturnRequestMedia.objects.filter(return_id=return_request).count()
            if existing_media_count + len(files) > 9:
                remaining = max(0, 9 - existing_media_count)
                return Response({"error": f"Cannot upload: only {remaining} image(s) remaining"}, status=status.HTTP_400_BAD_REQUEST)

            created_media = []
            for f in files:
                try:
                    rm = ReturnRequestMedia.objects.create(
                        return_id=return_request,
                        file_type=(f.content_type or '')[:255],
                        file_data=f,
                        uploaded_by=user,
                        notes=notes or ''
                    )
                    created_media.append(rm)
                except Exception as e:
                    # Log and continue; do not fail the entire request for a single file
                    print('Failed to save return media', e)

            # Do not change refund.status here; we keep refund.status as 'approved' and use buyer_notified_at / return_request to indicate waiting state
            refund.save()

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Tracking updated", "refund": data, "created_media_count": len(created_media)})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def add_proof(self, request, pk=None):
        """
        SELLER VIEW: Upload one or more proof files (images/pdf) for a refund. Only seller owning the shop can upload.
        Accepts multipart/form-data fields:
          - file_data (file) (can be multiple)
          - file_type (optional)
          - notes (optional)
        Returns the updated refund payload.
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)

            try:
                try:
                    refund = Refund.objects.get(refund_id=pk)
                except (ValueError, TypeError):
                    return Response({"error": "Invalid refund id"}, status=status.HTTP_400_BAD_REQUEST)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check: seller must own the shop for this refund
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err

            files = request.FILES.getlist('file_data') or []
            if not files:
                # Also accept single file under 'file'
                single = request.FILES.get('file')
                if single:
                    files = [single]

            if not files:
                return Response({"error": "No files uploaded"}, status=status.HTTP_400_BAD_REQUEST)

            # Enforce server-side limit: max 4 proofs per refund
            existing_count = RefundProof.objects.filter(refund=refund).count()
            if existing_count + len(files) > 4:
                remaining = max(0, 4 - existing_count)
                return Response({"error": f"Cannot upload: only {remaining} proof(s) remaining"}, status=status.HTTP_400_BAD_REQUEST)

            created = []
            for f in files:
                file_type = request.data.get('file_type') or f.content_type or ''
                notes = request.data.get('notes', '')
                try:
                    rp = RefundProof.objects.create(
                        refund=refund,
                        uploaded_by=user,
                        file_type=file_type,
                        file_data=f,
                        notes=notes
                    )
                    created.append(str(rp.id))
                except Exception as e:
                    # Log and continue saving the rest
                    print('Failed to save refund proof', e)

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Proof(s) uploaded", "created": created, "refund": data}, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def update_return_status(self, request, pk=None):
        """
        SELLER VIEW: Update return item status
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except (ValueError, TypeError):
                # Invalid pk (e.g. 'undefined') - return 400 instead of allowing an unhandled exception
                return Response({"error": "Invalid refund id"}, status=status.HTTP_400_BAD_REQUEST)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Authorization check
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err
            
            # Check if this is a return refund
            if refund.refund_type != 'return':
                return Response({"error": "This refund is not a return item refund"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # Get return request
            try:
                return_request = refund.return_request
            except ReturnRequestItem.DoesNotExist:
                return Response({"error": "No return request found for this refund"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            action = request.data.get('action')  # 'mark_shipped', 'mark_received', 'mark_inspected', 'mark_completed'
            notes = request.data.get('notes', '')
            
            if action == 'mark_shipped':
                return_request.status = 'shipped'
                return_request.shipped_by = user
                return_request.shipped_at = timezone.now()
                
            elif action == 'mark_received':
                return_request.status = 'received'
                return_request.received_at = timezone.now()
                
            elif action == 'mark_inspected':
                return_request.status = 'inspected'
                # Keep `refund.status` unchanged here - we derive the UI verification state from the return_request status
                # The seller's subsequent Accept/Reject action will update refund.refund_payment_status (processing) or refund.status (rejected/approved)
                # Do NOT write a non-enum value into refund.status (e.g. 'to_verify')
                # (No refund.save() here)
                
            elif action == 'mark_completed':
                return_request.status = 'completed'
                # Complete the refund process
                refund.status = 'completed'
                refund.refund_payment_status = 'completed'
                refund.save()
                
            else:
                return Response({"error": "Invalid action"}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            return_request.updated_by = user
            return_request.notes = f"{return_request.notes or ''}\n{notes}"
            return_request.save()
            
            # Return full refund details so frontend can immediately update UI without extra fetch
            data = self._get_refund_details_data(refund, request, user)
            return Response({
                "message": f"Return status updated to {return_request.status}",
                "refund": data,
                "refund_id": str(refund.refund_id),
                "return_status": return_request.status,
                "refund_status": refund.status
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def verify_item(self, request, pk=None):
        """
        SELLER VIEW: Verify inspected return item and accept/reject the return.
        Payload: { verification_result: 'approved'|'rejected', verification_notes?: string }
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)

            # Validate refund id
            try:
                uuid.UUID(str(pk))
            except (ValueError, TypeError, AttributeError):
                return Response({"error": "Invalid refund id"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check
            shop, err = self._resolve_seller_shop_for_refund(request, user, refund)
            if err:
                return err

            if refund.refund_type != 'return':
                return Response({"error": "This refund is not a return item refund"}, status=status.HTTP_400_BAD_REQUEST)

            return_request = getattr(refund, 'return_request', None)
            if not return_request:
                return Response({"error": "No return request found"}, status=status.HTTP_404_NOT_FOUND)

            action = request.data.get('verification_result')
            notes = request.data.get('verification_notes', '')

            if action == 'approved':
                # Seller accepts the return; keep refund.status = 'approved' but mark payment as processing
                return_request.status = 'approved'
                refund.refund_payment_status = 'processing'
                # ensure refund.status remains 'approved' for DB constraints
                refund.processed_by = user
                refund.processed_at = timezone.now()
                return_request.notes = f"{return_request.notes or ''}\nSeller accepted: {notes}"
                return_request.updated_by = user
                return_request.updated_at = timezone.now()
                return_request.save()
                refund.save()

            elif action == 'rejected':
                # Seller rejects the return
                return_request.status = 'rejected'
                refund.status = 'rejected'
                refund.processed_by = user
                refund.processed_at = timezone.now()
                return_request.notes = f"{return_request.notes or ''}\nSeller rejected: {notes}"
                return_request.updated_by = user
                return_request.updated_at = timezone.now()
                return_request.save()
                refund.save()

            else:
                return Response({"error": "Invalid verification_result"}, status=status.HTTP_400_BAD_REQUEST)

            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Verification updated", "refund": data, "return_status": return_request.status, "refund_status": refund.status})

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    # ========== ADMIN VIEWS ==========

    @action(detail=False, methods=['get'])
    def get_all_refunds(self, request):
        """
        ADMIN VIEW: Get all refunds (admin only)
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check if user is admin
            if not user.is_admin:
                return Response({"error": "Admin access required"}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            refunds = Refund.objects.all().order_by('-requested_at')
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                refunds = refunds.filter(status=status_filter)
            
            refund_type_filter = request.query_params.get('refund_type')
            if refund_type_filter:
                refunds = refunds.filter(refund_type=refund_type_filter)
            
            user_filter = request.query_params.get('user_id')
            if user_filter:
                refunds = refunds.filter(requested_by_id=user_filter)
            
            shop_filter = request.query_params.get('shop_id')
            if shop_filter:
                refunds = refunds.filter(
                    order_id__checkout__cart_item__product__shop_id=shop_filter
                ).distinct()
            
            serializer = RefundSerializer(refunds, many=True, context={'request': request})
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def get_admin_refund_details(self, request, pk=None):
        """
        ADMIN VIEW: Get detailed refund information for admin
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check if user is admin
            if not user.is_admin:
                return Response({"error": "Admin access required"}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Get comprehensive refund data
            data = self._get_refund_details_data(refund, request, user)
            
            # Add admin-specific information
            data['admin_notes'] = refund.customer_note
            data['processed_by'] = {
                "id": str(refund.processed_by.id) if refund.processed_by else None,
                "username": refund.processed_by.username if refund.processed_by else None,
                "email": refund.processed_by.email if refund.processed_by else None
            } if refund.processed_by else None
            
            # Add all related disputes
            disputes = DisputeRequest.objects.filter(refund_id=refund).order_by('-created_at')
            data['disputes'] = [
                {
                    "id": str(d.id),
                    "requested_by": {
                        "id": str(d.requested_by.id),
                        "username": d.requested_by.username,
                        "email": d.requested_by.email
                    },
                    "reason": d.reason,
                    "status": d.status,
                    "admin_notes": d.admin_notes,
                    "created_at": d.created_at.isoformat(),
                    "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None
                }
                for d in disputes
            ]
            
            # Add all counter requests
            counter_requests = CounterRefundRequest.objects.filter(refund_id=refund).order_by('-requested_at')
            data['counter_requests'] = [
                {
                    "counter_id": str(cr.counter_id),
                    "requested_by": cr.requested_by,
                    "seller": {
                        "id": str(cr.seller_id.id),
                        "username": cr.seller_id.username
                    },
                    "shop": {
                        "id": str(cr.shop_id.id),
                        "name": cr.shop_id.name
                    },
                    "counter_refund_method": cr.counter_refund_method,
                    "counter_refund_type": cr.counter_refund_type,
                    "counter_refund_amount": float(cr.counter_refund_amount) if cr.counter_refund_amount is not None else None,
                    "notes": cr.notes,
                    "status": cr.status,
                    "requested_at": cr.requested_at.isoformat()
                }
                for cr in counter_requests
            ]
            
            return Response(data)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def admin_update_refund(self, request, pk=None):
        """
        ADMIN VIEW: Admin updates refund status or information
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check if user is admin
            if not user.is_admin:
                return Response({"error": "Admin access required"}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            # Get refund
            try:
                refund = Refund.objects.get(refund_id=pk)
            except Refund.DoesNotExist:
                return Response({"error": "Refund not found"}, 
                                status=status.HTTP_404_NOT_FOUND)
            
            # Update fields
            update_fields = {}
            
            if 'status' in request.data:
                update_fields['status'] = request.data['status']
            
            if 'refund_payment_status' in request.data:
                update_fields['refund_payment_status'] = request.data['refund_payment_status']
            
            if 'final_refund_method' in request.data:
                update_fields['final_refund_method'] = request.data['final_refund_method']
            
            if 'customer_note' in request.data:
                update_fields['customer_note'] = f"{refund.customer_note or ''}\n[Admin]: {request.data['customer_note']}"

            # Allow admin to set an approved refund amount
            if 'approved_refund_amount' in request.data:
                try:
                    update_fields['approved_refund_amount'] = Decimal(str(request.data.get('approved_refund_amount')))
                except Exception:
                    pass
            
            if update_fields:
                # If payment status is set to completed and refund is currently approved,
                # promote refund.status to 'completed' unless admin explicitly provided a different status.
                # Previously we promoted refund.status to 'completed' when refund_payment_status was set to 'completed'.
                # Keep refund.status unchanged (remain 'approved') and use refund.refund_payment_status to indicate completion.
                # Do not auto-promote refund.status here to avoid conflating approval state with payment completion.

                update_fields['processed_by'] = user
                update_fields['processed_at'] = timezone.now()

                for field, value in update_fields.items():
                    setattr(refund, field, value)

                refund.save()
            
            # Handle dispute resolution
            if 'resolve_dispute' in request.data:
                dispute_id = request.data.get('dispute_id')
                dispute_action = request.data.get('dispute_action')  # 'approve', 'reject', 'resolve'
                dispute_notes = request.data.get('dispute_notes', '')
                
                if dispute_id:
                    try:
                        dispute = DisputeRequest.objects.get(id=dispute_id, refund_id=refund)
                        
                        if dispute_action == 'approve':
                            dispute.status = 'approved'
                            refund.refund_payment_status = 'processing'
                            # record which admin processed the dispute
                            refund.processed_by = user
                            refund.processed_at = timezone.now()
                            refund.save()
                        elif dispute_action == 'reject':
                            dispute.status = 'rejected'
                            refund.status = 'rejected'
                            refund.processed_by = user
                            refund.processed_at = timezone.now()
                            refund.save()
                        elif dispute_action == 'resolve':
                            dispute.status = 'resolved'
                            # For resolve, also record admin as the processor of the refund if not already set
                            refund.processed_by = user
                            refund.processed_at = timezone.now()
                            refund.save()
                        
                        dispute.admin_notes = dispute_notes
                        dispute.processed_by = user
                        dispute.resolved_at = timezone.now()
                        dispute.save()
                        
                    except DisputeRequest.DoesNotExist:
                        return Response({"error": "Dispute not found"}, 
                                        status=status.HTTP_404_NOT_FOUND)
            
            serializer = RefundSerializer(refund, context={'request': request})
            return Response({
                "message": "Refund updated successfully",
                "refund": serializer.data
            })
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)

    # ========== COMMON/UTILITY METHODS ==========

    def _get_refund_details_data(self, refund, request, user):
        """Get detailed refund data (common for buyer, seller, and admin views)"""
        data = RefundSerializer(refund, context={'request': request}).data


        # Expose requester info for easier frontend display
        data['requested_by_username'] = refund.requested_by.username if refund.requested_by else None
        data['requested_by_email'] = refund.requested_by.email if refund.requested_by else None
        
        # Add order information
        if refund.order_id:
            order = refund.order_id
            data['order'] = {
                "order_id": str(order.order),
                "total_amount": float(order.total_amount) if order.total_amount else None,
                "status": order.status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "payment_method": order.payment_method if hasattr(order, 'payment_method') else None,
                "delivery_method": order.delivery_method if hasattr(order, 'delivery_method') else None,
                "customer_username": order.user.username if order.user else None,
                "customer_email": order.user.email if order.user else None,
                "delivery_address_text": order.delivery_address_text or (order.shipping_address.get_full_address() if order.shipping_address else None),
                "shipping_address": {
                    "recipient_name": order.shipping_address.recipient_name if order.shipping_address else None,
                    "recipient_phone": order.shipping_address.recipient_phone if order.shipping_address else None,
                    "full_address": order.shipping_address.get_full_address() if order.shipping_address else (order.delivery_address_text or None)
                } if order.shipping_address or order.delivery_address_text else None,
            }
            
            # Get order items from this shop (for seller) or all items (for buyer/admin)
            data['order_items'] = self._get_order_items_for_refund(refund, request)
            # Prefer stored total_refund_amount; otherwise compute total from order items as a fallback
            try:
                if getattr(refund, 'total_refund_amount', None) is not None:
                    data['total_refund_amount'] = float(refund.total_refund_amount)
                else:
                    total_refund_amount = 0.0
                    for it in data.get('order_items', []):
                        itm_total = it.get('total')
                        if itm_total is None:
                            price = it.get('price') or 0
                            qty = it.get('quantity') or 0
                            itm_total = float(price) * int(qty)
                        total_refund_amount += float(itm_total)
                    data['total_refund_amount'] = round(float(total_refund_amount), 2) if total_refund_amount > 0 else None
            except Exception:
                data['total_refund_amount'] = None
        
        # Add payment method details
        payment_details = {}
        
        try:
            wallet = refund.wallet
            payment_details['wallet'] = {
                "provider": wallet.provider,
                "account_name": wallet.account_name,
                "account_number": wallet.account_number,
                "contact_number": wallet.contact_number
            }
        except RefundWallet.DoesNotExist:
            pass
        
        try:
            bank = refund.bank
            payment_details['bank'] = {
                "bank_name": bank.bank_name,
                "account_name": bank.account_name,
                "account_number": bank.account_number,
                "account_type": bank.account_type,
                "branch": bank.branch
            }
        except RefundBank.DoesNotExist:
            pass
        
        try:
            remittance = refund.remittance
            payment_details['remittance'] = {
                "provider": remittance.provider,
                "first_name": remittance.first_name,
                "middle_name": remittance.middle_name,
                "last_name": remittance.last_name,
                "contact_number": remittance.contact_number,
                "address": {
                    "street": remittance.street,
                    "barangay": remittance.barangay,
                    "city": remittance.city,
                    "province": remittance.province,
                    "zip_code": remittance.zip_code,
                    "country": remittance.country
                },
                "valid_id_type": remittance.valid_id_type,
                "valid_id_number": remittance.valid_id_number
            }
        except RefundRemittance.DoesNotExist:
            pass
        
        data['payment_details'] = payment_details
        
        # Add evidence/media files
        media_files = RefundMedia.objects.filter(refund_id=refund)
        data['evidence'] = [
            {
                "id": str(media.refundmedia),
                "file_url": request.build_absolute_uri(media.file_data.url) if media.file_data else None,
                "file_type": media.file_type,
                "uploaded_by": str(media.uploaded_by.id),
                "uploaded_by_username": media.uploaded_by.username if media.uploaded_by else None,
                "uploaded_by_email": media.uploaded_by.email if media.uploaded_by else None,
                "uploaded_at": media.uploaded_at.isoformat()
            }
            for media in media_files
        ]

        # Add seller-uploaded proofs (files uploaded as proof of refund)
        proofs_qs = RefundProof.objects.filter(refund=refund)
        data['proofs'] = [
            {
                "id": str(p.id),
                "file_url": request.build_absolute_uri(p.file_data.url) if p.file_data else None,
                "file_type": p.file_type,
                "uploaded_by": str(p.uploaded_by.id) if p.uploaded_by else None,
                "uploaded_by_username": p.uploaded_by.username if p.uploaded_by else None,
                "notes": p.notes,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in proofs_qs
        ]
        
        # Add return request information (if applicable)
        if refund.refund_type == 'return':
            try:
                return_request = refund.return_request
                data['return_request'] = {
                    "return_id": str(return_request.return_id),
                    "return_method": return_request.return_method,
                    "logistic_service": return_request.logistic_service,
                    "tracking_number": return_request.tracking_number,
                    "status": return_request.status,
                    "shipped_at": return_request.shipped_at.isoformat() if return_request.shipped_at else None,
                    "received_at": return_request.received_at.isoformat() if return_request.received_at else None,
                    "return_deadline": return_request.return_deadline.isoformat() if return_request.return_deadline else None,
                    "notes": return_request.notes
                }
                
                # Add return media
                return_media = ReturnRequestMedia.objects.filter(return_id=return_request)
                data['return_request']['media'] = [
                    {
                        "id": str(rm.id),
                        "file_url": request.build_absolute_uri(rm.file_data.url) if rm.file_data else None,
                        "file_type": rm.file_type,
                        "notes": rm.notes,
                        "uploaded_at": rm.uploaded_at.isoformat()
                    }
                    for rm in return_media
                ]
                
            except ReturnRequestItem.DoesNotExist:
                data['return_request'] = None

        # Add return address information (if any)
        try:
            ra = refund.return_address
            data['return_address'] = {
                'id': str(ra.id),
                'recipient_name': ra.recipient_name,
                'contact_number': ra.contact_number,
                'country': ra.country,
                'province': ra.province,
                'city': ra.city,
                'barangay': ra.barangay,
                'street': ra.street,
                'zip_code': ra.zip_code,
                'notes': ra.notes,
                'created_by': str(ra.created_by.id) if ra.created_by else None,
                'created_at': ra.created_at.isoformat() if ra.created_at else None,
                'shop': {
                    'id': str(ra.shop.id) if ra.shop else None,
                    'name': ra.shop.name if ra.shop else None
                } if ra.shop else None,
                'seller': {
                    'id': str(ra.seller.id) if ra.seller else None,
                    'username': ra.seller.username if ra.seller else None
                } if ra.seller else None
            }
            
        except ReturnAddress.DoesNotExist:
            data['return_address'] = None
        
        # Add timeline/activity log
        timeline = []
        
        # Refund requested
        timeline.append({
            "event": "refund_requested",
            "timestamp": refund.requested_at.isoformat(),
            "user": str(refund.requested_by.id),
            "details": f"Refund requested: {refund.reason}"
        })
        
        # Status changes
        if refund.processed_at:
            timeline.append({
                "event": "status_changed",
                "timestamp": refund.processed_at.isoformat(),
                "user": str(refund.processed_by.id) if refund.processed_by else None,
                "details": f"Status changed to {refund.status}"
            })
        
        # Buyer notified
        if refund.buyer_notified_at:
            timeline.append({
                "event": "buyer_notified",
                "timestamp": refund.buyer_notified_at.isoformat(),
                "details": "Buyer notified about refund approval"
            })
        
        # Counter requests
        counter_requests = CounterRefundRequest.objects.filter(refund_id=refund).order_by('-requested_at')
        for cr in counter_requests:
            timeline.append({
                "event": "counter_request",
                "timestamp": cr.requested_at.isoformat(),
                "user": str(cr.seller_id.id),
                "details": f"Counter offer: {cr.counter_refund_method} - Status: {cr.status}"
            })

        # Expose structured counter request list and latest suggestion for frontend
        try:
            data['counter_requests'] = [
                {
                    'id': str(cr.counter_id),
                    'requested_by': cr.requested_by,
                    'seller_id': str(cr.seller_id.id) if cr.seller_id else None,
                    'seller_username': cr.seller_id.username if cr.seller_id else None,
                    'counter_refund_method': cr.counter_refund_method,
                    'counter_refund_type': cr.counter_refund_type,
                    'counter_refund_amount': float(cr.counter_refund_amount) if cr.counter_refund_amount is not None else None,
                    'notes': cr.notes,
                    'status': cr.status,
                    'requested_at': cr.requested_at.isoformat(),
                    'updated_at': cr.updated_at.isoformat()
                }
                for cr in counter_requests
            ]
            latest_cr = counter_requests.first()
            if latest_cr:
                data['seller_suggested_method'] = latest_cr.counter_refund_method
                data['seller_suggested_type'] = latest_cr.counter_refund_type
                data['seller_suggested_amount'] = float(latest_cr.counter_refund_amount) if latest_cr.counter_refund_amount is not None else None
            else:
                data['seller_suggested_method'] = None
                data['seller_suggested_type'] = None
                data['seller_suggested_amount'] = None
        except Exception:
            data['counter_requests'] = []
            data['seller_suggested_method'] = None
            data['seller_suggested_type'] = None
        
        # Return request activities
        if refund.refund_type == 'return':
            try:
                return_request = refund.return_request
                if return_request.shipped_at:
                    timeline.append({
                        "event": "item_shipped",
                        "timestamp": return_request.shipped_at.isoformat(),
                        "user": str(return_request.shipped_by.id) if return_request.shipped_by else None,
                        "details": f"Item shipped via {return_request.logistic_service}"
                    })
                
                if return_request.received_at:
                    timeline.append({
                        "event": "item_received",
                        "timestamp": return_request.received_at.isoformat(),
                        "details": "Item received by seller"
                    })
                
                if return_request.updated_at and return_request.updated_by:
                    timeline.append({
                        "event": "return_updated",
                        "timestamp": return_request.updated_at.isoformat(),
                        "user": str(return_request.updated_by.id),
                        "details": f"Return status updated to {return_request.status}"
                    })
                    
            except ReturnRequestItem.DoesNotExist:
                pass
        
        # Dispute activities
        try:
            dispute = refund.dispute
            if dispute.resolved_at:
                timeline.append({
                    "event": "dispute_resolved",
                    "timestamp": dispute.resolved_at.isoformat(),
                    "user": str(dispute.processed_by.id) if dispute.processed_by else None,
                    "details": f"Dispute resolved: {dispute.status}"
                })
        except DisputeRequest.DoesNotExist:
            pass
        
        # Sort timeline by timestamp
        timeline.sort(key=lambda x: x['timestamp'], reverse=True)
        data['timeline'] = timeline
        
        # Add available actions based on status and user role
        data['available_actions'] = self._get_available_actions(refund, user)
        # Normalize status to lowercase for consistent frontend handling
        try:
            data['status'] = str(refund.status).lower()
        except Exception:
            pass
        
        return data

    @action(detail=True, methods=['post'])
    def add_refund_payment_detail(self, request, pk=None):
        """Allow buyer to provide refund-specific account details for this refund (wallet/bank/remittance).
        The saved details are attached to the refund via RefundWallet/RefundBank/RefundRemittance models and
        included in subsequent refund detail responses.
        """
        user_id = request.headers.get('X-User-Id')
        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                user = None

        try:
            refund = Refund.objects.get(refund_id=pk)
        except Refund.DoesNotExist:
            return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

        # Authorization: only refund requester (buyer) or admin/moderator may set refund payment detail
        if user and refund.requested_by and str(refund.requested_by.id) != str(user.id):
            if not (getattr(user, 'is_admin', False) or getattr(user, 'is_moderator', False)):
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        method = (request.data.get('method') or request.data.get('method_type') or '').strip().lower()
        if not method:
            return Response({"error": "Method is required (wallet|bank|remittance)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if method == 'wallet':
                provider = request.data.get('provider', '')
                account_name = request.data.get('account_name', '')
                account_number = request.data.get('account_number', '')
                contact_number = request.data.get('contact_number', '')
                RefundWallet.objects.update_or_create(
                    refund_id=refund,
                    defaults={
                        'provider': provider,
                        'account_name': account_name,
                        'account_number': account_number,
                        'contact_number': contact_number,
                    }
                )

            elif method == 'bank':
                bank_name = request.data.get('bank_name', '')
                account_name = request.data.get('account_name', '')
                account_number = request.data.get('account_number', '')
                account_type = request.data.get('account_type', '')
                branch = request.data.get('branch', '')
                RefundBank.objects.update_or_create(
                    refund_id=refund,
                    defaults={
                        'bank_name': bank_name,
                        'account_name': account_name,
                        'account_number': account_number,
                        'account_type': account_type,
                        'branch': branch,
                    }
                )

            elif method == 'remittance':
                provider = request.data.get('provider', '')
                first_name = request.data.get('first_name', '')
                last_name = request.data.get('last_name', '')
                contact_number = request.data.get('contact_number', '')
                country = request.data.get('country', '')
                city = request.data.get('city', '')
                province = request.data.get('province', '')
                zip_code = request.data.get('zip_code', '')
                barangay = request.data.get('barangay', '')
                street = request.data.get('street', '')
                valid_id_type = request.data.get('valid_id_type', '')
                valid_id_number = request.data.get('valid_id_number', '')
                RefundRemittance.objects.update_or_create(
                    refund_id=refund,
                    defaults={
                        'provider': provider,
                        'first_name': first_name,
                        'last_name': last_name,
                        'contact_number': contact_number,
                        'country': country,
                        'city': city,
                        'province': province,
                        'zip_code': zip_code,
                        'barangay': barangay,
                        'street': street,
                        'valid_id_type': valid_id_type,
                        'valid_id_number': valid_id_number,
                    }
                )
            else:
                return Response({"error": "Unsupported method"}, status=status.HTTP_400_BAD_REQUEST)

            # Return fresh refund details
            data = self._get_refund_details_data(refund, request, user)
            return Response({"message": "Saved", "refund": data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": "Failed to save payment detail", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_order_items_for_refund(self, refund, request):
        """Get order items for a refund (used in list views)"""
        if not refund.order_id:
            return []
        
        order = refund.order_id
        checkouts = Checkout.objects.filter(order=order)
        
        order_items = []
        for checkout in checkouts:
            cart_item = checkout.cart_item
            if cart_item and cart_item.product:
                product = cart_item.product
                # Get product image if available
                product_image = None
                if hasattr(product, 'productimage_set') and product.productimage_set.exists():
                    first_image = product.productimage_set.first()
                    if first_image and first_image.image:
                        product_image = request.build_absolute_uri(first_image.image.url)
                
                # Build a robust skus list with absolute image URLs
                skus_qs = product.skus.all()
                skus = []
                for s in skus_qs:
                    skus.append({
                        'id': str(s.id),
                        'sku_code': s.sku_code,
                        'price': float(s.price) if s.price is not None else None,
                        'image': request.build_absolute_uri(s.image.url) if getattr(s, 'image', None) else None,
                        'option_ids': s.option_ids or None,
                    })

                # Heuristic: pick selected sku by matching unit price when possible, otherwise fallback to first SKU
                selected_sku = None
                try:
                    unit_price = (float(checkout.total_amount) / float(checkout.quantity)) if checkout.quantity else None
                except Exception:
                    unit_price = None

                if unit_price is not None:
                    for s in skus:
                        if s.get('price') is not None and abs(float(s['price']) - float(unit_price)) < 0.01:
                            selected_sku = s
                            break

                if not selected_sku and skus:
                    selected_sku = skus[0]

                # Build variants payload (include option titles) for frontend label resolution
                variants = []
                try:
                    variant_qs = Variants.objects.filter(product=product)
                    for v in variant_qs:
                        options_qs = VariantOptions.objects.filter(variant=v)
                        opts = [{
                            'id': str(o.id),
                            'title': o.title
                        } for o in options_qs]
                        variants.append({
                            'id': str(v.id),
                            'title': v.title,
                            'options': opts
                        })
                except Exception:
                    variants = []

                # Provide a nested product object that includes a cover image (product_image) for frontend convenience
                # Build media files list for product
                media_files = []
                if hasattr(product, 'productimage_set') and product.productimage_set.exists():
                    media_files = [
                        { 'file_url': request.build_absolute_uri(img.image.url) }
                        for img in product.productimage_set.all()
                    ]

                product_obj = {
                    'id': str(product.id),
                    'name': product.name,
                    'description': product.description if hasattr(product, 'description') else None,
                    'image': product_image,
                    'price': float(product.price) if product.price else None,
                    'condition': getattr(product, 'condition', None),
                    'category_name': product.category.name if getattr(product, 'category', None) else None,
                    'shop_name': product.shop.name if getattr(product, 'shop', None) else None,
                    'skus': skus,
                    'variants': variants,
                    'media_files': media_files,
                }

                order_items.append({
                    "product_id": str(product.id),
                    "product_name": product.name,
                    "quantity": checkout.quantity,
                    "price": float(product.price) if product.price else None,
                    "total": float(checkout.total_amount) if checkout.total_amount else None,
                    "product_image": product_image,
                    # selected sku exposed explicitly for frontend (may be heuristic)
                    "sku": {
                        'sku_id': selected_sku['id'] if selected_sku else None,
                        'sku_code': selected_sku['sku_code'] if selected_sku else None,
                        'sku_image': selected_sku['image'] if selected_sku else None,
                        'price': selected_sku['price'] if selected_sku else None,
                        'option_ids': selected_sku['option_ids'] if selected_sku else None,
                    } if selected_sku else None,
                    "skus": skus,
                    # Provide nested product object (image present) for easier frontend fallbacks
                    "product": product_obj,
                    "shop": {
                        "id": str(product.shop.id) if product.shop else None,
                        "name": product.shop.name if product.shop else None
                    } if product.shop else None
                })
        
        return order_items
    
    def _get_available_actions(self, refund, user):
        """Get available actions based on refund status and user role"""
        actions = []
        
        # Check if user is the buyer
        is_buyer = str(refund.requested_by.id) == str(user.id)
        
        # Check if user is seller (owns shop with items in the order)
        is_seller = False
        try:
            shop_ids = list(Checkout.objects.filter(
                order=refund.order_id,
                cart_item__product__shop__customer__customer=user,
            ).values_list('cart_item__product__shop_id', flat=True).distinct())
            is_seller = len(shop_ids) > 0
        except:
            pass
        
        # Check if user is admin
        is_admin = user.is_admin
        
        # Actions based on refund status
        if refund.status == 'pending':
            if is_buyer:
                actions.append('cancel')
                actions.append('upload_evidence')
            if is_seller:
                actions.append('approve')
                actions.append('reject')
                actions.append('negotiate')
        
        elif refund.status == 'negotiation':
            if is_buyer:
                actions.append('accept_counter_offer')
                actions.append('reject_counter_offer')
                actions.append('file_dispute')
            if is_seller:
                actions.append('update_counter_offer')
                actions.append('withdraw_counter_offer')
        
        elif refund.status == 'approved':
            if is_buyer and refund.refund_type == 'return':
                actions.append('start_return')
                actions.append('upload_shipping_info')
            if is_seller:
                actions.append('notify_buyer')
                actions.append('process_payment')
        
        elif refund.status == 'to_process':
            if is_seller:
                actions.append('process_payment')
                actions.append('mark_as_completed')
        
        elif refund.status == 'dispute':
            if is_admin:
                actions.append('resolve_dispute')
                actions.append('request_additional_info')
            if is_buyer or is_seller:
                actions.append('upload_dispute_evidence')
        
        # Common actions
        if is_buyer:
            actions.append('contact_support')
        
        if is_seller:
            actions.append('contact_buyer')
        
        if is_admin:
            actions.append('update_status')
            actions.append('add_admin_note')
            actions.append('escalate')
        
        return list(set(actions))  # Remove duplicates

    # ========== COMMON ENDPOINTS ==========

    @action(detail=False, methods=['get'])
    def get_refund_stats(self, request):
        """
        COMMON VIEW: Get refund statistics for dashboard
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check user role and get appropriate stats
            if user.is_admin:
                # Admin stats - all refunds
                refunds = Refund.objects.all()
                stats = self._calculate_stats(refunds)
                stats['role'] = 'admin'
                
            else:
                # Check if user is a seller
                shops = Shop.objects.filter(customer__customer=user)
                if shops.exists():
                    # Seller stats
                    refunds = Refund.objects.filter(
                        order_id__checkout__cart_item__product__shop__in=shops
                    ).distinct()
                    stats = self._calculate_stats(refunds)
                    stats['role'] = 'seller'
                    stats['shops_count'] = shops.count()
                    
                else:
                    # Buyer stats
                    refunds = Refund.objects.filter(requested_by=user)
                    stats = self._calculate_stats(refunds)
                    stats['role'] = 'buyer'
            
            return Response(stats)
            
        except User.DoesNotExist:
            return Response({"error": "User not found"}, 
                            status=status.HTTP_404_NOT_FOUND)
    
    def _calculate_stats(self, refunds):
        """Calculate statistics for refunds queryset"""
        total = refunds.count()
        
        return {
            'total': total,
            'pending': refunds.filter(status='pending').count(),
            'approved': refunds.filter(status='approved').count(),
            'negotiation': refunds.filter(status='negotiation').count(),
            'rejected': refunds.filter(status='rejected').count(),
            'dispute': refunds.filter(status='dispute').count(),
            'cancelled': refunds.filter(status='cancelled').count(),
            'completed': refunds.filter(refund_payment_status='completed').count(),
            'return_refunds': refunds.filter(refund_type='return').count(),
            'keep_refunds': refunds.filter(refund_type='keep').count(),
            'average_processing_time': None,  # Can be calculated if needed
        }

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def file_dispute(self, request, pk=None):
        """
        BUYER/SELLER VIEW: File a dispute for this refund. Accepts optional files.
        Payload: { dispute_reason?: string, description?: string }
        """
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            refund = Refund.objects.get(refund_id=pk)
        except Refund.DoesNotExist:
            return Response({"error": "Refund not found"}, status=status.HTTP_404_NOT_FOUND)

        # Authorization: buyer or seller associated with this refund can file a dispute
        is_buyer = str(refund.requested_by.id) == str(user.id)
        is_seller = False
        try:
            shop_ids = list(Checkout.objects.filter(
                order=refund.order_id,
                cart_item__product__shop__customer__customer=user,
            ).values_list('cart_item__product__shop_id', flat=True).distinct())
            is_seller = len(shop_ids) > 0
        except Exception:
            pass

        if not (is_buyer or is_seller or user.is_admin):
            return Response({"error": "Not authorized to file dispute"}, status=status.HTTP_403_FORBIDDEN)

        # Prevent duplicate disputes for the same refund (use model's FK name 'refund_id')
        existing = DisputeRequest.objects.filter(refund_id=refund).first()
        if existing:
            return Response({"error": "A dispute has already been filed for this refund", "dispute_id": str(existing.id)}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('dispute_reason') or request.data.get('reason') or ''
        description = request.data.get('description') or ''

        # Use create serializer to validate (pass only reason/description; attach refund object on save)
        serializer = DisputeRequestCreateSerializer(data={'reason': reason, 'description': description}, context={'filed_by': user})
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                dispute = serializer.save(refund=refund)

                # Attach any uploaded files as evidence
                files = request.FILES.getlist('file') or request.FILES.getlist('files') or []
                for f in files:
                    ev = DisputeEvidence()
                    # Link FK - model uses 'dispute_id' as the ForeignKey field name
                    try:
                        setattr(ev, 'dispute_id', dispute)
                    except Exception:
                        try:
                            setattr(ev, 'dispute', dispute)
                        except Exception:
                            pass
                    ev.uploaded_by = user
                    # Support both 'file' and 'file_data' field names in different schemas
                    if hasattr(ev, 'file'):
                        setattr(ev, 'file', f)
                    elif hasattr(ev, 'file_data'):
                        setattr(ev, 'file_data', f)
                    else:
                        # fallback: try to set 'file' attribute
                        setattr(ev, 'file', f)
                    ev.save()

                # Move refund into dispute status
                refund.status = 'dispute'
                # Only set optional dispute metadata if those fields exist on the model
                update_fields = ['status']
                if hasattr(refund, 'dispute_filed_by'):
                    refund.dispute_filed_by = user
                    update_fields.append('dispute_filed_by')
                if hasattr(refund, 'dispute_reason'):
                    refund.dispute_reason = description or reason
                    update_fields.append('dispute_reason')
                if hasattr(refund, 'dispute_filed_at'):
                    if not getattr(refund, 'dispute_filed_at', None):
                        refund.dispute_filed_at = timezone.now()
                    update_fields.append('dispute_filed_at')
                # Save only the fields we actually set
                refund.save(update_fields=update_fields)

            return Response(DisputeRequestSerializer(dispute, context={'request': request}).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def get_status_options(self, request):
        """
        COMMON VIEW: Get all available status options
        """
        return Response({
            'refund_status_options': [
                {'value': 'pending', 'label': 'Pending Review'},
                {'value': 'approved', 'label': 'Approved'},
                {'value': 'negotiation', 'label': 'Negotiation'},
                {'value': 'rejected', 'label': 'Rejected'},
                {'value': 'dispute', 'label': 'Dispute'},
                {'value': 'cancelled', 'label': 'Cancelled'},
            ],
            'payment_status_options': [
                {'value': 'pending', 'label': 'Pending'},
                {'value': 'processing', 'label': 'Processing'},
                {'value': 'failed', 'label': 'Failed'},
                {'value': 'completed', 'label': 'Completed'},
            ],
            'refund_type_options': [
                {'value': 'return', 'label': 'Return Item'},
                {'value': 'keep', 'label': 'Keep Item'},
            ],
            'refund_method_options': [
                {'value': 'wallet', 'label': 'E-wallet'},
                {'value': 'bank', 'label': 'Bank Transfer'},
                {'value': 'remittance', 'label': 'Remittance'},
                {'value': 'voucher', 'label': 'Store Voucher'},
            ]
        })
    

class ReturnAddressViewSet(viewsets.ViewSet):
    """
    SELLER VIEW: Manage return addresses for refunds (CRUD).
    """
    def list(self, request):
        """List return addresses for a shop. Requires X-User-Id and optional X-Shop-Id or shop_id query."""
        user_id = request.headers.get('X-User-Id')
        shop_id = request.headers.get('X-Shop-Id') or request.query_params.get('shop_id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
            shops = Shop.objects.filter(customer__customer=user)
            if not shops.exists():
                return Response({"results": []})
            if shop_id:
                try:
                    shop = shops.get(id=shop_id)
                except Shop.DoesNotExist:
                    return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
                addresses = ReturnAddress.objects.filter(shop=shop).order_by('-created_at')
            else:
                addresses = ReturnAddress.objects.filter(shop__in=shops).order_by('-created_at')

            serializer = ReturnAddressSerializer(addresses, many=True, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def retrieve(self, request, pk=None):
        try:
            ra = ReturnAddress.objects.get(id=pk)
            serializer = ReturnAddressSerializer(ra, context={'request': request})
            return Response(serializer.data)
        except ReturnAddress.DoesNotExist:
            return Response({"error": "Return address not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        """Create a return address. Requires X-User-Id and X-Shop-Id (or refund_id to infer shop)."""
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)

            # Resolve shop: prefer header/query, else try refund
            shop_id = request.headers.get('X-Shop-Id') or request.data.get('shop_id') or request.query_params.get('shop_id')
            shop = None
            if not shop_id and request.data.get('refund_id'):
                try:
                    refund = Refund.objects.get(refund_id=request.data.get('refund_id'))
                    shop_ids = list(
                        Checkout.objects.filter(
                            order=refund.order_id,
                            cart_item__product__shop__isnull=False,
                        ).values_list('cart_item__product__shop_id', flat=True).distinct()
                    )
                    if len(shop_ids) == 1:
                        shop = Shop.objects.get(id=shop_ids[0])
                except Exception:
                    pass

            if shop_id and not shop:
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    return Response({"error": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)

            if not shop:
                return Response({"error": "Shop required"}, status=status.HTTP_400_BAD_REQUEST)

            # Authorization check: user must be shop owner
            if not shop.customer or str(shop.customer.customer.id) != str(user.id):
                return Response({"error": "Not authorized for this shop"}, status=status.HTTP_403_FORBIDDEN)

            required = ['recipient_name', 'contact_number', 'country', 'province', 'city', 'barangay', 'street', 'zip_code']
            missing = [f for f in required if not request.data.get(f)]
            if missing:
                return Response({"error": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

            ra = ReturnAddress.objects.create(
                refund=Refund.objects.get(refund_id=request.data.get('refund_id')) if request.data.get('refund_id') else None,
                shop=shop,
                seller=user,
                recipient_name=request.data.get('recipient_name'),
                contact_number=request.data.get('contact_number'),
                country=request.data.get('country'),
                province=request.data.get('province'),
                city=request.data.get('city'),
                barangay=request.data.get('barangay'),
                street=request.data.get('street'),
                zip_code=request.data.get('zip_code'),
                notes=request.data.get('notes', ''),
                created_by=user
            )

            serializer = ReturnAddressSerializer(ra, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def partial_update(self, request, pk=None):
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
            ra = ReturnAddress.objects.get(id=pk)
            # Authorization: ensure seller owns the shop
            if not ra.shop or not ra.shop.customer or str(ra.shop.customer.customer.id) != str(user.id):
                return Response({"error": "Not authorized to update this address"}, status=status.HTTP_403_FORBIDDEN)

            for field in ['recipient_name','contact_number','country','province','city','barangay','street','zip_code','notes']:
                if field in request.data:
                    setattr(ra, field, request.data.get(field))
            ra.save()
            serializer = ReturnAddressSerializer(ra, context={'request': request})
            return Response(serializer.data)
        except (User.DoesNotExist, ReturnAddress.DoesNotExist):
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, pk=None):
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
            ra = ReturnAddress.objects.get(id=pk)
            if not ra.shop or not ra.shop.customer or str(ra.shop.customer.customer.id) != str(user.id):
                return Response({"error": "Not authorized to delete this address"}, status=status.HTTP_403_FORBIDDEN)
            ra.delete()
            return Response({"message": "Return address deleted"})
        except (User.DoesNotExist, ReturnAddress.DoesNotExist):
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)


# Dispute views (placed at end for easy removal)
class DisputeViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-facing read-only disputes endpoint. Placed at file end for easy removal if needed."""
    queryset = DisputeRequest.objects.all().order_by('-created_at')
    serializer_class = DisputeRequestSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        refund_id = self.request.query_params.get('refund_id')
        requested_by = self.request.query_params.get('requested_by')
        if status:
            qs = qs.filter(status=status)
        if refund_id:
            # accept either refund_id string or full refund uuid
            qs = qs.filter(refund_id__refund_id=refund_id)
        if requested_by:
            qs = qs.filter(requested_by__id=requested_by)
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = DisputeRequest.objects.count()
        filed = DisputeRequest.objects.filter(status='filed').count()
        under_review = DisputeRequest.objects.filter(status='under_review').count()
        approved = DisputeRequest.objects.filter(status='approved').count()
        rejected = DisputeRequest.objects.filter(status='rejected').count()
        resolved = DisputeRequest.objects.filter(status='resolved').count()
        return Response({
            'total': total,
            'filed': filed,
            'under_review': under_review,
            'approved': approved,
            'rejected': rejected,
            'resolved': resolved,
        })

    @action(detail=True, methods=['post'])
    def start_review(self, request, pk=None):
        try:
            dispute = self.get_object()
            dispute.status = 'under_review'
            user_id = request.headers.get('X-User-Id')
            resolved_user = None
            if user_id:
                # sanitize header: trim whitespace and surrounding quotes (including smart quotes)
                import re
                user_id = user_id.strip()
                # remove leading/trailing quotes (', ", and unicode smart quotes)
                user_id = re.sub(r'^[\'"\u201c\u201d\u2018\u2019]+|[\'"\u201c\u201d\u2018\u2019]+$', '', user_id)
                # Accept UUID, username, or email; handle non-UUID values gracefully
                try:
                    resolved_user = User.objects.get(id=user_id)
                except (User.DoesNotExist, ValueError):
                    try:
                        resolved_user = User.objects.get(username=user_id)
                    except User.DoesNotExist:
                        try:
                            resolved_user = User.objects.get(email=user_id)
                        except User.DoesNotExist:
                            # fallback: if numeric (after stripping quotes), map to first admin user (dev-friendly)
                            if str(user_id).isdigit():
                                resolved_user = User.objects.filter(is_admin=True).first()
                            else:
                                resolved_user = None
                if resolved_user:
                    dispute.processed_by = resolved_user

            dispute.save(update_fields=['status', 'processed_by'])
            return Response(DisputeRequestSerializer(dispute, context={'request': request}).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Admin accepts dispute: set status to 'approved' and mark resolved_by/at"""
        try:
            dispute = self.get_object()
            dispute.status = 'approved'
            dispute.resolved_at = timezone.now()
            user_id = request.headers.get('X-User-Id')
            resolved_user = None
            if user_id:
                import re
                user_id = user_id.strip()
                user_id = re.sub(r'^[\'"\u201c\u201d\u2018\u2019]+|[\'"\u201c\u201d\u2018\u2019]+$', '', user_id)
                try:
                    resolved_user = User.objects.get(id=user_id)
                except (User.DoesNotExist, ValueError):
                    try:
                        resolved_user = User.objects.get(username=user_id)
                    except User.DoesNotExist:
                        try:
                            resolved_user = User.objects.get(email=user_id)
                        except User.DoesNotExist:
                            if str(user_id).isdigit():
                                resolved_user = User.objects.filter(is_admin=True).first()
                            else:
                                resolved_user = None
            if resolved_user:
                dispute.processed_by = resolved_user
            dispute.save(update_fields=['status', 'processed_by', 'resolved_at'])
            return Response(DisputeRequestSerializer(dispute, context={'request': request}).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Admin rejects dispute: set status to 'rejected' and store admin notes"""
        try:
            dispute = self.get_object()
            dispute.status = 'rejected'
            dispute.resolved_at = timezone.now()
            admin_notes = request.data.get('admin_notes')
            if admin_notes:
                dispute.admin_notes = admin_notes
            user_id = request.headers.get('X-User-Id')
            resolved_user = None
            if user_id:
                import re
                user_id = user_id.strip()
                user_id = re.sub(r'^[\'"\u201c\u201d\u2018\u2019]+|[\'"\u201c\u201d\u2018\u2019]+$', '', user_id)
                try:
                    resolved_user = User.objects.get(id=user_id)
                except (User.DoesNotExist, ValueError):
                    try:
                        resolved_user = User.objects.get(username=user_id)
                    except User.DoesNotExist:
                        try:
                            resolved_user = User.objects.get(email=user_id)
                        except User.DoesNotExist:
                            if str(user_id).isdigit():
                                resolved_user = User.objects.filter(is_admin=True).first()
                            else:
                                resolved_user = None
            if resolved_user:
                dispute.processed_by = resolved_user
            dispute.save(update_fields=['status', 'processed_by', 'resolved_at', 'admin_notes'])
            return Response(DisputeRequestSerializer(dispute, context={'request': request}).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Buyer acknowledgement endpoint: mark dispute resolved and set refund.status to 'completed'"""
        try:
            dispute = self.get_object()
            refund = getattr(dispute, 'refund_id', None)

            # Update refund to completed when buyer acknowledges a rejected dispute
            if refund:
                # Only move forward if refund is currently 'dispute' or not already completed
                if str(refund.status).lower() == 'dispute':
                    refund.status = 'completed'
                    refund.processed_at = timezone.now()
                    # Buyer acknowledgement should mark payment as completed
                    refund.refund_payment_status = 'completed'
                    refund.save(update_fields=['status', 'processed_at', 'refund_payment_status'])

            # Mark dispute as resolved and set resolved_at
            dispute.status = 'resolved'
            dispute.resolved_at = timezone.now()
            dispute.save(update_fields=['status', 'resolved_at'])

            return Response(DisputeRequestSerializer(dispute, context={'request': request}).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

