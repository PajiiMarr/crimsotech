import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useLocalSearchParams, router } from "expo-router";
import AxiosInstance from "../../contexts/axios";

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  item_status?: string;
  shop_status?: string;
  product_description: string;
  product_variant: string;
  quantity: number;
  price: string;
  original_price: string;
  subtotal: string;
  status: string;
  purchased_at: string;
  product_images: Array<{
    id: string;
    url: string;
    file_type: string;
  }>;
  primary_image: {
    url: string;
    file_type: string;
  } | null;
  shop_info: {
    id: string;
    name: string;
    picture: string | null;
    description: string;
    items_count: number;
    followers_count: number;
    is_choices: boolean;
    is_new: boolean;
  };
  can_review: boolean;
  can_return: boolean;
  is_refundable: boolean;
  return_deadline: string | null;
  shipping_fee?: string;
  distance_km?: number | null;
  value_added_tax_amount?: string;
}

interface ShippingInfo {
  logistics_carrier: string;
  tracking_number: string | null;
  delivery_method: string;
  estimated_delivery: string | null;
}

interface DeliveryAddress {
  recipient_name: string;
  phone_number: string;
  address: string;
  address_details: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postal_code: string;
  };
}

interface OrderSummary {
  subtotal: string;
  shipping_fee: string;
  shipping_fees_breakdown?: Record<string, number | string>;
  tax: string;
  discount: string;
  total: string;
  payment_fee: string;
  transaction_fee?: string;
  transaction_fee_per_shop?: Record<string, number | string>;
}

interface TimelineEvent {
  event: string;
  date: string | null;
  description: string;
  icon: string;
  color: string;
  completed: boolean;
}

