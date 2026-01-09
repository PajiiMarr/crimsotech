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
    TouchableOpacity,
    View,
    Linking
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getRiderDeliveries, updateDeliveryStatus } from '../../utils/cartApi';

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
  estimated_delivery_time?: string;
  distance_to_destination?: string;
}

const RiderDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'picked_up' | 'delivered'>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, [user?.user_id]);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, statusFilter]);

  const fetchDeliveries = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      const response = await getRiderDeliveries(user.user_id);

      if (response.success) {
        setDeliveries(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load deliveries');
        setDeliveries([]);
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
    await fetchDeliveries();
    setRefreshing(false);
  };

  const filterDeliveries = () => {
    if (statusFilter === 'all') {
      setFilteredDeliveries(deliveries);
    } else {
      setFilteredDeliveries(deliveries.filter(d => d.status === statusFilter));
    }
  };

  const handleStatusUpdate = async (delivery: DeliveryItem, newStatus: 'picked_up' | 'delivered') => {
    try {
      setUpdatingStatus(true);
      const response = await updateDeliveryStatus(delivery.delivery_id, newStatus);

      if (response.success) {
        Alert.alert('Success', `Delivery marked as ${newStatus === 'picked_up' ? 'picked up' : 'delivered'}`);
        setUpdateModalVisible(false);
        setSelectedDelivery(null);
        await fetchDeliveries();
      } else {
        Alert.alert('Error', response.error || 'Failed to update delivery status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update delivery status');
      console.error('Update status error:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  const openMaps = (address: string) => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };

  const callCustomer = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(err => console.error('An error occurred', err));
  };

  const renderDeliveryItem = ({ item }: { item: DeliveryItem }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => {
        setSelectedDelivery(item);
        setUpdateModalVisible(true);
      }}
    >
      <View style={styles.deliveryHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.order_id.slice(0, 8)}</Text>
          <Text style={styles.customerName}>{item.customer.name}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status_display}</Text>
        </View>
      </View>

      <View style={styles.deliveryDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Address</Text>
          <TouchableOpacity onPress={() => openMaps(item.delivery_address)}>
            <Text style={styles.mapLink}>View Map</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailValue}>{item.delivery_address}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📞 Contact</Text>
          <TouchableOpacity onPress={() => callCustomer(item.customer.phone)}>
            <Text style={styles.callLink}>Call Customer</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailValue}>{item.customer.phone}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💰 Amount</Text>
          <Text style={styles.detailValue}>₱{item.total_amount.toFixed(2)}</Text>
        </View>
        
        <Text style={styles.detailLabel}>📦 Items ({item.items.length})</Text>
        {item.items.map((itemData, idx) => (
          <Text key={idx} style={styles.itemText}>
            • {itemData.product_name} x{itemData.quantity}
          </Text>
        ))}

        {item.picked_at && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>✓ Picked Up</Text>
              <Text style={styles.detailValue}>{formatDate(item.picked_at)}</Text>
            </View>
          </>
        )}

        {item.delivered_at && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>✓ Delivered</Text>
              <Text style={styles.detailValue}>{formatDate(item.delivered_at)}</Text>
            </View>
          </>
        )}

        {item.distance_to_destination && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📏 Distance</Text>
            <Text style={styles.detailValue}>{item.distance_to_destination}</Text>
          </View>
        )}

        {item.estimated_delivery_time && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏱️ Est. Time</Text>
            <Text style={styles.detailValue}>{item.estimated_delivery_time}</Text>
          </View>
        )}
      </View>

      {item.status !== 'delivered' && (
        <View style={styles.actionButtons}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.pickupBtn]}
              onPress={() => handleStatusUpdate(item, 'picked_up')}
            >
              <Text style={styles.actionBtnText}>Mark as Picked Up</Text>
            </TouchableOpacity>
          )}
          {item.status === 'picked_up' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deliverBtn]}
              onPress={() => handleStatusUpdate(item, 'delivered')}
            >
              <Text style={styles.actionBtnText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}
        </View>
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
      {/* Filter Tabs */}
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

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {statusFilter === 'all'
                ? 'No deliveries yet'
                : `No ${statusFilter} deliveries`}
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
          data={filteredDeliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item.delivery_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Update Modal */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setUpdateModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>

            {selectedDelivery && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>Delivery Details</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Order ID:</Text>
                    <Text style={styles.value}>#{selectedDelivery.order_id.slice(0, 8)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Customer:</Text>
                    <Text style={styles.value}>{selectedDelivery.customer.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Contact:</Text>
                    <TouchableOpacity onPress={() => callCustomer(selectedDelivery.customer.phone)}>
                      <Text style={[styles.value, styles.clickableValue]}>{selectedDelivery.customer.phone}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={styles.value}>₱{selectedDelivery.total_amount.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <View style={styles.addressContainer}>
                    <Text style={styles.address}>{selectedDelivery.delivery_address}</Text>
                    <TouchableOpacity 
                      style={styles.directionsBtn}
                      onPress={() => openMaps(selectedDelivery.delivery_address)}
                    >
                      <Text style={styles.directionsText}>Get Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Current Status</Text>
                  <View
                    style={[
                      styles.statusBadgeLarge,
                      { backgroundColor: getStatusColor(selectedDelivery.status) },
                    ]}
                  >
                    <Text style={styles.statusTextLarge}>
                      {selectedDelivery.status_display}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Items</Text>
                  {selectedDelivery.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                {selectedDelivery.status !== 'delivered' && (
                  <View style={styles.modalActions}>
                    {selectedDelivery.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.pickupBtn]}
                        onPress={() =>
                          handleStatusUpdate(selectedDelivery, 'picked_up')
                        }
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>
                            Mark as Picked Up
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {selectedDelivery.status === 'picked_up' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deliverBtn]}
                        onPress={() =>
                          handleStatusUpdate(selectedDelivery, 'delivered')
                        }
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>
                            Mark as Delivered
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
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
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
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
  deliveryCard: {
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
  deliveryHeader: {
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
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryDetails: {
    marginVertical: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  itemText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupBtn: {
    backgroundColor: '#3b82f6',
  },
  deliverBtn: {
    backgroundColor: '#10b981',
  },
  actionBtnText: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  clickableValue: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  statusBadgeLarge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusTextLarge: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalActions: {
    gap: 12,
    marginTop: 24,
  },
  addressContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  address: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  directionsBtn: {
    backgroundColor: '#3b82f6',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  directionsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6b7280',
    minWidth: 30,
  },
  itemName: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  mapLink: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  callLink: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RiderDeliveries;