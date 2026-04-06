import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import {
  Bell,
  Package,
  ShoppingCart,
  Tag,
  Wallet,
  Truck,
  AlertTriangle,
  Info,
  Filter,
  Check,
  X,
  Trash2,
  CheckCircle,
} from 'lucide-react-native';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type NotificationType = 'order_update' | 'refund_update' | 'replacement' | 'delivery' | 'payment' | 'system' | 'message' | 'dispute';

type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_type?: string;
  action_id?: string;
  time_ago?: string;
};

type ShopLite = {
  id: string;
};

const typeMeta = {
  order_update: { icon: ShoppingCart, bg: '#FEF3C7', accent: '#B45309' },
  refund_update: { icon: Wallet, bg: '#FCE7F3', accent: '#BE185D' },
  replacement: { icon: Package, bg: '#E0F2FE', accent: '#0284C7' },
  delivery: { icon: Truck, bg: '#EDE9FE', accent: '#7C3AED' },
  payment: { icon: Wallet, bg: '#DCFCE7', accent: '#16A34A' },
  system: { icon: Info, bg: '#E2E8F0', accent: '#334155' },
  message: { icon: Bell, bg: '#E0F2FE', accent: '#0284C7' },
  dispute: { icon: AlertTriangle, bg: '#FFE4E6', accent: '#E11D48' },
} as const;

const getTypeMeta = (type: NotificationType) => {
  return typeMeta[type] || typeMeta.system;
};

