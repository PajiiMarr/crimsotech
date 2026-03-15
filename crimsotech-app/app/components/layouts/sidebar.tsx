// app/components/layouts/sidebar.tsx
"use client";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/navigations/sidebar";
import CustomerHeader from "~/components/layouts/customer_header";
import { useUser } from '~/components/providers/user-role-provider';
import { useEffect } from 'react';

// Helper function to get role-specific border color CSS variable
const getRoleBorderVariable = (user: any): string => {
  if (!user) return 'oklch(0.92 0.004 286.32)'; // default border
  
  if (user?.isAdmin || user?.is_admin) return 'oklch(0.637 0.237 25.331)'; // red
  if (user?.isModerator || user?.is_moderator) return 'oklch(0.627 0.265 303.9)'; // purple
  if (user?.isRider || user?.is_rider) return 'oklch(0.696 0.17 162.48)'; // green
  if (user?.isCustomer || user?.is_customer) return 'oklch(0.623 0.214 259.815)'; // blue
  
  return 'oklch(0.92 0.004 286.32)'; // default border
};

export default function SidebarLayout({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const roleBorderColor = getRoleBorderVariable(user);

  // Update CSS variable for sidebar border
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-border', roleBorderColor);
    
    // Cleanup on unmount
    return () => {
      document.documentElement.style.setProperty('--sidebar-border', 'oklch(0.92 0.004 286.32)');
    };
  }, [roleBorderColor]);

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