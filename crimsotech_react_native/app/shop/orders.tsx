import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import {
    assignRiderToDelivery,
    getAvailableRiders,
    getShopOrders,
} from '../../utils/cartApi';

interface OrderData {
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  delivery_address: string;
  total_amount: number;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  status: string;
  delivery: {
    delivery_id: string;
    rider_id: string | null;
    rider_name: string;
    status: string;
    picked_at: string | null;
    delivered_at: string | null;
  } | null;
  created_at: string;
}

interface RiderData {
  rider_id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_model: string;
  plate_number: string;
  verified: boolean;
}

const ShopOrders = () => {
  const { shop } = useShop();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const shopIdFromParams = params.shopId as string;
  const shopId = shop?.id || shopIdFromParams;
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderData[]>([]);
  const [riders, setRiders] = useState<RiderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'picked_up' | 'delivered'>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningRider, setAssigningRider] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (shopId) {
      fetchOrders();
      fetchRiders();
    }
  }, [shopId]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchText]);

  const fetchOrders = async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const response = await getShopOrders(shopId);

      if (response.success) {
        setOrders(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load orders');
        setOrders([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders');
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const response = await getAvailableRiders();

      if (response.success) {
        setRiders(response.data || []);
      } else {
        console.log('Failed to fetch riders:', response.error);
      }
    } catch (error) {
      console.error('Fetch riders error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchRiders()]);
    setRefreshing(false);
  };

  const filterOrders = () => {
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (o) => o.delivery && o.delivery.status === statusFilter
      );
    }

    // Apply search filter
    if (searchText.trim()) {
      filtered = filtered.filter(
        (o) =>
          o.order_id.toLowerCase().includes(searchText.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
          o.customer.phone.includes(searchText)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleAssignRider = async (order: OrderData, rider: RiderData) => {
    if (!order.delivery) {
      Alert.alert('Error', 'No delivery record found for this order');
      return;
    }

    try {
      setAssigningRider(true);
      const response = await assignRiderToDelivery(
        order.delivery.delivery_id,
        rider.rider_id
      );

      if (response.success) {
        Alert.alert(
          'Success',
          `Rider ${rider.name} has been assigned to this order`
        );
        setAssignModalVisible(false);
        setSelectedOrder(null);
        await fetchOrders();
      } else {
        Alert.alert('Error', response.error || 'Failed to assign rider');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assign rider');
      console.error('Assign rider error:', error);
    } finally {
      setAssigningRider(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'picked_up':
        return '#3b82f6';
      case 'delivered':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrderCard = ({ item }: { item: OrderData }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setAssignModalVisible(true);
      }}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.order_id.slice(0, 8)}</Text>
          <Text style={styles.customerName}>{item.customer.name}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.delivery?.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {item.delivery?.status === 'pending'
              ? 'Awaiting Assignment'
              : item.delivery?.status === 'picked_up'
              ? 'In Transit'
              : 'Delivered'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer Phone:</Text>
          <Text style={styles.detailValue}>{item.customer.phone}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery Address:</Text>
          <Text style={[styles.detailValue, { flex: 1, marginLeft: 8 }]}>
            {item.delivery_address}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>₱{item.total_amount.toFixed(2)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Items:</Text>
          <Text style={styles.detailValue}>{item.items.length}</Text>
        </View>

        {item.delivery?.rider_id && (
          <View style={styles.riderAssigned}>
            <Text style={styles.riderLabel}>✓ Rider Assigned</Text>
            <Text style={styles.riderName}>{item.delivery.rider_name}</Text>
          </View>
        )}
      </View>

      {!item.delivery?.rider_id && (
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => {
            setSelectedOrder(item);
            setAssignModalVisible(true);
          }}
        >
          <Text style={styles.assignBtnText}>Assign Rider</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.headerSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Order ID, Customer, or Phone"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.filterTabs}>
          {['all', 'pending', 'picked_up', 'delivered'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                statusFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter === 'all'
                  ? 'All'
                  : filter === 'picked_up'
                  ? 'In Transit'
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchText
                ? 'No orders match your search'
                : statusFilter === 'all'
                ? 'No orders yet'
                : `No ${statusFilter} orders`}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.order_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Assign Rider Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAssignModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>

            {selectedOrder && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>Assign Rider to Order</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Order ID:</Text>
                    <Text style={styles.infoValue}>{selectedOrder.order_id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer:</Text>
                    <Text style={styles.infoValue}>{selectedOrder.customer.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{selectedOrder.customer.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={[styles.infoValue, { flex: 1 }]}>{selectedOrder.customer.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Amount:</Text>
                    <Text style={styles.infoValue}>
                      ₱{selectedOrder.total_amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Delivery Address:</Text>
                    <Text style={[styles.infoValue, { flex: 1 }]}>
                      {selectedOrder.delivery_address}
                    </Text>
                  </View>
                </View>

                {selectedOrder.delivery?.rider_id ? (
                  <View style={styles.assignedRiderSection}>
                    <Text style={styles.sectionTitle}>Currently Assigned Rider</Text>
                    <View style={styles.assignedRiderCard}>
                      <Text style={styles.riderName}>
                        {selectedOrder.delivery.rider_name}
                      </Text>
                      <Text style={styles.riderStatus}>
                        Status: {selectedOrder.delivery.status}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Select a Rider</Text>
                    {riders.length === 0 ? (
                      <View style={styles.noRidersContainer}>
                        <Text style={styles.noRidersText}>
                          No riders available
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.ridersList}>
                        {riders.map((rider) => (
                          <TouchableOpacity
                            key={rider.rider_id}
                            style={styles.riderOption}
                            onPress={() =>
                              handleAssignRider(selectedOrder, rider)
                            }
                            disabled={assigningRider}
                          >
                            <View style={styles.riderInfo}>
                              <Text style={styles.riderOptionName}>
                                {rider.name}
                              </Text>
                              <Text style={styles.riderOptionDetails}>
                                {rider.vehicle_brand} {rider.vehicle_model}
                              </Text>
                              <Text style={styles.riderOptionDetails}>
                                {rider.plate_number}
                              </Text>
                            </View>
                            {assigningRider && (
                              <ActivityIndicator color="#3b82f6" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    color: '#111827',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 16,
  },
  refreshBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  customerName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  riderAssigned: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
  },
  riderLabel: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  riderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  assignBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 28,
    color: '#6b7280',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    marginTop: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  assignedRiderSection: {
    marginVertical: 24,
  },
  assignedRiderCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  riderStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  noRidersContainer: {
    backgroundColor: '#fef3c7',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  noRidersText: {
    fontSize: 14,
    color: '#92400e',
  },
  ridersList: {
    gap: 12,
  },
  riderOption: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riderInfo: {
    flex: 1,
  },
  riderOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  riderOptionDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default ShopOrders;
