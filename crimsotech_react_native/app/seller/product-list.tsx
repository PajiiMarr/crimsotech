// app/seller/product-list.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define types exactly like web version
interface Variant {
  id: string;
  title: string;
  option_title?: string | null;
  option_ids?: any;
  option_map?: any;
  sku_code?: string | null;
  price?: number | null;
  compare_price?: number | null;
  quantity: number;
  weight?: number | null;
  weight_unit: string;
  critical_trigger?: number | null;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price?: number | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  minimum_additional_payment: number;
  maximum_additional_payment: number;
  swap_description?: string | null;
  image?: string | null;
  critical_stock?: number | null;
  created_at: string;
  updated_at: string;
}

interface Media {
  id: string;
  file_data: string | null;
  file_type: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  condition: string;
  upload_status: string;
  status: string;
  is_refundable: boolean;
  refund_days: number;
  category_admin: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  total_stock: number;
  starting_price: string | null;
  variants?: Variant[];
  media?: Media[];
  shop?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  is_removed?: boolean;
  removal_reason?: string | null;
}

interface ProductLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
}

interface ProductListResponse {
  success: boolean;
  products: Product[];
  message: string;
  data_source: string;
  product_limit_info?: ProductLimitInfo;
}

// Helper function to convert Supabase S3 URLs to public URLs (exactly like web)
const convertS3ToPublicUrl = (s3Url: string | null | undefined): string | null => {
  if (!s3Url) return null;
  try {
    const match = s3Url.match(/https:\/\/([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3\/([^/]+)\/(.+)/);
    if (match) {
      const [, projectRef, bucketName, filePath] = match;
      return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
    }
    if (s3Url.includes('/s3/')) {
      return s3Url.replace('/s3/', '/object/public/').replace('.storage.supabase.co', '.supabase.co');
    }
  } catch { /* fall through */ }
  return s3Url;
};

// Get product image from variants (exactly like web)
const getProductImage = (product: Product): string | null => {
  if (product.variants && product.variants.length > 0) {
    for (const variant of product.variants) {
      if (variant.image) return convertS3ToPublicUrl(variant.image);
    }
  }
  return null;
};

export default function ProductList() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLimitInfo, setProductLimitInfo] = useState<ProductLimitInfo | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Removal reason modal
  const [removalModalVisible, setRemovalModalVisible] = useState(false);
  const [selectedRemovalReason, setSelectedRemovalReason] = useState('');

  useEffect(() => {
    if (shopId && userId) {
      fetchProducts();
    }
  }, [shopId, userId]);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedFilter, products]);

  const fetchProducts = async () => {
    if (!userId || !shopId) {
      setLoading(false);
      return;
    }

    try {
      const response = await AxiosInstance.get<ProductListResponse>('/seller-products/', {
        params: { customer_id: userId, shop_id: shopId }
      });

      if (response.data.success) {
        setProducts(response.data.products || []);
        setProductLimitInfo(response.data.product_limit_info || null);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(p => p.status?.toLowerCase() === 'active' && !p.is_removed);
        break;
      case 'draft':
        filtered = filtered.filter(p => p.upload_status === 'draft');
        break;
      case 'archived':
        filtered = filtered.filter(p => p.upload_status === 'archived');
        break;
      case 'removed':
        filtered = filtered.filter(p => p.is_removed);
        break;
      case 'outOfStock':
        filtered = filtered.filter(p => (p.total_stock || 0) === 0 && !p.is_removed);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleArchive = async (productId: string) => {
    setActionLoading(productId);
    try {
      const response = await AxiosInstance.put('/seller-products/update_product_status/', {
        product_id: productId,
        action_type: 'archive',
        user_id: userId
      });
      Alert.alert('Success', 'Product archived successfully');
      fetchProducts();
      setShowActionModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to archive');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (productId: string) => {
    setActionLoading(productId);
    try {
      const response = await AxiosInstance.put('/seller-products/update_product_status/', {
        product_id: productId,
        action_type: 'restore',
        user_id: userId
      });
      Alert.alert('Success', 'Product restored successfully');
      fetchProducts();
      setShowActionModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to restore');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (productId: string) => {
    Alert.alert(
      'Delete Draft',
      'Delete this draft permanently? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(productId);
            try {
              await AxiosInstance.delete(`/seller-products/${productId}/delete_product/`, {
                params: { user_id: userId }
              });
              Alert.alert('Success', 'Draft deleted successfully');
              fetchProducts();
              setShowActionModal(false);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleViewRemovalReason = (reason?: string | null) => {
    setSelectedRemovalReason(reason || 'No removal reason provided.');
    setRemovalModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (product: Product) => {
    return product.category_admin?.name || product.category?.name || 'No Category';
  };

  const getStatusBadge = (product: Product) => {
    if (product.is_removed) {
      return { label: 'Removed', color: '#EF4444', bg: '#FEE2E2' };
    }
    
    const status = product.upload_status?.toLowerCase();
    switch (status) {
      case 'published':
        return { label: 'Published', color: '#22C55E', bg: '#E6F7E6' };
      case 'draft':
        return { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' };
      case 'archived':
        return { label: 'Archived', color: '#F59E0B', bg: '#FEF3C7' };
      case 'active':
        return { label: 'Active', color: '#22C55E', bg: '#E6F7E6' };
      case 'inactive':
        return { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' };
      default:
        return { label: status || 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const stats = {
    total: products.length,
    active: products.filter(p => (p.status || '').toLowerCase() === 'active' && !p.is_removed).length,
    removed: products.filter(p => p.is_removed).length,
    outOfStock: products.filter(p => (p.total_stock || 0) === 0 && !p.is_removed).length,
  };

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {[
            { value: 'all', label: 'All Products', icon: 'apps-outline' },
            { value: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
            { value: 'draft', label: 'Draft', icon: 'document-text-outline' },
            { value: 'archived', label: 'Archived', icon: 'archive-outline' },
            { value: 'removed', label: 'Removed', icon: 'trash-outline' },
            { value: 'outOfStock', label: 'Out of Stock', icon: 'alert-circle-outline' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterOption,
                selectedFilter === filter.value && styles.filterOptionSelected
              ]}
              onPress={() => {
                setSelectedFilter(filter.value);
                setShowFilterModal(false);
              }}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={20} 
                color={selectedFilter === filter.value ? '#0F172A' : '#64748B'} 
              />
              <Text style={[
                styles.filterOptionText,
                selectedFilter === filter.value && styles.filterOptionTextSelected
              ]}>
                {filter.label}
              </Text>
              {selectedFilter === filter.value && (
                <Ionicons name="checkmark" size={20} color="#0F172A" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ActionModal = () => (
    <Modal
      visible={showActionModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowActionModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowActionModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Product Actions</Text>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {selectedProduct && (
            <View style={styles.actionList}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setShowActionModal(false);
                  // router.push(`/seller/product/${selectedProduct.id}?shopId=${shopId}`);
                }}
              >
                <Ionicons name="eye-outline" size={22} color="#0F172A" />
                <Text style={styles.actionItemText}>View Details</Text>
              </TouchableOpacity>

              {!selectedProduct.is_removed && (
                <>
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => {
                      setShowActionModal(false);
                      router.push(`/seller/components/seller-create-product?productId=${selectedProduct.id}&shopId=${shopId}`);
                    }}
                  >
                    <Ionicons name="create-outline" size={22} color="#0F172A" />
                    <Text style={styles.actionItemText}>Edit Product</Text>
                  </TouchableOpacity>

                  {selectedProduct.upload_status === 'published' && (
                    <TouchableOpacity 
                      style={styles.actionItem}
                      onPress={() => handleArchive(selectedProduct.id)}
                    >
                      <Ionicons name="archive-outline" size={22} color="#F59E0B" />
                      <Text style={styles.actionItemText}>Archive</Text>
                    </TouchableOpacity>
                  )}

                  {selectedProduct.upload_status === 'archived' && (
                    <TouchableOpacity 
                      style={styles.actionItem}
                      onPress={() => handleRestore(selectedProduct.id)}
                    >
                      <Ionicons name="refresh-outline" size={22} color="#22C55E" />
                      <Text style={styles.actionItemText}>Restore</Text>
                    </TouchableOpacity>
                  )}

                  {selectedProduct.upload_status === 'draft' && (
                    <TouchableOpacity 
                      style={[styles.actionItem, styles.actionItemDestructive]}
                      onPress={() => handleDeleteDraft(selectedProduct.id)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#EF4444" />
                      <Text style={[styles.actionItemText, styles.actionItemTextDestructive]}>Delete Draft</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {selectedProduct.is_removed && (
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => {
                    setShowActionModal(false);
                    handleViewRemovalReason(selectedProduct.removal_reason);
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
                  <Text style={[styles.actionItemText, styles.actionItemTextDestructive]}>View Removal Reason</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ProductCard = ({ product }: { product: Product }) => {
    const badge = getStatusBadge(product);
    const imageUrl = getProductImage(product);
    const isRemoved = product.is_removed;
    const [imageError, setImageError] = useState(false);

    return (
      <TouchableOpacity
        style={[styles.productCard, isRemoved && styles.productCardRemoved]}
        onPress={() => {
          setSelectedProduct(product);
          setShowActionModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.productCardContent}>
          {/* Image - exactly like web with fallback */}
          <View style={styles.productImageContainer}>
            {imageUrl && !imageError ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.productImage}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Ionicons name="image-outline" size={24} color="#CBD5E1" />
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.productDetails}>
            <View style={styles.productHeader}>
              <Text style={[styles.productName, isRemoved && styles.textRemoved]} numberOfLines={1}>
                {product.name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.productCategory, isRemoved && styles.textRemoved]} numberOfLines={1}>
              {getCategoryName(product)} • {product.condition}
            </Text>

            <View style={styles.productMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="cube-outline" size={14} color="#94A3B8" />
                <Text style={[styles.metaText, isRemoved && styles.textRemoved]}>
                  {product.total_stock || 0} in stock
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={14} color="#94A3B8" />
                <Text style={[styles.metaText, isRemoved && styles.textRemoved]}>
                  {product.starting_price ? `₱${parseFloat(product.starting_price).toFixed(2)}` : 'No price'}
                </Text>
              </View>
            </View>

            <View style={styles.productFooter}>
              <Text style={[styles.productDate, isRemoved && styles.textRemoved]}>
                {formatDate(product.created_at)}
              </Text>
              
              {product.shop && (
                <View style={styles.shopBadge}>
                  <Ionicons name="storefront-outline" size={10} color="#64748B" />
                  <Text style={styles.shopBadgeText} numberOfLines={1}>
                    {product.shop.name}
                  </Text>
                </View>
              )}
            </View>

            {isRemoved && (
              <TouchableOpacity
                style={styles.removalReasonButton}
                onPress={() => handleViewRemovalReason(product.removal_reason)}
              >
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.removalReasonText}>View removal reason</Text>
              </TouchableOpacity>
            )}

            {/* Three Dots Button */}
            <TouchableOpacity 
              style={styles.threeDotsButton}
              onPress={() => {
                setSelectedProduct(product);
                setShowActionModal(true);
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="cube-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view products</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const outOfStockCount = products.filter(p => (p.total_stock ?? 0) === 0).length;
  const removedCount = products.filter(p => p.is_removed).length;
  const activeCount = products.filter(p => (p.status || '').toLowerCase() === 'active' && !p.is_removed).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Product List</Text>
              <Text style={styles.subtitle}>Manage your products and inventory</Text>
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push(`/seller/components/seller-create-product?shopId=${shopId}`)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>

          {/* Product Limit */}
          {productLimitInfo && (
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <View>
                  <Text style={styles.limitTitle}>Product Limit</Text>
                  <Text style={styles.limitText}>
                    {productLimitInfo.current_count} / {productLimitInfo.limit} used ({productLimitInfo.remaining} remaining)
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${Math.min((productLimitInfo.current_count / productLimitInfo.limit) * 100, 100)}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>{activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{removedCount}</Text>
              <Text style={styles.statLabel}>Removed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{outOfStockCount}</Text>
              <Text style={styles.statLabel}>Out of Stock</Text>
            </View>
          </View>

          {/* Search, Filter and Add Row */}
          <View style={styles.actionRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <TouchableOpacity 
              style={[styles.iconButton, selectedFilter !== 'all' && styles.iconButtonActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons 
                name="options-outline" 
                size={18} 
                color={selectedFilter !== 'all' ? '#0F172A' : '#64748B'} 
              />
            </TouchableOpacity>
          </View>

          {/* Products List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <Text style={styles.sectionCount}>
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                {productLimitInfo && ` • ${productLimitInfo.remaining} remaining`}
                {removedCount > 0 && (
                  <Text style={styles.removedCount}> • {removedCount} removed</Text>
                )}
              </Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first product to start selling'}
                </Text>
                {(searchQuery || selectedFilter !== 'all') ? (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    }}
                  >
                    <Text style={styles.clearButtonText}>Clear filters</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.createProductButton}
                    onPress={() => router.push(`/seller/createproducts?shopId=${shopId}`)}
                  >
                    <Text style={styles.createProductButtonText}>Create Product</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <FilterModal />
      <ActionModal />

      {/* Removal Reason Modal */}
      <Modal
        visible={removalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovalModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRemovalModalVisible(false)}
        >
          <View style={[styles.modalContent, styles.reasonModal]}>
            <View style={styles.modalHeader}>
              <View style={styles.reasonHeader}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={styles.reasonTitle}>Product Removal Reason</Text>
              </View>
              <TouchableOpacity onPress={() => setRemovalModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.reasonDescription}>
              This product has been removed from the platform.
            </Text>
            <View style={styles.reasonContent}>
              <Text style={styles.reasonText}>{selectedRemovalReason}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setRemovalModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  limitCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  limitHeader: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  limitText: {
    fontSize: 13,
    color: '#2563EB',
    marginBottom: 8,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#BFDBFE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconButtonActive: {
    backgroundColor: '#F3F4F6',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  removedCount: {
    color: '#EF4444',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  productCardRemoved: {
    backgroundColor: '#FEF2F2',
  },
  productCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    position: 'relative',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 30,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    paddingRight: 30,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shopBadgeText: {
    fontSize: 9,
    color: '#4B5563',
    maxWidth: 80,
  },
  threeDotsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  textRemoved: {
    color: '#991B1B',
  },
  removalReasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  removalReasonText: {
    fontSize: 10,
    color: '#EF4444',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  createProductButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  createProductButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  reasonModal: {
    margin: 20,
    borderRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: '#F3F4F6',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
  },
  filterOptionTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  actionList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  actionItemText: {
    fontSize: 15,
    color: '#111827',
  },
  actionItemDestructive: {
    marginTop: 8,
  },
  actionItemTextDestructive: {
    color: '#EF4444',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reasonDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  reasonContent: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
});