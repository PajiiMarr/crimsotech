// app/components/navigations/sidebar.tsx
"use client";
import { 
  Home, ShoppingCart, TicketCheck, Star, Gift, Handshake, Package,
  Store, CreditCard, List, MessageSquare, Users, 
  Shield, AlertCircle, FileText, Settings, Bell,
  BarChart, Bike, MapPin, Calendar, ClipboardList,
  PhilippinePeso, RotateCcw, Heart, LogOut, User, Receipt,
  Truck, ShieldCheck, Activity, Flag, Megaphone, FolderKanban,
  Clock, Repeat, ArrowLeftRight, Sparkles, Tag, BadgePercent
} from "lucide-react"
import { Link, useLocation, useNavigate } from 'react-router'
import { useUser } from '~/components/providers/user-role-provider';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "~/components/ui/sidebar"
import { Skeleton } from "../ui/skeleton";
import AxiosInstance from "../axios/Axios";

// Helper functions for user display
const getUserDisplayName = (user: any): string => {
  if (user?.first_name && user?.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user?.first_name) {
    return user.first_name;
  }
  if (user?.username) {
    return user.username;
  }
  if (user?.email) {
    return user.email;
  }
  return "User";
};

const getUserRole = (user: any): string => {
  if (user?.isAdmin) return "Admin";
  if (user?.isModerator) return "Moderator";
  if (user?.isRider) return "Rider";
  if (user?.isCustomer) return "Customer";
  return "User";
};

