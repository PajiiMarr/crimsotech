"use client";

import {
  Home,
  Package,
  ClipboardList,
  DollarSign,
  MessageSquare,
  Settings,
  RotateCcw,
  Gift,
  Bell,
  AlertTriangle
} from "lucide-react";

import { Link, useLocation } from 'react-router'


import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "~/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from "~/components/ui/dropdown-menu";

export default function SellerSidebar() {
  const location = useLocation();

  const sellerMenu = [
    {
      group: "Seller Dashboard",
      children: [
        { title: "Dashboard", url: "/seller/dashboard", icon: Home },
        { title: "Products", url: "/seller/seller-product-list", icon: Package },
        { title: "Orders", url: "/seller/seller-order-list", icon: ClipboardList },
      ],
    },
    {
      group: "Refund & Return",
      children: [
        { title: "Return/Refund/Cancel", url: "/seller/seller-return-refund-cancel", icon: RotateCcw },
        { title: "Manage Return Address", url: "/seller/return-address", icon: RotateCcw },
      ],
    },
    {
      group: "Subscriptions",
      children: [
        { title: "Vouchers", url: "/seller/seller-vouchers", icon: Gift },
      ],
    },
    {
      group: "Settings",
      children: [
        { title: "Notifications", url: "/seller/seller-notifications", icon: Bell },
        { title: "Account Settings", url: "/seller/settings", icon: Settings },
        { title: "Violations", url: "/seller/violation", icon: AlertTriangle },
      ],
    },
  ];

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <h1 className="text-lg font-semibold">Seller</h1>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            {sellerMenu.map((group) => (
              <div key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>

                <SidebarMenu>
                  {group.children.map((item) => {
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

      {/* Footer: placeholder user */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>Seller User</SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width] w-60">
                <DropdownMenuItem>Account</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
