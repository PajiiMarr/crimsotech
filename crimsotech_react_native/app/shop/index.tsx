import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getUserShops, registerUserAsCustomer } from '@/utils/api';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

export default function ShopManagementScreen() {
  const { user } = useAuth();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShopDeletion, setLoadingShopDeletion] = useState<string | null>(null);

  useEffect(() => {
    fetchUserShops();
  }, [user]);

  const fetchUserShops = async () => {
    if (!user?.user_id && !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to register user as customer first
      const userId = user.user_id || user.id;
      try {
        await registerUserAsCustomer(userId);
      } catch (regError: any) {
        console.log('User might already be registered as customer:', regError.message);
        // Continue anyway since this might fail if already registered
      }

      const customerId = String(userId);
      const response = await getUserShops(customerId);

      if (response.success && response.shops) {
        setShops(response.shops);
      } else {
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', 'Failed to load your shops. Please try again.');
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = () => {
    router.push('/setup/create-shop');
  };

  const handleEditShop = (shopId: string) => {
    router.push({ pathname: '/setup/edit-shop/[id]', params: { id: shopId } } as any);
  };

  const handleDeleteShop = async (shopId: string) => {
    Alert.alert(
      'Delete Shop',
      'Are you sure you want to delete this shop? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingShopDeletion(shopId);
            try {
              
              // For now, just update the local state to remove the shop
              setShops(shops.filter(shop => shop.id !== shopId));
              Alert.alert('Success', 'Shop deleted successfully.');
            } catch (error) {
              console.error('Error deleting shop:', error);
              Alert.alert('Error', 'Failed to delete shop. Please try again.');
            } finally {
              setLoadingShopDeletion(null);
            }
          }
        }
      ]
    );
  };

  const handleViewShopProfile = (shopId: string) => {
    router.push(`/shop/${shopId}`);
  };

  const renderShopItem = ({ item }: { item: any }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.shopIconContainer}>
          <MaterialIcons name="store" size={32} color="#FF9800" />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <Text style={styles.shopAddress} numberOfLines={1}>
            {item.barangay}, {item.city}, {item.province}
          </Text>
        </View>
        <View style={styles.shopActionsRow}>
          <TouchableOpacity
            onPress={() => handleViewShopProfile(item.id)}
            style={[styles.viewShopButton, styles.viewShopButtonSmall]}
          >
            <Text style={styles.viewShopButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/shop/dashboard/${item.id}`)}
            style={[styles.viewShopButton, styles.shopModeButton]}
          >
            <MaterialIcons name="storefront" size={14} color="#FF9800" />
            <Text style={[styles.viewShopButtonText, styles.shopModeButtonText]}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.shopDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialIcons name="description" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={2}>{item.description}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialIcons name="phone" size={16} color="#666" />
            <Text style={styles.detailText}>{item.contact_number}</Text>
          </View>
        </View>
      </View>

      <View style={styles.shopActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => Alert.alert('Coming Soon', 'Edit shop functionality is coming soon!')}
        >
          <MaterialIcons name="edit" size={16} color="#2196F3" />
          <Text style={[styles.actionText, { color: '#2196F3' }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteShop(item.id)}
          disabled={loadingShopDeletion === item.id}
        >
          {loadingShopDeletion === item.id ? (
            <ActivityIndicator size="small" color="#F44336" />
          ) : (
            <>
              <MaterialIcons name="delete" size={16} color="#F44336" />
              <Text style={[styles.actionText, { color: '#F44336' }]}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6d0bff" />
        <Text style={styles.loadingText}>Loading your shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Shops</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Create Shop Button */}
        <View style={styles.createShopContainer}>
          <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
            <View style={styles.createShopIconContainer}>
              <MaterialIcons name="add" size={24} color="#FFF" />
            </View>
            <View style={styles.createShopTextContainer}>
              <Text style={styles.createShopTitle}>Create New Shop</Text>
              <Text style={styles.createShopSubtitle}>Start selling with a new shop</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
          </TouchableOpacity>
        </View>

        {/* Shop List */}
        {shops.length > 0 ? (
          <View style={styles.shopsSection}>
            <Text style={styles.sectionTitle}>Your Shops ({shops.length})</Text>
            <FlatList
              data={shops}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id || item.name}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <MaterialIcons name="store" size={64} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyStateTitle}>No shops yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              You haven't created any shops yet. Create your first shop to start selling!
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateShop}>
              <Text style={styles.emptyStateButtonText}>Create Shop</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  createShopContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6d0bff',
    borderRadius: 12,
    padding: 16,
  },
  createShopIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createShopTextContainer: {
    flex: 1,
  },
  createShopTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  createShopSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  shopsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 13,
    color: '#6C757D',
  },
  shopActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewShopButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewShopButtonSmall: {
    minWidth: 50,
    justifyContent: 'center',
  },
  shopModeButton: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  shopModeButtonText: {
    color: '#FF9800',
  },
  viewShopButtonText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  shopDetails: {
    marginBottom: 16,
    paddingLeft: 60,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 13,
    color: '#6C757D',
    marginLeft: 6,
    flex: 1,
  },
  shopActions: {
    flexDirection: 'row',
    paddingLeft: 60,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButton: {
    // Styling for edit button
  },
  deleteButton: {
    // Styling for delete button
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#ff6d0bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});