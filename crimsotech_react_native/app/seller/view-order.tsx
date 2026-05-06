// app/seller/view-order.tsx
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

const { width } = Dimensions.get("window");

// Interfaces
interface MediaItem {
  id: string;
  url: string;
  file_type: string;
}
interface ProofImage {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}
interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  variant: string;
  shop: { id: string; name: string };
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
  vat?: number;
  variant_vat?: number;
  price?: number;
}
interface RiderAssignment {
  rider_name: string;
  rider_username: string;
  vehicle_type: string;
  plate_number: string;
  distance_to_pickup_km: number;
  distance_pickup_to_dest_km: number;
  total_distance_km: number;
}
interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  rider_phone?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
  is_pending_offer?: boolean;
}
interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  full_address: string;
  instructions?: string;
}

interface OrderDetails {
  order_id: string;
  shop_status?: string;
  global_order_status?: string;
  total_shops_in_order?: number;
  confirmed_shops_count?: number;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number?: string;
  };
  status: string;
  total_amount: number;
  subtotal?: number;
  shipping_fee?: number;
  transaction_fee?: number;
  discount_applied?: number; // ADD THIS LINE
  total_vat?: number;
  payment_method: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  shipping_address?: ShippingAddress | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items: OrderItem[];
  delivery_info?: DeliveryInfo;
  pickup_date?: string;
  pickup_expire_date?: string;
  proof_images?: ProofImage[];
  metadata?: {
    pickup_code?: string;
    delivery_fees_by_shop?: Record<string, number>;
    all_riders_compared?: RiderAssignment[];
    nearest_rider?: {
      name: string;
      username: string;
      total_distance_km: number;
      delivery_fee: number;
      estimated_minutes: number;
    };
  };
}

// Status configuration — covers full delivery + pickup flow
const getStatusConfig = (
  status: string,
  shopStatus?: string,
  totalShops?: number,
  confirmedShops?: number,
) => {
  const normalizedStatus = status?.toLowerCase() || "default";

  // Handle partially_confirmed status
  if (normalizedStatus === "partially_confirmed") {
    const remainingShops = (totalShops || 0) - (confirmedShops || 0);
    return {
      label: "Partially Confirmed",
      color: "#F59E0B",
      bgColor: "#FFFBEB",
      icon: "time-outline",
      description: `Your shop has confirmed the order. Waiting for ${remainingShops} other shop(s) to confirm before processing.`,
    };
  }

  const configs: Record<
    string,
    {
      label: string;
      color: string;
      bgColor: string;
      icon: string;
      description: string;
    }
  > = {
    pending_shipment: {
      label: "Pending",
      color: "#F97316",
      bgColor: "#FFF7ED",
      icon: "time-outline",
      description:
        "Order placed and awaiting your confirmation. Review and confirm to start processing.",
    },
    processing: {
      label: "Processing",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      icon: "refresh-outline",
      description: "Order confirmed. Prepare the items for shipment or pickup.",
    },
    ready_to_ship: {
      label: "Ready to Ship",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      icon: "cube-outline",
      description:
        "Items are packed and ready. Arrange shipment to assign a rider.",
    },
    rider_assigned: {
      label: "Rider Assigned - Waiting for Confirmation",
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
      icon: "person-outline",
      description:
        "A rider has been assigned and is waiting to confirm the delivery. Once confirmed, you can mark the order as ready for pickup.",
    },
    rider_accepted: {
      label: "Rider Accepted",
      color: "#10B981",
      bgColor: "#ECFDF5",
      icon: "checkmark-circle-outline",
      description:
        'Rider has accepted the delivery. Click "Ready to Ship" when items are packed.',
    },
    pending_rider: {
      label: "Pending Rider",
      color: "#F97316",
      bgColor: "#FFF7ED",
      icon: "time-outline",
      description:
        'No riders available. Click "Arrange Shipment" to try again.',
    },
    waiting_for_rider: {
      label: "Waiting for Pickup",
      color: "#F97316",
      bgColor: "#FFF7ED",
      icon: "package-outline",
      description:
        "Order is ready. Waiting for rider to pick up the item from your store.",
    },
    waiting_for_pickup: {
      label: "Waiting for Rider Pickup",
      color: "#F97316",
      bgColor: "#FFF7ED",
      icon: "package-outline",
      description:
        "Order is ready. Waiting for rider to pick up the item from your store.",
    },
    shipped: {
      label: "Shipped",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      icon: "car-outline",
      description: "Order picked up by rider and on the way.",
    },
    to_deliver: {
      label: "Out for Delivery",
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
      icon: "car-outline",
      description: "Rider is on the way to deliver to the customer.",
    },
    delivered: {
      label: "Delivered",
      color: "#10B981",
      bgColor: "#ECFDF5",
      icon: "checkmark-circle-outline",
      description: "Order delivered. Mark as complete to finalize.",
    },
    completed: {
      label: "Completed",
      color: "#10B981",
      bgColor: "#ECFDF5",
      icon: "checkmark-circle-outline",
      description: "Order successfully completed. Thank you!",
    },
    ready_for_pickup: {
      label: "Ready for Pickup",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      icon: "storefront-outline",
      description: "Order is ready at your store. Customer has been notified.",
    },
    picked_up: {
      label: "Picked Up",
      color: "#10B981",
      bgColor: "#ECFDF5",
      icon: "checkmark-circle-outline",
      description:
        "Customer has collected the order. Mark as complete to finalize.",
    },
    cancelled: {
      label: "Cancelled",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      icon: "close-circle-outline",
      description: "This order has been cancelled. No further action required.",
    },
    declined: {
      label: "Rider Declined",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      icon: "close-circle-outline",
      description:
        'The rider declined this delivery. Click "Arrange Shipment" to assign a new rider.',
    },
    default: {
      label: "Unknown",
      color: "#6B7280",
      bgColor: "#F3F4F6",
      icon: "help-circle-outline",
      description: "Unable to determine order status.",
    },
  };

  return configs[normalizedStatus] || configs.default;
};

