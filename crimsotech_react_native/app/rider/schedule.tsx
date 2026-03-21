import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  Switch,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import RiderPageHeader from './includes/riderPageHeader';

interface RiderAvailabilityData {
  id: string;
  rider_id: string;
  availability_status: 'offline' | 'available' | 'busy' | 'break' | 'unavailable';
  is_accepting_deliveries: boolean;
  last_status_update: string;
  custom_schedule?: any;
  created_at: string;
  updated_at: string;
}

interface ScheduledDelivery {
  id: string;
  order: string;
  order_number: string;
  status: 'scheduled' | 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_pickup_time: string | null;
  scheduled_delivery_time: string | null;
  is_scheduled: boolean;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  distance_km: number | null;
  delivery_rating: number | null;
  notes: string | null;
  
  order_details?: {
    user: {
      username: string;
      email: string;
      contact_number: string;
    };
    shipping_address?: {
      recipient_name: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      recipient_phone: string;
    };
    total_amount: string;
    payment_method: string;
  };
  
  customer_name: string;
  customer_contact: string;
  shop_name: string | null;
  created_at: string;
  picked_at: string | null;
  delivered_at: string | null;
}

interface CustomSchedule {
  id?: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ScheduleDataResponse {
  success: boolean;
  rider: RiderAvailabilityData;
  schedule: CustomSchedule[];
  scheduled_deliveries?: ScheduledDelivery[];
}

interface WeeklyViewResponse {
  success: boolean;
  week_start?: string;
  week_end?: string;
  weekly_data?: Array<{
    date?: string;
    day_of_week?: number;
    day_name?: string;
    is_today?: boolean;
    is_available?: boolean;
    start_time?: string;
    end_time?: string;
    deliveries_count?: number;
  }>;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Status badge configurations
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  scheduled: { label: 'Scheduled', color: '#E0E7FF', icon: 'calendar-outline' },
  pending: { label: 'Pending', color: '#FEF3C7', icon: 'time-outline' },
  picked_up: { label: 'Picked Up', color: '#DBEAFE', icon: 'cube-outline' },
  in_progress: { label: 'In Progress', color: '#DBEAFE', icon: 'car-outline' },
  delivered: { label: 'Delivered', color: '#D1FAE5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#FEE2E2', icon: 'close-circle-outline' },
  default: { label: 'Unknown', color: '#F3F4F6', icon: 'help-circle-outline' }
};

// Availability status config
const AVAILABILITY_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  available: { label: 'Available', color: '#D1FAE5', icon: 'wifi-outline' },
  busy: { label: 'Busy', color: '#FEF3C7', icon: 'bicycle-outline' },
  break: { label: 'On Break', color: '#DBEAFE', icon: 'cafe-outline' },
  unavailable: { label: 'Unavailable', color: '#FEE2E2', icon: 'close-circle-outline' },
  offline: { label: 'Offline', color: '#F3F4F6', icon: 'wifi-outline' }
};

