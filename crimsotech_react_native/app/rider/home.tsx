// app/rider/home.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import RiderHeader from './includes/riderHeader';

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
        user: {
          first_name: 'Maria',
          last_name: 'Santos'
        }
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
        user: {
          first_name: 'Juan',
          last_name: 'Dela Cruz'
        }
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
    is_accepting_deliveries: true,
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
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

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'picked_up': return '#3B82F6';
      case 'in_progress': return '#8B5CF6';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'picked_up': return 'Picked Up';
      case 'in_progress': return 'In Progress';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <RiderHeader 
        title={`Hello, ${fullName}`}
        subtitle={acceptingDeliveries ? 'Ready for deliveries' : 'Currently offline'}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EE4D2D']} />
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

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="delivery-dining" size={24} color="#059669" />
              <Text style={styles.statValue}>{stats.total_deliveries}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="check-circle" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{stats.completed_deliveries}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="today" size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>{formatCurrency(stats.todays_earnings)}</Text>
              <Text style={styles.statLabel}>Today's Earnings</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="attach-money" size={24} color="#EC4899" />
              <Text style={styles.statValue}>{formatCurrency(stats.total_earnings)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
          </View>
        </View>

      

  

        {/* Vehicle Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>
          
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              {riderData.vehicle_image ? (
                <Image source={{ uri: riderData.vehicle_image }} style={styles.vehicleImage} />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <MaterialIcons name="directions-bike" size={28} color="#EE4D2D" />
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
                color={riderData.verified ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.verificationText}>
                {riderData.verified ? 'Verified Rider' : 'Pending Verification'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#9CA3AF',
  },
  activeDot: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  toggleButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#EE4D2D',
  },
  toggleButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 12,
    color: '#EE4D2D',
    fontWeight: '500',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#6B7280',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  actionButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  vehicleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  plateNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
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
    color: '#6B7280',
    fontWeight: '500',
  },
});