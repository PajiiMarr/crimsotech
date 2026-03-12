// app/contexts/user-role.ts
import { createContext } from "react";

export interface User {
  // Role flags
  isAdmin: boolean;
  isCustomer: boolean;
  isRider: boolean;
  isModerator: boolean;
  
  // Basic info
  user_id?: string;
  id?: string;  // Some APIs use 'id' instead of 'user_id'
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  
  // Profile
  avatar_url?: string;
  contact_number?: string;
  date_of_birth?: string;
  age?: number;
  sex?: string;
  
  // Address
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  
  // Account status
  is_suspended?: boolean;
  created_at?: string;
  updated_at?: string;
  registration_stage?: number;
}

export const userContext = createContext<User | null>(null);