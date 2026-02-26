"use client";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Bell, User, Home } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Link, useNavigate, useLocation } from "react-router";
import { useContext, useMemo } from "react";
import { userContext } from "~/contexts/user-role";

interface User {
  isAdmin: boolean;
  isCustomer: boolean;
  isRider: boolean;
  isModerator: boolean;
  user_id?: string;
}

const routeNames: Record<string, string> = {
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
  'admin-notifications': 'Notifications',
  'settings': 'Settings',
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
  'customer-notifications': 'Notifications',
  'rider': 'Dashboard',
  'active': 'Active Orders',
  'history': 'Order History',
  'schedule': 'Schedule',
  'earnings': 'Earnings',
  'messages': 'Messages',
  'rider-notifications': 'Notifications',
  'moderator': 'Dashboard',
  'ratings': 'Review Ratings',
  'flagged': 'Flagged Content',
  'logs': 'Activity Log',
  'moderator-notifications': 'Notifications',
  'shop-list': 'My Shops',
  'view-shop': 'Shop Details',
  'profile': 'Profile',
  'logout': 'Logout',
};

const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const generateBreadcrumbs = (pathname: string) => {
  const paths = pathname.split('/').filter(path => path);
  const breadcrumbs = [
    { name: 'Home', path: '/', isLast: paths.length === 0 }
  ];
  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;
    let name = routeNames[path] || capitalizeFirst(path.replace(/-/g, ' '));
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

  const breadcrumbs = useMemo(() => generateBreadcrumbs(location.pathname), [location.pathname]);

  // Only explicitly hide Shop when we KNOW the user is an admin
  // If user is null (context not loaded yet), still show Shop
  const showShop = !user?.isAdmin;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>

        <div className="flex items-center gap-4 px-4">
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

              {showShop && (
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