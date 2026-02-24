import React, { useCallback, useEffect, useState } from "react";
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
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";
import { acceptDeliveryOrder } from "../../utils/riderApi";

// --- Theme Colors (Minimalist Softened) ---
const COLORS = {
  primary: "#1F2937", // Charcoal
  secondary: "#111827",
  muted: "#6B7280",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  border: "#F3F4F6",
};

export default function IncomingOrdersPage() {
  const { userId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncoming = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await AxiosInstance.get(
        "/rider-orders-active/get_deliveries/?status=all&page=1&page_size=50",
        { headers: { "X-User-Id": userId } }
      );

      if (response.data?.success) {
        const pendingOrders = response.data.pending_orders || [];
        const formatted = pendingOrders.map((order: any) => ({
          id: order.order_id,
          order_id: order.order_id,
          status: "pending",
          customer_name: order.customer,
          delivery_location: order.address,
          distance_km: null,
          estimated_minutes: null,
          delivery_fee: null,
          items_count: 1,
          order_amount: order.amount,
          scheduled_delivery_time: order.created_at,
          order: {
            user: { first_name: order.customer, last_name: "" },
            delivery_address_text: order.address,
            total_amount: order.amount,
          },
        }));
        setDeliveries(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch incoming deliveries:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIncoming();
  }, [fetchIncoming]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncoming();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (deliveryId: string, order: any) => {
    try {
      if (userId) {
        await acceptDeliveryOrder(userId, order.order_id || order.id);
      }
      router.push({
        pathname: "/rider/delivery-details",
        params: { orderId: String(order.order_id || order.id) },
      });
    } catch (error) {
      console.error("Failed to accept order:", error);
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== orderId));
    try {
      await fetchIncoming();
      alert("Order declined");
    } catch (error) {
      console.warn("Decline refresh failed, order removed locally", error);
      alert("Order declined (local)");
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

  const renderOrderCard = (order: any) => {
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
            <MaterialIcons name="receipt" size={13} color={COLORS.muted} />
            <Text style={styles.orderId}>Order #{orderId.substring(0, 8)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Incoming</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={13} color={COLORS.muted} />
            <Text style={styles.detailText}>{customerName}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={13} color={COLORS.muted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={13} color={COLORS.muted} />
            <Text style={styles.detailText}>
              {order.scheduled_delivery_time
                ? `Deliver by: ${formatTime(order.scheduled_delivery_time)}`
                : "Time not set"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons
              name="directions-bike"
              size={13}
              color={COLORS.muted}
            />
            <Text style={styles.detailText}>
              {order.distance_km ? `${order.distance_km} km away` : "N/A"}
            </Text>
          </View>

          {deliveryFee > 0 && (
            <View style={styles.detailRow}>
              <MaterialIcons name="payments" size={13} color={COLORS.muted} />
              <Text style={[styles.detailText, { fontWeight: "600" }]}>
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

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDeclineOrder(order.id)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAcceptOrder(order.id, order)}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isEmpty = deliveries.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />

      {/* --- Standardized Header --- */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Incoming Deliveries</Text>
        </View>
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
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading incoming orders...</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="local-shipping"
              size={64}
              color={COLORS.muted}
            />
            <Text style={styles.emptyTitle}>No Incoming Orders</Text>
            <Text style={styles.emptyText}>
              Check back later for new delivery requests
            </Text>
          </View>
        ) : (
          deliveries.map((order) => renderOrderCard(order))
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

  // Header
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
  },

  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 14,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderId: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "500",
    color: COLORS.muted,
  },
  orderDetails: {
    gap: 5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.muted,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  orderItems: {
    fontSize: 10,
    color: COLORS.muted,
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: 6,
  },
  declineButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  declineButtonText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 14,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
    marginTop: 12,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 15,
  },
});
