// shipping-address.tsx
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name: string;
  floor_number: string;
  unit_number: string;
  landmark: string;
  instructions: string;
  address_type: string;
  is_default: boolean;
  full_address: string;
  created_at: string;
}

export default function ShippingAddressPage() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<ShippingAddress | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchShippingAddresses();
    }
  }, [user?.id]);

  const fetchShippingAddresses = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get(
        '/shipping-address/get_shipping_addresses/',
        {
          params: {
            user_id: user.id
          }
        }
      );
      
      if (response.data.success) {
        setAddresses(response.data.shipping_addresses || []);
        setDefaultAddress(response.data.default_shipping_address || null);
      }
    } catch (error: any) {
      console.error('Error fetching shipping addresses:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to load shipping addresses'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchShippingAddresses();
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) return;

    try {
      const response = await AxiosInstance.post(
        '/shipping-address/set_default_address/',
        {
          address_id: addressId,
          user_id: user.id
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Default address updated successfully');
        fetchShippingAddresses(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error setting default address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to set default address'
      );
    }
  };

  const handleDeleteAddress = async (addressId: string, addressName: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${addressName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(
                '/shipping-address/delete_shipping_address/',
                {
                  data: {
                    address_id: addressId,
                    user_id: user.id
                  }
                }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'Address deleted successfully');
                fetchShippingAddresses(); // Refresh the list
              }
            } catch (error: any) {
              console.error('Error deleting address:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete address'
              );
            }
          }
        }
      ]
    );
  };

  const handleEditAddress = (address: ShippingAddress) => {
    // Navigate to the existing add-address page and open it in "edit" mode
    router.push({
      pathname: '/customer/create/add-address',
      params: { mode: 'edit', address: JSON.stringify(address) }
    });
  };

  const handleAddAddress = () => {
    router.push('/customer/create/add-address');
  };

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Ionicons name="home-outline" size={20} color="#666" />;
      case 'work':
        return <Ionicons name="business-outline" size={20} color="#666" />;
      case 'other':
        return <Ionicons name="location-outline" size={20} color="#666" />;
      default:
        return <Ionicons name="location-outline" size={20} color="#666" />;
    }
  };

  const getAddressTypeText = (type: string) => {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Addresses</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        {/* Add New Address Button (top) */}
        <TouchableOpacity 
          style={[styles.addButton, { marginTop: 10 }]}
          onPress={handleAddAddress}
        >
          <Ionicons name="add-circle-outline" size={24} color="#F97316" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No addresses found</Text>
            <Text style={styles.emptySubtext}>
              Add your first shipping address to get started
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleAddAddress}
            >
              <Text style={styles.emptyButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <TouchableOpacity key={address.id} style={styles.addressCard} onPress={() => handleEditAddress(address)} activeOpacity={0.85}>
              <View style={styles.addressHeader}>
                <View style={styles.addressTypeBadge}>
                  {getAddressTypeIcon(address.address_type)}
                  <Text style={styles.addressTypeText}>
                    {getAddressTypeText(address.address_type)}
                  </Text>
                </View>
                {address.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>

              <View style={styles.addressInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.recipientName}>{address.recipient_name}</Text>
                  <Text style={styles.phoneNumber}>{address.recipient_phone}</Text>
                </View>
                
                <View style={styles.addressDetails}>
                  <Text style={styles.addressText}>{address.full_address}</Text>
                  
                  {address.landmark && (
                    <Text style={styles.landmarkText}>
                      <Text style={styles.landmarkLabel}>Landmark: </Text>
                      {address.landmark}
                    </Text>
                  )}
                  
                  {address.instructions && (
                    <Text style={styles.instructionsText}>
                      <Text style={styles.instructionsLabel}>Instructions: </Text>
                      {address.instructions}
                    </Text>
                  )}
                </View>
              </View>

              {/* Action Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.defaultToggle} 
                  onPress={() => handleSetDefault(address.id)}
                >
                  <MaterialCommunityIcons 
                    name={address.is_default ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                    size={22} 
                    color={address.is_default ? "#F97316" : "#CCC"} 
                  />
                  <Text style={styles.defaultText}>Set As Default Address</Text>
                </TouchableOpacity>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAddress(address.id, address.recipient_name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}



        {/* Info Text */}
        {addresses.length > 0 && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Tap on an address to edit it
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#6B7280' },
  content: { flex: 1 },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Header Styles
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black', flex: 1 },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addButtonText: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '600',
    marginLeft: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Address Card Styles
  addressCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  addressTypeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  defaultBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  addressInfo: {
    paddingBottom: 16,
  },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  recipientName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'black',
    flex: 1,
  },
  phoneNumber: { 
    fontSize: 14, 
    color: '#666',
    marginLeft: 8,
  },
  addressDetails: {
    marginTop: 4,
  },
  addressText: { 
    fontSize: 14, 
    color: '#333', 
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  landmarkLabel: {
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  instructionsLabel: {
    fontWeight: '600',
  },

  // Action Row Styles
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  defaultToggle: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  defaultText: { 
    fontSize: 13, 
    color: '#666', 
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: { 
    padding: 8,
    marginRight: 8,
  },
  deleteButton: { 
    padding: 8,
  },

  // Info Container
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
});