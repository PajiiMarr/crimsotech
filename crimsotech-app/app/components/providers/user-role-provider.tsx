// app/components/providers/user-role-provider.tsx
"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { User } from "~/contexts/user-role";
import AxiosInstance from "~/components/axios/Axios";

export const ClientUserContext = createContext<User | null>(null);

export function UserProvider({ 
  children, 
  user: initialUser 
}: { 
  children: React.ReactNode;
  user: User | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const initialLoadDone = useRef(false);

  // Initialize user only once on first load
  useEffect(() => {
    if (!initialLoadDone.current && initialUser) {
      setUser(initialUser);
      initialLoadDone.current = true;
    }
  }, []); // Empty dependency array - only runs once on mount

  // Load from session storage on mount (overrides initialUser if exists)
  useEffect(() => {
    const cached = sessionStorage.getItem('user_profile');
    if (cached) {
      try {
        const parsedUser = JSON.parse(cached);
        setUser(parsedUser);
        initialLoadDone.current = true;
      } catch (e) {
        console.error('Failed to parse cached user');
        sessionStorage.removeItem('user_profile');
      }
    }
  }, []);

  // Fetch full profile if we have user_id but missing profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.user_id) return;
      
      // Check if we already have full profile data
      if (user?.first_name || user?.username) {
        return;
      }

      try {
        const response = await AxiosInstance.get('/user/profile/', {
          headers: { 'X-User-Id': user.user_id }
        });
        
        if (response.data) {
          setUser(currentUser => ({ 
            ...currentUser, 
            ...response.data 
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchProfile();
  }, [user?.user_id]);

  // Save to session storage whenever user changes
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user_profile', JSON.stringify(user));
    }
  }, [user]);

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