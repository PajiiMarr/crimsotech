import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getRiderOrderHistory } from "../../utils/riderApi";

const COLORS = {
  primary: "#1F2937",
  secondary: "#111827",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
  border: "#E5E7EB",
  lightGray: "#F9FAFB",
};

type HistoryMetrics = {
  total_deliveries: number;
  delivered_count: number;
  cancelled_count: number;
  total_earnings: number;
  avg_rating: number;
  on_time_percentage: number;
  has_data: boolean;
};

type HistoryDelivery = {
  id: string;
  order_id: string;
  order_number?: string;
  customer_name?: string;
  delivery_location?: string;
  status: string;
  delivery_fee?: number;
  order_amount?: number;
  created_at?: string;
  delivered_at?: string | null;
};

export default function RiderHistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "cancelled">("active");
  const [deliveries, setDeliveries] = useState<HistoryDelivery[]>([]);
  const [metrics, setMetrics] = useState<HistoryMetrics>({
    total_deliveries: 0,
    delivered_count: 0,
    cancelled_count: 0,
    total_earnings: 0,
    avg_rating: 0,
    on_time_percentage: 0,
    has_data: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });

  const fetchHistory = useCallback(
    async (status: "active" | "completed" | "cancelled") => {
      try {
        setError(null);
        const data = await getRiderOrderHistory(user?.id || user?.user_id, {
          status,
        });
        if (data?.success) {
          setDeliveries(data.deliveries || []);
          setMetrics({
            total_deliveries: data.metrics?.total_deliveries || 0,
            delivered_count: data.metrics?.delivered_count || 0,
            cancelled_count: data.metrics?.cancelled_count || 0,
            total_earnings: data.metrics?.total_earnings || 0,
            avg_rating: data.metrics?.avg_rating || 0,
            on_time_percentage: data.metrics?.on_time_percentage || 0,
            has_data: Boolean(data.metrics?.has_data),
          });
        } else {
          setDeliveries([]);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load order history");
        setDeliveries([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, user?.user_id],
  );

  useEffect(() => {
    if (user?.id || user?.user_id) {
      setLoading(true);
      fetchHistory(activeTab);
    }
  }, [activeTab, fetchHistory, user?.id, user?.user_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory(activeTab);
  };

  const formatCurrency = (amount?: number) => {
    return `₱${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return COLORS.success;
      case "cancelled":
        return COLORS.danger;
      case "picked_up":
      case "in_progress":
        return COLORS.info;
      case "pending":
        return COLORS.warning;
      default:
        return COLORS.muted;
    }
  };

  const summaryCards = useMemo(
    () => [
      { label: "Total", value: metrics.total_deliveries },
      { label: "Delivered", value: metrics.delivered_count },
      { label: "Cancelled", value: metrics.cancelled_count },
      { label: "Earnings", value: formatCurrency(metrics.total_earnings) },
      { label: "Rating", value: metrics.avg_rating.toFixed(1) },
      { label: "On Time", value: `${metrics.on_time_percentage}%` },
    ],
    [metrics],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Order History</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dateFilterWrapper}>
          <TouchableOpacity
            style={styles.dateFilterButton}
            onPress={() => {
              const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              Alert.alert(
                "Filter by Date",
                "",
                [
                  {
                    text: "Last 7 Days",
                    onPress: () =>
                      setDateRange({
                        start: oneWeekAgo,
                        end: new Date(),
                      }),
                  },
                  {
                    text: "Last 30 Days",
                    onPress: () =>
                      setDateRange({
                        start: thirtyDaysAgo,
                        end: new Date(),
                      }),
                  },
                  {
                    text: "All Time",
                    onPress: () =>
                      setDateRange({
                        start: new Date(0),
                        end: new Date(),
                      }),
                  },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Feather name="calendar" size={14} color={COLORS.primary} />
            <Text style={styles.dateFilterText}>Filter by Date</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterWrapper}>
          {[
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, activeTab === tab.id && styles.filterTabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text
                style={[styles.filterText, activeTab === tab.id && styles.filterTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.messageText}>Loading history...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : deliveries.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="history" size={48} color={COLORS.border} />
            <Text style={styles.messageText}>No deliveries found.</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            {deliveries.map((item) => (
              <View key={item.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.idContainer}>
                    <MaterialIcons name="receipt" size={13} color={COLORS.muted} />
                    <Text style={styles.orderId}>
                      Order #{item.order_number || item.order_id?.slice(0, 8)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(item.status)}1A` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.storeName}>{item.customer_name || "Customer"}</Text>
                  <Text style={styles.orderItems} numberOfLines={2}>
                    {item.delivery_location || "Delivery location"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <Text style={styles.orderPrice}>
                    {formatCurrency(item.delivery_fee || item.order_amount || 0)}
                  </Text>
                  <Text style={styles.dateText}>
                    {formatDate(item.delivered_at || item.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 10,
  },
  summaryCard: {
    width: "30%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  filterWrapper: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 6,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  
  // Date Filter
  dateFilterWrapper: {
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
  },
  dateFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  listSection: {
    paddingHorizontal: 14,
    marginTop: 12,
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
  },
});
