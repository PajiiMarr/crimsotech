// app/customer/comgift.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../guards/RoleGuard';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

interface GiftVariant {
  id: string;
  title: string;
  quantity: number;
  sku_code?: string;
  critical_trigger?: number;
  is_active: boolean;
  image?: string | null;
}

interface Gift {
  id: string;
  name: string;
  description: string;
  total_stock: number;
  condition: string;
  status: 'active' | 'inactive' | 'draft';
  upload_status: 'draft' | 'published' | 'archived';
  category: { id: string; name: string } | null;
  category_admin: { id: string; name: string } | null;
  variants: GiftVariant[];
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

export default function Comgift() {
  const { userId } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [giftLimitInfo, setGiftLimitInfo] = useState<ProductLimitInfo | null>(null);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const fetchGifts = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching gifts for user:', userId);
      const response = await AxiosInstance.get('/customer-products/', {
        params: { customer_id: userId }
      });

      console.log('API Response:', response.data);

      if (response.data && response.data.success) {
        // Filter products with price = 0 (gifts)
        const zeroPriced = (response.data.products || []).filter((p: any) => {
          const price = parseFloat(p.price || p.starting_price || '0');
          console.log(`Product ${p.name}: price=${price}, starting_price=${p.starting_price}`);
          return !isNaN(price) && price === 0;
        }).map((p: any) => {
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

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            total_stock: totalStock,
            condition: p.condition || 'New',
            status: p.status || 'active',
            upload_status: p.upload_status || 'draft',
            category: p.category || null,
            category_admin: p.category_admin || null,
            variants: p.variants || [],
            created_at: p.created_at,
            updated_at: p.updated_at,
            is_removed: p.is_removed,
            removal_reason: p.removal_reason
          };
        });

        console.log('Filtered gifts:', zeroPriced);
        setGifts(zeroPriced);
        
        setGiftLimitInfo({
          current_count: zeroPriced.length,
          limit: 500,
          remaining: 500 - zeroPriced.length
        });
      } else {
        setGifts([]);
        setGiftLimitInfo({
          current_count: 0,
          limit: 500,
          remaining: 500
        });
      }
    } catch (error) {
      console.error('Error fetching gifts:', error);
      setGifts([]);
      setGiftLimitInfo({
        current_count: 0,
        limit: 500,
        remaining: 500
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGifts();
  };

  const handleViewGift = (giftId: string) => {
    router.push(`/customer/view-product?productId=${giftId}`);
  };

  const handleEditGift = (giftId: string) => {
    // router.push(`/customer/edit-gift/${giftId}`);
    Alert.alert('Coming Soon', 'Edit gift functionality will be available soon.');
  };

  const handleDeleteGift = (giftId: string) => {
    Alert.alert(
      'Delete Gift',
      'Are you sure you want to delete this gift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Delete gift:', giftId);
              // await AxiosInstance.delete(`/customer-products-viewset/${giftId}/?user_id=${userId}`);
              
              setGifts(prev => prev.filter(g => g.id !== giftId));
              if (giftLimitInfo) {
                setGiftLimitInfo({
                  ...giftLimitInfo,
                  current_count: giftLimitInfo.current_count - 1,
                  remaining: giftLimitInfo.remaining + 1
                });
              }
            } catch (error) {
              console.error('Error deleting gift:', error);
              Alert.alert('Error', 'Failed to delete gift');
            }
          }
        }
      ]
    );
  };

  const handleToggleUploadStatus = (gift: Gift) => {
    const newStatus = gift.upload_status === 'published' ? 'draft' : 'published';
    Alert.alert(
      `${newStatus === 'published' ? 'Publish' : 'Unpublish'} Gift`,
      `Are you sure you want to ${newStatus === 'published' ? 'publish' : 'unpublish'} this gift?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log('Toggle upload status:', gift.id, newStatus);
              // await AxiosInstance.patch(`/customer-products-viewset/${gift.id}/`, { upload_status: newStatus });
              
              setGifts(prev => prev.map(g => 
                g.id === gift.id ? { ...g, upload_status: newStatus } : g
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

  const handleToggleStatus = (gift: Gift) => {
    const newStatus = gift.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Gift`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this gift?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log('Toggle status:', gift.id, newStatus);
              // await AxiosInstance.patch(`/customer-products-viewset/${gift.id}/`, { status: newStatus });
              
              setGifts(prev => prev.map(g => 
                g.id === gift.id ? { ...g, status: newStatus } : g
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

  const openActionModal = (gift: Gift) => {
    setSelectedGift(gift);
    setActionModalVisible(true);
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return '#EF4444';
    if (stock < 10) return '#8B5CF6';
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

  const getConditionBadgeColor = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('new')) {
      return { bg: '#2563EB', text: '#FFFFFF' };
    }
    if (conditionLower.includes('like new')) {
      return { bg: '#DBEAFE', text: '#1E40AF' };
    }
    if (conditionLower.includes('refurbished')) {
      return { bg: '#E5E7EB', text: '#374151' };
    }
    if (conditionLower.includes('excellent')) {
      return { bg: '#D1FAE5', text: '#065F46' };
    }
    if (conditionLower.includes('good')) {
      return { bg: '#FEF3C7', text: '#92400E' };
    }
    
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  const getCategoryName = (gift: Gift) => {
    return gift.category?.name || gift.category_admin?.name || 'No Category';
  };

  const getVariantSummary = (variants: GiftVariant[]) => {
    if (!variants || variants.length === 0) return 'No variants';
    const activeVariants = variants.filter(v => v.is_active !== false).length;
    return `${activeVariants} variant${activeVariants !== 1 ? 's' : ''}`;
  };

  const renderGiftCard = ({ item }: { item: Gift }) => {
    const variantImage = item.variants?.find(v => v.image)?.image;
    const statusColors = getStatusBadgeColor(item.status);
    const uploadStatusColors = getUploadStatusBadgeColor(item.upload_status);
    const conditionColors = getConditionBadgeColor(item.condition);
    const stockColor = getStockStatusColor(item.total_stock);
    const variantSummary = getVariantSummary(item.variants);

    return (
      <TouchableOpacity
        style={styles.giftCard}
        onPress={() => handleViewGift(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.giftHeader}>
          <View style={styles.giftImageContainer}>
            {variantImage ? (
              <Image 
                source={{ uri: formatImageUrl(variantImage) || '' }} 
                style={styles.giftImage}
                defaultSource={require('../../assets/images/icon.png')}
              />
            ) : (
              <View style={styles.giftImagePlaceholder}>
                <MaterialCommunityIcons name="gift" size={24} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={styles.giftInfo}>
            <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.giftDescription} numberOfLines={2}>
              {item.description?.substring(0, 80)}{item.description?.length > 80 ? '...' : ''}
            </Text>
            
            {variantSummary !== 'No variants' && (
              <Text style={styles.variantSummary}>{variantSummary}</Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => openActionModal(item)}
          >
            <MaterialIcons name="more-vert" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.giftDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={14} color="#9CA3AF" />
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{getCategoryName(item)}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.conditionBadge, { backgroundColor: conditionColors.bg }]}>
              <Text style={[styles.conditionText, { color: conditionColors.text }]}>
                {item.condition}
              </Text>
            </View>

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

          <View style={styles.stockRow}>
            <MaterialIcons name="inventory" size={14} color="#9CA3AF" />
            <Text style={styles.stockLabel}>Stock:</Text>
            <Text style={[styles.stockValue, { color: stockColor }]}>
              {item.total_stock}
            </Text>
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                {getStockStatusText(item.total_stock)}
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <MaterialIcons name="event" size={14} color="#9CA3AF" />
            <Text style={styles.dateLabel}>Added:</Text>
            <Text style={styles.dateValue}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout disableScroll={true}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading your gifts...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

    return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout disableScroll={true}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>My Gifts</Text>
                <Text style={styles.subtitle}>
                  Manage your gifted items
                </Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={fetchGifts}
                  disabled={refreshing}
                >
                  <MaterialIcons 
                    name="refresh" 
                    size={20} 
                    color="#8B5CF6" 
                    style={refreshing ? styles.spinning : undefined} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push('/customer/components/listing-create-gift')}
                >
                  <MaterialIcons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Gift</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Stats Cards */}
          {/* <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View>
                  <Text style={styles.statNumber}>{gifts.length}</Text>
                  <Text style={styles.statLabel}>Total Gifts</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons name="gift" size={20} color="#8B5CF6" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>
                    {gifts.filter(g => g.status === 'active').length}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View>
                  <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
                    {gifts.filter(g => g.upload_status === 'published').length}
                  </Text>
                  <Text style={styles.statLabel}>Published</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="visibility" size={20} color="#3B82F6" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View>
                  <Text style={[styles.statNumber, { color: '#F97316' }]}>
                    {gifts.filter(g => g.total_stock === 0).length}
                  </Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#FFEDD5' }]}>
                  <MaterialIcons name="inventory" size={20} color="#F97316" />
                </View>
              </View>
            </View>
          </View> */}

          {/* Gifts List */}
          {gifts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="gift" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No gifts found</Text>
              <Text style={styles.emptyText}>
                You haven't created any gifts yet. Gifts are products with price set to 0.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/customer/components/listing-create-gift')}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Your First Gift</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={gifts}
              renderItem={renderGiftCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  colors={['#8B5CF6']} 
                  tintColor="#8B5CF6"
                />
              }
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
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
                  <Text style={styles.modalTitle}>Gift Actions</Text>
                  <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                    <MaterialIcons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedGift && (
                  <>
                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleViewGift(selectedGift.id);
                      }}
                    >
                      <MaterialIcons name="visibility" size={20} color="#3B82F6" />
                      <Text style={styles.modalItemText}>View Gift</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleEditGift(selectedGift.id);
                      }}
                    >
                      <MaterialIcons name="edit" size={20} color="#8B5CF6" />
                      <Text style={styles.modalItemText}>Edit Gift</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleToggleUploadStatus(selectedGift);
                      }}
                    >
                      <MaterialIcons 
                        name={selectedGift.upload_status === 'published' ? 'visibility-off' : 'visibility'} 
                        size={20} 
                        color="#10B981" 
                      />
                      <Text style={styles.modalItemText}>
                        {selectedGift.upload_status === 'published' ? 'Unpublish' : 'Publish'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleToggleStatus(selectedGift);
                      }}
                    >
                      <MaterialIcons 
                        name={selectedGift.status === 'active' ? 'block' : 'check-circle'} 
                        size={20} 
                        color="#F59E0B" 
                      />
                      <Text style={styles.modalItemText}>
                        {selectedGift.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.modalDivider} />

                    <TouchableOpacity 
                      style={[styles.modalItem, styles.modalItemDelete]}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleDeleteGift(selectedGift.id);
                      }}
                    >
                      <MaterialIcons name="delete" size={20} color="#EF4444" />
                      <Text style={styles.modalItemDeleteText}>Delete Gift</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    minWidth: '47%',
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  giftCard: {
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
  giftHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  giftImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  giftImage: {
    width: '100%',
    height: '100%',
  },
  giftImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftInfo: {
    flex: 1,
  },
  giftName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  giftDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 4,
  },
  variantSummary: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  moreButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 60,
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 40,
  },
  stockValue: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 40,
  },
  dateValue: {
    fontSize: 12,
    color: '#111827',
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: '#8B5CF6',
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