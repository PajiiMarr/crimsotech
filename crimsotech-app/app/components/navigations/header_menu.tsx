
"use client";
export interface headerMenuItems {
  label: string;
  url?: string;
  type: "link" | "action";
  action?: "logout"; 
}

export const headerMenuItems: headerMenuItems[] = [
  { label: "Profile", url: "/profile", type: "link" },
  // { label: "Settings", url: "/settings", type: "link" },
  { label: "Go to Shop", url: "/shops", type: "link" },
  { label: "Sign Out", action: "logout", type: "action" }
];
