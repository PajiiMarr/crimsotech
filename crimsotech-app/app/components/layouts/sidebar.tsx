// app/components/layouts/sidebar.tsx
"use client";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/navigations/sidebar";

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
      <main className="flex-1 flex">
        <SidebarTrigger
          className="
            mt-2 ml-2
            w-12 h-11 
            flex items-center justify-center
            rounded-xl
            hover:bg-gray-200
            text-gray-700 hover:text-gray-900
             transition-all duration-100
          "/>
        <div className="p-4 pr-15 w-full">{children}</div>
      </main>
    </SidebarProvider>
  );
}