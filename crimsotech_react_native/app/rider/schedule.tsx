import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router'; // Ensure this is imported for navigation

// --- Color Palette (Orange Theme) ---
const COLORS = {
  primary: '#F97316',
  primaryDark: '#C2410C',
  primaryLight: '#FFF7ED',
  secondary: '#111827',
  muted: '#6B7280',
  bg: '#F9FAFB',
  cardBg: '#FFFFFF',
  dangerBg: '#FEF2F2',
  dangerText: '#DC2626',
  bookedBg: '#EFF6FF',
  bookedText: '#2563EB',
  surge: '#F59E0B',
};

// --- Types & Mock Data ---
type ShiftStatus = 'available' | 'booked' | 'completed' | 'full';

interface Shift {
  id: string;
  timeRange: string;
  zone: string;
  status: ShiftStatus;
  surge?: number;
  estEarnings?: string;
}

const SHIFT_DATA: Record<string, Shift[]> = {
  '2025-01-29': [
    { id: '1', timeRange: '08:00 AM - 11:00 AM', zone: 'Quezon', status: 'completed', estEarnings: '₱250' },
    { id: '2', timeRange: '12:00 PM - 03:00 PM', zone: 'Tagaytay', status: 'booked', surge: 1.2, estEarnings: '₱350' },
    { id: '3', timeRange: '05:00 PM - 09:00 PM', zone: 'Makati', status: 'available', surge: 1.5, estEarnings: '₱500' },
  ],
  '2025-01-30': [
    { id: '4', timeRange: '10:00 AM - 02:00 PM', zone: 'Tagaytay', status: 'available', estEarnings: '₱400' },
    { id: '5', timeRange: '06:00 PM - 10:00 PM', zone: 'Quezon', status: 'full', estEarnings: '₱450' },
  ],
};

const StatusBadge = ({ status, surge }: { status: ShiftStatus; surge?: number }) => {
  const getStyle = () => {
    switch (status) {
      case 'available': return { bg: COLORS.primaryLight, text: COLORS.primaryDark, label: 'Open' };
      case 'booked': return { bg: COLORS.bookedBg, text: COLORS.bookedText, label: 'Booked' };
      case 'completed': return { bg: '#F3F4F6', text: COLORS.muted, label: 'Completed' };
      case 'full': return { bg: COLORS.dangerBg, text: COLORS.dangerText, label: 'Full' };
      default: return { bg: '#eee', text: '#000', label: status };
    }
  };

  const style = getStyle();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {surge && (
        <View style={styles.surgeBadge}>
          <Feather name="zap" size={10} color="#FFFFFF" />
          <Text style={styles.surgeText}>{surge}x</Text>
        </View>
      )}
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
      </View>
    </View>
  );
};

