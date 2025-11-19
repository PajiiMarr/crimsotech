// app/components/navigations/sidebar.tsx
"use client";
import { 
  Home, ShoppingCart, TicketCheck, Star, Gift, Package,
  Store, CreditCard, List, MessageSquare, Users, 
  Shield, AlertCircle, FileText, Settings, Bell,
  BarChart, Bike, MapPin, Calendar, DollarSign
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
  SidebarFooter,
} from "~/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from '~/components/ui/dropdown-menu'
import { Skeleton } from "../ui/skeleton";

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
      { title: "Products", url: "/admin/products", icon: Package, roles: ["admin"] },
      { title: "Shops", url: "/admin/shops", icon: Store, roles: ["admin"] },
      { title: "Boosting Plans", url: "/admin/boosting", icon: CreditCard, roles: ["admin"] },
    ]
  },
  {
    group: "Orders & Delivery",
    children: [
      { title: "Order List", url: "/admin/orders", icon: List, roles: ["admin"] },
      { title: "Riders", url: "/admin/riders", icon: Bike, roles: ["admin"] },
      { title: "Ratings", url: "/admin/ratings", icon: Star, roles: ["admin"] },
    ]
  },
  {
    group: "Financial",
    children: [
      { title: "Vouchers", url: "/admin/vouchers", icon: Gift, roles: ["admin"] },
      { title: "Refund Requests", url: "/admin/refund-requests", icon: AlertCircle, roles: ["admin"] },
      { title: "Refund Verification", url: "/admin/refund-verification", icon: TicketCheck, roles: ["admin"] },
    ]
  },
  {
    group: "Management",
    children: [
      { title: "Manage Team", url: "/admin/team", icon: Users, roles: ["admin"] },
      { title: "Volunteers", url: "/admin/volunteers", icon: Users, roles: ["admin"] },
      { title: "Reports", url: "/admin/reports", icon: FileText, roles: ["admin"] },
      { title: "Activity Log", url: "/admin/activity-log", icon: FileText, roles: ["admin"] },
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
      { title: "Purchases", url: "/customer/purchases", icon: TicketCheck, roles: ["customer"] },
      { title: "Favorites", url: "/customer/favorites", icon: Star, roles: ["customer"] },
      { title: "ComGift", url: "/customer/comgift", icon: Gift, roles: ["customer"] },
    ]
  },

  // RIDER
  {
    group: "Dashboard",
    children: [
      { title: "Dashboard", url: "/rider/dashboard", icon: Home, roles: ["rider"] },
      { title: "My Stats", url: "/rider/stats", icon: BarChart, roles: ["rider"] },
    ]
  },
  {
    group: "Deliveries",
    children: [
      { title: "Active Orders", url: "/rider/orders/active", icon: Package, roles: ["rider"] },
      { title: "Order History", url: "/rider/orders/history", icon: List, roles: ["rider"] },
      { title: "Schedule", url: "/rider/schedule", icon: Calendar, roles: ["rider"] },
    ]
  },
  {
    group: "Account",
    children: [
      { title: "Earnings", url: "/rider/earnings", icon: DollarSign, roles: ["rider"] },
      { title: "Messages", url: "/rider/messages", icon: MessageSquare, roles: ["rider"] },
    ]
  },

  // MODERATOR
  {
    group: "Dashboard",
    children: [
      { title: "Dashboard", url: "/moderator", icon: Home, roles: ["moderator"] },
      { title: "Reports Queue", url: "/moderator/reports", icon: AlertCircle, roles: ["moderator"] },
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
      { title: "Activity Log", url: "/moderator/logs", icon: FileText, roles: ["moderator"] },
    ]
  },
];

function getAccessibleItems(
  list: typeof menuItems, 
  user: { isAdmin: boolean, isCustomer: boolean, isRider: boolean, isModerator: boolean }
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
  
  if (!user) {
    return (
      <Sidebar variant="floating" collapsible="icon">
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

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <h1 className="text-lg">Logo Placeholder</h1>
          </SidebarGroupLabel>
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
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>Username</SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width] w-70">
                <DropdownMenuItem><span>Account</span></DropdownMenuItem>
                <DropdownMenuItem><span>Billing</span></DropdownMenuItem>
                <DropdownMenuItem><span>Sign out</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}