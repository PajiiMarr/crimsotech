"use client";

import * as React from "react";
import { Link, useLocation } from "react-router";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb"; // Your existing Radix-style breadcrumb components

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* First breadcrumb: Dashboard */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          // Make it readable: replace hyphens with spaces, capitalize
          const displayName = decodeURIComponent(name).replace(/-/g, " ");
          const title = displayName.charAt(0).toUpperCase() + displayName.slice(1);

          return (
            <React.Fragment key={routeTo}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={routeTo}>{title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