export default function SchedulePage() {
  const { userRole } = useAuth();
  const [selectedDate, setSelectedDate] = useState('2025-01-29');

  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons name="shield-alert-outline" size={48} color={COLORS.muted} />
        <Text style={styles.messageTitle}>Access Restricted</Text>
        <Text style={styles.messageSub}>Only verified riders can access the schedule.</Text>
      </SafeAreaView>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dates = useMemo(() => {
    const arr = [];
    const today = new Date('2025-01-29'); 
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        full: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
      });
    }
    return arr;
  }, []);

  const currentShifts = SHIFT_DATA[selectedDate] || [];

  const handleBooking = (id: string) => {
    Alert.alert("Confirm Booking", "Do you want to grab this shift?", [
      { text: "Cancel", style: "cancel" },
      { text: "Book Shift", onPress: () => console.log(`Booked shift ${id}`) }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />
      
      {/* --- Header & Action Icons --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>My Schedule</Text>
            <Text style={styles.subHeader}>Plan your week ahead</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => console.log('Open Notifications')}
            >
              <Feather name="bell" size={22} color={COLORS.secondary} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>

            {/* FIXED ROUTE HERE: Points to /rider/settings */}
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => router.push('/rider/settings')} 
            >
              <Feather name="settings" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bento Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
            <View style={styles.statIconBgWhite}>
              <Feather name="clock" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.statLabelLight}>Booked Hours</Text>
              <Text style={styles.statValueLight}>12.5 hrs</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
             <View style={[styles.statIconBg, { backgroundColor: '#E5E7EB' }]}>
              <MaterialCommunityIcons name="currency-php" size={18} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.statLabel}>Est. Earnings</Text>
              <Text style={styles.statValue}>₱1,450.00</Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- Date Strip --- */}
      <View style={styles.dateStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          {dates.map((item) => {
            const isSelected = selectedDate === item.full;
            return (
              <TouchableOpacity
                key={item.full}
                style={[styles.dateItem, isSelected && styles.dateItemActive]}
                onPress={() => setSelectedDate(item.full)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{item.day}</Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>{item.date}</Text>
                {isSelected && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* --- Shift List --- */}
      <FlatList
        data={currentShifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="calendar" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No shifts available for this day.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === 'completed' && styles.cardDimmed]}>
            <View style={styles.cardHeader}>
              <StatusBadge status={item.status} surge={item.surge} />
              <Text style={styles.earningsText}>{item.estEarnings}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.timeText}>{item.timeRange}</Text>
              <View style={styles.zoneRow}>
                <Feather name="map-pin" size={14} color={COLORS.muted} />
                <Text style={styles.zoneText}>{item.zone}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              {item.status === 'available' && (
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleBooking(item.id)}>
                  <Text style={styles.actionBtnTextPrimary}>Book Shift</Text>
                </TouchableOpacity>
              )}
              {item.status === 'booked' && (
                <TouchableOpacity style={styles.actionBtnSecondary}>
                  <Text style={styles.actionBtnTextSecondary}>Cancel Booking</Text>
                </TouchableOpacity>
              )}
               {item.status === 'completed' && (
                <View style={styles.completedRow}>
                  <Feather name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.completedText}>Shift Complete</Text>
                </View>
              )}
              {item.status === 'full' && (
                <View style={styles.completedRow}>
                   <Feather name="lock" size={16} color={COLORS.muted} />
                   <Text style={styles.lockedText}>Waitlist Only</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  messageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginTop: 16 },
  messageSub: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  
  // Header
  header: { padding: 20, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: COLORS.secondary },
  subHeader: { fontSize: 14, color: COLORS.muted },
  
  // New Header Actions
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { 
    padding: 10, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12,
    position: 'relative' 
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dangerText,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  statIconBgWhite: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  statLabelLight: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  statValueLight: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Date Strip
  dateStripContainer: { backgroundColor: COLORS.cardBg, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, zIndex: 10 },
  dateStrip: { paddingHorizontal: 20, gap: 12 },
  dateItem: { width: 56, height: 72, borderRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  dateItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  dayTextActive: { color: 'rgba(255,255,255,0.9)' },
  dateText: { fontSize: 18, fontWeight: '700', color: COLORS.secondary },
  dateTextActive: { color: '#FFFFFF' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF', position: 'absolute', bottom: 6 },

  // List
  listContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280' },

  // Cards
  card: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  cardDimmed: { opacity: 0.7, borderLeftColor: '#9CA3AF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  earningsText: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  surgeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surge, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, gap: 2 },
  surgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardBody: { marginBottom: 16 },
  timeText: { fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoneText: { fontSize: 14, color: COLORS.muted },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnTextPrimary: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  actionBtnSecondary: { backgroundColor: COLORS.dangerBg, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnTextSecondary: { color: COLORS.dangerText, fontWeight: '600', fontSize: 14 },
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 4 },
  completedText: { color: COLORS.primary, fontWeight: '600' },
  lockedText: { color: COLORS.muted, fontWeight: '500' },
});