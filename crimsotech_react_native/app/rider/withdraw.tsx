import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// --- Colors ---
const COLORS = {
  primary: "#111827",
  secondary: "#374151",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  accent: "#F3F4F6",
  green: "#10B981",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  border: "#E5E7EB",
};

// --- Withdrawal Methods ---
interface WithdrawalMethod {
  id: string;
  name: string;
  icon: string;
  iconLib: string;
  description: string;
  color: string;
  processingTime: string;
  minAmount: number;
  fee: string;
}

const WITHDRAWAL_METHODS: WithdrawalMethod[] = [
  {
    id: "1",
    name: "GCash",
    icon: "wallet",
    iconLib: "feather",
    description: "Mobile wallet transfer",
    color: "#111827",
    processingTime: "Instant",
    minAmount: 100,
    fee: "Free",
  },
  {
    id: "2",
    name: "PayMaya",
    icon: "credit-card",
    iconLib: "feather",
    description: "Digital wallet",
    color: "#111827",
    processingTime: "1-2 hours",
    minAmount: 100,
    fee: "Free",
  },
  {
    id: "3",
    name: "Local Cash Pickup",
    icon: "map-pin",
    iconLib: "feather",
    description: "Pick up at partner stores",
    color: "#111827",
    processingTime: "30 mins - 1 hour",
    minAmount: 100,
    fee: "Free",
  },
];

export default function WithdrawPage() {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(
    null,
  );
  const [amount, setAmount] = useState("1000");
  const availableBalance = 28350.0;

  const handleSelectMethod = (method: WithdrawalMethod) => {
    if (parseFloat(amount) < method.minAmount) {
      Alert.alert(
        "Insufficient Amount",
        `Minimum amount for ${method.name} is ₱${method.minAmount}`,
      );
      return;
    }
    setSelectedMethod(method);
  };

  const handleConfirmWithdraw = () => {
    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    if (parseFloat(amount) < selectedMethod.minAmount) {
      Alert.alert("Error", `Minimum amount is ₱${selectedMethod.minAmount}`);
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ₱${parseFloat(amount).toFixed(2)} via ${selectedMethod.name}?\n\nProcessing time: ${selectedMethod.processingTime}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Alert.alert(
              "Success",
              "Withdrawal request submitted! Check your account shortly.",
              [{ text: "OK", onPress: () => router.back() }],
            );
          },
        },
      ],
    );
  };

  const renderMethod = ({ item }: { item: WithdrawalMethod }) => (
    <TouchableOpacity
      style={[
        styles.methodCard,
        selectedMethod?.id === item.id && styles.methodCardSelected,
      ]}
      onPress={() => handleSelectMethod(item)}
    >
      <View
        style={[
          styles.methodIconContainer,
          { backgroundColor: item.color + "20" },
        ]}
      >
        {item.iconLib === "feather" && (
          <Feather name={item.icon as any} size={24} color={item.color} />
        )}
        {item.iconLib === "material" && (
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={item.color}
          />
        )}
      </View>

      <View style={styles.methodContent}>
        <Text style={styles.methodName}>{item.name}</Text>
        <Text style={styles.methodDescription}>{item.description}</Text>
        <View style={styles.methodDetails}>
          <View style={styles.detailBadge}>
            <Feather name="clock" size={12} color={COLORS.muted} />
            <Text style={styles.detailText}>{item.processingTime}</Text>
          </View>
          <View style={styles.detailBadge}>
            <Text style={styles.detailText}>Min: ₱{item.minAmount}</Text>
          </View>
          <View style={[styles.detailBadge, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.detailText, { color: COLORS.green }]}>
              {item.fee}
            </Text>
          </View>
        </View>
      </View>

      {selectedMethod?.id === item.id && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color={item.color} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Earnings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Info */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              ₱{availableBalance.toFixed(2)}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="wallet"
            size={32}
            color={COLORS.primary}
          />
        </View>

        {/* Amount Input */}
        {!selectedMethod ? (
          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>Select Withdrawal Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <Text style={styles.amountInput}>{amount}</Text>
            </View>

            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.quickAmountBtn,
                    parseFloat(amount) === val && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => setAmount(val.toString())}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      parseFloat(amount) === val &&
                        styles.quickAmountTextActive,
                    ]}
                  >
                    ₱{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
        ) : (
          <View style={styles.selectedMethodSection}>
            <Text style={styles.sectionTitle}>Withdrawal Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>
                  ₱{parseFloat(amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{selectedMethod.name}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Processing Time</Text>
                <Text style={styles.detailValue}>
                  {selectedMethod.processingTime}
                </Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Fee</Text>
                <Text style={styles.detailValue}>{selectedMethod.fee}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.changeMethodBtn}
              onPress={() => setSelectedMethod(null)}
            >
              <Feather name="edit-2" size={16} color={COLORS.primary} />
              <Text style={styles.changeMethodText}>Change Method</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Methods List */}
        <FlatList
          data={WITHDRAWAL_METHODS}
          renderItem={renderMethod}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.methodsList}
        />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.withdrawBtn,
            !selectedMethod && styles.withdrawBtnDisabled,
          ]}
          onPress={handleConfirmWithdraw}
          disabled={!selectedMethod}
        >
          <Feather name="send" size={18} color="#FFF" />
          <Text style={styles.withdrawBtnText}>
            {selectedMethod
              ? `Withdraw ₱${parseFloat(amount).toFixed(2)}`
              : "Select Payment Method"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Balance Card
  balanceCard: {
    margin: 12,
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Amount Section
  amountSection: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.primary,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  quickAmountBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  quickAmountBtnActive: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },

  // Selected Method Section
  selectedMethodSection: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.accent,
  },
  changeMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeMethodText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Methods List
  methodsList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  methodCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  methodCardSelected: {
    backgroundColor: COLORS.primary + "08",
  },
  methodIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  methodContent: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 6,
  },
  methodDetails: {
    flexDirection: "row",
    gap: 6,
  },
  detailBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "500",
  },
  checkmark: {
    padding: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawBtnDisabled: {
    backgroundColor: COLORS.muted,
    shadowOpacity: 0,
  },
  withdrawBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
