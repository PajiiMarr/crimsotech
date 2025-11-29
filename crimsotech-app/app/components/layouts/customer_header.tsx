"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Bell, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "~/components/ui/dropdown-menu";
import { Link } from "react-router";
import { useNavigate } from "react-router";

export default function CustomerHeader() {
  const navigate = useNavigate();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
     
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Home</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>


      {/* Right side: Bell icon + User profile dropdown */}
      <div className="flex items-center gap-4 px-4">
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/shop-list")}>
              Shop
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to='/logout'>
                Sign Out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
