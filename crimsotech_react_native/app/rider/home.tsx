// app/rider/home.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getRiderDashboard, updateRiderAvailability } from '../../utils/riderApi';

// --- Theme Colors ---
const COLORS = {
  primary: '#EE4D2D',
  primaryLight: '#FDEEE9',
  secondary: '#111827',
  muted: '#6B7280',
  bg: '#F9FAFB',
  cardBg: '#FFFFFF',
  danger: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#E5E7EB',
};

export default function Home() {
  const { userId, user } = useAuth();
  const [acceptingDeliveries, setAcceptingDeliveries] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract data from dashboard response
  const fullName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.first_name || user?.username || "Rider";
  const stats = dashboardData?.metrics || {
    total_deliveries: 0,
    delivered: 0,
    pending: 0,
    total_earnings: 0,
    avg_rating: 0,
    active_deliveries: 0,
  };

  const activeDeliveries = dashboardData?.deliveries || [];
  const riderData = dashboardData?.rider || null;

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!userId) return;
    
    try {
      setError(null);
      const data = await getRiderDashboard(userId);
      setDashboardData(data);
      
      // Update accepting deliveries from rider status
      if (data.rider?.is_accepting_deliveries !== undefined) {
        setAcceptingDeliveries(data.rider.is_accepting_deliveries);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const toggleAcceptingDeliveries = async () => {
    if (!userId) return;
    
    try {
      const newStatus = !acceptingDeliveries;
      await updateRiderAvailability(userId, newStatus);
      setAcceptingDeliveries(newStatus);
      // Refresh dashboard to get updated data
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Error updating availability:', err);
      alert('Failed to update availability. Please try again.');
    }
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/rider/notification')}>
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
              <Text style={styles.statValue}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FFF7ED' }]}>
                 <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>₱</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.total_earnings).replace('₱','')}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            
            <View style={styles.statCard}>
               <View style={[styles.statIconBg, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="star" size={20} color="#9333EA" />
              </View>
              <Text style={styles.statValue}>{stats.avg_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
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
                <Text style={styles.deliveryId} numberOfLines={1} ellipsizeMode="tail">{item.order_id}</Text>
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
                    {item.order?.user?.first_name || ''} {item.order?.user?.last_name || 'Customer'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={14} color={COLORS.muted} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.order?.delivery_address_text || item.delivery_location || 'Delivery Location'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                   <Feather name="navigation" size={14} color={COLORS.muted} />
                   <Text style={styles.detailText}>{item.distance_km || 0} km • {item.estimated_minutes || 0} mins</Text>
                </View>
              </View>

              <View style={styles.deliveryFooter}>
                <Text style={styles.deliveryAmount}>{formatCurrency(item.order?.total_amount || item.delivery_fee || 0)}</Text>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Vehicle Info */}
        {riderData && (
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
        )}

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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.muted,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    paddingVertical: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  deliveryId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
    }),
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