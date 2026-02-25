// app/contexts/user-role.ts
import { createContext } from "react";  // Make sure this is from "react", not "react-router"

export interface User {
  isAdmin: boolean;
  isCustomer: boolean;
  isRider: boolean;
  isModerator: boolean;
  user_id?: string;
}

export const userContext = createContext<User | null>(null);