export default function SellerNotificationScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ shopId?: string }>();
  const [activeShopId, setActiveShopId] = useState<string>(params.shopId ? String(params.shopId) : '');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [activeFilter, notifications]);

  const fetchFallbackShop = async () => {
    if (!userId) return '';
    try {
      const res = await AxiosInstance.get('/customer-shops/', { params: { customer_id: userId } });
      const shops: ShopLite[] = res.data?.shops || [];
      return shops.length > 0 ? String(shops[0].id) : '';
    } catch {
      return '';
    }
  };

  const fetchNotifications = useCallback(async (refresh = false, pageNum = 1) => {
    if (!userId) return;
    
    if (refresh) {
      setLoading(true);
      setPage(1);
    } else if (pageNum > 1) {
      setLoadingMore(true);
    }
    
    try {
      let shopId = activeShopId;
      if (!shopId) {
        shopId = await fetchFallbackShop();
        if (shopId) setActiveShopId(shopId);
      }

      if (!shopId) {
        setNotifications([]);
        setTotalCount(0);
        setUnreadCount(0);
        return;
      }

      // Build query params
      const params: any = {
        page: pageNum,
        page_size: 20,
      };
      
      // Filter by read status
      if (activeFilter === 'unread') {
        params.is_read = false;
      }
      
      const response = await AxiosInstance.get('/notifications/', {
        headers: { 'X-User-Id': userId },
        params: params
      });
      
      if (response.data) {
        let newNotifications: AppNotification[] = [];
        let total = 0;
        let unread = 0;
        
        if (response.data.results) {
          newNotifications = response.data.results;
          total = response.data.count;
          unread = response.data.unread_count || 0;
          setHasMore(!!response.data.next);
        } else if (response.data.notifications) {
          newNotifications = response.data.notifications;
          total = response.data.total_count || 0;
          unread = response.data.unread_count || 0;
          setHasMore(false);
        } else {
          newNotifications = response.data;
          setHasMore(false);
        }
        
        if (refresh) {
          setNotifications(newNotifications);
          setPage(1);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setTotalCount(total);
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to load seller notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeShopId, userId, activeFilter]);

  useEffect(() => {
    if (userId) {
      fetchNotifications(true);
    }
  }, [userId, activeShopId, activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(false, nextPage);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await AxiosInstance.patch(`/notifications/${id}/`, 
        { is_read: true },
        { headers: { 'X-User-Id': userId } }
      );
      
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await AxiosInstance.post('/notifications/bulk-action/', 
        { mark_all_as_read: true },
        { headers: { 'X-User-Id': userId } }
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (id: string, isRead: boolean) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!isRead) {
                await AxiosInstance.delete(`/notifications/${id}/force-delete/`, {
                  headers: { 'X-User-Id': userId }
                });
              } else {
                await AxiosInstance.delete(`/notifications/${id}/`, {
                  headers: { 'X-User-Id': userId }
                });
              }
              
              setNotifications(prev => prev.filter(n => n.id !== id));
              if (!isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
              
              Alert.alert('Success', 'Notification deleted');
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAllRead = async () => {
    Alert.alert(
      'Delete All Read',
      'Are you sure you want to delete all read notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AxiosInstance.delete('/notifications/delete-all-read/', {
                headers: { 'X-User-Id': userId }
              });
              
              setNotifications(prev => prev.filter(n => !n.is_read));
              
              Alert.alert('Success', 'All read notifications deleted');
            } catch (error) {
              console.error('Error deleting all read:', error);
              Alert.alert('Error', 'Failed to delete read notifications');
            }
          }
        }
      ]
    );
  };

  const handleFilterSelect = (filter: 'all' | 'unread') => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    
    if (n.action_url) {
      try {
        const route = n.action_url.replace(/^\//, '');
        router.push(route as any);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else if (n.action_type === 'view_order' && n.action_id) {
      router.push({
        pathname: '/seller/orders',
        params: { orderId: n.action_id }
      } as any);
    } else if (n.action_type === 'view_refund' && n.action_id) {
      router.push({
        pathname: '/seller/refunds',
        params: { refundId: n.action_id }
      } as any);
    }
  };

  const formatTimeLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Notifications</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.filterOption, activeFilter === 'all' && styles.filterOptionActive]}
            onPress={() => handleFilterSelect('all')}
          >
            <Bell size={24} color={activeFilter === 'all' ? '#6366F1' : '#6B7280'} />
            <View style={styles.filterOptionTextContainer}>
              <Text style={[styles.filterOptionTitle, activeFilter === 'all' && styles.filterOptionTitleActive]}>
                All Notifications
              </Text>
              <Text style={styles.filterOptionSubtitle}>
                Show all notifications ({totalCount})
              </Text>
            </View>
            {activeFilter === 'all' && (
              <Check size={20} color="#6366F1" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterOption, activeFilter === 'unread' && styles.filterOptionActive]}
            onPress={() => handleFilterSelect('unread')}
          >
            <Bell size={24} color={activeFilter === 'unread' ? '#6366F1' : '#6B7280'} />
            <View style={styles.filterOptionTextContainer}>
              <Text style={[styles.filterOptionTitle, activeFilter === 'unread' && styles.filterOptionTitleActive]}>
                Unread Only
              </Text>
              <Text style={styles.filterOptionSubtitle}>
                Show only unread notifications ({unreadCount})
              </Text>
            </View>
            {activeFilter === 'unread' && (
              <Check size={20} color="#6366F1" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#0F172A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onScroll={({ nativeEvent }) => {
          const isNearBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 100;
          if (isNearBottom && hasMore && !loadingMore) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconCircle}>
              <Bell size={18} color="#0F172A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Seller Alerts</Text>
              <Text style={styles.headerSubtitle}>
                {activeFilter === 'unread' 
                  ? `${unreadCount} unread` 
                  : totalCount > 0 ? `${totalCount} total` : 'All caught up'}
              </Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, activeFilter === 'unread' && styles.filterActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={18} color={activeFilter === 'unread' ? '#6366F1' : '#64748B'} />
              {activeFilter === 'unread' && <View style={styles.activeFilterDot} />}
            </TouchableOpacity>

            {totalCount > 0 && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleDeleteAllRead}
              >
                <Trash2 size={18} color="#64748B" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle size={14} color={unreadCount === 0 ? '#94A3B8' : '#4F46E5'} />
              <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all read</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!activeShopId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No shop selected</Text>
            <Text style={styles.emptyText}>Choose a shop to view seller notifications.</Text>
            <TouchableOpacity onPress={() => router.push('/customer/shops')} style={styles.shopButton}>
              <Text style={styles.shopButtonText}>Choose Shop</Text>
            </TouchableOpacity>
          </View>
        ) : visibleNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>Recent seller updates will show up here.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {visibleNotifications.map((item) => {
              const meta = getTypeMeta(item.type);
              const Icon = meta.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notificationRow, !item.is_read && styles.unreadRow]}
                  onPress={() => handleOpenNotification(item)}
                  onLongPress={() => handleDeleteNotification(item.id, item.is_read)}
                  activeOpacity={0.85}
                >
                  {!item.is_read && <View style={styles.highlightBar} />}
                  <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                    <Icon size={18} color={meta.accent} />
                  </View>
                  <View style={styles.textBlock}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.titleText, !item.is_read && styles.titleTextUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.is_read && <View style={styles.dot} />}
                    </View>
                    <Text style={[styles.messageText, !item.is_read && styles.messageTextUnread]} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={[styles.timeText, !item.is_read && styles.timeTextUnread]}>
                      {item.time_ago || formatTimeLabel(item.created_at)}
                    </Text>
                    {!item.is_read && (
                      <View style={styles.unreadPill}>
                        <Text style={styles.unreadPillText}>New</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            {loadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  markAllButtonDisabled: {
    opacity: 0.5,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  markAllTextDisabled: {
    color: '#94A3B8',
  },
  listCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  unreadRow: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  highlightBar: {
    position: 'absolute',
    left: -12,
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
    paddingRight: 8,
  },
  titleTextUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  messageText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  messageTextUnread: {
    color: '#475569',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  timeTextUnread: {
    color: '#6366F1',
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  unreadPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#6366F1',
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
  },
  shopButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  filterOptionActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  filterOptionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  filterOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  filterOptionTitleActive: {
    color: '#6366F1',
  },
  filterOptionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});