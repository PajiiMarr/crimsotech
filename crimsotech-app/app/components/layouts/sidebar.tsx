// app/components/layouts/sidebar.tsx
"use client";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/navigations/sidebar";
import CustomerHeader from "~/components/layouts/customer_header"; 

export default function SidebarLayout({ 
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
      <AppSidebar />
      <SidebarInset>
    
        <CustomerHeader />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}