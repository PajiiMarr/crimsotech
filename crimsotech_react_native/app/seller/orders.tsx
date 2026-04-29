// app/seller/orders.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";
import { SafeAreaView } from "react-native-safe-area-context";

// Interfaces
interface MediaItem {
  id: string;
  url: string;
  file_type: string;
}
interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}
interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  variant: string;
  shop: {
    id: string;
    name: string;
  };
  media?: MediaItem[];
  primary_image?: MediaItem | null;
  variant_image?: string | null;
}
interface OrderItemCartItem {
  id: string;
  product: OrderItemProduct;
  quantity: number;
  variant_id?: string | null;
}
interface OrderItem {
  id: string;
  cart_item: OrderItemCartItem;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  is_shipped?: boolean;
  shipping_method?: string | null;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  is_processed?: boolean;
  shipping_status?: string;
  waybill_url?: string;
}
interface Order {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  approval: string;
  status: string;
  shop_status?: string;
  global_order_status?: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method?: string | null;
  shipping_method?: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  is_pickup?: boolean;
  delivery_info?: DeliveryInfo;
  receipt_url?: string | null;
  pickup_date?: string | null;
}

// Status configuration based on order flow
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    order: number;
  }
> = {
  pending_shipment: {
    label: "Pending",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    icon: "time-outline",
    order: 1,
  },
  processing: {
    label: "Processing",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    icon: "refresh-outline",
    order: 2,
  },
  ready_to_ship: {
    label: "Ready to Ship",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    icon: "cube-outline",
    order: 3,
  },
  rider_assigned: {
    label: "Rider Assigned",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    icon: "person-outline",
    order: 3,
  },
  rider_accepted: {
    label: "Rider Accepted",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "checkmark-circle-outline",
    order: 4,
  },
  pending_rider: {
    label: "Pending Rider",
    color: "#f97316",
    bgColor: "#fff7ed",
    icon: "time-outline",
    order: 3,
  },
  waiting_for_rider: {
    label: "Waiting for Rider",
    color: "#f97316",
    bgColor: "#fff7ed",
    icon: "person-outline",
    order: 4,
  },
  waiting_for_pickup: {
    label: "Waiting Pickup",
    color: "#f97316",
    bgColor: "#fff7ed",
    icon: "cube-outline",
    order: 4,
  },
  shipped: {
    label: "Shipped",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    icon: "car-outline",
    order: 5,
  },
  to_deliver: {
    label: "Out for Delivery",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    icon: "car-outline",
    order: 6,
  },
  delivered: {
    label: "Delivered",
    color: "#10b981",
    bgColor: "#ecfdf5",
    icon: "checkmark-circle-outline",
    order: 7,
  },
  completed: {
    label: "Completed",
    color: "#10b981",
    bgColor: "#ecfdf5",
    icon: "checkmark-circle-outline",
    order: 8,
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    icon: "storefront-outline",
    order: 3,
  },
  picked_up: {
    label: "Picked Up",
    color: "#10b981",
    bgColor: "#ecfdf5",
    icon: "checkmark-circle-outline",
    order: 5,
  },
  partially_delivered: {
    label: "Partially Delivered",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    icon: "cube-outline",
    order: 6,
  },
  cancelled: {
    label: "Cancelled",
    color: "#ef4444",
    bgColor: "#fef2f2",
    icon: "close-circle-outline",
    order: 0,
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    color: "#f97316",
    bgColor: "#fff7ed",
    icon: "card-outline",
    order: 0,
  },
  default: {
    label: "Unknown",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    icon: "help-circle-outline",
    order: 0,
  },
};

// Tabs configuration - Only show relevant statuses
const STATUS_TABS = [
  { id: "all", label: "All", icon: "list-outline" },
  // Shared
  { id: "pending_shipment", label: "Pending", icon: "time-outline" },
  { id: "processing", label: "Processing", icon: "refresh-outline" },
  // Delivery only
  { id: "ready_to_ship", label: "Ready to Ship", icon: "cube-outline" },
  { id: "rider_assigned", label: "Rider Assigned", icon: "person-outline" },
  { id: "rider_accepted", label: "Rider Accepted", icon: "checkmark-circle-outline" },
  { id: "waiting_for_rider", label: "Waiting Rider", icon: "person-outline" },
  { id: "shipped", label: "Shipped", icon: "car-outline" },
  { id: "to_deliver", label: "Out for Delivery", icon: "car-outline" },
  // Pickup only
  { id: "ready_for_pickup", label: "Ready for Pickup", icon: "storefront-outline" },
  { id: "picked_up", label: "Picked Up", icon: "checkmark-circle-outline" },
  // Shared end states
  { id: "delivered", label: "Delivered", icon: "checkmark-circle-outline" },
  { id: "completed", label: "Completed", icon: "checkmark-circle-outline" },
  { id: "partially_delivered", label: "Partially Delivered", icon: "cube-outline" },
  { id: "cancelled", label: "Cancelled", icon: "close-circle-outline" },
];

