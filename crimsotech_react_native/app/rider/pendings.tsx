import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const COLORS = {
  primary: "#111827",
  secondary: "#374151",
  muted: "#6B7280",
  bg: "#F9FAFB",
  cardBg: "#FFFFFF",
  warningBg: "#FEF3C7",
  warningText: "#92400E",
};

export default function RiderPendingVerification() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="hourglass-empty" size={22} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Account Under Review</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>⏳</Text>
        </View>

        <Text style={styles.title}>Verification in Progress</Text>
        <Text style={styles.subtitle}>
          Your rider account is being reviewed by our team. This helps keep the
          platform safe and reliable.
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Feather name="info" size={14} color={COLORS.warningText} />
            <Text style={styles.infoTitle}>What to expect</Text>
          </View>
          <Text style={styles.infoText}>• Verification usually takes 24-48 hours</Text>
          <Text style={styles.infoText}>• You will be notified once approved</Text>
          <Text style={styles.infoText}>• Contact support if pending over 3 days</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/rider/pendings")}
          >
            <Text style={styles.secondaryButtonText}>Check Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/rider/home")}
          >
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: COLORS.cardBg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF9C3",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
  },
  infoBox: {
    width: "100%",
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.warningText,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.warningText,
    marginTop: 2,
  },
  actions: {
    width: "100%",
    marginTop: 12,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});
