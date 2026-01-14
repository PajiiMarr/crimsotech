import { useAuth } from '../../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CustomerLayout from './CustomerLayout';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    RefreshControl,
    Image,
    SafeAreaView
} from 'react-native';
import AxiosInstance from '../../contexts/axios';
import { getUserShops } from '../../utils/api';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

// Types based on your Django API response
interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  contact_number: string;
  date_of_birth: string | null;
  age: number | null;
  sex: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  state: string;
  zip_code: string;
  country: string;
  is_admin: boolean;
  is_customer: boolean;
  is_moderator: boolean;
  is_rider: boolean;
  registration_stage: number | null;
  created_at: string;
  updated_at: string;
  has_profile_picture?: boolean;
  is_complete_profile?: boolean;
  registration_complete?: boolean;
}

interface CustomerData {
  customer: string | null;
  product_limit: number;
  current_product_count: number;
  is_customer: boolean;
  can_add_product: boolean;
  products_remaining: number;
  has_max_products?: boolean;
  customer_since?: string;
  product_limit_info?: string;
  can_manage_shop?: boolean;
}

interface ShopData {
  id: string;
  name: string;
  description: string;
  shop_picture: string | null;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  created_at: string;
  is_suspended: boolean;
  suspended_until: string | null;
  follower_count: number;
  is_following: boolean;
  is_active: boolean;
  location: string;
  orders_count?: number;
  products_count?: number;
  customer_count?: number;
  total_orders?: number;
  shop_headers?: {
    has_shop: boolean;
    is_shop_owner: boolean;
    can_manage_shop: boolean;
    shop_created?: string;
    shop_age_days?: number;
    is_eligible_for_promotions?: boolean;
    needs_attention?: boolean;
    shop_performance?: string;
    has_unread_notifications?: boolean;
  };
}

interface ProfileResponse {
  success: boolean;
  profile: {
    user: UserProfile;
    customer: CustomerData;
    shop: ShopData | null;
  };
  headers?: {
    timestamp: string;
    api_version: string;
    requires_shop: boolean;
    user_type: string;
    has_active_session: boolean;
    can_switch_mode: boolean;
    available_routes: {
      seller_dashboard: boolean;
      customer_dashboard: boolean;
      create_shop: boolean;
      manage_products: boolean;
      view_orders: boolean;
    };
  };
}

