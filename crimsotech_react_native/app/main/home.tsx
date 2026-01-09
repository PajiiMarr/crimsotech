import { useAuth } from '@/contexts/AuthContext';
import { getAllProducts } from '@/utils/api';
import { getOrders } from '@/utils/cartApi';
import { API_CONFIG } from '@/utils/config';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';


const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

// Mock data for used electronics categories
const categories = [
  { id: '1', name: 'Smartphones', icon: 'smartphone', iconType: 'material', color: '#4CAF50' },
  { id: '2', name: 'Laptops', icon: 'laptop', iconType: 'material', color: '#2196F3' },
  { id: '3', name: 'Tablets', icon: 'tablet-android', iconType: 'material', color: '#FF9800' },
  { id: '4', name: 'Gaming', icon: 'sports-esports', iconType: 'material', color: '#8B5CF6' },
  { id: '5', name: 'Audio', icon: 'headphones', iconType: 'material', color: '#9C27B0' },
  { id: '6', name: 'Cameras', icon: 'camera', iconType: 'material', color: '#795548' },
  { id: '7', name: 'Smart Watches', icon: 'watch', iconType: 'material', color: '#607D8B' },
  { id: '8', name: 'Accessories', icon: 'cable', iconType: 'material', color: '#00BCD4' },
];

