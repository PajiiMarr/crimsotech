// selling-products.tsx
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Interfaces
interface ProductMedia {
  id: string;
  url: string | null;
  file_type: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface StatusBadge {
  type: string;
  label: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  quantity: number;
  total_sku_quantity: number;
  price: string;
  compare_price: string | null;
  upload_status: string;
  status: string;
  condition: string;
  status_badge: StatusBadge[];
  stock_status: string;
  category_admin: ProductCategory | null;
  category: ProductCategory | null;
  main_image: ProductMedia | null;
  media_count: number;
  all_media: ProductMedia[];
  has_variants: boolean;
  sku_count: number;
  allow_swap: boolean;
  has_swap: boolean;
  swap_type: string | null;
  critical_stock: number | null;
  is_low_stock: boolean;
  active_report_count: number;
  has_active_reports: boolean;
  created_at: string;
  updated_at: string;
  created_date: string;
  updated_date: string;
  is_published: boolean;
  is_draft: boolean;
  is_archived: boolean;
  is_active: boolean;
}

interface CustomerInfo {
  customer_id: string;
  product_limit: number;
  current_product_count: number;
  remaining_products: number;
}

interface APIResponse {
  success: boolean;
  products: Product[];
  total_count: number;
  summary: {
    total_products: number;
    by_upload_status: {
      published: number;
      draft: number;
      archived: number;
    };
    product_limit: {
      limit: number;
      used: number;
      remaining: number;
      percentage_used: number;
    };
  };
  customer_info: CustomerInfo;
  message: string;
}

export type CustomerStackParamList = {
  Login: undefined;
  CreateProduct: undefined;
  ProductDetail: { productId: string };
  EditProduct: { productId: string };
};

export default function SellingProductPage() {
  const { userRole, userId } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    customer_id: '',
    product_limit: 20,
    current_product_count: 0,
    remaining_products: 20
  });
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    remaining: 20
  });
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [showProductMenu, setShowProductMenu] = useState<string | null>(null);

  // Simple role guard: only users with role 'customer' may view this page
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (!token || !user) {
        Alert.alert('Error', 'Please login first');
        navigation.navigate('Login');
        return;
      }

      const userData = JSON.parse(user);
      const customerId = userData.user_id || userId;

      const response = await axios.get<APIResponse>(
        'http://192.168.1.1:8000/api/customer-product-list/products_list/', // Replace with your actual API URL
        {
          headers: {
            'X-User-Id': customerId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setProducts(response.data.products || []);
        setCustomerInfo(response.data.customer_info);
        setStats({
          total: response.data.summary.total_products,
          published: response.data.summary.by_upload_status.published,
          draft: response.data.summary.by_upload_status.draft,
          remaining: response.data.customer_info.remaining_products
        });

        // Check if user has reached the limit
        if (response.data.customer_info.remaining_products <= 0) {
          setShowLimitAlert(true);
        }
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load products. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [])
  );

  const formatPrice = (price: string) => {
    try {
      const priceNumber = parseFloat(price);
      return `₱${priceNumber.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    } catch {
      return '₱0.00';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getCategoryName = (product: Product) => {
    return product.category_admin?.name || product.category?.name || 'No Category';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'published':
        return '#10B981'; // green
      case 'draft':
        return '#F59E0B'; // amber
      case 'inactive':
      case 'archived':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return '#10B981';
      case 'low_stock':
        return '#F59E0B';
      case 'out_of_stock':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status.replace('_', ' ');
    }
  };

  const handleCreateProduct = () => {
    if (customerInfo.remaining_products <= 0) {
      Alert.alert(
        'Limit Reached',
        `You have reached your limit of ${customerInfo.product_limit} personal listings.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
      if (customerInfo.remaining_products <= 3) {
      Alert.alert(
        'Almost Full',
        `You have ${customerInfo.remaining_products} listing slots remaining.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => navigation.navigate('CreateProduct') }
        ]
      );
      return;
    }
    
    navigation.navigate('CreateProduct');
  };

  const handleViewProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleEditProduct = (productId: string) => {
    navigation.navigate('EditProduct', { productId });
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(
                `http://192.168.1.1:8000/api/customer-products/${productId}/`, // Replace with your actual API URL
                {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );
              
              // Remove from local state
              setProducts(prev => prev.filter(p => p.id !== productId));
              Alert.alert('Success', 'Listing deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.patch(
        `http://192.168.1.1:8000/api/customer-products/${productId}/`, // Replace with your actual API URL
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
      
      Alert.alert('Success', `Listing ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleViewProduct(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.productHeader}>
        <View style={styles.productImageContainer}>
          {item.main_image?.url ? (
            <Image 
              source={{ uri: item.main_image.url }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="image" size={24} color="#9CA3AF" />
            </View>
          )}
          {item.media_count > 0 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>{item.media_count}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.short_description}
          </Text>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>
              {getCategoryName(item)}
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>
              {formatPrice(item.price)}
            </Text>
            {item.compare_price && (
              <Text style={styles.comparePrice}>
                {formatPrice(item.compare_price)}
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowProductMenu(item.id)}
        >
          <Icon name="more-vert" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.productFooter}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {item.is_draft && (
            <View style={[styles.statusBadge, styles.draftBadge]}>
              <Text style={styles.statusText}>Draft</Text>
            </View>
          )}
        </View>
        
        <View style={styles.stockContainer}>
          <View style={[
            styles.stockBadge, 
            { backgroundColor: getStockStatusColor(item.stock_status) }
          ]}>
            <Text style={styles.stockText}>
              {getStockStatusText(item.stock_status)}
            </Text>
          </View>
          <Text style={styles.stockCount}>
            Stock: {item.total_sku_quantity}
          </Text>
        </View>
        
        <View style={styles.swapContainer}>
          {item.has_swap ? (
            <View style={styles.swapBadge}>
              <Icon name="swap-horiz" size={14} color="#FFFFFF" />
              <Text style={styles.swapText}>Swap Available</Text>
            </View>
          ) : (
            <Text style={styles.noSwapText}>No Swap</Text>
          )}
        </View>
      </View>
      
      <View style={styles.productMeta}>
        <Text style={styles.dateText}>
          Added: {formatDate(item.created_at)}
        </Text>
        {item.has_variants && (
          <View style={styles.variantBadge}>
            <Icon name="layers" size={12} color="#FFFFFF" />
            <Text style={styles.variantText}>
              {item.sku_count} variant{item.sku_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Product Action Menu Modal */}
      <Modal
        visible={showProductMenu === item.id}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProductMenu(null)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProductMenu(null)}>
          <View style={styles.menuOverlay}>
            <View style={styles.actionMenu}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProductMenu(null);
                  handleViewProduct(item.id);
                }}
              >
                <IonIcon name="eye-outline" size={20} color="#374151" />
                <Text style={styles.menuItemText}>View Listing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProductMenu(null);
                  handleEditProduct(item.id);
                }}
              >
                <Icon name="edit" size={20} color="#374151" />
                <Text style={styles.menuItemText}>Edit Listing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProductMenu(null);
                  handleToggleStatus(item.id, item.status);
                }}
              >
                <Icon name={item.status === 'active' ? 'pause' : 'play-arrow'} size={20} color="#374151" />
                <Text style={styles.menuItemText}>
                  {item.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={() => {
                  setShowProductMenu(null);
                  handleDeleteProduct(item.id);
                }}
              >
                <Icon name="delete" size={20} color="#EF4444" />
                <Text style={styles.deleteMenuText}>Delete Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="inventory" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first personal listing to start selling items.
      </Text>
      <TouchableOpacity 
        style={[
          styles.createButton,
          customerInfo.remaining_products <= 0 && styles.disabledButton
        ]}
        onPress={handleCreateProduct}
        disabled={customerInfo.remaining_products <= 0}
      >
        <Icon name="add" size={24} color="#FFFFFF" />
        <Text style={styles.createButtonText}>
          Create Your First Listing
        </Text>
      </TouchableOpacity>
      {customerInfo.remaining_products <= 0 && (
        <Text style={styles.limitWarning}>
          You've reached the limit of {customerInfo.product_limit} listings
        </Text>
      )}
    </View>
  );

  const renderStatsCard = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.statsScroll}
      contentContainerStyle={styles.statsContainer}
    >
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      
      <View style={[styles.statCard, styles.publishedCard]}>
        <Text style={styles.statNumber}>{stats.published}</Text>
        <Text style={styles.statLabel}>Published</Text>
      </View>
      
      <View style={[styles.statCard, styles.draftCard]}>
        <Text style={styles.statNumber}>{stats.draft}</Text>
        <Text style={styles.statLabel}>Drafts</Text>
      </View>
      
      <View style={[styles.statCard, styles.limitCard]}>
        <Text style={styles.statNumber}>{stats.remaining}</Text>
        <Text style={styles.statLabel}>Remaining</Text>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Personal Listings</Text>
          <Text style={styles.headerSubtitle}>Manage your personal item listings</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Icon 
              name="refresh" 
              size={24} 
              color="#4F46E5" 
              style={refreshing && styles.refreshingIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.addButton,
              customerInfo.remaining_products <= 0 && styles.disabledAddButton
            ]}
            onPress={handleCreateProduct}
            disabled={customerInfo.remaining_products <= 0}
          >
            <Icon name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Limit Alert Modal */}
      <Modal
        visible={showLimitAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <View style={styles.alertIcon}>
              <Icon name="warning" size={48} color="#EF4444" />
            </View>
            <Text style={styles.alertTitle}>Limit Reached</Text>
            <Text style={styles.alertMessage}>
              You have reached your limit of {customerInfo.product_limit} personal listings.
              You cannot create more listings until you delete some existing ones.
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setShowLimitAlert(false)}
            >
              <Text style={styles.alertButtonText}>OK, I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Limit Info Bar */}
      <View style={styles.limitInfo}>
        <View style={styles.limitProgress}>
          <View 
            style={[
              styles.limitProgressBar,
              { 
                width: `${Math.min(100, (customerInfo.current_product_count / customerInfo.product_limit) * 100)}%` 
              }
            ]}
          />
        </View>
        <View style={styles.limitTextContainer}>
          <Text style={styles.limitText}>
            {customerInfo.current_product_count}/{customerInfo.product_limit} listings used
          </Text>
          <Text style={styles.remainingText}>
            {customerInfo.remaining_products} remaining
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {renderStatsCard()}

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listings..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.productsContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Your Listings ({filteredProducts.length})
              </Text>
              {customerInfo.remaining_products > 0 && (
                <Text style={styles.listSubtitle}>
                  {customerInfo.remaining_products} slots available
                </Text>
              )}
            </View>
            
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Create Button (for when list is long) */}
      {filteredProducts.length > 0 && customerInfo.remaining_products > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleCreateProduct}
        >
          <Icon name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  refreshingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledAddButton: {
    backgroundColor: '#9CA3AF',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  limitInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  limitProgress: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  limitProgressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  limitTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  statsScroll: {
    marginTop: 8,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  publishedCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  draftCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  limitCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  productsContainer: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  categoryContainer: {
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  comparePrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  menuButton: {
    padding: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  stockContainer: {
    alignItems: 'center',
    gap: 4,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  stockCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  swapContainer: {
    alignItems: 'flex-end',
  },
  swapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  swapText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  noSwapText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variantText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    minHeight: 400,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  limitWarning: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 12,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4F46E5',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  deleteMenuItem: {
    marginTop: 4,
  },
  deleteMenuText: {
    fontSize: 16,
    color: '#EF4444',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  alertIcon: {
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  alertButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});