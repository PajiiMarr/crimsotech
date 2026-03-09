// app/customer/personal-listing.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  
  TouchableOpacity,
  Image,
  Alert,
  Modal
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../guards/RoleGuard';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';
import { router } from 'expo-router';

const PRODUCT_LIMIT = 20;

interface Variant {
  id: string;
  title: string;
  quantity: number;
  sku_code?: string;
  critical_trigger?: number;
  is_active: boolean;
  image?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  total_stock: number;
  status: 'active' | 'inactive' | 'draft';
  upload_status: 'draft' | 'published' | 'archived';
  condition: string;
  category: { id: string; name: string } | null;
  category_admin: { id: string; name: string } | null;
  variants: Variant[];
  primary_image?: string | null;
  created_at: string;
  updated_at: string;
  is_removed?: boolean;
  removal_reason?: string;
}

interface ProductLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
}

// Helper function to format image URL
const formatImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === '') return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const baseURL = (AxiosInstance.defaults && AxiosInstance.defaults.baseURL) 
    ? AxiosInstance.defaults.baseURL.replace(/\/$/, '') 
    : 'http://localhost:8000';
  
  if (url.startsWith('/')) {
    return `${baseURL}${url}`;
  }

  return `${baseURL}/${url}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export default function PersonalListing() {
  const { userId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productLimitInfo, setProductLimitInfo] = useState<ProductLimitInfo>({
    current_count: 0,
    limit: PRODUCT_LIMIT,
    remaining: PRODUCT_LIMIT
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const fetchProducts = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching products for user:', userId);
      const response = await AxiosInstance.get('/customer-products/', {
        params: { customer_id: userId }
      });

      console.log('API Response:', response.data);

      if (response.data && response.data.success) {
        const mappedProducts = (response.data.products || []).map((p: any) => {
          // Calculate total stock from variants
          let totalStock = 0;
          if (p.variants && Array.isArray(p.variants)) {
            totalStock = p.variants.reduce((sum: number, v: any) => {
              return sum + (parseInt(v.quantity) || 0);
            }, 0);
          } else if (p.total_stock) {
            totalStock = parseInt(p.total_stock) || 0;
          } else if (p.quantity) {
            totalStock = parseInt(p.quantity) || 0;
          }

          // Get primary image
          let primaryImage = null;
          if (p.primary_image?.url) {
            primaryImage = formatImageUrl(p.primary_image.url);
          } else if (p.media_files && Array.isArray(p.media_files) && p.media_files.length > 0) {
            const firstMedia = p.media_files[0];
            primaryImage = formatImageUrl(firstMedia.file_url || firstMedia.file_data);
          } else if (p.variants && Array.isArray(p.variants)) {
            const variantWithImage = p.variants.find((v: any) => v.image);
            if (variantWithImage) {
              primaryImage = formatImageUrl(variantWithImage.image);
            }
          }

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            total_stock: totalStock,
            status: p.status || 'active',
            upload_status: p.upload_status || 'draft',
            condition: p.condition || 'New',
            category: p.category || null,
            category_admin: p.category_admin || null,
            variants: p.variants || [],
            primary_image: primaryImage,
            created_at: p.created_at,
            updated_at: p.updated_at,
            is_removed: p.is_removed,
            removal_reason: p.removal_reason
          };
        });

        console.log('Mapped products:', mappedProducts);
        setProducts(mappedProducts);
        
        const currentCount = mappedProducts.length;
        setProductLimitInfo({
          current_count: currentCount,
          limit: PRODUCT_LIMIT,
          remaining: Math.max(0, PRODUCT_LIMIT - currentCount)
        });
      } else {
        setProducts([]);
        setProductLimitInfo({
          current_count: 0,
          limit: PRODUCT_LIMIT,
          remaining: PRODUCT_LIMIT
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setProductLimitInfo({
        current_count: 0,
        limit: PRODUCT_LIMIT,
        remaining: PRODUCT_LIMIT
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/customer/view-product?productId=${productId}`);
  };

  const handleEditProduct = (productId: string) => {
    // router.push(`/customer/edit-product/${productId}`);
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add your delete API call here
              console.log('Delete product:', productId);
              // await AxiosInstance.delete(`/customer-products-viewset/${productId}/?user_id=${userId}`);
              
              // Remove from local state
              setProducts(prev => prev.filter(p => p.id !== productId));
              setProductLimitInfo(prev => ({
                ...prev,
                current_count: prev.current_count - 1,
                remaining: prev.remaining + 1
              }));
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleToggleUploadStatus = (product: Product) => {
    const newStatus = product.upload_status === 'published' ? 'draft' : 'published';
    Alert.alert(
      `${newStatus === 'published' ? 'Publish' : 'Unpublish'} Product`,
      `Are you sure you want to ${newStatus === 'published' ? 'publish' : 'unpublish'} this product?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Add your API call here
              console.log('Toggle upload status:', product.id, newStatus);
              // await AxiosInstance.patch(`/customer-products-viewset/${product.id}/`, { upload_status: newStatus });
              
              // Update local state
              setProducts(prev => prev.map(p => 
                p.id === product.id ? { ...p, upload_status: newStatus } : p
              ));
            } catch (error) {
              console.error('Error updating upload status:', error);
              Alert.alert('Error', 'Failed to update upload status');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Product`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this product?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Add your API call here
              console.log('Toggle status:', product.id, newStatus);
              // await AxiosInstance.patch(`/customer-products-viewset/${product.id}/`, { status: newStatus });
              
              // Update local state
              setProducts(prev => prev.map(p => 
                p.id === product.id ? { ...p, status: newStatus } : p
              ));
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update status');
            }
          }
        }
      ]
    );
  };

  const openActionModal = (product: Product) => {
    setSelectedProduct(product);
    setActionModalVisible(true);
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return '#EF4444';
    if (stock < 10) return '#3B82F6';
    return '#10B981';
  };

  const getStockStatusText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return `Low Stock (${stock})`;
    return `In Stock (${stock})`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#D1FAE5', text: '#10B981' };
      case 'inactive': return { bg: '#F3F4F6', text: '#6B7280' };
      case 'draft': return { bg: '#FEF3C7', text: '#F59E0B' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getUploadStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return { bg: '#D1FAE5', text: '#10B981' };
      case 'draft': return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'archived': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getCategoryName = (product: Product) => {
    return product.category?.name || product.category_admin?.name || 'No Category';
  };

  const getVariantSummary = (variants: Variant[]) => {
    if (!variants || variants.length === 0) return 'No variants';
    const activeVariants = variants.filter(v => v.is_active !== false).length;
    return `${activeVariants} variant${activeVariants !== 1 ? 's' : ''}`;
  };

  const usagePercentage = (productLimitInfo.current_count / productLimitInfo.limit) * 100;
  const isLimitReached = productLimitInfo.remaining === 0;
  const isNearLimit = productLimitInfo.remaining <= 5 && !isLimitReached;

  const renderProductCard = ({ item }: { item: Product }) => {
    const productImage = item.primary_image || item.variants?.find(v => v.image)?.image;
    const statusColors = getStatusBadgeColor(item.status);
    const uploadStatusColors = getUploadStatusBadgeColor(item.upload_status);
    const stockColor = getStockStatusColor(item.total_stock);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleViewProduct(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productImageContainer}>
            {productImage ? (
              <Image 
                source={{ uri: productImage }} 
                style={styles.productImage}
                defaultSource={require('../../assets/images/icon.png')}
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <MaterialIcons name="image" size={24} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description?.substring(0, 80)}{item.description?.length > 80 ? '...' : ''}
            </Text>
            
            <View style={styles.badgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: uploadStatusColors.bg }]}>
                <Text style={[styles.statusText, { color: uploadStatusColors.text }]}>
                  {item.upload_status.charAt(0).toUpperCase() + item.upload_status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => openActionModal(item)}
          >
            <MaterialIcons name="more-vert" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={14} color="#9CA3AF" />
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{getCategoryName(item)}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="layers" size={14} color="#9CA3AF" />
            <Text style={styles.detailLabel}>Variants:</Text>
            <Text style={styles.detailValue}>{getVariantSummary(item.variants)}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="inventory" size={14} color="#9CA3AF" />
            <Text style={styles.detailLabel}>Stock:</Text>
            <Text style={[styles.detailValue, { color: stockColor }]}>
              {item.total_stock}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={14} color="#9CA3AF" />
            <Text style={styles.detailLabel}>Added:</Text>
            <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.stockStatusContainer}>
          <View style={[styles.stockStatusBadge, { backgroundColor: stockColor + '20' }]}>
            <Text style={[styles.stockStatusText, { color: stockColor }]}>
              {getStockStatusText(item.total_stock)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading your listings...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} tintColor="#F97316" />
        }
      >
        <View style={styles.container}>
          {/* Header */}
          {/* <View style={styles.header}>
            <View>
              <Text style={styles.title}>Personal Listings</Text>
              <Text style={styles.subtitle}>
                Manage your personal product listings (max {PRODUCT_LIMIT} products)
              </Text>
            </View>
          </View> */}

          {/* Limit Alert */}
          {isLimitReached ? (
            <View style={[styles.alertCard, styles.alertError]}>
              <MaterialIcons name="warning" size={20} color="#EF4444" />
              <Text style={styles.alertErrorText}>
                You have reached the maximum limit of {PRODUCT_LIMIT} products. 
                You cannot add more products until you delete some existing ones.
              </Text>
            </View>
          ) : isNearLimit ? (
            <View style={[styles.alertCard, styles.alertWarning]}>
              <MaterialIcons name="info" size={20} color="#F59E0B" />
              <Text style={styles.alertWarningText}>
                You only have {productLimitInfo.remaining} slot{productLimitInfo.remaining !== 1 ? 's' : ''} remaining out of {PRODUCT_LIMIT}. 
                Consider managing your listings.
              </Text>
            </View>
          ) : null}

          {/* Stats Cards */}
          {/* <View style={styles.statsContainer}>
            <View style={[styles.statsCard, styles.statsCardLarge]}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsLabel}>Product Limit Usage</Text>
                <Text style={[
                  styles.statsValue,
                  isLimitReached && styles.statsValueError,
                  isNearLimit && !isLimitReached && styles.statsValueWarning
                ]}>
                  {productLimitInfo.current_count}/{productLimitInfo.limit}
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${usagePercentage}%` },
                      isLimitReached && styles.progressFillError,
                      isNearLimit && !isLimitReached && styles.progressFillWarning
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Used: {productLimitInfo.current_count}</Text>
                <Text style={styles.progressLabel}>Remaining: {productLimitInfo.remaining}</Text>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statsLargeNumber}>{products.length}</Text>
                  <Text style={styles.statsSmallLabel}>Total Products</Text>
                </View>
                <View style={[styles.statsIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="inventory" size={20} color="#3B82F6" />
                </View>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={[styles.statsLargeNumber, { color: '#10B981' }]}>
                    {products.filter(p => p.status === 'active').length}
                  </Text>
                  <Text style={styles.statsSmallLabel}>Active</Text>
                </View>
                <View style={[styles.statsIcon, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                </View>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={[styles.statsLargeNumber, { color: '#3B82F6' }]}>
                    {products.filter(p => p.upload_status === 'published').length}
                  </Text>
                  <Text style={styles.statsSmallLabel}>Published</Text>
                </View>
                <View style={[styles.statsIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="visibility" size={20} color="#3B82F6" />
                </View>
              </View>
            </View>
          </View> */}

          {/* Add Product Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              isLimitReached && styles.addButtonDisabled
            ]}
            onPress={() => !isLimitReached && router.push('/customer/components/listing-create-product')}
            disabled={isLimitReached}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>

          {/* Products List */}
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="inventory" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>
                You haven't created any personal listings yet.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  isLimitReached && styles.addButtonDisabled
                ]}
                // onPress={() => !isLimitReached && router.push('/customer/create-product')}
                disabled={isLimitReached}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Your First Product</Text>
              </TouchableOpacity>
              {isLimitReached && (
                <Text style={styles.limitWarningText}>
                  You've reached the maximum limit of {PRODUCT_LIMIT} products. Delete some to create new ones.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.listContent}>
              {products.map((p) => (
                <View key={p.id}>
                  {renderProductCard({ item: p })}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </View>
          )}

          {/* Action Modal */}
          <Modal
            visible={actionModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setActionModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setActionModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Product Actions</Text>
                  <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                    <MaterialIcons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedProduct && (
                  <>
                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleViewProduct(selectedProduct.id);
                      }}
                    >
                      <MaterialIcons name="visibility" size={20} color="#3B82F6" />
                      <Text style={styles.modalItemText}>View Product</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleEditProduct(selectedProduct.id);
                      }}
                    >
                      <MaterialIcons name="edit" size={20} color="#F97316" />
                      <Text style={styles.modalItemText}>Edit Product</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleToggleUploadStatus(selectedProduct);
                      }}
                    >
                      <MaterialIcons 
                        name={selectedProduct.upload_status === 'published' ? 'visibility-off' : 'visibility'} 
                        size={20} 
                        color="#8B5CF6" 
                      />
                      <Text style={styles.modalItemText}>
                        {selectedProduct.upload_status === 'published' ? 'Unpublish' : 'Publish'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleToggleStatus(selectedProduct);
                      }}
                    >
                      <MaterialIcons 
                        name={selectedProduct.status === 'active' ? 'block' : 'check-circle'} 
                        size={20} 
                        color="#10B981" 
                      />
                      <Text style={styles.modalItemText}>
                        {selectedProduct.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.modalDivider} />

                    <TouchableOpacity 
                      style={[styles.modalItem, styles.modalItemDelete]}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleDeleteProduct(selectedProduct.id);
                      }}
                    >
                      <MaterialIcons name="delete" size={20} color="#EF4444" />
                      <Text style={styles.modalItemDeleteText}>Delete Product</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </CustomerLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingBottom: Platform.OS === 'ios' ? 74 : 64
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666'
  },
  header: {
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  alertWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    minWidth: '48%',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsCardLarge: {
    width: '100%',
    marginBottom: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsValueError: {
    color: '#EF4444',
  },
  statsValueWarning: {
    color: '#F59E0B',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressFillError: {
    backgroundColor: '#EF4444',
  },
  progressFillWarning: {
    backgroundColor: '#F59E0B',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLargeNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statsSmallLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moreButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 55,
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  stockStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  limitWarningText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modalItemText: {
    fontSize: 14,
    color: '#374151',
  },
  modalItemDelete: {
    marginTop: 4,
  },
  modalItemDeleteText: {
    fontSize: 14,
    color: '#EF4444',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
});