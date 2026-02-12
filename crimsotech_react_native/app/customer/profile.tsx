import { useAuth } from "../../contexts/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import CustomerLayout from "./CustomerLayout";
import React, { useEffect, useState } from "react";
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
  SafeAreaView,
} from "react-native";
import AxiosInstance from "../../contexts/axios";
import { getUserShops } from "../../utils/api";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
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
    clearAuthData,
  } = useAuth();

  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(
    null,
  );
  const [headers, setHeaders] = useState<ProfileResponse["headers"] | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderCounts, setOrderCounts] = useState({
    processing: 0,
    shipped: 0,
    rate: 0,
    returns: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Shop fallback states
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

  // Helper to avoid strict typed route errors
  const pushRoute = (path: string) => router.push(path as any);

  // Fetch profile data from API
  const fetchProfile = async () => {
    if (!userId) {
      console.log("No user ID available");
      setLoadingProfile(false);
      return;
    }

    try {
      setLoadingProfile(true);
      const response = await AxiosInstance.get("/profile/", {
        headers: {
          "X-User-Id": userId,
          "Content-Type": "application/json",
        },
      });

      console.log("Profile API Response:", response.data);

      if (response.data.success) {
        setProfile(response.data.profile);
        setHeaders(response.data.headers || null);
      } else {
        Alert.alert("Error", response.data.error || "Failed to load profile");
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      console.error("Response data:", error.response?.data);

      let errorMessage = "Failed to load profile data.";
      const status = error.response?.status;
      const serverData = error.response?.data;

      if (status === 404) {
        errorMessage = "User profile not found.";
      } else if (status === 400) {
        errorMessage = "Invalid request. Please login again.";
      } else if (status === 500) {
        // Try a known alternative endpoint as a fallback
        try {
          console.log("Attempting fallback endpoint /profile/get");
          const fallback = await AxiosInstance.get("/profile/get", {
            headers: {
              "X-User-Id": userId,
              "Content-Type": "application/json",
            },
          });

          console.log("Fallback response:", fallback.data);
          if (fallback.data?.success) {
            setProfile(fallback.data.profile);
            setHeaders(fallback.data.headers || null);
            setHasShop(fallback.data.profile?.shop ? true : false);
            return; // Success — skip showing an error alert
          }

          errorMessage =
            fallback.data?.error ||
            serverData?.error ||
            "Server error. Please try again.";
        } catch (fallbackError: any) {
          console.error("Fallback profile fetch failed:", fallbackError);
          if (!fallbackError.response) {
            errorMessage = "Network error. Please check your connection.";
          } else {
            errorMessage =
              fallbackError.response?.data?.error ||
              `Server error (${fallbackError.response.status})`;
          }
        }
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      } else if (serverData?.error) {
        // Use server-provided message when available
        errorMessage = serverData.error;
      }

      // Try fallback shop check if profile could not be fetched and we haven't checked shops yet
      if (userId && hasShop === null) {
        checkUserShops();
      }

      Alert.alert("Error", errorMessage, [
        { text: "Retry", onPress: () => fetchProfile() },
        { text: "Close", style: "cancel" },
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
      const response = await AxiosInstance.get(
        "/purchases-buyer/status-counts/",
        {
          headers: { "X-User-Id": userId },
        },
      );

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
      console.error("Error fetching order counts:", err);
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
      console.log("getUserShops response:", response);
      if (
        response &&
        response.success &&
        Array.isArray(response.shops) &&
        response.shops.length > 0
      ) {
        setHasShop(true);
        const rawShop = response.shops[0];

        // Normalize shop fields to match profile.shop shape created by ProfileView
        const normalizedShop = {
          ...rawShop,
          is_active:
            (rawShop.status === "Active" || rawShop.status === "active") &&
            !rawShop.is_suspended,
          verified: Boolean(rawShop.verified),
          follower_count: Number(rawShop.follower_count || 0),
          total_sales:
            typeof rawShop.total_sales === "number"
              ? rawShop.total_sales.toFixed(2)
              : String(rawShop.total_sales ?? "0.00"),
          created_at: rawShop.created_at || null,
        } as any;

        setProfile((prev) =>
          prev
            ? { ...prev, shop: normalizedShop }
            : {
                user: null as any,
                customer: {
                  customer: null as any,
                  product_limit: 0,
                  current_product_count: 0,
                  is_customer: true,
                  can_add_product: false,
                  products_remaining: 0,
                },
                shop: normalizedShop,
              },
        );
      } else {
        setHasShop(false);
      }
    } catch (err: any) {
      console.error("Error checking user shops:", err);
      setHasShop(false);
      // Notify user when network error occurs so they can take action
      const msg = err?.message || "Failed to check shop status";
      if (msg.includes("Cannot connect to server") || msg.includes("Network")) {
        Alert.alert("Network Error", msg, [
          { text: "Retry", onPress: () => checkUserShops() },
          { text: "OK", style: "cancel" },
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
      pushRoute("/customer/shops");
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "₱0.00";
    return `₱${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name?: string, email?: string, username?: string) => {
    if (name && name.trim()) {
      const names = name.trim().split(" ");
      if (names.length > 1) {
        return (
          names[0].charAt(0) + names[names.length - 1].charAt(0)
        ).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return "U";
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
    return "User";
  };

  const getUserEmail = () => {
    if (profile?.user?.email) {
      return profile.user.email;
    }
    if (email) {
      return email;
    }
    return "user@example.com";
  };

  // Derived shop presence used across the component (falls back to hasShop if profile lacks shop)
  const effectiveHasShop: boolean = !!(profile?.shop || hasShop);

  // Loading state
  if (authLoading || (loadingProfile && !refreshing)) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <View style={styles.notLoggedInIconContainer}>
            <MaterialIcons name="person-off" size={64} color="#DC2626" />
          </View>
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please login to view your profile
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
        >
          {/* Modern Profile Header */}
          <View style={styles.gradientHeaderContainer}>
            <View style={styles.gradientHeader}>
              <View style={styles.headerContent}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarWrapper}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(
                          profile?.user?.full_name,
                          profile?.user?.email,
                          profile?.user?.username,
                        )}
                      </Text>
                    </View>
                    <View style={styles.avatarGlow} />
                  </View>
                </View>

                <View style={styles.headerTextContainer}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{getUserDisplayName()}</Text>
                    {profile?.shop && (
                      <View style={styles.verifiedBadge}>
                        <MaterialIcons name="store" size={16} color="#F97316" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{getUserEmail()}</Text>

                  <View style={styles.shopBadgeContainer}>
                    <View
                      style={[
                        styles.modernShopBadge,
                        { backgroundColor: "#F97316" },
                      ]}
                    >
                      <MaterialIcons name="store" size={14} color="#fff" />
                      <Text style={styles.modernShopBadgeText}>
                        {profile?.shop ? "Shop Owner" : "No Shop Yet"}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => pushRoute("/customer/account-profile")}
                >
                  <MaterialIcons name="edit" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Shop Management Card - Modern Design */}
          {profile?.customer?.is_customer && (
            <TouchableOpacity
              style={styles.modernShopCard}
              onPress={handleSwitchToShop}
              disabled={loadingProfile}
              activeOpacity={0.7}
            >
              <View style={styles.shopCardGradient}>
                <View style={styles.shopCardContent}>
                  <View style={styles.shopIconCircle}>
                    <MaterialIcons name="store" size={28} color="#374151" />
                  </View>
                  <View style={styles.shopCardText}>
                    <Text style={styles.shopCardTitle}>
                      {loadingShop
                        ? "Checking..."
                        : effectiveHasShop
                          ? "Manage Your Shop"
                          : "You Don't Have a Shop"}
                    </Text>
                    <Text style={styles.shopCardSubtitle}>
                      {effectiveHasShop
                        ? "View and manage your products"
                        : "Create your shop to start selling"}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="arrow-forward"
                    size={24}
                    color="#374151"
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* My Orders - Modern Card Design */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrapper}>
                  <MaterialIcons
                    name="shopping-bag"
                    size={20}
                    color="#F97316"
                  />
                </View>
                <Text style={styles.cardTitle}>My Orders</Text>
              </View>
              <TouchableOpacity
                onPress={() => pushRoute("/customer/purchases")}
              >
                <View style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color="#374151"
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.ordersGrid}>
              {/* To Process */}
              <TouchableOpacity
                style={styles.modernOrderItem}
                onPress={() => pushRoute("/customer/purchases?tab=Processing")}
                activeOpacity={0.7}
              >
                <View style={styles.orderIconContainer}>
                  <View
                    style={[styles.orderIconBg, { backgroundColor: "#F5F5F4" }]}
                  >
                    <MaterialIcons
                      name="assignment"
                      size={24}
                      color="#374151"
                    />
                  </View>
                  {orderCounts.processing > 0 && (
                    <View style={styles.modernBadge}>
                      <Text style={styles.modernBadgeText}>
                        {orderCounts.processing}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.orderItemLabel}>To Process</Text>
              </TouchableOpacity>

              {/* Shipped */}
              <TouchableOpacity
                style={styles.modernOrderItem}
                onPress={() => pushRoute("/customer/purchases?tab=Shipped")}
                activeOpacity={0.7}
              >
                <View style={styles.orderIconContainer}>
                  <View
                    style={[styles.orderIconBg, { backgroundColor: "#F5F5F4" }]}
                  >
                    <MaterialIcons
                      name="local-shipping"
                      size={24}
                      color="#374151"
                    />
                  </View>
                  {orderCounts.shipped > 0 && (
                    <View style={styles.modernBadge}>
                      <Text style={styles.modernBadgeText}>
                        {orderCounts.shipped}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.orderItemLabel}>Shipped</Text>
              </TouchableOpacity>

              {/* Rate */}
              <TouchableOpacity
                style={styles.modernOrderItem}
                onPress={() => pushRoute("/customer/purchases?tab=Rate")}
                activeOpacity={0.7}
              >
                <View style={styles.orderIconContainer}>
                  <View
                    style={[styles.orderIconBg, { backgroundColor: "#F5F5F4" }]}
                  >
                    <MaterialIcons name="star" size={24} color="#374151" />
                  </View>
                  {orderCounts.rate > 0 && (
                    <View style={styles.modernBadge}>
                      <Text style={styles.modernBadgeText}>
                        {orderCounts.rate}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.orderItemLabel}>To Rate</Text>
              </TouchableOpacity>

              {/* Returns */}
              <TouchableOpacity
                style={styles.modernOrderItem}
                onPress={() => pushRoute("/customer/purchases?tab=Returns")}
                activeOpacity={0.7}
              >
                <View style={styles.orderIconContainer}>
                  <View
                    style={[styles.orderIconBg, { backgroundColor: "#F5F5F4" }]}
                  >
                    <MaterialIcons name="undo" size={24} color="#374151" />
                  </View>
                  {orderCounts.returns > 0 && (
                    <View style={styles.modernBadge}>
                      <Text style={styles.modernBadgeText}>
                        {orderCounts.returns}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.orderItemLabel}>Returns</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* My Account - Modern Grid */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrapper}>
                  <MaterialIcons
                    name="account-circle"
                    size={20}
                    color="#F97316"
                  />
                </View>
                <Text style={styles.cardTitle}>My Account</Text>
              </View>
            </View>

            <View style={styles.accountGrid}>
              <TouchableOpacity
                style={styles.accountGridItem}
                onPress={() => pushRoute("/customer/account-profile")}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.accountIconBg, { backgroundColor: "#F5F5F4" }]}
                >
                  <MaterialIcons name="person" size={22} color="#374151" />
                </View>
                <Text style={styles.accountGridLabel}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accountGridItem}
                onPress={() =>
                  pushRoute("/customer/components/shipping-address")
                }
                activeOpacity={0.7}
              >
                <View
                  style={[styles.accountIconBg, { backgroundColor: "#F5F5F4" }]}
                >
                  <MaterialIcons name="location-on" size={22} color="#374151" />
                </View>
                <Text style={styles.accountGridLabel}>Addresses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accountGridItem}
                onPress={() => pushRoute("/customer/my-vouchers")}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.accountIconBg, { backgroundColor: "#F5F5F4" }]}
                >
                  <MaterialIcons name="local-offer" size={22} color="#374151" />
                </View>
                <Text style={styles.accountGridLabel}>Vouchers</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    padding: 24,
  },
  notLoggedInIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  notLoggedInTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modern Gradient Header
  gradientHeaderContainer: {
    marginBottom: 20,
  },
  gradientHeader: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E5E7EB",
  },
  avatarGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    top: 0,
    left: 0,
  },
  avatarText: {
    fontSize: 28,
    color: "#374151",
    fontWeight: "700",
  },
  headerTextContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#374151",
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: "#F5F5F4",
    borderRadius: 12,
    padding: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  shopBadgeContainer: {
    flexDirection: "row",
  },
  modernShopBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modernShopBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modern Shop Card
  modernShopCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  shopCardGradient: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  shopCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  shopIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shopCardText: {
    flex: 1,
  },
  shopCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  shopCardSubtitle: {
    fontSize: 14,
    color: "#374151",
  },

  // Modern Card Design
  modernCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginRight: 4,
  },

  // Orders Grid
  ordersGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modernOrderItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  orderIconContainer: {
    position: "relative",
    marginBottom: 12,
  },
  orderIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modernBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#F97316",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modernBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  orderItemLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },

  // Account Grid
  accountGrid: {
    flexDirection: "row",
  },
  accountGridItem: {
    width: "33%",
    alignItems: "center",
  },
  accountIconBg: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  accountGridLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    textAlign: "center",
  },
});
