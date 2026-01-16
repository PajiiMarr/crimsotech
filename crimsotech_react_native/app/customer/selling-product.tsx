// selling-product.tsx
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
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import AxiosInstance from '../../contexts/axios';

const { width } = Dimensions.get('window');

// Interfaces (same as before)
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

export default function SellingProductPage() {
  const { user, userRole } = useAuth();
  
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

  // Normalize image URLs
  const normalizeImageUrl = (raw?: string | null) => {
    const placeholder = 'https://via.placeholder.com/150';
    if (!raw) return placeholder;
    
    const trimmed = String(raw).trim();
    if (!trimmed) return placeholder;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `${AxiosInstance.defaults.baseURL}${trimmed}`;
    return `${AxiosInstance.defaults.baseURL}/${trimmed}`;
  };

  // Helper to extract image from product data
  const extractImageFromProduct = (product: any): string | null => {
    if (!product) return null;

    if (product.main_image?.url) return product.main_image.url;

    if (product.all_media && product.all_media.length > 0) {
      for (const media of product.all_media) {
        if (media.url) return media.url;
      }
    }

    const imageCandidates = [
      product.primary_image,
      product.primary_image_url,
      product.image_url,
      product.image,
      product.thumbnail,
      product.media_files?.[0]?.url,
      product.media_files?.[0]?.file_url,
    ];

    for (const candidate of imageCandidates) {
      if (candidate && typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
      if (candidate && typeof candidate === 'object') {
        const url = candidate.url || candidate.file_url || candidate.raw_url;
        if (url && typeof url === 'string') return url.trim();
      }
    }

    return null;
  };

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
    }
  }, [user?.id]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get<APIResponse>('/api/customer-product-list/products_list/', {
        headers: {
          'X-User-Id': user?.id,
        },
      });

      if (response.data.success) {
        const productsData = response.data.products || [];

        // Transform products with normalized image URLs
        const transformedProducts = productsData.map((product: any) => {
          const rawImage = extractImageFromProduct(product);
          
          if (!rawImage) {
            console.warn('No image found for product:', product.id, product.name);
          }

          return {
            ...product,
            id: String(product.id),
            main_image: product.main_image ? {
              ...product.main_image,
              url: normalizeImageUrl(rawImage)
            } : null,
            all_media: product.all_media?.map((media: any) => ({
              ...media,
              url: normalizeImageUrl(media.url)
            })) || [],
          };
        });

        // Limit listings shown to 20 items
        const limitedProducts = transformedProducts.slice(0, 20);
        if (transformedProducts.length > 20) {
          console.log('Showing first 20 products of', transformedProducts.length);
        }

        setProducts(limitedProducts);
        setCustomerInfo(response.data.customer_info || {
          customer_id: user?.id || '',
          product_limit: 20,
          current_product_count: transformedProducts.length,
          remaining_products: Math.max(0, 20 - transformedProducts.length)
        });
        
        setStats({
          total: response.data.summary?.total_products || transformedProducts.length,
          published: response.data.summary?.by_upload_status?.published || 0,
          draft: response.data.summary?.by_upload_status?.draft || 0,
          remaining: response.data.customer_info?.remaining_products || Math.max(0, 20 - transformedProducts.length)
        });

        // Check if user has reached the limit
        if (response.data.customer_info?.remaining_products <= 0) {
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

  const formatPrice = (price: string) => {
    try {
      const priceNumber = parseFloat(price);
      return `₱${priceNumber.toFixed(0)}`;
    } catch {
      return '₱0';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
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
        return '#10B981';
      case 'draft':
        return '#F59E0B';
      case 'inactive':
      case 'archived':
        return '#9CA3AF';
      default:
        return '#9CA3AF';
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
        return '#9CA3AF';
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
          { text: 'Continue', onPress: () => router.push('./add-selling-product-form') }
        ]
      );
      return;
    }
    
    router.push('./add-selling-product-form');
  };

  const handleViewProduct = (productId: string) => {
    // router.push(`/customer/products/${productId}`);
  };

  const handleEditProduct = (productId: string) => {
    // router.push(`/customer/products/edit/${productId}`);
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
              await AxiosInstance.delete(`/api/customer-products/${productId}/`, {
                headers: {
                  'X-User-Id': user?.id,
                },
              });
              
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
      await AxiosInstance.patch(
        `/api/customer-products/${productId}/`,
        { status: newStatus },
        {
          headers: {
            'X-User-Id': user?.id,
          },
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
    <View style={styles.productCard}>
      <TouchableOpacity 
        style={styles.productContent}
        onPress={() => handleViewProduct(item.id)}
        activeOpacity={0.7}
      >
        {/* Product Image */}
        <View style={styles.productImageContainer}>
          {item.main_image?.url ? (
            <Image 
              source={{ uri: item.main_image.url }} 
              style={styles.productImage}
              resizeMode="cover"
              onError={(e: any) => console.warn('Image load failed:', item.main_image?.url)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="image" size={20} color="#9CA3AF" />
            </View>
          )}
          {item.media_count > 0 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>+{item.media_count}</Text>
            </View>
          )}
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeaderRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setShowProductMenu(item.id)}
            >
              <Icon name="more-vert" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.categoryPriceRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {getCategoryName(item)}
              </Text>
            </View>
            <Text style={styles.productPrice}>
              {formatPrice(item.price)}
            </Text>
          </View>
          
          <View style={styles.statusStockRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status === 'active' ? 'Active' : item.status}
              </Text>
            </View>
            
            <View style={styles.stockInfo}>
              <View style={[styles.stockDot, { backgroundColor: getStockStatusColor(item.stock_status) }]} />
              <Text style={styles.stockText}>
                {item.total_sku_quantity} in stock
              </Text>
            </View>
          </View>
          
          <Text style={styles.dateText}>
            Added {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="inventory" size={48} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first personal listing to start selling items
      </Text>
      <TouchableOpacity 
        style={[
          styles.createButton,
          customerInfo.remaining_products <= 0 && styles.disabledButton
        ]}
        onPress={handleCreateProduct}
        disabled={customerInfo.remaining_products <= 0}
      >
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>
          Create Listing
        </Text>
      </TouchableOpacity>
      {customerInfo.remaining_products <= 0 && (
        <Text style={styles.limitWarning}>
          Limit reached ({customerInfo.product_limit} listings)
        </Text>
      )}
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statRow}>
        <View style={[styles.statItem, styles.totalStat]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={[styles.statItem, styles.publishedStat]}>
          <Text style={styles.statNumber}>{stats.published}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        
        <View style={[styles.statItem, styles.draftStat]}>
          <Text style={styles.statNumber}>{stats.draft}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
        
        <View style={[styles.statItem, styles.limitStat]}>
          <Text style={styles.statNumber}>{stats.remaining}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>
    </View>
  );

  // Role guard
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading listings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSubtitle}>{customerInfo.current_product_count} items listed</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Icon 
              name="refresh" 
              size={20} 
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
            <Icon name="add" size={20} color="#FFFFFF" />
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
              <Icon name="warning" size={40} color="#EF4444" />
            </View>
            <Text style={styles.alertTitle}>Limit Reached</Text>
            <Text style={styles.alertMessage}>
              You have reached your limit of {customerInfo.product_limit} listings.
              Delete some listings to create new ones.
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setShowLimitAlert(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
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
            {customerInfo.current_product_count}/{customerInfo.product_limit}
          </Text>
          <Text style={styles.remainingText}>
            {customerInfo.remaining_products} left
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        {renderStatsCard()}

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listings..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close" size={18} color="#9CA3AF" />
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
                Listings ({filteredProducts.length})
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

      {/* Product Action Menu Modal */}
      <Modal
        visible={showProductMenu !== null}
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
                  const productId = showProductMenu;
                  setShowProductMenu(null);
                  handleViewProduct(productId!);
                }}
              >
                <IonIcon name="eye-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  const productId = showProductMenu;
                  setShowProductMenu(null);
                  handleEditProduct(productId!);
                }}
              >
                <Icon name="edit" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  const productId = showProductMenu;
                  const product = products.find(p => p.id === productId);
                  setShowProductMenu(null);
                  if (product) {
                    handleToggleStatus(productId!, product.status);
                  }
                }}
              >
                <Icon name="power-settings-new" size={18} color="#374151" />
                <Text style={styles.menuItemText}>
                  {products.find(p => p.id === showProductMenu)?.status === 'active' ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={() => {
                  const productId = showProductMenu;
                  setShowProductMenu(null);
                  handleDeleteProduct(productId!);
                }}
              >
                <Icon name="delete" size={18} color="#EF4444" />
                <Text style={styles.deleteMenuText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Floating Create Button */}
      {customerInfo.remaining_products > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleCreateProduct}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// Minimalist Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 6,
  },
  refreshingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledAddButton: {
    backgroundColor: '#CBD5E1',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  limitInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  limitProgress: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
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
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  totalStat: {
    backgroundColor: '#F1F5F9',
  },
  publishedStat: {
    backgroundColor: '#F0FDF4',
  },
  draftStat: {
    backgroundColor: '#FFFBEB',
  },
  limitStat: {
    backgroundColor: '#EEF2FF',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  productsContainer: {
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    gap: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  productContent: {
    flexDirection: 'row',
    padding: 8,
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  imageCountText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 2,
  },
  categoryPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  stockText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    minHeight: 300,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  createButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  limitWarning: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 12,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4F46E5',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  deleteMenuItem: {
    marginTop: 4,
  },
  deleteMenuText: {
    fontSize: 15,
    color: '#EF4444',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  alertIcon: {
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
  },
  alertButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});