// Time Picker Component
const TimePickerModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  initialTime = '09:00',
  mode = 'start'
}: { 
  visible: boolean; 
  onClose: () => void; 
  onConfirm: (time: string) => void; 
  initialTime?: string;
  mode?: 'start' | 'end';
}) => {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (initialTime) {
      const [hours, minutes] = initialTime.split(':').map(Number);
      const hour = hours % 12 || 12;
      setSelectedHour(hour);
      setSelectedMinute(minutes);
      setSelectedPeriod(hours >= 12 ? 'PM' : 'AM');
    }
  }, [initialTime]);

  const handleConfirm = () => {
    let hour24 = selectedPeriod === 'PM' 
      ? (selectedHour === 12 ? 12 : selectedHour + 12)
      : (selectedHour === 12 ? 0 : selectedHour);
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onConfirm(timeString);
    onClose();
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ... 55

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, width: '90%', maxWidth: 400, padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ backgroundColor: mode === 'start' ? '#EFF6FF' : '#FEF3C7', padding: 12, borderRadius: 50, marginBottom: 12 }}>
              <Ionicons 
                name={mode === 'start' ? 'play' : 'stop'} 
                size={24} 
                color={mode === 'start' ? '#2563EB' : '#D97706'} 
              />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              Set {mode === 'start' ? 'Start' : 'End'} Time
            </Text>
          </View>

          {/* Alarm Clock Style Time Picker */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            {/* Hours */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Hour</Text>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={{ height: 150 }}
                contentContainerStyle={{ paddingVertical: 50 }}
              >
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setSelectedHour(hour)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: selectedHour === hour ? 28 : 20,
                      fontWeight: selectedHour === hour ? '600' : '400',
                      color: selectedHour === hour ? '#2563EB' : '#6B7280'
                    }}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={{ fontSize: 32, fontWeight: '200', marginHorizontal: 8, color: '#9CA3AF' }}>:</Text>

            {/* Minutes */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Min</Text>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={{ height: 150 }}
                contentContainerStyle={{ paddingVertical: 50 }}
              >
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => setSelectedMinute(minute)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: selectedMinute === minute ? 28 : 20,
                      fontWeight: selectedMinute === minute ? '600' : '400',
                      color: selectedMinute === minute ? '#2563EB' : '#6B7280'
                    }}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM */}
            <View style={{ marginLeft: 8 }}>
              <View>
                <TouchableOpacity
                  onPress={() => setSelectedPeriod('AM')}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    backgroundColor: selectedPeriod === 'AM' ? '#EFF6FF' : '#F9FAFB',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderWidth: 1,
                    borderColor: selectedPeriod === 'AM' ? '#2563EB' : '#E5E7EB'
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: selectedPeriod === 'AM' ? '#2563EB' : '#6B7280'
                  }}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedPeriod('PM')}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    backgroundColor: selectedPeriod === 'PM' ? '#EFF6FF' : '#F9FAFB',
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    borderWidth: 1,
                    borderColor: selectedPeriod === 'PM' ? '#2563EB' : '#E5E7EB',
                    borderTopWidth: 0
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: selectedPeriod === 'PM' ? '#2563EB' : '#6B7280'
                  }}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Selected Time Display */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ 
              backgroundColor: '#F3F4F6', 
              paddingVertical: 12, 
              paddingHorizontal: 24, 
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <Text style={{ fontSize: 24, fontWeight: '600', marginLeft: 8, color: '#1F2937' }}>
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, marginRight: 8, padding: 14, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, color: '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{ flex: 1, marginLeft: 8, padding: 14, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function RiderSchedule() {
  const { user } = useAuth();
  const { width } = Dimensions.get('window');
  
  // State for data
  const [scheduleData, setScheduleData] = useState<ScheduleDataResponse | null>(null);
  const [weeklyView, setWeeklyView] = useState<WeeklyViewResponse | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showWeeklyCards, setShowWeeklyCards] = useState(false);
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date());
  
  // UI States
  const [online, setOnline] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  
  // Modal states
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{ 
    visible: boolean; 
    dayIndex: number; 
    field: 'start_time' | 'end_time';
    initialTime: string;
  } | null>(null);
  
  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    availability_status: 'available' as RiderAvailabilityData['availability_status'],
    is_accepting_deliveries: true
  });

  // Schedule state
  const [schedule, setSchedule] = useState<CustomSchedule[]>([]);

  // Get user ID
  const userId = user?.user_id || user?.id;

  // Update online status based on rider data
  useEffect(() => {
    if (scheduleData?.rider) {
      setOnline(scheduleData.rider.availability_status === 'available');
      setAvailabilityForm({
        availability_status: scheduleData.rider.availability_status,
        is_accepting_deliveries: scheduleData.rider.is_accepting_deliveries
      });
    }
  }, [scheduleData]);

  // Initialize schedule from API data
  useEffect(() => {
    if (scheduleData?.schedule) {
      setSchedule(scheduleData.schedule);
    }
  }, [scheduleData]);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const fetchScheduleData = useCallback(async () => {
    try {
      const scheduleResponse = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
        headers: { 'X-User-Id': userId }
      });

      if (scheduleResponse.data.success) {
        setScheduleData(scheduleResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching schedule data:', error);
      Alert.alert('Error', 'Failed to load schedule data');
    }
  }, [userId]);

  const fetchWeeklyData = useCallback(async () => {
    try {
      const weeklyResponse = await AxiosInstance.get(`/rider-schedule/get_weekly_view/?week_offset=${weekOffset}`, {
        headers: { 'X-User-Id': userId }
      });

      if (weeklyResponse.data?.success) {
        setWeeklyView(weeklyResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching weekly view:', error);
      Alert.alert('Error', 'Failed to load weekly view');
    }
  }, [userId, weekOffset]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchScheduleData(), fetchWeeklyData()]);
    } catch (error: any) {
      console.error('Error fetching initial schedule data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchScheduleData, fetchWeeklyData]);

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // When navigating weeks, refresh only weekly calendar data so schedule edits don't get reset
  useEffect(() => {
    if (!isLoading) {
      fetchWeeklyData();
    }
  }, [weekOffset, fetchWeeklyData, isLoading]);

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  // Handle toggle day availability
  const handleToggleDay = async (index: number) => {
    const updated = [...schedule];
    updated[index].is_available = !updated[index].is_available;
    setSchedule(updated);
    await saveSchedule(updated);
  };

  // Handle time change
  const handleTimeChange = async (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
    await saveSchedule(updated);
  };

  // Save schedule to API
  const saveSchedule = async (scheduleArray: CustomSchedule[]) => {
    try {
      const schedulePayload = scheduleArray.map(day => ({
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
        is_available: day.is_available
      }));

      await AxiosInstance.post('/rider-schedule/update_schedule/',
        { schedule: schedulePayload },
        { headers: { 'X-User-Id': userId } }
      );

      // Keep UI in sync without resetting user context
      setScheduleData((prev) =>
        prev
          ? {
              ...prev,
              schedule: scheduleArray,
            }
          : prev,
      );

      await fetchWeeklyData();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to update schedule');
    }
  };

  // Handle online status toggle
  const handleOnlineToggle = async (value: boolean) => {
    setOnline(value);
    
    try {
      const newStatus = value ? 'available' : 'offline';
      await AxiosInstance.post('/rider-schedule/update_availability/', 
        {
          availability_status: newStatus,
          is_accepting_deliveries: value
        },
        { headers: { 'X-User-Id': userId } }
      );

      await fetchScheduleData();
    } catch (error) {
      console.error('Error updating online status:', error);
      setOnline(!value); // Revert on error
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  // Handle update availability
  const handleUpdateAvailability = async () => {
    try {
      setIsLoading(true);
      
      const response = await AxiosInstance.post('/rider-schedule/update_availability/', 
        availabilityForm,
        { headers: { 'X-User-Id': userId } }
      );

      if (response.data.success) {
        await fetchScheduleData();
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

  const handleResetDay = async (dayOfWeek: number) => {
    try {
      setIsLoading(true);
      await AxiosInstance.delete(`/rider-schedule/delete_schedule/?day_of_week=${dayOfWeek}`, {
        headers: { 'X-User-Id': userId }
      });
      await fetchScheduleData();
      await fetchWeeklyData();
      Alert.alert('Success', 'Day schedule reset.');
    } catch (error: any) {
      console.error('Error resetting day schedule:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to reset day schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Format time for display with AM/PM
  const formatTimeWithAMPM = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Toggle day expansion
  const toggleDayExpansion = (dayIndex: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex);
    } else {
      newExpanded.add(dayIndex);
    }
    setExpandedDays(newExpanded);
  };

  const formatWeekRangeLabel = (start?: string, end?: string) => {
    if (!start || !end) return 'Weekly Overview';
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  const onWeekDateChange = (_event: any, pickedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowWeekPicker(false);
    }

    if (!pickedDate) return;

    setSelectedWeekDate(pickedDate);

    const currentWeekStart = getWeekStart(new Date());
    const pickedWeekStart = getWeekStart(pickedDate);
    const diffMs = pickedWeekStart.getTime() - currentWeekStart.getTime();
    const computedOffset = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(computedOffset);
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <View style={{ padding: 16 }}>
      <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, marginBottom: 12 }}>
        <View style={{ height: 20, backgroundColor: '#E5E7EB', borderRadius: 4, width: '60%', marginBottom: 12 }} />
        <View style={{ height: 40, backgroundColor: '#E5E7EB', borderRadius: 4, width: '100%', marginBottom: 8 }} />
        <View style={{ height: 40, backgroundColor: '#E5E7EB', borderRadius: 4, width: '100%' }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <RiderPageHeader 
        title="Schedule" 
        subtitle="Manage your working hours"
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* Online Status Toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
            <View style={{ 
              backgroundColor: online ? '#D1FAE5' : '#F3F4F6', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 20,
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: online ? '#059669' : '#6B7280' }}>
                {online ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={online}
                onValueChange={handleOnlineToggle}
                trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                thumbColor={online ? '#059669' : '#9CA3AF'}
              />
            </View>
          </View>

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setShowWeeklyCards((prev) => !prev)}
                style={{ backgroundColor: '#F3F4F6', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="calendar-outline" size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setWeekOffset((prev) => prev - 1)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' }}
              >
                <Text style={{ fontSize: 12, color: '#374151' }}>Prev Week</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowWeekPicker(true)}>
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
                  {formatWeekRangeLabel(weeklyView?.week_start, weeklyView?.week_end)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeekOffset((prev) => prev + 1)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' }}
              >
                <Text style={{ fontSize: 12, color: '#374151' }}>Next Week</Text>
              </TouchableOpacity>
            </View>

            {showWeeklyCards && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(weeklyView?.weekly_data || []).map((item, idx) => (
                  <View
                    key={`${item.date || idx}`}
                    style={{ width: '32%', marginRight: idx % 3 === 2 ? 0 : '2%', marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 8, backgroundColor: '#FAFAFA' }}
                  >
                    <Text style={{ fontSize: 11, color: '#374151', fontWeight: '600' }}>{item.day_name || DAYS_OF_WEEK[idx] || 'Day'}</Text>
                    <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{item.date || ''}</Text>
                    <Text style={{ fontSize: 13, color: '#111827', fontWeight: '700', marginTop: 4 }}>{item.deliveries_count || 0} deliveries</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {isLoading && !scheduleData ? (
            <LoadingSkeleton />
          ) : (
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 10 }}>
                    <Ionicons name="time-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 12, color: '#111827' }}>Working Hours</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAvailabilityModal(true)}
                  style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 }}
                >
                  <Ionicons name="settings-outline" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, paddingHorizontal: 4 }}>
                Set your availability and working hours for each day
              </Text>

              {/* Schedule List */}
              <View style={{ gap: 8 }}>
                {schedule.map((day, index) => (
                  <View key={day.day_of_week} style={{ 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: '#F3F4F6',
                    overflow: 'hidden'
                  }}>
                    {/* Day Header - Always Visible */}
                    <TouchableOpacity
                      onPress={() => toggleDayExpansion(day.day_of_week)}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: 14,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: 4, 
                            backgroundColor: day.is_available ? '#10B981' : '#EF4444',
                            marginRight: 8
                          }} />
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                            {day.day_name}
                          </Text>
                        </View>
                        {day.is_available ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 16 }}>
                            <Ionicons name="time-outline" size={12} color="#059669" />
                            <Text style={{ fontSize: 12, color: '#059669', marginLeft: 4 }}>
                              {formatTimeWithAMPM(day.start_time)} - {formatTimeWithAMPM(day.end_time)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 16 }}>Unavailable</Text>
                        )}
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Switch
                          value={day.is_available}
                          onValueChange={() => handleToggleDay(index)}
                          trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                          thumbColor={day.is_available ? '#059669' : '#9CA3AF'}
                          style={{ marginRight: 8 }}
                        />
                        <Ionicons 
                          name={expandedDays.has(day.day_of_week) ? 'chevron-up' : 'chevron-down'} 
                          size={20} 
                          color="#9CA3AF" 
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Time Selection - Only visible when expanded */}
                    {expandedDays.has(day.day_of_week) && day.is_available && (
                      <View style={{ 
                        padding: 16, 
                        backgroundColor: '#F3F4F6',
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB'
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 12 }}>
                          Set Working Hours
                        </Text>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          {/* Start Time */}
                          <TouchableOpacity
                            onPress={() => setShowTimePicker({
                              visible: true,
                              dayIndex: index,
                              field: 'start_time',
                              initialTime: day.start_time
                            })}
                            style={{ flex: 1, marginRight: 8 }}
                          >
                            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>START TIME</Text>
                            <View style={{ 
                              backgroundColor: 'white',
                              padding: 12,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <Ionicons name="play" size={16} color="#2563EB" />
                              <Text style={{ fontSize: 13, fontWeight: '500', marginLeft: 8, color: '#1F2937' }}>
                                {formatTimeWithAMPM(day.start_time)}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* End Time */}
                          <TouchableOpacity
                            onPress={() => setShowTimePicker({
                              visible: true,
                              dayIndex: index,
                              field: 'end_time',
                              initialTime: day.end_time
                            })}
                            style={{ flex: 1, marginLeft: 8 }}
                          >
                            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>END TIME</Text>
                            <View style={{ 
                              backgroundColor: 'white',
                              padding: 12,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <Ionicons name="stop" size={16} color="#D97706" />
                              <Text style={{ fontSize: 13, fontWeight: '500', marginLeft: 8, color: '#1F2937' }}>
                                {formatTimeWithAMPM(day.end_time)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleResetDay(day.day_of_week)}
                          style={{ marginTop: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 12, color: '#B91C1C', fontWeight: '600' }}>Reset This Day</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePickerModal
          visible={showTimePicker.visible}
          onClose={() => setShowTimePicker(null)}
          onConfirm={(time) => {
            handleTimeChange(showTimePicker.dayIndex, showTimePicker.field, time);
            setShowTimePicker(null);
          }}
          initialTime={showTimePicker.initialTime}
          mode={showTimePicker.field === 'start_time' ? 'start' : 'end'}
        />
      )}

      {/* Week Picker */}
      {showWeekPicker && (
        <DateTimePicker
          value={selectedWeekDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onWeekDateChange}
        />
      )}

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '600' }}>Update Availability</Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Set your current availability status for deliveries.
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 }}>Status</Text>
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
                {Object.entries(AVAILABILITY_CONFIG).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setAvailabilityForm({
                      ...availabilityForm,
                      availability_status: key as RiderAvailabilityData['availability_status']
                    })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: key !== 'offline' ? 1 : 0,
                      borderBottomColor: '#E5E7EB',
                      backgroundColor: availabilityForm.availability_status === key ? '#EFF6FF' : 'transparent'
                    }}
                  >
                    <View style={{ backgroundColor: config.color, padding: 8, borderRadius: 20, marginRight: 12 }}>
                      <Ionicons name={config.icon} size={18} color="#4B5563" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{config.label}</Text>
                    </View>
                    {availabilityForm.availability_status === key && (
                      <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>Accept new deliveries</Text>
              <Switch
                value={availabilityForm.is_accepting_deliveries}
                onValueChange={(value) => setAvailabilityForm({...availabilityForm, is_accepting_deliveries: value})}
                trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                thumbColor={availabilityForm.is_accepting_deliveries ? '#059669' : '#9CA3AF'}
              />
            </View>

            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => setShowAvailabilityModal(false)}
                style={{ flex: 1, marginRight: 8, padding: 14, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateAvailability}
                disabled={isLoading}
                style={{ flex: 1, marginLeft: 8, padding: 14, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center' }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontSize: 15, color: 'white', fontWeight: '600' }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}