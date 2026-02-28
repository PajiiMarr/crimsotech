import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

type NavParams = {
  id: string;
  type: "delivery" | "earnings" | "system";
  title: string;
  message: string;
  timeLabel: string;
};

export default function NotificationDetailsPage() {
  const params = useLocalSearchParams<NavParams>();
  const { title, message, timeLabel, type } = params;

  // Helper to get icon based on type (reused logic)
  const getIcon = (notificationType: string) => {
    switch (notificationType) {
      case "delivery":
        return {
          name: "local-shipping" as const,
          color: "#1F2937",
          bg: "#F3F4F6",
        };
      case "earnings":
        return {
          name: "account-balance-wallet" as const,
          color: "#10B981",
          bg: "#ECFDF5",
        };
      case "system":
      default:
        return { name: "info" as const, color: "#4B5563", bg: "#F3F4F6" };
    }
  };

  const iconInfo = getIcon(type || "system");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Icon & Time */}
        <View style={styles.metaRow}>
          <View
            style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}
          >
            <MaterialIcons
              name={iconInfo.name}
              size={32}
              color={iconInfo.color}
            />
          </View>
          <View style={styles.timeTag}>
            <MaterialIcons name="access-time" size={12} color="#6B7280" />
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
        </View>

        {/* Title & Message */}
        <Text style={styles.title}>{title}</Text>

        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>

        {/* Action Buttons (Mock) */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionLabel}>ACTIONS</Text>

          {type === "delivery" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/rider/orders")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>View Order</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {type === "earnings" && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/rider/earnings")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Check Wallet</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    padding: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  timeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 26,
  },
  messageBox: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  actionSection: {
    gap: 10,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
});