export default function SellerViewOrder() {
  const router = useRouter();
  const { orderId, shopId } = useLocalSearchParams<{
    orderId: string;
    shopId: string;
  }>();
  const { userId } = useAuth();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [proofImages, setProofImages] = useState<ProofImage[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    type: string;
    title: string;
    description: string;
  } | null>(null);
  const [showRidersModal, setShowRidersModal] = useState(false);

  useEffect(() => {
    if (orderId && shopId) {
      fetchOrderDetails();
      fetchAvailableActions();
    }
  }, [orderId, shopId]);

  const fetchOrderDetails = async () => {
    if (!orderId || !shopId) return;
    try {
      const response = await AxiosInstance.get(
        "/seller-order-list/seller_view_order/",
        {
          params: { order_id: orderId, shop_id: shopId },
        },
      );

      if (response.data.success) {
        setOrder(response.data.data);

        if (
          response.data.data.status === "delivered" &&
          response.data.data.proof_images
        ) {
          setProofImages(response.data.data.proof_images);
        }
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to load order details",
        );
      }
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load order details",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAvailableActions = async () => {
    if (!orderId || !shopId) return;
    try {
      const response = await AxiosInstance.get(
        `/seller-order-list/${orderId}/available_actions/`,
        { params: { shop_id: shopId } },
      );
      if (response.data.success) {
        setAvailableActions(response.data.data.available_actions || []);
      }
    } catch (error) {
      console.error("Error fetching available actions:", error);
    }
  };

  const handleUpdateStatus = async (actionType: string) => {
    setProcessing(true);
    try {
      // Prepare request body
      const requestBody: any = { action_type: actionType };

      // If this is arrange_shipment, include the shipping_fee for this shop
      if (actionType === "arrange_shipment" && order) {
        // Get shipping fee from metadata.delivery_fees_by_shop or fallback to order.shipping_fee
        const shippingFeeForShop =
          order.metadata?.delivery_fees_by_shop?.[shopId as string] ||
          order.shipping_fee;

        if (shippingFeeForShop) {
          requestBody.shipping_fee = shippingFeeForShop;
          console.log(
            `📦 Passing shipping_fee for shop ${shopId}: ₱${shippingFeeForShop}`,
          );
        }
      }

      const response = await AxiosInstance.patch(
        `/seller-order-list/${orderId}/update_status/`,
        requestBody,
        { params: { shop_id: shopId } },
      );

      if (response.data.success) {
        await fetchOrderDetails();
        await fetchAvailableActions();
        setShowConfirmation(false);

        if (
          actionType === "arrange_shipment" &&
          response.data.data?.all_riders_compared
        ) {
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    all_riders_compared: response.data.data.all_riders_compared,
                    nearest_rider: response.data.data.nearest_rider,
                  },
                }
              : prev,
          );
          setShowRidersModal(true);
        }
      } else {
        Alert.alert("Error", response.data.message || "Failed to update order");
      }
    } catch (error: any) {
      console.error("Error updating order:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update order",
      );
    } finally {
      setProcessing(false);
    }
  };

  const showActionConfirmation = (
    actionType: string,
    title: string,
    description: string,
  ) => {
    setSelectedAction({ type: actionType, title, description });
    setShowConfirmation(true);
  };

  const executeAction = () => {
    if (!selectedAction) return;
    handleUpdateStatus(selectedAction.type);
  };

  const getActionButtons = () => {
    if (!order)
      return {
        showConfirm: false,
        showCancel: false,
        showReadyToShip: false,
        showArrangeShipment: false,
        showReadyForPickup: false,
        showPickedUp: false,
        showToDeliver: false,
        showDelivered: false,
        showComplete: false,
      };

    const isRiderAccepted = order?.delivery_info?.status === "accepted";
    const isRiderPickedUp = order?.delivery_info?.status === "picked_up";
    const isRiderDeclined = order?.delivery_info?.status === "declined";
    const currentStatus = order?.status?.toLowerCase() || "";
    const shopStatus = order?.shop_status?.toLowerCase() || "";
    const allShopsConfirmed =
      order?.confirmed_shops_count === order?.total_shops_in_order;

    let enhancedAvailableActions = [...availableActions];

    // DEBUG LOGS
    console.log("🔍 [FRONTEND] availableActions from API:", availableActions);
    console.log("🔍 [FRONTEND] shop_status:", shopStatus);
    console.log("🔍 [FRONTEND] isRiderDeclined:", isRiderDeclined);
    console.log("🔍 [FRONTEND] currentStatus:", currentStatus);

    if (isRiderAccepted && currentStatus === "waiting_for_rider") {
      if (!enhancedAvailableActions.includes("ready_to_ship")) {
        enhancedAvailableActions.push("ready_to_ship");
      }
    }

    // For rider_assigned status with accepted rider, show ready_to_ship button
    if (isRiderAccepted && shopStatus === "rider_assigned") {
      if (!enhancedAvailableActions.includes("ready_to_ship")) {
        enhancedAvailableActions.push("ready_to_ship");
      }
    }

    const shouldHideCancel = isRiderAccepted;

    // For pending orders, show both confirm and cancel buttons
    const isPending = shopStatus === "pending";

    // For rider_assigned status, show only cancel button
    const isRiderAssignedStatus = shopStatus === "rider_assigned";

    // For partially_confirmed orders, only show confirm button if not already confirmed
    const isPartiallyConfirmed = currentStatus === "partially_confirmed";
    const canConfirm =
      (isPending || (shopStatus === "pending" && isPartiallyConfirmed)) &&
      !allShopsConfirmed;

    // Get the base showToDeliver value from available actions
    const hasToDeliverAction = enhancedAvailableActions.includes("to_deliver");

    // Only show "Out for Delivery" when rider has accepted OR picked up the order
    const showOutForDelivery =
      hasToDeliverAction && (isRiderAccepted || isRiderPickedUp);

    const showArrangeShipment =
      enhancedAvailableActions.includes("arrange_shipment") &&
      !isRiderAssignedStatus;
    console.log("🔍 [FRONTEND] showArrangeShipment:", showArrangeShipment);

    return {
      showConfirm:
        isPending || enhancedAvailableActions.includes("confirm") || canConfirm,
      showCancel:
        (isPending ||
          isRiderAssignedStatus ||
          enhancedAvailableActions.includes("cancel")) &&
        !shouldHideCancel,
      showReadyToShip: enhancedAvailableActions.includes("ready_to_ship"),
      showArrangeShipment: showArrangeShipment,
      showReadyForPickup: enhancedAvailableActions.includes("ready_for_pickup"),
      showPickedUp: enhancedAvailableActions.includes("picked_up"),
      showToDeliver: showOutForDelivery,
      showDelivered: enhancedAvailableActions.includes("delivered"),
      showComplete: enhancedAvailableActions.includes("complete"),
    };
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
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
    return "https://via.placeholder.com/80";
  };

  const renderStatusCard = () => {
    if (!order) return null;

    let displayStatus = order.status;
    let customDescription = "";
    let customLabel = "";
    let customIcon = undefined;

    const shopStatus = order?.shop_status?.toLowerCase() || "";

    // Check if order is shipped and delivered
    if (
      shopStatus === "shipped" &&
      order?.delivery_info?.status === "delivered"
    ) {
      customLabel = "Delivered";
      customDescription = "Order delivered. Mark as complete to finalize.";
      customIcon = "checkmark-circle-outline";
      displayStatus = "delivered";
    }
    // Check if shop_status is shipped - display as "Out for Delivery"
    else if (shopStatus === "shipped") {
      customLabel = "Out for Delivery";
      customDescription = "Rider is on the way to deliver to the customer.";
      customIcon = "car-outline";
      displayStatus = "to_deliver";
    }
    // Check if shop_status is waiting_for_rider - display as "Waiting for Pickup"
    else if (shopStatus === "waiting_for_rider") {
      customLabel = "Waiting for Pickup";
      customDescription =
        "Order is ready. Waiting for rider to pick up the item from your store.";
      customIcon = "package-outline";
      displayStatus = "waiting_for_rider";
    }
    // Check if order is partially confirmed
    else if (order.status === "partially_confirmed") {
      const remainingShops =
        (order.total_shops_in_order || 0) - (order.confirmed_shops_count || 0);
      customLabel = `Waiting for ${remainingShops} Other Shop(s) to Confirm`;
      customDescription = `Your shop has confirmed this order. The order will start processing once all ${order.total_shops_in_order} shop(s) have confirmed.`;
      customIcon = "time-outline";
      displayStatus = "partially_confirmed";
    }
    // Check if rider declined
    else if (order?.delivery_info?.status === "declined") {
      customLabel = "Rider Declined Delivery";
      customDescription =
        'The assigned rider declined this delivery. Click "Arrange Shipment" to assign a new rider.';
      customIcon = "close-circle-outline";
      displayStatus = "declined";
    }
    // Rider assigned but waiting for confirmation
    else if (
      (displayStatus === "rider_assigned" ||
        displayStatus === "waiting_for_rider") &&
      order?.delivery_info?.rider_name &&
      (!order?.delivery_info?.status ||
        order?.delivery_info?.status === "pending")
    ) {
      customLabel = "Rider Assigned - Waiting for Confirmation";
      customDescription =
        "A rider has been assigned and is waiting to confirm the delivery. Once the rider accepts, you can mark the order as ready for pickup.";
      customIcon = "person-outline";
    }
    // Rider accepted the delivery - waiting for pickup
    else if (
      (displayStatus === "rider_assigned" ||
        displayStatus === "waiting_for_rider") &&
      order?.delivery_info?.status === "accepted"
    ) {
      customLabel = "Rider Assigned - Accepted";
      customDescription =
        'The rider has accepted the delivery and will pick up the items from your store. Please prepare the items and click "Ready to Ship" when ready.';
      customIcon = "checkmark-circle-outline";
    }
    // Waiting for rider (no rider assigned yet)
    else if (
      displayStatus === "waiting_for_rider" &&
      !order?.delivery_info?.rider_name
    ) {
      customLabel = "Waiting for Rider";
      customDescription =
        "Waiting for a rider to accept the delivery assignment.";
      customIcon = "time-outline";
    }
    // Out for Delivery
    else if (displayStatus === "to_deliver") {
      customLabel = "Item Shipped - Rider Picked Up";
      customDescription =
        "The rider has picked up the items from your store and is on the way to deliver to the customer.";
      customIcon = "car-outline";
    }
    // waiting_for_pickup status
    else if (displayStatus === "waiting_for_pickup") {
      customDescription =
        "Order is ready. Waiting for rider to pick up the item from your store for delivery to the customer.";
      customIcon = "package-outline";
    }
    // ready_for_pickup status
    else if (displayStatus === "ready_for_pickup") {
      customDescription =
        "Order is ready at your store. Customer has been notified.";
      customIcon = "storefront-outline";

      const pickupCode = order?.metadata?.pickup_code;
      if (pickupCode) {
        customDescription = `Order is ready at your store. Customer has been notified.\n\nPickup Code: ${pickupCode}`;
      }
    }

    const config = getStatusConfig(
      displayStatus,
      order.shop_status,
      order.total_shops_in_order,
      order.confirmed_shops_count,
    );

    const finalLabel = customLabel || config.label;
    const finalDescription = customDescription || config.description;
    const finalIcon = customIcon || config.icon;
    const finalColor = config.color;
    const finalBgColor = config.bgColor;

    const isPartiallyConfirmed = displayStatus === "partially_confirmed";

    return (
      <View
        style={[
          styles.statusCard,
          { backgroundColor: finalBgColor, borderLeftColor: finalColor },
        ]}
      >
        <View style={styles.statusCardHeader}>
          <View style={styles.statusRow}>
            <Ionicons name={finalIcon as any} size={22} color={finalColor} />
            <Text style={[styles.statusCardTitle, { color: finalColor }]}>
              {finalLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.statusCardDescription}>{finalDescription}</Text>
        {isPartiallyConfirmed &&
          order.confirmed_shops_count !== undefined &&
          order.total_shops_in_order !== undefined && (
            <View style={styles.confirmationProgress}>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(order.confirmed_shops_count / order.total_shops_in_order) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {order.confirmed_shops_count} of {order.total_shops_in_order}{" "}
                shops confirmed
              </Text>
            </View>
          )}
      </View>
    );
  };

  const renderRiderInfo = () => {
    const riderName = order?.delivery_info?.rider_name;
    const riderPhone = order?.delivery_info?.rider_phone;
    const deliveryStatus = order?.delivery_info?.status;
    const allRiders = order?.metadata?.all_riders_compared;
    const nearestRider = order?.metadata?.nearest_rider;
    const isRiderDeclined = deliveryStatus === "declined";

    if (!riderName && !deliveryStatus && !allRiders) return null;

    return (
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="motorbike" size={20} color="#111827" />
          <Text style={styles.cardTitle}>Rider Information</Text>
          {allRiders && allRiders.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowRidersModal(true)}
            >
              <Text style={styles.viewAllButtonText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#F97316" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardContent}>
          {riderName ? (
            <>
              <View style={styles.riderInfoRow}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <Text
                  style={[
                    styles.riderName,
                    isRiderDeclined && styles.textDeclined,
                  ]}
                >
                  {riderName}
                </Text>
              </View>
              {riderPhone && (
                <View style={styles.riderInfoRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.riderPhone}>{riderPhone}</Text>
                </View>
              )}
              {isRiderDeclined && (
                <View style={styles.declinedWarning}>
                  <Ionicons name="warning-outline" size={14} color="#EF4444" />
                  <Text style={styles.declinedWarningText}>
                    Rider declined this delivery
                  </Text>
                </View>
              )}
            </>
          ) : allRiders && allRiders.length > 0 ? (
            <>
              <Text style={styles.riderSubtitle}>
                Riders notified for this delivery:
              </Text>
              {allRiders.slice(0, 3).map((rider, index) => (
                <View key={index} style={styles.riderListItem}>
                  <View style={styles.riderListLeft}>
                    <MaterialCommunityIcons
                      name="motorbike"
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.riderListName}>{rider.rider_name}</Text>
                  </View>
                  <Text style={styles.riderListDistance}>
                    {rider.total_distance_km} km
                  </Text>
                </View>
              ))}
              {allRiders.length > 3 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setShowRidersModal(true)}
                >
                  <Text style={styles.viewMoreText}>
                    +{allRiders.length - 3} more riders
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.riderInfoRow}>
              <Ionicons name="time-outline" size={16} color="#F97316" />
              <Text style={styles.waitingText}>
                Waiting for rider assignment...
              </Text>
            </View>
          )}
          {deliveryStatus && deliveryStatus !== "declined" && (
            <View style={styles.deliveryStatusRow}>
              <MaterialCommunityIcons
                name="truck-fast"
                size={16}
                color="#3B82F6"
              />
              <Text style={styles.deliveryStatusText}>
                Status:{" "}
                {deliveryStatus.charAt(0).toUpperCase() +
                  deliveryStatus.slice(1)}
              </Text>
            </View>
          )}
          {nearestRider && !riderName && (
            <View style={styles.nearestRiderInfo}>
              <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
              <Text style={styles.nearestRiderText}>
                Nearest: {nearestRider.name} ({nearestRider.total_distance_km}{" "}
                km)
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRidersModal = () => {
    const allRiders = order?.metadata?.all_riders_compared;
    const nearestRider = order?.metadata?.nearest_rider;

    if (!allRiders || allRiders.length === 0) return null;

    return (
      <Modal
        visible={showRidersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRidersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ridersModalContainer}>
            <View style={styles.ridersModalHeader}>
              <Text style={styles.ridersModalTitle}>Rider Assignments</Text>
              <TouchableOpacity onPress={() => setShowRidersModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ridersModalContent}>
              {nearestRider && (
                <View style={styles.nearestRiderCard}>
                  <View style={styles.nearestRiderHeader}>
                    <MaterialCommunityIcons
                      name="star-circle"
                      size={24}
                      color="#F59E0B"
                    />
                    <Text style={styles.nearestRiderCardTitle}>
                      Nearest Rider
                    </Text>
                  </View>
                  <View style={styles.nearestRiderDetails}>
                    <Text style={styles.nearestRiderName}>
                      {nearestRider.name}
                    </Text>
                    <Text style={styles.nearestRiderUsername}>
                      @{nearestRider.username}
                    </Text>
                    <View style={styles.nearestRiderStats}>
                      <View style={styles.nearestRiderStat}>
                        <MaterialCommunityIcons
                          name="map-marker-distance"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.nearestRiderStatText}>
                          {nearestRider.total_distance_km} km
                        </Text>
                      </View>
                      <View style={styles.nearestRiderStat}>
                        <MaterialIcons
                          name="attach-money"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.nearestRiderStatText}>
                          ₱{nearestRider.delivery_fee?.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.nearestRiderStat}>
                        <MaterialIcons
                          name="access-time"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.nearestRiderStatText}>
                          {nearestRider.estimated_minutes} min
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.allRidersTitle}>All Nearby Riders</Text>
              {allRiders.map((rider, index) => {
                const isNearest =
                  nearestRider &&
                  rider.rider_username === nearestRider.username;
                return (
                  <View key={index} style={styles.riderModalItem}>
                    <View style={styles.riderModalRank}>
                      <Text style={styles.riderModalRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.riderModalInfo}>
                      <Text style={styles.riderModalName}>
                        {rider.rider_name}
                      </Text>
                      <Text style={styles.riderModalUsername}>
                        @{rider.rider_username}
                      </Text>
                      <View style={styles.riderModalDetails}>
                        <View style={styles.riderModalDetail}>
                          <MaterialCommunityIcons
                            name="car"
                            size={10}
                            color="#9CA3AF"
                          />
                          <Text style={styles.riderModalDetailText}>
                            {rider.vehicle_type}
                          </Text>
                        </View>
                        <View style={styles.riderModalDetail}>
                          <MaterialIcons
                            name="confirmation-number"
                            size={10}
                            color="#9CA3AF"
                          />
                          <Text style={styles.riderModalDetailText}>
                            {rider.plate_number}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.riderModalDistance}>
                      <Text style={styles.riderModalDistanceValue}>
                        {rider.total_distance_km} km
                      </Text>
                      <Text style={styles.riderModalDistanceLabel}>
                        total distance
                      </Text>
                      {isNearest && (
                        <Text style={styles.nearestBadge}>Nearest</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.ridersModalFooter}>
              <Text style={styles.ridersModalFooterText}>
                The nearest rider will be assigned automatically
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderProofOfDelivery = () => {
    if (order?.status !== "delivered") return null;

    const proofs = order?.proof_images || [];
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

  const renderPickupInfo = () => {
    if (!isPickupOrder()) return null;

    const pickupExpireDate = (order as any)?.pickup_expire_date;
    if (!pickupExpireDate) return null;

    const expireDate = new Date(pickupExpireDate);
    const now = new Date();
    const isExpired = now > expireDate;

    return (
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="schedule" size={20} color="#111827" />
          <Text style={styles.cardTitle}>Pickup Information</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.pickupInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.pickupExpireText}>
              {isExpired ? "Expired on: " : "Expires on: "}
              {expireDate.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          {isExpired && (
            <View style={styles.expiredWarning}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.expiredWarningText}>
                This pickup order has expired. Please contact the customer.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    const isCompleted = order?.status === "completed";
    const isCancelled = order?.status === "cancelled";
    const isPartiallyConfirmed = order?.status === "partially_confirmed";
    const isShopConfirmed = order?.shop_status === "confirmed";

    if (isCompleted || isCancelled) return null;

    const {
      showConfirm,
      showCancel,
      showReadyToShip,
      showArrangeShipment,
      showReadyForPickup,
      showPickedUp,
      showToDeliver,
      showDelivered,
      showComplete,
    } = getActionButtons();

    const showPrintWaybill = availableActions.includes("print_waybill");
    const currentStatus = order?.status?.toLowerCase() || "";
    const shopStatus = order?.shop_status?.toLowerCase() || "";
    const isProcessing = currentStatus === "processing";
    const isRiderAssigned = currentStatus === "rider_assigned";
    const isReadyToShip = currentStatus === "ready_to_ship";
    const isPickup = isPickupOrder();
    const isRiderDeclined = order?.delivery_info?.status === "declined";

    const hasAnyAction =
      showConfirm ||
      showCancel ||
      showReadyToShip ||
      showArrangeShipment ||
      showReadyForPickup ||
      showPickedUp ||
      showToDeliver ||
      showDelivered ||
      showComplete ||
      showPrintWaybill;

    if (!hasAnyAction) return null;

    const handlePrintWaybill = async () => {
      try {
        setProcessing(true);
        const waybillUrl = `${AxiosInstance.defaults.baseURL}/seller-order-list/${orderId}/generate_waybill/?shop_id=${shopId}`;
        const { Linking } = await import("react-native");
        await Linking.openURL(waybillUrl);
        Alert.alert(
          "Success",
          "Waybill opened in browser. You can print from there.",
        );
      } catch (error: any) {
        console.error("Error generating waybill:", error);
        Alert.alert("Error", error?.message || "Failed to generate waybill");
      } finally {
        setProcessing(false);
      }
    };

    const isRiderAccepted = order?.delivery_info?.status === "accepted";
    const isWaitingForRider = currentStatus === "waiting_for_rider";

    return (
      <View style={styles.stickyFooter}>
        <View style={styles.buttonContainer}>
          {!isPickup &&
            (showPrintWaybill || (isRiderAssigned && isRiderAccepted)) &&
            shopStatus !== "waiting_for_rider" &&
            shopStatus !== "shipped" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.printWaybillButton]}
                onPress={handlePrintWaybill}
                disabled={processing}
              >
                <Text style={styles.actionButtonText}>Print Waybill</Text>
              </TouchableOpacity>
            )}

          {showConfirm && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() =>
                showActionConfirmation(
                  "confirm",
                  "Confirm Order",
                  isPartiallyConfirmed && isShopConfirmed
                    ? "You have already confirmed this order. Waiting for other shops to confirm."
                    : "Confirm this order and start processing?",
                )
              }
              disabled={processing || (isPartiallyConfirmed && isShopConfirmed)}
            >
              <Text style={styles.actionButtonText}>
                {isPartiallyConfirmed && isShopConfirmed
                  ? "Already Confirmed"
                  : "Confirm Order"}
              </Text>
            </TouchableOpacity>
          )}

          {((isProcessing && showArrangeShipment) ||
            currentStatus === "pending_rider" ||
            isRiderDeclined) &&
            !isPickup && (
              <TouchableOpacity
                style={[styles.actionButton, styles.readyToShipButton]}
                onPress={() =>
                  showActionConfirmation(
                    "arrange_shipment",
                    "Arrange Shipment",
                    isRiderDeclined
                      ? "The previous rider declined. Assign a new rider for this delivery?"
                      : "Assign riders for this delivery? Nearby riders will be notified.",
                  )
                }
                disabled={processing}
              >
                <Text style={styles.actionButtonText}>
                  {isRiderDeclined
                    ? "Arrange Shipment Again"
                    : "Arrange Shipment"}
                </Text>
              </TouchableOpacity>
            )}

          {(currentStatus === "rider_accepted" ||
            (currentStatus === "rider_assigned" && isRiderAccepted)) &&
            showReadyToShip &&
            !isPickup && (
              <TouchableOpacity
                style={[styles.actionButton, styles.readyToShipButton]}
                onPress={() =>
                  showActionConfirmation(
                    "ready_to_ship",
                    "Ready to Ship",
                    currentStatus === "rider_assigned" && isRiderAccepted
                      ? "The rider has accepted. Mark order as ready to ship and they will pick up from your store."
                      : "Mark order as ready to ship? Rider will be notified to pick up.",
                  )
                }
                disabled={processing}
              >
                <Text style={styles.actionButtonText}>Ready to Ship</Text>
              </TouchableOpacity>
            )}

          {isReadyToShip && showReadyToShip && !isPickup && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyToShipButton]}
              onPress={() =>
                showActionConfirmation(
                  "ready_to_ship",
                  "Ready to Ship",
                  "Mark this order as ready to ship?",
                )
              }
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Ready to Ship</Text>
            </TouchableOpacity>
          )}

          {!isProcessing &&
            !isReadyToShip &&
            !isWaitingForRider &&
            showArrangeShipment &&
            !isPickup &&
            !isRiderDeclined && (
              <TouchableOpacity
                style={[styles.actionButton, styles.readyToShipButton]}
                onPress={() =>
                  showActionConfirmation(
                    "arrange_shipment",
                    "Arrange Shipment",
                    "Assign riders for this delivery? Nearby riders will be notified.",
                  )
                }
                disabled={processing}
              >
                <Text style={styles.actionButtonText}>Arrange Shipment</Text>
              </TouchableOpacity>
            )}

          {showToDeliver && !isPickup && shopStatus !== "shipped" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#8B5CF6" }]}
              onPress={() =>
                showActionConfirmation(
                  "to_deliver",
                  "Out for Delivery",
                  "Mark this order as out for delivery?",
                )
              }
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Out for Delivery</Text>
            </TouchableOpacity>
          )}

          {showReadyForPickup && isPickup && (
            <TouchableOpacity
              style={[styles.actionButton, styles.readyToShipButton]}
              onPress={() =>
                showActionConfirmation(
                  "ready_for_pickup",
                  "Ready for Pickup",
                  "Notify the customer their order is ready for pickup?",
                )
              }
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Ready for Pickup</Text>
            </TouchableOpacity>
          )}

          {showPickedUp && isPickup && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() =>
                showActionConfirmation(
                  "picked_up",
                  "Order Picked Up",
                  "Confirm the customer has collected the order?",
                )
              }
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {showCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                const isShipmentCancel =
                  order?.status === "rider_assigned" ||
                  order?.status === "waiting_for_rider" ||
                  order?.delivery_info?.status === "pending";
                const title = isShipmentCancel
                  ? "Cancel Shipment"
                  : "Cancel Order";
                const description = isShipmentCancel
                  ? "Are you sure you want to cancel this shipment? The order will be reverted to processing."
                  : "Are you sure you want to cancel this order? This cannot be undone.";
                showActionConfirmation("cancel", title, description);
              }}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation || !selectedAction) return null;
    return (
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationIcon}>
              <Ionicons
                name={
                  selectedAction.type === "cancel"
                    ? "alert-circle"
                    : "checkmark-circle"
                }
                size={56}
                color={selectedAction.type === "cancel" ? "#EF4444" : "#10B981"}
              />
            </View>
            <Text style={styles.confirmationTitle}>{selectedAction.title}</Text>
            <Text style={styles.confirmationDescription}>
              {selectedAction.description}
            </Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelConfirmButton]}
                onPress={() => setShowConfirmation(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmActionButton]}
                onPress={executeAction}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionButtonText}>
                    {selectedAction.type === "cancel"
                      ? "Yes, Cancel"
                      : "Confirm"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchOrderDetails(), fetchAvailableActions()]);
  };

  const isPickupOrder = () =>
    order?.delivery_method?.toLowerCase().includes("pickup") || false;

  const hasActions = () => {
    const {
      showConfirm,
      showCancel,
      showReadyToShip,
      showArrangeShipment,
      showReadyForPickup,
      showPickedUp,
      showToDeliver,
      showDelivered,
      showComplete,
    } = getActionButtons();
    return (
      showConfirm ||
      showCancel ||
      showReadyToShip ||
      showArrangeShipment ||
      showReadyForPickup ||
      showPickedUp ||
      showToDeliver ||
      showDelivered ||
      showComplete
    );
  };

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

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>Unable to load order details</Text>
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

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.total_amount,
    0,
  );
  const total = order.total_amount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButtonHeader}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

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
      >
        {/* Status Card */}
        {renderStatusCard()}

        {/* Rider Information */}
        {renderRiderInfo()}
        {renderPickupInfo()}
        {renderProofOfDelivery()}

        {/* Delivery Address & Buyer Info */}
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
              {order.shipping_address?.recipient_name ||
                `${order.user.first_name} ${order.user.last_name}`}
            </Text>
            <Text style={styles.phoneNumber}>
              {order.shipping_address?.recipient_phone ||
                order.user.contact_number ||
                "No phone number"}
            </Text>
            <Text style={styles.addressText}>
              {order.shipping_address?.full_address ||
                order.delivery_address ||
                "No address provided"}
            </Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="receipt" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Order Details</Text>
          </View>
          <View style={styles.orderDetailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Number</Text>
              <Text style={styles.detailValue}>{order.order_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Date</Text>
              <Text style={styles.detailValue}>
                {formatFullDate(order.created_at)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {order.payment_method || "N/A"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Method</Text>
              <Text style={styles.detailValue}>
                {isPickupOrder()
                  ? "Store Pickup"
                  : order.delivery_method || "Standard Delivery"}
              </Text>
            </View>
            {order.pickup_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup Date</Text>
                <Text style={styles.detailValue}>
                  {formatFullDate(order.pickup_date)}
                </Text>
              </View>
            )}
            {order.delivery_info?.tracking_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tracking Number</Text>
                <Text style={styles.detailValue}>
                  {order.delivery_info.tracking_number}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="shopping-bag" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
          </View>
          {order.items.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                styles.orderItem,
                item.status === "cancelled" && styles.cancelledOrderItem,
              ]}
            >
              <Image
                source={{ uri: getProductImageUrl(item) }}
                style={[
                  styles.itemImage,
                  item.status === "cancelled" && styles.cancelledItemImage,
                ]}
              />
              <View style={styles.itemDetails}>
                <Text
                  style={[
                    styles.itemName,
                    item.status === "cancelled" && styles.cancelledItemText,
                  ]}
                >
                  {item.cart_item?.product?.name || "Product Name"}
                </Text>
                <Text style={styles.itemVariant}>
                  {item.cart_item?.product?.variant || "Standard"}
                </Text>

                {item.status === "cancelled" && (
                  <View style={styles.cancelledBadge}>
                    <MaterialIcons name="cancel" size={12} color="#EF4444" />
                    <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                  </View>
                )}

                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.cart_item?.product?.price || 0)}
                  </Text>
                  <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.itemTotal,
                  item.status === "cancelled" && styles.cancelledItemText,
                ]}
              >
                {formatCurrency(item.cart_item?.product?.price || 0)}
              </Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="receipt-long" size={20} color="#111827" />
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Price</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  order.items.reduce(
                    (sum, item) => sum + (item.cart_item?.product?.price || 0),
                    0,
                  ),
                )}
              </Text>
            </View>
            {order?.shipping_fee ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.shipping_fee)}
                </Text>
              </View>
            ) : null}
            {order?.total_vat ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>VAT (Value Added Tax)</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.total_vat)}
                </Text>
              </View>
            ) : null}
            {order?.transaction_fee ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Transaction Fee</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.transaction_fee)}
                </Text>
              </View>
            ) : null}
            {/* Add discount row here - shows even when 0 */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount Applied</Text>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                -{formatCurrency(order.discount_applied || 0)}
              </Text>
            </View>
            <View style={styles.dividerLight} />
            <View style={styles.dividerLight} />
            <View style={styles.totalSummaryRow}>
              <Text style={styles.totalSummaryLabel}>Total</Text>
              <Text style={styles.totalSummaryValue}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Extra padding for sticky footer */}
        {hasActions() && <View style={styles.footerPadding} />}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.modalOverlayImage}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
            />
          )}
        </View>
      </Modal>

      {/* Riders Comparison Modal */}
      {renderRidersModal()}

      {/* Sticky Action Buttons */}
      {renderActionButtons()}

      {/* Confirmation Modal */}
      {renderConfirmationModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerSafeArea: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingTop: Platform.OS === "ios" ? 44 : 40,
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
  modalOverlayImage: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  previewImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
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
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  statusCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  statusCardHeader: { marginBottom: 8 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusCardDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 4,
  },
  confirmationProgress: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#FDE68A",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#FDE68A",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#92400E",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "500",
  },
  cardContent: { paddingLeft: 28 },
  recipientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  orderDetailsContent: { paddingLeft: 28 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  detailValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  itemsCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  orderItem: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  itemVariant: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 6,
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemPrice: {
    fontSize: 13,
    color: "#8E8E93",
  },
  itemQuantity: {
    fontSize: 13,
    color: "#8E8E93",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginLeft: "auto",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 20,
  },
  summaryContent: { paddingLeft: 28 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  summaryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  dividerLight: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 12,
  },
  totalSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalSummaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  totalSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F97316",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingBottom: Platform.OS === "ios" ? 8 : 5,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: { backgroundColor: "#10B981" },
  readyToShipButton: { backgroundColor: "#3B82F6" },
  cancelButton: { backgroundColor: "#EF4444" },
  printWaybillButton: { backgroundColor: "#8B5CF6" },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footerPadding: { height: 70 },
  confirmationIcon: { marginBottom: 16 },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  confirmationDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmationButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelConfirmButton: { backgroundColor: "#F5F5F5" },
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  confirmActionButton: { backgroundColor: "#F97316" },
  confirmActionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  riderPhone: {
    fontSize: 13,
    color: "#3B82F6",
  },
  waitingText: {
    fontSize: 13,
    color: "#F97316",
    fontStyle: "italic",
  },
  deliveryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  deliveryStatusText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  readyToShipButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  pickupInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pickupExpireText: {
    fontSize: 13,
    color: "#6B7280",
  },
  expiredWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 8,
  },
  expiredWarningText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },
  cancelledOrderItem: {
    backgroundColor: "#FEF2F2",
    opacity: 0.8,
  },
  cancelledItemImage: {
    opacity: 0.5,
  },
  cancelledItemText: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#EF4444",
  },
  riderSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  riderListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  riderListLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  riderListName: {
    fontSize: 13,
    color: "#374151",
  },
  riderListDistance: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "500",
  },
  viewMoreButton: {
    marginTop: 8,
    alignItems: "center",
  },
  viewMoreText: {
    fontSize: 12,
    color: "#F97316",
  },
  nearestRiderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#F3F4F6",
  },
  nearestRiderText: {
    fontSize: 12,
    color: "#F59E0B",
  },
  ridersModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: width - 32,
    maxHeight: "80%",
    marginHorizontal: 16,
  },
  ridersModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  ridersModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  ridersModalContent: {
    padding: 16,
  },
  ridersModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  ridersModalFooterText: {
    fontSize: 12,
    color: "#6B7280",
  },
  nearestRiderCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  nearestRiderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  nearestRiderCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  nearestRiderDetails: {
    paddingLeft: 30,
  },
  nearestRiderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  nearestRiderUsername: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  nearestRiderStats: {
    flexDirection: "row",
    gap: 16,
  },
  nearestRiderStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nearestRiderStatText: {
    fontSize: 12,
    color: "#374151",
  },
  allRidersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  riderModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  riderModalRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  riderModalRankText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  riderModalInfo: {
    flex: 1,
  },
  riderModalName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  riderModalUsername: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  riderModalDetails: {
    flexDirection: "row",
    gap: 12,
  },
  riderModalDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  riderModalDetailText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  riderModalDistance: {
    alignItems: "flex-end",
  },
  riderModalDistanceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
  },
  riderModalDistanceLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  nearestBadge: {
    fontSize: 9,
    fontWeight: "600",
    color: "#F59E0B",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
    overflow: "hidden",
  },
  textDeclined: {
    color: "#EF4444",
    textDecorationLine: "line-through",
  },
  declinedWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#FEE2E2",
  },
  declinedWarningText: {
    fontSize: 12,
    color: "#EF4444",
  },
});
