// app/routes.ts
import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
    index('routes/client/landing.tsx'),
    route('about', 'routes/client/about.tsx'),
    route('riders', 'routes/client/rider.tsx'),
    route('riders', 'routes/client/riders.tsx'),

    route('login', 'routes/auth/login.tsx'),
    route('signup', 'routes/auth/signup.tsx'),
    route('apply', 'routes/auth/vehicle.tsx'),
    
    route('profiling', 'routes/profiling/profiling.tsx'),
    route('number', 'routes/profiling/number.tsx'),
    
    route('logout', 'routes/logout.tsx'),
    
    route('home', 'routes/customer/home.tsx'),

    ...prefix("admin", [
        index("routes/admin/home.tsx"),
        route('analytics', 'routes/admin/analytics.tsx'),
        route('products', 'routes/admin/products.tsx'),
        route('shops', 'routes/admin/shops.tsx'),
        route('boosting', 'routes/admin/boosting.tsx'),
        route('orders', 'routes/admin/orders.tsx'),
        route('riders', 'routes/admin/riders.tsx'),
        route('vouchers', 'routes/admin/vouchers.tsx'),
        route('refunds', 'routes/admin/refunds.tsx'),
        route('users', 'routes/admin/users.tsx'),
    ]),
    ...prefix("moderator", [
        index("routes/moderator/home.tsx"),

    ]),
    ...prefix("rider", [
        index("routes/rider/home.tsx"),

    ])
] satisfies RouteConfig;

