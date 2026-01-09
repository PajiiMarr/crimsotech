import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock schedule data
const mockSchedule = [
  {
    id: '1',
    date: 'Mon, Dec 18',
    shifts: [
      { id: 's1', startTime: '08:00 AM', endTime: '12:00 PM', status: 'completed', earnings: 1200 },
      { id: 's2', startTime: '02:00 PM', endTime: '06:00 PM', status: 'active', earnings: 1500 },
    ],
    totalEarnings: 2700,
  },
  {
    id: '2',
    date: 'Tue, Dec 19',
    shifts: [
      { id: 's3', startTime: '09:00 AM', endTime: '05:00 PM', status: 'scheduled', earnings: 2000 },
    ],
    totalEarnings: 2000,
  },
  {
    id: '3',
    date: 'Wed, Dec 20',
    shifts: [
      { id: 's4', startTime: '10:00 AM', endTime: '06:00 PM', status: 'available', earnings: 2200 },
    ],
    totalEarnings: 2200,
  },
  {
    id: '4',
    date: 'Thu, Dec 21',
    shifts: [
      { id: 's5', startTime: '07:00 AM', endTime: '03:00 PM', status: 'available', earnings: 1800 },
      { id: 's6', startTime: '04:00 PM', endTime: '10:00 PM', status: 'available', earnings: 1600 },
    ],
    totalEarnings: 3400,
  },
];

const RiderScheduleScreen = () => {
  const [selectedDate, setSelectedDate] = useState('1');
  const [schedule, setSchedule] = useState(mockSchedule);

  const toggleShift = (shiftId: string) => {
    setSchedule(prevSchedule => 
      prevSchedule.map(day => ({
        ...day,
        shifts: day.shifts.map(shift => 
          shift.id === shiftId 
            ? { ...shift, status: shift.status === 'available' ? 'scheduled' : 'available' }
            : shift
        )
      }))
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'active':
        return '#3b82f6';
      case 'scheduled':
        return '#f59e0b';
      case 'available':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'scheduled':
        return 'Scheduled';
      case 'available':
        return 'Available';
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Schedule</Text>
      
      {/* Weekly Overview */}
      <View style={styles.weeklyOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>This Week</Text>
          <Text style={styles.overviewValue}>₱8,100</Text>
          <Text style={styles.overviewDetails}>4 shifts completed</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Available Shifts</Text>
          <Text style={styles.overviewValue}>5</Text>
          <Text style={styles.overviewDetails}>This week</Text>
        </View>
      </View>

      {/* Schedule List */}
      {schedule.map((day) => (
        <View key={day.id} style={styles.dayContainer}>
          <Text style={styles.dayHeader}>{day.date}</Text>
          <Text style={styles.dayEarnings}>₱{day.totalEarnings.toLocaleString()}</Text>
          
          {day.shifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={[
                styles.shiftCard,
                { borderLeftColor: getStatusColor(shift.status) }
              ]}
              onPress={() => shift.status !== 'completed' && shift.status !== 'active' && toggleShift(shift.id)}
            >
              <View style={styles.shiftContent}>
                <View>
                  <Text style={styles.shiftTime}>{shift.startTime} - {shift.endTime}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(shift.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(shift.status) }]}>
                      {getStatusText(shift.status)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftEarnings}>₱{shift.earnings}</Text>
                  {shift.status === 'available' && (
                    <View style={styles.bookButton}>
                      <Text style={styles.bookButtonText}>Book</Text>
                    </View>
                  )}
                  {shift.status === 'scheduled' && (
                    <View style={styles.scheduledButton}>
                      <Text style={styles.scheduledButtonText}>Scheduled</Text>
                    </View>
                  )}
                  {shift.status === 'active' && (
                    <View style={styles.activeButton}>
                      <Text style={styles.activeButtonText}>Active</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Add Shift Button */}
      <TouchableOpacity style={styles.addShiftButton}>
        <Text style={styles.addShiftText}>+ Add Shift</Text>
      </TouchableOpacity>

      {/* Availability Toggle */}
      <View style={styles.availabilitySection}>
        <View style={styles.availabilityHeader}>
          <Text style={styles.availabilityTitle}>Set Availability</Text>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>Offline</Text>
            <View style={styles.toggleSwitch}>
              <View style={styles.toggleCircle} />
            </View>
            <Text style={[styles.toggleText, styles.toggleActive]}>Online</Text>
          </View>
        </View>
        <Text style={styles.availabilitySubtitle}>
          When online, you'll receive delivery requests in your area
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  weeklyOverview: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  overviewDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  dayContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  dayEarnings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  shiftContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shiftDetails: {
    alignItems: 'flex-end',
  },
  shiftEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  bookButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduledButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scheduledButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addShiftButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addShiftText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilitySection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 6,
  },
  toggleActive: {
    color: '#3b82f6',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#cbd5e1',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  availabilitySubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default RiderScheduleScreen;