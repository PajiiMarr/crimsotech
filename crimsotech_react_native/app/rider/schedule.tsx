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
  Modal,
} from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

// --- Theme Colors (Minimalist) ---
const COLORS = {
  primary: "#111827",
  secondary: "#6B7280",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  lightGray: "#F9FAFB",
};

// --- Types ---
interface DaySchedule {
  date: string;
  day: string;
  dayNum: number;
  startTime?: string;
  endTime?: string;
  status: "scheduled" | "off" | "completed";
  earnings?: number;
}

interface UpcomingShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  earnings?: number;
  status: "upcoming" | "completed";
}

// --- Dummy Data ---
const WEEKLY_SCHEDULE: DaySchedule[] = [
  {
    date: "2026-02-16",
    day: "Mon",
    dayNum: 16,
    startTime: "09:00 AM",
    endTime: "06:00 PM",
    status: "completed",
    earnings: 850,
  },
  {
    date: "2026-02-17",
    day: "Tue",
    dayNum: 17,
    startTime: "09:00 AM",
    endTime: "06:00 PM",
    status: "scheduled",
    earnings: 0,
  },
  {
    date: "2026-02-18",
    day: "Wed",
    dayNum: 18,
    startTime: "10:00 AM",
    endTime: "07:00 PM",
    status: "scheduled",
    earnings: 0,
  },
  { date: "2026-02-19", day: "Thu", dayNum: 19, status: "off" },
  {
    date: "2026-02-20",
    day: "Fri",
    dayNum: 20,
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    status: "scheduled",
    earnings: 0,
  },
  {
    date: "2026-02-21",
    day: "Sat",
    dayNum: 21,
    startTime: "10:00 AM",
    endTime: "08:00 PM",
    status: "scheduled",
    earnings: 0,
  },
  { date: "2026-02-22", day: "Sun", dayNum: 22, status: "off" },
];

const UPCOMING_SHIFTS: UpcomingShift[] = [
  {
    id: "1",
    date: "2026-02-17",
    startTime: "09:00 AM",
    endTime: "06:00 PM",
    duration: 9,
    status: "upcoming",
  },
  {
    id: "2",
    date: "2026-02-18",
    startTime: "10:00 AM",
    endTime: "07:00 PM",
    duration: 9,
    status: "upcoming",
  },
  {
    id: "3",
    date: "2026-02-20",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    duration: 8,
    status: "upcoming",
  },
  {
    id: "4",
    date: "2026-02-21",
    startTime: "10:00 AM",
    endTime: "08:00 PM",
    duration: 10,
    status: "upcoming",
  },
];

