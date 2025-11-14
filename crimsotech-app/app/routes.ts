// app/routes.ts
import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
    index('routes/client/landing.tsx'),
    route('about', 'routes/client/about.tsx'),
    route('rider', 'routes/client/rider.tsx'),

    route('login', 'routes/auth/login.tsx'),
    route('signup', 'routes/auth/signup.tsx'),
    route('apply', 'routes/auth/vehicle.tsx'),
    
    
    route('home', 'routes/customer/home.tsx'),
    
    route('profiling', 'routes/profiling/profiling.tsx'),
    route('number', 'routes/profiling/number.tsx'),
    
    route('logout', 'routes/logout.tsx'),
    
    ...prefix("admin", [
        index("routes/admin/home.tsx"),
        route('analytics', 'routes/admin/analytics.tsx'),
        route('products', 'routes/admin/products.tsx'),
        route('shops', 'routes/admin/shops.tsx'),
        route('subscription', 'routes/admin/subscription.tsx'),
    ]),
    ...prefix("moderator", [
        index("routes/moderator/home.tsx"),

    ]),
    ...prefix("rider", [
        index("routes/rider/home.tsx"),

    ])
] satisfies RouteConfig;