export default function Orders() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [availableActions, setAvailableActions] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    if (shopId && userId) {
      fetchOrders();
    }
  }, [shopId, userId]);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, activeTab, orders]);

  useEffect(() => {
    if (shopId && orders.length > 0) {
      const ordersToLoad = orders.slice(0, 10);
      ordersToLoad.forEach((order) => {
        if (!availableActions[order.order_id]) {
          loadAvailableActions(order.order_id);
        }
      });
    }
  }, [shopId, orders]);

  const fetchOrders = async () => {
    if (!userId || !shopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await AxiosInstance.get(
        "/seller-order-list/order_list/",
        {
          params: { shop_id: shopId },
        },
      );
      if (response.data.success) {
        const data = response.data.data || [];
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const loadAvailableActions = async (orderId: string) => {
    if (!shopId) return;
    try {
      const response = await AxiosInstance.get(
        `/seller-order-list/${orderId}/available_actions/`,
        { params: { shop_id: shopId } },
      );
      if (response.data.success) {
        const actions = response.data.data.available_actions || [];
        setAvailableActions((prev) => ({ ...prev, [orderId]: actions }));
      }
    } catch (error) {
      console.error("Error loading available actions:", error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const customerName =
          `${order.user.first_name} ${order.user.last_name}`.toLowerCase();
        return (
          customerName.includes(searchLower) ||
          order.order_id.toLowerCase().includes(searchLower) ||
          order.user.email.toLowerCase().includes(searchLower) ||
          order.items.some((item) =>
            item.cart_item?.product?.name?.toLowerCase().includes(searchLower)
          )
        );
      });
    }

    if (activeTab !== "all") {
      filtered = filtered.filter((order) => {
        // Use global_order_status first, fall back to status
        const orderStatus = (order.global_order_status || order.status || "").toLowerCase();
        return orderStatus === activeTab.toLowerCase();
      });
    }

    setFilteredOrders(filtered);
  };

  const formatCustomerName = (user: Order["user"]) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.username;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) return "₱0.00";
    return `₱${amount.toLocaleString("en-PH", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const isPickupOrder = (order: Order) => order.is_pickup === true;

  const isCancelledOrder = (order: Order) => {
    const status = (order.global_order_status || order.status || "").toLowerCase();
    return status === "cancelled";
  };

  const hasPendingDeliveryOffer = (order: Order): boolean =>
    order.delivery_info?.status === "pending" ||
    order.delivery_info?.is_pending_offer === true;

  const isWaitingForRider = (order: Order): boolean => {
    const status = (order.global_order_status || order.status || "").toLowerCase();
    return status === "waiting_for_rider";
  };

  const isAwaitingMayaPayment = (order: Order): boolean => {
    const isMaya = order.payment_method?.toLowerCase() === "maya";
    const status = (order.global_order_status || order.status || "").toLowerCase();
    const isPendingShipment = status === "pending_shipment";
    const actions = availableActions[order.order_id] || [];
    const canConfirm = actions.includes("confirm");
    return isMaya && isPendingShipment && !canConfirm;
  };

  const getDisplayStatus = (order: Order): string => {
    // Priority: global_order_status first, then shop_status, then status
    if (order.global_order_status) {
      return order.global_order_status.toLowerCase();
    }
    if (order.shop_status) {
      return order.shop_status.toLowerCase();
    }
    return (order.status || "default").toLowerCase();
  };

  const getStatusBadge = (order: Order) => {
    const displayStatus = getDisplayStatus(order);
    const awaitingMaya = isAwaitingMayaPayment(order);

    let statusKey = displayStatus;
    if (awaitingMaya) statusKey = "awaiting_payment";

    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.default;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={10} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const getProductImageUrl = (item: OrderItem): string => {
    if (item.cart_item?.product?.variant_image)
      return item.cart_item.product.variant_image;
    if (item.cart_item?.product?.primary_image?.url)
      return item.cart_item.product.primary_image.url;
    if (
      item.cart_item?.product?.media &&
      item.cart_item.product.media.length > 0
    )
      return item.cart_item.product.media[0].url;
    return "https://via.placeholder.com/100";
  };

  const getBorderColor = (order: Order): string => {
    const awaitingMaya = isAwaitingMayaPayment(order);
    const isCancelled = isCancelledOrder(order);
    const displayStatus = getDisplayStatus(order);

    let statusKey = displayStatus;
    if (awaitingMaya) statusKey = "awaiting_payment";
    else if (isCancelled) statusKey = "cancelled";

    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.default;
    return config.color;
  };

  const totalOrderAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const getOrderStatusKey = (order: Order): string => {
    return (order.global_order_status || order.shop_status || order.status || "default").toLowerCase();
  };

  const counts = {
    all: orders.length,
    pending_shipment: orders.filter((o) => getOrderStatusKey(o) === "pending_shipment").length,
    processing: orders.filter((o) => getOrderStatusKey(o) === "processing").length,
    ready_to_ship: orders.filter((o) => getOrderStatusKey(o) === "ready_to_ship").length,
    rider_assigned: orders.filter((o) => getOrderStatusKey(o) === "rider_assigned").length,
    rider_accepted: orders.filter((o) => getOrderStatusKey(o) === "rider_accepted").length,
    waiting_for_rider: orders.filter((o) => getOrderStatusKey(o) === "waiting_for_rider").length,
    shipped: orders.filter((o) => getOrderStatusKey(o) === "shipped").length,
    to_deliver: orders.filter((o) => getOrderStatusKey(o) === "to_deliver").length,
    ready_for_pickup: orders.filter((o) => getOrderStatusKey(o) === "ready_for_pickup").length,
    picked_up: orders.filter((o) => getOrderStatusKey(o) === "picked_up").length,
    delivered: orders.filter((o) => getOrderStatusKey(o) === "delivered").length,
    completed: orders.filter((o) => getOrderStatusKey(o) === "completed").length,
    partially_delivered: orders.filter((o) => getOrderStatusKey(o) === "partially_delivered").length,
    cancelled: orders.filter((o) => getOrderStatusKey(o) === "cancelled").length,
  };

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="cart-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view orders</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/customer/shops")}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Order Management</Text>
              <Text style={styles.subtitle}>
                Manage customer orders and shipments
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsScroll}
          >
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(totalOrderAmount)}</Text>
                <Text style={styles.statLabel}>Total Amount</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                  {counts.pending_shipment}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                  {counts.processing}
                </Text>
                <Text style={styles.statLabel}>Processing</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#3b82f6" }]}>
                  {counts.ready_to_ship}
                </Text>
                <Text style={styles.statLabel}>Ready to Ship</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#f97316" }]}>
                  {counts.waiting_for_rider}
                </Text>
                <Text style={styles.statLabel}>Waiting Rider</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#3b82f6" }]}>
                  {counts.shipped}
                </Text>
                <Text style={styles.statLabel}>Shipped</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#8b5cf6" }]}>
                  {counts.to_deliver}
                </Text>
                <Text style={styles.statLabel}>Out for Delivery</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#10b981" }]}>
                  {counts.delivered}
                </Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#10b981" }]}>
                  {counts.completed}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#8b5cf6" }]}>
                  {counts.partially_delivered}
                </Text>
                <Text style={styles.statLabel}>Partially Delivered</Text>
              </View>
            </View>
          </ScrollView>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search orders by ID, customer, or product..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
          >
            <View style={styles.tabsContainer}>
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = counts[tab.id as keyof typeof counts] || 0;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tabButton,
                      isActive && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={14}
                      color={isActive ? "#3b82f6" : "#64748B"}
                    />
                    <Text
                      style={[styles.tabText, isActive && styles.tabTextActive]}
                    >
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          isActive && styles.tabBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            isActive && styles.tabBadgeTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Orders List */}
          <View style={styles.listContainer}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === "all"
                    ? "No orders found"
                    : activeTab === "pending_shipment"
                      ? "No pending orders"
                      : activeTab === "processing"
                        ? "No orders in processing"
                        : activeTab === "ready_to_ship"
                          ? "No orders ready to ship"
                          : activeTab === "waiting_for_rider"
                            ? "No orders waiting for rider"
                            : activeTab === "shipped"
                              ? "No shipped orders"
                              : activeTab === "to_deliver"
                                ? "No orders out for delivery"
                                : activeTab === "delivered"
                                  ? "No delivered orders"
                                  : activeTab === "completed"
                                    ? "No completed orders"
                                    : "No cancelled orders"}
                </Text>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const primaryItem = order.items[0];
                const customerName = formatCustomerName(order.user);
                const displayStatus = getDisplayStatus(order);
                const waitingForRider = isWaitingForRider(order);
                const awaitingMaya = isAwaitingMayaPayment(order);
                const borderColor = getBorderColor(order);

                return (
                  <TouchableOpacity
                    key={order.order_id}
                    style={[
                      styles.orderCard,
                      { borderLeftColor: borderColor, borderLeftWidth: 4 },
                    ]}
                    onPress={() => {
                      router.push(
                        `/seller/view-order?orderId=${order.order_id}&shopId=${shopId}`,
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Awaiting Maya Payment notice on card */}
                    {awaitingMaya && (
                      <View style={styles.mayaCardNotice}>
                        <Ionicons
                          name="card-outline"
                          size={12}
                          color="#f97316"
                        />
                        <Text style={styles.mayaCardNoticeText}>
                          Awaiting Maya payment
                        </Text>
                      </View>
                    )}

                    {/* Waiting for rider notice */}
                    {waitingForRider && (
                      <View style={styles.statusNote}>
                        <Ionicons
                          name="person-outline"
                          size={12}
                          color="#f97316"
                        />
                        <Text style={styles.statusNoteText}>
                          Waiting for rider{" "}
                          {order.delivery_info?.rider_name || ""} to accept
                        </Text>
                      </View>
                    )}

                    {/* Header */}
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <View style={styles.orderIdContainer}>
                          <Ionicons
                            name="cube-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.orderId} numberOfLines={1}>
                            {primaryItem?.cart_item?.product?.name ||
                              "Order Items"}
                            {order.items.length > 1 &&
                              ` +${order.items.length - 1} more`}
                          </Text>
                        </View>
                        <View style={styles.orderMeta}>
                          <Text style={styles.orderIdText}>
                            {order.order_id.slice(0, 8)}
                          </Text>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.orderDate}>
                            {formatDate(order.created_at)}
                          </Text>
                        </View>
                      </View>
                      {getStatusBadge(order)}
                    </View>

                    {/* Customer Info */}
                    <View style={styles.customerInfo}>
                      <Ionicons
                        name="person-outline"
                        size={10}
                        color="#64748B"
                      />
                      <Text style={styles.customerName}>{customerName}</Text>
                    </View>

                    {/* Delivery Method */}
                    <View style={styles.deliveryInfo}>
                      {isPickupOrder(order) ? (
                        <>
                          <Ionicons
                            name="storefront-outline"
                            size={10}
                            color="#64748B"
                          />
                          <Text style={styles.deliveryText}>Pickup</Text>
                          {order.pickup_date && (
                            <>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.deliveryText}>
                                Pickup:{" "}
                                {new Date(
                                  order.pickup_date,
                                ).toLocaleDateString()}
                              </Text>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name="car-outline"
                            size={10}
                            color="#64748B"
                          />
                          <Text style={styles.deliveryText}>Delivery</Text>
                        </>
                      )}
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.quantityText}>
                        Qty:{" "}
                        {order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}
                      </Text>
                    </View>

                    {/* Payment and Total */}
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentMethod}>
                        {order.payment_method || "N/A"}
                      </Text>
                      <Text style={styles.totalAmount}>
                        {formatCurrency(order.total_amount)}
                      </Text>
                    </View>

                    {/* Product Images */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.imagesScroll}
                    >
                      <View style={styles.imagesContainer}>
                        {order.items.slice(0, 5).map((item, idx) => (
                          <View key={idx} style={styles.productImageWrapper}>
                            <Image
                              source={{ uri: getProductImageUrl(item) }}
                              style={styles.productImage}
                            />
                          </View>
                        ))}
                        {order.items.length > 5 && (
                          <View style={styles.moreProductsBadge}>
                            <Text style={styles.moreProductsText}>
                              +{order.items.length - 5}
                            </Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#94A3B8"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statsScroll: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    minWidth: 70,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: "#6B7280",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  tabText: {
    fontSize: 11,
    color: "#64748B",
  },
  tabTextActive: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  tabBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "#3b82f6",
  },
  tabBadgeText: {
    fontSize: 8,
    color: "#475569",
  },
  tabBadgeTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mayaCardNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  mayaCardNoticeText: {
    fontSize: 10,
    color: "#f97316",
    fontWeight: "500",
  },
  statusNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  statusNoteText: {
    fontSize: 10,
    color: "#f97316",
    flex: 1,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  orderId: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderIdText: {
    fontSize: 10,
    color: "#6B7280",
  },
  metaDot: {
    fontSize: 10,
    color: "#6B7280",
  },
  orderDate: {
    fontSize: 10,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "500",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 10,
    color: "#4B5563",
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  deliveryText: {
    fontSize: 10,
    color: "#4B5563",
  },
  quantityText: {
    fontSize: 10,
    color: "#4B5563",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 10,
    color: "#6B7280",
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  imagesScroll: {
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: "row",
    gap: 4,
  },
  productImageWrapper: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  productImage: {
    width: 40,
    height: 40,
  },
  moreProductsBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  moreProductsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 6,
  },
  noShopText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  shopButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
});