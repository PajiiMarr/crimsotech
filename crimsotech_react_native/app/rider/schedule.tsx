import React, { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  Switch,
  TextInput,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import AxiosInstance from "../../contexts/axios";

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
  value: number;
  label: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
  id?: string;
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

interface RiderAvailabilityData {
  id: string;
  rider_id: string;
  availability_status: 'offline' | 'available' | 'busy' | 'break' | 'unavailable';
  is_accepting_deliveries: boolean;
  last_status_update: string;
}

interface ScheduleMetrics {
  total_deliveries?: number;
  upcoming_deliveries?: number;
  in_progress_deliveries?: number;
  completed_deliveries?: number;
  avg_delivery_time?: number;
  total_distance_km?: number;
  average_rating?: number;
  today_deliveries?: number;
  peak_day?: string;
  availability_percentage?: number;
  avg_deliveries_per_day?: number;
}

export default function SchedulePage() {
  const { userRole, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [riderData, setRiderData] = useState<RiderAvailabilityData | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [scheduleMetrics, setScheduleMetrics] = useState<ScheduleMetrics>({});
  const [online, setOnline] = useState(true);
  
  // Modal states
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingDay, setEditingDay] = useState<DaySchedule | null>(null);
  
  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    availability_status: 'available' as RiderAvailabilityData['availability_status'],
    is_accepting_deliveries: true
  });
  
  const [scheduleForm, setScheduleForm] = useState<Partial<DaySchedule>>({
    value: 0,
    label: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    is_available: true
  });

  const userId = user?.user_id || user?.id;

  // Fetch all schedule data
  const fetchAllData = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      
      const response = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
        headers: { 'X-User-Id': userId }
      });

      if (response.data && response.data.success) {
        // Set rider data
        setRiderData(response.data.rider);
        setAvailabilityForm({
          availability_status: response.data.rider.availability_status,
          is_accepting_deliveries: response.data.rider.is_accepting_deliveries
        });
        
        // Format schedule data
        if (response.data.schedule && Array.isArray(response.data.schedule)) {
          const formattedSchedule = response.data.schedule.map((day: any) => ({
            value: day.day_of_week,
            label: day.day_name,
            is_available: day.is_available,
            start_time: day.start_time,
            end_time: day.end_time,
            id: day.id
          }));
          setSchedule(formattedSchedule);
        }

        // Store metrics
        if (response.data.metrics) {
          setScheduleMetrics(response.data.metrics);
        }
        
        setOnline(response.data.rider.availability_status === 'available');
      }
    } catch (err: any) {
      console.log('Schedule fetch error:', err);
      setError(err.message || 'Failed to load schedule data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId, fetchAllData]);

  // Handle toggle day availability
  const handleToggle = (index: number) => {
    const updated = [...schedule];
    updated[index].is_available = !updated[index].is_available;
    setSchedule(updated);
    saveSchedulePayload(updated);
  };

  // Handle time change
  const handleTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
    saveSchedulePayload(updated);
  };

  // Save schedule payload
  const saveSchedulePayload = async (scheduleArray: DaySchedule[]) => {
    try {
      const schedulePayload = scheduleArray.map(day => ({
        day_of_week: day.value,
        start_time: day.start_time,
        end_time: day.end_time,
        is_available: day.is_available
      }));

      const response = await AxiosInstance.post('/rider-schedule/update_schedule/',
        { schedule: schedulePayload },
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.success) {
        await fetchAllData(false);
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to update schedule');
    }
  };

  // Handle save schedule
  const handleSave = async () => {
    await saveSchedulePayload(schedule);
  };

  // Handle updating availability status
  const handleUpdateAvailability = async () => {
    try {
      setIsLoading(true);
      
      const response = await AxiosInstance.post('/rider-schedule/update_availability/', 
        availabilityForm,
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.success) {
        await fetchAllData(false);
        setShowAvailabilityModal(false);
        Alert.alert('Success', 'Availability updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving a specific day's schedule
  const handleSaveDaySchedule = async () => {
    try {
      setIsLoading(true);
      
      if (scheduleForm.value === undefined) return;
      
      const updatedSchedule = [...schedule];
      const index = updatedSchedule.findIndex(d => d.value === scheduleForm.value);
      
      if (index !== -1) {
        updatedSchedule[index] = {
          ...updatedSchedule[index],
          start_time: scheduleForm.start_time || '09:00',
          end_time: scheduleForm.end_time || '17:00',
          is_available: scheduleForm.is_available || false
        };
        setSchedule(updatedSchedule);
      }
      
      const schedulePayload = updatedSchedule.map(day => ({
        day_of_week: day.value,
        start_time: day.start_time,
        end_time: day.end_time,
        is_available: day.is_available
      }));
      
      const response = await AxiosInstance.post('/rider-schedule/update_schedule/', 
        { schedule: schedulePayload },
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.success) {
        await fetchAllData(false);
        setShowScheduleModal(false);
        setEditingDay(null);
        setScheduleForm({
          value: 0,
          label: 'Monday',
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        });
        Alert.alert('Success', 'Schedule updated successfully');
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle editing a day
  const handleEditDay = (day: DaySchedule) => {
    setEditingDay(day);
    setScheduleForm({
      value: day.value,
      label: day.label,
      start_time: day.start_time,
      end_time: day.end_time,
      is_available: day.is_available
    });
    setShowScheduleModal(true);
  };

  // Handle deleting a day
  const handleDeleteDay = async (dayOfWeek: number) => {
    Alert.alert('Reset Schedule', 'Reset this day to default schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            setIsLoading(true);
            
            const updatedSchedule = [...schedule];
            const index = updatedSchedule.findIndex(d => d.value === dayOfWeek);
            
            if (index !== -1) {
              updatedSchedule[index] = {
                ...updatedSchedule[index],
                start_time: '09:00',
                end_time: '17:00',
                is_available: dayOfWeek < 5
              };
              setSchedule(updatedSchedule);
            }
            
            const schedulePayload = updatedSchedule.map(day => ({
              day_of_week: day.value,
              start_time: day.start_time,
              end_time: day.end_time,
              is_available: day.is_available
            }));
            
            await AxiosInstance.post('/rider-schedule/update_schedule/', 
              { schedule: schedulePayload },
              { headers: { 'X-User-Id': userId } }
            );
            
            await fetchAllData(false);
            Alert.alert('Success', 'Schedule reset to default');
          } catch (error) {
            console.error('Error resetting schedule:', error);
            Alert.alert('Error', 'Failed to reset schedule');
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };

  // Handle online toggle
  const handleOnlineToggle = async (checked: boolean) => {
    setOnline(checked);
    
    try {
      const newStatus = checked ? 'available' : 'offline';
      await AxiosInstance.post('/rider-schedule/update_availability/', 
        {
          availability_status: newStatus,
          is_accepting_deliveries: checked
        },
        { headers: { 'X-User-Id': userId } }
      );
      
      await fetchAllData(false);
      Alert.alert('Success', `You are now ${checked ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating online status:', error);
      setOnline(!checked);
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  // Format time string
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours);
      const m = parseInt(minutes);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHours = h % 12 || 12;
      return `${displayHours}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Get status badge colors
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'offline':
        return { bg: '#E5E7EB', text: '#374151' };
      case 'busy':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'break':
        return { bg: '#DBEAFE', text: '#0C4A6E' };
      case 'unavailable':
        return { bg: '#FEE2E2', text: '#7F1D1D' };
      default:
        return { bg: '#E5E7EB', text: '#6B7280' };
    }
  };

  // If loading, show loader
  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.messageTitle}>Loading schedule...</Text>
      </SafeAreaView>
    );
  }

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
      { text: "Yes", onPress: () => handleDeleteDay(parseInt(id)) },
    ]);
  };

  // Handle Edit Shift
  const handleEditShift = (dayValue: number) => {
    const day = schedule.find(d => d.value === dayValue);
    if (day) {
      handleEditDay(day);
    }
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
    const badgeStyle = getStatusBadgeStyle(item.is_available ? "scheduled" : "off");

    return (
      <TouchableOpacity 
        style={styles.dayCard}
        onPress={() => handleEditDay(item)}
      >
        <Text style={styles.dayName}>{item.label.substring(0, 3)}</Text>

        {item.is_available ? (
          <View style={styles.dayTimeContainer}>
            <Text style={styles.dayTime}>{formatTime(item.start_time)}</Text>
            <Text style={styles.dayTimeSeparator}>-</Text>
            <Text style={styles.dayTime}>{formatTime(item.end_time)}</Text>
          </View>
        ) : (
          <Text style={styles.dayOff}>Off</Text>
        )}

        <View style={[styles.dayBadge, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.dayBadgeText, { color: badgeStyle.text }]}>
            {item.is_available ? 'Available' : 'Off'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header with Online Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <Text style={styles.headerSubtitle}>Manage your availability</Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: online ? '#D1FAE5' : '#F3F4F6' }
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: online ? '#065F46' : COLORS.muted }
              ]}
            >
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={handleOnlineToggle}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={online ? '#22C55E' : '#9CA3AF'}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchAllData(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Metrics Cards */}
        {scheduleMetrics && (
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.metricLabel}>Today Deliveries</Text>
              <Text style={styles.metricValue}>
                {scheduleMetrics.today_deliveries || 0}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Feather name="star" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.metricLabel}>Rating</Text>
              <Text style={styles.metricValue}>
                {scheduleMetrics.average_rating || 0}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Feather name="trending-up" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.metricLabel}>Availability</Text>
              <Text style={styles.metricValue}>
                {scheduleMetrics.availability_percentage || 0}%
              </Text>
            </View>
          </View>
        )}

        {/* Working Hours Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <TouchableOpacity
              style={styles.editAllBtn}
              onPress={() => Alert.alert('Info', 'Tap a day to edit or toggle availability')}
            >
              <Feather name="info" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={schedule}
            renderItem={renderDaySchedule}
            keyExtractor={(item) => item.value.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.scheduleList}
          />
        </View>

        {/* Availability Status Section */}
        <TouchableOpacity
          style={styles.availabilityCard}
          onPress={() => setShowAvailabilityModal(true)}
        >
          <View style={styles.availabilityHeader}>
            <View>
              <Text style={styles.availabilityLabel}>Current Status</Text>
              <Text style={styles.availabilityValue}>
                {availabilityForm.availability_status.charAt(0).toUpperCase() +
                  availabilityForm.availability_status.slice(1)}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: getStatusColors(
                    availabilityForm.availability_status
                  ).bg
                }
              ]}
            >
              <Text
                style={[
                  styles.statusIndicatorText,
                  {
                    color: getStatusColors(
                      availabilityForm.availability_status
                    ).text
                  }
                ]}
              >
                {availabilityForm.availability_status === 'available'
                  ? '✓'
                  : '○'}
              </Text>
            </View>
          </View>
          <Text style={styles.availabilityDesc}>
            Accepting deliveries:{' '}
            {availabilityForm.is_accepting_deliveries ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Availability Status</Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Feather name="x" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={availabilityForm.availability_status}
                  onValueChange={(value) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      availability_status: value as any
                    })
                  }
                  mode="dropdown"
                >
                  <Picker.Item label="Available" value="available" />
                  <Picker.Item label="Busy" value="busy" />
                  <Picker.Item label="On Break" value="break" />
                  <Picker.Item label="Unavailable" value="unavailable" />
                  <Picker.Item label="Offline" value="offline" />
                </Picker>
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.formLabel}>Accept new deliveries</Text>
                <Switch
                  value={availabilityForm.is_accepting_deliveries}
                  onValueChange={(value) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      is_accepting_deliveries: value
                    })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setShowAvailabilityModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleUpdateAvailability}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Update Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Edit Modal */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDay ? 'Edit Schedule' : 'Add Schedule'}
              </Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Feather name="x" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Day</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={scheduleForm.value?.toString()}
                  onValueChange={(value) => {
                    const dayNum = parseInt(value);
                    const days = [
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday'
                    ];
                    setScheduleForm({
                      ...scheduleForm,
                      value: dayNum,
                      label: days[dayNum]
                    });
                  }}
                  enabled={!editingDay}
                >
                  {[
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday'
                  ].map((day, index) => (
                    <Picker.Item
                      key={index}
                      label={day}
                      value={index.toString()}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.formLabel}>Start Time</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="09:00"
                value={scheduleForm.start_time}
                onChangeText={(text) =>
                  setScheduleForm({ ...scheduleForm, start_time: text })
                }
              />

              <Text style={styles.formLabel}>End Time</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="17:00"
                value={scheduleForm.end_time}
                onChangeText={(text) =>
                  setScheduleForm({ ...scheduleForm, end_time: text })
                }
              />

              <View style={styles.switchContainer}>
                <Text style={styles.formLabel}>
                  Available for deliveries
                </Text>
                <Switch
                  value={scheduleForm.is_available}
                  onValueChange={(value) =>
                    setScheduleForm({ ...scheduleForm, is_available: value })
                  }
                />
              </View>

              {editingDay && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => {
                    if (editingDay.value !== undefined) {
                      handleDeleteDay(editingDay.value);
                      setShowScheduleModal(false);
                    }
                  }}
                >
                  <Feather name="trash-2" size={16} color="#fff" />
                  <Text style={styles.btnDangerText}>Reset to Default</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => {
                  setShowScheduleModal(false);
                  setEditingDay(null);
                  setScheduleForm({
                    value: 0,
                    label: 'Monday',
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: true
                  });
                }}
                disabled={isLoading}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSaveDaySchedule}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Save Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 20,
  },

  // Header
  header: {
    padding: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Metrics
  metricsContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Section
  section: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  editAllBtn: {
    padding: 6,
  },

  // Schedule List
  scheduleList: {
    gap: 8,
  },
  dayCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    minWidth: 50,
  },
  dayTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  dayTime: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  dayTimeSeparator: {
    fontSize: 12,
    color: COLORS.muted,
  },
  dayOff: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Availability Card
  availabilityCard: {
    marginHorizontal: 12,
    marginBottom: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  availabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  availabilityLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 4,
  },
  availabilityValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicatorText: {
    fontSize: 24,
    fontWeight: "700",
  },
  availabilityDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Form
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: COLORS.lightGray,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.primary,
    marginBottom: 14,
    backgroundColor: COLORS.lightGray,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Buttons
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  btnSecondary: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  btnDanger: {
    backgroundColor: "#EF4444",
    marginTop: 8,
  },
  btnDangerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
