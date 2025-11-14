// app/contexts/user-context.ts
import { createContext } from "react-router";

export interface User {
  isAdmin: boolean;
  isCustomer: boolean;
  isRider: boolean;
  isModerator: boolean;
  user_id?: string;
}

export const userContext = createContext<User | null>(null);