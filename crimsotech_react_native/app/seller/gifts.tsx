// app/seller/gifts.tsx
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

// Types matching web version
interface Variant {
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
  status: 'active' | 'inactive' | 'draft';
  upload_status: 'draft' | 'published' | 'archived';
  condition: string;
  category: {
    id: string;
    name: string;
  } | null;
  category_admin: {
    id: string;
    name: string;
  } | null;
  variants: Variant[];
  created_at: string;
  updated_at: string;
  is_removed?: boolean;
  removal_reason?: string;
}

interface GiftLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
}

export default function Gifts() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [giftLimitInfo, setGiftLimitInfo] = useState<GiftLimitInfo | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (shopId && userId) {
      fetchGifts();
    }
  }, [shopId, userId]);

  useEffect(() => {
    filterGifts();
  }, [searchQuery, selectedFilter, gifts]);

  const fetchGifts = async () => {
    if (!userId || !shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId, shop_id: shopId }
      });

      if (response.data && response.data.success) {
        // Filter products with price = 0 (gifts)
        const zeroPriced = (response.data.products || []).filter((p: any) => {
          const price = parseFloat(p.price || p.starting_price || '0');
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
            created_at: p.created_at,
            updated_at: p.updated_at,
            is_removed: p.is_removed,
            removal_reason: p.removal_reason
          };
        });

        setGifts(zeroPriced);
        
        if (response.data.product_limit_info) {
          setGiftLimitInfo(response.data.product_limit_info);
        }
      } else {
        setGifts([]);
      }
    } catch (error) {
      console.error('Error fetching gifts:', error);
      setGifts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGifts();
  };

  const filterGifts = () => {
    let filtered = [...gifts];

    if (searchQuery) {
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(g => g.status === 'active');
        break;
      case 'inactive':
        filtered = filtered.filter(g => g.status === 'inactive');
        break;
      case 'published':
        filtered = filtered.filter(g => g.upload_status === 'published');
        break;
      case 'draft':
        filtered = filtered.filter(g => g.upload_status === 'draft');
        break;
      case 'archived':
        filtered = filtered.filter(g => g.upload_status === 'archived');
        break;
      case 'outOfStock':
        filtered = filtered.filter(g => g.total_stock === 0);
        break;
      default:
        break;
    }

    setFilteredGifts(filtered);
  };

  const handleToggleStatus = async (giftId: string, currentStatus: string) => {
    setActionLoading(giftId);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      // Add your status update API call here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setGifts(prev => prev.map(g => 
        g.id === giftId ? { ...g, status: newStatus as Gift['status'] } : g
      ));
      setShowActionModal(false);
      Alert.alert('Success', `Gift ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update gift status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUploadStatus = async (giftId: string, currentStatus: string) => {
    setActionLoading(giftId);
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      // Add your status update API call here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setGifts(prev => prev.map(g => 
        g.id === giftId ? { ...g, upload_status: newStatus as Gift['upload_status'] } : g
      ));
      setShowActionModal(false);
      Alert.alert('Success', `Gift ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update gift upload status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    Alert.alert(
      'Delete Gift',
      'Are you sure you want to delete this gift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(giftId);
            try {
              // Add your delete API call here
              await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
              
              setGifts(prev => prev.filter(g => g.id !== giftId));
              setShowActionModal(false);
              
              if (giftLimitInfo) {
                setGiftLimitInfo({
                  ...giftLimitInfo,
                  current_count: giftLimitInfo.current_count - 1,
                  remaining: giftLimitInfo.remaining + 1
                });
              }
              
              Alert.alert('Success', 'Gift deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete gift');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleViewGift = (giftId: string) => {
    // router.push(`/seller/gift/${giftId}?shopId=${shopId}`);
  };

  const handleEditGift = (giftId: string) => {
    router.push(`/seller/components/seller-create-gift?productId=${giftId}&shopId=${shopId}`);
  };

  const handleApplyGift = (giftId: string) => {
    router.push(`/seller/apply-gift?giftId=${giftId}&shopId=${shopId}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (gift: Gift) => {
    return gift.category?.name || gift.category_admin?.name || 'No Category';
  };

  const getGiftImage = (gift: Gift): string | null => {
    const variantWithImage = gift.variants?.find(v => v.image);
    return variantWithImage?.image || null;
  };

  const stats = {
    total: gifts.length,
    active: gifts.filter(g => g.status === 'active').length,
    published: gifts.filter(g => g.upload_status === 'published').length,
    outOfStock: gifts.filter(g => g.total_stock === 0).length,
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
            <Text style={styles.modalTitle}>Filter Gifts</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.filterSectionTitle}>Status</Text>
          {[
            { value: 'all', label: 'All Gifts', icon: 'gift-outline' },
            { value: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
            { value: 'inactive', label: 'Inactive', icon: 'close-circle-outline' },
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
                color={selectedFilter === filter.value ? '#9333EA' : '#64748B'} 
              />
              <Text style={[
                styles.filterOptionText,
                selectedFilter === filter.value && styles.filterOptionTextSelected
              ]}>
                {filter.label}
              </Text>
              {selectedFilter === filter.value && (
                <Ionicons name="checkmark" size={20} color="#9333EA" />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.filterSectionTitle, { marginTop: 16 }]}>Upload Status</Text>
          {[
            { value: 'published', label: 'Published', icon: 'globe-outline' },
            { value: 'draft', label: 'Draft', icon: 'document-text-outline' },
            { value: 'archived', label: 'Archived', icon: 'archive-outline' },
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
                color={selectedFilter === filter.value ? '#9333EA' : '#64748B'} 
              />
              <Text style={[
                styles.filterOptionText,
                selectedFilter === filter.value && styles.filterOptionTextSelected
              ]}>
                {filter.label}
              </Text>
              {selectedFilter === filter.value && (
                <Ionicons name="checkmark" size={20} color="#9333EA" />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.filterSectionTitle, { marginTop: 16 }]}>Stock</Text>
          {[
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
                color={selectedFilter === filter.value ? '#9333EA' : '#64748B'} 
              />
              <Text style={[
                styles.filterOptionText,
                selectedFilter === filter.value && styles.filterOptionTextSelected
              ]}>
                {filter.label}
              </Text>
              {selectedFilter === filter.value && (
                <Ionicons name="checkmark" size={20} color="#9333EA" />
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
            <Text style={styles.modalTitle}>Gift Actions</Text>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {selectedGift && (
            <View style={styles.actionList}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setShowActionModal(false);
                  handleViewGift(selectedGift.id);
                }}
              >
                <Ionicons name="eye-outline" size={22} color="#9333EA" />
                <Text style={styles.actionItemText}>View Gift</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setShowActionModal(false);
                  handleApplyGift(selectedGift.id);
                }}
              >
                <Ionicons name="gift-outline" size={22} color="#9333EA" />
                <Text style={styles.actionItemText}>Apply Gift</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setShowActionModal(false);
                  handleEditGift(selectedGift.id);
                }}
              >
                <Ionicons name="create-outline" size={22} color="#9333EA" />
                <Text style={styles.actionItemText}>Edit Gift</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleToggleUploadStatus(selectedGift.id, selectedGift.upload_status)}
                disabled={actionLoading === selectedGift.id}
              >
                {actionLoading === selectedGift.id ? (
                  <ActivityIndicator size="small" color="#9333EA" />
                ) : (
                  <>
                    <Ionicons 
                      name={selectedGift.upload_status === 'published' ? 'cloud-offline-outline' : 'globe-outline'} 
                      size={22} 
                      color="#9333EA" 
                    />
                    <Text style={styles.actionItemText}>
                      {selectedGift.upload_status === 'published' ? 'Unpublish' : 'Publish'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => handleToggleStatus(selectedGift.id, selectedGift.status)}
                disabled={actionLoading === selectedGift.id}
              >
                {actionLoading === selectedGift.id ? (
                  <ActivityIndicator size="small" color="#9333EA" />
                ) : (
                  <>
                    <Ionicons 
                      name={selectedGift.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} 
                      size={22} 
                      color="#9333EA" 
                    />
                    <Text style={styles.actionItemText}>
                      {selectedGift.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity 
                style={[styles.actionItem, styles.actionItemDestructive]}
                onPress={() => {
                  setShowActionModal(false);
                  handleDeleteGift(selectedGift.id);
                }}
                disabled={actionLoading === selectedGift.id}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.actionItemText, styles.actionItemTextDestructive]}>Delete Gift</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const GiftCard = ({ gift }: { gift: Gift }) => {
    const imageUrl = getGiftImage(gift);
    const [imageError, setImageError] = useState(false);

    const getStockStatus = () => {
      if (gift.total_stock === 0) {
        return { label: 'Out of Stock', color: '#EF4444', bg: '#FEE2E2' };
      }
      if (gift.total_stock < 10) {
        return { label: `Low Stock (${gift.total_stock})`, color: '#F59E0B', bg: '#FEF3C7' };
      }
      return { label: `In Stock (${gift.total_stock})`, color: '#10B981', bg: '#D1FAE5' };
    };

    const getStatusBadge = () => {
      if (gift.status === 'active') {
        return { label: 'Active', color: '#10B981', bg: '#D1FAE5' };
      }
      return { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' };
    };

    const getUploadStatusBadge = () => {
      switch (gift.upload_status) {
        case 'published':
          return { label: 'Published', color: '#8B5CF6', bg: '#EDE9FE' };
        case 'draft':
          return { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' };
        case 'archived':
          return { label: 'Archived', color: '#F59E0B', bg: '#FEF3C7' };
        default:
          return { label: gift.upload_status, color: '#6B7280', bg: '#F3F4F6' };
      }
    };

    const stockStatus = getStockStatus();
    const statusBadge = getStatusBadge();
    const uploadBadge = getUploadStatusBadge();

    return (
      <TouchableOpacity
        style={styles.giftCard}
        onPress={() => {
          setSelectedGift(gift);
          setShowActionModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.giftCardContent}>
          {/* Image */}
          <View style={styles.giftImageContainer}>
            {imageUrl && !imageError ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.giftImage}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.giftImage, styles.giftImagePlaceholder]}>
                <Ionicons name="gift-outline" size={24} color="#CBD5E1" />
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.giftDetails}>
            <View style={styles.giftHeader}>
              <Text style={styles.giftName} numberOfLines={1}>
                {gift.name}
              </Text>
              <TouchableOpacity 
                style={styles.threeDotsButton}
                onPress={() => {
                  setSelectedGift(gift);
                  setShowActionModal(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.giftCategory} numberOfLines={1}>
              {getCategoryName(gift)} • {gift.condition}
            </Text>

            <Text style={styles.giftDescription} numberOfLines={2}>
              {gift.description}
            </Text>

            <View style={styles.giftMeta}>
              <View style={[styles.stockBadge, { backgroundColor: stockStatus.bg }]}>
                <Text style={[styles.stockText, { color: stockStatus.color }]}>
                  {stockStatus.label}
                </Text>
              </View>

              <View style={styles.badgeContainer}>
                <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
                <Text style={styles.statusText}>{statusBadge.label}</Text>
              </View>

              <View style={styles.badgeContainer}>
                <Ionicons 
                  name={gift.upload_status === 'published' ? 'globe-outline' : 'document-text-outline'} 
                  size={12} 
                  color={uploadBadge.color} 
                />
                <Text style={[styles.statusText, { color: uploadBadge.color }]}>
                  {uploadBadge.label}
                </Text>
              </View>
            </View>

            <Text style={styles.giftDate}>
              Added {formatDate(gift.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="gift-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view gifts</Text>
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
          <ActivityIndicator size="large" color="#9333EA" />
          <Text style={styles.loadingText}>Loading gifts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333EA" />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Gift Management</Text>
              <Text style={styles.subtitle}>Manage your loyalty program gifts and rewards</Text>
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push(`/seller/components/seller-create-gift?shopId=${shopId}`)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Add Gift</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Gifts</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="gift" size={20} color="#9333EA" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.published}</Text>
                  <Text style={styles.statLabel}>Published</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="globe" size={20} color="#8B5CF6" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.outOfStock}</Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                </View>
              </View>
            </View>
          </View>

          {/* Gift Limit */}
          {giftLimitInfo && (
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Text style={styles.limitTitle}>Gift Limit</Text>
                <Text style={styles.limitText}>
                  {giftLimitInfo.current_count} / {giftLimitInfo.limit} used
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min((giftLimitInfo.current_count / giftLimitInfo.limit) * 100, 100)}%`,
                      backgroundColor: '#9333EA'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.limitRemaining}>{giftLimitInfo.remaining} slots remaining</Text>
            </View>
          )}

          {/* Search, Filter and Add Row */}
          <View style={styles.actionRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search gifts by name..."
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
                color={selectedFilter !== 'all' ? '#9333EA' : '#64748B'} 
              />
            </TouchableOpacity>
          </View>

          {/* Gifts List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gifts</Text>
              <Text style={styles.sectionCount}>
                {filteredGifts.length} gift{filteredGifts.length !== 1 ? 's' : ''} found
                {giftLimitInfo && ` • ${giftLimitInfo.remaining} slots left`}
              </Text>
            </View>

            {filteredGifts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No gifts found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Gifts are products with price set to 0. Create your first gift to start.'}
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
                    style={styles.createGiftButton}
                    onPress={() => router.push(`/seller/create-gift?shopId=${shopId}`)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.createGiftButtonText}>Create Your First Gift</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredGifts.map((gift) => (
                <GiftCard key={gift.id} gift={gift} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <FilterModal />
      <ActionModal />
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
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333EA',
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
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B21A5',
  },
  limitText: {
    fontSize: 13,
    color: '#9333EA',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E9D5FF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  limitRemaining: {
    fontSize: 12,
    color: '#6B21A5',
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
    borderColor: '#9333EA',
    backgroundColor: '#FAF5FF',
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
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  giftCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  giftImageContainer: {
    marginRight: 12,
  },
  giftImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  giftImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftDetails: {
    flex: 1,
  },
  giftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  giftName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  threeDotsButton: {
    padding: 4,
  },
  giftCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  giftDescription: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 16,
  },
  giftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280',
  },
  giftDate: {
    fontSize: 10,
    color: '#9CA3AF',
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
  createGiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333EA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  createGiftButtonText: {
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
    backgroundColor: '#9333EA',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: '#FAF5FF',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
  },
  filterOptionTextSelected: {
    color: '#9333EA',
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
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  actionItemDestructive: {
    marginTop: 4,
  },
  actionItemTextDestructive: {
    color: '#EF4444',
  },
});