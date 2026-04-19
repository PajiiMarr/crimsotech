import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface OrderDetails {
  order_id: string;
  status: string;
  approval: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  shipping_address?: {
    recipient_name: string;
    recipient_phone: string;
    full_address: string;
    address_type: string;
  };
}

interface PaymentResponse {
  success: boolean;
  message: string;
  order_id: string;
  maya_checkout_id: string;
  redirect_url: string;
  reference_number: string;
  total_amount: number;
  platform: string;
  is_mobile: boolean;
}

export default function PayOrderPage() {
  const { userId } = useAuth();
  const params = useLocalSearchParams();
  const orderId = params.order_id as string;
  const statusParam = params.status as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "success" | "failed" | "cancelled"
  >("pending");
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (orderId && userId) {
      fetchOrderDetails();
    }

    if (statusParam === "failed") {
      Alert.alert(
        "Payment Failed",
        "Your payment could not be processed. Please try again.",
      );
    } else if (statusParam === "cancelled") {
      Alert.alert("Payment Cancelled", "You cancelled the payment.");
    }
  }, [orderId, userId, statusParam]);

  const fetchOrderDetails = async () => {
    try {
      const response = await AxiosInstance.get(
        `/checkout-order/get_order_details/${orderId}/?platform=mobile`,
        {
          headers: { "X-User-Id": userId },
        },
      );
      setOrder(response.data);
    } catch (err: any) {
      console.error("Error fetching order:", err);
      setError(err.response?.data?.error || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!orderId || !userId) return;

    setLoading(true);
    try {
      console.log("Initiating Maya payment for order:", orderId);

      const response = await AxiosInstance.post<PaymentResponse>(
        "/checkout-order/initiate_maya_payment/",
        {
          order_id: orderId,
          user_id: userId,
          platform: "mobile",
        },
      );

      console.log("Payment initiation response:", response.data);

      if (response.data.success && response.data.redirect_url) {
        setPaymentUrl(response.data.redirect_url);
        setShowWebView(true);
        setPaymentInitiated(true);
        setHasShownSuccess(false);
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to initiate payment",
        );
      }
    } catch (err: any) {
      console.error("Error initiating payment:", err);
      Alert.alert(
        "Payment Error",
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Payment initiation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentStatus = async () => {
    try {
      console.log("Verifying payment status for order:", orderId);
      const response = await AxiosInstance.get(
        `/checkout-order/verify_payment_status/${orderId}/`,
        {
          headers: { "X-User-Id": userId },
        },
      );

      console.log("Payment verification response:", response.data);

      if (
        response.data.success &&
        response.data.payment_status === "completed"
      ) {
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error verifying payment:", err);
      return false;
    }
  };

  const navigateToOrderSuccessful = (orderIdParam: string) => {
    router.replace({
      pathname: "/customer/order-successful",
      params: { orderId: orderIdParam },
    });
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log("WebView URL:", url);

    if (hasShownSuccess) return;

    if (url.includes("/maya-success") || url.includes("/payment-success")) {
      console.log("Success URL detected, verifying payment...");

      setWebViewLoading(true);

      const isPaid = await verifyPaymentStatus();

      if (isPaid) {
        setHasShownSuccess(true);
        setShowWebView(false);
        setWebViewLoading(true);
        setPaymentStatus("success");

        Alert.alert(
          "Payment Successful!",
          "Your payment has been processed successfully.",
          [
            {
              text: "View Order",
              onPress: () => navigateToOrderSuccessful(orderId),
            },
          ],
        );
      } else {
        console.log("Payment not confirmed yet, waiting...");
        setWebViewLoading(false);

        Alert.alert(
          "Payment Processing",
          "Your payment is being processed. You will be notified once confirmed.",
          [
            {
              text: "OK",
              onPress: () => {
                setShowWebView(false);
                navigateToOrderSuccessful(orderId);
              },
            },
          ],
        );
      }
      return;
    }

    if (url.includes("/maya-failure") || url.includes("/payment-failed")) {
      console.log("Failure URL detected");
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);
      setPaymentStatus("failed");

      Alert.alert(
        "Payment Failed",
        "Your payment could not be processed. Please try again.",
        [
          {
            text: "Try Again",
            onPress: () => {
              setPaymentInitiated(false);
              setPaymentUrl("");
              setHasShownSuccess(false);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
        ],
      );
      return;
    }

    if (url.includes("/maya-cancel") || url.includes("/payment-cancel")) {
      console.log("Cancel URL detected");
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);
      setPaymentStatus("cancelled");

      Alert.alert("Payment Cancelled", "You cancelled the payment process.", [
        {
          text: "OK",
          onPress: () => {
            setPaymentInitiated(false);
            setPaymentUrl("");
            setHasShownSuccess(false);
          },
        },
      ]);
      return;
    }

    if (url.startsWith("crimsotechreactnative://")) {
      console.log("Custom scheme detected:", url);
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);

      const match = url.match(/order-successful\/([^?]+)/);
      if (match) {
        const extractedOrderId = match[1];
        navigateToOrderSuccessful(extractedOrderId);
      } else {
        navigateToOrderSuccessful(orderId);
      }
      return;
    }
  };

  const handleWebViewLoadStart = () => {
    setWebViewLoading(true);
  };

  const handleWebViewLoadEnd = () => {
    setWebViewLoading(false);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView error:", nativeEvent);
    setWebViewLoading(false);
    Alert.alert(
      "Loading Error",
      "Failed to load payment page. Please check your internet connection and try again.",
      [
        {
          text: "Try Again",
          onPress: () => {
            if (webViewRef.current) {
              webViewRef.current.reload();
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setShowWebView(false);
            setPaymentUrl("");
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (showWebView) {
      Alert.alert(
        "Cancel Payment",
        "Are you sure you want to cancel this payment?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            style: "destructive",
            onPress: () => {
              setShowWebView(false);
              setPaymentUrl("");
              setWebViewLoading(true);
              setPaymentInitiated(false);
              setHasShownSuccess(false);
            },
          },
        ],
      );
    } else {
      router.back();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={80} color="#DC2626" />
          <Text style={styles.errorTitle}>{error || "Order Not Found"}</Text>
          <Text style={styles.errorText}>
            The order you're trying to pay for doesn't exist or you don't have
            permission.
          </Text>
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

  const totalAmount = parseFloat(order.total_amount).toFixed(2);
  const orderDate = formatDate(order.created_at);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pay for Order</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderIdLabel}>Order ID</Text>
                <Text style={styles.orderId}>
                  {order.order_id.slice(0, 8)}...
                </Text>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: "#FEF3C7" }]}
              >
                <Text style={[styles.statusText, { color: "#D97706" }]}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₱{totalAmount}</Text>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <MaterialIcons name="payment" size={20} color="#6B7280" />
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {order.payment_method || "Maya"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons
                  name="local-shipping"
                  size={20}
                  color="#6B7280"
                />
                <Text style={styles.detailLabel}>Delivery Method:</Text>
                <Text style={styles.detailValue}>
                  {order.delivery_method || "Standard Delivery"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#6B7280"
                />
                <Text style={styles.detailLabel}>Order Date:</Text>
                <Text style={styles.detailValue}>{orderDate}</Text>
              </View>
            </View>

            {order.shipping_address && (
              <View style={styles.addressContainer}>
                <View style={styles.addressHeader}>
                  <MaterialIcons name="location-on" size={20} color="#EA580C" />
                  <Text style={styles.addressTitle}>Shipping Address</Text>
                </View>
                <Text style={styles.addressText}>
                  {order.shipping_address.recipient_name}
                  {"\n"}
                  {order.shipping_address.recipient_phone}
                  {"\n"}
                  {order.shipping_address.full_address}
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                You will be redirected to Maya's secure payment page to complete
                your payment. Your order will be processed once payment is
                confirmed.
              </Text>
            </View>

            {!paymentInitiated ? (
              <TouchableOpacity
                style={styles.payButton}
                onPress={handleInitiatePayment}
              >
                <FontAwesome5 name="wallet" size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Pay with Maya</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.paymentInitiatedContainer}>
                <ActivityIndicator size="small" color="#EA580C" />
                <Text style={styles.paymentInitiatedText}>
                  Payment window opening...
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              • Having trouble with payment? Contact Maya support{"\n"}• Order
              issues? Contact our customer support{"\n"}• You can view your
              order status in "My Orders"
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          if (paymentStatus !== "success" && !hasShownSuccess) {
            Alert.alert(
              "Cancel Payment",
              "Are you sure you want to cancel this payment?",
              [
                { text: "No", style: "cancel" },
                {
                  text: "Yes",
                  style: "destructive",
                  onPress: () => {
                    setShowWebView(false);
                    setPaymentUrl("");
                    setWebViewLoading(true);
                    setPaymentInitiated(false);
                    setHasShownSuccess(false);
                  },
                },
              ],
            );
          } else {
            setShowWebView(false);
          }
        }}
      >
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              onPress={() => {
                if (paymentStatus !== "success" && !hasShownSuccess) {
                  Alert.alert(
                    "Cancel Payment",
                    "Are you sure you want to cancel this payment?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes",
                        style: "destructive",
                        onPress: () => {
                          setShowWebView(false);
                          setPaymentUrl("");
                          setWebViewLoading(true);
                          setPaymentInitiated(false);
                          setHasShownSuccess(false);
                        },
                      },
                    ],
                  );
                } else {
                  setShowWebView(false);
                }
              }}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Maya Payment</Text>
            <TouchableOpacity
              onPress={() => {
                if (webViewRef.current) {
                  webViewRef.current.reload();
                }
              }}
              style={styles.reloadButton}
            >
              <MaterialIcons name="refresh" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {webViewLoading && (
            <View style={styles.webViewLoadingOverlay}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            onLoadStart={handleWebViewLoadStart}
            onLoadEnd={handleWebViewLoadEnd}
            onError={handleWebViewError}
            renderLoading={() => null}
            incognito={false}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  card: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderIdLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#EA580C",
    marginBottom: 20,
  },
  detailsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  addressContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  addressText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  payButton: {
    flexDirection: "row",
    backgroundColor: "#EA580C",
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentInitiatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginBottom: 12,
  },
  paymentInitiatedText: {
    fontSize: 14,
    color: "#6B7280",
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  helpSection: {
    backgroundColor: "#F9FAFB",
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    padding: 8,
  },
  reloadButton: {
    padding: 8,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  webView: {
    flex: 1,
  },
  webViewLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
});