export default function HomeScreen() {
  const { user, cartCount } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Filter products based on search text
  const filteredProducts = allProducts.filter((product) => {
    if (!searchText.trim()) return true;
    
    const searchLower = searchText.toLowerCase();
    const name = (product.name || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const condition = (product.condition || '').toLowerCase();
    
    return name.includes(searchLower) || 
           description.includes(searchLower) || 
           condition.includes(searchLower);
  });

  useEffect(() => {
    loadAllProducts();
  }, []);

  useEffect(() => {
    loadNotificationSummary();
  }, [user]);

  const loadAllProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await getAllProducts();
      console.log('Raw products API response:', response); // Debug log

      if (response && Array.isArray(response)) {
        // If response is directly an array of products
        console.log('Products response is array with', response.length, 'items');
        setAllProducts(response);
      } else if (response && response.results) {
        // If response is paginated with results property
        console.log('Products response is paginated with', response.results.length, 'results');
        setAllProducts(response.results);
      } else if (response && response.products) {
        // If response has a products property
        console.log('Products response has products property with', response.products.length, 'items');
        setAllProducts(response.products);
      } else {
        // Fallback to empty array
        console.log('Products response is unexpected format, setting empty array');
        setAllProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadNotificationSummary = async () => {
    if (!user) {
      setNotificationCount(0);
      return;
    }

    try {
      const userId = (user as any).user_id || (user as any).id;
      const resp = await getOrders(userId);

      if (resp.success && resp.orders) {
        const now = Date.now();
        const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

        const inProgress = resp.orders.filter((order: any) => order.status && order.status !== 'delivered' && order.status !== 'cancelled');
        const recentDelivered = resp.orders.filter((order: any) => {
          if (order.status !== 'delivered') return false;
          const timestamp = new Date(order.created_at || order.updated_at).getTime();
          return !Number.isNaN(timestamp) && timestamp >= threeDaysAgo;
        });

        const total = inProgress.length + recentDelivered.length;
        setNotificationCount(total);
      } else {
        setNotificationCount(0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotificationCount(0);
    }
  };

  const renderCategoryIcon = (item: any) => {
    const iconSize = isSmallDevice ? 22 : isLargeDevice ? 28 : 24;
    if (item.iconType === 'material') {
      return <MaterialIcons name={item.icon} size={iconSize} color={item.color} />;
    }
    if (item.iconType === 'fontawesome5') {
      return <FontAwesome5 name={item.icon} size={iconSize} color={item.color} />;
    }
    return <Ionicons name={item.icon} size={iconSize} color={item.color} />;
  };

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push(`/pages/category/${item.id}?name=${encodeURIComponent(item.name)}`)}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: `${item.color}15` }]}>
        {renderCategoryIcon(item)}
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.suggestedItem}
      onPress={() => router.push(`/pages/product-detail?productId=${item.id}`)}
    >
      <View style={styles.itemImagePlaceholder}>
        <MaterialIcons name="devices" size={isSmallDevice ? 32 : 40} color="#666" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.itemPrice}>₱{item.price || '0.00'}</Text>
          {item.original_price && (
            <Text style={styles.originalPrice}>₱{item.original_price}</Text>
          )}
        </View>
        <View style={styles.itemMeta}>
          {item.condition && (
            <View style={[styles.conditionBadge,
              item.condition === 'Excellent' || item.condition === 'Refurbished' ? styles.excellentBadge :
              item.condition === 'Like New' ? styles.likeNewBadge :
              styles.goodBadge
            ]}>
              <Text style={styles.conditionText}>{item.condition}</Text>
            </View>
          )}
          {item.rating && (
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
        {item.shop && item.shop.barangay && (
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={12} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.shop.barangay}, {item.shop.city}, {item.shop.province}
            </Text>
          </View>
        )}
        {!item.shop && item.customer && (
          <View style={styles.locationContainer}>
            <MaterialIcons name="person" size={12} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              by {item.customer.username}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleUpdateProduct = async () => {
    if (!validateForm()) return;
    if (productImages.length === 0) {
      Alert.alert('Error', 'Please add at least one product image.');
      return;
    }

    const existing = state.products.find(p => p.id === productId);
    if (!existing) {
      Alert.alert('Error', 'Product not found. Please refresh the dashboard.');
      return;
    }

    setLoading(true);
    try {
      // Prepare FormData payload similar to add-product
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('price', formData.price);
      payload.append('quantity', formData.quantity);
      payload.append('condition', formData.condition);
      payload.append('shop', shopId);
      payload.append('customer_id', user?.user_id || user?.id || '');
      payload.append('category', formData.category || '');
      payload.append('upload_status', 'published'); // Add this to keep it visible
      payload.append('status', 'active');

      // Append new media files
      newMediaFiles.forEach((file, index) => {
        payload.append('media_files', {
          uri: file.uri,
          type: file.type,
          name: file.name || `media_${index}.jpg`
        } as any);
      });

      // Update product in context (local state)
      const updatedProduct = {
        ...existing,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        condition: formData.condition,
        category: formData.category,
        images: productImages,
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
      Alert.alert('Product Updated!', `"${formData.name}" has been updated successfully!`, [
        { text: 'OK', onPress: () => router.push(`/shop/dashboard/${shopId}`) },
      ]);
    } catch (error: any) {
      console.error('Update product error:', error);
      Alert.alert('Error', error.message || 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
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
              
              // Call backend API to delete product
              const response = await fetch(`${API_CONFIG.BASE_URL}/seller-products/${productId}/`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer_id: user?.user_id || user?.id
                })
              });

              if (response.ok) {
                // Dispatch delete action to remove from local context
                dispatch({ type: 'DELETE_PRODUCT', payload: productId });
                
                Alert.alert('Success', 'Product deleted successfully');
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.error || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Delete product error:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search, Cart & Notification Bar */}
        <View style={styles.actionBar}>
          {/* Search Bar */}
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={() => router.push('/pages/search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={isSmallDevice ? 18 : 20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Search</Text>
          </TouchableOpacity>
          
          {/* Cart & Notification Icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/pages/cart')}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons name="shopping-cart" size={isSmallDevice ? 22 : 24} color="#333" />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/pages/notifications')}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons name="notifications" size={isSmallDevice ? 22 : 24} color="#333" />
                {notificationCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{Math.min(notificationCount, 99)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subtitle below search */}
        <Text style={styles.subtitle}>Find quality used electronics at great prices</Text>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/pages/categories')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            scrollEnabled={true}
          />
        </View>

        
        {/* All Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchText ? `Search Results (${filteredProducts.length})` : 'Available Products'}
            </Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {loadingProducts ? (
            <View style={[styles.suggestedList, { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }]}>
              <Text style={styles.itemName}>Loading products...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.suggestedList}
            />
          ) : searchText ? (
            <View style={[styles.suggestedList, { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }]}>
              <MaterialIcons name="search-off" size={48} color="#E0E0E0" />
              <Text style={[styles.itemName, { marginTop: 12, color: '#666' }]}>No products found for "{searchText}"</Text>
              <Text style={{ color: '#999', fontSize: 14, marginTop: 4 }}>Try different keywords</Text>
            </View>
          ) : (
            <View style={[styles.suggestedList, { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }]}>
              <MaterialIcons name="inventory" size={48} color="#E0E0E0" />
              <Text style={styles.itemName}>No products available yet</Text>
              <Text style={styles.conditionText}>Check back later for new listings!</Text>
            </View>
          )}
        </View>

       
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    paddingVertical: isSmallDevice ? 12 : 14,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    marginTop: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 8 : 12,
    borderRadius: 12,
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
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 8 : 10,
    marginRight: isSmallDevice ? 12 : 16,
  },
  searchIcon: {
    marginRight: isSmallDevice ? 8 : 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    color: '#999',
    fontFamily: 'System',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallDevice ? 8 : 12,
  },
  iconButton: {
    padding: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff8800ff',
    width: isSmallDevice ? 16 : 18,
    height: isSmallDevice ? 16 : 18,
    borderRadius: isSmallDevice ? 8 : 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 8 : 10,
    fontWeight: '700',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff8800ff',
    width: isSmallDevice ? 16 : 18,
    height: isSmallDevice ? 16 : 18,
    borderRadius: isSmallDevice ? 8 : 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 8 : 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: isSmallDevice ? 20 : 30,
  },
  welcomeSection: {
    paddingHorizontal: isSmallDevice ? 16 : isLargeDevice ? 24 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    backgroundColor: '#FFFFFF',
    marginBottom: isSmallDevice ? 12 : 16,
    borderRadius: 0,
  },
  welcomeText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#6C757D',
    fontFamily: 'System',
    fontWeight: '400',
  },
  userName: {
    fontSize: isSmallDevice ? 26 : isLargeDevice ? 32 : 28,
    fontWeight: '700',
    color: '#212529',
    marginTop: 4,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    textAlign: 'center',
    marginHorizontal: isSmallDevice ? 16 : isLargeDevice ? 24 : 20,
    marginBottom: isSmallDevice ? 12 : 16,
    fontFamily: 'System',
    fontWeight: '400',
  },
  section: {
    marginTop: isSmallDevice ? 12 : 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    paddingVertical: isSmallDevice ? 16 : 20,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallDevice ? 16 : isLargeDevice ? 24 : 20,
    marginBottom: isSmallDevice ? 12 : 16,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  seeAll: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#2196F3',
    fontWeight: '600',
    fontFamily: 'System',
  },
  categoriesList: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingRight: isSmallDevice ? 12 : 16,
  },
  categoryCard: {
    alignItems: 'center',
    marginHorizontal: isSmallDevice ? 6 : 8,
    width: isSmallDevice ? 70 : isLargeDevice ? 90 : 80,
    paddingVertical: isSmallDevice ? 8 : 10,
  },
  categoryIconContainer: {
    width: isSmallDevice ? 56 : isLargeDevice ? 70 : 64,
    height: isSmallDevice ? 56 : isLargeDevice ? 70 : 64,
    borderRadius: isSmallDevice ? 16 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 6 : 8,
  },
  categoryName: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#495057',
    textAlign: 'center',
    fontFamily: 'System',
    fontWeight: '500',
    lineHeight: isSmallDevice ? 14 : 16,
    paddingHorizontal: 4,
  },
  featuredSection: {
    paddingHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    marginTop: isSmallDevice ? 12 : 16,
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
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
  featuredContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    fontFamily: 'System',
  },
  featuredIcon: {
    width: isSmallDevice ? 56 : isLargeDevice ? 70 : 64,
    height: isSmallDevice ? 56 : isLargeDevice ? 70 : 64,
    borderRadius: isSmallDevice ? 16 : 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedList: {
    paddingHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
  },
  suggestedItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 8 : 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  itemImagePlaceholder: {
    width: isSmallDevice ? 70 : 80,
    height: isSmallDevice ? 70 : 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 6,
    lineHeight: isSmallDevice ? 18 : 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#e28800ff',
    marginRight: 8,
    fontFamily: 'System',
  },
  originalPrice: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#ADB5BD',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionBadge: {
    paddingHorizontal: isSmallDevice ? 6 : 8,
    paddingVertical: isSmallDevice ? 3 : 4,
    borderRadius: 6,
    marginRight: 10,
  },
  excellentBadge: {
    backgroundColor: '#E8F5E9',
  },
  likeNewBadge: {
    backgroundColor: '#FFF3E0',
  },
  goodBadge: {
    backgroundColor: '#E3F2FD',
  },
  conditionText: {
    fontSize: isSmallDevice ? 10 : 11,
    color: '#495057',
    fontWeight: '600',
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginLeft: 4,
    fontFamily: 'System',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginLeft: 4,
    fontFamily: 'System',
    flex: 1,
  },
  trustSection: {
    backgroundColor: '#FFFFFF',
    marginTop: isSmallDevice ? 16 : 20,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    padding: isSmallDevice ? 16 : 20,
    borderRadius: 16,
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
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isSmallDevice ? 16 : 20,
  },
  trustItem: {
    alignItems: 'center',
    width: '48%',
  },
  trustIconContainer: {
    width: isSmallDevice ? 48 : 56,
    height: isSmallDevice ? 48 : 56,
    borderRadius: isSmallDevice ? 12 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#495057',
    fontFamily: 'System',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 14 : 16,
  },
  bottomSpacing: {
    height: isSmallDevice ? 40 : 60,
  },
});