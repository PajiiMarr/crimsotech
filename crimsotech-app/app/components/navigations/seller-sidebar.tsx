"use client";

import {
  Home,
  Package,
  ClipboardList,
  DollarSign,
  MessageSquare,
  Settings
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
        { title: "Orders", url: "/seller/orders", icon: ClipboardList },
        { title: "Earnings", url: "/seller/earnings", icon: DollarSign },
      ],
    },
    {
      group: "Refund & Return",
      children: [
        { title: "Return & Refund", url: "/seller/return-refund", icon: MessageSquare },
        { title: "Messages", url: "/seller/messages", icon: MessageSquare },
        { title: "Customers", url: "/seller/customers", icon: MessageSquare },
      ],
    },
    {
      group: "Subscriptions",
      children: [
        { title: "Subscriptions", url: "/seller/subscription", icon: MessageSquare },
        { title: "Vouchers", url: "/seller/voucher", icon: MessageSquare },
      ],
    },
    {
      group: "Settings",
      children: [
        { title: "Notifications", url: "/seller/notifications", icon: Settings },
        { title: "Account Settings", url: "/seller/settings", icon: Settings },
        { title: "Violations", url: "/seller/violation", icon: Settings },

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
