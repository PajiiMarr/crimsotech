import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import AxiosInstance from "../../contexts/axios";

// --- Color Palette (Minimalist Theme) ---
const COLORS = {
  primary: "#1F2937",
  secondary: "#374151",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  accent: "#F3F4F6",
};

// --- Types ---
interface DeliveryEarnings {
  id: string;
  delivery_fee: number;
  status: string;
  shop_name: string;
  created_at: string;
  delivered_at: string;
}

export default function EarningsPage() {
  const { userRole, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("This Week");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryEarnings[]>([]);
  const [earningsSummary, setEarningsSummary] = useState({
    today: 0,
    this_week: 0,
    this_month: 0,
  });

  // Fetch earnings data from backend
  const fetchEarningsData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await AxiosInstance.get("/rider-earnings/", {
        headers: {
          "X-User-Id": userId,
        },
      });

      if (response.data) {
        setDeliveries(response.data.deliveries || []);
        setEarningsSummary({
          today: response.data.today_earnings || 0,
          this_week: response.data.week_earnings || 0,
          this_month: response.data.month_earnings || 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching earnings:", err);
      setError(err.message || "Failed to load earnings data");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [userId]);

  // Helper function to get earnings for current tab
  const getTabEarnings = () => {
    switch (activeTab) {
      case "Today":
        return earningsSummary.today;
      case "This Week":
        return earningsSummary.this_week;
      case "This Month":
        return earningsSummary.this_month;
      default:
        return 0;
    }
  };

  if (userRole && userRole !== "rider") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </View>
    );
  }

  const renderParcelItem = (item: DeliveryEarnings) => (
    <TouchableOpacity
      key={item.id}
      style={styles.parcelCard}
      onPress={() => setSelectedItem(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconInfoRow}>
          <View style={styles.deviceIconBg}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={18}
              color={COLORS.secondary}
            />
          </View>
          <View>
            <Text style={styles.parcelType}>{item.shop_name}</Text>
            <Text style={styles.parcelRoute}>
              Fee: ₱{Number(item.delivery_fee || 0).toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.amountColumn}>
          <Text style={styles.parcelAmount}>
            ₱{Number(item.delivery_fee || 0).toFixed(2)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.accent }]}
          >
            <Text style={[styles.statusText, { color: COLORS.secondary }]}>
              Delivered
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.conditionText}>
          Status: <Text style={{ fontWeight: "600" }}>Completed</Text>
        </Text>
        <Text style={styles.timeText}>
          {new Date(item.delivered_at).toLocaleDateString("en-PH")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>My Earnings</Text>
          <Text style={styles.topBarSubtext}>Electronics Delivery</Text>
        </View>

        {/* Header Actions (Notifications & Settings) */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/notification")}
          >
            <Feather name="bell" size={20} color={COLORS.secondary} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/settings")}
          >
            <Feather name="settings" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 2. Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.totalAmount}>
                ₱{getTabEarnings().toFixed(2)}
              </Text>
              <Text style={styles.totalPeriod}>{activeTab}</Text>
            </>
          )}
        </View>

        {/* 3. Filter Tabs */}
        <View style={styles.tabWrapper}>
          {["Today", "This Week", "This Month"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Deliveries List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Deliveries</Text>
          <Text style={styles.deliveryCount}>
            {deliveries.length} completed
          </Text>
        </View>

        {!loading && deliveries.length > 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            {deliveries.map((item) => renderParcelItem(item))}
          </View>
        ) : loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading deliveries...</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={48}
              color={COLORS.muted}
            />
            <Text style={styles.emptyText}>No deliveries yet</Text>
            <Text style={styles.emptySub}>
              Accept a delivery to start earning.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 7. Deliveries Breakdown Modal */}
      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Details</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Feather name="x" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Shop</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.shop_name}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <Text style={styles.modalValue}>Delivered</Text>
                </View>

                <View style={styles.modalDivider} />

                <View style={styles.modalRow}>
                  <Text style={styles.boldText}>Total Earned</Text>
                  <Text style={styles.boldTotal}>
                    ₱{Number(selectedItem.delivery_fee || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.modalRow, { marginTop: 4 }]}>
                  <Text style={styles.modalLabel}>Delivered At</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedItem.delivered_at).toLocaleString(
                      "en-PH",
                    )}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 8. Withdraw Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.withdrawBtn}>
          <Text style={styles.withdrawText}>Withdraw Earnings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { fontSize: 14, color: COLORS.muted },

  // Header
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  topBarTitle: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  topBarSubtext: { fontSize: 10, color: COLORS.muted, marginTop: 1 },

  // Header Actions
  headerActions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  // Total Card
  totalCard: {
    margin: 12,
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
  },
  totalLabel: { fontSize: 9, color: COLORS.muted, marginBottom: 1 },
  totalAmount: { fontSize: 20, fontWeight: "700", color: COLORS.primary },
  totalPeriod: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: "600",
    marginTop: 1,
  },

  // Tabs
  tabWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 10, color: COLORS.muted, fontWeight: "600" },
  tabTextActive: { color: "#FFF" },

  // Parcel Card
  parcelCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  iconInfoRow: { flexDirection: "row", gap: 6, flex: 1 },
  deviceIconBg: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  parcelType: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
  parcelRoute: { fontSize: 9, color: COLORS.muted },
  amountColumn: { alignItems: "flex-end" },
  parcelAmount: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  statusText: { fontSize: 8, fontWeight: "600" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 4,
  },
  conditionText: { fontSize: 8, color: COLORS.muted },
  timeText: { fontSize: 8, color: "#9CA3AF" },

  // List Utils
  listHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  deliveryCount: { fontSize: 10, color: COLORS.muted },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#FFF", borderRadius: 10, padding: 12 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  modalTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  modalBody: { gap: 8 },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalLabel: { fontSize: 11, color: COLORS.muted },
  modalValue: { fontSize: 11, color: COLORS.primary, fontWeight: "500" },
  modalDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 4 },
  boldText: { fontWeight: "600", fontSize: 12, color: COLORS.primary },
  boldTotal: { fontWeight: "700", fontSize: 14, color: COLORS.primary },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  withdrawText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  emptyContainer: { alignItems: "center", marginTop: 20 },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
