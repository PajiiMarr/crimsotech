// app/components/navigations/sidebar.tsx
"use client";
import { 
  Home, ShoppingCart, TicketCheck, Star, Gift, Handshake, Package,
  Store, CreditCard, List, MessageSquare, Users, 
  Shield, AlertCircle, FileText, Settings, Bell,
  BarChart, Bike, MapPin, Calendar, ClipboardList,
  PhilippinePeso, RotateCcw, Heart, User, Receipt,
  Truck, ShieldCheck, Activity, Flag, Megaphone, FolderKanban,
  Clock, Repeat, ArrowLeftRight, Sparkles, Tag, BadgePercent
} from "lucide-react"
import { Link, useLocation } from 'react-router'
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
  useSidebar,
} from "~/components/ui/sidebar"

// Helper function to get user role only
const getUserRole = (user: any): string => {
  if (!user) return "User";
  
  // Check both camelCase and snake_case
  if (user?.isAdmin || user?.is_admin) return "Admin";
  if (user?.isModerator || user?.is_moderator) return "Moderator";
  if (user?.isRider || user?.is_rider) return "Rider";
  if (user?.isCustomer || user?.is_customer) return "Customer";
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

// Helper function to check user role (handles both camelCase and snake_case)
const hasRole = (user: any, role: string): boolean => {
  if (!user) return false;
  
  switch(role) {
    case 'admin':
      return !!(user?.isAdmin || user?.is_admin);
    case 'moderator':
      return !!(user?.isModerator || user?.is_moderator);
    case 'rider':
      return !!(user?.isRider || user?.is_rider);
    case 'customer':
      return !!(user?.isCustomer || user?.is_customer);
    default:
      return false;
  }
};

function getAccessibleItems(
  list: typeof menuItems, 
  user: any | null
) {
  if (!user) return [];
  
  return list.map(group => ({
    ...group,
    children: group.children.filter(item => {
      if (item.roles.includes("admin") && hasRole(user, 'admin')) return true;
      if (item.roles.includes("moderator") && hasRole(user, 'moderator')) return true;
      if (item.roles.includes("rider") && hasRole(user, 'rider')) return true;
      if (item.roles.includes("customer") && hasRole(user, 'customer')) return true;
      return false;
    })
  })).filter(group => group.children.length > 0);
}

export function AppSidebar() {
  const { user } = useUser();
  const location = useLocation();
  const { state } = useSidebar();
  
  // If no user, don't render sidebar
  if (!user) {
    return null;
  }

  const accessibleMenuItems = getAccessibleItems(menuItems, user);
  const userRole = getUserRole(user);
  
  // Check if sidebar is collapsed
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            // Show welcome message without username
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {userRole}
              </p>
            </div>
          ) : (
            // Show only icon when collapsed
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <User className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {accessibleMenuItems.map(group => (
              <div key={group.group}>
                <SidebarGroupLabel>
                  {!isCollapsed ? group.group : null}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {group.children.map(item => {
                    const isActive = location.pathname === item.url;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url}>
                            <item.icon />
                            {!isCollapsed && <span>{item.title}</span>}
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