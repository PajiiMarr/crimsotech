import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";
import { MaterialIcons } from "@expo/vector-icons";

// Types
interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture_url?: string | null; // ✅ public CDN URL (use this first)
  shop_picture?: string | null;     // ✅ S3 URL (fallback)
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  created_at: string;
  is_suspended: boolean;
  follower_count: number;
  location?: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

interface ShopsResponse {
  success: boolean;
  shops: Shop[];
  message: string;
  data_source: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────
const isPending = (shop: Shop) =>
  shop.status === "Pending" || (!shop.verified && shop.status !== "Active");

// ✅ Returns the best available image URI for a shop
const getShopImageUri = (shop: Shop): string | null =>
  shop.shop_picture_url || shop.shop_picture || null;

export default function ShopsPage() {
  const { userId, loading: authLoading, userRole } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // Fetch user's shops
  const fetchShops = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await AxiosInstance.get<ShopsResponse>(
        "/customer-shops/",
        { params: { customer_id: userId } }
      );
      if (response.data.success) {
        setShops(response.data.shops || []);
      } else {
        setShops([]);
      }
    } catch (error: any) {
      console.error("Error fetching shops:", error);
      let errorMessage = "Failed to load shops";
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Customer ID is required";
      } else if (error.response?.status === 404) {
        errorMessage = "No shops found";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      }
      Alert.alert("Error", errorMessage);
      setShops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchShops();
    }
  }, [authLoading, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
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

  const getLocationString = (shop: Shop) => {
    return [shop.street, shop.barangay, shop.city, shop.province]
      .filter(Boolean)
      .join(", ");
  };

  // ── Shop Card ───────────────────────────────────────────────────────────────
  const ShopCard = ({ shop }: { shop: Shop }) => {
    const location = getLocationString(shop);
    const pending = isPending(shop);
    const imageUri = getShopImageUri(shop); // ✅ resolve best image URL

    const handleManageShop = () => {
      if (pending) {
        Alert.alert(
          "Shop Pending Approval",
          "Your shop is currently under review by our team. You'll be notified once it's approved.",
          [{ text: "OK" }]
        );
        return;
      }
      router.push(`/seller/dashboard?shopId=${shop.id}`);
    };

    return (
      <TouchableOpacity
        style={styles.shopCard}
        activeOpacity={0.9}
        onPress={() => setSelectedShop(shop)}
      >
        <View style={styles.shopCardHeader}>
          {/* ✅ Fixed: use resolved imageUri */}
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.shopImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.shopImage, styles.shopImagePlaceholder]}>
              <MaterialIcons name="store" size={32} color="#6B7280" />
            </View>
          )}
          <View style={styles.shopInfo}>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop.name}
              </Text>
              {shop.verified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={12} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {pending && (
                <View style={styles.pendingBadge}>
                  <MaterialIcons name="hourglass-empty" size={12} color="#fff" />
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.shopStatus}>
              Status:{" "}
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      shop.status === "Active"
                        ? "#059669"
                        : pending
                        ? "#D97706"
                        : "#DC2626",
                  },
                ]}
              >
                {shop.status} {shop.is_suspended && "(Suspended)"}
              </Text>
            </Text>
            <Text style={styles.shopContact}>
              <MaterialIcons name="phone" size={12} color="#6B7280" />{" "}
              {shop.contact_number}
            </Text>
          </View>
        </View>

        {/* Pending notice banner */}
        {pending && (
          <View style={styles.pendingBanner}>
            <MaterialIcons name="info-outline" size={16} color="#92400E" />
            <Text style={styles.pendingBannerText}>
              Your shop is under review. Management will be available once approved.
            </Text>
          </View>
        )}

        <Text style={styles.shopDescription} numberOfLines={2}>
          {shop.description}
        </Text>

        {location && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color="#6B7280" />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}

        <View style={styles.shopStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {formatCurrency(shop.total_sales)}
            </Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{shop.follower_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatDate(shop.created_at)}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.manageButton, pending && styles.manageButtonDisabled]}
          activeOpacity={pending ? 1 : 0.9}
          onPress={handleManageShop}
        >
          {pending ? (
            <>
              <MaterialIcons name="hourglass-empty" size={16} color="#9CA3AF" />
              <Text style={styles.manageButtonTextDisabled}>
                Awaiting Approval
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.manageButtonText}>Manage Shop</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#111827" />
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.loadingText}>Loading shops...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="store" size={64} color="#9CA3AF" />
            <Text style={styles.message}>Please log in to view your shops</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Not customer role
  if (userRole && userRole !== "customer") {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="warning" size={64} color="#F59E0B" />
            <Text style={styles.message}>Not authorized to view shops</Text>
            <Text style={styles.subMessage}>
              This page is for customers only
            </Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#111827"]}
            tintColor="#111827"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/customer/profile")}
            >
              <MaterialIcons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>My Shops</Text>
              <Text style={styles.subtitle}>
                {shops.length} {shops.length === 1 ? "shop" : "shops"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/customer/create/create-shop")}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Shop Details */}
        {selectedLoading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator size="small" color="#111827" />
          </View>
        ) : selectedShop ? (
          <View style={styles.selectedShopCard}>
            <Text style={styles.selectedShopTitle}>Selected Shop</Text>
            <View style={styles.selectedShopContent}>
              {/* ✅ Fixed: use resolved imageUri for selected shop too */}
              {getShopImageUri(selectedShop) ? (
                <Image
                  source={{ uri: getShopImageUri(selectedShop)! }}
                  style={styles.selectedShopImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.selectedShopImage, styles.shopImagePlaceholder]}
                >
                  <MaterialIcons name="store" size={28} color="#6B7280" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.shopName}>{selectedShop.name}</Text>
                <Text style={styles.shopDescription} numberOfLines={2}>
                  {selectedShop.description}
                </Text>
                {!isPending(selectedShop) && (
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() =>
                      router.push(`/customer/shops?shopId=${selectedShop.id}`)
                    }
                  >
                    <Text style={styles.viewDetailsText}>View in list</Text>
                  </TouchableOpacity>
                )}
                {isPending(selectedShop) && (
                  <Text style={styles.pendingNote}>
                    Awaiting admin approval
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* No shops state */}
        {shops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="storefront" size={80} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Shops Yet</Text>
            <Text style={styles.emptyText}>
              Create your first shop to start selling products
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/customer/create/create-shop")}
            >
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Your First Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.shopsList}>
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollView: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { padding: 8, borderRadius: 8, marginRight: 4 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  message: { fontSize: 18, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 8 },
  subMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  loginButton: { backgroundColor: "#111827", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#374151", marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  shopsList: { padding: 20 },
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  shopCardHeader: { flexDirection: "row", marginBottom: 12 },
  shopImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#F3F4F6" },
  shopImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  shopInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  shopNameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  shopName: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginLeft: 8,
  },
  verifiedText: { fontSize: 10, fontWeight: "600", color: "#FFFFFF" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginLeft: 8,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "600", color: "#FFFFFF" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  pendingBannerText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 16 },
  shopStatus: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statusText: { fontWeight: "600" },
  shopContact: { fontSize: 12, color: "#6B7280" },
  shopDescription: { fontSize: 13, color: "#4B5563", lineHeight: 18, marginBottom: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  locationText: { fontSize: 12, color: "#6B7280", marginLeft: 6, flex: 1 },
  shopStats: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 12, fontWeight: "700", color: "#111827", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#6B7280" },
  statDivider: { width: 1, backgroundColor: "#E5E7EB" },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  manageButtonDisabled: { backgroundColor: "#F9FAFB" },
  manageButtonText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  manageButtonTextDisabled: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  selectedShopCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: isSmallDevice ? 12 : 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedShopTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  selectedShopContent: { flexDirection: "row", alignItems: "center" },
  selectedShopImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#F3F4F6" },
  viewDetailsButton: { marginTop: 8, paddingVertical: 6 },
  viewDetailsText: { color: "#111827", fontWeight: "600" },
  pendingNote: { marginTop: 6, fontSize: 12, color: "#D97706", fontWeight: "500" },
  helpSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  helpContent: { flex: 1, marginLeft: 12, marginRight: 12 },
  helpTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 },
  helpText: { fontSize: 12, color: "#6B7280", lineHeight: 16 },
  helpButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  helpButtonText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
});