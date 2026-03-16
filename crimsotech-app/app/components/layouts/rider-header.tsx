// app/components/layouts/rider-header.tsx
"use client";

import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { useNavigate } from "react-router";
import { useContext } from "react";
import { UserContext } from "~/components/providers/user-role-provider";

export default function RiderHeader() {
  const navigate = useNavigate();
  const user = useContext(UserContext);

  console.log("RiderHeader - user from context:", user);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        
        {/* LEFT SIDE */}
        <div className="flex items-center px-4">
          <SidebarTrigger className="-ml-1" />
          <img
            src="/Crimsotech.png"
            className="w-20 h-20"
            alt="Crimsotech"
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 px-4">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5 text-gray-600" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">

              <DropdownMenuItem onClick={() => navigate("/rider/profile")}>
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/logout")}>
                Logout
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      <Separator
        orientation="horizontal"
        className="mr-1 data-[orientation=vertical]:h-2 mb-8"
      />
    </>
  );
}