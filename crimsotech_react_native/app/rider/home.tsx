// app/rider/home.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

// --- Theme Colors ---
const COLORS = {
  primary: '#F97316',
  primaryLight: '#FFF7ED',
  secondary: '#111827',
  muted: '#6B7280',
  bg: '#F9FAFB',
  cardBg: '#FFFFFF',
  danger: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
};

export default function Home() {
  const [acceptingDeliveries, setAcceptingDeliveries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hardcoded data
  const fullName = "John Rider";
  const stats = {
    total_deliveries: 128,
    completed_deliveries: 120,
    todays_earnings: 850,
    total_earnings: 28500,
    average_rating: 4.8,
    active_deliveries: 2,
  };

  const activeDeliveries = [
    {
      id: '1',
      order_id: 'ORD-789456',
      status: 'pending',
      distance_km: 3.5,
      estimated_minutes: 25,
      order: {
        total_amount: 450,
        delivery_address_text: '123 Main St, Barangay 1, Manila City',
        user: { first_name: 'Maria', last_name: 'Santos' }
      },
      scheduled_delivery_time: '2024-01-24T15:30:00Z'
    },
    {
      id: '2',
      order_id: 'ORD-123456',
      status: 'picked_up',
      distance_km: 2.1,
      estimated_minutes: 15,
      order: {
        total_amount: 320,
        delivery_address_text: '456 Oak St, Barangay 2, Quezon City',
        user: { first_name: 'Juan', last_name: 'Dela Cruz' }
      }
    }
  ];

  const riderData = {
    id: '1',
    vehicle_type: 'Motorcycle',
    plate_number: 'ABC-123',
    vehicle_brand: 'Honda',
    vehicle_model: 'Click 125',
    vehicle_image: null,
    verified: true,
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const toggleAcceptingDeliveries = () => {
    setAcceptingDeliveries(!acceptingDeliveries);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'picked_up': return '#3B82F6';
      case 'in_progress': return '#8B5CF6';
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Pickup';
      case 'picked_up': return 'Picked Up';
      case 'in_progress': return 'On the way';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />

      {/* --- Header (Matches Schedule/Messages Style) --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hello, {fullName}</Text>
          <Text style={styles.headerSubtitle}>
            {acceptingDeliveries ? 'Ready for deliveries' : 'Currently offline'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => console.log('Notifications')}>
            <Feather name="bell" size={22} color={COLORS.secondary} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>

          {/* FIXED ROUTE: Points to /rider/settings instead of /settings */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/rider/settings')}>
            <Feather name="settings" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Availability Toggle */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <Text style={styles.availabilityTitle}>Delivery Status</Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, acceptingDeliveries && styles.activeDot]} />
              <Text style={styles.statusText}>
                {acceptingDeliveries ? 'Available' : 'Offline'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.availabilitySubtitle}>
            {acceptingDeliveries 
              ? 'You are accepting delivery requests' 
              : 'You are not accepting deliveries'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.toggleButton, acceptingDeliveries && styles.toggleButtonActive]}
            onPress={toggleAcceptingDeliveries}
          >
            <Text style={[styles.toggleButtonText, acceptingDeliveries && styles.toggleButtonTextActive]}>
              {acceptingDeliveries ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                <MaterialIcons name="delivery-dining" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats.total_deliveries}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            
            <View style={styles.statCard}>
               <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
                <MaterialIcons name="check-circle" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{stats.completed_deliveries}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FFF7ED' }]}>
                 <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>₱</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.todays_earnings).replace('₱','')}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            
            <View style={styles.statCard}>
               <View style={[styles.statIconBg, { backgroundColor: '#F3F4F6' }]}>
                <MaterialIcons name="attach-money" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.total_earnings).replace('₱','')}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Active Deliveries List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Deliveries</Text>
            <TouchableOpacity onPress={() => router.push('/rider/orders')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {activeDeliveries.map((item) => (
            <View key={item.id} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>{item.order_id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryDetails}>
                <View style={styles.detailRow}>
                  <Feather name="user" size={14} color={COLORS.muted} />
                  <Text style={styles.detailText}>
                    {item.order.user.first_name} {item.order.user.last_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={14} color={COLORS.muted} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.order.delivery_address_text}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                   <Feather name="navigation" size={14} color={COLORS.muted} />
                   <Text style={styles.detailText}>{item.distance_km} km • {item.estimated_minutes} mins</Text>
                </View>
              </View>

              <View style={styles.deliveryFooter}>
                <Text style={styles.deliveryAmount}>{formatCurrency(item.order.total_amount)}</Text>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Vehicle Information</Text>
          
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              {riderData.vehicle_image ? (
                <Image source={{ uri: riderData.vehicle_image }} style={styles.vehicleImage} />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <MaterialIcons name="two-wheeler" size={28} color={COLORS.primary} />
                </View>
              )}
              
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleModel}>
                  {riderData.vehicle_brand} {riderData.vehicle_model}
                </Text>
                <Text style={styles.vehicleType}>{riderData.vehicle_type}</Text>
                <Text style={styles.plateNumber}>{riderData.plate_number}</Text>
              </View>
            </View>
            
            <View style={styles.verificationBadge}>
              <MaterialIcons 
                name={riderData.verified ? "verified" : "warning"} 
                size={16} 
                color={riderData.verified ? COLORS.success : COLORS.warning} 
              />
              <Text style={[styles.verificationText, { color: riderData.verified ? COLORS.success : COLORS.warning }]}>
                {riderData.verified ? 'Verified Rider' : 'Pending Verification'}
              </Text>
            </View>
          </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for bottom tab
  },

  // --- Header Styles ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // --- Availability Card ---
  availabilityCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.muted,
  },
  activeDot: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  toggleButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },

  // --- Stats Grid ---
  statsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },

  // --- Sections ---
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // --- Delivery Card ---
  deliveryCard: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deliveryDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.muted,
    flex: 1,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Vehicle Card ---
  vehicleCard: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  vehicleImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 2,
  },
  plateNumber: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden'
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
});