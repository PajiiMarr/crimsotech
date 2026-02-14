import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";

const COLORS = {
  primary: "#1F2937", // Charcoal
  primaryLight: "#F3F4F6",
  secondary: "#111827",
  muted: "#6B7280",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  danger: "#DC2626",
  success: "#10B981",
  warning: "#F59E0B",
  border: "#E5E7EB",
  info: "#3B82F6",
};

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const params = useLocalSearchParams();

  let initialDeliveryData = null;
  try {
    initialDeliveryData = params.delivery
      ? JSON.parse(decodeURIComponent(params.delivery as string))
      : null;
  } catch (e) {
    console.error("Failed to parse delivery data:", e);
  }

  const [deliveryData, setDeliveryData] = useState(initialDeliveryData);
  const [loading, setLoading] = useState(false);
  const [deliveryProof, setDeliveryProof] = useState<string | null>(null);

  if (!deliveryData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Delivery information not found</Text>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return COLORS.warning;
      case "picked_up":
        return COLORS.info;
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
      case "pending_offer":
        return "Pending Pickup";
      case "picked_up":
        return "Picked Up";
      case "in_progress":
        return "On the way";
      case "delivered":
        return "Delivered";
      default:
        return status;
    }
  };

  const isStepComplete = (stepStatus: string) => {
    const statuses = [
      "pending",
      "pending_offer",
      "picked_up",
      "in_progress",
      "delivered",
    ];
    const currentIndex = statuses.indexOf(deliveryData.status);
    const stepIndex = statuses.indexOf(stepStatus);
    return stepIndex <= currentIndex;
  };

  const takeDeliveryPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take delivery proof.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setDeliveryProof(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleMarkPickup = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rider-delivery-actions/${deliveryData.id}/mark-pickup/`,
        {
          method: "POST",
          headers: {
            "X-User-Id": userId || "",
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        // Update local delivery data with new status
        setDeliveryData((prev: any) => ({
          ...prev,
          status: "picked_up",
          picked_at: new Date().toISOString(),
        }));

        Alert.alert(
          "Success",
          "✓ Item picked up!\n\nNow take a delivery proof photo when you reach the customer.",
          [{ text: "OK" }],
        );
      } else {
        // Check if already picked up - sync local state
        if (
          data.error?.toLowerCase().includes("picked_up") ||
          data.error?.toLowerCase().includes("picked up")
        ) {
          setDeliveryData((prev: any) => ({
            ...prev,
            status: "picked_up",
            picked_at: prev.picked_at || new Date().toISOString(),
          }));
          Alert.alert(
            "Already Picked Up",
            "This delivery is already marked as picked up. You can now take the delivery proof photo.",
            [{ text: "OK" }],
          );
        } else {
          Alert.alert("Error", data.error || "Failed to mark pickup");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark pickup");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!deliveryProof) {
      Alert.alert("Photo Required", "Please take a delivery proof photo");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      const photo = {
        uri: deliveryProof,
        type: "image/jpeg",
        name: `delivery_proof_${deliveryData.id}.jpg`,
      };
      formData.append("delivery_proof", photo as any);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rider-delivery-actions/${deliveryData.id}/mark-delivered/`,
        {
          method: "POST",
          headers: {
            "X-User-Id": userId || "",
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          "Success",
          `✓ Delivery completed!\nYou earned ₱${data.data.delivery_fee.toFixed(2)}`,
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        );
      } else {
        // Check if already delivered - sync local state
        if (
          data.error?.toLowerCase().includes("delivered") ||
          data.error?.toLowerCase().includes("deliver")
        ) {
          Alert.alert(
            "Already Delivered",
            "This delivery is already marked as delivered.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        } else {
          Alert.alert("Error", data.error || "Failed to mark delivery");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark delivery");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${typeof amount === "string" ? parseFloat(amount) : amount}`.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ",",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View>
            <Text style={styles.orderId}>
              Order #
              {(deliveryData.order_id || deliveryData.id || "")
                .toString()
                .substring(0, 12)}
            </Text>
            <Text style={styles.statusLabel}>
              {getStatusText(deliveryData.status)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(deliveryData.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: getStatusColor(deliveryData.status) },
              ]}
            >
              {getStatusText(deliveryData.status)}
            </Text>
          </View>
        </View>

        {/* Minimal Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value} numberOfLines={1}>
              {deliveryData.customer_name ||
                deliveryData.order?.user?.first_name ||
                "Unknown"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value} numberOfLines={2}>
              {deliveryData.delivery_location ||
                deliveryData.order?.delivery_address_text ||
                "No address"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Distance/Time</Text>
            <Text style={styles.value}>
              {deliveryData.distance || deliveryData.distance_km || "N/A"} km •{" "}
              {deliveryData.estimated_time ||
                deliveryData.estimated_minutes ||
                "N/A"}{" "}
              min
            </Text>
          </View>

          {deliveryData.delivery_fee && (
            <View style={[styles.infoRow, styles.earningsRow]}>
              <Text style={styles.label}>Earnings</Text>
              <Text style={styles.earningsValue}>
                ₱{Number(deliveryData.delivery_fee || 0).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Container */}
        {(deliveryData.status === "pending" ||
          deliveryData.status === "pending_offer" ||
          deliveryData.status === "picked_up" ||
          deliveryData.status === "in_progress") && (
          <View style={styles.actionContainer}>
            {(deliveryData.status === "pending" ||
              deliveryData.status === "pending_offer") && (
              <View style={styles.stepSection}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>📦 PICKUP</Text>
                </View>
                <Text style={styles.stepTitle}>Mark as Picked Up</Text>
                <Text style={styles.stepDescription}>
                  Confirm that you have picked up the item from the sender and
                  are ready to deliver
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, loading && { opacity: 0.6 }]}
                  onPress={handleMarkPickup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitButtonText}>
                        Confirm Pickup
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {deliveryData.status === "picked_up" && (
              <View style={{ gap: 16 }}>
                {/* Step 1: Camera */}
                <View style={styles.stepSection}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>📸 STEP 1</Text>
                  </View>
                  <Text style={styles.stepTitle}>
                    Take Delivery Proof Photo
                  </Text>
                  <Text style={styles.stepDescription}>
                    Take a photo at the delivery location as proof of successful
                    delivery
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.cameraButton,
                      deliveryProof && styles.cameraDone,
                    ]}
                    onPress={takeDeliveryPhoto}
                  >
                    <MaterialIcons
                      name={deliveryProof ? "check-circle" : "camera-alt"}
                      size={40}
                      color={deliveryProof ? COLORS.success : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.cameraButtonText,
                        deliveryProof && styles.cameraDoneText,
                      ]}
                    >
                      {deliveryProof ? "✓ Photo Captured" : "Open Camera"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Photo Preview */}
                {deliveryProof && (
                  <View>
                    <Text style={styles.previewLabel}>📷 Photo Preview:</Text>
                    <Image
                      source={{ uri: deliveryProof }}
                      style={styles.previewImage}
                    />
                  </View>
                )}

                {/* Step 2: Confirm */}
                {deliveryProof && (
                  <View style={styles.stepSection}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>✓ STEP 2</Text>
                    </View>
                    <Text style={styles.stepTitle}>Complete & Submit</Text>
                    <Text style={styles.stepDescription}>
                      Submit the delivery photo to complete the order
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        styles.submitButtonSuccess,
                        loading && { opacity: 0.6 },
                      ]}
                      onPress={handleMarkDelivered}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color="#FFFFFF"
                          />
                          <Text style={styles.submitButtonText}>
                            Complete Delivery
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Waiting for Photo Message */}
                {!deliveryProof && (
                  <View style={styles.waitingBox}>
                    <MaterialIcons
                      name="info"
                      size={24}
                      color={COLORS.warning}
                    />
                    <Text style={styles.waitingText}>
                      👉 Take a photo to proceed
                    </Text>
                  </View>
                )}
              </View>
            )}

            {deliveryData.status === "in_progress" && (
              <View style={{ gap: 16 }}>
                {/* Step 1: Camera */}
                <View style={styles.stepSection}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>📸 STEP 1</Text>
                  </View>
                  <Text style={styles.stepTitle}>
                    Take Delivery Proof Photo
                  </Text>
                  <Text style={styles.stepDescription}>
                    Take a photo at the delivery location as proof of successful
                    delivery
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.cameraButton,
                      deliveryProof && styles.cameraDone,
                    ]}
                    onPress={takeDeliveryPhoto}
                  >
                    <MaterialIcons
                      name={deliveryProof ? "check-circle" : "camera-alt"}
                      size={40}
                      color={deliveryProof ? COLORS.success : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.cameraButtonText,
                        deliveryProof && styles.cameraDoneText,
                      ]}
                    >
                      {deliveryProof ? "✓ Photo Captured" : "Open Camera"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Photo Preview */}
                {deliveryProof && (
                  <View>
                    <Text style={styles.previewLabel}>📷 Photo Preview:</Text>
                    <Image
                      source={{ uri: deliveryProof }}
                      style={styles.previewImage}
                    />
                  </View>
                )}

                {/* Step 2: Confirm */}
                {deliveryProof && (
                  <View style={styles.stepSection}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>✓ STEP 2</Text>
                    </View>
                    <Text style={styles.stepTitle}>Complete & Submit</Text>
                    <Text style={styles.stepDescription}>
                      Submit the delivery photo to complete the order
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        styles.submitButtonSuccess,
                        loading && { opacity: 0.6 },
                      ]}
                      onPress={handleMarkDelivered}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color="#FFFFFF"
                          />
                          <Text style={styles.submitButtonText}>
                            Complete Delivery
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Waiting for Photo Message */}
                {!deliveryProof && (
                  <View style={styles.waitingBox}>
                    <MaterialIcons
                      name="info"
                      size={24}
                      color={COLORS.warning}
                    />
                    <Text style={styles.waitingText}>
                      👉 Take a photo to proceed
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Delivered Section */}
        {deliveryData.status === "delivered" && (
          <View style={styles.completedCard}>
            <MaterialIcons
              name="check-circle"
              size={48}
              color={COLORS.success}
            />
            <Text style={styles.completedTitle}>✓ Delivery Completed!</Text>
            <Text style={styles.completedSubtitle}>
              Package successfully delivered
            </Text>
            <View style={styles.earningsBox}>
              <Text style={styles.earningsLabel}>You earned</Text>
              <Text style={styles.earningsAmount}>
                {formatCurrency(Number(deliveryData.delivery_fee || 0))}
              </Text>
            </View>
          </View>
        )}

        {/* Error Section */}
        {deliveryData.status !== "pending" &&
          deliveryData.status !== "pending_offer" &&
          deliveryData.status !== "picked_up" &&
          deliveryData.status !== "in_progress" &&
          deliveryData.status !== "delivered" && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                padding: 12,
                borderRadius: 8,
                marginHorizontal: 12,
                marginVertical: 16,
              }}
            >
              <Text
                style={{
                  color: "#92400E",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                No actions available for status: {deliveryData.status}
              </Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  scrollView: {
    flex: 1,
    padding: 12,
    paddingBottom: 20,
  },
  actionContainer: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: -1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Progress Card
  progressCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepContainer: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textAlign: "center",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: "auto",
    width: "100%",
    marginBottom: 28,
  },

  // Cards
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 12,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "600",
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
    marginTop: 6,
  },
  metricValue: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "700",
    marginTop: 2,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: "#F0FDF4",
    borderColor: COLORS.success,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.success,
  },
  earningsIcon: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Action Card
  actionCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  actionHeader: {
    marginBottom: 16,
  },
  actionStep: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  actionStepText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  actionDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Photo Button
  photoButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
  },
  photoButtonDone: {
    backgroundColor: "#F0FDF4",
    borderColor: COLORS.success,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
  },
  photoButtonTextDone: {
    color: COLORS.success,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
  },
  previewImageSmall: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },

  // Step Sections
  stepSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  stepBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
    lineHeight: 16,
  },

  // Camera Button
  cameraButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cameraDone: {
    backgroundColor: "#F0FDF4",
    borderColor: COLORS.success,
  },
  cameraButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
  },
  cameraDoneText: {
    color: COLORS.success,
  },

  // Preview
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 6,
  },

  // Submit Button
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  submitButtonSuccess: {
    backgroundColor: COLORS.success,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Waiting Box
  waitingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFCE8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 10,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  waitingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
  },

  // Completed Card
  completedCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.success,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 10,
  },
  earningsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
    borderWidth: 2,
    borderColor: COLORS.success,
    alignItems: "center",
  },

  // Action Button
  actionButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  completedSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
    marginBottom: 12,
  },
  completedEarnings: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  completedLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
  },
  completedAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 3,
  },
  completedBadge: {
    backgroundColor: "#F0FDF4",
    borderColor: COLORS.success,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 6,
  },

  // --- Minimalist Styles ---
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statusLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
    flex: 1,
    marginLeft: 10,
    textAlign: "right",
  },
  earningsRow: {
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginLeft: 10,
  },
});