export default function ProfileScreen() {
  // Use the new AuthContext
  const { 
    userId, 
    shopId, 
    userRole, 
    username, 
    email, 
    loading: authLoading, 
    clearAuthData 
  } = useAuth();
  
  const [profile, setProfile] = useState<ProfileResponse['profile'] | null>(null);
  const [headers, setHeaders] = useState<ProfileResponse['headers'] | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderCounts, setOrderCounts] = useState({ processing: 0, shipped: 0, rate: 0, returns: 0 });
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Shop fallback states
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

  // Helper to avoid strict typed route errors
  const pushRoute = (path: string) => router.push(path as any);

  // Fetch profile data from API
  const fetchProfile = async () => {
    if (!userId) {
      console.log('No user ID available');
      setLoadingProfile(false);
      return;
    }

    try {
      setLoadingProfile(true);
      const response = await AxiosInstance.get('/api/profile/', {
        headers: {
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
      });

      console.log('Profile API Response:', response.data);

      if (response.data.success) {
        setProfile(response.data.profile);
        setHeaders(response.data.headers || null);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to load profile');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      console.error('Response data:', error.response?.data);

      let errorMessage = 'Failed to load profile data.';
      const status = error.response?.status;
      const serverData = error.response?.data;
      

      if (status === 404) {
        errorMessage = 'User profile not found.';
      } else if (status === 400) {
        errorMessage = 'Invalid request. Please login again.';
      } else if (status === 500) {
        // Try a known alternative endpoint as a fallback
        try {
          console.log('Attempting fallback endpoint /api/profile/get');
          const fallback = await AxiosInstance.get('/api/profile/get', {
            headers: { 'X-User-Id': userId, 'Content-Type': 'application/json' },
          });

          console.log('Fallback response:', fallback.data);
          if (fallback.data?.success) {
            setProfile(fallback.data.profile);
            setHeaders(fallback.data.headers || null);
            setHasShop(fallback.data.profile?.shop ? true : false);
            return; // Success — skip showing an error alert
          }

          errorMessage = fallback.data?.error || serverData?.error || 'Server error. Please try again.';
        } catch (fallbackError: any) {
          console.error('Fallback profile fetch failed:', fallbackError);
          if (!fallbackError.response) {
            errorMessage = 'Network error. Please check your connection.';
          } else {
            errorMessage = fallbackError.response?.data?.error || `Server error (${fallbackError.response.status})`;
          }
        }
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (serverData?.error) {
        // Use server-provided message when available
        errorMessage = serverData.error;
      }

      // Try fallback shop check if profile could not be fetched and we haven't checked shops yet
      if (userId && hasShop === null) {
        checkUserShops();
      }

      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: () => fetchProfile() },
        { text: 'Close', style: 'cancel' },
      ]);
    } finally {
      setLoadingProfile(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchOrderCounts();
  };

  // Fetch order counts per status to show badges
  const fetchOrderCounts = async () => {
    if (!userId) return;

    try {
      setLoadingCounts(true);
      const response = await AxiosInstance.get('/api/purchases-buyer/status-counts/', {
        headers: { 'X-User-Id': userId },
      });

      // Expecting response.data to be an object like { processing: 1, shipped: 2, rate: 0, returns: 1 }
      if (response?.data) {
        const data = response.data;
        // normalize keys
        setOrderCounts({
          processing: Number(data.processing || data.pending || 0),
          shipped: Number(data.shipped || 0),
          rate: Number(data.rate || data.completed || 0),
          returns: Number(data.returns || data.cancelled || 0),
        });
      }
    } catch (err: any) {
      console.error('Error fetching order counts:', err);
      // Do not fallback to /user_purchases_summary/ (server may return 500). Keep counts unchanged on error.
    } finally {
      setLoadingCounts(false);
    }
  };

  // Check user shops fallback (if profile does not contain shop but user is a customer)
  const checkUserShops = async () => {
    if (!userId) {
      setHasShop(false);
      return;
    }

    try {
      setLoadingShop(true);
      const response = await getUserShops(userId);
      console.log('getUserShops response:', response);
      if (response && response.success && Array.isArray(response.shops) && response.shops.length > 0) {
        setHasShop(true);
        const rawShop = response.shops[0];

        // Normalize shop fields to match profile.shop shape created by ProfileView
        const normalizedShop = {
          ...rawShop,
          is_active: (rawShop.status === 'Active' || rawShop.status === 'active') && !rawShop.is_suspended,
          verified: Boolean(rawShop.verified),
          follower_count: Number(rawShop.follower_count || 0),
          total_sales: (typeof rawShop.total_sales === 'number') ? rawShop.total_sales.toFixed(2) : String(rawShop.total_sales ?? '0.00'),
          created_at: rawShop.created_at || null,
        } as any;

        setProfile((prev) => prev ? { ...prev, shop: normalizedShop } : { user: null as any, customer: { customer: null as any, product_limit: 0, current_product_count: 0, is_customer: true, can_add_product: false, products_remaining: 0 }, shop: normalizedShop });
      } else {
        setHasShop(false);
      }
    } catch (err: any) {
      console.error('Error checking user shops:', err);
      setHasShop(false);
      // Notify user when network error occurs so they can take action
      const msg = err?.message || 'Failed to check shop status';
      if (msg.includes('Cannot connect to server') || msg.includes('Network')) {
        Alert.alert('Network Error', msg, [
          { text: 'Retry', onPress: () => checkUserShops() },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } finally {
      setLoadingShop(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchProfile();
      fetchOrderCounts();
    }
  }, [authLoading, userId]);

  // When profile is loaded but lacks shop, query the older endpoint to find shop(s)
  useEffect(() => {
    if (profile && profile.customer?.is_customer && !profile.shop) {
      // Only run check when we haven't already decided
      if (hasShop === null) {
        checkUserShops();
      }
    }
  }, [profile]);

  const handleSwitchToShop = () => {
    // Navigate to the public shops list. If user has a shop, pass its ID so the page can load its details.
    const shopIdToOpen = profile?.shop?.id;
    if (shopIdToOpen) {
      pushRoute(`/customer/shops?shopId=${shopIdToOpen}`);
    } else {
      pushRoute('/customer/shops');
    }
  };



  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name?: string, email?: string, username?: string) => {
    if (name && name.trim()) {
      const names = name.trim().split(' ');
      if (names.length > 1) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (profile?.user?.full_name) {
      return profile.user.full_name;
    }
    if (profile?.user?.first_name && profile?.user?.last_name) {
      return `${profile.user.first_name} ${profile.user.last_name}`;
    }
    if (profile?.user?.first_name) {
      return profile.user.first_name;
    }
    if (profile?.user?.username) {
      return profile.user.username;
    }
    if (username) {
      return username;
    }
    return 'User';
  };

  const getUserEmail = () => {
    if (profile?.user?.email) {
      return profile.user.email;
    }
    if (email) {
      return email;
    }
    return 'user@example.com';
  };

  // Derived shop presence used across the component (falls back to hasShop if profile lacks shop)
  const effectiveHasShop: boolean = !!(profile?.shop || hasShop);

  // Loading state
  if (authLoading || (loadingProfile && !refreshing)) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScrollView>
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.notLoggedInContainer}>
          <MaterialIcons name="person-off" size={80} color="#9CA3AF" />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>Please login to view your profile</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <CustomerLayout disableScroll>
    <ScrollView 
    
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#6366F1']}
          tintColor="#6366F1"
        />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.headerRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarTextSmall}>
              {getInitials(
                profile?.user?.full_name, 
                profile?.user?.email, 
                profile?.user?.username
              )}
            </Text>
          </View>

          <View style={styles.headerText}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.userNameCompact}>{getUserDisplayName()}</Text>
              <View style={styles.shopBadge}>
                <Text style={styles.shopBadgeText}>{profile?.shop ? `S1` : `S0`}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialIcons name="perm-identity" size={12} color="#6C757D" />
              <Text style={styles.userSubtitle}>My Profile</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={() => pushRoute('/customer/account-profile')}>
            <MaterialIcons name="edit" size={18} color="#374151" />
          </TouchableOpacity>
        </View>



        {/* Product Limit Info */}
        {/* {profile?.customer?.is_customer && (
          <View style={styles.productLimitCard}>
            <View style={styles.productLimitHeader}>
              <MaterialIcons name="inventory" size={20} color="#6366F1" />
              <Text style={styles.productLimitTitle}>Product Limit</Text>
            </View>
            <View style={styles.productLimitProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min(
                        (profile.customer.current_product_count / profile.customer.product_limit) * 100,
                        100
                      )}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.productLimitText}>
                {profile.customer.current_product_count} / {profile.customer.product_limit} products
                {' '}({profile.customer.products_remaining} remaining)
              </Text>
              {profile.customer.has_max_products && (
                <Text style={styles.maxLimitWarning}>⚠️ Product limit reached</Text>
              )}
            </View>
          </View>
        )} */}
      </View>

      {/* Shop Management Card */}
      {profile?.customer?.is_customer && (
        <TouchableOpacity
          style={styles.shopCard}
          onPress={handleSwitchToShop}
          disabled={loadingProfile}
        >
          <View style={styles.shopCardLeft}>
            <View style={[styles.shopCardIcon, { backgroundColor: profile?.shop ? '#D1FAE5' : '#FFF3E0' }]}>
              <MaterialIcons
                name="store"
                size={24}
                color={profile?.shop ? '#059669' : '#FF9800'}
              />
            </View>
            <View style={styles.shopCardTextContainer}>
              <Text style={styles.shopCardTitle}>Manage your shop(s)</Text>
              <Text style={styles.shopCardSubtitle}>
                {loadingShop ? 'Checking shop status...' : (
                  effectiveHasShop
                  ? 'Manage your shop(s)'
                  : 'Create your first shop to start selling'
                )}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      )}

      {/* My Orders Card */}
      <View style={styles.ordersCard}>
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>My Orders</Text>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => pushRoute('/customer/purchases')}>
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAll}>View all</Text>
              <MaterialIcons name="chevron-right" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

      <View style={styles.ordersRow}>
  {/* To Process */}
  <TouchableOpacity style={styles.orderItem} onPress={() => pushRoute('/customer/purchases?tab=Processing')}>
    <View style={styles.orderIconBox}>
      <MaterialIcons name="assignment" size={26} color="#111827" />
      {orderCounts.processing > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{orderCounts.processing}</Text></View>
      ) : null}
    </View>
    <Text style={styles.orderLabel}>To Process</Text>
  </TouchableOpacity>

  {/* Shipped */}
  <TouchableOpacity style={styles.orderItem} onPress={() => pushRoute('/customer/purchases?tab=Shipped')}>
    <View style={styles.orderIconBox}>
      <MaterialIcons name="local-shipping" size={26} color="#111827" />
      {orderCounts.shipped > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{orderCounts.shipped}</Text></View>
      ) : null}
    </View>
    <Text style={styles.orderLabel}>Shipped</Text>
  </TouchableOpacity>

  {/* Rate */}
  <TouchableOpacity style={styles.orderItem} onPress={() => pushRoute('/customer/purchases?tab=Rate')}>
    <View style={styles.orderIconBox}>
      <MaterialIcons name="rate-review" size={26} color="#111827" />
      {orderCounts.rate > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{orderCounts.rate}</Text></View>
      ) : null}
    </View>
    <Text style={styles.orderLabel}>Rate</Text>
  </TouchableOpacity>

  {/* Returns/Cancelled */}
  <TouchableOpacity style={styles.orderItem} onPress={() => pushRoute('/customer/purchases?tab=Returns')}>
    <View style={styles.orderIconBox}>
      <MaterialIcons name="undo" size={26} color="#111827" />
      {orderCounts.returns > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{orderCounts.returns}</Text></View>
      ) : null}
    </View>
    <Text style={styles.orderLabel}>Returns/Cancelled</Text>
  </TouchableOpacity>
