// app/customer/voucher-list.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";

// ------------------ TYPES ------------------
interface Voucher {
  id: string;
  name: string;
  code: string;
  discount_type: "percentage" | "fixed";
  value: number;
  discount_amount: number;
  minimum_spend: number;
  maximum_usage: number;
  remaining_usage: number | null;
  shop_id: string | null;
  shop_name: string;
  voucher_type: string;
  start_date: string;
  end_date: string;
  valid_until: string;
  is_active: boolean;
  is_global: boolean;
  is_best_value?: boolean;
  description?: string;
}

interface VoucherSummary {
  total_available: number;
  best_discount: number;
  global_vouchers: Voucher[];
  shop_vouchers: Voucher[];
}

interface VoucherApiResponse {
  success: boolean;
  available_vouchers: Voucher[];
  voucher_summary: VoucherSummary;
  error?: string;
}

// ------------------ HELPER FUNCTIONS ------------------
const formatNumber = (value: number): string => {
  if (isNaN(value)) return "0.00";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const isExpiringSoon = (dateString: string): boolean => {
  if (!dateString) return false;
  try {
    const endDate = new Date(dateString);
    const today = new Date();
    const daysLeft = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 7 && daysLeft >= 0;
  } catch {
    return false;
  }
};

// ------------------ COMPONENTS ------------------

// Voucher Card Component
const VoucherCard = ({
  voucher,
  onApply,
  isApplying,
}: {
  voucher: Voucher;
  onApply: (code: string) => void;
  isApplying: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const expiringSoon = isExpiringSoon(voucher.end_date);
  const isGlobal = voucher.is_global;

  const getDiscountText = () => {
    if (voucher.discount_type === "percentage") {
      return `${voucher.value}% OFF`;
    }
    return `₱${formatNumber(voucher.value)} OFF`;
  };

  const getSavingsText = () => {
    if (voucher.discount_amount > 0) {
      return `Save up to ₱${formatNumber(voucher.discount_amount)}`;
    }
    return getDiscountText();
  };

  return (
    <TouchableOpacity
      style={[styles.voucherCard, expiringSoon && styles.voucherCardExpiring]}
      onPress={() => onApply(voucher.code)}
      disabled={isApplying}
      activeOpacity={0.7}
    >
      <View style={styles.voucherLeftBorder} />

      <View style={styles.voucherContent}>
        <View style={styles.voucherHeader}>
          <View style={styles.voucherIconContainer}>
            <MaterialIcons
              name={isGlobal ? "public" : "storefront"}
              size={24}
              color="#F97316"
            />
          </View>
          <View style={styles.voucherInfo}>
            <View style={styles.voucherTitleRow}>
              <Text style={styles.voucherName} numberOfLines={1}>
                {voucher.name}
              </Text>
              {voucher.is_best_value && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>Best Value</Text>
                </View>
              )}
              {expiringSoon && (
                <View style={styles.expiringBadge}>
                  <Text style={styles.expiringText}>Expiring Soon</Text>
                </View>
              )}
            </View>
            <Text style={styles.voucherCode}>{voucher.code}</Text>
          </View>
        </View>

        <View style={styles.voucherDetails}>
          <View style={styles.discountRow}>
            <MaterialIcons name="local-offer" size={16} color="#059669" />
            <Text style={styles.discountText}>{getDiscountText()}</Text>
          </View>

          {voucher.minimum_spend > 0 && (
            <View style={styles.detailRow}>
              <MaterialIcons name="shopping-cart" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                Min. spend: ₱{formatNumber(voucher.minimum_spend)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialIcons name="store" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {voucher.shop_name === "All Shops" || isGlobal
                ? "Valid for all shops"
                : `Valid at ${voucher.shop_name}`}
            </Text>
          </View>

          {voucher.maximum_usage > 0 && voucher.remaining_usage !== null && (
            <View style={styles.detailRow}>
              <MaterialIcons name="people" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                {voucher.remaining_usage} uses left
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              Valid until: {formatDate(voucher.end_date)}
            </Text>
          </View>

          {voucher.description && (
            <Text style={styles.voucherDescription} numberOfLines={2}>
              {voucher.description}
            </Text>
          )}
        </View>

        <View style={styles.voucherFooter}>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsLabel}>Potential Savings</Text>
            <Text style={styles.savingsValue}>{getSavingsText()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
            onPress={() => onApply(voucher.code)}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.applyButtonText}>Apply</Text>
                <MaterialIcons name="chevron-right" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Section Header Component
const SectionHeader = ({
  title,
  icon,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={styles.sectionCount}>{count} vouchers</Text>
  </View>
);

// Empty State Component
const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons name="local-offer" size={48} color="#D1D5DB" />
    </View>
    <Text style={styles.emptyTitle}>No Vouchers Available</Text>
    <Text style={styles.emptyText}>
      Check back later for new promotions and discounts
    </Text>
    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
      <MaterialIcons name="refresh" size={20} color="#F97316" />
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

// Code Input Modal for manual voucher entry
const VoucherCodeModal = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isSubmitting: boolean;
}) => {
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a voucher code");
      return;
    }
    onSubmit(code.toUpperCase());
    setCode("");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Voucher Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              Enter your promo code to get discounts on your purchase
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter code (e.g., SUMMER20)"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, isSubmitting && styles.modalSubmitDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Apply Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ------------------ MAIN COMPONENT ------------------
export default function VoucherListPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherSummary, setVoucherSummary] = useState<VoucherSummary>({
    total_available: 0,
    best_discount: 0,
    global_vouchers: [],
    shop_vouchers: [],
  });
  const [activeTab, setActiveTab] = useState<"all" | "global" | "shop">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const fetchVouchers = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await AxiosInstance.get<VoucherApiResponse>(
        "/view-cart/vouchers/",
        { params: { user_id: userId } }
      );

      if (response.data.success) {
        setVouchers(response.data.available_vouchers || []);
        setVoucherSummary(response.data.voucher_summary || {
          total_available: 0,
          best_discount: 0,
          global_vouchers: [],
          shop_vouchers: [],
        });
      } else {
        Alert.alert("Error", response.data.error || "Failed to load vouchers");
      }
    } catch (error: any) {
      console.error("Error fetching vouchers:", error);
      Alert.alert("Error", "Failed to load vouchers. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchVouchers();
      }
    }, [userId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVouchers();
  };

  const handleApplyVoucher = async (code: string) => {
    setIsApplying(true);
    try {
      // Navigate back to cart with voucher code to apply
      router.push(`/customer/cart?apply_voucher=${code}`);
    } catch (error) {
      console.error("Error applying voucher:", error);
      Alert.alert("Error", "Failed to apply voucher");
    } finally {
      setIsApplying(false);
    }
  };

  const handleManualVoucherSubmit = async (code: string) => {
    setIsApplying(true);
    try {
      router.push(`/customer/cart?apply_voucher=${code}`);
      setModalVisible(false);
    } catch (error) {
      console.error("Error applying voucher:", error);
      Alert.alert("Error", "Failed to apply voucher");
    } finally {
      setIsApplying(false);
    }
  };

  const getFilteredVouchers = () => {
    if (activeTab === "global") {
      return vouchers.filter((v) => v.is_global);
    }
    if (activeTab === "shop") {
      return vouchers.filter((v) => !v.is_global);
    }
    return vouchers;
  };

  const filteredVouchers = getFilteredVouchers();

  return (
    <CustomerLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Vouchers & Promos</Text>
            <Text style={styles.headerSubtitle}>
              {voucherSummary.total_available} vouchers available
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.manualButton}
          >
            <MaterialIcons name="add-circle-outline" size={24} color="#F97316" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <MaterialIcons name="local-offer" size={20} color="#F97316" />
            </View>
            <Text style={styles.summaryValue}>
              {voucherSummary.total_available}
            </Text>
            <Text style={styles.summaryLabel}>Available Vouchers</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, styles.bestIconContainer]}>
              <MaterialIcons name="star" size={20} color="#10B981" />
            </View>
            <Text style={[styles.summaryValue, styles.bestValue]}>
              ₱{formatNumber(voucherSummary.best_discount)}
            </Text>
            <Text style={styles.summaryLabel}>Best Discount</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, styles.globalIconContainer]}>
              <MaterialIcons name="public" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.summaryValue}>
              {voucherSummary.global_vouchers.length}
            </Text>
            <Text style={styles.summaryLabel}>Global Vouchers</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text
              style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}
            >
              All ({vouchers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "global" && styles.tabActive]}
            onPress={() => setActiveTab("global")}
          >
            <Text
              style={[styles.tabText, activeTab === "global" && styles.tabTextActive]}
            >
              Global ({voucherSummary.global_vouchers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "shop" && styles.tabActive]}
            onPress={() => setActiveTab("shop")}
          >
            <Text
              style={[styles.tabText, activeTab === "shop" && styles.tabTextActive]}
            >
              Shop ({voucherSummary.shop_vouchers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vouchers List */}
        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading vouchers...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#F97316"]}
                tintColor="#F97316"
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {filteredVouchers.length === 0 ? (
              <EmptyState onRefresh={onRefresh} />
            ) : (
              <>
                {activeTab === "all" && (
                  <>
                    {voucherSummary.global_vouchers.length > 0 && (
                      <>
                        <SectionHeader
                          title="Global Vouchers"
                          icon={<MaterialIcons name="public" size={20} color="#3B82F6" />}
                          count={voucherSummary.global_vouchers.length}
                        />
                        {voucherSummary.global_vouchers.map((voucher) => (
                          <VoucherCard
                            key={voucher.id}
                            voucher={voucher}
                            onApply={handleApplyVoucher}
                            isApplying={isApplying}
                          />
                        ))}
                      </>
                    )}

                    {voucherSummary.shop_vouchers.length > 0 && (
                      <>
                        <SectionHeader
                          title="Shop Vouchers"
                          icon={<MaterialIcons name="storefront" size={20} color="#8B5CF6" />}
                          count={voucherSummary.shop_vouchers.length}
                        />
                        {voucherSummary.shop_vouchers.map((voucher) => (
                          <VoucherCard
                            key={voucher.id}
                            voucher={voucher}
                            onApply={handleApplyVoucher}
                            isApplying={isApplying}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}

                {activeTab === "global" && (
                  <>
                    {filteredVouchers.map((voucher) => (
                      <VoucherCard
                        key={voucher.id}
                        voucher={voucher}
                        onApply={handleApplyVoucher}
                        isApplying={isApplying}
                      />
                    ))}
                  </>
                )}

                {activeTab === "shop" && (
                  <>
                    {filteredVouchers.map((voucher) => (
                      <VoucherCard
                        key={voucher.id}
                        voucher={voucher}
                        onApply={handleApplyVoucher}
                        isApplying={isApplying}
                      />
                    ))}
                  </>
                )}
              </>
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
      </View>

      {/* Manual Voucher Entry Modal */}
      <VoucherCodeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleManualVoucherSubmit}
        isSubmitting={isApplying}
      />
    </CustomerLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  manualButton: {
    padding: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  bestIconContainer: {
    backgroundColor: "#ECFDF5",
  },
  globalIconContainer: {
    backgroundColor: "#EFF6FF",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  bestValue: {
    color: "#10B981",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#F97316",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#F97316",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: "#F97316",
    fontWeight: "500",
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  voucherCardExpiring: {
    borderColor: "#F97316",
    borderWidth: 2,
  },
  voucherLeftBorder: {
    width: 6,
    backgroundColor: "#F97316",
  },
  voucherContent: {
    flex: 1,
    padding: 12,
  },
  voucherHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  voucherIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  voucherInfo: {
    flex: 1,
  },
  voucherTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  voucherName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  bestValueBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  expiringBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiringText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D97706",
  },
  voucherCode: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "600",
    letterSpacing: 1,
  },
  voucherDetails: {
    marginBottom: 12,
    gap: 6,
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  voucherDescription: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 15,
  },
  voucherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 4,
  },
  savingsContainer: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  savingsValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F97316",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F97316",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  bottomPadding: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "85%",
    maxWidth: 340,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F97316",
    borderRadius: 8,
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});