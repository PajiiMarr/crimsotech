import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

// --- Theme Colors (Consistent with Home/Schedule) ---
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
  border: '#F3F4F6'
};

export default function OrdersPage() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'toDeliver'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // Hardcoded data for demonstration
  const pendingOrders = [
    {
      id: '1',
      orderId: 'ORD-789456',
      customerName: 'Maria Santos',
      address: '123 Main St, Barangay 1, Manila City',
      amount: 450,
      items: 2,
      scheduledTime: '2024-01-24T15:30:00Z',
      distance: 3.5,
    },
    {
      id: '2',
      orderId: 'ORD-789457',
      customerName: 'John Dela Cruz',
      address: '456 Oak Ave, Barangay 2, Quezon City',
      amount: 320,
      items: 1,
      scheduledTime: '2024-01-24T16:00:00Z',
      distance: 2.1,
    },
  ];

  const toDeliverOrders = [
    {
      id: '3',
      orderId: 'ORD-789458',
      customerName: 'Ana Reyes',
      address: '789 Pine St, Barangay 3, Makati City',
      amount: 580,
      items: 3,
      scheduledTime: '2024-01-24T14:30:00Z',
      distance: 1.8,
      pickupTime: '2024-01-24T14:00:00Z',
    },
    {
      id: '4',
      orderId: 'ORD-789459',
      customerName: 'Carlos Gomez',
      address: '321 Maple St, Barangay 4, Pasig City',
      amount: 420,
      items: 2,
      scheduledTime: '2024-01-24T17:00:00Z',
      distance: 4.2,
      pickupTime: '2024-01-24T16:30:00Z',
    },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const renderOrderCard = (order: any, isToDeliver: boolean = false) => (
    <TouchableOpacity 
      key={order.id}
      style={styles.orderCard}
      // onPress={() => router.push(`/rider/order-details/${order.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <MaterialIcons name="receipt" size={16} color={COLORS.muted} />
          <Text style={styles.orderId}>Order #{order.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, isToDeliver ? styles.deliverBadge : styles.pendingBadge]}>
          <Text style={[styles.statusText, isToDeliver ? { color: '#0369A1' } : { color: COLORS.primary }]}>
            {isToDeliver ? 'To Deliver' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{order.customerName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color={COLORS.muted} />
          <Text style={styles.detailText} numberOfLines={1}>{order.address}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>
            Deliver by: {formatTime(order.scheduledTime)}
          </Text>
        </View>
        
        {isToDeliver && order.pickupTime && (
          <View style={styles.detailRow}>
            <MaterialIcons name="inventory" size={16} color={COLORS.muted} />
            <Text style={styles.detailText}>
              Picked up: {formatTime(order.pickupTime)}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <MaterialIcons name="directions-bike" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{order.distance} km away</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderAmount}>{formatCurrency(order.amount)}</Text>
          <Text style={styles.orderItems}>{order.items} item{order.items > 1 ? 's' : ''}</Text>
        </View>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {isToDeliver ? 'Deliver Now' : 'Accept Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const currentOrders = activeTab === 'pending' ? pendingOrders : toDeliverOrders;
  const isEmpty = currentOrders.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />
      
      {/* --- Standardized Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Orders</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => console.log('Notifications')}
          >
            <Feather name="bell" size={22} color={COLORS.secondary} />
            <View style={styles.notificationBadge}>
              {/* <Text style={styles.badgeText}>2</Text> */}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/rider/settings')}
          >
            <Feather name="settings" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
          {activeTab === 'pending' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'toDeliver' && styles.activeTab]}
          onPress={() => setActiveTab('toDeliver')}
        >
          <Text style={[styles.tabText, activeTab === 'toDeliver' && styles.activeTabText]}>
            To Deliver
          </Text>
          {activeTab === 'toDeliver' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? 'No pending orders available'
                : 'No orders to deliver at the moment'}
            </Text>
          </View>
        ) : (
          currentOrders.map(order => renderOrderCard(order, activeTab === 'toDeliver'))
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.muted,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 10,
    backgroundColor: COLORS.border,
    borderRadius: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.danger,
    borderRadius: 4,
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: COLORS.primary,
  },
  
  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom tab
  },
  
  // Order Card
  orderCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  deliverBadge: {
    backgroundColor: '#E0F2FE', // Light blue
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
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
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  orderItems: {
    fontSize: 13,
    color: COLORS.muted,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});