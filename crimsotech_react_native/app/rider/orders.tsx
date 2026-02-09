import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import {
  getRiderOrderHistory,
  acceptDeliveryOrder,
} from "../../utils/riderApi";

// --- Theme Colors (Minimalist Softened) ---
const COLORS = {
  primary: "#1F2937", // Charcoal
  secondary: "#111827",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  border: "#F3F4F6",
};

export default function OrdersPage() {
  const { userRole, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "delivered">(
    "pending",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch deliveries from API
  const fetchDeliveries = async () => {
    if (!userId) return;

    try {
      setError(null);
      const data = await getRiderOrderHistory(userId, { status: "all" });
      setDeliveries(data.deliveries || []);
    } catch (err: any) {
      console.error("Error fetching deliveries:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [userId]);

  // Filter orders based on active tab
  const pendingOrders = deliveries.filter(
    (d) =>
      d.status === "pending" ||
      d.status === "pending_offer" ||
      d.status === "picked_up" ||
      d.status === "in_progress",
  );
  const deliveredOrders = deliveries.filter((d) => d.status === "delivered");

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (deliveryId: string, order: any) => {
    if (!userId) return;

    try {
      await acceptDeliveryOrder(userId, deliveryId);
      // After accepting, navigate to delivery details
      const deliveryData = {
        id: order.id,
        order_id: order.order_id,
        customer_name: order.customer_name || order.order?.user?.first_name,
        delivery_location:
          order.delivery_location || order.order?.delivery_address_text,
        distance_km: order.distance_km,
        estimated_minutes: order.estimated_minutes,
        delivery_fee: order.delivery_fee,
        status: "pending", // Status remains pending until pickup photo taken
        order: order.order,
      };

      router.push({
        pathname: "/rider/delivery-details",
        params: { delivery: encodeURIComponent(JSON.stringify(deliveryData)) },
      });
    } catch (err: any) {
      alert("Failed to accept order: " + err.message);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₱${(numAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDeliveries}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderOrderCard = (order: any, isToDeliver: boolean = false) => {
    const customerName = order.order?.user
      ? `${order.order.user.first_name} ${order.order.user.last_name}`.trim()
      : order.customer_name || "Customer";

    const address =
      order.order?.delivery_address_text ||
      order.delivery_location ||
      "Address not available";
    const amount = order.order?.total_amount || order.order_amount || 0;
    const orderId = order.order_id || order.id;
    const deliveryFee =
      typeof order.delivery_fee === "string"
        ? parseFloat(order.delivery_fee)
        : order.delivery_fee || 0;

    return (
      <TouchableOpacity key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <MaterialIcons name="receipt" size={14} color={COLORS.muted} />
            <Text style={styles.orderId}>Order #{orderId.substring(0, 8)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isToDeliver ? styles.deliverBadge : styles.pendingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isToDeliver
                  ? { color: COLORS.success }
                  : { color: COLORS.primary },
              ]}
            >
              {isToDeliver ? "Delivered" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={14} color={COLORS.muted} />
            <Text style={styles.detailText}>{customerName}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={14} color={COLORS.muted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={14} color={COLORS.muted} />
            <Text style={styles.detailText}>
              {order.scheduled_delivery_time
                ? `Deliver by: ${formatTime(order.scheduled_delivery_time)}`
                : "Time not set"}
            </Text>
          </View>

          {!isToDeliver && order.picked_at && (
            <View style={styles.detailRow}>
              <MaterialIcons name="inventory" size={14} color={COLORS.muted} />
              <Text style={styles.detailText}>
                Picked: {formatTime(order.picked_at)}
              </Text>
            </View>
          )}

          {isToDeliver && order.delivered_at && (
            <View style={styles.detailRow}>
              <MaterialIcons
                name="check-circle"
                size={14}
                color={COLORS.success}
              />
              <Text style={styles.detailText}>
                Done: {formatTime(order.delivered_at)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialIcons
              name="directions-bike"
              size={14}
              color={COLORS.muted}
            />
            <Text style={styles.detailText}>
              {order.distance_km ? `${order.distance_km} km away` : "N/A"}
            </Text>
          </View>

          {deliveryFee > 0 && (
            <View style={styles.detailRow}>
              <MaterialIcons name="payments" size={14} color={COLORS.success} />
              <Text
                style={[
                  styles.detailText,
                  { color: COLORS.success, fontWeight: "600" },
                ]}
              >
                Fee: {formatCurrency(deliveryFee)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderAmount}>{formatCurrency(amount)}</Text>
            <Text style={styles.orderItems}>{order.items_count || 1} item</Text>
          </View>

          {!isToDeliver && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (
                  order.status === "pending" ||
                  order.status === "pending_offer"
                ) {
                  handleAcceptOrder(order.id, order);
                } else {
                  const deliveryData = {
                    id: order.id,
                    order_id: order.order_id,
                    customer_name:
                      order.customer_name || order.order?.user?.first_name,
                    delivery_location:
                      order.delivery_location ||
                      order.order?.delivery_address_text,
                    distance_km: order.distance_km,
                    estimated_minutes: order.estimated_minutes,
                    delivery_fee: order.delivery_fee,
                    status: order.status,
                    order: order.order,
                  };
                  router.push({
                    pathname: "/rider/delivery-details",
                    params: {
                      delivery: encodeURIComponent(
                        JSON.stringify(deliveryData),
                      ),
                    },
                  });
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {order.status === "pending" || order.status === "pending_offer"
                  ? "Accept"
                  : "Details"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const currentOrders =
    activeTab === "pending" ? pendingOrders : deliveredOrders;
  const isEmpty = currentOrders.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />

      {/* --- Standardized Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/rider/notification")}
          >
            <Feather name="bell" size={22} color={COLORS.secondary} />
            <View style={styles.notificationBadge}>
              {/* <Text style={styles.badgeText}>2</Text> */}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/rider/settings")}
          >
            <Feather name="settings" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pending
          </Text>
          {activeTab === "pending" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "delivered" && styles.activeTab]}
          onPress={() => setActiveTab("delivered")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "delivered" && styles.activeTabText,
            ]}
          >
            Delivered
          </Text>
          {activeTab === "delivered" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptyText}>
              {activeTab === "pending"
                ? "No pending orders available"
                : "No delivered orders yet"}
            </Text>
          </View>
        ) : (
          currentOrders.map((order) =>
            renderOrderCard(order, activeTab === "delivered"),
          )
        )}
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
    padding: 12,
  },
  message: {
    fontSize: 13,
    color: COLORS.muted,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.muted,
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Header
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.muted,
    borderRadius: 3,
    width: 6,
    height: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  activeTab: {
    backgroundColor: "#F9FAFB",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 2,
    backgroundColor: COLORS.primary,
  },

  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderId: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: "#F3F4F6",
  },
  deliverBadge: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
  },
  orderDetails: {
    gap: 4,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 10,
    color: COLORS.muted,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  orderItems: {
    fontSize: 10,
    color: COLORS.muted,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