interface OrderData {
  order: {
    id: string;
    status: string;
    status_display: string;
    status_color: string;
    created_at: string;
    updated_at: string | null;
    completed_at: string | null;
    refund_expire_date?: string | null;
    payment_method: string;
    payment_status: string | null;
    delivery_status: string | null;
    delivery_rider: string | null;
    delivery_notes: string | null;
    delivery_date: string | null;
    pickup_expire_date?: string | null;
    pickup_date?: string | null;
    shop_name?: string;
    shop_id?: string;
    metadata?: {
      pickup_code?: string;
      transaction_fee_per_shop?: Record<string, number>;
    };
    shop_statuses?: Record<string, string>;
  };
  shipping_info: ShippingInfo;
  delivery_address: DeliveryAddress;
  items: OrderItem[];
  order_summary: OrderSummary;
  summary_counts: {
    total_items: number;
    total_unique_items: number;
  };
  timeline: TimelineEvent[];
  actions: {
    can_cancel: boolean;
    can_track: boolean;
    can_review: boolean;
    can_return: boolean;
    can_contact_seller: boolean;
    can_buy_again: boolean;
  };
  proof_images?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    uploaded_at: string;
    proof_type?: string;
    proof_type_display?: string;
  }>;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-PH");
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "₱0.00";
  return `₱${numAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type ShopItemGroup = {
  key: string;
  shopId: string;
  shopName: string;
  shopPicture: string | null;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  transactionFee: number;
  total: number;
};

const groupItemsByShop = (
  items: OrderItem[],
  transactionFeePerShop?: Record<string, number | string>,
): ShopItemGroup[] => {
  const grouped = new Map<string, ShopItemGroup>();

  items.forEach((item) => {
    const shopId =
      item.shop_info?.id ||
      item.shop_info?.name ||
      item.checkout_id ||
      "unknown-shop";
    const shopName = item.shop_info?.name || "Unknown Shop";
    const shopPicture = item.shop_info?.picture || null;
    const subtotal = parseFloat(item.subtotal || "0") || 0;
    const shippingFee = parseFloat(item.shipping_fee || "0") || 0;
    const transactionFee = transactionFeePerShop?.[shopId]
      ? parseFloat(String(transactionFeePerShop[shopId]))
      : 0;

    const existing = grouped.get(shopId);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += subtotal;
      existing.shippingFee += shippingFee;
      existing.transactionFee = transactionFee;
      existing.total =
        existing.subtotal + existing.shippingFee + existing.transactionFee;
      return;
    }

    grouped.set(shopId, {
      key: shopId,
      shopId,
      shopName,
      shopPicture,
      items: [item],
      subtotal,
      shippingFee,
      transactionFee,
      total: subtotal + shippingFee + transactionFee,
    });
  });

  return Array.from(grouped.values());
};

export default function ViewTrackOrderPage() {
  const { user, userRole } = useAuth();
  const {
    orderId,
    checkoutId,
    shopId: filterShopId,
    shopName: filterShopName,
  } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [proofs, setProofs] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [centerToastVisible, setCenterToastVisible] = useState(false);
  const [centerToastMessage, setCenterToastMessage] = useState("");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelItemsModalVisible, setCancelItemsModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({});
  const _lastReviewedFetchKey = useRef<string | null>(null);
  const [cancellingItems, setCancellingItems] = useState(false);
  const [refundCountdown, setRefundCountdown] = useState<string | null>(null);
  const getReviewedMapKey = (productId: string) =>
    `${orderId || "unknown-order"}:${productId}`;

  const isFilteringByShop = !!filterShopId;
  const currentItems = orderData?.items || [];

  useEffect(() => {
    if (user?.id && orderId) {
      setReviewedMap({});
      _lastReviewedFetchKey.current = null;
      fetchOrderData();
    }
  }, [user?.id, orderId, checkoutId, filterShopId]);

  const fetchOrderData = async (skipLoading = false) => {
    if (!user?.id || !orderId) {
      if (!skipLoading) setLoading(false);
      return;
    }

    try {
      if (!skipLoading) setLoading(true);
      const response = await AxiosInstance.get(
        `/purchases-buyer/${orderId}/view-order/`,
        {
          headers: {
            "X-User-Id": user.id,
          },
        },
      );

      if (response.data) {
        let data = response.data as any;

        data.items = Array.isArray(data.items)
          ? data.items.map((item: any) => ({
              checkout_id: item.checkout_id || "",
              product_id: item.product_id || "",
              product_name: item.product_name || "Unknown Product",
              product_description: item.product_description || "",
              product_variant: item.product_variant || "",
              quantity: item.quantity ?? 0,
              price: item.price ?? "0",
              original_price: item.original_price ?? "0",
              subtotal: item.subtotal ?? "0",
              status: item.status ?? "",
              item_status: item.item_status || item.status || "pending",
              shop_status: item.shop_status || "pending",
              purchased_at: item.purchased_at ?? null,
              product_images: Array.isArray(item.product_images)
                ? item.product_images
                : [],
              primary_image: item.primary_image || {
                url: null,
                file_type: null,
              },
              shop_info: item.shop_info || {
                id: "",
                name: item.shop_name || "Unknown Shop",
                picture: null,
                description: "",
                items_count: 0,
                followers_count: 0,
                is_choices: false,
                is_new: false,
              },
              can_review: item.can_review ?? false,
              can_return: item.can_return ?? false,
              is_refundable: item.is_refundable ?? false,
              return_deadline: item.return_deadline ?? null,
              shipping_fee: item.shipping_fee ?? "0",
              distance_km: item.distance_km ?? null,
              value_added_tax_amount: item.value_added_tax_amount ?? "0",
            }))
          : [];

        if (filterShopId && data.items) {
          data.items = data.items.filter(
            (item: OrderItem) => item.shop_info?.id === filterShopId,
          );
        }

        data.timeline = Array.isArray(data.timeline) ? data.timeline : [];

        const rawSummary = data.order_summary || {};

        // Get transaction fee per shop from order metadata
        const transactionFeePerShop =
          data.order?.metadata?.transaction_fee_per_shop || {};

        data.order_summary = {
          subtotal: rawSummary.subtotal || "0",
          shipping_fee: rawSummary.shipping_fee || "0",
          shipping_fees_breakdown: rawSummary.shipping_fees_breakdown || {},
          tax: rawSummary.tax || "0",
          discount: rawSummary.discount || "0",
          total: rawSummary.total || "0",
          transaction_fee: rawSummary.transaction_fee || "0",
          payment_fee: rawSummary.payment_fee || "0",
          transaction_fee_per_shop: transactionFeePerShop,
        };

        data.summary_counts = data.summary_counts || {
          total_items: data.items.length || 0,
          total_unique_items: data.items.length || 0,
        };
        data.actions = data.actions || {
          can_cancel: false,
          can_track: false,
          can_review: false,
          can_return: false,
          can_contact_seller: false,
          can_buy_again: false,
        };
        data.shipping_info = data.shipping_info || {
          logistics_carrier: "",
          tracking_number: null,
          delivery_method: "",
          estimated_delivery: null,
        };
        data.delivery_address = data.delivery_address || {
          recipient_name: "",
          phone_number: "",
          address: "",
          address_details: {
            street: "",
            barangay: "",
            city: "",
            province: "",
            postal_code: "",
          },
        };

        if (
          !data.order.shop_name &&
          data.items.length > 0 &&
          data.items[0].shop_info?.name
        ) {
          data.order.shop_name = data.items[0].shop_info.name;
          data.order.shop_id = data.items[0].shop_info.id;
        }

        if (!data.order.pickup_expire_date && data.order.pickup_date) {
          data.order.pickup_expire_date = data.order.pickup_date;
        }

        if (
          filterShopId &&
          data.order.shop_statuses?.[filterShopId as string]
        ) {
          const shopStatus = data.order.shop_statuses[filterShopId as string];
          // Handle both old string format and new object format
          const status = typeof shopStatus === 'string' ? shopStatus : (shopStatus as any).status;
          data.order.status = status;
          data.order.status_display =
            status.charAt(0).toUpperCase() +
            status.slice(1).replace(/_/g, " ");
        }

        setOrderData(data);
        if (data.proof_images && data.proof_images.length > 0) {
          setProofs(data.proof_images);
        } else {
          setProofs([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      if (!skipLoading) {
        Alert.alert(
          "Error",
          error.response?.data?.error || "Failed to load order details",
        );
      }
    } finally {
      if (!skipLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrderData();
  };

  const CancelConfirmationModal = ({
    visible,
    onClose,
    onConfirm,
    orderId,
  }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    orderId: string;
  }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible]);

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.cancelModalOverlay}>
          <Animated.View
            style={[
              styles.cancelModalContainer,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.cancelIconContainer}>
              <View style={styles.cancelIconCircle}>
                <MaterialIcons name="warning" size={40} color="#EA580C" />
              </View>
            </View>

            <Text style={styles.cancelModalTitle}>Cancel Order</Text>

            <Text style={styles.cancelModalMessage}>
              Are you sure you want to cancel this order?
            </Text>

            <Text style={styles.cancelOrderIdText}>
              Order #{orderId.slice(0, 8)}...
            </Text>

            <View style={styles.cancelWarningContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#F59E0B"
              />
              <Text style={styles.cancelWarningText}>
                This action cannot be undone
              </Text>
            </View>

            <View style={styles.cancelButtonsContainer}>
              <TouchableOpacity style={styles.cancelNoButton} onPress={onClose}>
                <Text style={styles.cancelNoButtonText}>No, Keep It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelYesButton}
                onPress={onConfirm}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.cancelYesButtonText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const handleSelectItemToRate = (item: OrderItem) => {
    setRateModalVisible(false);
    router.push({
      pathname: "/customer/rate",
      params: {
        orderId: String(orderId),
        productId: item.product_id,
        productName: item.product_name,
        variantTitle: item.product_variant || "",
        shopId: item.shop_info?.id || "",
        shopName: item.shop_info?.name || "",
      },
    });
  };

  const fetchReviewedStatusForItems = async (items: OrderItem[]) => {
    if (!user?.id) return;

    const toCheck = items.filter((i) => !i.can_review).map((i) => i.product_id);
    if (toCheck.length === 0) return;

    try {
      const key = `${orderId || "unknown-order"}:${toCheck.slice().sort().join(",")}`;
      if (_lastReviewedFetchKey.current === key) return;
      _lastReviewedFetchKey.current = key;
    } catch (e) {
      // fallback: continue
    }

    try {
      const promises = toCheck.map((pid) =>
        AxiosInstance.get("/reviews/", {
          params: { product_id: pid, customer_id: user.id },
          headers: { "X-User-Id": user.id },
        })
          .then((res) => ({ pid, has: !!res.data?.data?.reviews?.length }))
          .catch(() => ({ pid, has: false })),
      );

      const results = await Promise.all(promises);
      setReviewedMap((prev) => {
        const map: Record<string, boolean> = { ...prev };
        results.forEach((r) => {
          map[getReviewedMapKey(r.pid)] = r.has;
        });
        return map;
      });
    } catch (err) {
      console.log("Error checking reviewed status:", err);
    }
  };

  const RateItemModal = ({
    visible,
    onClose,
    items,
  }: {
    visible: boolean;
    onClose: () => void;
    items: OrderItem[];
  }) => {
    useEffect(() => {
      if (visible && items && items.length > 0) {
        const ids = items.map((i) => i.product_id).filter(Boolean);
        const key = `${orderId || "unknown-order"}:${ids.slice().sort().join(",")}`;
        if (_lastReviewedFetchKey.current !== key) {
          fetchReviewedStatusForItems(items);
        }
      }
    }, [visible]);
    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.rateModalOverlay}>
          <View style={styles.rateModalContainer}>
            <View style={styles.rateModalHeader}>
              <Text style={styles.rateModalTitle}>Select item to rate</Text>
              <Text style={styles.rateModalSubtitle}>
                Choose one product from this order. Each item is rated
                separately.
              </Text>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.checkout_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.rateModalList}
              renderItem={({ item }) => {
                const isReviewed =
                  !!reviewedMap[getReviewedMapKey(item.product_id)];
                const imageUrl =
                  item.primary_image?.url ||
                  item.product_images?.[0]?.url ||
                  "https://via.placeholder.com/72";

                return (
                  <TouchableOpacity
                    style={[styles.rateItemRow]}
                    onPress={() => handleSelectItemToRate(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.rateItemImage}
                    />
                    <View style={styles.rateItemInfo}>
                      <Text style={styles.rateItemShop} numberOfLines={1}>
                        {item.shop_info?.name || "Unknown Shop"}
                      </Text>
                      <Text style={styles.rateItemName} numberOfLines={2}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.rateItemMeta} numberOfLines={1}>
                        Qty: {item.quantity}
                        {item.product_variant
                          ? ` • ${item.product_variant}`
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.rateItemRight}>
                      {isReviewed ? (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              styles.rateItemStatus,
                              { color: "#10B981" },
                            ]}
                          >
                            Already rated
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.rateItemStatus}>Rate</Text>
                      )}
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={"#F97316"}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.rateModalEmptyText}>
                  No items available for rating.
                </Text>
              }
            />

            <TouchableOpacity
              style={styles.rateModalCloseButton}
              onPress={onClose}
            >
              <Text style={styles.rateModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const getStatusText = (orderObj: any) => {
    const s = String(orderObj?.status || "").toLowerCase();

    if (
      s === "rider_assigned" &&
      orderData?.order?.delivery_status?.toLowerCase() === "pending"
    ) {
      return "Waiting for rider confirmation";
    }

    if (
      s === "rider_assigned" &&
      orderData?.order?.delivery_status?.toLowerCase() === "accepted"
    ) {
      return "Rider assigned - Waiting for seller to ship the item";
    }
    if (
      s === "waiting_for_rider" &&
      orderData?.order?.delivery_status?.toLowerCase() === "accepted"
    ) {
      return "Waiting for rider to pickup";
    }

    switch (s) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "ready_for_pickup":
        return "Ready for Pickup";
      case "shipped":
        return "Shipped";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      case "refunded":
        return "Refunded";
      case "picked_up":
        return "Picked up";
      case "rider_assigned":
        return "Rider Assigned";
      case "waiting_for_rider":
        return "Waiting for Rider";
      default:
        return orderObj?.status_display || orderObj?.status || "";
    }
  };

  const handleCancelSelectedItems = async (selectedIds: string[]) => {
    const validSelectedIds = selectedIds.filter((id) => {
      const item = orderData?.items.find((i) => i.checkout_id === id);
      return item && item.item_status !== "cancelled";
    });

    if (validSelectedIds.length === 0) {
      Alert.alert(
        "No Items Selected",
        "Please select at least one item that is not already cancelled.",
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setCancellingItems(true);

    try {
      const payload = { checkout_ids: validSelectedIds };

      const response = await AxiosInstance.post(
        `/purchases-buyer/${orderId}/cancel-items/`,
        payload,
        { headers: { "X-User-Id": user.id } },
      );

      if (response.data.success) {
        setCancelItemsModalVisible(false);
        await fetchOrderData();

        setCenterToastMessage(
          `${validSelectedIds.length} item(s) cancelled successfully`,
        );
        setCenterToastVisible(true);

        setTimeout(() => {
          setCenterToastVisible(false);
        }, 2000);
      } else {
        setCenterToastMessage(
          response.data.message || "Failed to cancel items",
        );
        setCenterToastVisible(true);
        setTimeout(() => {
          setCenterToastVisible(false);
        }, 2000);
      }
    } catch (error: any) {
      setCenterToastMessage(
        error.response?.data?.error || "Failed to cancel items",
      );
      setCenterToastVisible(true);
      setTimeout(() => {
        setCenterToastVisible(false);
      }, 2000);
    } finally {
      setCancellingItems(false);
    }
  };

  const handleCancelOrder = () => {
    if (!orderId || !user?.id) {
      Alert.alert("Error", "Unable to cancel order");
      return;
    }
    setCancelItemsModalVisible(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderId || !user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setCancelModalVisible(false);

    try {
      const response = await AxiosInstance.post(
        `/purchases-buyer/${orderId}/cancel/`,
        null,
        {
          headers: {
            "X-User-Id": user.id,
          },
        },
      );

      if (response.data.success) {
        setCenterToastMessage("Order cancelled successfully");
        setCenterToastVisible(true);

        setTimeout(() => {
          fetchOrderData();
        }, 500);
      }
    } catch (error: any) {
      setCenterToastMessage(
        error.response?.data?.error || "Failed to cancel order",
      );
      setCenterToastVisible(true);
    }
  };

  const handleOrderReceived = async () => {
    if (!orderId || !user?.id) return;

    const isShopSpecific = isFilteringByShop && filterShopId;
    const shopId = isShopSpecific ? filterShopId : null;

    Alert.alert(
      "Confirm Order Received",
      isShopSpecific
        ? `Have you received this order from ${filterShopName}? This will mark it as completed.`
        : "Have you received your order? This will mark the order as completed.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              let response;

              if (isShopSpecific && shopId) {
                const shopCheckout = orderData?.items.find(
                  (item) => item.shop_info?.id === shopId,
                );
                if (!shopCheckout) {
                  Alert.alert("Error", "Could not find items for this shop");
                  return;
                }

                response = await AxiosInstance.post(
                  `/purchases-buyer/${orderId}/complete-shop-item/`,
                  {
                    checkout_id: shopCheckout.checkout_id,
                    shop_id: shopId,
                  },
                  { headers: { "X-User-Id": user.id } },
                );
              } else {
                response = await AxiosInstance.patch(
                  `/purchases-buyer/${orderId}/complete/`,
                  {},
                  { headers: { "X-User-Id": user.id } },
                );
              }

              if (response.data.success) {
                setCenterToastMessage(
                  isShopSpecific
                    ? `Order from ${filterShopName} marked as completed`
                    : "Order marked as completed successfully",
                );
                setCenterToastVisible(true);
                fetchOrderData();
              } else {
                Alert.alert(
                  "Error",
                  response.data.message || "Failed to complete order",
                );
              }
            } catch (error: any) {
              console.error("Error completing order:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to complete order",
              );
            }
          },
        },
      ],
    );
  };

  const renderProofOfDelivery = () => {
    if (orderData?.order?.status !== "delivered") return null;

    const proofs = orderData?.proof_images || [];
    if (proofs.length === 0) return null;

    return (
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="photo-camera" size={20} color="#111827" />
          <Text style={styles.cardTitle}>Proof of Delivery</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.proofGrid}>
            {proofs.map((proof) => (
              <TouchableOpacity
                key={proof.id}
                onPress={() => {
                  setSelectedImage(proof.file_url);
                  setPreviewVisible(true);
                }}
              >
                <Image
                  source={{ uri: proof.file_url }}
                  style={styles.proofImage}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderRiderInfo = () => {
    if (orderData?.order?.status !== "delivered") return null;
    if (!orderData?.order?.delivery_rider) return null;

    const riderPhone =
      (orderData?.order as any)?.delivery_rider_phone ||
      orderData?.delivery_address?.phone_number ||
      null;

    return (
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="motorbike" size={20} color="#111827" />
          <Text style={styles.cardTitle}>Rider Information</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.riderInfoRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.riderName}>
              {orderData.order.delivery_rider}
            </Text>
          </View>
          {riderPhone && (
            <View style={styles.riderInfoRow}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
              <Text style={styles.riderPhone}>{riderPhone}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const CancelItemsModal = ({
    visible,
    onClose,
    onConfirm,
    items,
    loading,
  }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    items: OrderItem[];
    loading: boolean;
  }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [localSelectedItems, setLocalSelectedItems] = useState<Set<string>>(
      new Set(),
    );

    const cancellableItems = items.filter(
      (item) => item.shop_status === "pending",
    );
    const cancelledItems = items.filter(
      (item) => item.shop_status === "cancelled",
    );
    const nonCancellableItems = items.filter(
      (item) =>
        item.shop_status !== "pending" &&
        item.shop_status !== "cancelled" &&
        item.shop_status !== "delivered" &&
        item.shop_status !== "completed",
    );

    useEffect(() => {
      if (visible) {
        setLocalSelectedItems(new Set());
      }
    }, [visible]);

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible]);

    const toggleItem = (checkoutId: string) => {
      setLocalSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(checkoutId)) {
          newSet.delete(checkoutId);
        } else {
          newSet.add(checkoutId);
        }
        return newSet;
      });
    };

    const handleConfirm = () => {
      onConfirm(Array.from(localSelectedItems));
    };

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.cancelModalOverlay}>
          <Animated.View
            style={[
              styles.cancelItemsModalContainer,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>
                Select Items to Cancel
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelModalSubtitle}>
              Choose which items you want to cancel from this order
            </Text>

            <ScrollView
              style={styles.cancelItemsList}
              showsVerticalScrollIndicator={false}
            >
              {cancellableItems.length > 0 && (
                <>
                  <Text style={styles.cancelSectionTitle}>
                    Available to Cancel
                  </Text>
                  {cancellableItems.map((item) => {
                    const isSelected = localSelectedItems.has(item.checkout_id);
                    const imageUrl =
                      item.primary_image?.url ||
                      (item.product_images && item.product_images[0]?.url) ||
                      "https://via.placeholder.com/50";

                    return (
                      <TouchableOpacity
                        key={item.checkout_id}
                        style={[
                          styles.cancelItemCard,
                          isSelected && styles.cancelItemCardSelected,
                        ]}
                        onPress={() => toggleItem(item.checkout_id)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.cancelItemImage}
                        />
                        <View style={styles.cancelItemDetails}>
                          <Text style={styles.cancelItemName} numberOfLines={2}>
                            {item.product_name}
                          </Text>
                          {item.product_variant ? (
                            <Text
                              style={styles.cancelItemVariant}
                              numberOfLines={1}
                            >
                              {item.product_variant}
                            </Text>
                          ) : null}
                          <View style={styles.cancelItemMeta}>
                            <Text style={styles.cancelItemQuantity}>
                              Qty: {item.quantity}
                            </Text>
                            <Text style={styles.cancelItemPrice}>
                              {formatCurrency(item.price)}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.cancelItemCheckbox,
                            isSelected && styles.cancelItemCheckboxSelected,
                          ]}
                        >
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {nonCancellableItems.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.cancelSectionTitle,
                      styles.cancelSectionTitleDisabled,
                    ]}
                  >
                    Cannot Cancel (Already Processing)
                  </Text>
                  {nonCancellableItems.map((item) => {
                    const imageUrl =
                      item.primary_image?.url ||
                      (item.product_images && item.product_images[0]?.url) ||
                      "https://via.placeholder.com/50";

                    const getStatusReason = () => {
                      switch (item.shop_status) {
                        case "processing":
                          return "Already being processed by seller";
                        case "rider_assigned":
                          return "Rider already assigned";
                        case "shipped":
                          return "Item already shipped";
                        case "to_deliver":
                          return "Out for delivery";
                        case "delivered":
                          return "Item already delivered";
                        case "completed":
                          return "Order completed";
                        default:
                          return `Status: ${item.shop_status}`;
                      }
                    };

                    return (
                      <View
                        key={item.checkout_id}
                        style={[
                          styles.cancelItemCard,
                          styles.cancelItemCardDisabled,
                        ]}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={[
                            styles.cancelItemImage,
                            styles.cancelItemImageDisabled,
                          ]}
                        />
                        <View style={styles.cancelItemDetails}>
                          <Text
                            style={[
                              styles.cancelItemName,
                              styles.cancelItemTextDisabled,
                            ]}
                            numberOfLines={2}
                          >
                            {item.product_name}
                          </Text>
                          {item.product_variant ? (
                            <Text
                              style={[
                                styles.cancelItemVariant,
                                styles.cancelItemTextDisabled,
                              ]}
                              numberOfLines={1}
                            >
                              {item.product_variant}
                            </Text>
                          ) : null}
                          <View style={styles.cancelItemMeta}>
                            <Text
                              style={[
                                styles.cancelItemQuantity,
                                styles.cancelItemTextDisabled,
                              ]}
                            >
                              Qty: {item.quantity}
                            </Text>
                            <Text
                              style={[
                                styles.cancelItemPrice,
                                styles.cancelItemTextDisabled,
                              ]}
                            >
                              {formatCurrency(item.price)}
                            </Text>
                          </View>
                          <Text style={styles.cancelReasonText}>
                            {getStatusReason()}
                          </Text>
                        </View>
                        <View style={styles.cancelItemBlockedIcon}>
                          <MaterialIcons
                            name="block"
                            size={20}
                            color="#9CA3AF"
                          />
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {cancelledItems.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.cancelSectionTitle,
                      styles.cancelSectionTitleDisabled,
                    ]}
                  >
                    Already Cancelled
                  </Text>
                  {cancelledItems.map((item) => {
                    const imageUrl =
                      item.primary_image?.url ||
                      (item.product_images && item.product_images[0]?.url) ||
                      "https://via.placeholder.com/50";

                    return (
                      <View
                        key={item.checkout_id}
                        style={[
                          styles.cancelItemCard,
                          styles.cancelItemCardDisabled,
                        ]}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={[
                            styles.cancelItemImage,
                            styles.cancelItemImageDisabled,
                          ]}
                        />
                        <View style={styles.cancelItemDetails}>
                          <Text
                            style={[
                              styles.cancelItemName,
                              styles.cancelItemTextDisabled,
                            ]}
                            numberOfLines={2}
                          >
                            {item.product_name}
                          </Text>
                          {item.product_variant ? (
                            <Text
                              style={[
                                styles.cancelItemVariant,
                                styles.cancelItemTextDisabled,
                              ]}
                              numberOfLines={1}
                            >
                              {item.product_variant}
                            </Text>
                          ) : null}
                          <View style={styles.cancelItemMeta}>
                            <Text
                              style={[
                                styles.cancelItemQuantity,
                                styles.cancelItemTextDisabled,
                              ]}
                            >
                              Qty: {item.quantity}
                            </Text>
                            <Text
                              style={[
                                styles.cancelItemPrice,
                                styles.cancelItemTextDisabled,
                              ]}
                            >
                              {formatCurrency(item.price)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cancelledBadge}>
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.cancelledBadgeText}>
                            Cancelled
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {cancellableItems.length === 0 &&
                cancelledItems.length === 0 &&
                nonCancellableItems.length === 0 && (
                  <View style={styles.noCancelItemsContainer}>
                    <MaterialIcons
                      name="info-outline"
                      size={48}
                      color="#9CA3AF"
                    />
                    <Text style={styles.noCancelItemsText}>
                      No items available to cancel
                    </Text>
                    <Text style={styles.noCancelItemsSubtext}>
                      Items that are already processing, shipped, or delivered
                      cannot be cancelled.
                    </Text>
                  </View>
                )}
            </ScrollView>

            <View style={styles.cancelItemsFooter}>
              <View style={styles.cancelItemsSummary}>
                <Text style={styles.cancelItemsCount}>
                  {localSelectedItems.size} item(s) selected
                </Text>
              </View>

              <View style={styles.cancelButtonsContainer}>
                <TouchableOpacity
                  style={styles.cancelNoButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelNoButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cancelYesButton,
                    (localSelectedItems.size === 0 || loading) &&
                      styles.cancelYesButtonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={localSelectedItems.size === 0 || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.cancelYesButtonText}>
                        Cancel{" "}
                        {localSelectedItems.size > 0
                          ? `(${localSelectedItems.size})`
                          : ""}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const CenterToast = ({
    visible,
    message,
    iconName = "checkmark-circle",
    onHide,
  }: {
    visible: boolean;
    message: string;
    iconName?: string;
    onHide: () => void;
  }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
      if (visible) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        timeoutRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.spring(scale, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onHide();
            timeoutRef.current = null;
          });
        }, 1500);

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }
    }, [visible]);

    if (!visible) return null;

    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale }],
            opacity,
          }}
        >
          <Ionicons name={iconName as any} size={48} color="#EA580C" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#EA580C",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {message}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const calculateRefundCountdown = () => {
    let refundExpireDate: string | null = null;

    // If filtering by shop, look for refund_expire_date in shop statuses
    if (isFilteringByShop && filterShopId) {
      const shopStatuses = orderData?.order?.shop_statuses;
      if (shopStatuses && typeof shopStatuses === 'object') {
        const shopStatus = (shopStatuses as any)[filterShopId as string];
        if (shopStatus && typeof shopStatus === 'object' && shopStatus.refund_expire_date) {
          refundExpireDate = shopStatus.refund_expire_date;
        }
      }
    } else {
      // Otherwise check order-level refund_expire_date
      refundExpireDate = orderData?.order?.refund_expire_date || null;
    }

    if (!refundExpireDate) {
      console.log("⏳ No refund_expire_date found");
      setRefundCountdown(null);
      return;
    }

    console.log("⏳ Refund expire date:", refundExpireDate);
    const expireDate = new Date(refundExpireDate);
    const now = new Date();
    const timeDiff = expireDate.getTime() - now.getTime();
    console.log("⏳ Time diff (ms):", timeDiff);

    if (timeDiff <= 0) {
      console.log("⏳ Refund expired");
      setRefundCountdown("Expired");
      return;
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    let countdown = "";
    if (days > 0) {
      countdown = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      countdown = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      countdown = `${minutes}m ${seconds}s`;
    } else {
      countdown = `${seconds}s`;
    }
    console.log("⏳ Countdown updated:", countdown);
    setRefundCountdown(countdown);
  };

  useEffect(() => {
    calculateRefundCountdown();
    const timer = setInterval(calculateRefundCountdown, 1000);
    return () => clearInterval(timer);
  }, [orderData?.order?.refund_expire_date, orderData?.order?.shop_statuses, filterShopId]);

  const handleReturnItem = (
    checkoutId: string,
    productName: string,
    shopId: string,
  ) => {
    Alert.alert(
      "Request Return/Refund",
      `Do you want to request a return or refund for "${productName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            router.push(
              `/customer/request-refund?orderId=${orderId}&checkoutId=${checkoutId}&shopId=${shopId}`,
            );
          },
        },
      ],
    );
  };

  const handleRateItem = (item: OrderItem) => {
    router.push({
      pathname: "/customer/rate",
      params: {
        orderId: String(orderId),
        productId: item.product_id,
        productName: item.product_name,
        variantTitle: item.product_variant || "",
        checkoutId: item.checkout_id,
        shopId: item.shop_info?.id || "",
        shopName: item.shop_info?.name || "",
      },
    });
  };

  const handleTrackOrder = () => {
    if (!orderId) {
      Alert.alert("Error", "Order ID not available");
      return;
    }
    router.push(`/customer/components/shipping-timeline?orderId=${orderId}`);
  };

  const handleReceiveItem = async (checkoutId: string, shopId: string) => {
    Alert.alert(
      "Confirm Order Received",
      "Have you received this item? This will mark it as completed.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const response = await AxiosInstance.post(
                `/purchases-buyer/${orderId}/complete-shop-item/`,
                { checkout_id: checkoutId, shop_id: shopId },
                { headers: { "X-User-Id": user?.id } },
              );

              if (response.data.success) {
                setCenterToastMessage("Item marked as received");
                setCenterToastVisible(true);
                fetchOrderData();
              }
            } catch (error: any) {
              setCenterToastMessage(error.response?.data?.message || "Failed");
              setCenterToastVisible(true);
            }
          },
        },
      ],
    );
  };

  if (userRole && userRole !== "customer") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    order,
    shipping_info,
    delivery_address,
    items,
    order_summary,
    timeline,
    actions,
  } = orderData;

  const orderStatusLower = String(order?.status || "").toLowerCase();

  const transactionFeePerShop = order_summary.transaction_fee_per_shop || {};
  const groupedItemsByShop = !isFilteringByShop
    ? groupItemsByShop(items, transactionFeePerShop)
    : [];
  const isSingleShop = isFilteringByShop || groupedItemsByShop.length === 1;
  const currentShopName = isFilteringByShop
    ? filterShopName
    : groupedItemsByShop[0]?.shopName || null;

  return (
    <View style={styles.container}>
      <CenterToast
        visible={centerToastVisible}
        message={centerToastMessage}
        iconName="checkmark-circle"
        onHide={() => setCenterToastVisible(false)}
      />
      <CancelConfirmationModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={confirmCancelOrder}
        orderId={orderId as string}
      />

      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFilteringByShop
              ? `Order from ${filterShopName}`
              : "Order Detail"}
          </Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#F97316"]}
            tintColor="#F97316"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {(() => {
          const deliveryDateDisplay = order.delivery_date
            ? formatDate(order.delivery_date)
            : null;
          const statusColor = order?.status_color || "#F97316";
          const baseStyle = [
            styles.statusBanner,
            { backgroundColor: `${statusColor}20` },
          ];
          const statusLower = String(order?.status || "").toLowerCase();
          const deliveryStatusLower = String(
            order?.delivery_status || "",
          ).toLowerCase();

          if (
            statusLower === "rider_assigned" &&
            deliveryStatusLower === "pending"
          ) {
            const riderColor = "#F59E0B";
            return (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: `${riderColor}20` },
                ]}
              >
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={20}
                      color={riderColor}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: riderColor, marginLeft: 8 },
                      ]}
                    >
                      Waiting for rider confirmation
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    A rider has been assigned to your order. Waiting for the
                    rider to confirm the pickup.
                  </Text>
                </View>
              </View>
            );
          }

          if (
            statusLower === "rider_assigned" &&
            deliveryStatusLower === "accepted"
          ) {
            const riderAcceptedColor = "#3B82F6";
            return (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: `${riderAcceptedColor}20` },
                ]}
              >
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={20}
                      color={riderAcceptedColor}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: riderAcceptedColor, marginLeft: 8 },
                      ]}
                    >
                      Rider assigned - Waiting for seller to ship
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    The rider has accepted the delivery request. The seller will
                    now prepare and ship your item.
                  </Text>
                </View>
              </View>
            );
          }

          if (
            statusLower === "waiting_for_rider" &&
            deliveryStatusLower === "accepted"
          ) {
            const waitingForRiderColor = "#8B5CF6";
            return (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: `${waitingForRiderColor}20` },
                ]}
              >
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={20}
                      color={waitingForRiderColor}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: waitingForRiderColor, marginLeft: 8 },
                      ]}
                    >
                      Waiting for rider to pickup
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    Your order is ready. Waiting for the rider to pick up the
                    item for delivery.
                  </Text>
                </View>
              </View>
            );
          }

          if (statusLower === "shipped") {
            const shippedColor = "#2d49d7";
            return (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: `${shippedColor}20` },
                ]}
              >
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name="package-variant-closed"
                      size={20}
                      color={shippedColor}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: shippedColor, marginLeft: 8 },
                      ]}
                    >
                      Item has been shipped
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    Your item has been shipped. The rider is on the way to
                    deliver your item.
                  </Text>
                </View>
              </View>
            );
          }

          if (String(order?.status || "").toLowerCase() === "pending") {
            return (
              <View style={baseStyle}>
                <View style={{ flex: 1 }}>
                  <View style={styles.statusRow}>
                    <Ionicons
                      name="time"
                      size={18}
                      color={order.status_color}
                    />
                    <Text style={[styles.statusText, { color: order.status_color }]}>
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    Awaiting confirmation from the seller. We will notify you once processing starts.
                  </Text>
                </View>
              </View>
            );
          }

          if (
            statusLower === "processing" ||
            statusLower === "ready_for_pickup"
          ) {
            const isReadyForPickup = statusLower === "ready_for_pickup";
            const deliveryMethodRaw = String(
              shipping_info?.delivery_method || "",
            ).toLowerCase();
            const isPickup = deliveryMethodRaw.includes("pickup");

            if (isReadyForPickup && isPickup) {
              const pickupColor = "#F59E0B";
              const pickupExpireDate =
                order?.pickup_expire_date || order?.pickup_date;
              const formattedExpireDate = pickupExpireDate
                ? formatDate(pickupExpireDate)
                : null;
              const pickupCode = order?.metadata?.pickup_code;

              return (
                <View
                  style={[
                    styles.statusBanner,
                    { backgroundColor: `${pickupColor}20` },
                  ]}
                >
                  <View>
                    <View style={styles.statusRow}>
                      <MaterialCommunityIcons
                        name="store-outline"
                        size={20}
                        color={pickupColor}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: pickupColor, marginLeft: 8 },
                        ]}
                      >
                        Ready for Pickup
                      </Text>
                    </View>
                    <Text style={styles.subStatusText}>
                      Your order is ready to pickup. Please collect it from the
                      store{formattedExpireDate ? ` before ` : "."}
                      {formattedExpireDate && (
                        <Text style={styles.boldDateText}>
                          {formattedExpireDate}
                        </Text>
                      )}
                      {formattedExpireDate && "."}
                    </Text>
                    {pickupCode && (
                      <View style={styles.pickupCodeContainer}>
                        <MaterialCommunityIcons
                          name="qrcode"
                          size={16}
                          color="#F59E0B"
                        />
                        <Text style={styles.pickupCodeText}>
                          Pickup Code:{" "}
                          <Text style={styles.pickupCodeValue}>
                            {pickupCode}
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            return (
              <View style={baseStyle}>
                <View>
                  <View style={styles.statusRow}>
                    {isReadyForPickup ? (
                      <MaterialCommunityIcons
                        name="store-outline"
                        size={20}
                        color={order.status_color}
                      />
                    ) : (
                      <Ionicons
                        name="time"
                        size={18}
                        color={order.status_color}
                      />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        { color: order.status_color, marginLeft: 8 },
                      ]}
                    >
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    {isReadyForPickup
                      ? "Your order is ready for pickup. Please collect it from the store. Contact the seller for pickup instructions."
                      : "Your order is being processed by the seller."}
                  </Text>
                </View>
              </View>
            );
          }

          if (statusLower === "picked_up") {
            const deliveryMethodRawForPicked = String(
              shipping_info?.delivery_method || "",
            ).toLowerCase();
            const isPickupForPicked =
              deliveryMethodRawForPicked.includes("pickup");
            const pickupDateDisplay = order?.pickup_date
              ? formatDateTime(order.pickup_date)
              : null;
            const pickedUpColor = "#10B981";

            return (
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: `${pickedUpColor}20` },
                ]}
              >
                <View>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons
                      name="store-check-outline"
                      size={20}
                      color={pickedUpColor}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: pickedUpColor, marginLeft: 8 },
                      ]}
                    >
                      {getStatusText(order)}
                    </Text>
                  </View>
                  <Text style={styles.subStatusText}>
                    {isPickupForPicked
                      ? `Your order has been picked up from the store${pickupDateDisplay ? " on " : "."}`
                      : `Your order has been picked up${pickupDateDisplay ? " on " : "."}`}
                    {pickupDateDisplay && (
                      <Text style={styles.boldDateText}>
                        {pickupDateDisplay}
                      </Text>
                    )}
                    {pickupDateDisplay && "."}
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View style={baseStyle}>
              <View>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={
                      order.status === "delivered" ? "checkmark-circle" : "time"
                    }
                    size={18}
                    color={order.status_color}
                  />
                  <Text
                    style={[styles.statusText, { color: order.status_color }]}
                  >
                    {getStatusText(order)}
                    {deliveryDateDisplay ? `: ${deliveryDateDisplay}` : ""}
                  </Text>
                </View>
                {order.status === "delivered" && items[0]?.return_deadline && (
                  <Text style={styles.subStatusText}>
                    Returnable time: before{" "}
                    {formatDateTime(items[0]?.return_deadline || "")}
                  </Text>
                )}
              </View>
            </View>
          );
        })()}

        {renderRiderInfo()}
        {renderProofOfDelivery()}

        {(() => {
          const deliveryMethodRaw = String(
            shipping_info?.delivery_method || "",
          ).toLowerCase();
          const isPickup = deliveryMethodRaw.includes("pickup");

          if (isPickup) {
            return (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="store-outline"
                    size={20}
                    color="#111827"
                  />
                  <Text style={styles.cardTitle}>Pickup Location</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.recipientName}>
                    {delivery_address.recipient_name ||
                      order?.shop_name ||
                      "Store Pickup"}
                  </Text>
                  {delivery_address.phone_number ? (
                    <Text style={styles.phoneNumber}>
                      {delivery_address.phone_number}
                    </Text>
                  ) : null}
                  <Text style={styles.addressText}>
                    {delivery_address.address ||
                      `${delivery_address.address_details?.street || ""}${delivery_address.address_details?.barangay ? ", " + delivery_address.address_details.barangay : ""}${delivery_address.address_details?.city ? ", " + delivery_address.address_details.city : ""}${delivery_address.address_details?.province ? ", " + delivery_address.address_details.province : ""}`.replace(
                        /^,\s*/,
                        "",
                      ) ||
                      "Pickup address not provided"}
                  </Text>

                  {orderStatusLower === "picked_up" && order?.pickup_date && (
                    <View style={{ marginTop: 8, paddingLeft: 4 }}>
                      <Text style={styles.pickupLabel}>Picked up</Text>
                      <Text style={styles.pickupValue}>
                        {formatDateTime(order.pickup_date)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }

          return (
            <>
              <TouchableOpacity
                style={styles.infoCard}
                activeOpacity={0.7}
                onPress={handleTrackOrder}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons
                      name="truck-delivery-outline"
                      size={20}
                      color="#111827"
                    />
                    <Text style={styles.cardTitle}>Shipping Information</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.shippingRow}>
                    <Text style={styles.shippingLabel}>Logistics Carrier:</Text>
                    <Text style={styles.shippingValue}>
                      {shipping_info.logistics_carrier || "N/A"}
                    </Text>
                  </View>
                  {shipping_info.estimated_delivery && (
                    <View style={styles.shippingRow}>
                      <Text style={styles.shippingLabel}>
                        Estimated Delivery:
                      </Text>
                      <Text style={styles.shippingValue}>
                        {shipping_info.estimated_delivery}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={20}
                    color="#111827"
                  />
                  <Text style={styles.cardTitle}>Delivery Address</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.recipientName}>
                    {delivery_address.recipient_name}
                    <Text style={styles.phoneNumber}>
                      {" "}
                      ({delivery_address.phone_number})
                    </Text>
                  </Text>
                  <Text style={styles.addressText}>
                    {delivery_address.address}
                  </Text>
                </View>
              </View>
            </>
          );
        })()}

        {orderStatusLower === "completed" && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="check-circle" size={20} color="#10B981" />
              <Text style={styles.cardTitle}>Order Completed</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.completedRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.completedLabel}>Completed on:</Text>
                <Text style={styles.completedValue}>
                  {order.completed_at
                    ? formatDateTime(order.completed_at)
                    : formatDateTime(order.updated_at)}
                </Text>
              </View>

              {order.refund_expire_date !== null &&
                order.refund_expire_date !== undefined &&
                order.refund_expire_date !== "" &&
                (() => {
                  const refundDate = order.refund_expire_date!;
                  const isExpired = new Date(refundDate) < new Date();
                  return (
                    <View style={styles.refundExpireRow}>
                      <MaterialIcons name="receipt" size={16} color="#6B7280" />
                      <Text style={styles.refundExpireLabel}>
                        Refundable until:
                      </Text>
                      <Text
                        style={[
                          styles.refundExpireValue,
                          isExpired && styles.refundExpiredValue,
                        ]}
                      >
                        {formatDateTime(refundDate)}
                        {isExpired && " (Expired)"}
                      </Text>
                    </View>
                  );
                })()}

              <View style={styles.completedMessageContainer}>
                <Ionicons name="happy-outline" size={20} color="#10B981" />
                <Text style={styles.completedMessage}>
                  Your order has been successfully completed! Thank you for
                  shopping with us.
                </Text>
              </View>
            </View>
          </View>
        )}

        {isFilteringByShop ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="storefront" size={20} color="#111827" />
              <Text style={styles.cardTitle}>Items from {filterShopName}</Text>
            </View>

            <View style={styles.groupItemsContainer}>
              {items.map((item) => {
                const shopId = item.shop_info?.id;
                const transactionFee = transactionFeePerShop[shopId]
                  ? parseFloat(String(transactionFeePerShop[shopId]))
                  : 0;
                const subtotal = parseFloat(item.subtotal) || 0;
                const shippingFee = parseFloat(item.shipping_fee || "0") || 0;
                const itemTotal = subtotal + shippingFee + transactionFee;

                return (
                  <View
                    key={item.checkout_id}
                    style={[
                      styles.groupItemRow,
                      item.shop_status === "cancelled" &&
                        styles.cancelledProductCard,
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          item.primary_image?.url ||
                          "https://via.placeholder.com/80",
                      }}
                      style={[
                        styles.groupItemImage,
                        item.shop_status === "cancelled" &&
                          styles.cancelledImage,
                      ]}
                    />
                    <View style={styles.groupItemDetails}>
                      <Text
                        style={[
                          styles.groupItemName,
                          item.shop_status === "cancelled" &&
                            styles.cancelledText,
                        ]}
                        numberOfLines={2}
                      >
                        {item.product_name}
                      </Text>
                      <Text
                        style={[
                          styles.groupItemMeta,
                          item.shop_status === "cancelled" &&
                            styles.cancelledText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.product_variant}
                      </Text>
                      <Text
                        style={[
                          styles.groupItemMeta,
                          item.shop_status === "cancelled" &&
                            styles.cancelledText,
                        ]}
                      >
                        Quantity: {formatNumber(item.quantity)}
                      </Text>

                      {item.shop_status && (
                        <Text
                          style={[
                            styles.groupItemStatus,
                            item.shop_status === "delivered" && {
                              color: "#10B981",
                            },
                            item.shop_status === "completed" && {
                              color: "#10B981",
                            },
                            item.shop_status === "shipped" && {
                              color: "#3B82F6",
                            },
                            item.shop_status === "pending" && {
                              color: "#F59E0B",
                            },
                            item.shop_status === "cancelled" && {
                              color: "#EF4444",
                            },
                          ]}
                        >
                          Status:{" "}
                          {item.shop_status.charAt(0).toUpperCase() +
                            item.shop_status.slice(1).replace(/_/g, " ")}
                        </Text>
                      )}
                    </View>
                    <View style={styles.groupItemPriceContainer}>
                      <Text style={styles.currentPrice}>
                        {formatCurrency(item.price)}
                      </Text>
                      <Text style={styles.groupItemSubtotal}>
                        {formatCurrency(item.subtotal)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.shopGroupsContainer}>
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="storefront" size={20} color="#111827" />
                <Text style={styles.cardTitle}>
                  Shops in this order ({groupedItemsByShop.length})
                </Text>
              </View>

              {groupedItemsByShop.map((group) => (
                <View key={group.key} style={styles.shopGroupCard}>
                  <TouchableOpacity
                    style={styles.storeHeader}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/customer/view-shop",
                        params: { shopId: group.shopId },
                      })
                    }
                  >
                    {group.shopPicture ? (
                      <Image
                        source={{ uri: group.shopPicture }}
                        style={styles.storeLogo}
                      />
                    ) : (
                      <View style={styles.storeLogo}>
                        <Text style={styles.logoText}>
                          {group.shopName.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.storeInfo}>
                      <View style={styles.storeTitleRow}>
                        <Text style={styles.storeName} numberOfLines={1}>
                          {group.shopName}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#9CA3AF"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.groupItemsContainer}>
                    {group.items.map((item) => (
                      <View
                        key={item.checkout_id}
                        style={[
                          styles.groupItemRow,
                          item.shop_status === "cancelled" &&
                            styles.cancelledProductCard,
                        ]}
                      >
                        <Image
                          source={{
                            uri:
                              item.primary_image?.url ||
                              "https://via.placeholder.com/80",
                          }}
                          style={[
                            styles.groupItemImage,
                            item.shop_status === "cancelled" &&
                              styles.cancelledImage,
                          ]}
                        />
                        <View style={styles.groupItemDetails}>
                          <Text
                            style={[
                              styles.groupItemName,
                              item.shop_status === "cancelled" &&
                                styles.cancelledText,
                            ]}
                            numberOfLines={2}
                          >
                            {item.product_name}
                          </Text>
                          <Text
                            style={[
                              styles.groupItemMeta,
                              item.shop_status === "cancelled" &&
                                styles.cancelledText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.product_variant}
                          </Text>
                          <Text
                            style={[
                              styles.groupItemMeta,
                              item.shop_status === "cancelled" &&
                                styles.cancelledText,
                            ]}
                          >
                            Quantity: {formatNumber(item.quantity)}
                          </Text>

                          {item.shop_status && (
                            <Text
                              style={[
                                styles.groupItemStatus,
                                item.shop_status === "delivered" && {
                                  color: "#10B981",
                                },
                                item.shop_status === "completed" && {
                                  color: "#10B981",
                                },
                                item.shop_status === "shipped" && {
                                  color: "#3B82F6",
                                },
                                item.shop_status === "pending" && {
                                  color: "#F59E0B",
                                },
                                item.shop_status === "cancelled" && {
                                  color: "#EF4444",
                                },
                              ]}
                            >
                              Status:{" "}
                              {item.shop_status.charAt(0).toUpperCase() +
                                item.shop_status.slice(1).replace(/_/g, " ")}
                            </Text>
                          )}

                          {/* Item Action Buttons */}
                          {item.shop_status === "delivered" && (
                            <View style={styles.itemActionButtonsContainer}>
                              <TouchableOpacity
                                style={styles.receiveItemButton}
                                onPress={() =>
                                  handleReceiveItem(
                                    item.checkout_id,
                                    item.shop_info?.id,
                                  )
                                }
                              >
                                <MaterialIcons
                                  name="check-circle"
                                  size={14}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.receiveItemButtonText}>
                                  Order Received
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {item.shop_status === "completed" && (
                            <View style={styles.itemActionButtonsContainer}>
                              {item.can_return && item.is_refundable && (
                                <TouchableOpacity
                                  style={styles.returnItemButton}
                                  onPress={() =>
                                    handleReturnItem(
                                      item.checkout_id,
                                      item.product_name,
                                      item.shop_info?.id || "",
                                    )
                                  }
                                >
                                  <MaterialIcons
                                    name="receipt"
                                    size={14}
                                    color="#EF4444"
                                  />
                                  <Text style={styles.returnItemButtonText}>
                                    Request Refund
                                    {refundCountdown && refundCountdown !== "Expired" && (
                                      <Text style={{fontSize: 10, color: '#EF4444'}}>
                                        {"\n"}({refundCountdown})
                                      </Text>
                                    )}
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {item.can_review && (
                                <TouchableOpacity
                                  style={styles.rateItemButton}
                                  onPress={() => handleRateItem(item)}
                                >
                                  <MaterialIcons
                                    name="star"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                  <Text style={styles.rateItemButtonText}>
                                    Rate
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                        <View style={styles.groupItemPriceContainer}>
                          <Text
                            style={[
                              styles.currentPrice,
                              item.shop_status === "cancelled" &&
                                styles.cancelledPrice,
                            ]}
                          >
                            {formatCurrency(item.price)}
                          </Text>
                          <Text
                            style={[
                              styles.groupItemSubtotal,
                              item.shop_status === "cancelled" &&
                                styles.cancelledText,
                            ]}
                          >
                            {formatCurrency(item.subtotal)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Shop Summary Row */}
                  <View style={styles.shopSummaryContainer}>
                    <View style={styles.shopSummaryRow}>
                      <Text style={styles.shopSummaryLabel}>Subtotal</Text>
                      <Text style={styles.shopSummaryValue}>
                        {formatCurrency(group.subtotal)}
                      </Text>
                    </View>
                    <View style={styles.shopSummaryRow}>
                      <Text style={styles.shopSummaryLabel}>Shipping Fee</Text>
                      <Text style={styles.shopSummaryValue}>
                        {formatCurrency(group.shippingFee)}
                      </Text>
                    </View>
                    {group.transactionFee > 0 && (
                      <View style={styles.shopSummaryRow}>
                        <Text style={styles.shopSummaryLabel}>
                          Transaction Fee
                        </Text>
                        <Text style={styles.shopSummaryValue}>
                          {formatCurrency(group.transactionFee)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.shopTotalRow}>
                      <Text style={styles.shopTotalLabel}>Shop Total</Text>
                      <Text style={styles.shopTotalValue}>
                        {formatCurrency(group.total)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Global Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {isFilteringByShop
              ? `Order Summary (${filterShopName})`
              : "Order Summary"}
          </Text>

          {isFilteringByShop
            ? // Shop-specific summary
              (() => {
                const shopId = filterShopId as string;
                const shopItems = items;
                const totalItemPrice = shopItems.reduce(
                  (sum, item) =>
                    sum + parseFloat(item.price || "0") * item.quantity,
                  0,
                );
                const shopShippingFee = shopItems.reduce(
                  (sum, item) => sum + parseFloat(item.shipping_fee || "0"),
                  0,
                );
                const shopVAT = shopItems.reduce(
                  (sum, item) =>
                    sum + parseFloat(item.value_added_tax_amount || "0"),
                  0,
                );
                const shopTransactionFee = transactionFeePerShop[shopId]
                  ? parseFloat(String(transactionFeePerShop[shopId]))
                  : 0;
                const shopTotal =
                  totalItemPrice + shopShippingFee + shopTransactionFee;

                return (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Item price (
                        {shopItems.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}{" "}
                        items):
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(totalItemPrice)}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Shipping Fee:</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(shopShippingFee)}
                      </Text>
                    </View>

                    {shopVAT > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          Value Added Tax (VAT):
                        </Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(shopVAT)}
                        </Text>
                      </View>
                    )}

                    {shopTransactionFee > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          Transaction Fee:
                        </Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(shopTransactionFee)}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total for this shop</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(shopTotal)}
                      </Text>
                    </View>
                  </>
                );
              })()
            : // Global order summary
              (() => {
                // Calculate total item price (price × quantity for all items)
                const totalItemPrice = items.reduce(
                  (sum, item) =>
                    sum + parseFloat(item.price || "0") * item.quantity,
                  0,
                );

                return (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Item price ({orderData.summary_counts.total_items}{" "}
                        items):
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(totalItemPrice)}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Shipping Fee:</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(order_summary.shipping_fee)}
                      </Text>
                    </View>

                    {order_summary.shipping_fees_breakdown &&
                      Object.keys(order_summary.shipping_fees_breakdown)
                        .length > 0 && (
                        <View style={styles.shippingBreakdownContainer}>
                          <Text style={styles.breakdownTitle}>
                            Breakdown by Shop:
                          </Text>
                          {Object.entries(
                            order_summary.shipping_fees_breakdown,
                          ).map(([shopId, fee], index) => {
                            const shopName =
                              orderData?.items.find(
                                (item) => item.shop_info?.id === shopId,
                              )?.shop_info?.name ||
                              `Shop ${shopId.slice(0, 8)}`;
                            return (
                              <View
                                key={`${shopId}-${index}`}
                                style={styles.breakdownRow}
                              >
                                <Text style={styles.breakdownLabel}>
                                  {shopName}:
                                </Text>
                                <Text style={styles.breakdownValue}>
                                  {formatCurrency(fee)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                    {/* VAT - Global (from order_summary.tax) */}
                    {parseFloat(order_summary.tax || "0") > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          Value Added Tax (VAT):
                        </Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(order_summary.tax)}
                        </Text>
                      </View>
                    )}

                    {/* Transaction Fee - Global */}
                    {parseFloat(order_summary.transaction_fee || "0") > 0 && (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>
                            Transaction Fee:
                          </Text>
                          <Text style={styles.summaryValue}>
                            {formatCurrency(
                              order_summary.transaction_fee || "0",
                            )}
                          </Text>
                        </View>

                        {/* Transaction Fee per shop breakdown */}
                        {transactionFeePerShop &&
                          Object.keys(transactionFeePerShop).length > 0 && (
                            <View style={styles.shippingBreakdownContainer}>
                              <Text style={styles.breakdownTitle}>
                                Transaction Fee by Shop:
                              </Text>
                              {Object.entries(transactionFeePerShop).map(
                                ([shopId, fee], index) => {
                                  const shopName =
                                    orderData?.items.find(
                                      (item) => item.shop_info?.id === shopId,
                                    )?.shop_info?.name ||
                                    `Shop ${shopId.slice(0, 8)}`;
                                  return (
                                    <View
                                      key={`txn-${shopId}-${index}`}
                                      style={styles.breakdownRow}
                                    >
                                      <Text style={styles.breakdownLabel}>
                                        {shopName}:
                                      </Text>
                                      <Text style={styles.breakdownValue}>
                                        {formatCurrency(fee)}
                                      </Text>
                                    </View>
                                  );
                                },
                              )}
                            </View>
                          )}
                      </>
                    )}

                    {parseFloat(order_summary.discount) > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount:</Text>
                        <Text
                          style={[styles.summaryValue, styles.discountText]}
                        >
                          -{formatCurrency(order_summary.discount)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(order_summary.total)}
                      </Text>
                    </View>
                  </>
                );
              })()}
        </View>

        {/* Order Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number:</Text>
            <View style={styles.infoValueContainer}>
              <Text style={styles.infoValue}>{order.id}</Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Copied", "Order number copied to clipboard");
                }}
              >
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color="#4B5563"
                  style={{ marginLeft: 5 }}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date:</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(order.created_at)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{order.payment_method}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Method:</Text>
            <Text style={styles.infoValue}>
              {shipping_info.delivery_method || "N/A"}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Sticky Action Buttons */}
      {(() => {
        
        const shopStatusData = isFilteringByShop && filterShopId
          ? orderData?.order?.shop_statuses?.[filterShopId as string]
          : null;
        
        // Handle both old string format and new object format
        const currentShopStatus = typeof shopStatusData === 'string' 
          ? shopStatusData 
          : (shopStatusData as any)?.status || null;

        const showOrderReceivedForShop =
          isFilteringByShop &&
          (currentShopStatus === "delivered" ||
            currentShopStatus === "picked_up");

        const showCompletedActionsForShop =
          isFilteringByShop &&
          currentShopStatus === "completed";

        const showOrderReceivedForOrder =
          !isFilteringByShop &&
          (orderStatusLower === "delivered" ||
            orderStatusLower === "picked_up" ||
            orderStatusLower === "partially_delivered");

            const showCancelForOrder = !isFilteringByShop && actions.can_cancel;
            const showCancelPendingOrder = orderStatusLower === "pending";
        
            // DEBUG LOGS
            console.log("=== CANCEL BUTTON DEBUG ===");
            console.log("orderStatusLower:", orderStatusLower);
            console.log("actions.can_cancel:", actions.can_cancel);
            console.log("isFilteringByShop:", isFilteringByShop);
            console.log("showCancelForOrder:", showCancelForOrder);
            console.log("showCancelPendingOrder:", showCancelPendingOrder);
            console.log("order?.status:", order?.status);
            console.log("currentItems count:", currentItems.length);
            console.log("===========================");

        const hasPendingItems = currentItems.some(
          (item) => item.shop_status === "pending",
        );
        const showCancelPendingItems =
          !isFilteringByShop && hasPendingItems && !actions.can_cancel;

        const showRefundRateForOrder =
          !isFilteringByShop &&
          orderStatusLower === "completed" &&
          (actions.can_review || actions.can_return);

          if (
            !showCancelForOrder &&
            !showCancelPendingOrder &&
            !showCancelPendingItems &&
            !showOrderReceivedForOrder &&
            !showRefundRateForOrder &&
            !showOrderReceivedForShop &&
            !showCompletedActionsForShop
          ) {
            console.log("⚠️ FOOTER NOT RENDERING - All show flags are false");
            return null;
          }

          console.log("✅ FOOTER WILL RENDER");
          console.log("showCancelForOrder:", showCancelForOrder);
          console.log("showCancelPendingOrder:", showCancelPendingOrder);

        return (
          <View style={styles.stickyFooter}>
            <View style={styles.actionButtonsContainer}>
              {showCancelForOrder && (
                <>
                  {console.log("🟢 RENDERING showCancelForOrder button")}
                  <TouchableOpacity
                    style={styles.cancelOrderButton}
                    onPress={handleCancelOrder}
                  >
                    <Text style={styles.cancelOrderButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                </>
              )}

              {showCancelPendingOrder && (
                <>
                  {console.log("🟢 RENDERING showCancelPendingOrder button")}
                  <TouchableOpacity
                    style={styles.cancelOrderButton}
                    onPress={handleCancelOrder}
                  >
                    <Text style={styles.cancelOrderButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                </>
              )}
              {showOrderReceivedForShop && (
                <TouchableOpacity
                  style={styles.orderReceivedButton}
                  onPress={handleOrderReceived}
                >
                  <Text style={styles.orderReceivedButtonText}>
                    Order Received
                  </Text>
                </TouchableOpacity>
              )}

              {showOrderReceivedForOrder && (
                <TouchableOpacity
                  style={styles.orderReceivedButton}
                  onPress={handleOrderReceived}
                >
                  <Text style={styles.orderReceivedButtonText}>
                    Order Received
                  </Text>
                </TouchableOpacity>
              )}

              {showCompletedActionsForShop && (
                <>
                  <TouchableOpacity
                    style={styles.requestRefundButton}
                    onPress={() => {
                      router.push(
                        `/customer/request-refund?orderId=${order.id}&shopId=${filterShopId}`,
                      );
                    }}
                  >
                    <Text style={styles.requestRefundButtonText}>
                      Request Refund
                      {refundCountdown && refundCountdown !== "Expired" && (
                        <Text style={styles.countdownText}>
                          {"\n"}({refundCountdown})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => setRateModalVisible(true)}
                  >
                    <Text style={styles.rateButtonText}>Rate Products</Text>
                  </TouchableOpacity>
                </>
              )}

              {showRefundRateForOrder &&
                (() => {
                  const refundDate = order.refund_expire_date;
                  const hasRefundDate =
                    refundDate !== null &&
                    refundDate !== undefined &&
                    refundDate !== "";
                  const isRefundExpired =
                    hasRefundDate && new Date(refundDate) < new Date();
                  const isPickupMethod = String(
                    shipping_info?.delivery_method || "",
                  )
                    .toLowerCase()
                    .includes("pickup");
                  const isDisabled = isRefundExpired || isPickupMethod;

                  return (
                    <>
                      {actions.can_return && (
                        <TouchableOpacity
                          style={[
                            styles.requestRefundButton,
                            isDisabled && styles.requestRefundButtonDisabled,
                          ]}
                          onPress={() => {
                            if (isRefundExpired) {
                              Alert.alert(
                                "Refund Period Expired",
                                "The refund period for this order has expired.",
                              );
                            } else if (isPickupMethod) {
                              Alert.alert(
                                "Pickup Orders",
                                "Refunds are not available for pickup orders.",
                              );
                            } else {
                              router.push(
                                `/customer/request-refund?orderId=${order.id}`,
                              );
                            }
                          }}
                          disabled={isDisabled}
                        >
                          <Text
                            style={[
                              styles.requestRefundButtonText,
                              isDisabled &&
                                styles.requestRefundButtonTextDisabled,
                            ]}
                          >
                            Request Refund
                            {refundCountdown && !isPickupMethod && (
                              <Text style={styles.countdownText}>
                                {"\n"}({refundCountdown})
                              </Text>
                            )}
                            {isPickupMethod && " (Not Available)"}
                            {isRefundExpired && " (Expired)"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {actions.can_review && (
                        <TouchableOpacity
                          style={styles.rateButton}
                          onPress={() => setRateModalVisible(true)}
                        >
                          <Text style={styles.rateButtonText}>
                            Rate Products
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
            </View>
          </View>
        );
      })()}

      <RateItemModal
        visible={rateModalVisible}
        onClose={() => setRateModalVisible(false)}
        items={items}
      />

      <CancelItemsModal
        visible={cancelItemsModalVisible}
        onClose={() => setCancelItemsModalVisible(false)}
        onConfirm={handleCancelSelectedItems}
        items={items}
        loading={cancellingItems}
      />

      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  headerSafeArea: {
    backgroundColor: "#FFF",
    paddingTop: Platform.OS === "android" ? 40 : 0,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  headerIcons: { flexDirection: "row" },
  content: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
  },

  statusBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
  },
  subStatusText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  trackButton: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },

  infoCard: {
    backgroundColor: "#FFF",
    marginTop: 10,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    color: "#111827",
  },
  cardContent: {
    paddingLeft: 28,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  phoneNumber: {
    fontWeight: "400",
    color: "#6B7280",
  },
  addressText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  pickupLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  pickupValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
    marginTop: 2,
  },

  shippingRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  shippingLabel: {
    fontSize: 13,
    color: "#6B7280",
    width: 110,
  },
  shippingValue: {
    fontSize: 13,
    color: "#111827",
    flex: 1,
  },

  shopGroupsContainer: {
    marginTop: 10,
  },
  shopGroupCard: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 12,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  logoText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#7C3AED",
    textAlign: "center",
  },
  storeInfo: {
    marginLeft: 10,
    flex: 1,
  },
  storeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeName: {
    fontWeight: "bold",
    fontSize: 15,
    marginRight: 5,
  },
  groupItemsContainer: {
    marginTop: 6,
  },
  groupItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  groupItemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  groupItemDetails: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },
  groupItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  groupItemMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  groupItemStatus: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    textTransform: "capitalize",
  },
  groupItemPriceContainer: {
    alignItems: "flex-end",
    minWidth: 96,
  },
  groupItemSubtotal: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "right",
  },
  currentPrice: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#F97316",
    marginBottom: 4,
  },
  shopSummaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  shopSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shopSummaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  shopSummaryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  shopTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  shopTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  shopTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F97316",
  },

  summaryCard: {
    backgroundColor: "#FFF",
    padding: 16,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  discountText: {
    color: "#10B981",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  shippingBreakdownContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#374151",
  },
  breakdownValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  actionButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  rateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  rateModalContainer: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  rateModalHeader: {
    marginBottom: 12,
  },
  rateModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  rateModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  rateModalList: {
    paddingBottom: 12,
  },
  rateItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  rateItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  rateItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  rateItemShop: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "600",
    marginBottom: 2,
  },
  rateItemName: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  rateItemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  rateItemRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  rateItemStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F97316",
    marginBottom: 4,
  },
  rateModalEmptyText: {
    paddingVertical: 16,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
  },
  rateModalCloseButton: {
    marginTop: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rateModalCloseButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  cancelOrderButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  cancelOrderButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  requestRefundButton: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F97316",
    alignItems: "center",
  },
  requestRefundButtonText: {
    color: "#F97316",
    fontSize: 14,
    fontWeight: "600",
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#F97316",
    opacity: 0.85,
  },

  proofGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  proofImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  riderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  riderName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
  orderReceivedButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  orderReceivedButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  rateButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  completedLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    marginRight: 4,
  },
  completedValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  completedMessageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  completedMessage: {
    fontSize: 13,
    color: "#065F46",
    flex: 1,
    lineHeight: 18,
  },
  boldDateText: {
    fontWeight: "bold",
    color: "#b75020",
  },
  stickyFooter: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
    // Remove position: absolute and let it be at bottom of content
  },
  pickupCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pickupCodeText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
  },
  pickupCodeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 1,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "85%",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelIconContainer: {
    marginBottom: 16,
  },
  cancelIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  cancelModalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  cancelledProductCard: {
    backgroundColor: "#FEF2F2",
    opacity: 0.85,
  },
  cancelledImage: {
    opacity: 0.5,
  },
  cancelledText: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  cancelledPrice: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "normal",
  },
  refundExpireRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  refundExpireLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
    marginRight: 4,
  },
  refundExpireValue: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "600",
  },
  refundExpiredValue: {
    color: "#DC2626",
  },
  requestRefundButtonDisabled: {
    backgroundColor: "#D1D5DB",
    borderColor: "#D1D5DB",
  },
  requestRefundButtonTextDisabled: {
    color: "#9CA3AF",
  },
  cancelOrderIdText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 16,
  },
  cancelWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
    gap: 6,
  },
  cancelWarningText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "500",
  },
  cancelButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelNoButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelNoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  cancelYesButton: {
    flex: 1,
    backgroundColor: "#EA580C",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cancelYesButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelItemsModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cancelModalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  cancelItemsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  cancelItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelItemCardSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#F97316",
  },
  cancelItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  cancelItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  cancelItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  cancelItemVariant: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  cancelItemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelItemQuantity: {
    fontSize: 11,
    color: "#6B7280",
  },
  cancelItemPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F97316",
  },
  cancelItemCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  cancelItemCheckboxSelected: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  cancelItemsFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  cancelItemsSummary: {
    marginBottom: 12,
    alignItems: "center",
  },
  cancelItemsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
  },
  cancelYesButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.7,
  },
  cancelSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  cancelSectionTitleDisabled: {
    color: "#9CA3AF",
    marginTop: 16,
  },
  cancelItemCardDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  cancelItemImageDisabled: {
    opacity: 0.5,
  },
  cancelItemTextDisabled: {
    color: "#9CA3AF",
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  receiveItemButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  receiveItemButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  itemActionButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  returnItemButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 4,
  },
  returnItemButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#EF4444",
  },
  rateItemButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 4,
  },
  rateItemButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#D97706",
  },
  cancelReasonText: {
    fontSize: 10,
    color: "#EF4444",
    marginTop: 4,
    fontStyle: "italic",
  },
  cancelItemBlockedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  noCancelItemsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noCancelItemsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  noCancelItemsSubtext: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },
  riderPhone: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3B82F6",
  },
  pendingCancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  pendingCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
