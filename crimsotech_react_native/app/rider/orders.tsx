import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

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
    //   onPress={() => router.push(`/rider/order-details/${order.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <MaterialIcons name="receipt" size={16} color="#6B7280" />
          <Text style={styles.orderId}>Order #{order.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, isToDeliver ? styles.deliverBadge : styles.pendingBadge]}>
          <Text style={styles.statusText}>
            {isToDeliver ? 'To Deliver' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{order.customerName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#6B7280" />
          <Text style={styles.detailText} numberOfLines={1}>{order.address}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Deliver by: {formatTime(order.scheduledTime)}
          </Text>
        </View>
        
        {isToDeliver && order.pickupTime && (
          <View style={styles.detailRow}>
            <MaterialIcons name="inventory" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Picked up: {formatTime(order.pickupTime)}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <MaterialIcons name="directions-bike" size={16} color="#6B7280" />
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
      {/* Updated Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Orders</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton} 
            // onPress={() => router.push('/rider/notifications')}
          >
            <MaterialIcons name="notifications" size={22} color="#374151" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/rider/settings')}
          >
            <MaterialIcons name="settings" size={22} color="#374151" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EE4D2D']} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={64} color="#D1D5DB" />
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
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFF5F2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#EE4D2D',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#EE4D2D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
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
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: '#FFF5F2',
  },
  deliverBadge: {
    backgroundColor: '#F0F9FF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EE4D2D',
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
    color: '#6B7280',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  orderItems: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
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
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});