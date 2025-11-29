// app/components/layouts/seller-sidebar.tsx
"use client";

import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import SellerSidebar from "~/components/navigations/seller-sidebar";
import CustomerHeader from "~/components/layouts/customer_header"; 



export default function SellerSidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "20rem",
        "--sidebar-width-mobile": "20rem",
      } as React.CSSProperties}
    >
      <SellerSidebar />

      <SidebarInset>
        {/* Seller Header */}
         <CustomerHeader />
       

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
