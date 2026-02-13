// app/rider/home.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { getRiderDashboard } from "../../utils/riderApi";

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

export default function Home() {
  const { user } = useAuth();
  const [acceptingDeliveries, setAcceptingDeliveries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    if (user?.id) {
      fetchDashboard();
    }
  }, [user?.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await getRiderDashboard(user?.id || "");
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Extract data from dashboard response
  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.first_name || user?.username || "Rider";
  const stats = dashboardData?.metrics || {
    total_deliveries: 0,
    delivered: 0,
    pending: 0,
    total_earnings: 0,
    avg_rating: 0,
    active_deliveries: 0,
  };

  const activeDeliveries = dashboardData?.deliveries || [];
  const riderData = dashboardData?.rider || null;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const toggleAcceptingDeliveries = async () => {
    const newStatus = !acceptingDeliveries;
    setAcceptingDeliveries(newStatus);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return COLORS.warning;
      case "picked_up":
        return "#3B82F6";
      case "in_progress":
        return "#8B5CF6";
      case "delivered":
        return COLORS.success;
      case "cancelled":
        return COLORS.danger;
      default:
        return COLORS.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Pickup";
      case "picked_up":
        return "Picked Up";
      case "in_progress":
        return "On the way";
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: COLORS.muted }}>Loading...</Text>
        </View>
      ) : (
        <>
          {/* --- Header (Matches Schedule/Messages Style) --- */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Hello, {fullName}</Text>
              <Text style={styles.headerSubtitle}>
                {acceptingDeliveries
                  ? "Ready for deliveries"
                  : "Currently offline"}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push("/rider/notification")}
              >
                <Feather name="bell" size={22} color={COLORS.secondary} />
                <View style={styles.notifBadge} />
              </TouchableOpacity>

              {/* FIXED ROUTE: Points to /rider/settings instead of /settings */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push("/rider/settings")}
              >
                <Feather name="settings" size={22} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {/* Availability Toggle */}
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityHeader}>
                <Text style={styles.availabilityTitle}>Delivery Status</Text>
                <View style={styles.statusIndicator}>
                  <View
                    style={[
                      styles.statusDot,
                      acceptingDeliveries && styles.activeDot,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {acceptingDeliveries ? "Available" : "Offline"}
                  </Text>
                </View>
              </View>

              <Text style={styles.availabilitySubtitle}>
                {acceptingDeliveries
                  ? "You are accepting delivery requests"
                  : "You are not accepting deliveries"}
              </Text>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  acceptingDeliveries && styles.toggleButtonActive,
                ]}
                onPress={toggleAcceptingDeliveries}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    acceptingDeliveries && styles.toggleButtonTextActive,
                  ]}
                >
                  {acceptingDeliveries ? "Go Offline" : "Go Online"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsContainer}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: "#ECFDF5" }]}
                  >
                    <MaterialIcons
                      name="delivery-dining"
                      size={20}
                      color={COLORS.success}
                    />
                  </View>
                  <Text style={styles.statValue}>{stats.total_deliveries}</Text>
                  <Text style={styles.statLabel}>Deliveries</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: "#EFF6FF" }]}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color="#3B82F6"
                    />
                  </View>
                  <Text style={styles.statValue}>{stats.delivered}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: "#FFF7ED" }]}
                  >
                    <Text
                      style={{
                        color: "#EE4D2D",
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      ₱
                    </Text>
                  </View>
                  <Text style={styles.statValue}>
                    {formatCurrency(stats.total_earnings).replace("₱", "")}
                  </Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[styles.statIconBg, { backgroundColor: "#F3E8FF" }]}
                  >
                    <MaterialIcons name="star" size={20} color="#9333EA" />
                  </View>
                  <Text style={styles.statValue}>
                    {stats.avg_rating.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            </View>

            {/* Active Deliveries List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Deliveries</Text>
                <TouchableOpacity onPress={() => router.push("/rider/orders")}>
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              </View>

              {activeDeliveries.map((item) => (
                <View key={item.id} style={styles.deliveryCard}>
                  <View style={styles.deliveryHeader}>
                    <Text
                      style={styles.deliveryId}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.order_id}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: "#F3F4F6" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: COLORS.muted },
                        ]}
                      >
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deliveryDetails}>
                    <View style={styles.detailRow}>
                      <Feather name="user" size={14} color={COLORS.muted} />
                      <Text style={styles.detailText}>
                        {item.order?.user?.first_name || ""}{" "}
                        {item.order?.user?.last_name || "Customer"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={14} color={COLORS.muted} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.order?.delivery_address_text ||
                          item.delivery_location ||
                          "Delivery Location"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather
                        name="navigation"
                        size={14}
                        color={COLORS.muted}
                      />
                      <Text style={styles.detailText}>
                        {item.distance_km || 0} km •{" "}
                        {item.estimated_minutes || 0} mins
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deliveryFooter}>
                    <Text style={styles.deliveryAmount}>
                      {formatCurrency(
                        item.order?.total_amount || item.delivery_fee || 0,
                      )}
                    </Text>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Vehicle Info */}
            {riderData && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                  Vehicle Information
                </Text>

                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleHeader}>
                    {riderData.vehicle_image ? (
                      <Image
                        source={{ uri: riderData.vehicle_image }}
                        style={styles.vehicleImage}
                      />
                    ) : (
                      <View style={styles.vehicleImagePlaceholder}>
                        <MaterialIcons
                          name="two-wheeler"
                          size={28}
                          color={COLORS.primary}
                        />
                      </View>
                    )}

                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleModel}>
                        {riderData.vehicle_brand} {riderData.vehicle_model}
                      </Text>
                      <Text style={styles.vehicleType}>
                        {riderData.vehicle_type}
                      </Text>
                      <Text style={styles.plateNumber}>
                        {riderData.plate_number}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.verificationBadge}>
                    <MaterialIcons
                      name={riderData.verified ? "verified" : "warning"}
                      size={16}
                      color={
                        riderData.verified ? COLORS.success : COLORS.warning
                      }
                    />
                    <Text
                      style={[
                        styles.verificationText,
                        {
                          color: riderData.verified
                            ? COLORS.success
                            : COLORS.warning,
                        },
                      ]}
                    >
                      {riderData.verified
                        ? "Verified Rider"
                        : "Pending Verification"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },

  // --- Header Styles ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
  },
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

  // --- Availability Card ---
  availabilityCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  availabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  availabilityTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted,
  },
  activeDot: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  availabilitySubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 10,
  },
  toggleButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12,
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
  },

  // --- Stats Grid ---
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.cardBg,
    padding: 10,
    borderRadius: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // --- Sections ---
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  sectionLink: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // --- Delivery Card ---
  deliveryCard: {
    backgroundColor: COLORS.cardBg,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  deliveryId: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  deliveryDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 10,
    color: COLORS.muted,
    flex: 1,
  },
  deliveryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  deliveryAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // --- Vehicle Card ---
  vehicleCard: {
    backgroundColor: COLORS.cardBg,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  vehicleImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  vehicleImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FDEEE9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 1,
  },
  vehicleType: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 1,
  },
  plateNumber: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "500",
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    overflow: "hidden",
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  verificationText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
