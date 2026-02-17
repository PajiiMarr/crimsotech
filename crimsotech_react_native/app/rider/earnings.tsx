import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {
  Feather,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import AxiosInstance from "../../contexts/axios";

// --- Color Palette (Minimalist Theme) ---
const COLORS = {
  primary: "#111827",
  secondary: "#374151",
  muted: "#9CA3AF",
  bg: "#F9FAFB",
  cardBg: "#FFFFFF",
  accent: "#F3F4F6",
  green: "#10B981",
  greenLight: "#D1FAE5",
  red: "#EF4444",
  redLight: "#FEE2E2",
  orange: "#F59E0B",
  blue: "#3B82F6",
};

// --- Types ---
interface DeliveryEarnings {
  id: string;
  orderId: string;
  pickup: string;
  dropoff: string;
  dateTime: string;
  amount: number;
  status: "Completed" | "Cancelled" | "Refunded";
}

interface EarningsBreakdown {
  deliveryFee: number;
  distanceBonus: number;
  heavyItemBonus: number;
  tips: number;
  incentives: number;
  penalties: number;
}

interface PerformanceStats {
  totalDeliveries: number;
  acceptanceRate: number;
  completionRate: number;
  averageRating: number;
  onlineHours: number;
}

// --- Dummy Data ---
const DUMMY_EARNINGS = {
  today: 1250.5,
  thisWeek: 8340.75,
  thisMonth: 32450.0,
  availableBalance: 28350.0,
  pendingBalance: 4100.0,
};

const DUMMY_BREAKDOWN: EarningsBreakdown = {
  deliveryFee: 7200.0,
  distanceBonus: 850.0,
  heavyItemBonus: 450.0,
  tips: 620.0,
  incentives: 1500.0,
  penalties: -280.0,
};

const DUMMY_STATS: PerformanceStats = {
  totalDeliveries: 47,
  acceptanceRate: 94,
  completionRate: 98,
  averageRating: 4.8,
  onlineHours: 8.5,
};

const DUMMY_DELIVERIES: DeliveryEarnings[] = [
  {
    id: "1",
    orderId: "ORD-2024-5431",
    pickup: "Tech Hub Store",
    dropoff: "Makati City, Manila",
    dateTime: "2024-02-17 14:30",
    amount: 180.0,
    status: "Completed",
  },
  {
    id: "2",
    orderId: "ORD-2024-5428",
    pickup: "Mobile Shop",
    dropoff: "Quezon City",
    dateTime: "2024-02-17 12:15",
    amount: 150.0,
    status: "Completed",
  },
  {
    id: "3",
    orderId: "ORD-2024-5420",
    pickup: "Electronics Store",
    dropoff: "Pasig City",
    dateTime: "2024-02-17 10:45",
    amount: 200.0,
    status: "Completed",
  },
  {
    id: "4",
    orderId: "ORD-2024-5415",
    pickup: "Gadget World",
    dropoff: "Mandaluyong City",
    dateTime: "2024-02-17 09:20",
    amount: 120.0,
    status: "Completed",
  },
  {
    id: "5",
    orderId: "ORD-2024-5410",
    pickup: "Smart Devices",
    dropoff: "Taguig City",
    dateTime: "2024-02-16 16:50",
    amount: 0.0,
    status: "Cancelled",
  },
];

export default function EarningsPage() {
  const { userRole, user } = useAuth();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with dummy data as fallback
  const [earnings, setEarnings] = useState(DUMMY_EARNINGS);
  const [breakdown, setBreakdown] = useState(DUMMY_BREAKDOWN);
  const [stats, setStats] = useState(DUMMY_STATS);
  const [deliveries, setDeliveries] = useState(DUMMY_DELIVERIES);

  // Fetch earnings data from API
  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await AxiosInstance.get('/rider-earnings/', {
          headers: { 'X-User-Id': user?.id || user?.user_id }
        });

        if (response.data) {
          // Format API response to match UI structure
          setEarnings({
            today: response.data.today_earnings || 0,
            thisWeek: response.data.week_earnings || 0,
            thisMonth: response.data.month_earnings || 0,
            availableBalance: response.data.month_earnings || 0,
            pendingBalance: 0,
          });

          // Format deliveries
          if (response.data.deliveries && Array.isArray(response.data.deliveries)) {
            const formattedDeliveries = response.data.deliveries.map((d: any) => ({
              id: d.id,
              orderId: `ORD-${d.id.slice(0, 8).toUpperCase()}`,
              pickup: d.shop_name || 'Unknown',
              dropoff: 'Delivery Location',
              dateTime: d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A',
              amount: d.delivery_fee || 0,
              status: d.status === 'delivered' ? 'Completed' : 'Cancelled',
            }));
            setDeliveries(formattedDeliveries);
          }
        }
      } catch (err: any) {
        console.log('Earnings fetch error:', err);
        setError(err.message || 'Failed to load earnings data');
        // Keep using dummy data on error
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id || user?.user_id) {
      fetchEarningsData();
    }
  }, [user]);

  // If loading, show loader
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>Loading earnings data...</Text>
      </View>
    );
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return { bg: COLORS.greenLight, text: COLORS.green };
      case "Cancelled":
        return { bg: COLORS.redLight, text: COLORS.red };
      case "Refunded":
        return { bg: COLORS.accent, text: COLORS.muted };
      default:
        return { bg: COLORS.accent, text: COLORS.muted };
    }
  };

  // Calculate total from breakdown
  const totalBreakdown =
    breakdown.deliveryFee +
    breakdown.distanceBonus +
    breakdown.heavyItemBonus +
    breakdown.tips +
    breakdown.incentives +
    breakdown.penalties;

  if (userRole && userRole !== "rider") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </View>
    );
  }

  // Render Delivery Item
  const renderDeliveryItem = ({ item }: { item: DeliveryEarnings }) => {
    const statusColors = getStatusColor(item.status);
    return (
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryIconContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={20}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.deliveryInfo}>
            <Text style={styles.orderId}>{item.orderId}</Text>
            <View style={styles.routeContainer}>
              <Ionicons name="location" size={10} color={COLORS.green} />
              <Text style={styles.routeText}>{item.pickup}</Text>
            </View>
            <View style={styles.routeContainer}>
              <Ionicons name="location" size={10} color={COLORS.red} />
              <Text style={styles.routeText}>{item.dropoff}</Text>
            </View>
          </View>
          <View style={styles.deliveryRight}>
            <Text
              style={[
                styles.deliveryAmount,
                item.status !== "Completed" && { color: COLORS.muted },
              ]}
            >
              ₱{item.amount.toFixed(2)}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
            >
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.deliveryFooter}>
          <Feather name="clock" size={10} color={COLORS.muted} />
          <Text style={styles.deliveryTime}>{item.dateTime}</Text>
        </View>
      </View>
    );
  };

  // Render Performance Stat Card
  const renderStatCard = (
    icon: string,
    iconLib: string,
    label: string,
    value: string | number,
    color: string,
  ) => (
    <View style={styles.statCard}>
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
      >
        {iconLib === "feather" && (
          <Feather name={icon as any} size={18} color={color} />
        )}
        {iconLib === "ionicons" && (
          <Ionicons name={icon as any} size={18} color={color} />
        )}
        {iconLib === "material" && (
          <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        )}
        {iconLib === "fa5" && (
          <FontAwesome5 name={icon as any} size={16} color={color} />
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Earnings</Text>
          <Text style={styles.headerSubtitle}>Electronics Delivery</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/notification")}
          >
            <Feather name="bell" size={20} color={COLORS.primary} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/settings")}
          >
            <Feather name="settings" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1️⃣ Earnings Summary Section */}
        <View style={styles.summaryCard}>
          <View style={styles.mainEarning}>
            <MaterialCommunityIcons
              name="wallet"
              size={24}
              color={COLORS.primary}
            />
            <View style={styles.mainEarningText}>
              <Text style={styles.mainEarningLabel}>
                This Week&apos;s Earnings
              </Text>
              <Text style={styles.mainEarningAmount}>
                ₱{earnings.thisWeek.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={[styles.balanceAmount, { color: COLORS.primary }]}>
                ₱{earnings.availableBalance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={[styles.balanceAmount, { color: COLORS.primary }]}>
                ₱{earnings.pendingBalance.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Today</Text>
              <Text style={styles.quickStatValue}>
                ₱{earnings.today.toFixed(2)}
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>This Week</Text>
              <Text style={styles.quickStatValue}>
                ₱{earnings.thisWeek.toFixed(2)}
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>This Month</Text>
              <Text style={styles.quickStatValue}>
                ₱{earnings.thisMonth.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2️⃣ Earnings Breakdown Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowBreakdown(!showBreakdown)}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            </View>
            <Feather
              name={showBreakdown ? "chevron-up" : "chevron-down"}
              size={18}
              color={COLORS.muted}
            />
          </TouchableOpacity>

          {showBreakdown && (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Feather name="truck" size={14} color={COLORS.primary} />
                  <Text style={styles.breakdownLabel}>Delivery Fee</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₱{breakdown.deliveryFee.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={14}
                    color={COLORS.blue}
                  />
                  <Text style={styles.breakdownLabel}>Distance Bonus</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₱{breakdown.distanceBonus.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MaterialCommunityIcons
                    name="weight-kilogram"
                    size={14}
                    color={COLORS.orange}
                  />
                  <Text style={styles.breakdownLabel}>Heavy Item Bonus</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₱{breakdown.heavyItemBonus.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MaterialCommunityIcons
                    name="hand-coin"
                    size={14}
                    color={COLORS.green}
                  />
                  <Text style={styles.breakdownLabel}>Tips</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₱{breakdown.tips.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={14}
                    color={COLORS.orange}
                  />
                  <Text style={styles.breakdownLabel}>Incentives</Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  ₱{breakdown.incentives.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={14}
                    color={COLORS.red}
                  />
                  <Text style={[styles.breakdownLabel, { color: COLORS.red }]}>
                    Penalties
                  </Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: COLORS.red }]}>
                  ₱{breakdown.penalties.toFixed(2)}
                </Text>
              </View>

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total Breakdown</Text>
                <Text style={styles.breakdownTotalAmount}>
                  ₱{totalBreakdown.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 4️⃣ Performance Stats Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Performance Stats</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {renderStatCard(
              "package",
              "feather",
              "Deliveries",
              stats.totalDeliveries,
              COLORS.primary,
            )}
            {renderStatCard(
              "checkmark-done-circle",
              "ionicons",
              "Accept Rate",
              `${stats.acceptanceRate}%`,
              COLORS.primary,
            )}
            {renderStatCard(
              "checkmark-circle",
              "ionicons",
              "Complete Rate",
              `${stats.completionRate}%`,
              COLORS.primary,
            )}
            {renderStatCard(
              "star",
              "fa5",
              "Rating",
              `${stats.averageRating}★`,
              COLORS.primary,
            )}
            {renderStatCard(
              "timer-outline",
              "ionicons",
              "Online Hours",
              `${stats.onlineHours}h`,
              COLORS.primary,
            )}
            {renderStatCard(
              "trending-up",
              "feather",
              "Efficiency",
              "High",
              COLORS.primary,
            )}
          </View>
        </View>

        {/* 3️⃣ Completed Deliveries Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="clipboard-list"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            </View>
            <Text style={styles.deliveryCount}>{deliveries.length} items</Text>
          </View>

          <FlatList
            data={deliveries}
            renderItem={renderDeliveryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.deliveriesList}
          />
        </View>
      </ScrollView>

      {/* 5️⃣ Withdrawal Section (Fixed at Bottom) */}
      <View style={styles.withdrawalFooter}>
        <View style={styles.withdrawalInfo}>
          <Text style={styles.withdrawalLabel}>Available to Withdraw</Text>
          <Text style={styles.withdrawalAmount}>
            ₱{earnings.availableBalance.toFixed(2)}
          </Text>
          <Text style={styles.lastWithdrawal}>
            Last withdrawal: ₱2,500 on Feb 10
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.withdrawBtn,
            earnings.availableBalance < 500 && styles.withdrawBtnDisabled,
          ]}
          disabled={earnings.availableBalance < 500}
          onPress={() => router.push("/rider/withdraw")}
        >
          <Feather name="download" size={18} color="#FFF" />
          <Text style={styles.withdrawBtnText}>Withdraw Now</Text>
        </TouchableOpacity>
        {earnings.availableBalance < 500 && (
          <Text style={styles.minBalanceText}>Minimum withdrawal: ₱500</Text>
        )}
      </View>
    </View>
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
  },
  message: {
    fontSize: 14,
    color: COLORS.muted,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 0,
  },
  headerActions: {
    flexDirection: "row",
    gap: 5,
  },
  iconBtn: {
    padding: 5,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.red,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  // 1️⃣ Summary Card
  summaryCard: {
    margin: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  mainEarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  mainEarningText: {
    flex: 1,
  },
  mainEarningLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 1,
  },
  mainEarningAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.accent,
    marginVertical: 6,
  },
  balanceRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  balanceItem: {
    flex: 1,
    alignItems: "center",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: COLORS.accent,
  },
  balanceLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 1,
  },
  balanceAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  quickStat: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  quickStatLabel: {
    fontSize: 7,
    color: COLORS.muted,
    marginBottom: 1,
  },
  quickStatValue: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Section Container
  sectionContainer: {
    marginHorizontal: 8,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  deliveryCount: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // 2️⃣ Breakdown Card
  breakdownCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.secondary,
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: COLORS.accent,
    marginVertical: 4,
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  breakdownTotalAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // 3️⃣ Delivery Card
  deliveriesList: {
    gap: 6,
  },
  deliveryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  deliveryHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  deliveryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  deliveryInfo: {
    flex: 1,
    gap: 2,
  },
  orderId: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 0,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  routeText: {
    fontSize: 9,
    color: COLORS.secondary,
    flex: 1,
  },
  deliveryRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  deliveryAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "600",
  },
  deliveryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
  },
  deliveryTime: {
    fontSize: 9,
    color: COLORS.muted,
  },

  // 4️⃣ Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
  },

  // 5️⃣ Withdrawal Footer
  withdrawalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  withdrawalInfo: {
    marginBottom: 6,
  },
  withdrawalLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 1,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 1,
  },
  lastWithdrawal: {
    fontSize: 8,
    color: COLORS.muted,
  },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  withdrawBtnDisabled: {
    backgroundColor: COLORS.muted,
  },
  withdrawBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  minBalanceText: {
    fontSize: 9,
    color: COLORS.red,
    textAlign: "center",
    marginTop: 4,
  },
});