export default function SchedulePage() {
  const { userRole } = useAuth();

  // Get today's schedule
  const todaySchedule = WEEKLY_SCHEDULE.find((s) => s.date === "2026-02-17");
  const totalHoursToday =
    todaySchedule?.startTime && todaySchedule?.endTime ? 9 : 0;

  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons
          name="shield-alert-outline"
          size={48}
          color={COLORS.muted}
        />
        <Text style={styles.messageTitle}>Access Restricted</Text>
        <Text style={styles.messageSub}>
          Only verified riders can access the schedule.
        </Text>
      </SafeAreaView>
    );
  }

  // Handle Cancel Shift
  const handleCancelShift = (id: string) => {
    Alert.alert("Cancel Shift", "Are you sure you want to cancel this shift?", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: () => console.log(`Cancelled shift ${id}`) },
    ]);
  };

  // Handle Edit Shift
  const handleEditShift = (id: string) => {
    console.log(`Editing shift ${id}`);
    router.push("/rider/set-availability");
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return {
          bg: COLORS.lightGray,
          text: COLORS.primary,
          label: "Scheduled",
        };
      case "completed":
        return {
          bg: COLORS.lightGray,
          text: COLORS.secondary,
          label: "Completed",
        };
      case "off":
        return { bg: COLORS.lightGray, text: COLORS.muted, label: "Off" };
      default:
        return { bg: COLORS.lightGray, text: COLORS.muted, label: "N/A" };
    }
  };

  // Render Day Schedule Card
  const renderDaySchedule = ({ item }: { item: DaySchedule }) => {
    const isToday = item.date === "2026-02-17";
    const badgeStyle = getStatusBadgeStyle(item.status);

    return (
      <View style={[styles.dayCard, isToday && styles.dayCardActive]}>
        <Text style={[styles.dayName, isToday && styles.dayNameActive]}>
          {item.day}
        </Text>
        <Text style={[styles.dayNumber, isToday && styles.dayNumberActive]}>
          {item.dayNum}
        </Text>

        {item.startTime && item.endTime ? (
          <View style={styles.dayTimeContainer}>
            <Text style={[styles.dayTime, isToday && styles.dayTimeActive]}>
              {item.startTime.replace(":00", "")}
            </Text>
            <Text
              style={[styles.dayTimeSeparator, isToday && styles.dayTimeActive]}
            >
              -
            </Text>
            <Text style={[styles.dayTime, isToday && styles.dayTimeActive]}>
              {item.endTime.replace(":00", "")}
            </Text>
          </View>
        ) : (
          <Text style={[styles.dayOff, isToday && styles.dayOffActive]}>
            Off
          </Text>
        )}

        <View style={[styles.dayBadge, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.dayBadgeText, { color: badgeStyle.text }]}>
            {badgeStyle.label}
          </Text>
        </View>

        {item.earnings ? (
          <Text style={styles.dayEarnings}>₱{item.earnings}</Text>
        ) : null}
      </View>
    );
  };

  // Render Upcoming Shift
  const renderUpcomingShift = ({ item }: { item: UpcomingShift }) => {
    return (
      <View style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <View style={styles.shiftDateContainer}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.shiftDate}>
              {new Date(item.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
          {item.earnings && (
            <Text style={styles.shiftEarnings}>₱{item.earnings}</Text>
          )}
        </View>

        <View style={styles.shiftBody}>
          <View style={styles.shiftTimeRow}>
            <Feather name="clock" size={16} color={COLORS.muted} />
            <Text style={styles.shiftTime}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          <View style={styles.shiftDurationRow}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={16}
              color={COLORS.muted}
            />
            <Text style={styles.shiftDuration}>{item.duration} hours</Text>
          </View>
        </View>

        <View style={styles.shiftFooter}>
          <TouchableOpacity
            style={styles.shiftEditBtn}
            onPress={() => handleEditShift(item.id)}
          >
            <Feather name="edit-2" size={14} color={COLORS.primary} />
            <Text style={styles.shiftEditText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shiftCancelBtn}
            onPress={() => handleCancelShift(item.id)}
          >
            <Feather name="x" size={14} color={COLORS.muted} />
            <Text style={styles.shiftCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <Text style={styles.headerSubtitle}>Manage your availability</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/notification")}
          >
            <Feather name="bell" size={20} color={COLORS.primary} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/rider/settings")}
          >
            <Feather name="settings" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1️⃣ Schedule Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Today&apos;s Summary</Text>
          </View>

          <View style={styles.overviewStats}>
            <View style={styles.overviewStatItem}>
              <View
                style={[styles.statIcon, { backgroundColor: COLORS.lightGray }]}
              >
                <Feather name="clock" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statLabel}>Scheduled Hours</Text>
              <Text style={styles.statValue}>{totalHoursToday}h</Text>
            </View>

            <View style={styles.overviewStatItem}>
              <View
                style={[styles.statIcon, { backgroundColor: COLORS.lightGray }]}
              >
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statLabel}>Upcoming Shift</Text>
              <Text style={styles.statValue}>
                {todaySchedule?.startTime || "None"}
              </Text>
            </View>
          </View>
        </View>

        {/* 2️⃣ Weekly Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <FlatList
            horizontal
            data={WEEKLY_SCHEDULE}
            renderItem={renderDaySchedule}
            keyExtractor={(item) => item.date}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weeklyList}
          />
        </View>

        {/* 3️⃣ Set Availability Button */}
        <TouchableOpacity
          style={styles.setAvailabilityBtn}
          onPress={() => router.push("/rider/set-availability")}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.setAvailabilityText}>Set Availability</Text>
        </TouchableOpacity>

        {/* 5️⃣ Upcoming Shifts List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
            <Text style={styles.sectionCount}>
              {UPCOMING_SHIFTS.length} shifts
            </Text>
          </View>

          {UPCOMING_SHIFTS.map((shift) => (
            <View key={shift.id}>{renderUpcomingShift({ item: shift })}</View>
          ))}
        </View>
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
    padding: 16,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginTop: 12,
  },
  messageSub: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Header
  header: {
    padding: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  notifBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  // 1️⃣ Overview Card
  overviewCard: {
    margin: 12,
    padding: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  statusLabelActive: {
    color: COLORS.primary,
  },
  overviewStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  overviewStatItem: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // Section
  section: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: COLORS.muted,
  },

  // 2️⃣ Weekly Schedule
  weeklyList: {
    gap: 10,
  },
  dayCard: {
    width: 90,
    padding: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dayCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayName: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 4,
  },
  dayNameActive: {
    color: "rgba(255,255,255,0.8)",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 6,
  },
  dayNumberActive: {
    color: "#FFFFFF",
  },
  dayTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 8,
  },
  dayTime: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  dayTimeActive: {
    color: "rgba(255,255,255,0.9)",
  },
  dayTimeSeparator: {
    fontSize: 10,
    color: COLORS.muted,
  },
  dayOff: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  dayOffActive: {
    color: "rgba(255,255,255,0.7)",
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  dayEarnings: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },

  // 3️⃣ Set Availability Button
  setAvailabilityBtn: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setAvailabilityText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // 5️⃣ Upcoming Shifts
  shiftCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shiftDate: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  shiftEarnings: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  shiftBody: {
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  shiftTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftTime: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  shiftDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftDuration: {
    fontSize: 12,
    color: COLORS.muted,
  },
  shiftFooter: {
    flexDirection: "row",
    gap: 8,
  },
  shiftEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  shiftEditText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  shiftCancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  shiftCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
});
