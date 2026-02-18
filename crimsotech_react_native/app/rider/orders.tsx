import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

// --- Theme Colors (Minimalist Softened) ---
const COLORS = {
  primary: "#1F2937", // Charcoal
  secondary: "#111827",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  danger: "#EF4444", // Red
  success: "#10B981", // Green
  warning: "#F59E0B", // Orange
  info: "#3B82F6", // Blue
  border: "#E5E7EB",
  lightGray: "#F9FAFB",
};

// --- Dummy Data (Electronics Context) ---
const EXAMPLE_ORDERS = [
  {
    id: "DEV-8821",
    store: "Power Mac Center",
    price: "₱84,990.00",
    status: "pending",
    items: "1x iPhone 15 Pro Max (256GB) - Natural Titanium",
    itemName: "iPhone 15 Pro Max (256GB) - Natural Titanium",
    category: "Electronics",
    size: "Small",
    weight: "0.5 kg",
    deliveryFee: "₱150.00",
    specialHandling: "Fragile, Handle with care",
  },
  {
    id: "DEV-8822",
    store: "Samsung Experience Store",
    price: "₱12,990.00",
    status: "accepted",
    items: "1x Galaxy Watch 6, 1x Strap",
    itemName: "Galaxy Watch 6 with Strap",
    category: "Electronics",
    size: "Small",
    weight: "0.3 kg",
    deliveryFee: "₱100.00",
    specialHandling: "Fragile",
  },
  {
    id: "DEV-8823",
    store: "Datablitz",
    price: "₱28,500.00",
    status: "picked_up",
    items: "1x PlayStation 5 Slim Console",
    itemName: "PlayStation 5 Slim Console",
    category: "Electronics",
    size: "Medium",
    weight: "3.2 kg",
    deliveryFee: "₱200.00",
    specialHandling: "Handle with care",
  },
  {
    id: "DEV-8824",
    store: "Beyond the Box",
    price: "₱69,990.00",
    status: "on_the_way",
    items: "1x MacBook Air M2 (Midnight)",
    itemName: "MacBook Air M2 (Midnight)",
    category: "Electronics",
    size: "Medium",
    weight: "1.2 kg",
    deliveryFee: "₱180.00",
    specialHandling: "Fragile, Handle with care",
  },
  {
    id: "DEV-8825",
    store: "Octagon",
    price: "₱4,500.00",
    status: "delivered",
    items: "1x Logitech MX Master 3S Mouse",
    itemName: "Logitech MX Master 3S Mouse",
    category: "Electronics",
    size: "Small",
    weight: "0.2 kg",
    deliveryFee: "₱80.00",
    specialHandling: "None",
  },
  {
    id: "DEV-8826",
    store: "Dyson Demo Store",
    price: "₱32,900.00",
    status: "cancelled",
    items: "1x Dyson Airwrap Multi-styler",
    itemName: "Dyson Airwrap Multi-styler",
    category: "Electronics",
    size: "Medium",
    weight: "1.5 kg",
    deliveryFee: "₱150.00",
    specialHandling: "Fragile",
  },
  {
    id: "DEV-8827",
    store: "Xiaomi Store",
    price: "₱899.00",
    status: "pending",
    items: "2x Mi Smart Bulb, 1x Motion Sensor",
    itemName: "Mi Smart Bulbs and Motion Sensor",
    category: "Electronics",
    size: "Small",
    weight: "0.4 kg",
    deliveryFee: "₱90.00",
    specialHandling: "Fragile",
  },
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const statuses = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "picked_up", label: "Picked Up" },
    { id: "in_progress", label: "In Progress" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Fetch orders data from API
  const fetchOrdersData = async () => {
    try {
      setError(null);
      const [metricsRes, ordersRes] = await Promise.all([
        AxiosInstance.get('/rider-orders-active/get_metrics/', {
          headers: { 'X-User-Id': user?.id || user?.user_id }
        }),
        AxiosInstance.get(`/rider-orders-active/get_deliveries/?page=1&page_size=50&status=${activeStatus === 'all' ? 'all' : activeStatus}`, {
          headers: { 'X-User-Id': user?.id || user?.user_id }
        })
      ]);

      if (metricsRes.data?.success && metricsRes.data?.metrics) {
        setMetrics(metricsRes.data.metrics);
      }

      if (ordersRes.data?.success && ordersRes.data?.deliveries) {
        // Format API response to match UI structure
        const formattedOrders = ordersRes.data.deliveries.map((delivery: any) => ({
          id: delivery.id,
          order_id: delivery.order?.order_id,
          store: delivery.order?.user?.first_name || 'Unknown Shop',
          price: `₱${parseFloat(delivery.order?.total_amount || 0).toLocaleString()}`,
          status: delivery.status,
          items: `Delivery to ${delivery.order?.shipping_address?.city || 'Location'}`,
          itemName: delivery.order?.shipping_address?.recipient_name || 'Customer',
          category: 'Delivery',
          deliveryFee: `₱${delivery.delivery_fee || 150}`,
          customer: delivery.order?.customer,
          shipping_address: delivery.order?.shipping_address,
          picked_at: delivery.picked_at,
          delivered_at: delivery.delivered_at,
          created_at: delivery.created_at,
          raw: delivery
        }));
        setOrders(formattedOrders);
      }
    } catch (err: any) {
      console.log('Orders fetch error:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id || user?.user_id) {
      fetchOrdersData();
    }
  }, [user, activeStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrdersData();
  };

  // Filter logic
  const filteredOrders = orders;

  // Count pending orders for badge
  const pendingCount = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const handleOrderPress = (order: any) => {
    router.push({
      pathname: "/rider/delivery-status",
      params: { order: encodeURIComponent(JSON.stringify(order)) },
    });
  };

  // Helper for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return COLORS.success;
      case "cancelled":
        return COLORS.danger;
      case "on_the_way":
        return COLORS.info;
      case "pending":
        return COLORS.warning;
      case "picked_up":
        return COLORS.info;
      default:
        return COLORS.muted;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.messageText}>Loading orders...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />

      {/* --- Header --- */}
      <View style={styles.header}>
        <Text style={styles.title}>Active Orders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/rider/notification")}
          >
            <Feather name="bell" size={20} color={COLORS.secondary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/rider/settings")}
          >
            <Feather name="settings" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* --- Top Nav Card --- */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push("/rider/incoming-deliveries")}
          >
            <View style={styles.navIconWrap}>
              <MaterialIcons
                name="local-shipping"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.navTextWrap}>
              <View style={styles.navTitleContainer}>
                <Text style={styles.navTitle}>Incoming Deliveries</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pendingCount}</Text>
                </View>
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={COLORS.muted}
            />
          </TouchableOpacity>
        </View>

        {/* --- My Deliveries Title --- */}
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitleText}>My Deliveries</Text>
        </View>

        {/* --- Filter Tabs (Horizontal Scroll) --- */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {statuses.map((status) => (
              <TouchableOpacity
                key={status.id}
                style={[
                  styles.filterTab,
                  activeStatus === status.id && styles.filterTabActive,
                ]}
                onPress={() => setActiveStatus(status.id)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeStatus === status.id && styles.filterTextActive,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- Orders List --- */}
        <View style={styles.listSection}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
              >
                {/* Card Top: ID and Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.idContainer}>
                    <Feather name="package" size={14} color={COLORS.muted} />
                    <Text style={styles.orderId}>{item.id}</Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: "#F3F4F6" }]}
                  >
                    <Text style={[styles.statusText, { color: COLORS.muted }]}>
                      {item.status.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Card Middle: Store and Item */}
                <View style={styles.cardBody}>
                  <Text style={styles.storeName}>{item.store}</Text>
                  <Text style={styles.orderItems} numberOfLines={2}>
                    {item.items}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Card Bottom: Price and Date */}
                <View style={styles.cardFooter}>
                  <Text style={styles.orderPrice}>{item.price}</Text>
                  <Text style={styles.dateText}>Today, 2:30 PM</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="shopping-bag" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No electronics found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 12,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconButton: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#EF4444",
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  // Section Generic
  section: {
    paddingHorizontal: 14,
    marginTop: 10,
  },

  // Nav Card
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 9,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  navIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  navTextWrap: {
    flex: 1,
  },
  navTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  navSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },

  // Section Title
  sectionTitleWrapper: {
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  // Filter Tabs
  filterWrapper: {
    marginTop: 8,
  },
  filterContainer: {
    paddingHorizontal: 14,
    gap: 5,
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 100,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },

  // List Section
  listSection: {
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 12,
  },
  orderCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderId: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardBody: {
    marginBottom: 8,
  },
  storeName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  orderItems: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 13,
  },
});
