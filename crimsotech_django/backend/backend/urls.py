"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include 
from api.views import * 
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from django.conf import settings
from api.dispute_views import DisputeRequestViewSet

router = DefaultRouter()
router.register(r'verify', VerifyNumber, basename='verify')
router.register(r'rider', RiderRegistration, basename='rider')
router.register(r'admin-dashboard', AdminDashboard, basename='admin-dashboard')
router.register(r'admin-analytics', AdminAnalytics, basename='admin-analytics')
router.register(r'admin-products', AdminProduct, basename='admin-products')
router.register(r'admin-shops', AdminShops, basename='admin-shops')
router.register(r'admin-boosting', AdminBoosting, basename='admin-boosting')
router.register(r'admin-orders', AdminOrders, basename='admin-orders')
router.register(r'admin-riders', AdminRiders, basename='admin-riders')
router.register(r'admin-vouchers', AdminVouchers, basename='admin-vouchers')
router.register(r'admin-refunds', AdminRefunds, basename='admin-refunds')
router.register(r'admin-users', AdminUsers, basename='admin-users')
router.register(r'admin-team', AdminTeam, basename='admin-team')
router.register(r'admin-reports', AdminReports, basename='admin-reports')
router.register(r'rider-status', RiderStatus, basename='rider-status')
router.register(r'seller-products', SellerProducts, basename='seller-products')
router.register(r'shop-add-product', CustomerShopsAddSeller, basename='shop-add-product')
router.register(r'customer-products', CustomerProducts, basename='customer-products')
router.register(r'public-products', PublicProducts, basename='public-products')
# router.register(r'customer-add-item', AddToCartView, basename='customer-add-item')
router.register(r'checkout', CheckoutView, basename='checkout')
router.register(r'customer-boost-plans', CustomerBoostPlan, basename='customer-boost-plans')
router.register(r'seller-order-list', SellerOrderList, basename='seller-order-list')
router.register(r'checkout-order', CheckoutOrder, basename='checkout-order')
router.register(r'purchases-buyer', PurchasesBuyer, basename='purchases-buyer')  # Add this line
router.register(r'shipping-address', ShippingAddressViewSet, basename='shipping-address')  # Add this line
router.register(r'return-refund', RefundViewSet, basename='return-refund')
router.register(r'order-sucessful', OrderSuccessfull, basename='order-successful')
router.register(r'refund-payment', RefundPaymentMethodViewSet, basename='refundpayment')
router.register(r'user-payment-methods', UserPaymentMethodViewSet, basename='userpaymentmethod')
router.register(r'disputes', DisputeRequestViewSet, basename='dispute')
router.register(r'arrange-shipment', ArrangeShipment, basename='arrange-shipment')
router.register(r'rider-orders-active', RiderOrdersActive, basename='rider-orders-active')
router.register(r'swap-products', SwapViewset, basename='swap-products')
router.register(r'customer-products-viewset', CustomerProductViewSet, basename='customer-products-viewset')
router.register(r'customer-product-list', CustomerProductsList, basename='customer-product-list')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('', UserView.as_view(), name='user-list'),
    path('api/customer-shops/', CustomerShops.as_view(), name='customer-shops'),
    path('api/customer-favorites/', CustomerFavoritesView.as_view(), name='customer-favorites'),
    path('api/cart/add/', AddToCartView.as_view(), name='add-to-cart'),
    path('api/shops/<uuid:shop_id>/', ViewShopAPIView.as_view(), name='view-shop'),
    
  

    

    # GET all items (no item_id in URL)
    path('api/view-cart/', CartListView.as_view(), name='view-cart'),
    
    # PUT for updates
    path('api/view-cart/update/<uuid:item_id>/', CartListView.as_view(), name='update-cart-item'),
    
    # DELETE for removal
    path('api/view-cart/delete/<uuid:item_id>/', CartListView.as_view(), name='delete-cart-item'),
    
    path('api/register/', Register.as_view(), name='register'),
    path('api/login/', Login.as_view(), name='login'),
    path('api/profiling/', Profiling.as_view(), name='profiling'),
    path('api/get-role/', GetRole.as_view(), name='get-role'),
    path('api/get-registration/', GetRegistration.as_view(), name='get-registration'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)