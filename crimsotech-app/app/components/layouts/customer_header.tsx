"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Bell, User, Home } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Link, useNavigate, useLocation } from "react-router";
import { useContext, useMemo } from "react";
import { userContext } from "~/contexts/user-role";

// Define the User type
interface User {
  isAdmin: boolean;
  isCustomer: boolean;
  isRider: boolean;
  isModerator: boolean;
  user_id?: string;
}

// Route name mappings
const routeNames: Record<string, string> = {
  // Admin routes
  'admin': 'Dashboard',
  'analytics': 'Analytics',
  'products': 'Products and Categories',
  'shops': 'Shops',
  'boosting': 'Boosting Plans',
  'orders': 'Orders',
  'riders': 'Riders',
  'vouchers': 'Vouchers',
  'refunds': 'Refunds',
  'users': 'Users',
  'team': 'Team',
  'reports': 'Reports',
  'activity-log': 'Activity Log',
  'dispute': 'Disputes',
  'admin-notifications': 'Notifications', // Changed from 'notifications'
  'settings': 'Settings',
  
  // Customer routes
  'home': 'Home',
  'cart': 'Cart',
  'purchases': 'Purchases',
  'return-refund': 'Return & Refund',
  'favorites': 'Favorites',
  'trade': 'Trade',
  'personal-listing': 'My Products',
  'order-list': 'Order Lists',
  'return-refund-cancel': 'Return/Refund/Cancel',
  'comgift': 'ComGift',
  'subscription-plan': 'Subscription Plans',
  'customer-notifications': 'Notifications', // Changed from 'notifications'
  
  // Rider routes
  'rider': 'Dashboard',
  'active': 'Active Orders',
  'history': 'Order History',
  'schedule': 'Schedule',
  'earnings': 'Earnings',
  'messages': 'Messages',
  'rider-notifications': 'Notifications', // Added for rider notifications
  
  // Moderator routes
  'moderator': 'Dashboard',
  'ratings': 'Review Ratings',
  'flagged': 'Flagged Content',
  'logs': 'Activity Log',
  'moderator-notifications': 'Notifications', // Added for moderator notifications
  
  // Shop routes
  'shop-list': 'My Shops',
  'view-shop': 'Shop Details',
  
  // Default
  'profile': 'Profile',
  'logout': 'Logout',
};

// Helper function to capitalize first letter
const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Function to generate breadcrumb items from pathname
const generateBreadcrumbs = (pathname: string) => {
  // Remove leading slash and split path
  const paths = pathname.split('/').filter(path => path);
  
  // Always start with Home
  const breadcrumbs = [
    { name: 'Home', path: '/', isLast: paths.length === 0 }
  ];
  
  let currentPath = '';
  
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;
    
    // Try to get route name from mapping, otherwise capitalize the path
    let name = routeNames[path] || capitalizeFirst(path.replace(/-/g, ' '));
    
    // Handle UUIDs in path (don't display them in breadcrumbs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(path)) {
      name = 'Details';
    }
    
    breadcrumbs.push({ name, path: currentPath, isLast });
  });
  
  return breadcrumbs;
};

export default function CustomerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useContext(userContext);
  
  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => generateBreadcrumbs(location.pathname), [location.pathname]);

  return (
  <>
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
     
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />


      </div>

      {/* Right side: Bell icon + User profile dropdown */}
      <div className="flex items-center gap-4 px-4">

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              Profile
            </DropdownMenuItem>
            
            {/* Conditionally render Shop menu item - hidden for admins */}
            {user && !user.isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/shop-list")}>
                Shop
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => navigate("/logout")}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    
            <Separator
              orientation="horizontal"
              className="mr-1 data-[orientation=vertical]:h-2 mb-8"
            />
  
  </>
  );
}