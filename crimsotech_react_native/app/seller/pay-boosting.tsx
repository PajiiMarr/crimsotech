// app/seller/pay-boosting.tsx
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AxiosInstance from "../../contexts/axios";
import { useAuth } from "../../contexts/AuthContext";

export default function PayBoosting() {
  const { planId, productIds } = useLocalSearchParams<{
    planId: string;
    productIds: string;
  }>();
  const { userId, shopId } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingMaya, setProcessingMaya] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "success" | "failed" | "cancelled"
  >("pending");
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const productIdList = productIds ? productIds.split(",").filter(Boolean) : [];

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get(
        `/seller-boosts/${planId}/plan_detail/`,
        {
          headers: { "X-User-Id": userId || "" },
        },
      );
      setPlan(response.data?.plan || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load plan details");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!plan || !planId || !productIds || !userId) return;

    setProcessingMaya(true);
    setError(null);

    try {
      const response = await AxiosInstance.post(
        "/seller-boosts/initiate_maya_payment/",
        {
          plan_id: planId,
          product_ids: productIds,
          user_id: userId,
          shop_id: shopId,
          platform: "mobile",
        },
      );

      if (response.data.success && response.data.redirect_url) {
        setPaymentUrl(response.data.redirect_url);
        setShowWebView(true);
        setHasShownSuccess(false);
      } else {
        setError(response.data.error || "Failed to initiate Maya payment");
        Alert.alert(
          "Error",
          response.data.error || "Failed to initiate Maya payment",
        );
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Error initiating Maya payment";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setProcessingMaya(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    const data = event.nativeEvent.data;
    console.log("WebView message:", data);
    
    if (data && data.startsWith('redirect:')) {
      const redirectUrl = data.replace('redirect:', '');
      console.log("Redirect URL from message:", redirectUrl);
      
      if (redirectUrl.includes('crimsotechreactnative://boost-success')) {
        setHasShownSuccess(true);
        setShowWebView(false);
        setWebViewLoading(true);
        setPaymentStatus("success");
        
        const params = redirectUrl.split('?')[1];
        router.dismissAll();
        router.push(`/seller/boost-success?${params}` as any);
      }
    }
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log("WebView URL:", url);

    if (hasShownSuccess) return;

    // Check for custom scheme redirect
    if (url.startsWith('crimsotechreactnative://boost-success')) {
      console.log("Custom scheme detected:", url);
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);
      setPaymentStatus("success");
      
      const params = url.split('?')[1];
      router.dismissAll();
      router.push(`/seller/boost-success?${params}` as any);
      return;
    }

    // Check for success URL (web-based redirect)
    if (
      url.includes("/boost-success") ||
      url.includes("boost_status=success")
    ) {
      console.log("Success URL detected");
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);
      setPaymentStatus("success");

      Alert.alert(
        "Payment Successful!",
        "Your boost payment has been processed successfully. Your products will be boosted now.",
        [
          {
            text: "View Boosts",
            onPress: () => {
              router.dismissAll();
              router.push("/seller/boosts" as any);
            },
          },
        ],
      );
      return;
    }

    // Check for failure URL
    if (url.includes("/boost-failure") || url.includes("status=failed")) {
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
              setShowWebView(false);
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

    // Check for cancel URL
    if (url.includes("/boost-cancel") || url.includes("status=cancelled")) {
      console.log("Cancel URL detected");
      setHasShownSuccess(true);
      setShowWebView(false);
      setWebViewLoading(true);
      setPaymentStatus("cancelled");

      Alert.alert("Payment Cancelled", "You cancelled the payment process.", [
        {
          text: "OK",
          onPress: () => {
            setShowWebView(false);
            setPaymentUrl("");
            setHasShownSuccess(false);
          },
        },
      ]);
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

  const pricePerProduct = Number(plan?.price || 0);
  const totalAmount = pricePerProduct * productIdList.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
          <Text style={styles.errorTitle}>
            {error || "Boost plan not found"}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boost Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Boost Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewIconContainer}>
              <Ionicons name="rocket" size={40} color="#EE4D2D" />
            </View>
            <Text style={styles.overviewPlanName}>{plan.name}</Text>
            <Text style={styles.overviewPlanType}>Boost Plan</Text>

            <View style={styles.overviewDetails}>
              <View style={styles.overviewDetailRow}>
                <View style={styles.overviewDetailIcon}>
                  <Ionicons name="cube-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.overviewDetailLabel}>Products</Text>
                  <Text style={styles.overviewDetailValue}>
                    {productIdList.length} product
                    {productIdList.length !== 1 ? "s" : ""} selected
                  </Text>
                </View>
              </View>

              <View style={styles.overviewDetailRow}>
                <View style={styles.overviewDetailIcon}>
                  <Ionicons name="time-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.overviewDetailLabel}>Duration</Text>
                  <Text style={styles.overviewDetailValue}>
                    {plan.duration} {plan.time_unit}
                  </Text>
                </View>
              </View>

              <View style={styles.overviewDetailRow}>
                <View style={styles.overviewDetailIcon}>
                  <Ionicons name="card-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.overviewDetailLabel}>Total</Text>
                  <Text style={styles.overviewDetailValuePrice}>
                    ₱{totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.overviewNote}>
              You will be redirected to Maya to complete your payment securely.
            </Text>
          </View>

          {/* Payment Details Card */}
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Payment Details</Text>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons name="card-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.paymentRowLabel}>Payment Method</Text>
                  <Text style={styles.paymentRowValue}>Maya</Text>
                </View>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons name="rocket-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.paymentRowLabel}>Boost Plan</Text>
                  <Text style={styles.paymentRowValue}>{plan.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons name="cube-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.paymentRowLabel}>Products Selected</Text>
                  <Text style={styles.paymentRowValue}>
                    {productIdList.length} product
                    {productIdList.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentRowLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons name="time-outline" size={18} color="#EE4D2D" />
                </View>
                <View>
                  <Text style={styles.paymentRowLabel}>Duration</Text>
                  <Text style={styles.paymentRowValue}>
                    {plan.duration} {plan.time_unit}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalSubtext}>
                  Plan price × {productIdList.length} product
                  {productIdList.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.payButton,
                processingMaya && styles.payButtonDisabled,
              ]}
              onPress={handleInitiatePayment}
              disabled={processingMaya}
            >
              {processingMaya ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>Proceed to Payment</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={processingMaya}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* WebView Modal for Maya Payment */}
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
              <Ionicons name="close" size={24} color="#374151" />
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
              <Ionicons name="refresh" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {webViewLoading && (
            <View style={styles.webViewLoadingOverlay}>
              <ActivityIndicator size="large" color="#EE4D2D" />
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
            onMessage={handleWebViewMessage}
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
    backgroundColor: "#F9FAFB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
    marginTop: 12,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewPlanName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  overviewPlanType: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },
  overviewDetails: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  overviewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
  },
  overviewDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  overviewDetailLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  overviewDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  overviewDetailValuePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EE4D2D",
  },
  overviewNote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  paymentRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentRowLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  paymentRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalSubtext: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#EE4D2D",
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EE4D2D",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#EE4D2D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  retryBtn: {
    backgroundColor: "#EE4D2D",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    color: "#1F2937",
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