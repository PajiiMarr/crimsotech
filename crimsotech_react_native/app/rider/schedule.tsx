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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import RiderPageHeader from './includes/riderPageHeader';

interface RiderAvailabilityData {
  id: string;
  rider_id: string;
  availability_status: 'offline' | 'available' | 'busy' | 'break' | 'unavailable';
  is_accepting_deliveries: boolean;
  last_status_update: string;
  created_at: string;
  updated_at: string;
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
}

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
}: { 
  visible: boolean; 
  onClose: () => void; 
  onConfirm: (time: string) => void; 
  initialTime?: string;
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
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

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
            <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 50, marginBottom: 12 }}>
              <Ionicons name="time-outline" size={24} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Select Time</Text>
          </View>

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
                    style={{ paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
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
                    style={{ paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: selectedPeriod === 'AM' ? '#2563EB' : '#6B7280' }}>AM</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: selectedPeriod === 'PM' ? '#2563EB' : '#6B7280' }}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, flexDirection: 'row', alignItems: 'center' }}>
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

// Combined Time Editor Modal - for editing both start and end times
const TimeEditorModal = ({ 
  visible, 
  onClose, 
  onSave, 
  dayName,
  startTime,
  endTime
}: { 
  visible: boolean; 
  onClose: () => void; 
  onSave: (startTime: string, endTime: string) => void;
  dayName: string;
  startTime: string;
  endTime: string;
}) => {
  const [tempStartTime, setTempStartTime] = useState(startTime);
  const [tempEndTime, setTempEndTime] = useState(endTime);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    setTempStartTime(startTime);
    setTempEndTime(endTime);
  }, [startTime, endTime]);

  const formatTimeDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, width: '85%', maxWidth: 350, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 50, marginBottom: 12 }}>
                <Ionicons name="time-outline" size={24} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>{dayName}</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Set your working hours</Text>
            </View>

            {/* Start Time */}
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={{ marginBottom: 16 }}
            >
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>START TIME</Text>
              <View style={{ 
                backgroundColor: '#F9FAFB', 
                padding: 14, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: '#E5E7EB',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={18} color="#2563EB" />
                  <Text style={{ fontSize: 15, fontWeight: '500', marginLeft: 8, color: '#1F2937' }}>
                    {formatTimeDisplay(tempStartTime)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            {/* End Time */}
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              style={{ marginBottom: 24 }}
            >
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>END TIME</Text>
              <View style={{ 
                backgroundColor: '#F9FAFB', 
                padding: 14, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: '#E5E7EB',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={18} color="#D97706" />
                  <Text style={{ fontSize: 15, fontWeight: '500', marginLeft: 8, color: '#1F2937' }}>
                    {formatTimeDisplay(tempEndTime)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSave(tempStartTime, tempEndTime)}
                style={{ flex: 1, padding: 12, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, color: 'white', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Time Picker Modal */}
      <TimePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(time) => {
          setTempStartTime(time);
          setShowStartPicker(false);
        }}
        initialTime={tempStartTime}
      />

      {/* End Time Picker Modal */}
      <TimePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(time) => {
          setTempEndTime(time);
          setShowEndPicker(false);
        }}
        initialTime={tempEndTime}
      />
    </>
  );
};

export default function RiderSchedule() {
  const { user } = useAuth();
  
  const [scheduleData, setScheduleData] = useState<ScheduleDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [online, setOnline] = useState(true);
  const [pendingOnlineState, setPendingOnlineState] = useState<boolean | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showTimeEditor, setShowTimeEditor] = useState<{ 
    visible: boolean; 
    dayIndex: number; 
    dayName: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  
  const [schedule, setSchedule] = useState<CustomSchedule[]>([]);

  const userId = user?.user_id || user?.id;

  useEffect(() => {
    if (scheduleData?.rider) {
      setOnline(scheduleData.rider.availability_status === 'available');
    }
  }, [scheduleData]);

  useEffect(() => {
    if (scheduleData?.schedule) {
      setSchedule(scheduleData.schedule);
    }
  }, [scheduleData]);

  const fetchScheduleData = useCallback(async () => {
    try {
      const response = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
        headers: { 'X-User-Id': userId }
      });

      if (response.data.success) {
        setScheduleData(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching schedule data:', error);
      Alert.alert('Error', 'Failed to load schedule data');
    }
  }, [userId]);

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchScheduleData();
    } catch (error: any) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchScheduleData]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  const handleToggleDay = async (index: number) => {
    const updated = [...schedule];
    updated[index].is_available = !updated[index].is_available;
    setSchedule(updated);
    await saveSchedule(updated);
  };

  const handleSaveTime = async (index: number, startTime: string, endTime: string) => {
    const updated = [...schedule];
    updated[index].start_time = startTime;
    updated[index].end_time = endTime;
    setSchedule(updated);
    await saveSchedule(updated);
    setShowTimeEditor(null);
  };

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

      setScheduleData((prev) =>
        prev ? { ...prev, schedule: scheduleArray } : prev
      );
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to update schedule');
    }
  };

  // Handle online toggle - when turning off, show modal first
  const handleOnlineToggle = (value: boolean) => {
    if (value === false) {
      // Store the desired state and show modal
      setPendingOnlineState(false);
      setShowOfflineModal(true);
    } else {
      // Turning ON - directly update
      setOnline(true);
      updateAvailabilityStatus('available', true);
    }
  };

  // Confirm going offline after selecting reason
  const selectOfflineReason = async (status: 'busy' | 'break' | 'unavailable') => {
    setShowOfflineModal(false);
    // Update to offline state
    setOnline(false);
    await updateAvailabilityStatus(status, false);
    setPendingOnlineState(null);
  };

  // Cancel going offline
  const cancelOffline = () => {
    setShowOfflineModal(false);
    setPendingOnlineState(null);
    // Reset switch back to online state
    setOnline(true);
  };

  const updateAvailabilityStatus = async (status: string, acceptingDeliveries: boolean) => {
    try {
      setIsLoading(true);
      
      await AxiosInstance.post('/rider-schedule/update_availability/', 
        {
          availability_status: status,
          is_accepting_deliveries: acceptingDeliveries
        },
        { headers: { 'X-User-Id': userId } }
      );

      await fetchScheduleData();
    } catch (error: any) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability status');
      // Revert online state on error
      setOnline(status === 'available');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDay = async (dayOfWeek: number) => {
    Alert.alert(
      'Reset Day',
      'Are you sure you want to reset this day\'s schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await AxiosInstance.delete(`/rider-schedule/delete_schedule/?day_of_week=${dayOfWeek}`, {
                headers: { 'X-User-Id': userId }
              });
              await fetchScheduleData();
              Alert.alert('Success', 'Day schedule reset.');
            } catch (error: any) {
              console.error('Error resetting day schedule:', error);
              Alert.alert('Error', error?.response?.data?.error || 'Failed to reset day schedule');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTimeWithAMPM = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
        <View style={{ flex: 1 }}>
          {isLoading && !scheduleData ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Header Card - Edge to Edge */}
              <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', padding: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 10 }}>
                      <Ionicons name="time-outline" size={20} color="#2563EB" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 12, color: '#111827' }}>Working Hours</Text>
                  </View>
                  
                  {/* Status Toggle - GREEN theme (Main Toggle) */}
                  <View style={{ 
                    backgroundColor: online ? '#D1FAE5' : '#F3F4F6', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 20,
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
              </View>

              {/* Days Card - Edge to Edge, separate from header */}
              <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#F3F4F6', padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 }}>
                  Set your availability for each day
                </Text>

                <View style={{ gap: 8 }}>
                  {schedule.map((day, index) => (
                    <TouchableOpacity 
                      key={day.day_of_week}
                      onPress={() => {
                        if (day.is_available) {
                          setShowTimeEditor({
                            visible: true,
                            dayIndex: index,
                            dayName: day.day_name,
                            startTime: day.start_time,
                            endTime: day.end_time
                          });
                        }
                      }}
                      activeOpacity={0.7}
                      disabled={!day.is_available}
                      style={{ 
                        backgroundColor: '#F9FAFB', 
                        borderRadius: 12, 
                        borderWidth: 1, 
                        borderColor: '#F3F4F6',
                        padding: 14,
                        opacity: day.is_available ? 1 : 0.7
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: 4, 
                              backgroundColor: day.is_available ? '#10B981' : '#EF4444',
                              marginRight: 8
                            }} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>{day.day_name}</Text>
                          </View>
                          {day.is_available ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 16 }}>
                              <Ionicons name="time-outline" size={12} color="#059669" />
                              <Text style={{ fontSize: 12, color: '#059669', marginLeft: 4 }}>
                                {formatTimeWithAMPM(day.start_time)} - {formatTimeWithAMPM(day.end_time)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 12, color: '#a76810', marginTop: 4, marginLeft: 16 }}>Unavailable</Text>
                          )}
                        </View>
                        
                        <Switch
                          value={day.is_available}
                          onValueChange={() => handleToggleDay(index)}
                          trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
                          thumbColor={day.is_available ? '#D97706' : '#9CA3AF'}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Time Editor Modal */}
      {showTimeEditor && (
        <TimeEditorModal
          visible={showTimeEditor.visible}
          onClose={() => setShowTimeEditor(null)}
          onSave={(startTime, endTime) => handleSaveTime(showTimeEditor.dayIndex, startTime, endTime)}
          dayName={showTimeEditor.dayName}
          startTime={showTimeEditor.startTime}
          endTime={showTimeEditor.endTime}
        />
      )}

      {/* Centered Offline Reason Modal */}
      <Modal
        visible={showOfflineModal}
        transparent
        animationType="fade"
        onRequestClose={cancelOffline}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, width: '85%', maxWidth: 350, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 50, marginBottom: 12 }}>
                <Ionicons name="power-outline" size={28} color="#dc9c26" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#1F2937' }}>Going Offline?</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                Select your status before going offline
              </Text>
            </View>

            <View style={{ marginTop: 8, gap: 8 }}>
              {Object.entries(AVAILABILITY_CONFIG)
                .filter(([key]) => ['busy', 'break', 'unavailable'].includes(key))
                .map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => selectOfflineReason(key as 'busy' | 'break' | 'unavailable')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: '#F9FAFB',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}
                  >
                    <View style={{ backgroundColor: config.color, padding: 8, borderRadius: 20, marginRight: 12 }}>
                      <Ionicons name={config.icon} size={18} color="#4B5563" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#1F2937' }}>{config.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
              onPress={cancelOffline}
              style={{ marginTop: 16, padding: 12, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, color: '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}