// app/components/providers/user-role-provider.tsx
"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { User } from "~/contexts/user-role";
import AxiosInstance from "~/components/axios/Axios";
import { useNavigate } from "react-router";

// Export this context so it can be imported elsewhere
export const UserContext = createContext<User | null>(null);

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// Keep this for the provider internal use
const ClientUserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ 
  children, 
  user: initialUser = null 
}: { 
  children: React.ReactNode;
  user?: User | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const navigate = useNavigate();

  // Clear all user data
  const clearUserData = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('user_profile');
    localStorage.removeItem('user');
    delete AxiosInstance.defaults.headers.common['Authorization'];
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      clearUserData();
      await navigate('/logout', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  }, [clearUserData, navigate]);

  // Initialize user on mount or when initialUser changes
  useEffect(() => {
    const initializeUser = async () => {
      // If we have initialUser from the server, use it
      if (initialUser) {
        console.log("Setting user from initialUser:", initialUser);
        setUser(initialUser);
        sessionStorage.setItem('user_profile', JSON.stringify(initialUser));
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }

      // Otherwise check session storage
      const cached = sessionStorage.getItem('user_profile');
      if (cached) {
        try {
          const parsedUser = JSON.parse(cached);
          console.log("Setting user from cache:", parsedUser);
          setUser(parsedUser);
          setIsLoading(false);
          initialLoadDone.current = true;
          return;
        } catch (e) {
          sessionStorage.removeItem('user_profile');
        }
      }

      // No user found
      setIsLoading(false);
    };

    initializeUser();
  }, [initialUser]);

  // Listen for storage events (for multi-tab logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_profile' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    user,
    setUser,
    logout,
    isLoading
  };

  return (
    <ClientUserContext.Provider value={value}>
      {/* Also provide the user directly through the exported context */}
      <UserContext.Provider value={user}>
        {children}
      </UserContext.Provider>
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