// app/shop/[id].tsx
import { useAuth } from '@/contexts/AuthContext';
import { getShopById, getShopProducts } from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

export default function ShopProfileScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    if (shopId) {
      loadShopDetails();
      loadShopProducts(true);
    }
  }, [shopId, user]);

  const loadShopDetails = async () => {
    try {
      setLoading(true);
      const response = await getShopById(shopId);
      if (response.success && response.shops && response.shops.length > 0) {
        setShop(response.shops[0]);
      } else {
        Alert.alert('Error', 'Shop not found');
      }
    } catch (error) {
      console.error('Error loading shop details:', error);
      Alert.alert('Error', 'Failed to load shop details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadShopProducts = async (initial = false) => {
    try {
      if (initial) {
        setLoadingProducts(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }
      const currentPage = initial ? 1 : page + 1;
      const response = await getShopProducts(shopId, currentPage, pageSize);
      const items = Array.isArray(response)
        ? response
        : response.products || response.results || [];

      if (initial) {
        setProducts(items || []);
      } else {
        setProducts(prev => [...prev, ...(items || [])]);
      }
      setPage(currentPage);
      const next = typeof response?.has_next === 'boolean' ? response.has_next : (items?.length === pageSize);
      setHasNext(next);
    } catch (error) {
      console.error('Error loading shop products:', error);
    } finally {
      setLoadingProducts(false);
      setLoadingMore(false);
    }
  };


  const handleEditShop = () => {
    // use pathname + params to satisfy typed router.push signatures
    router.push({ pathname: '/setup/edit-shop/[id]', params: { id: shopId } } as any);
  };

  const handleViewProducts = () => {
    // Navigate to dedicated shop products view (not shop management mode)
    router.push({ pathname: '/shop/[id]/products', params: { id: shopId } } as any);
  };

  const handleDeleteShop = () => {
    Alert.alert(
      'Delete Shop',
      'Are you sure you want to delete this shop? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement delete shop API call
              Alert.alert('Success', 'Shop deleted successfully.', [
                {
                  text: 'OK',
                  onPress: () => router.push('/shop'), // Go back to shop management
                }
              ]);
            } catch (error) {
              console.error('Error deleting shop:', error);
              Alert.alert('Error', 'Failed to delete shop. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6d0bff" />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop Profile</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <MaterialIcons name="store" size={64} color="#E0E0E0" />
          <Text style={styles.emptyStateTitle}>Shop Not Found</Text>
          <Text style={styles.emptyStateSubtitle}>The requested shop could not be found.</Text>
        </View>
      </View>
    );
  }

  const isOwner = shop && String(shop.customer) === String(user?.user_id || user?.id);

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
        <Text style={styles.headerTitle}>Shop Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          {shop.shop_picture ? (
            <Image 
              source={{ uri: shop.shop_picture }} 
              style={styles.shopImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.shopImagePlaceholder}>
              <MaterialIcons name="store" size={48} color="#B0BEC5" />
              <Text style={styles.shopImagePlaceholderText}>No Image</Text>
            </View>
          )}
          
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopStatus}>
            {shop.verified ? 'Verified' : 'Not Verified'} • {shop.status}
          </Text>
        </View>

        {/* Shop Info Cards */}
        <View style={styles.infoCardsContainer}>
          {/* Contact Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Contact Information</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.contact_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="mail" size={16} color="#666" />
              <Text style={styles.infoText}>{user?.email || 'No email'}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Location</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.infoText}>
                {shop.street}, {shop.barangay}, {shop.city}, {shop.province}
              </Text>
            </View>
          </View>

          {/* Shop Description */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>About Shop</Text>
            <Text style={styles.descriptionText}>{shop.description}</Text>
          </View>

          {/* Shop Stats */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Shop Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>₱{(shop.total_sales ? Number(shop.total_sales).toFixed(2) : '0.00')}</Text>
                <Text style={styles.statLabel}>Total Sales</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shop Products */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Products</Text>
          {loadingProducts ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#ff6d0b" />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <MaterialIcons name="inventory" size={48} color="#E0E0E0" />
              <Text style={styles.emptyProductsText}>No products from this shop yet.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {products.map((item: any) => {
                const imageUrl = item.primary_image?.url
                  || (item.media_files && item.media_files[0]?.file_data)
                  || undefined;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => router.push(`/pages/product-detail?productId=${item.id}`)}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.cardImagePlaceholder}>
                        <MaterialIcons name="image" size={28} color="#B0BEC5" />
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      <Text numberOfLines={2} style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardPrice}>₱{Number(item.price || 0).toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {!loadingProducts && products.length > 0 && (
            <View style={{ paddingTop: 8 }}>
              {hasNext ? (
                <TouchableOpacity style={styles.loadMoreButton} onPress={() => loadShopProducts(false)} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.endOfListText}>You've reached the end</Text>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewProducts}>
            <View style={styles.actionButtonIconContainer}>
              <MaterialIcons name="inventory" size={24} color="#FFF" />
            </View>
            <Text style={styles.actionButtonText}>View Shop Products</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleEditShop}>
              <View style={[styles.actionButtonIconContainer, styles.secondaryButtonIconContainer]}>
                <MaterialIcons name="edit" size={24} color="#2196F3" />
              </View>
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Edit Shop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Switch to Shop Mode Button (Owner only) */}
        {isOwner && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.shopModeButton]} onPress={() => {
              Alert.alert(
                'Switch to Shop Mode',
                'You will now manage this shop. Products, orders, and analytics will be shown from the shop owner perspective.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Switch',
                    onPress: () => {
                      router.push({ pathname: '/shop/dashboard/[id]', params: { id: shopId } } as any);
                    }
                  }
                ]
              );
            }}>
              <View style={[styles.actionButtonIconContainer, styles.shopModeButtonIconContainer]}>
                <MaterialIcons name="storefront" size={24} color="#FF9800" />
              </View>
              <Text style={[styles.actionButtonText, styles.shopModeButtonText]}>Switch to Shop Mode</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Danger Zone (Owner only) */}
        {isOwner && (
          <View style={styles.dangerZone}>
            <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteShop}>
              <MaterialIcons name="delete" size={20} color="#F44336" />
              <Text style={styles.dangerButtonText}>Delete Shop</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 56,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  shopHeader: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  shopImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  shopImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  shopImagePlaceholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  shopName: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  shopStatus: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  infoCardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6C757D',
    marginLeft: 8,
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  card: {
    width: (width - 20*2 - 12*2) / 2, // container padding 20, card margin 6 each side
    backgroundColor: '#FFF',
    borderRadius: 10,
    margin: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#F8F9FA',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
  },
  cardPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6d0b',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyProductsText: {
    marginTop: 8,
    color: '#888',
  },
  loadMoreButton: {
    backgroundColor: '#ff6d0b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: 8,
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: '600',
  },
  endOfListText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 8,
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ff6d0bff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionButtonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonIconContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  shopModeButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  shopModeButtonIconContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  shopModeButtonText: {
    color: '#FF9800',
  },
  dangerZone: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dangerButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
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
  },
});