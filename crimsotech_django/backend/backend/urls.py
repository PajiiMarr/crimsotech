from django.contrib import admin
from django.urls import path, include 
from api.views import * 
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from django.conf import settings

router = DefaultRouter()

router.register(r'landing', Landing, basename='landing')
router.register(r'user', FetchUser, basename='user')

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
router.register(r'admin-logs', AdminLogs, basename='admin-logs')
router.register(r'admin-withdrawals', AdminWithdrawalViewSet, basename='admin-withdrawals')
router.register(r'admin-remittances', AdminRemittanceViewSet, basename='admin-remittances')

router.register(r'moderator-dashboard', ModeratorDashboard, basename='moderator-dashboard')
router.register(r'moderator-analytics', ModeratorAnalytics, basename='moderator-analytics')
router.register(r'moderator-product', ModeratorProduct, basename='moderator-product')
router.register(r'moderator-shops', ModeratorShops, basename='moderator-shops')
router.register(r'moderator-boosting', ModeratorBoosting, basename='moderator-boosting')
router.register(r'moderator-orders', ModeratorOrders, basename='moderator-orders')
router.register(r'moderator-riders', ModeratorRiders, basename='moderator-riders')

router.register(r'rider-status', RiderStatus, basename='rider-status')
router.register(r'seller-dashboard', SellerDashboard, basename='seller-dashboard')
router.register(r'seller-products', SellerProducts, basename='seller-products')
router.register(r'seller-boosts', SellerBoosts, basename='seller-boosts')
router.register(r'shop-add-product', CustomerShopsAddSeller, basename='shop-add-product')
router.register(r'customer-products', CustomerProducts, basename='customer-products')
router.register(r'public-products', PublicProducts, basename='public-products')
router.register(r'seller-vouchers', SellerVouchers, basename='seller-vouchers')

router.register(r'customer-personal-listing-dashboard', PersonalListingViewSet, basename='customer-personal-listing-dashboard')

router.register(r'checkout', CheckoutView, basename='checkout')
router.register(r'customer-boost-plans', CustomerBoostPlan, basename='customer-boost-plans')
router.register(r'seller-order-list', SellerOrderList, basename='seller-order-list')
router.register(r'checkout-order', CheckoutOrder, basename='checkout-order')
router.register(r'purchases-buyer', PurchasesBuyer, basename='purchases-buyer')
router.register(r'shipping-address', ShippingAddressViewSet, basename='shipping-address')
router.register(r'return-address', ReturnAddressViewSet, basename='return-address')
router.register(r'return-refund', RefundViewSet, basename='return-refund')
router.register(r'disputes', DisputeViewSet, basename='disputes')
router.register(r'personal-refunds', PersonalRefundViewSet, basename='my-refund')
router.register(r'withdrawal-requests', WithdrawalRequestViewSet, basename='withdrawal-requests')

router.register(r'order-successful', OrderSuccessful, basename='order-successful')
router.register(r'user-payment-details', UserPaymentDetailsViewSet, basename='userpaymentdetails')
router.register(r'arrange-shipment', ArrangeShipment, basename='arrange-shipment')
router.register(r'rider-orders-active', RiderOrdersActive, basename='rider-orders-active')
router.register(r'swap-products', SwapViewset, basename='swap-products')
router.register(r'customer-products-viewset', CustomerProductViewSet, basename='customer-products-viewset')
router.register(r'customer-product-list', CustomerProductsList, basename='customer-product-list')
router.register(r'home-boosts', HomeBoosts, basename='home-boosts')
router.register(r'customer-order-list', CustomerOrderList, basename='customer-order-list')
router.register(r'customer-arrange-shipment', CustomerArrangeShipment, basename='customer-arrange-shipment')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'messages', MessageViewSet, basename='message')

router.register(r'seller-gift', SellerGifts, basename='seller-gift')
router.register(r'customer-gift', CustomerGiftViewSet, basename='customer-gift')

router.register(r'rider-dashboard', RiderDashboardViewSet, basename='rider-dashboard')
router.register(r'rider-history', RiderOrderHistoryViewSet, basename='rider-history')
router.register(r'rider-schedule', RiderScheduleViewSet, basename='rider-schedule')
router.register(r'rider-deivery', RiderDeliveryViewSet, basename='rider-delivery')

router.register(r'proof-management', ProofManagementViewSet, basename='proof-management')
router.register(r'rider-proof', RiderProofViewSet, basename='rider-proof')
router.register(r'rider-profile', RiderProfileViewSet, basename='rider-profile')
router.register(r'conversation', ConversationViewSet, basename='conversation')
router.register(r'wallet', UserWalletViewSet, basename='wallet')
router.register(r'shop-compensation', ShopCompensationViewSet, basename='shop-compensation')


