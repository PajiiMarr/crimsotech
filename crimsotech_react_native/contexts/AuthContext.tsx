import { login as apiLogin, register as apiRegister, updateProfile } from '@/utils/api';
import { addToCart as apiAddToCart, getCartItems as apiGetCartItems } from '@/utils/cartApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface CartItem {
  id: string;
  product: any;
  user: string;
  quantity: number;
  added_at: string;
}

interface AuthContextType {
  user: any; // In a real app, this would be a more specific user type
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  completeRegistration: (userData: any) => Promise<void>;
  updateUserProfile: (profileData: any) => Promise<void>;
  addToCart: (product_id: string, quantity?: number) => Promise<void>;
  getCartItems: () => Promise<CartItem[]>;
  cartItems: CartItem[];
  cartCount: number;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by retrieving stored user data
    const checkAuthStatus = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Get cart count
  const cartCount = cartItems.length;

  const login = async (username: string, password: string) => {
    try {
      // Call the Django backend API for login
      const response = await apiLogin({ username, password });

      // Store user data in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(response));
      setUser(response);

      // Check registration stage to determine where to redirect the user
      // Stage 1: Initial registration (should go to setup-account)
      // Stage 2: Profile setup done (should go to verify-phone)
      // Stage 3: Phone verification done (should go to main app)
      // Default or any other stage: go to main app
      if (response.registration_stage === 1) {
        router.replace('/(auth)/setup-account');
      } else if (response.registration_stage === 2) {
        router.replace('/(auth)/verify-phone');
      } else {
        // Registration complete: route by role like the web app
        if (response.is_rider) {
          router.replace('/rider');
        } else {
          router.replace('/main/home');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw so the login screen can handle the error
    }
  };

  // Add item to cart
  const addToCart = async (product_id: string, quantity: number = 1) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiAddToCart({
        user_id: user.user_id || user.id, // Use whichever field contains the user ID
        product_id,
        quantity
      });

      if (response.success) {
        // Refresh cart items after adding
        await loadCartItems();
        return response;
      } else {
        throw new Error(response.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  };

  // Load cart items from backend
  const loadCartItems = async () => {
    if (!user) {
      setCartItems([]);
      return;
    }

    try {
      const response = await apiGetCartItems(user.user_id || user.id);
      if (response.success) {
        setCartItems(response.cart_items || []);
      } else {
        console.error('Failed to load cart items:', response.error);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Load cart items error:', error);
      setCartItems([]);
    }
  };

  // Get cart items
  const getCartItems = async (): Promise<CartItem[]> => {
    if (!user) {
      return [];
    }

    try {
      const response = await apiGetCartItems(user.user_id || user.id);
      if (response.success) {
        setCartItems(response.cart_items || []);
        return response.cart_items || [];
      } else {
        console.error('Failed to get cart items:', response.error);
        return [];
      }
    } catch (error) {
      console.error('Get cart items error:', error);
      return [];
    }
  };

  const register = async (username: string, password: string, email?: string) => {
    try {
      // Call the Django backend API for registration
      const response = await apiRegister({ username, password, email });

      // Store user data in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(response));
      setUser(response);

      // After initial registration, user should go to setup account
      // The registration stage should be 1 according to the Django model
      router.replace('/(auth)/setup-account');
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw so the registration screen can handle the error
    }
  };

  // For multi-step registration, we'll have a separate function to complete registration with profile details
  const completeRegistration = async (userData: any) => {
    try {
      // In a real implementation, you would call an API to update the user profile
      // For now, we'll just update the locally stored user data
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      setUser(userData);

      // Redirect to main app after completing registration
      router.replace('/main/home');
    } catch (error) {
      console.error('Complete registration error:', error);
      throw error;
    }
  };

  // Update user profile function
  const updateUserProfile = async (profileData: any) => {
    // Try to resolve a userId even if AuthContext.user is not set (e.g., rider flow before login hydration)
    let targetUserId = user?.user_id || user?.id;

    if (!targetUserId) {
      // Fallback to stored user or rider flow temp storage
      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          targetUserId = parsed.user_id || parsed.id;
        } catch {}
      }
    }

    if (!targetUserId) {
      // Last resort: look in AsyncStorage for rider flow
      const riderUserId = await AsyncStorage.getItem('userId');
      if (riderUserId) {
        targetUserId = riderUserId;
      }
    }

    if (!targetUserId) {
      throw new Error('User not authenticated');
    }

    try {
      // Call the Django backend API to update user profile
      const updatedData = await updateProfile(targetUserId, profileData);

      // Normalize user object to always have user_id
      const normalizedUser = {
        ...updatedData,
        user_id: updatedData.user_id || updatedData.id || targetUserId,
      };

      // Update the user data in secure storage and context
      await SecureStore.setItemAsync('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return normalizedUser;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      // Remove user data from secure storage
      await SecureStore.deleteItemAsync('user');
      router.replace('/(auth)/login'); // Redirect to login after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    completeRegistration,
    updateUserProfile,
    addToCart,
    getCartItems,
    cartItems,
    cartCount,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}