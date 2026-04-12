// app/customer/personal-listing.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  ClipboardList,
  Package,
  Truck,
  Undo2,
  MessageSquare,
  Tag,
  Gift,
  ChevronRight,
  Calendar,
  Star,
  RefreshCw,
  History,
  TrendingUp,
  ShoppingBag,
  AlertCircle,
  Heart,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";

interface DashboardSummary {
  period_sales: number;
  period_earnings: number;
  period_orders: number;
  sales_change: number;
  orders_change: number;
  total_products: number;
  published_products: number;
  draft_products: number;
  total_favorites: number;
  product_limit_info: {
    current_count: number;
    limit: number;
    remaining: number;
  };
  date_range_days: number;
}

interface LatestOrder {
  id: string;
  order_id: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  product_count: number;
}

interface LowStockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  critical_stock: number;
  variant_title: string;
}

interface RefundData {
  pending_count: number;
  disputes_count: number;
  total_count: number;
  latest: Array<{
    id: string;
    reason: string;
    requested_amount: number;
    status: string;
    order_id: string;
    requested_at: string;
  }>;
}

interface PersonalPerformance {
  average_rating: number;
  total_reviews: number;
  recent_reviews: number;
  total_favorites: number;
  new_favorites: number;
  total_views: number;
  recent_views: number;
}

interface ReportData {
  active_count: number;
  total_count: number;
  latest_notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    time: string;
    is_read: boolean;
  }>;
}

interface ProductCounts {
  all: number;
  published: number;
  draft: number;
  archived: number;
  removed: number;
}

interface DashboardData {
  success: boolean;
  date_range: {
    start_date: string;
    end_date: string;
    range_type: string;
  };
  summary: DashboardSummary;
  latest_orders: LatestOrder[];
  low_stock: LowStockItem[];
  refunds: RefundData;
  personal_performance: PersonalPerformance;
  reports: ReportData;
  product_counts: ProductCounts;
}

