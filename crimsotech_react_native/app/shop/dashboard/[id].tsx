// app/shop/dashboard/[id].tsx
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { getSellerProducts, getUserShops } from '@/utils/api';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

export default function ShopDashboardScreen() {
  const { user } = useAuth();
  const { state, dispatch } = useShop();
  const params = useLocalSearchParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mapApiProductToState = (apiProduct: any) => {
    const media = apiProduct.media_files || [];
    
    // Map media files to full URLs
    const imageUrls = media.map((m: any) => {
      const path = m.url || m.file_data || m.file || '';
      if (!path) return '';
      
      // If path is already a full URL, use it as-is
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      
      // Otherwise, prepend the base URL
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${API_CONFIG.BASE_URL}${cleanPath}`;
    }).filter(Boolean);
    
    return {
      id: apiProduct.id,
      name: apiProduct.name,
      description: apiProduct.description,
      price: Number(apiProduct.price) || 0,
      quantity: apiProduct.quantity ?? 0,
      condition: apiProduct.condition || 'Unknown',
      category: apiProduct.category?.name || '',
      productType: apiProduct.category_admin?.name || 'General',
      brand: apiProduct.brand || '',
      model: apiProduct.model || '',
      color: apiProduct.color || '',
      ram: apiProduct.ram || '',
      rom: apiProduct.rom || '',
      specifications: apiProduct.specifications || '',
      packageContents: apiProduct.packageContents || '',
      knownIssues: apiProduct.knownIssues || '',
      targetBuyer: apiProduct.targetBuyer || 'daily users',
      images: imageUrls,
      shopId: apiProduct.shop?.id || '',
      createdAt: apiProduct.created_at || '',
      updatedAt: apiProduct.updated_at || '',
      status: (apiProduct.status || 'active').toLowerCase(),
    };
  };

  useEffect(() => {
    if (shopId) {
      loadDashboardData();
    }
  }, [shopId, user]); // removed state.products to avoid reload loop

  // Get products for this specific shop
  const shopProducts = state.products.filter(product => product.shopId === shopId);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get shop details
      const userId = user?.user_id || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const response = await getUserShops(userId);

      if (response.success && response.shops) {
        const foundShop = response.shops.find((s: any) => s.id === shopId);
        if (foundShop) {
          setShop(foundShop);
        } else {
          Alert.alert('Error', 'Shop not found');
        }

        // Fetch and store this seller's products
        try {
          const productsResponse = await getSellerProducts(userId);
          const productsData = productsResponse.products || productsResponse || [];
          const mapped = Array.isArray(productsData)
            ? productsData.map(mapApiProductToState)
            : [];
          dispatch({ type: 'SET_PRODUCTS', payload: mapped });
        } catch (productErr) {
          console.error('Failed to load seller products:', productErr);
        }
      } else {
        Alert.alert('Error', 'Failed to load shop details');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleAddProduct = () => {
    // Navigate to add product form
    router.push(`/shop/dashboard/${shopId}/add-product`);
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/shop/dashboard/${shopId}/edit-product/${productId}`);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const userId = user?.user_id || user?.id;
              const deleteUrl = `${API_CONFIG.BASE_URL}/api/seller-products/${productId}/`;
              
              console.log('=== DELETE PRODUCT DEBUG ===');
              console.log('Product ID:', productId);
              console.log('Product Name:', productName);
              console.log('User ID:', userId);
              console.log('Delete URL:', deleteUrl);
              
              const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer_id: userId
                })
              });

              console.log('Response status:', response.status);

              if (response.ok) {
                const result = await response.json();
                console.log('Delete successful:', result);
                
                // Remove from local state
                dispatch({ type: 'DELETE_PRODUCT', payload: productId });
                
                Alert.alert('Success', result.message || 'Product deleted successfully');
                
                // Reload products from server to confirm deletion
                await loadDashboardData();
              } else {
                const errorText = await response.text();
                console.error('Delete failed:', errorText);
                
                let errorData;
                try {
                  errorData = JSON.parse(errorText);
                } catch {
                  errorData = { error: errorText };
                }
                
                Alert.alert('Error', errorData.error || 'Failed to delete product');
              }
            } catch (error: any) {
              console.error('Delete product exception:', error);
              console.error('Error stack:', error.stack);
              Alert.alert('Error', error.message || 'Failed to delete product. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleGoToShopProfile = () => {
    router.push(`/shop/${shopId}`);
  };

  const handleBackToCustomerMode = () => {
    // In a real app, this would toggle a context/state to switch back to customer mode
    Alert.alert(
      'Switch Back to Customer Mode',
      'You will return to customer mode where you can browse as a regular user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch Back',
          onPress: () => {
            // Navigate back to customer view
            router.back();
          }
        }
      ]
    );
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.productImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <MaterialIcons name="inventory" size={24} color="#B0BEC5" />
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        {/* Show brand/model for electronics, specifications for others */}
        {['electronics', 'batteries', 'chargers', 'accessories', 'parts'].includes(item.productType) ? (
          <Text style={styles.productBrandModel} numberOfLines={1}>{item.brand} {item.model}</Text>
        ) : (
          <Text style={styles.productBrandModel} numberOfLines={1}>{item.specifications}</Text>
        )}
        <Text style={styles.productPrice}>₱{item.price}</Text>
        <Text style={styles.productStock}>Stock: {item.quantity} • {item.condition}</Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditProduct(item.id)}>
          <MaterialIcons name="edit" size={16} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteProduct(item.id, item.name)}
        >
          <MaterialIcons name="delete" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6d0bff" />
        <Text style={styles.loadingText}>Loading shop dashboard...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToCustomerMode}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop Dashboard</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleGoToShopProfile}
          >
            <MaterialIcons name="store" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <MaterialIcons name="store" size={64} color="#E0E0E0" />
          <Text style={styles.emptyStateTitle}>Shop Not Found</Text>
          <Text style={styles.emptyStateSubtitle}>The requested shop could not be found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToCustomerMode}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Dashboard</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleGoToShopProfile}
        >
          <MaterialIcons name="store" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Shop Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{shopProducts.length}</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>₱0.00</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
        </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsCard}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push(`/shop/dashboard/vouchers?shopId=${shopId}`)}
            >
              <MaterialIcons name="local-offer" size={24} color="#ff6d0b" />
              <Text style={styles.quickActionText}>Vouchers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="receipt-long" size={24} color="#ff6d0b" />
              <Text style={styles.quickActionText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <MaterialIcons name="bar-chart" size={24} color="#ff6d0b" />
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
          </View>

        {/* Shop Info Card */}
        <View style={styles.shopInfoCard}>
          <View style={styles.shopHeader}>
            <View style={styles.shopIconContainer}>
              {shop.shop_picture ? (
                <Image source={{ uri: shop.shop_picture }} style={styles.shopImage} resizeMode="cover" />
              ) : (
                <View style={styles.shopImagePlaceholder}>
                  <MaterialIcons name="store" size={32} color="#B0BEC5" />
                </View>
              )}
            </View>
            <View style={styles.shopDetails}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <Text style={styles.shopLocation} numberOfLines={1}>
                {shop.barangay}, {shop.city}, {shop.province}
              </Text>
              <Text style={styles.shopStatus}>
                {shop.verified ? 'Verified' : 'Not Verified'} • {shop.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Products</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
              <MaterialIcons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {shopProducts.length > 0 ? (
            <FlatList
              data={shopProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <MaterialIcons name="inventory" size={48} color="#E0E0E0" />
              <Text style={styles.emptyProductsTitle}>No Products Yet</Text>
              <Text style={styles.emptyProductsSubtitle}>Add your first product to start selling</Text>
              <TouchableOpacity style={styles.emptyProductsButton} onPress={handleAddProduct}>
                <Text style={styles.emptyProductsButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('Coming Soon', 'Analytics dashboard is being developed!')}>
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="analytics" size={24} color="#FF9800" />
              </View>
              <Text style={styles.quickActionLabel}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push(`/shop/orders?shopId=${shopId}`)}>
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="shopping-bag" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionLabel}>Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('Coming Soon', 'Reviews management is being developed!')}>
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="star" size={24} color="#FFC107" />
              </View>
              <Text style={styles.quickActionLabel}>Reviews</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('Coming Soon', 'Promotions management is being developed!')}>
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="campaign" size={24} color="#2196F3" />
              </View>
              <Text style={styles.quickActionLabel}>Promotions</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  profileButton: {
    padding: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: isSmallDevice ? 18 : 22,
    fontWeight: '700',
    color: '#212529',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
    quickActionsCard: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      marginHorizontal: 20,
      marginBottom: 16,
      paddingVertical: 20,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 12,
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
    quickActionButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
    },
    quickActionText: {
      marginTop: 8,
      fontSize: 13,
      color: '#333',
      fontWeight: '500',
    },
  shopInfoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  shopHeader: {
    flexDirection: 'row',
  },
  shopIconContainer: {
    marginRight: 12,
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  shopImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 4,
  },
  shopStatus: {
    fontSize: 12,
    color: '#6C757D',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#ff6d0bff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  productBrandModel: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#6C757D',
  },
  productActions: {
    paddingLeft: 12,
  },
  editButton: {
    padding: 6,
    marginRight: 8,
  },
  deleteButton: {
    padding: 6,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '500',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginVertical: 8,
  },
  emptyProductsSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyProductsButton: {
    backgroundColor: '#ff6d0bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyProductsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
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