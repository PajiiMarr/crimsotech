import React, { useState, useEffect, useCallback } from "react";
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
  Alert,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

const COLORS = {
  primary: "#1F2937",
  secondary: "#111827",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  border: "#E5E7EB",
  lightGray: "#F9FAFB",
};

interface PendingOrder {
  id: string;
  order_id: string;
  customer_name: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  estimated_time: number;
  order_value: number;
  delivery_fee: number;
  status: string;
  created_at: string;
}

export default function PendingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [biddingOrderId, setBiddingOrderId] = useState<string | null>(null);

  const fetchPendingOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await AxiosInstance.get(
        "/rider-orders-active/get_deliveries/?status=pending&page=1&page_size=50",
        {
          headers: { "X-User-Id": user?.id || user?.user_id },
        }
      );

      if (response.data?.success && response.data?.deliveries) {
        const formatted = response.data.deliveries.map((order: any) => ({
          id: order.id || order.order_id,
          order_id: order.order_id,
          customer_name: order.customer_name || "Customer",
          pickup_address: order.pickup_address || order.shop_name || "Pickup Location",
          dropoff_address: order.delivery_address || "Dropoff Location",
          distance_km: order.distance_km || 0,
          estimated_time: order.estimated_minutes || 0,
          order_value: Number(order.order_amount || 0),
          delivery_fee: Number(order.delivery_fee || 0),
          status: order.status,
          created_at: order.created_at,
        }));
        setPendingOrders(formatted);
      }
    } catch (err: any) {
      console.log("Fetch pending orders error:", err);
      setError(err.message || "Failed to load pending orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id || user?.user_id) {
      fetchPendingOrders();
    }
  }, [user, fetchPendingOrders]);

  const handleBidOrder = async (orderId: string) => {
    try {
      setBiddingOrderId(orderId);
      const response = await AxiosInstance.post(
        "/rider-orders-active/accept_order/",
        { delivery_id: orderId },
        {
          headers: { "X-User-Id": user?.id || user?.user_id },
        }
      );

      if (response.data?.success) {
        Alert.alert("Success", "Order accepted! Check your active orders.");
        // Remove from pending list
        setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
      } else {
        Alert.alert("Error", response.data?.message || "Failed to accept order");
      }
    } catch (err: any) {
      console.log("Bid error:", err);
      Alert.alert("Error", err.message || "Failed to accept order");
    } finally {
      setBiddingOrderId(null);
    }
  };

  const renderOrderCard = ({ item }: { item: PendingOrder }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{item.order_id}</Text>
          <Text style={styles.customerName}>{item.customer_name}</Text>
        </View>
        <View style={styles.feeBadge}>
          <Text style={styles.feeText}>₱{item.delivery_fee.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.addressSection}>
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={14} color={COLORS.success} />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.pickup_address}
          </Text>
        </View>
        <View style={[styles.addressRow, { marginTop: 8 }]}>
          <Feather name="flag" size={14} color={COLORS.danger} />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.dropoff_address}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <MaterialIcons name="directions" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>{item.distance_km.toFixed(2)} km</Text>
        </View>
        <View style={styles.detail}>
          <Feather name="clock" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>{item.estimated_time} min</Text>
        </View>
        <View style={styles.detail}>
          <MaterialIcons name="shopping-cart" size={16} color={COLORS.primary} />
          <Text style={styles.detailText}>₱{item.order_value.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bidButton, biddingOrderId === item.id && styles.bidButtonLoading]}
        onPress={() => handleBidOrder(item.id)}
        disabled={biddingOrderId === item.id}
      >
        {biddingOrderId === item.id ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Feather name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.bidButtonText}>Accept Order</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading pending orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pending Orders</Text>
          <Text style={styles.headerSubtitle}>Accept orders to earn delivery fees</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {pendingOrders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPendingOrders} />}
        >
          <MaterialIcons name="inbox" size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No Pending Orders</Text>
          <Text style={styles.emptyText}>Check back later for new delivery opportunities</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              fetchPendingOrders();
            }}
          >
            <Feather name="refresh-cw" size={16} color={COLORS.info} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={pendingOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPendingOrders} />}
        />
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.info,
    marginTop: 12,
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: "600",
  },
  orderCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  customerName: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  feeBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success,
  },
  addressSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.secondary,
    flex: 1,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  bidButton: {
    backgroundColor: COLORS.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  bidButtonLoading: {
    opacity: 0.7,
  },
  bidButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
