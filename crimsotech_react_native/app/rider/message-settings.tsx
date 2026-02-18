import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

const COLORS = {
  primary: "#111827",
  bg: "#FFFFFF",
  textMain: "#374151",
  textMuted: "#9CA3AF",
  riderBubble: "#EA580C",
  border: "#F3F4F6",
};

export default function MessageSettingsPage() {
  const { userRole } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationsEnabled, setVibrationsEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);

  // Role Guard
  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const SettingToggle = ({
    label,
    description,
    value,
    onToggle,
  }: {
    label: string;
    description?: string;
    value: boolean;
    onToggle: (value: boolean) => void;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#E5E7EB", true: "#D1D5DB" }}
        thumbColor={value ? COLORS.riderBubble : "#9CA3AF"}
      />
    </View>
  );

  const SettingSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Settings</Text>
        <View style={styles.spacer} />
      </View>

      {/* Settings Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <SettingSection title="Notifications">
          <SettingToggle
            label="Enable Notifications"
            description="Receive message notifications"
            value={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <SettingToggle
            label="Sound"
            description="Play sound for incoming messages"
            value={soundEnabled}
            onToggle={setSoundEnabled}
          />
          <SettingToggle
            label="Vibration"
            description="Vibrate on incoming messages"
            value={vibrationsEnabled}
            onToggle={setVibrationsEnabled}
          />
        </SettingSection>

        {/* Privacy Section */}
        <SettingSection title="Privacy">
          <SettingToggle
            label="Read Receipts"
            description="Show when you've read messages"
            value={readReceipts}
            onToggle={setReadReceipts}
          />
          <SettingToggle
            label="Typing Indicator"
            description="Show when you're typing"
            value={typingIndicator}
            onToggle={setTypingIndicator}
          />
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 36,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },

  // Section
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Setting Item
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // About Item
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },
  aboutValue: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "400",
  },
});
