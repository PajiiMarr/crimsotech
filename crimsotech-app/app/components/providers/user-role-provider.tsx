// app/components/providers/user-provider.tsx
"use client";
import { createContext, useContext } from "react";
import type { User } from "~/contexts/user-role";

export const ClientUserContext = createContext<User | null>(null);

export function UserProvider({ 
  children, 
  user 
}: { 
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <ClientUserContext.Provider value={user}>
      {children}
    </ClientUserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(ClientUserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}