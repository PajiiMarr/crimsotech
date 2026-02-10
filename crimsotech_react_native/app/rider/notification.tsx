import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";

type NotificationType = "delivery" | "earnings" | "system";

type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeLabel: string;
  isRead: boolean;
  route?: string;
};

export default function RiderNotificationPage() {
  const { userId, loading: authLoading, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "n1",
      type: "delivery",
      title: "New delivery request",
      message: "You have a new delivery request nearby.",
      timeLabel: "Just now",
      isRead: false,
      route: "/rider/orders",
    },
    {
      id: "n2",
      type: "earnings",
      title: "Payment received",
      message: "Your earnings of ₱500 have been credited to your account.",
      timeLabel: "2h ago",
      isRead: false,
      route: "/rider/earnings",
    },
    {
      id: "n3",
      type: "system",
      title: "Schedule reminder",
      message: "You have 3 scheduled deliveries tomorrow.",
      timeLabel: "Yesterday",
      isRead: true,
      route: "/rider/schedule",
    },
  ]);

  useEffect(() => {
    // optional forced redirect:
    // if (!authLoading && !userId) router.replace('/(auth)/login');
  }, [authLoading, userId]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="small" color="#1F2937" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Please log in to view notifications</Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.link}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view notifications</Text>
      </SafeAreaView>
    );
  }

  const unreadCount = useMemo(
    () => notifications.reduce((count, n) => (n.isRead ? count : count + 1), 0),
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [activeTab, notifications]);

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case "delivery":
        return { name: "local-shipping" as const, color: "#1F2937" };
      case "earnings":
        return { name: "account-balance-wallet" as const, color: "#10B981" };
      case "system":
      default:
        return { name: "info" as const, color: "#4B5563" };
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.route) router.push(n.route as any);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              unreadCount === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <MaterialIcons
              name="done-all"
              size={18}
              color={unreadCount === 0 ? "#9CA3AF" : "#111827"}
            />
            <Text
              style={[
                styles.actionText,
                unreadCount === 0 && styles.actionTextDisabled,
              ]}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.tabTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "unread" && styles.tabActive]}
            onPress={() => setActiveTab("unread")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "unread" && styles.tabTextActive,
              ]}
            >
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialIcons
                  name="notifications-none"
                  size={28}
                  color="#6B7280"
                />
              </View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyText}>
                {activeTab === "unread"
                  ? "You have no unread notifications right now."
                  : "You'll see updates here when something happens."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = iconForType(item.type);

            return (
              <TouchableOpacity
                style={[styles.card, !item.isRead && styles.cardUnread]}
                onPress={() => handleOpenNotification(item)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${icon.color}1A` },
                  ]}
                >
                  <MaterialIcons
                    name={icon.name}
                    size={20}
                    color={icon.color}
                  />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[
                        styles.cardTitle,
                        !item.isRead && styles.cardTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.time}>{item.timeLabel}</Text>
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>
                    {item.message}
                  </Text>

                  {!item.isRead && (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>New</Text>
                    </View>
                  )}
                </View>

                <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  inner: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: { flex: 1, paddingRight: 8 },
  subtitle: { marginTop: 1, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionButtonDisabled: { backgroundColor: "#F9FAFB" },
  actionText: { fontSize: 11, fontWeight: "700", color: "#1F2937" },
  actionTextDisabled: { color: "#9CA3AF" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 2,
    marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  tabActive: { backgroundColor: "#1F2937" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#1F2937" },
  tabTextActive: { color: "#FFFFFF" },

  listContent: { paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 8,
  },
  cardUnread: { borderColor: "#1F293733", borderWidth: 1.5 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: "#1F2937" },
  cardTitleUnread: { color: "#1F2937" },
  time: { fontSize: 10, color: "#6B7280", fontWeight: "600" },
  cardMessage: { marginTop: 2, fontSize: 11, color: "#374151", lineHeight: 16 },
  unreadPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  unreadPillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },

  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  message: { fontSize: 16, color: "#6B7280", marginBottom: 12 },
  link: { fontSize: 16, color: "#EE4D2D", fontWeight: "600" },
});
