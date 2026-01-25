// contexts/authcontext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AxiosInstance from './axios';

type UserRole = 'customer' | 'rider' | 'admin' | null;

type AuthContextType = {
  // Auth data
  userId: string | null;
  shopId: string | null;
  userRole: UserRole;
  loading: boolean;
  registrationStage: number | null;
  
  // User info (for convenience)
  username: string | null;
  email: string | null;

  // Compatibility helpers
  user: { user_id?: string; id?: string; username?: string | null; email?: string | null } | null;
  logout: () => Promise<void>;
  
  // Actions
  setAuthData: (
    userId: string, 
    userRole: UserRole, 
    username?: string, 
    email?: string, 
    shopId?: string,
    registrationStage?: number
  ) => Promise<void>;
  updateUserRole: (newRole: UserRole) => Promise<void>;
  updateShopId: (newShopId: string) => Promise<void>;
  updateRegistrationStage: (newStage: number) => Promise<void>;
  removeShop: () => Promise<void>;
  clearAuthData: () => Promise<void>;
  // Auth helpers
  login: (username: string, password: string) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [registrationStage, setRegistrationStage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all auth data from SecureStore
    const loadAuthData = async () => {
      try {
        const storedUserId = await SecureStore.getItemAsync('user_id');
        const storedShopId = await SecureStore.getItemAsync('shop_id');
        const storedUserRole = await SecureStore.getItemAsync('user_role');
        const storedUsername = await SecureStore.getItemAsync('username');
        const storedEmail = await SecureStore.getItemAsync('email');
        
        if (storedUserId) setUserId(storedUserId);
        if (storedShopId) setShopId(storedShopId);
        if (storedUserRole) setUserRole(storedUserRole as UserRole);
        if (storedUsername) setUsername(storedUsername);
        if (storedEmail) setEmail(storedEmail);
        const storedStage = await SecureStore.getItemAsync('registration_stage');
        if (storedStage) setRegistrationStage(parseInt(storedStage, 10));
      } catch (err) {
        console.error('Failed to load auth data', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadAuthData();
  }, []);

  // Set complete auth data (after login)
  const setAuthData = async (
    newUserId: string, 
    newUserRole: UserRole,
    newUsername?: string,
    newEmail?: string,
    newShopId?: string,
    newRegistrationStage?: number
  ) => {
    try {
      // Save to state
      setUserId(newUserId);
      setUserRole(newUserRole);
      if (newUsername) setUsername(newUsername);
      if (newEmail) setEmail(newEmail);
      if (newShopId) setShopId(newShopId);
      if (typeof newRegistrationStage === 'number') setRegistrationStage(newRegistrationStage);
      
      // Save to SecureStore
      await SecureStore.setItemAsync('user_id', newUserId);
      await SecureStore.setItemAsync('user_role', newUserRole || '');
      if (newUsername) await SecureStore.setItemAsync('username', newUsername);
      if (newEmail) await SecureStore.setItemAsync('email', newEmail);
      if (newShopId) await SecureStore.setItemAsync('shop_id', newShopId);
      if (typeof newRegistrationStage === 'number') await SecureStore.setItemAsync('registration_stage', String(newRegistrationStage));
    } catch (err) {
      console.error('Failed to save auth data', err);
      throw err;
    }
  };

  // Update user role (if role changes)
  const updateUserRole = async (newRole: UserRole) => {
    try {
      setUserRole(newRole);
      await SecureStore.setItemAsync('user_role', newRole || '');
    } catch (err) {
      console.error('Failed to update user role', err);
      throw err;
    }
  };

  // Update registration stage
  const updateRegistrationStage = async (newStage: number) => {
    try {
      setRegistrationStage(newStage);
      await SecureStore.setItemAsync('registration_stage', String(newStage));
    } catch (err) {
      console.error('Failed to update registration stage', err);
      throw err;
    }
  };

  // Update shop ID (when user creates/gets a shop)
  const updateShopId = async (newShopId: string) => {
    try {
      setShopId(newShopId);
      await SecureStore.setItemAsync('shop_id', newShopId);
    } catch (err) {
      console.error('Failed to update shop ID', err);
      throw err;
    }
  };

  // Remove shop (when shop is deleted)
  const removeShop = async () => {
    try {
      setShopId(null);
      await SecureStore.deleteItemAsync('shop_id');
    } catch (err) {
      console.error('Failed to remove shop', err);
      throw err;
    }
  };

  // Clear all auth data (logout)
  const clearAuthData = async () => {
    try {
      // Clear state
      setUserId(null);
      setShopId(null);
      setUserRole(null);
      setUsername(null);
      setEmail(null);
      
      // Clear SecureStore
      await SecureStore.deleteItemAsync('user_id');
      await SecureStore.deleteItemAsync('shop_id');
      await SecureStore.deleteItemAsync('user_role');
      await SecureStore.deleteItemAsync('username');
      await SecureStore.deleteItemAsync('email');
      await SecureStore.deleteItemAsync('is_customer');
      await SecureStore.deleteItemAsync('is_rider');
      
      // Navigate to login
      const { router } = await import('expo-router');
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  // Provide a simple `logout` alias and a `user` object for compatibility
  const logout = async () => {
    await clearAuthData();
  };

  // Login helper used by some flows (e.g., rider signup auto-login)
  const login = async (username: string, password: string) => {
    try {
      const response = await AxiosInstance.post('/api/login/', { username, password }, { headers: { 'Content-Type': 'application/json' } });
      const data = response.data;

      // Derive role and shop id
      const role = data.is_rider ? 'rider' : (data.is_customer ? 'customer' : null);
      const shop = data.shop_id || data.profile?.shop?.id || null;

      await setAuthData(data.user_id || data.id, role, data.username, data.email, shop, data.registration_stage);

      // Try to fetch profile to get up-to-date shop id
      try {
        const profileRes = await AxiosInstance.get('/api/profile/', { headers: { 'X-User-Id': data.user_id || data.id, 'Content-Type': 'application/json' } });
        if (profileRes.data?.success && profileRes.data.profile?.shop) {
          const foundShopId = profileRes.data.profile.shop.id;
          if (foundShopId) await updateShopId(foundShopId);
        }
      } catch (e) {
        // Non-fatal
        console.warn('Failed to fetch profile after login', e);
      }

      return data;
    } catch (err) {
      console.error('Login helper failed', err);
      throw err;
    }
  };

  const user = userId ? { user_id: userId, id: userId, username, email } : null;

  const value: AuthContextType = {
    userId,
    shopId,
    userRole,
    registrationStage,
    username,
    email,
    user,
    loading,
    setAuthData,
    updateUserRole,
    updateShopId,
    updateRegistrationStage,
    removeShop,
    clearAuthData,
    logout,
    login,
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};