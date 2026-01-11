export const ROLES = {
  CUSTOMER: "customer",
  RIDER: "rider",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

import React from "react";

export default function RolesPlaceholder(): React.ReactElement | null {
  // This file defines constants used across the app, but Expo Router treats files under `app/` as routes.
  // Returning null keeps the constant export while satisfying the Router's requirement for a default component.
  return null;
}
