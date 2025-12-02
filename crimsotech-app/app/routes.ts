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
    route('shop-list', 'routes/customer/shop-list.tsx'),
    route('create-shop', 'routes/customer/create-shop.tsx'),
    route('personal-listing', 'routes/customer/personal-listing.tsx'),
    route("product/:id", "components/customer/view-product.tsx"),
    route("favorite", "routes/customer/favorites.tsx"),
    route('comgift', 'routes/customer/comgift.tsx'),
    
    
    ...prefix("seller", [
        route("dashboard", "routes/seller/dashboard.tsx"), 
        route("seller-product-list", "routes/seller/seller-product-list.tsx"), 
        route("seller-create-product", "routes/seller/seller-create-product.tsx"), 
        
         ]),


    ...prefix("admin", [
        index("routes/admin/home.tsx"),
        route('analytics', 'routes/admin/analytics.tsx'),
        route('products', 'routes/admin/products.tsx'),
        route('products/:product_id', 'routes/admin/view_products/view_products.tsx'),
        route('shops', 'routes/admin/shops.tsx'),
        route('boosting', 'routes/admin/boosting.tsx'),
        route('orders', 'routes/admin/orders.tsx'),
        route('riders', 'routes/admin/riders.tsx'),
        route('vouchers', 'routes/admin/vouchers.tsx'),
        route('refunds', 'routes/admin/refunds.tsx'),
        route('users', 'routes/admin/users.tsx'),
        route('team', 'routes/admin/team.tsx'),
        route('reports', 'routes/admin/reports.tsx'),
        
    ]),
    ...prefix("moderator", [
        index("routes/moderator/home.tsx"),
    ]),
    ...prefix("rider", [
        index("routes/rider/home.tsx"),
        route('pendings', 'routes/rider/pendings.tsx'),
    ]),
] satisfies RouteConfig;