export default function PersonalListingPage() {
  const { userRole, userId } = useAuth();
  const router = useRouter();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeType, setRangeType] = useState('monthly');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await AxiosInstance.get('/customer-personal-listing-dashboard/get_personal_listings/', {
        params: {
          customer_id: userId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          range_type: rangeType,
        }
      });

      if (response.data && response.data.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId, rangeType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₱0';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return '#10B981';
      case 'shipped': return '#3B82F6';
      case 'processing': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Navigate to OrderPage and pass the tab name
  const goToOrders = (tabName: string) => {
    router.push({
      pathname: "/customer/order-lists",
      params: { tab: tabName },
    });
  };

  if (userRole && userRole !== "customer") {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <CustomerLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7280" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </CustomerLayout>
    );
  }

  const summary = dashboardData?.summary;
  const performance = dashboardData?.personal_performance;
  const limitInfo = summary?.product_limit_info;
  const isLimitReached = limitInfo ? limitInfo.remaining === 0 : false;
  const isNearLimit = limitInfo ? limitInfo.remaining <= 5 && !isLimitReached : false;

  return (
    <CustomerLayout>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B7280" />
        }
      >
        <Text style={styles.mainTitle}>Personal Listing</Text>

        {/* Product Limit Alert */}
        {isLimitReached ? (
          <View style={[styles.alertCard, styles.alertDanger]}>
            <AlertCircle size={20} color="#DC2626" />
            <Text style={styles.alertTextDanger}>
              You have reached the maximum limit of {limitInfo?.limit} products.
            </Text>
          </View>
        ) : isNearLimit ? (
          <View style={[styles.alertCard, styles.alertWarning]}>
            <AlertCircle size={20} color="#D97706" />
            <Text style={styles.alertTextWarning}>
              Only {limitInfo?.remaining} slot{limitInfo?.remaining !== 1 ? 's' : ''} remaining out of {limitInfo?.limit}.
            </Text>
          </View>
        ) : null}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
              <TrendingUp size={20} color="#4F46E5" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(summary?.period_sales)}</Text>
            <Text style={styles.statLabel}>Total Sales (30d)</Text>
            {summary?.sales_change !== undefined && (
              <View style={styles.statChange}>
                <Text style={[styles.changeText, { color: summary.sales_change >= 0 ? '#10B981' : '#EF4444' }]}>
                  {summary.sales_change >= 0 ? '+' : ''}{summary.sales_change}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0F9FF' }]}>
              <ShoppingBag size={20} color="#0284C7" />
            </View>
            <Text style={styles.statValue}>{summary?.period_orders || 0}</Text>
            <Text style={styles.statLabel}>Orders (30d)</Text>
            {summary?.orders_change !== undefined && (
              <View style={styles.statChange}>
                <Text style={[styles.changeText, { color: summary.orders_change >= 0 ? '#10B981' : '#EF4444' }]}>
                  {summary.orders_change >= 0 ? '+' : ''}{summary.orders_change}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
              <Heart size={20} color="#DC2626" />
            </View>
            <Text style={styles.statValue}>{performance?.total_favorites || 0}</Text>
            <Text style={styles.statLabel}>Total Favorites</Text>
            {performance?.new_favorites !== undefined && performance.new_favorites > 0 && (
              <View style={styles.statChange}>
                <Text style={[styles.changeText, { color: '#10B981' }]}>+{performance.new_favorites} new</Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Star size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{performance?.average_rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statMeta}>{performance?.total_reviews || 0} reviews</Text>
          </View>
        </View>

        {/* Product Limit Progress */}
        {limitInfo && (
          <View style={styles.limitCard}>
            <View style={styles.limitHeader}>
              <Text style={styles.limitTitle}>Product Limit Usage</Text>
              <Text style={[
                styles.limitCount,
                isLimitReached ? styles.limitCountDanger : isNearLimit ? styles.limitCountWarning : styles.limitCountSuccess
              ]}>
                {limitInfo.current_count}/{limitInfo.limit}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min((limitInfo.current_count / limitInfo.limit) * 100, 100)}%`,
                  backgroundColor: isLimitReached ? '#DC2626' : isNearLimit ? '#D97706' : '#10B981'
                }
              ]} />
            </View>
            <Text style={styles.limitRemaining}>{limitInfo.remaining} slots remaining</Text>
          </View>
        )}

        {/* My Orders Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Orders</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => goToOrders("To Process")}>
              <Text style={styles.viewAllText}>View all</Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.iconRow}>
            <IconButton Icon={ClipboardList} label="To Process" onPress={() => goToOrders("To Process")} />
            <IconButton Icon={Package} label="To Ship" onPress={() => goToOrders("To Ship")} />
            <IconButton Icon={Truck} label="Shipped" onPress={() => goToOrders("Shipped")} />
            <IconButton Icon={Undo2} label="Returns" onPress={() => goToOrders("Returns")} />
            <IconButton Icon={MessageSquare} label="Review" badge={dashboardData?.refunds?.pending_count || 0} onPress={() => goToOrders("Review")} />
          </View>
        </View>

        {/* Latest Orders Preview */}
        {dashboardData?.latest_orders && dashboardData.latest_orders.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Orders</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => goToOrders("To Process")}>
                <Text style={styles.viewAllText}>View all</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {dashboardData.latest_orders.slice(0, 3).map((order) => (
              <TouchableOpacity key={order.id} style={styles.orderItem}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{order.order_id.slice(-8)}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  <Text style={styles.orderProducts}>{order.product_count} product(s)</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatCurrency(order.total_amount)}</Text>
                  <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {order.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* My Products Card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 16 }]}>My Products</Text>
          
          {/* Product Stats */}
          {dashboardData?.product_counts && (
            <View style={styles.productStatsRow}>
              <View style={styles.productStatItem}>
                <Text style={styles.productStatNumber}>{dashboardData.product_counts.published}</Text>
                <Text style={styles.productStatLabel}>Published</Text>
              </View>
              <View style={styles.productStatDivider} />
              <View style={styles.productStatItem}>
                <Text style={styles.productStatNumber}>{dashboardData.product_counts.draft}</Text>
                <Text style={styles.productStatLabel}>Draft</Text>
              </View>
              <View style={styles.productStatDivider} />
              <View style={styles.productStatItem}>
                <Text style={styles.productStatNumber}>{dashboardData.product_counts.archived}</Text>
                <Text style={styles.productStatLabel}>Archived</Text>
              </View>
            </View>
          )}

          <View style={styles.productRow}>
            <TouchableOpacity
              style={styles.productBox}
              onPress={() => router.push("/customer/product-listing")}
            >
              <View style={styles.productIconCircle}>
                <Tag size={20} color="#374151" />
              </View>
              <Text style={styles.productText}>Selling Products</Text>
              {summary && (
                <Text style={styles.productCount}>{summary.total_products} total</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.productBox}
              onPress={() => router.push("/customer/comgift")}
            >
              <View style={styles.productIconCircle}>
                <Gift size={20} color="#374151" />
              </View>
              <Text style={styles.productText}>Gifting Products</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Stock Warning */}
        {dashboardData?.low_stock && dashboardData.low_stock.length > 0 && (
          <View style={[styles.card, styles.lowStockCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Low Stock Alert</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push("/customer/product-listing?filter=lowstock")}
              >
                <Text style={styles.viewAllText}>View all</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {dashboardData.low_stock.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.lowStockItem}>
                <Text style={styles.lowStockName}>{item.product_name}</Text>
                <Text style={styles.lowStockVariant}>{item.variant_title}</Text>
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockText}>Stock: {item.quantity}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Refund Alerts */}
        {dashboardData?.refunds && dashboardData.refunds.pending_count > 0 && (
          <TouchableOpacity style={[styles.card, styles.refundCard]} onPress={() => goToOrders("Returns")}>
            <View style={styles.refundHeader}>
              <Undo2 size={20} color="#D97706" />
              <Text style={styles.refundTitle}>Pending Refund Requests</Text>
            </View>
            <Text style={styles.refundCount}>{dashboardData.refunds.pending_count} pending</Text>
            {dashboardData.refunds.disputes_count > 0 && (
              <Text style={styles.disputeText}>{dashboardData.refunds.disputes_count} in dispute</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </CustomerLayout>
  );
}

type IconButtonProps = {
  Icon: React.ComponentType<any>;
  label: string;
  badge?: number | null;
  onPress?: () => void;
};

const IconButton: React.FC<IconButtonProps> = ({ Icon, label, badge = null, onPress }) => (
  <TouchableOpacity style={styles.iconItem} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.iconWrapper}>
      <Icon size={26} color="#111827" strokeWidth={1.5} />
      {badge !== null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.iconLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { fontSize: 16, color: "#6B7280" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    marginTop: 10,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  alertDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  alertWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  alertTextDanger: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  alertTextWarning: {
    flex: 1,
    fontSize: 13,
    color: "#D97706",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  statMeta: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  statChange: {
    marginTop: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  limitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  limitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  limitTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  limitCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  limitCountSuccess: {
    color: "#10B981",
  },
  limitCountWarning: {
    color: "#D97706",
  },
  limitCountDanger: {
    color: "#DC2626",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  limitRemaining: {
    fontSize: 11,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  viewAllBtn: { flexDirection: "row", alignItems: "center" },
  viewAllText: { fontSize: 13, color: "#9CA3AF", marginRight: 2 },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconItem: { alignItems: "center", width: "20%" },
  iconWrapper: { position: "relative" },
  iconLabel: {
    fontSize: 10,
    color: "#4B5563",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "bold", color: "#FFFFFF" },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 },
  orderDate: { fontSize: 11, color: "#9CA3AF", marginBottom: 2 },
  orderProducts: { fontSize: 11, color: "#6B7280" },
  orderRight: { alignItems: "flex-end" },
  orderAmount: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  orderStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  orderStatusText: { fontSize: 10, fontWeight: "500" },
  productRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  productBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  productText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  productCount: { fontSize: 10, color: "#6B7280", marginTop: 4 },
  productStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  productStatItem: { alignItems: "center", flex: 1 },
  productStatNumber: { fontSize: 18, fontWeight: "700", color: "#111827" },
  productStatLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  productStatDivider: { width: 1, height: 30, backgroundColor: "#E5E7EB" },
  lowStockCard: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  lowStockItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  lowStockName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  lowStockVariant: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  lowStockBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: "flex-start", marginTop: 6 },
  lowStockText: { fontSize: 11, color: "#D97706", fontWeight: "500" },
  refundCard: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  refundHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  refundTitle: { fontSize: 14, fontWeight: "600", color: "#D97706" },
  refundCount: { fontSize: 24, fontWeight: "700", color: "#D97706", marginBottom: 4 },
  disputeText: { fontSize: 12, color: "#EF4444" },
  subsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  subsItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },
  subsIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  subsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 14,
    minHeight: 30,
  },
});