</View>
      </View>

      {/* My Account Card */}
      <View style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountTitle}>My Account</Text>
        </View>

        <View style={styles.accountRow}>
          <TouchableOpacity style={styles.accountItem} onPress={() => pushRoute('/customer/account-profile')}>
            <View style={styles.accountIconBox}>
              <MaterialIcons name="person" size={20} color="#111" />
            </View>
            <Text style={styles.accountLabel}>Profile</Text>
          </TouchableOpacity>


          <TouchableOpacity style={styles.accountItem} onPress={() => pushRoute('/customer/components/shipping-address')}>
            <View style={styles.accountIconBox}>
              <MaterialIcons name="location-on" size={20} color="#111" />
            </View>
            <Text style={styles.accountLabel}>Addresses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => pushRoute('/pages/my-vouchers')}>
            <View style={styles.accountIconBox}>
              <MaterialIcons name="local-offer" size={20} color="#111" />
            </View>
            <Text style={styles.accountLabel}>Vouchers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => pushRoute('/customer/settings')}>
            <View style={styles.accountIconBox}>
              <MaterialIcons name="settings" size={20} color="#111" />
            </View>
            <Text style={styles.accountLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      {/* <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/purchases')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF5E6' }]}>
              <MaterialIcons name="shopping-bag" size={isSmallDevice ? 20 : 22} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>My Purchases</Text>
              <Text style={styles.menuSubtext}>View your order history</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/favorites')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FCE4EC' }]}>
              <MaterialIcons name="favorite" size={isSmallDevice ? 20 : 22} color="#E91E63" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Favorites</Text>
              <Text style={styles.menuSubtext}>Saved items & wishlist</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/addresses')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="location-on" size={isSmallDevice ? 20 : 22} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Addresses</Text>
              <Text style={styles.menuSubtext}>Shipping addresses</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/my-vouchers')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
              <MaterialIcons name="local-offer" size={isSmallDevice ? 20 : 22} color="#9C27B0" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>My Vouchers</Text>
              <Text style={styles.menuSubtext}>Claimed vouchers & discounts</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      </View> */}

      {/* Personal Information Section */}
      {/* <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/edit-profile')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcons name="person" size={isSmallDevice ? 20 : 22} color="#1976D2" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Edit Profile</Text>
              <Text style={styles.menuSubtext}>Update your personal information</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Number</Text>
          <Text style={styles.infoValue}>
            {profile?.user?.contact_number || 'Not provided'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <Text style={styles.infoValue}>
            {profile?.user?.date_of_birth ? formatDate(profile.user.date_of_birth) : 'Not provided'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>
            {profile?.user?.sex || 'Not provided'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {[profile?.user?.street, profile?.user?.barangay, profile?.user?.city, profile?.user?.province]
              .filter(Boolean)
              .join(', ') || 'Not provided'}
          </Text>
        </View>
      </View> */}



      {/* Settings Section */}
      {/* <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/notifications')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcons name="notifications" size={isSmallDevice ? 20 : 22} color="#1976D2" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuSubtext}>Manage notifications</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/help')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="help-outline" size={isSmallDevice ? 20 : 22} color="#388E3C" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Help & Support</Text>
              <Text style={styles.menuSubtext}>FAQs & contact support</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/about')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="info" size={isSmallDevice ? 20 : 22} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>About</Text>
              <Text style={styles.menuSubtext}>App version & info</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      </View> */}

      {/* App Version & Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
        {profile?.user?.created_at && (
          <Text style={styles.memberSinceText}>
            Member since {formatDate(profile.user.created_at)}
          </Text>
        )}
        {headers?.timestamp && (
          <Text style={styles.apiInfoText}>
            Data fetched: {new Date(headers.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </ScrollView>
    </CustomerLayout>
    </SafeAreaView>
  );
}

// Styles remain the same as your original file, but I'll keep them here for completeness
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    padding: 20,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: '#E8F9FF', // light blue header
    alignItems: 'flex-start',
    paddingVertical: isSmallDevice ? 12 : 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarSmall: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: isSmallDevice ? 22 : 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTextSmall: {
    fontSize: isSmallDevice ? 16 : 18,
    color: '#fff',
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  userNameCompact: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
    color: '#212529',
    marginRight: 8,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginLeft: 6,
  },
  editButton: {
    padding: 8,
  },
  shopBadge: {
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  shopBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  avatar: {
    width: isSmallDevice ? 80 : isLargeDevice ? 100 : 90,
    height: isSmallDevice ? 80 : isLargeDevice ? 100 : 90,
    borderRadius: isSmallDevice ? 40 : isLargeDevice ? 50 : 45,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: isSmallDevice ? 32 : 36,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366F1',
    width: isSmallDevice ? 28 : 32,
    height: isSmallDevice ? 28 : 32,
    borderRadius: isSmallDevice ? 14 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  roleBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  userName: {
    fontSize: isSmallDevice ? 22 : isLargeDevice ? 28 : 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'System',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    marginBottom: isSmallDevice ? 12 : 16,
    fontFamily: 'System',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: isSmallDevice ? 12 : 16,
    width: '100%',
    maxWidth: 400,
    marginBottom: isSmallDevice ? 16 : 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: isSmallDevice ? 14 : isLargeDevice ? 16 : 15,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginTop: 4,
    fontFamily: 'System',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderRadius: 12,
    marginBottom: isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shopCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shopCardIcon: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: isSmallDevice ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  shopCardTextContainer: {
    flex: 1,
  },
  shopCardTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 2,
  },
  shopCardSubtitle: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    fontFamily: 'System',
    marginBottom: 4,
  },
  shopStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shopStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: '#10B981',
  },
  inactiveBadge: {
    backgroundColor: '#6B7280',
  },
  verifiedBadge: {
    backgroundColor: '#6366F1',
  },
  shopStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productLimitCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  productLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  productLimitTitle: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '600',
    color: '#111827',
  },
  productLimitProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  productLimitText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6B7280',
  },
  maxLimitWarning: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: isSmallDevice ? 16 : 20,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    borderRadius: 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: '#212529',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 12 : 16,
    fontFamily: 'System',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: isSmallDevice ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '500',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6C757D',
    fontFamily: 'System',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  infoLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    flex: 1,
  },
  infoValue: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  shopImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  shopStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginTop: 8,
  },
  shopStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  shopStatNumber: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#111827',
  },
  shopStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  shopStatDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    marginTop: isSmallDevice ? 20 : 24,
    marginBottom: isSmallDevice ? 12 : 16,
    padding: isSmallDevice ? 14 : 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: 'System',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 24 : 32,
  },
  versionText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#ADB5BD',
    fontFamily: 'System',
  },
  memberSinceText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#9CA3AF',
    fontFamily: 'System',
    marginTop: 4,
  },
  apiInfoText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#D1D5DB',
    fontFamily: 'System',
    marginTop: 2,
  },

  /* My Orders styles */
  ordersCard: {
    backgroundColor: '#FFFFFF',
    marginTop: isSmallDevice ? 12 : 16,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ordersTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
  },
  viewAllBtn: { padding: 4 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center' },
  viewAll: { fontSize: 13, color: '#9CA3AF', marginRight: 6 },
  ordersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderItem: {
    alignItems: 'center',
    flex: 1,
  },
  orderIconBox: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  orderLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  dot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  /* My Account styles */
  accountCard: {
    backgroundColor: '#FFFFFF',
    marginTop: isSmallDevice ? 12 : 16,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountItem: {
    alignItems: 'center',
    flex: 1,
  },
  accountIconBox: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  accountLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
});