urlpatterns = [
    path('admin/', admin.site.urls),

    # ── CheckoutOrder explicit paths ────────────────────────────────────────
    path('api/checkout-order/get_order_details/<uuid:order_id>/',
         CheckoutOrder.as_view({'get': 'get_order_details'}),
         name='get_order_details'),

    path('api/checkout-order/initiate_maya_payment',
         CheckoutOrder.as_view({'post': 'initiate_maya_payment'}),
         name='initiate-maya-payment'),
    path('api/checkout-order/initiate_maya_payment/',
         CheckoutOrder.as_view({'post': 'initiate_maya_payment'}),
         name='initiate-maya-payment-slash'),

    path('api/checkout-order/maya-success',
         CheckoutOrder.as_view({'get': 'maya_success'}),
         name='maya-success'),
    path('api/checkout-order/maya-success/',
         CheckoutOrder.as_view({'get': 'maya_success'}),
         name='maya-success-slash'),

    path('api/checkout-order/maya-failure',
         CheckoutOrder.as_view({'get': 'maya_failure'}),
         name='maya-failure'),
    path('api/checkout-order/maya-failure/',
         CheckoutOrder.as_view({'get': 'maya_failure'}),
         name='maya-failure-slash'),

    path('api/checkout-order/maya-cancel',
         CheckoutOrder.as_view({'get': 'maya_cancel'}),
         name='maya-cancel'),
    path('api/checkout-order/maya-cancel/',
         CheckoutOrder.as_view({'get': 'maya_cancel'}),
         name='maya-cancel-slash'),

    # ── SellerOrderList explicit detail paths ───────────────────────────────
    # These are needed because Order uses a custom PK field name ('order')
    # which prevents DRF's router from correctly resolving detail routes.
    path('api/seller-order-list/<uuid:pk>/available_actions/',
         SellerOrderList.as_view({'get': 'available_actions'}),
         name='seller-order-available-actions'),

    path('api/seller-order-list/<uuid:pk>/update_status/',
         SellerOrderList.as_view({'patch': 'update_status'}),
         name='seller-order-update-status'),

    path('api/seller-order-list/<uuid:pk>/prepare_shipment/',
         SellerOrderList.as_view({'post': 'prepare_shipment'}),
         name='seller-order-prepare-shipment'),

    path('api/seller-order-list/<uuid:pk>/generate_waybill/',
         SellerOrderList.as_view({'get': 'generate_waybill'}),
         name='seller-order-generate-waybill'),

    path('api/seller-order-list/<uuid:pk>/rider_response/',
         SellerOrderList.as_view({'post': 'rider_response'}),
         name='seller-order-rider-response'),

    # ── Router (keep AFTER all explicit paths) ──────────────────────────────
    path('api/', include(router.urls)),

    # ── Remaining explicit paths ────────────────────────────────────────────
    path('', UserView.as_view(), name='user-list'),
    path('api/customer-shops/', CustomerShops.as_view(), name='customer-shops'),
    path('api/customer-favorites/', CustomerFavoritesView.as_view(), name='customer-favorites'),
    path('api/cart/add/', AddToCartView.as_view(), name='add-to-cart'),
    path('api/shops/<uuid:shop_id>/', ViewShopAPIView.as_view(), name='view-shop'),
    path('api/shops/<uuid:shop_id>/followers/', ShopFollowersView.as_view(), name='shop-followers'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/rider-wallet/', RiderWalletView.as_view(), name='rider-wallet'),
    path('api/debug-wallet/', debug_wallet, name='debug-wallet'),

    # ── Cart endpoints ──────────────────────────────────────────────────────
    path('api/view-cart/', CartListView.as_view(), name='view-cart'),
    path('api/view-cart/update/<uuid:item_id>/', CartListView.as_view(), name='update-cart-item'),
    path('api/view-cart/delete/<uuid:item_id>/', CartListView.as_view(), name='delete-cart-item'),
    path('api/cart/count/', CartCountView.as_view(), name='cart-count'),
    path('api/cart/item/<uuid:item_id>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('api/cart/bulk-update/', CartBulkUpdateView.as_view(), name='cart-bulk-update'),
    path('api/cart/clear/', CartClearView.as_view(), name='cart-clear'),

     path('api/reviews/', ReviewView.as_view(), name='review-list-create'),
     path('api/reviews/<uuid:review_id>/', ReviewView.as_view(), name='review-detail'),

    path('api/register/', Register.as_view(), name='register'),
    path('api/login/', Login.as_view(), name='login'),
    path('api/profiling/', Profiling.as_view(), name='profiling'),
    path('api/get-role/', GetRole.as_view(), name='get-role'),
    path('api/get-registration/', GetRegistration.as_view(), name='get-registration'),
    path('api/predict/', predict_image, name='predict'),
    path('api/classes/', get_classes, name='get_classes'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)