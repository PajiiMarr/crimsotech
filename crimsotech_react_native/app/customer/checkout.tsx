import React, { useState, useEffect, useCallback, useRef} from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Platform,
} from "react-native";
import { Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";
import {
  MaterialIcons,
  FontAwesome5,
  FontAwesome,
  Ionicons, 
} from "@expo/vector-icons";
// Helper function for number formatting
const formatNumber = (value: number): string => {
  if (isNaN(value)) return "0.00";
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
// Types
interface CartItem {
  id: string;
  cartItemId?: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  shop_name: string;
  shop_id: string;
  image?: string;
  is_ordered: boolean;
  subtotal: number;
  variant?: {
    id: string;
    title?: string;
    price?: number;
  };
}
interface Voucher {
  id: string;
  code: string;
  name: string;
  discount_type: "percentage" | "fixed";
  value: number;
  minimum_spend: number;
  shop_name: string;
  shop_id?: string | null;
  description: string;
  potential_savings: number;
  customer_tier?: string;
  is_recommended?: boolean;
  is_general?: boolean;
  discount_amount?: number;
  voucher_type?: "shop" | "product";
}
interface VoucherCategory {
  category: string;
  vouchers: Voucher[];
}
interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name?: string;
  floor_number?: string;
  unit_number?: string;
  landmark?: string;
  instructions?: string;
  address_type: string;
  is_default: boolean;
  full_address: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
}
interface ShopAddress {
  shop_id: string;
  shop_name: string;
  shop_address: string;
  shop_street: string;
  shop_barangay: string;
  shop_city: string;
  shop_province: string;
  shop_contact_number?: string;
  distance_km?: number;
  distance_text?: string;
  address_type?: string;
}
interface UserPurchaseStats {
  total_spent: number;
  recent_orders_count: number;
  average_order_value: number;
  customer_tier: string;
}
interface CheckoutSummary {
  subtotal: number;
  delivery: number;
  total: number;
  item_count: number;
  shop_count: number;
}
interface CheckoutData {
  success: boolean;
  checkout_items: CartItem[];
  summary: CheckoutSummary;
  available_vouchers: VoucherCategory[];
  user_purchase_stats: UserPurchaseStats;
  shipping_addresses: ShippingAddress[];
  default_shipping_address: ShippingAddress | null;
  seller_addresses: ShopAddress[];
}
// Payment methods with icons
const paymentMethods = [
  {
    id: "cod",
    name: (shippingMethod: string) =>
      shippingMethod === "Pickup from Store"
        ? "Cash on Pickup"
        : "Cash on Delivery",
    description: (shippingMethod: string) =>
      shippingMethod === "Pickup from Store"
        ? "Pay when you pick up your order"
        : "Pay when you receive your order",
    icon: "wallet",
    iconSet: "FontAwesome5" as const,
    iconColor: "#EA580C",
    imageUrl: null,
  },
  {
    id: "maya",
    name: "Maya",
    description: "Pay using Maya wallet (5% fee, max ₱50)",
    icon: "wallet",  
    iconSet: "FontAwesome5" as const,  
    iconColor: "#EA580C",
    imageUrl: null,  
  },
];
// Shipping methods
const shippingMethods = [
  {
    id: "pickup",
    name: "Pickup from Store" as const,
    description: "Collect from seller's shop",
    icon: "store",
    iconSet: "MaterialIcons" as const,
    delivery: "Ready in 1-2 hours",
    cost: 0,
  },
  {
    id: "standard",
    name: "Standard Delivery" as const,
    description: "Door-to-door delivery",
    icon: "local-shipping",
    iconSet: "MaterialIcons" as const,
    delivery: "2-4 business days",
    cost: 0,
  },
];
export default function CheckoutPage() {
  const { userId, userRole, loading: authLoading } = useAuth();
  const params = useLocalSearchParams();
  // Optional direct params: cartId and productId
  const cartId = params?.cartId ? String(params.cartId).trim() : null;
  const productId = params?.productId ? String(params.productId).trim() : null;
  // Normalize selected ids from query params
  const getSelectedIds = () => {
    const raw = (params?.selected ??
      params?.selectedIds ??
      params?.items ??
      params?.ids) as string | string[] | undefined;
    if (!raw) return [] as string[];
    if (Array.isArray(raw))
      return raw
        .flatMap((r) => String(r).split(","))
        .map((s) => s.trim())
        .filter(Boolean);
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };
  const selectedIds = getSelectedIds();
  // Determine if we have a valid entry point
  const hasValidEntry =
    selectedIds.length > 0 || cartId !== null || productId !== null;
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [activeVoucherCategory, setActiveVoucherCategory] = useState("all");
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [isShippingMethodDropdownOpen, setIsShippingMethodDropdownOpen] = useState(false);
  const [centerToastVisible, setCenterToastVisible] = useState(false);
  const [centerToastMessage, setCenterToastMessage] = useState("");
  // Form state
  const [formData, setFormData] = useState({
    agreeTerms: false,
    shippingMethod: "Pickup from Store" as
      | "Pickup from Store"
      | "Standard Delivery",
    paymentMethod: "Cash on Pickup",
    remarks: "",
    selectedAddressId: null as string | null,
  });
  const [processingOrder, setProcessingOrder] = useState(false);
  const [summary, setSummary] = useState({
    subtotal: 0,
    delivery: 0,
    total: 0,
    discount: 0,
  });

  // Calculate transaction fee based on payment method
  const calculateTransactionFee = useCallback((baseTotal: number, paymentMethod: string) => {
    const eWalletMethods = ["Maya", "GCash"];
    if (eWalletMethods.includes(paymentMethod)) {
      const fee = baseTotal * 0.05;
      return Math.min(fee, 50);
    }
    return 0;
  }, []);

  // Recalculate total whenever subtotal, delivery, discount, or payment method changes
  useEffect(() => {
    const baseTotal = summary.subtotal + summary.delivery - summary.discount;
    const fee = calculateTransactionFee(baseTotal, formData.paymentMethod);
    setSummary(prev => ({
      ...prev,
      total: baseTotal + fee,
    }));
  }, [summary.subtotal, summary.delivery, summary.discount, formData.paymentMethod]);

  const getTransactionFee = useCallback(() => {
    const baseTotal = summary.subtotal + summary.delivery - summary.discount;
    return calculateTransactionFee(baseTotal, formData.paymentMethod);
  }, [summary.subtotal, summary.delivery, summary.discount, formData.paymentMethod, calculateTransactionFee]);

  // Build API params depending on which entry point was used
  const buildCheckoutApiParams = () => {
    const base: Record<string, any> = { user_id: userId };
    if (cartId) {
      base.cart_id = cartId;
    } else if (productId) {
      base.product_id = productId;
    } else {
      base.selected = selectedIds.join(",");
    }
    if (formData.selectedAddressId) {
      base.selected_address_id = formData.selectedAddressId;
    }
    return base;
  };
  // Build order request body
  const buildOrderRequestBody = (checkoutItems: CartItem[]) => {
    const base: Record<string, any> = {
      user_id: userId,
      shipping_address_id: formData.selectedAddressId,
      payment_method: formData.paymentMethod,
      shipping_method: formData.shippingMethod,
      voucher_id: appliedVoucher?.id || null,
      remarks: formData.remarks.substring(0, 500) || null,
    };
    if (cartId) {
      base.cart_id = cartId;
    } else if (productId) {
      base.product_id = productId;
      if (checkoutItems && checkoutItems.length > 0) {
        base.variant_id = checkoutItems[0].variant?.id;
        base.quantity = checkoutItems[0].quantity;
      }
    } else {
      base.selected_ids = checkoutItems.map((p) => p.cartItemId || p.id);
    }
    return base;
  };
  // Fetch checkout data
  const fetchCheckoutData = useCallback(async () => {
    if (!userId || !hasValidEntry) {
      setLoading(false);
      setError(
        userId ? "No items selected for checkout" : "Please login to checkout"
      );
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await AxiosInstance.get(
        "/checkout-order/get_checkout_items/",
        { params: buildCheckoutApiParams() }
      );
      if (response.data.success) {
        const hasOrderedItems = response.data.checkout_items?.some(
          (item: any) => item.is_ordered === true
        );
        if (hasOrderedItems) {
          setError(
            "Some items in your cart have already been ordered. Please refresh your cart."
          );
          setCheckoutData(null);
          return;
        }
        const normalizedItems = response.data.checkout_items.map(
          (item: any) => ({
            ...item,
            cartItemId: item.id || item.cartItemId,
            variant: item.variant,
          })
        );
        
        // Ensure available_vouchers is properly set
        const availableVouchers = response.data.available_vouchers || [];
        
        setCheckoutData({
          ...response.data,
          checkout_items: normalizedItems,
          available_vouchers: availableVouchers,
        });
        
        if (response.data.summary) {
          setSummary({
            subtotal: response.data.summary.subtotal,
            delivery: response.data.summary.delivery,
            total: response.data.summary.total,
            discount: 0,
          });
        }
        if (response.data.default_shipping_address) {
          setFormData((prev) => ({
            ...prev,
            selectedAddressId: response.data.default_shipping_address.id,
          }));
        }
      } else {
        setError(response.data.error || "Failed to load checkout items");
      }
    } catch (error: any) {
      console.error("Error fetching checkout data:", error);
      let errorMessage = "Failed to load checkout items";
      if (error.response?.status === 404) {
        errorMessage = error.response.data?.error || "Checkout items not found";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Invalid request";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      }
      setError(errorMessage);
      setCheckoutData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedIds, cartId, productId, formData.selectedAddressId]);
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoading(false);
      setError("Please login to checkout");
      return;
    }
    if (!hasValidEntry) {
      setLoading(false);
      setError("No items selected for checkout");
      return;
    }
    fetchCheckoutData();
  }, [authLoading, userId, hasValidEntry]);
  // Fetch vouchers when subtotal changes
  const fetchVouchersByAmount = useCallback(async (amount: number) => {
    if (!userId) return;
    setLoadingVouchers(true);
    try {
      const response = await AxiosInstance.get(
        "/checkout-order/get_vouchers_by_amount/",
        {
          params: {
            user_id: userId,
            amount: amount,
          },
        }
      );
      if (response.data.success && response.data.available_vouchers) {
        setCheckoutData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            available_vouchers: response.data.available_vouchers,
          };
        });
      }
    } catch (err: any) {
      console.error("Error fetching vouchers by amount:", err.response?.data || err);
    } finally {
      setLoadingVouchers(false);
    }
  }, [userId]);
  // Fetch vouchers when subtotal changes
  useEffect(() => {
    if (summary.subtotal > 0 && userId) {
      const timer = setTimeout(() => {
        fetchVouchersByAmount(summary.subtotal);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [summary.subtotal, userId, fetchVouchersByAmount]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckoutData();
  };
  // Handle shipping method selection
  const handleShippingMethodSelect = (method: "Pickup from Store" | "Standard Delivery") => {
    setFormData((prev) => ({ ...prev, shippingMethod: method }));
    
    const codMethod = paymentMethods.find((m) => m.id === "cod");
    if (codMethod) {
      const methodName =
        typeof codMethod.name === "function"
          ? codMethod.name(method)
          : codMethod.name;
      if (
        formData.paymentMethod === "Cash on Pickup" ||
        formData.paymentMethod === "Cash on Delivery"
      ) {
        setFormData((prev) => ({ ...prev, paymentMethod: methodName }));
      }
    }
    
    const deliveryCost = method === "Pickup from Store" ? 0 : (checkoutData?.summary?.delivery || 50);
    setSummary((prev) => ({
      ...prev,
      delivery: deliveryCost,
    }));
    setIsShippingMethodDropdownOpen(false);
  };
  // Handle payment method change - Radio button style
  const handlePaymentMethodSelect = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    if (method) {
      const methodName =
        typeof method.name === "function"
          ? method.name(formData.shippingMethod)
          : method.name;
      setFormData((prev) => ({
        ...prev,
        paymentMethod: methodName,
      }));
    }
  };
  useEffect(() => {
    if (checkoutData?.default_shipping_address && !formData.selectedAddressId) {
      setFormData(prev => ({
        ...prev,
        selectedAddressId: checkoutData.default_shipping_address!.id
      }));
    }
  }, [checkoutData?.default_shipping_address]);
  // Check if voucher is applicable
  const isVoucherApplicable = (voucher: Voucher) => {
    if (voucher.minimum_spend > summary.subtotal) return false;
    if (!voucher.is_general && voucher.shop_name !== "All Shops") {
      return checkoutData?.checkout_items.some(
        (item) => item.shop_name === voucher.shop_name
      ) || false;
    }
    return true;
  };
  const getVoucherInapplicableReason = (voucher: Voucher) => {
    if (voucher.minimum_spend > summary.subtotal) {
      return `Min: ₱${formatNumber(voucher.minimum_spend)}`;
    }
    if (!voucher.is_general && voucher.shop_name !== "All Shops") {
      const hasShop = checkoutData?.checkout_items.some(
        (item) => item.shop_name === voucher.shop_name
      );
      if (!hasShop) return `Only ${voucher.shop_name}`;
    }
    return null;
  };
  // Apply voucher
  const handleApplyVoucher = async (voucher: Voucher) => {
    if (!checkoutData || !userId) {
      setVoucherError("Unable to apply voucher");
      return;
    }
    if (!isVoucherApplicable(voucher)) {
      const reason = getVoucherInapplicableReason(voucher);
      Alert.alert(
        "Voucher Not Applicable",
        reason || "This voucher cannot be applied to your current order",
        [{ text: "OK" }]
      );
      return;
    }
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      let shopId = null;
      if (!voucher.is_general && voucher.shop_name !== "All Shops") {
        const shopItem = checkoutData.checkout_items.find(
          (item) => item.shop_name === voucher.shop_name
        );
        shopId = shopItem?.shop_id || null;
      }
      const response = await AxiosInstance.post(
        "/checkout-order/validate_voucher/",
        {
          voucher_code: voucher.code,
          user_id: userId,
          subtotal: summary.subtotal,
          shop_id: shopId,
        }
      );
      if (response.data.valid) {
        const validatedVoucher = response.data.voucher;
        let discountAmount = 0;
        if (validatedVoucher.discount_type === "percentage") {
          discountAmount = (summary.subtotal * validatedVoucher.value) / 100;
        } else {
          discountAmount = Math.min(validatedVoucher.value, summary.subtotal);
        }
        const voucherWithDiscount = {
          ...validatedVoucher,
          discount_amount: discountAmount,
          is_general: validatedVoucher.is_general || false,
        };
        setAppliedVoucher(voucherWithDiscount);
        setVoucherError(null);
        setIsVoucherModalVisible(false);
        setSummary((prev) => ({
          ...prev,
          discount: discountAmount,
        }));
        Alert.alert("Success", `Voucher ${voucher.code} applied!`);
      } else {
        const errorMessage =
          response.data.error || "This voucher is not applicable to your order";
        setVoucherError(errorMessage);
        Alert.alert("Voucher Not Applicable", errorMessage, [{ text: "OK" }]);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        "This voucher cannot be applied to your order";
      setVoucherError(errorMessage);
      Alert.alert("Voucher Not Applicable", errorMessage, [{ text: "OK" }]);
    } finally {
      setVoucherLoading(false);
    }
  };
  // Remove voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
    setSummary((prev) => ({
      ...prev,
      discount: 0,
    }));
  };
  // Place order
  const handlePlaceOrder = async () => {
    if (!userId || !checkoutData) {
      Alert.alert("Error", "Please complete all required information");
      return;
    }
    if (appliedVoucher && !isVoucherApplicable(appliedVoucher)) {
      const reason = getVoucherInapplicableReason(appliedVoucher);
      Alert.alert(
        "Voucher No Longer Applicable",
        reason ||
          "This voucher is no longer applicable to your order. Please remove it or update your cart.",
        [{ text: "OK" }]
      );
      return;
    }
    if (
      formData.shippingMethod === "Standard Delivery" &&
      !formData.selectedAddressId
    ) {
      Alert.alert("Required", "Please select a shipping address for delivery");
      return;
    }
    if (!formData.agreeTerms) {
      Alert.alert(
        "Required",
        "Please agree to the Terms of Service and Privacy Policy"
      );
      return;
    }
    setProcessingOrder(true);
    setError(null);
    try {
      const requestBody = buildOrderRequestBody(checkoutData.checkout_items);
      const response = await AxiosInstance.post(
        "/checkout-order/create_order/",
        requestBody
      );
      if (response.data.success) {
        const orderId = response.data.order_id;
        const isEWalletPayment = ["Maya"].includes(formData.paymentMethod);
        if (isEWalletPayment) {
          router.push({
            pathname: "/customer/pay-order",
            params: { order_id: orderId },
          });
        } else {
          router.replace({
            pathname: "/customer/order-successful",
            params: { orderId: orderId },
          });
        }
      } else {
        throw new Error(response.data.error || "Failed to create order");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "An error occurred while placing your order";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setProcessingOrder(false);
    }
  };
  // Get selected address (default)
  const getSelectedAddress = () => {
    return checkoutData?.default_shipping_address || null;
  };
  // Get shop addresses
  const getShopAddressesForProducts = () => {
    if (!checkoutData || !checkoutData.seller_addresses) return [];
    return checkoutData.seller_addresses;
  };
  // Get main shop address
  const getMainShopAddress = () => {
    const shopAddresses = getShopAddressesForProducts();
    return shopAddresses.length > 0 ? shopAddresses[0] : null;
  };
  // Get all vouchers
  const getAllVouchers = () => {
    if (!checkoutData || !checkoutData.available_vouchers) return [];
    return checkoutData.available_vouchers.flatMap(
      (category) => category?.vouchers ?? []
    );
  };
  // Get filtered vouchers
  const getFilteredVouchers = () => {
    if (!checkoutData || !checkoutData.available_vouchers) return [];
    if (activeVoucherCategory === "all") return getAllVouchers();
    const category = checkoutData.available_vouchers.find((cat: any) =>
      cat.category.includes(activeVoucherCategory.replace("_", " "))
    );
    return category ? category.vouchers : [];
  };
  // ─── Pickup Disclaimer ───────────────────────────────────
  const PickupDisclaimer = () => {
    if (formData.shippingMethod !== "Pickup from Store") return null;
    return (
      <View style={styles.pickupDisclaimerContainer}>
        <View style={styles.pickupDisclaimerHeader}>
          <MaterialIcons name="info-outline" size={16} color="#EA580C" />
          <Text style={styles.pickupDisclaimerTitle}>Pickup Order Information</Text>
        </View>
        <View style={styles.pickupDisclaimerList}>
          <View style={styles.pickupDisclaimerItem}>
            <MaterialIcons name="check-circle" size={14} color="#EA580C" />
            <Text style={styles.pickupDisclaimerText}>
              Refunds are not processed automatically for pickup orders
            </Text>
          </View>
          <View style={styles.pickupDisclaimerItem}>
            <MaterialIcons name="check-circle" size={14} color="#EA580C" />
            <Text style={styles.pickupDisclaimerText}>
              Buyers must coordinate directly with the seller
            </Text>
          </View>
          <View style={styles.pickupDisclaimerItem}>
            <MaterialIcons name="check-circle" size={14} color="#EA580C" />
            <Text style={styles.pickupDisclaimerText}>
              Platform may assist in dispute resolution
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Get tier badge component
  const renderTierBadge = (tier: string) => {
    const tierConfig = {
      platinum: { label: "Platinum", color: "#92400E" },
      gold: { label: "Gold", color: "#D97706" },
      silver: { label: "Silver", color: "#6B7280" },
      new: { label: "New", color: "#EA580C" },
    };
    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.new;
    return (
      <View style={[styles.tierBadge, { backgroundColor: config.color }]}>
        <Text style={styles.tierBadgeText}>{config.label}</Text>
      </View>
    );
  };
  const isShippingAddressRequired = () => formData.shippingMethod === "Standard Delivery";
  const getPlaceOrderButtonText = () => {
    if (processingOrder) return "Processing Order...";
    const isEWalletPayment = ["Maya"].includes(formData.paymentMethod);
    if (isEWalletPayment) {
      return `Pay with ${formData.paymentMethod} • ₱${formatNumber(summary.total)}`;
    }
    return `Place Order • ₱${formatNumber(summary.total)}`;
  };
  const transactionFee = getTransactionFee();
  const baseTotalDisplay = summary.subtotal + summary.delivery - summary.discount;
  // Loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Role guard
  if (userRole && userRole !== "customer") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="warning" size={64} color="#F59E0B" />
          <Text style={styles.message}>Not authorized to view this page</Text>
          <Text style={styles.subMessage}>This page is for customers only</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Error or no data state
  if (
    error ||
    !checkoutData ||
    !Array.isArray(checkoutData.checkout_items) ||
    checkoutData.checkout_items.length === 0
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={80} color="#E5E5E5" />
          <Text style={styles.emptyTitle}>{error || "No items selected"}</Text>
          <Text style={styles.emptyText}>
            {error ? error : "Please add items to your cart first"}
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/customer/cart")}
          >
            <Text style={styles.shopButtonText}>Go to Cart</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const selectedAddress = getSelectedAddress();
  const allVouchers = getAllVouchers();
  const filteredVouchers = getFilteredVouchers();
  const mainShopAddress = getMainShopAddress();
  
  const getDeliveryFeeDisplay = () => {
    if (formData.shippingMethod === "Pickup from Store") return "FREE";
    if (checkoutData?.summary?.delivery) return `₱${formatNumber(checkoutData.summary.delivery)}`;
    return "₱50.00";
  };
  
  // ─── Center Toast Notification ───────────────────────────────────
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
    useEffect(() => {
      if (visible) {
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
        const timer = setTimeout(() => {
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
          ]).start(() => onHide());
        }, 1500);
        return () => clearTimeout(timer);
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
  const getCurrentPaymentMethodName = () => {
    const method = paymentMethods.find(m => {
      const methodName = typeof m.name === "function" ? m.name(formData.shippingMethod) : m.name;
      return methodName === formData.paymentMethod;
    });
    if (method) {
      return typeof method.name === "function" ? method.name(formData.shippingMethod) : method.name;
    }
    return formData.paymentMethod;
  };
  return (
    <SafeAreaView style={styles.container}>
      <CenterToast
        visible={centerToastVisible}
        message={centerToastMessage}
        iconName="checkmark-circle"
        onHide={() => setCenterToastVisible(false)}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EA580C"]}
            tintColor="#EA580C"
          />
        }
      >
        {/* Header */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Checkout</Text>
              <Text style={styles.headerSubtitle}>Complete your purchase</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        {error && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {/* Order Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderCompact}>
            <MaterialIcons name="shopping-cart" size={20} color="#EA580C" />
            <Text style={styles.sectionTitleCompact}>Order Summary</Text>
          </View>
          <View style={styles.itemsListCompact}>
            {checkoutData.checkout_items.map((item) => (
              <View key={item.id} style={styles.itemCardCompact}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImageCompact} />
                ) : (
                  <View style={[styles.itemImageCompact, styles.itemImagePlaceholder]}>
                    <MaterialIcons name="image" size={16} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.itemDetailsCompact}>
                  <Text style={styles.itemNameCompact} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemShopCompact}>{item.shop_name}</Text>
                  <View style={styles.itemBottomRowCompact}>
                    <Text style={styles.itemTotalPriceCompact}>
                      ₱{formatNumber(item.price * item.quantity)}
                    </Text>
                    <Text style={styles.quantityTextCompact}>x{item.quantity}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        {/* Delivery Address */}
        {selectedAddress && (
          <View style={styles.sectionCard}>
            <View style={styles.addressHeaderCompact}>
              <MaterialIcons name="home" size={16} color="#EA580C" />
              <Text style={styles.sectionTitleCompact}>Delivery Address</Text>
            </View>
            <View style={styles.addressDisplayCompact}>
              <Text style={styles.addressNameCompact}>{selectedAddress.recipient_name}</Text>
              <Text style={styles.addressPhoneCompact}>{selectedAddress.recipient_phone}</Text>
              <Text style={styles.addressFullCompact}>{selectedAddress.full_address}</Text>
            </View>
          </View>
        )}
        {/* Shop Address */}
        {mainShopAddress && (
          <View style={styles.sectionCard}>
            <View style={styles.addressHeaderCompact}>
              <MaterialIcons name="store" size={16} color="#EA580C" />
              <Text style={styles.sectionTitleCompact}>Shop Address</Text>
            </View>
            <View style={styles.addressDisplayCompact}>
              <Text style={styles.addressNameCompact}>{mainShopAddress.shop_name}</Text>
              <Text style={styles.addressFullCompact}>{mainShopAddress.shop_address}</Text>
              {mainShopAddress.shop_contact_number && (
                <Text style={styles.addressPhoneCompact}>Contact: {mainShopAddress.shop_contact_number}</Text>
              )}
            </View>
            <PickupDisclaimer />
          </View>
        )}
        {/* Shipping Method - Dropdown */}
        <View style={styles.sectionCard}>
          <TouchableOpacity 
            style={styles.dropdownRowCompact}
            onPress={() => setIsShippingMethodDropdownOpen(!isShippingMethodDropdownOpen)}
          >
            <View style={styles.dropdownLeftCompact}>
              <MaterialIcons name="local-shipping" size={20} color="#EA580C" />
              <Text style={styles.dropdownLabelCompact}>Shipping Method</Text>
            </View>
            <View style={styles.dropdownRightCompact}>
              <Text style={styles.dropdownValueCompact}>{formData.shippingMethod}</Text>
              <MaterialIcons 
                name={isShippingMethodDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={20} 
                color="#6B7280" 
              />
            </View>
          </TouchableOpacity>
          {isShippingMethodDropdownOpen && (
            <View style={styles.dropdownMenuCompact}>
              {shippingMethods.map((method) => {
                const costDisplay = method.name === "Pickup from Store" 
                  ? "FREE" 
                  : checkoutData?.summary?.delivery 
                    ? `₱${formatNumber(checkoutData.summary.delivery)}` 
                    : "₱50.00";
                const isSelected = formData.shippingMethod === method.name;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.dropdownItemCompact, isSelected && styles.dropdownItemSelectedCompact]}
                    onPress={() => handleShippingMethodSelect(method.name)}
                  >
                    <View style={styles.dropdownItemLeftCompact}>
                      <MaterialIcons name={method.icon as any} size={18} color={isSelected ? "#EA580C" : "#6B7280"} />
                      <View>
                        <Text style={[styles.dropdownItemTitleCompact, isSelected && styles.dropdownItemTitleSelectedCompact]}>
                          {method.name}
                        </Text>
                        <Text style={styles.dropdownItemSubtitleCompact}>{method.description}</Text>
                      </View>
                    </View>
                    <Text style={[styles.dropdownItemPriceCompact, isSelected && styles.dropdownItemPriceSelectedCompact]}>
                      {costDisplay}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        {/* Payment Method - Radio buttons */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleCompact}>Payment Method</Text>
          <View style={styles.paymentMethodsContainerCompact}>
            {paymentMethods.map((method) => {
              const methodName = typeof method.name === "function"
                ? method.name(formData.shippingMethod)
                : method.name;
              const isSelected = formData.paymentMethod === methodName;
              const IconComponent = method.iconSet === "FontAwesome5" ? FontAwesome5 : FontAwesome;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.paymentMethodCardCompact, isSelected && styles.paymentMethodCardSelectedCompact]}
                  onPress={() => handlePaymentMethodSelect(method.id)}
                >
                  <View style={styles.paymentMethodLeftCompact}>
                    {method.imageUrl ? (
                      <Image source={{ uri: method.imageUrl }} style={styles.paymentMethodImageCompact} />
                    ) : (
                      <View style={styles.paymentMethodIconCompact}>
                        <IconComponent name={method.icon as any} size={18} color={isSelected ? "#EA580C" : "#6B7280"} />
                      </View>
                    )}
                    <View style={styles.paymentMethodInfoCompact}>
                      <Text style={[styles.paymentMethodNameCompact, isSelected && styles.paymentMethodNameSelectedCompact]}>
                        {methodName}
                      </Text>
                      <Text style={styles.paymentMethodDescriptionCompact}>
                        {typeof method.description === "function"
                          ? method.description(formData.shippingMethod)
                          : method.description}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radioButtonCompact, isSelected && styles.radioButtonSelectedCompact]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {/* Vouchers */}
        <View style={styles.sectionCard}>
          <TouchableOpacity 
            style={styles.dropdownRowCompact}
            onPress={() => setIsVoucherModalVisible(true)}
          >
            <View style={styles.dropdownLeftCompact}>
              <MaterialIcons name="local-offer" size={20} color="#EA580C" />
              <Text style={styles.dropdownLabelCompact}>Vouchers</Text>
            </View>
            <View style={styles.dropdownRightCompact}>
              <Text style={styles.dropdownValueCompact}>
                {appliedVoucher ? appliedVoucher.code : "Select voucher"}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>
          {appliedVoucher && (
            <View style={styles.appliedVoucherCompact}>
              <View style={styles.appliedVoucherInfoCompact}>
                <MaterialIcons name="check-circle" size={14} color="#059669" />
                <Text style={styles.appliedVoucherCodeCompact}>{appliedVoucher.code}</Text>
                <Text style={styles.appliedVoucherDiscountCompact}>
                  -₱{formatNumber(summary.discount)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveVoucher}>
                <MaterialIcons name="close" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Order Remarks */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleCompact}>Order Remarks (Optional)</Text>
          <TextInput
            style={styles.remarksInputCompact}
            placeholder="Any special instructions?"
            placeholderTextColor="#9CA3AF"
            value={formData.remarks}
            onChangeText={(text) => setFormData(prev => ({ ...prev, remarks: text }))}
            multiline
            maxLength={500}
          />
          <Text style={styles.remarksCounterCompact}>{formData.remarks.length}/500</Text>
        </View>
        {/* Price Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleCompact}>Price Details</Text>
          <View style={styles.orderSummaryCompact}>
            <View style={styles.summaryRowCompact}>
              <Text style={styles.summaryLabelCompact}>Subtotal ({checkoutData.checkout_items.length} items)</Text>
              <Text style={styles.summaryValueCompact}>₱{formatNumber(summary.subtotal)}</Text>
            </View>
            <View style={styles.summaryRowCompact}>
              <Text style={styles.summaryLabelCompact}>Delivery Fee</Text>
              <Text style={styles.summaryValueCompact}>{getDeliveryFeeDisplay()}</Text>
            </View>
            {appliedVoucher && (
              <View style={styles.discountRowCompact}>
                <Text style={styles.discountLabelCompact}>Discount ({appliedVoucher.code})</Text>
                <Text style={styles.discountValueCompact}>-₱{formatNumber(summary.discount)}</Text>
              </View>
            )}
            {/* Transaction Fee - Only show for e-wallet payments */}
            {formData.paymentMethod === "Maya" && transactionFee > 0 && (
              <View style={styles.transactionFeeRowCompact}>
                <View>
                  <Text style={styles.transactionFeeLabelCompact}>Transaction Fee</Text>
                  <Text style={styles.transactionFeeNoteCompact}>5% capped at ₱50</Text>
                </View>
                <Text style={styles.transactionFeeValueCompact}>₱{formatNumber(transactionFee)}</Text>
              </View>
            )}
            <View style={styles.dividerCompact} />
            <View style={styles.totalRowCompact}>
              <Text style={styles.totalLabelCompact}>Total Payment</Text>
              <View style={styles.totalRightCompact}>
                <Text style={styles.totalValueCompact}>₱{formatNumber(summary.total)}</Text>
              </View>
            </View>
            {formData.paymentMethod === "Maya" && transactionFee > 0 && (
              <Text style={styles.transactionFeeInfoCompact}>
                * Includes ₱{formatNumber(transactionFee)} transaction fee (5% of ₱{formatNumber(baseTotalDisplay)}, capped at ₱50)
              </Text>
            )}
          </View>
        </View>
        {/* Terms and Conditions */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.termsRowCompact}
            onPress={() => setFormData(prev => ({ ...prev, agreeTerms: !prev.agreeTerms }))}
          >
            <View style={[styles.checkboxCompact, formData.agreeTerms && styles.checkboxCheckedCompact]}>
              {formData.agreeTerms && <MaterialIcons name="check" size={12} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsTextCompact}>I agree to Terms & Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.orderSummaryFooterCompact}>
          <View style={styles.summaryRowCompact}>
            <Text style={styles.summaryLabelCompact}>Total</Text>
            <Text style={styles.summaryValueCompact}>₱{formatNumber(summary.total)}</Text>
          </View>
          {formData.paymentMethod === "Maya" && transactionFee > 0 && (
            <Text style={styles.footerTransactionFeeNote}>Includes ₱{formatNumber(transactionFee)} transaction fee</Text>
          )}
          <Text style={styles.totalVatCompact}>Incl. VAT</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (!formData.agreeTerms ||
              (formData.shippingMethod === "Standard Delivery" && !formData.selectedAddressId) ||
              processingOrder) && styles.checkoutButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={
            !formData.agreeTerms ||
            (formData.shippingMethod === "Standard Delivery" && !formData.selectedAddressId) ||
            processingOrder
          }
        >
          {processingOrder ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.checkoutButtonText}>{getPlaceOrderButtonText()}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.footerNotesCompact}>
          <MaterialIcons name="security" size={12} color="#6B7280" />
          <Text style={styles.footerNoteTextCompact}>Secure checkout • Encrypted payment</Text>
        </View>
      </View>
      {/* Voucher Selection Modal */}
      <Modal
        visible={isVoucherModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVoucherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Vouchers</Text>
              <TouchableOpacity onPress={() => setIsVoucherModalVisible(false)} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {checkoutData.available_vouchers && checkoutData.available_vouchers.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voucherCategoryScroll}>
                  <TouchableOpacity
                    style={[styles.voucherCategoryButton, activeVoucherCategory === "all" && styles.voucherCategoryButtonActive]}
                    onPress={() => setActiveVoucherCategory("all")}
                  >
                    <Text style={[styles.voucherCategoryText, activeVoucherCategory === "all" && styles.voucherCategoryTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {checkoutData.available_vouchers.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.voucherCategoryButton, activeVoucherCategory === category.category && styles.voucherCategoryButtonActive]}
                      onPress={() => setActiveVoucherCategory(category.category)}
                    >
                      <Text style={[styles.voucherCategoryText, activeVoucherCategory === category.category && styles.voucherCategoryTextActive]}>
                        {category.category.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {loadingVouchers ? (
                <View style={styles.loadingVouchers}>
                  <ActivityIndicator size="large" color="#EA580C" />
                  <Text style={styles.loadingVouchersText}>Loading vouchers...</Text>
                </View>
              ) : filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher, index) => {
                  const savings = voucher.discount_type === "percentage"
                    ? (summary.subtotal * voucher.value) / 100
                    : Math.min(voucher.value, summary.subtotal);
                  const applicable = isVoucherApplicable(voucher);
                  const reason = getVoucherInapplicableReason(voucher);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.modalVoucherCard, !applicable && styles.modalVoucherCardDisabled]}
                      onPress={() => handleApplyVoucher(voucher)}
                      disabled={!applicable}
                    >
                      <View style={styles.modalVoucherHeader}>
                        <View style={styles.modalVoucherLeft}>
                          <View style={styles.modalVoucherIcon}>
                            {voucher.discount_type === "percentage" ? (
                              <MaterialIcons name="percent" size={24} color="#EA580C" />
                            ) : (
                              <MaterialIcons name="attach-money" size={24} color="#EA580C" />
                            )}
                          </View>
                          <View style={styles.modalVoucherInfo}>
                            <View style={styles.modalVoucherCodeRow}>
                              <Text style={styles.modalVoucherCode}>{voucher.code}</Text>
                              {voucher.is_recommended && (
                                <View style={styles.recommendedBadge}>
                                  <MaterialIcons name="bolt" size={12} color="#FFFFFF" />
                                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
                                </View>
                              )}
                              {voucher.customer_tier && voucher.customer_tier !== "all" && renderTierBadge(voucher.customer_tier)}
                            </View>
                            <Text style={styles.modalVoucherName}>{voucher.name}</Text>
                            <Text style={styles.modalVoucherDescription}>{voucher.description}</Text>
                            <View style={styles.modalVoucherDetails}>
                              <View style={styles.modalVoucherDetail}>
                                <MaterialIcons name="store" size={14} color="#6B7280" />
                                <Text style={styles.modalVoucherDetailText}>{voucher.shop_name}</Text>
                              </View>
                              <View style={styles.modalVoucherDetail}>
                                <Text style={styles.modalVoucherDetailText}>Min: ₱{formatNumber(voucher.minimum_spend)}</Text>
                              </View>
                            </View>
                            {!applicable && reason && (
                              <View style={styles.notApplicableContainer}>
                                <MaterialIcons name="info-outline" size={14} color="#DC2626" />
                                <Text style={styles.notApplicableText}>{reason}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.modalVoucherRight}>
                          <View style={styles.modalVoucherDiscount}>
                            <Text style={styles.modalVoucherDiscountValue}>
                              {voucher.discount_type === "percentage" ? `${voucher.value}%` : `₱${formatNumber(voucher.value)}`}
                            </Text>
                            <Text style={styles.modalVoucherDiscountLabel}>OFF</Text>
                          </View>
                          {applicable && <Text style={styles.modalVoucherSavings}>Save ₱{formatNumber(savings)}</Text>}
                          <View style={[styles.modalApplyButton, !applicable && styles.modalApplyButtonDisabled]}>
                            <Text style={styles.modalApplyButtonText}>{applicable ? "Apply" : "Not Eligible"}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noVouchersContainer}>
                  <MaterialIcons name="local-offer" size={48} color="#D1D5DB" />
                  <Text style={styles.noVouchersTitle}>No Vouchers Available</Text>
                  <Text style={styles.noVouchersText}>No vouchers available for your order.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: "#F0F0F0",
  },
  sectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitleCompact: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  itemsListCompact: { gap: 8 },
  itemCardCompact: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
  },
  itemImageCompact: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#F3F4F6" },
  itemImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  itemDetailsCompact: { flex: 1, marginLeft: 10, justifyContent: "center" },
  itemNameCompact: { fontSize: 13, fontWeight: "500", color: "#111827", marginBottom: 2 },
  itemShopCompact: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  itemBottomRowCompact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTotalPriceCompact: { fontSize: 13, fontWeight: "600", color: "#EA580C" },
  quantityTextCompact: { fontSize: 11, color: "#6B7280" },
  addressHeaderCompact: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  addressDisplayCompact: { backgroundColor: "#F9FAFB", padding: 8, borderRadius: 6 },
  addressNameCompact: { fontSize: 13, fontWeight: "500", color: "#111827", marginBottom: 2 },
  addressPhoneCompact: { fontSize: 11, color: "#6B7280", marginBottom: 2 },
  addressFullCompact: { fontSize: 11, color: "#374151", lineHeight: 15 },
  dropdownRowCompact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  dropdownLeftCompact: { flexDirection: "row", alignItems: "center", gap: 10 },
  dropdownLabelCompact: { fontSize: 14, fontWeight: "500", color: "#111827" },
  dropdownRightCompact: { flexDirection: "row", alignItems: "center", gap: 6 },
  dropdownValueCompact: { fontSize: 13, color: "#6B7280" },
  dropdownMenuCompact: { marginTop: 8, borderTopWidth: 0.5, borderTopColor: "#F0F0F0", paddingTop: 8 },
  dropdownItemCompact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  dropdownItemSelectedCompact: { backgroundColor: "#FFF7ED", marginHorizontal: -12, paddingHorizontal: 12 },
  dropdownItemLeftCompact: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  dropdownItemTitleCompact: { fontSize: 13, fontWeight: "500", color: "#374151" },
  dropdownItemTitleSelectedCompact: { color: "#EA580C" },
  dropdownItemSubtitleCompact: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  dropdownItemPriceCompact: { fontSize: 13, fontWeight: "600", color: "#111827" },
  dropdownItemPriceSelectedCompact: { color: "#EA580C" },
  paymentMethodsContainerCompact: { gap: 8, marginTop: 4 },
  paymentMethodCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },
  paymentMethodCardSelectedCompact: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  paymentMethodLeftCompact: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  paymentMethodIconCompact: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  paymentMethodImageCompact: { width: 32, height: 32, resizeMode: "contain" },
  paymentMethodInfoCompact: { flex: 1 },
  paymentMethodNameCompact: { fontSize: 13, fontWeight: "500", color: "#374151" },
  paymentMethodNameSelectedCompact: { color: "#EA580C" },
  paymentMethodDescriptionCompact: { fontSize: 10, color: "#6B7280", marginTop: 1 },
  radioButtonCompact: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#FFFFFF" },
  radioButtonSelectedCompact: { borderColor: "#EA580C", backgroundColor: "#EA580C" },
  appliedVoucherCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  appliedVoucherInfoCompact: { flexDirection: "row", alignItems: "center", gap: 6 },
  appliedVoucherCodeCompact: { fontSize: 12, fontWeight: "600", color: "#065F46" },
  appliedVoucherDiscountCompact: { fontSize: 11, color: "#059669", fontWeight: "500" },
  transactionFeeRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 2,
  },
  transactionFeeLabelCompact: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "500",
  },
  transactionFeeNoteCompact: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 1,
  },
  transactionFeeValueCompact: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "600",
  },
  transactionFeeInfoCompact: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },
  footerTransactionFeeNote: {
    fontSize: 9,
    color: "#EA580C",
    textAlign: "right",
    marginTop: 2,
  },
  dividerCompact: {
    height: 0.5,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  orderSummaryCompact: { gap: 6, marginTop: 4 },
  summaryRowCompact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabelCompact: { fontSize: 12, color: "#6B7280" },
  summaryValueCompact: { fontSize: 12, color: "#374151", fontWeight: "500" },
  discountRowCompact: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discountLabelCompact: { fontSize: 12, color: "#059669" },
  discountValueCompact: { fontSize: 12, color: "#059669", fontWeight: "600" },
  totalRowCompact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabelCompact: { fontSize: 14, fontWeight: "600", color: "#111827" },
  totalRightCompact: { alignItems: "flex-end" },
  totalValueCompact: { fontSize: 16, fontWeight: "700", color: "#111827" },
  totalVatCompact: { fontSize: 9, color: "#6B7280" },
  remarksInputCompact: {
    borderWidth: 0.5,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#111827",
    minHeight: 60,
    textAlignVertical: "top",
    marginTop: 6,
  },
  remarksCounterCompact: { fontSize: 10, color: "#6B7280", textAlign: "right", marginTop: 2 },
  termsRowCompact: { flexDirection: "row", alignItems: "center" },
  checkboxCompact: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxCheckedCompact: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  termsTextCompact: { fontSize: 12, color: "#374151", flex: 1 },
  footer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 4 },
    }),
  },
  orderSummaryFooterCompact: { marginBottom: 8 },
  checkoutButton: { backgroundColor: "#EA580C", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  checkoutButtonDisabled: { backgroundColor: "#9CA3AF" },
  checkoutButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  footerNotesCompact: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 },
  footerNoteTextCompact: { fontSize: 10, color: "#6B7280" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  message: { fontSize: 18, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 8 },
  subMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#374151", marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  shopButton: { backgroundColor: "#EA580C", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  shopButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  scrollView: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  headerSafeArea: { backgroundColor: "#FFF", paddingTop: Platform.OS === "android" ? 40 : 0 },
  backButton: { padding: 6 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  errorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderWidth: 0.5, borderColor: "#FECACA", marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 6, gap: 6 },
  errorText: { flex: 1, fontSize: 11, color: "#DC2626" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#F0F0F0" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalCloseButton: { padding: 4 },
  modalContent: { paddingHorizontal: 16, paddingVertical: 12 },
  tierBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  tierBadgeText: { fontSize: 9, color: "#FFFFFF", fontWeight: "600" },
  voucherCategoryScroll: { marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 12 },
  voucherCategoryButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F3F4F6", marginRight: 6 },
  voucherCategoryButtonActive: { backgroundColor: "#EA580C" },
  voucherCategoryText: { fontSize: 11, color: "#374151", fontWeight: "500" },
  voucherCategoryTextActive: { color: "#FFFFFF" },
  loadingVouchers: { alignItems: "center", paddingVertical: 30 },
  loadingVouchersText: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  modalVoucherCard: { borderWidth: 0.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, marginBottom: 10 },
  modalVoucherCardDisabled: { opacity: 0.5, backgroundColor: "#F9FAFB" },
  modalVoucherHeader: { flexDirection: "row", justifyContent: "space-between" },
  modalVoucherLeft: { flexDirection: "row", flex: 1 },
  modalVoucherIcon: { marginRight: 10 },
  modalVoucherInfo: { flex: 1 },
  modalVoucherCodeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  modalVoucherCode: { fontSize: 14, fontWeight: "700", color: "#111827" },
  recommendedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EA580C", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, gap: 2 },
  recommendedBadgeText: { fontSize: 9, color: "#FFFFFF", fontWeight: "600" },
  modalVoucherName: { fontSize: 12, color: "#374151", marginBottom: 2 },
  modalVoucherDescription: { fontSize: 11, color: "#6B7280", marginBottom: 8 },
  modalVoucherDetails: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalVoucherDetail: { flexDirection: "row", alignItems: "center", gap: 3 },
  modalVoucherDetailText: { fontSize: 10, color: "#6B7280" },
  notApplicableContainer: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 3 },
  notApplicableText: { fontSize: 10, color: "#DC2626", flex: 1 },
  modalVoucherRight: { alignItems: "flex-end", marginLeft: 10 },
  modalVoucherDiscount: { alignItems: "center", marginBottom: 6 },
  modalVoucherDiscountValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalVoucherDiscountLabel: { fontSize: 9, color: "#6B7280" },
  modalVoucherSavings: { fontSize: 11, color: "#059669", fontWeight: "600", marginBottom: 6 },
  modalApplyButton: { backgroundColor: "#EA580C", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  modalApplyButtonDisabled: { backgroundColor: "#9CA3AF", opacity: 0.7 },
  modalApplyButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
  noVouchersContainer: { alignItems: "center", paddingVertical: 30 },
  noVouchersTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  noVouchersText: { fontSize: 12, color: "#6B7280", textAlign: "center", paddingHorizontal: 16 },
  pickupDisclaimerContainer: {
    backgroundColor: '#FFF7ED',
    marginHorizontal: 0,
    marginBottom: 6,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#FED7AA',
  },
  pickupDisclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pickupDisclaimerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EA580C',
  },
  pickupDisclaimerList: {
    gap: 8,
  },
  pickupDisclaimerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickupDisclaimerText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
});