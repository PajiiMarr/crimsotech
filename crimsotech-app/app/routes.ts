// app/routes.ts
import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
    index('routes/client/landing.tsx'),
    route('about', 'routes/client/about.tsx'),
    route('riders', 'routes/client/riders.tsx'),

    route('login', 'routes/auth/login.tsx'),
    route('signup', 'routes/auth/signup.tsx'),
    route('apply', 'routes/auth/vehicle.tsx'),
    
    route('profiling', 'routes/profiling/profiling.tsx'),
    route('number', 'routes/profiling/number.tsx'),
    
    route('logout', 'routes/logout.tsx'),
    
    route('home', 'routes/customer/home.tsx'),
    route("cart", "routes/customer/cart.tsx"),
    route("orders", "components/customer/orders.tsx"),
    route('shop-list', 'routes/customer/shop-list.tsx'),
    route('create-shop', 'routes/customer/create-shop.tsx'),
    route('personal-listing', 'routes/customer/personal-listing.tsx'),
    route("product/:id", "components/customer/view-product.tsx"),
    route("favorites", "routes/customer/favorites.tsx"),
    route('comgift', 'routes/customer/comgift.tsx'),
    route('trade', 'routes/customer/trade.tsx'),
    route('purchases', 'routes/customer/purchases.tsx'),
    route('product-rate', 'routes/customer/product-rate.tsx'),
    route('subscription-plan', 'routes/customer/subscription-plan.tsx'),
    route("track-order/:id", "components/customer/track-order.tsx"),
    route("decision/:id", "components/customer/decision.tsx"),
    route("process-return-item/:id", "components/customer/process-return-item.tsx"),
    route('order-list', 'routes/customer/order-list.tsx'),
    route('view-completed-order/:id', 'components/customer/view-completed-order.tsx'),
    route('view-cancelled-order/:id', 'components/customer/view-cancelled-order.tsx'),
    route('order-review/:id', 'components/customer/order-review.tsx'),  
    route('notifications', 'routes/customer/notifications.tsx'),  
    route('arrange-shipment', 'components/customer/arrange-shipment.tsx'), 
    route("customer-create-product", "routes/customer/customer-create-product.tsx"),
    route("customer-create-gift", "routes/customer/customer-create-gift.tsx"), 

    //customer-buyer
    route('return-refund', 'routes/customer/return-refund.tsx'),  
    route('view-return-refund/:refundId', 'routes/customer/view-return-refund.tsx'),  

    route("request-refund-return/:id", "routes/customer/request-refund-return.tsx"),
    route('view-order/:orderId', 'routes/customer/view-order.tsx'),
    route('shop/:shopId', 'routes/customer/view-shop.tsx'),
    // route('process-return', 'routes/customer/process-return.tsx'),
    // route('file-dispute/:refundId', 'routes/customer/file-dispute.tsx'),

    //customer-seller
    route('view-customer-return-cancel/:returnId', 'routes/customer/view-customer-return-cancel.tsx'),
    // route('view-refund-request/:refundId', 'routes/customer/view-refund-request.tsx'),
    // route('customer-return-cancel', 'routes/customer/customer-return-cancel.tsx'),

    // File dispute route
    route('file-dispute/:refundId', 'routes/seller/file-dispute.tsx'),

    //shipping addresses add
    route('shipping-address', 'routes/customer/shipping-address.tsx'),
    route('order-successful/:orderId', 'components/customer/order-successful.tsx'),
    
    
    
   
    
    
    ...prefix("seller", [
        route("dashboard", "routes/seller/dashboard.tsx"), 
        route("seller-product-list", "routes/seller/seller-product-list.tsx"), 
        route("seller-create-product", "routes/seller/seller-create-product.tsx"), 
        route("seller-order-list", "routes/seller/seller-order-list.tsx"), 
        route("seller-return-refund-cancel", "routes/seller/seller-return-refund-cancel.tsx"), 
        route("return-address", "routes/seller/return-address.tsx"), 
        // Single route supports both param and query-based navigation in the loader
        route("view-refund-details/:refundId", "routes/seller/view-refund-details.tsx"),
        route("seller-earnings", "routes/seller/seller-earnings.tsx"), 
        route("seller-vouchers", "routes/seller/seller-vouchers.tsx"), 
        route("seller-notifications", "routes/seller/seller-notifications.tsx"), 
        route("gift", "routes/seller/seller-gift.tsx"), 
        route("apply-gift", "routes/seller/apply-gift/apply-gift.tsx"),
        route("seller-create-gift", "routes/seller/seller-create-gift.tsx"), 


        
    
        
         ]),


    ...prefix("admin", [
        index("routes/admin/home.tsx"),
        route('analytics', 'routes/admin/analytics.tsx'),
        route('products', 'routes/admin/products.tsx'),
        route('products/:product_id', 'routes/admin/view_products/view_products.tsx'),
        route('shops', 'routes/admin/shops.tsx'),
        route('shops/:shop_id', 'routes/admin/view_shops/view_shops.tsx'),
        route('boosting', 'routes/admin/boosting.tsx'),
        route('orders', 'routes/admin/orders.tsx'),
        route('riders', 'routes/admin/riders.tsx'),
        route('vouchers', 'routes/admin/vouchers.tsx'),
        route('refunds', 'routes/admin/refunds.tsx'),
        route('users', 'routes/admin/users.tsx'),
        route('team', 'routes/admin/team.tsx'), 
        route('reports', 'routes/admin/reports.tsx'),
        route('dispute', 'routes/admin/dispute.tsx'),
        route('dispute/:disputeId', 'routes/admin/view-details.tsx'),
        
    ]),
    ...prefix("moderator", [
        index("routes/moderator/home.tsx"),
    ]),
    ...prefix("rider", [
        index("routes/rider/home.tsx"),
        route('pendings', 'routes/rider/pendings.tsx'),
        route('orders/active', 'routes/rider/active-orders.tsx'),
        route('orders/active/:orderId', 'routes/rider/active-orders/active-orders-details.tsx'),
        route('orders/history', 'routes/rider/history.tsx'),
        route('schedule', 'routes/rider/schedule.tsx'),
    ]),
] satisfies RouteConfig;
