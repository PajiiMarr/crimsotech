import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

// --- Theme Colors (Minimalist - Matching Schedule) ---
const COLORS = {
  primary: "#111827",
  secondary: "#6B7280",
  muted: "#9CA3AF",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  lightGray: "#F9FAFB",
};

export default function SetAvailabilityPage() {
  const [date, setDate] = useState(new Date("2026-02-17"));
  const [startTime, setStartTime] = useState(new Date("2026-02-17T09:00:00"));
  const [endTime, setEndTime] = useState(new Date("2026-02-17T18:00:00"));

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Formatting helpers
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  // Handle Save Availability
  const handleSave = () => {
    if (endTime <= startTime) {
      Alert.alert("Invalid Time", "End time must be after start time.");
      return;
    }

    Alert.alert(
      "Availability Set",
      `Your shift on ${formatDate(date)} from ${formatTime(startTime)} to ${formatTime(endTime)} has been saved.`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Shift Details</Text>
          <Text style={styles.infoSub}>
            Set your preferred working hours for specific dates.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select Date</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={18} color={COLORS.muted} />
              <Text style={styles.inputValue}>{formatDate(date)}</Text>
              <Feather name="chevron-down" size={16} color={COLORS.muted} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Start Time Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Feather name="clock" size={18} color={COLORS.muted} />
              <Text style={styles.inputValue}>{formatTime(startTime)}</Text>
              <Feather name="chevron-down" size={16} color={COLORS.muted} />
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onStartTimeChange}
              />
            )}
          </View>

          {/* End Time Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Feather name="clock" size={18} color={COLORS.muted} />
              <Text style={styles.inputValue}>{formatTime(endTime)}</Text>
              <Feather name="chevron-down" size={16} color={COLORS.muted} />
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onEndTimeChange}
              />
            )}
          </View>

          <View style={styles.hintBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.validationText}>
              End time must be after start time
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Availability</Text>
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
  header: {
    padding: 8,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  backBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
  },
  scrollContent: {
    padding: 12,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 0,
  },
  infoSub: {
    fontSize: 11,
    color: COLORS.secondary,
  },
  formContainer: {
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputValue: {
    fontSize: 13,
    color: COLORS.primary,
    flex: 1,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },
  validationText: {
    fontSize: 10,
    color: COLORS.secondary,
    fontStyle: "italic",
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
