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
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";
import { MaterialIcons } from "@expo/vector-icons";

interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
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

interface ShopsResponse {
  success: boolean;
  shops: Shop[];
  message: string;
  data_source: string;
}

export default function ShopsPage() {
  const { userId, loading: authLoading, userRole } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShops = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await AxiosInstance.get<ShopsResponse>(
        "/customer-shops/",
        { params: { customer_id: userId, view: "followed" } }
      );
      setShops(response.data.success ? response.data.shops || [] : []);
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userId) fetchShops();
  }, [authLoading, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const getLocation = (shop: Shop) =>
    [shop.city, shop.province].filter(Boolean).join(", ");

  const ShopCard = ({ shop }: { shop: Shop }) => {
    const location = getLocation(shop);
    const isActive = shop.status === "Active" && !shop.is_suspended;

    return (
      <TouchableOpacity
        style={styles.shopCard}
        activeOpacity={0.82}
        onPress={() => router.push(`/customer/view-shop?shopId=${shop.id}`)}
      >
        <View style={styles.cardRow}>
          {shop.shop_picture ? (
            <Image
              source={{ uri: shop.shop_picture }}
              style={styles.shopImage}
            />
          ) : (
            <View style={[styles.shopImage, styles.shopImageFallback]}>
              <MaterialIcons name="store" size={20} color="#9CA3AF" />
            </View>
          )}

          <View style={styles.shopInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop.name}
              </Text>
              {shop.verified && (
                <MaterialIcons
                  name="verified"
                  size={13}
                  color="#059669"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>

            {!!shop.description && (
              <Text style={styles.shopDesc} numberOfLines={1}>
                {shop.description}
              </Text>
            )}

            <View style={styles.metaRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? "#059669" : "#DC2626" },
                ]}
              />
              <Text style={styles.metaText}>
                {shop.status}
                {shop.is_suspended ? " · Suspended" : ""}
              </Text>
              {!!location && (
                <>
                  <Text style={styles.sep}>·</Text>
                  <MaterialIcons
                    name="location-on"
                    size={10}
                    color="#9CA3AF"
                  />
                  <Text style={styles.metaText}>{location}</Text>
                </>
              )}
            </View>

            <View style={styles.followRow}>
              <MaterialIcons name="people-outline" size={11} color="#6B7280" />
              <Text style={styles.followText}>
                {shop.follower_count} followers
              </Text>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={18} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.loadingText}>Loading followed shops...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="store" size={48} color="#9CA3AF" />
            <Text style={styles.stateMsg}>
              Please log in to view followed shops
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.actionBtnText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== "customer") {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="warning" size={48} color="#F59E0B" />
            <Text style={styles.stateMsg}>This page is for customers only</Text>
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
        {/* Compact header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Followed Shops</Text>
            <Text style={styles.headerSub}>
              {shops.length} {shops.length === 1 ? "shop" : "shops"}
            </Text>
          </View>
        </View>

        {/* Empty state */}
        {shops.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="storefront" size={52} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No Followed Shops Yet</Text>
            <Text style={styles.emptyMsg}>
              Follow shops from product pages to see them here.
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/customer/home")}
            >
              <Text style={styles.actionBtnText}>Explore Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
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
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  scrollView: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 10, fontSize: 13, color: "#6B7280" },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 6 : 10,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 6, marginRight: 8, borderRadius: 7 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  /* State messages */
  stateMsg: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    textAlign: "center",
  },
  actionBtn: {
    marginTop: 14,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },

  /* Empty state */
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  emptyMsg: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 19,
  },

  /* List */
  list: { padding: 10 },

  /* Card */
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  shopImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  shopImageFallback: { justifyContent: "center", alignItems: "center" },
  shopInfo: { flex: 1, marginLeft: 10, marginRight: 4 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  shopName: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 1 },
  shopDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  metaText: { fontSize: 11, color: "#6B7280" },
  sep: { fontSize: 11, color: "#D1D5DB", marginHorizontal: 4 },
  followRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  followText: { fontSize: 11, color: "#6B7280" },
});