// Menu items organized by role with groups
const menuItems = [
  // ADMIN
  {
    group: "Dashboard",
    children: [
      { title: "Dashboard", url: "/admin", icon: Home, roles: ["admin"] },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart, roles: ["admin"] },
    ]
  },
  {
    group: "Products & Shops",
    children: [
      { title: "Products and Categories", url: "/admin/products", icon: Package, roles: ["admin"] },
      { title: "Shops", url: "/admin/shops", icon: Store, roles: ["admin"] },
      { title: "Boosting Plans", url: "/admin/boosting", icon: Sparkles, roles: ["admin"] },
    ]
  },
  {
    group: "Orders & Delivery",
    children: [
      { title: "Orders", url: "/admin/orders", icon: Receipt, roles: ["admin"] },
      { title: "Riders", url: "/admin/riders", icon: Bike, roles: ["admin"] },
    ]
  },
  {
    group: "Financial",
    children: [
      { title: "Vouchers", url: "/admin/vouchers", icon: BadgePercent, roles: ["admin"] },
      { title: "Refunds", url: "/admin/refunds", icon: RotateCcw, roles: ["admin"] },
    ]
  },
  {
    group: "Management",
    children: [
      { title: "Users", url: "/admin/users", icon: Users, roles: ["admin"] },
      { title: "Team", url: "/admin/team", icon: FolderKanban, roles: ["admin"] },
      { title: "Reports", url: "/admin/reports", icon: FileText, roles: ["admin"] },
      { title: "Activity Log", url: "/admin/activity-log", icon: Activity, roles: ["admin"] },
      { title: "Disputes", url: "/admin/dispute", icon: Flag, roles: ["admin"] },
    ]
  },
  {
    group: "System",
    children: [
      { title: "Notifications", url: "/admin/notifications", icon: Bell, roles: ["admin"] },
      { title: "Settings", url: "/admin/settings", icon: Settings, roles: ["admin"] },
    ]
  },

  // CUSTOMER
  {
    group: "Shop",
    children: [
      { title: "Home", url: "/home", icon: Home, roles: ["customer"] },
      { title: "Cart", url: "/cart", icon: ShoppingCart, roles: ["customer"] },
    ]
  },
  {
    group: "My Account",
    children: [
      { title: "Purchases", url: "/purchases", icon: Receipt, roles: ["customer"] },
      { title: "Product Return & Cancelled", url: "/return-refund", icon: RotateCcw, roles: ["customer"] },
      { title: "Favorites", url: "/favorites", icon: Heart, roles: ["customer"] },
      { title: "Trade", url: "/trade", icon: ArrowLeftRight, roles: ["customer"] },
    ]
  },
  {
    group: "Product Listing",
    children: [
      { title: "My products", url: "/personal-listing", icon: Package, roles: ["customer"] },
      { title: "Order Lists", url: "/order-list", icon: ClipboardList, roles: ["customer"] },
      { title: "Return/Refund/Cancel", url: "/return-refund-cancel", icon: Repeat, roles: ["customer"] },
      { title: "ComGift", url: "/comgift", icon: Gift, roles: ["customer"] },
    ]
  },
  {
    group: "Settings",
    children: [
      { title: "Subscription Plans", url: "/subscription-plan", icon: PhilippinePeso, roles: ["customer"] },
      { title: "Notification", url: "/notifications", icon: Bell, roles: ["customer"] },
    ]
  },

  // RIDER
  {
    group: "Dashboard",
    children: [
      { title: "Dashboard", url: "/rider/", icon: Home, roles: ["rider"] },
    ]
  },
  {
    group: "Deliveries",
    children: [
      { title: "Active Orders", url: "/rider/orders/active", icon: Package, roles: ["rider"] },
      { title: "Order History", url: "/rider/orders/history", icon: Clock, roles: ["rider"] },
      { title: "Schedule", url: "/rider/schedule", icon: Calendar, roles: ["rider"] },
    ]
  },
  {
    group: "Account",
    children: [
      { title: "Earnings", url: "/rider/earnings", icon: PhilippinePeso, roles: ["rider"] },
      { title: "Messages", url: "/rider/messages", icon: MessageSquare, roles: ["rider"] },
    ]
  },

  // MODERATOR
  {
    group: "Dashboard",
    children: [
      { title: "Dashboard", url: "/moderator", icon: Home, roles: ["moderator"] },
      { title: "Analytics", url: "/moderator/analytics", icon: BarChart, roles: ["moderator"] },
    ]
  },
  {
    group: "Products & Shops",
    children: [
      { title: "Products", url: "/moderator/products", icon: Package, roles: ["moderator"] },
      { title: "Shops", url: "/moderator/shops", icon: Store, roles: ["moderator"] },
      { title: "Boosting Plans", url: "/moderator/boosting", icon: Sparkles, roles: ["moderator"] },
    ]
  },
  {
    group: "Orders & Delivery",
    children: [
      { title: "Orders", url: "/moderator/orders", icon: Receipt, roles: ["moderator"] },
      { title: "Riders", url: "/moderator/riders", icon: Bike, roles: ["moderator"] },
    ]
  },
  {
    group: "Content Review",
    children: [
      { title: "User Reports", url: "/moderator/users", icon: Users, roles: ["moderator"] },
      { title: "Review Ratings", url: "/moderator/ratings", icon: Star, roles: ["moderator"] },
      { title: "Messages", url: "/moderator/messages", icon: MessageSquare, roles: ["moderator"] },
    ]
  },
  {
    group: "Actions",
    children: [
      { title: "Flagged Content", url: "/moderator/flagged", icon: Shield, roles: ["moderator"] },
      { title: "Activity Log", url: "/moderator/logs", icon: Activity, roles: ["moderator"] },
    ]
  },
];

function getAccessibleItems(
  list: typeof menuItems, 
  user: { isAdmin: boolean; isCustomer: boolean; isRider: boolean; isModerator: boolean; }
) {
  return list.map(group => ({
    ...group,
    children: group.children.filter(item => {
      if (user.isAdmin && item.roles.includes("admin")) return true;
      if (user.isCustomer && item.roles.includes("customer")) return true;
      if (user.isRider && item.roles.includes("rider")) return true;
      if (user.isModerator && item.roles.includes("moderator")) return true;
      return false;
    })
  })).filter(group => group.children.length > 0);
}

export function AppSidebar() {
  const user = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AxiosInstance.post('/logout/');
      sessionStorage.removeItem('user_profile');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  if (!user) {
    return (
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader className="p-4">
          <Skeleton className="h-6 w-32" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <Skeleton className="w-full h-10"/>
              <Skeleton className="w-full h-10"/>
              <Skeleton className="w-full h-10"/>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  const accessibleMenuItems = getAccessibleItems(menuItems, user);
  const displayName = getUserDisplayName(user);
  const userRole = getUserRole(user);

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back,</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              Hi, {displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {userRole}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {accessibleMenuItems.map(group => (
              <div key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                <SidebarMenu>
                  {group.children.map(item => {
                    const isActive = location.pathname === item.url;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}