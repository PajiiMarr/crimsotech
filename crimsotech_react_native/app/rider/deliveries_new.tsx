import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { acceptDelivery, getAvailableDeliveries, getRiderDeliveries, refuseDelivery, updateDeliveryStatus } from '../../utils/cartApi';

interface DeliveryItem {
  delivery_id: string;
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  delivery_address: string;
  status: 'pending' | 'picked_up' | 'delivered';
  status_display: string;
  total_amount: number;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order_created_at: string;
}

const RiderDeliveries = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'available'>('my');
  const [myDeliveries, setMyDeliveries] = useState<DeliveryItem[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<DeliveryItem[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'picked_up' | 'delivered'>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.user_id, activeTab]);

  useEffect(() => {
    filterDeliveries();
  }, [myDeliveries, availableDeliveries, statusFilter, activeTab]);

  const fetchData = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      if (activeTab === 'my') {
        const response = await getRiderDeliveries(user.user_id);
        if (response.success) {
          setMyDeliveries(response.data || []);
        } else {
          Alert.alert('Error', response.error || 'Failed to load deliveries');
          setMyDeliveries([]);
        }
      } else {
        const response = await getAvailableDeliveries();
        if (response.success) {
          setAvailableDeliveries(response.data || []);
        } else {
          Alert.alert('Error', response.error || 'Failed to load available deliveries');
          setAvailableDeliveries([]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch deliveries');
      console.error('Fetch deliveries error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filterDeliveries = () => {
    const currentList = activeTab === 'my' ? myDeliveries : availableDeliveries;
    if (statusFilter === 'all') {
      setFilteredDeliveries(currentList);
    } else {
      setFilteredDeliveries(currentList.filter(d => d.status === statusFilter));
    }
  };

  const handleStatusUpdate = async (delivery: DeliveryItem, newStatus: 'picked_up' | 'delivered') => {
    try {
      setUpdatingStatus(true);
      const response = await updateDeliveryStatus(delivery.delivery_id, newStatus);

      if (response.success) {
        Alert.alert('Success', `Delivery marked as ${newStatus.replace('_', ' ')}`);
        setUpdateModalVisible(false);
        await fetchData();
      } else {
        Alert.alert('Error', response.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update delivery status');
      console.error('Update status error:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRefuseDelivery = async (delivery: DeliveryItem) => {
    Alert.alert(
      'Refuse Delivery',
      'Are you sure you want to refuse this delivery? It will become available for other riders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refuse',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await refuseDelivery(delivery.delivery_id, user!.user_id);
              if (response.success) {
                Alert.alert('Success', 'Delivery refused successfully');
                await fetchData();
              } else {
                Alert.alert('Error', response.error || 'Failed to refuse delivery');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to refuse delivery');
              console.error('Refuse delivery error:', error);
            }
          }
        }
      ]
    );
  };

  const handleAcceptDelivery = async (delivery: DeliveryItem) => {
    Alert.alert(
      'Accept Delivery',
      'Do you want to accept this delivery task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const response = await acceptDelivery(delivery.delivery_id, user!.user_id);
              if (response.success) {
                Alert.alert('Success', 'Delivery accepted successfully!');
                // Switch to my deliveries tab and refresh
                setActiveTab('my');
                await fetchData();
              } else {
                Alert.alert('Error', response.error || 'Failed to accept delivery');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to accept delivery');
              console.error('Accept delivery error:', error);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'picked_up': return '#2196F3';
      case 'delivered': return '#4CAF50';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderDeliveryCard = ({ item }: { item: DeliveryItem }) => {
    const isMyDelivery = activeTab === 'my';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.order_id.slice(0, 8)}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status_display}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={16} color="#666" />
            <Text style={styles.infoText}>{item.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={16} color="#666" />
            <Text style={styles.infoText}>{item.customer.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={2}>{item.delivery_address}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="attach-money" size={16} color="#666" />
            <Text style={styles.infoText}>₱{item.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {isMyDelivery ? (
            <>
              {item.status === 'pending' && (
                <>
                  <TouchableOpacity 
                    style={[styles.button, styles.refuseButton]} 
                    onPress={() => handleRefuseDelivery(item)}
                  >
                    <MaterialIcons name="close" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Refuse</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, styles.pickupButton]} 
                    onPress={() => handleStatusUpdate(item, 'picked_up')}
                  >
                    <MaterialIcons name="local-shipping" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Pick Up</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.status === 'picked_up' && (
                <TouchableOpacity 
                  style={[styles.button, styles.deliverButton, { flex: 1 }]} 
                  onPress={() => handleStatusUpdate(item, 'delivered')}
                >
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
              {item.status === 'delivered' && (
                <View style={styles.completedBadge}>
                  <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton, { flex: 1 }]} 
              onPress={() => handleAcceptDelivery(item)}
            >
              <MaterialIcons name="add-circle" size={18} color="#fff" />
              <Text style={styles.buttonText}>Accept Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>Deliveries</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'my' && styles.activeTab]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
              My Deliveries
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              Available
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Filter */}
      {activeTab === 'my' && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'pending', 'picked_up', 'delivered'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.activeFilterChip]}
                onPress={() => setStatusFilter(status as any)}
              >
                <Text style={[styles.filterText, statusFilter === status && styles.activeFilterText]}>
                  {status === 'all' ? 'All' : status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Deliveries List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDeliveryCard}
          keyExtractor={(item) => item.delivery_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-shipping" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === 'my' ? 'No deliveries assigned yet' : 'No deliveries available'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'my' 
                  ? 'Check the Available tab to accept new deliveries' 
                  : 'New deliveries will appear here'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ff6d0b',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#ff6d0b',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  refuseButton: {
    backgroundColor: '#dc3545',
  },
  pickupButton: {
    backgroundColor: '#2196F3',
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButton: {
    backgroundColor: '#ff6d0b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RiderDeliveries;
