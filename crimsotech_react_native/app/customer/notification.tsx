import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import { MaterialIcons } from '@expo/vector-icons';
import AxiosInstance from '../../contexts/axios';

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

export default function NotificationPage() {
  const { userId, loading: authLoading, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // All useMemo and useEffect hooks MUST be before any conditional returns
  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [activeTab, notifications]);

  const fetchNotifications = async (refresh = false, pageNum = 1) => {
    if (!userId) return;
    
    if (refresh) {
      setLoading(true);
      setPage(1);
    } else if (pageNum > 1) {
      setLoadingMore(true);
    }
    
    try {
      // Build query params
      const params: any = {
        page: pageNum,
        page_size: 20,
      };
      
      // Filter by read status
      if (activeTab === 'unread') {
        params.is_read = false;
      }
      
      const response = await AxiosInstance.get('/notifications/', {
        headers: { 'X-User-Id': userId },
        params: params
      });
      
      if (response.data) {
        // Handle paginated response
        let newNotifications: AppNotification[] = [];
        let total = 0;
        let unread = 0;
        
        if (response.data.results) {
          // Paginated response
          newNotifications = response.data.results;
          total = response.data.count;
          unread = response.data.unread_count || 0;
          setHasMore(!!response.data.next);
        } else if (response.data.notifications) {
          // Non-paginated response
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
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      if (error.response?.status === 400) {
        console.error('Missing X-User-Id header');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications(true);
    }
  }, [userId, activeTab]);

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
      // Use PATCH to update is_read field
      await AxiosInstance.patch(`/notifications/${id}/`, 
        { is_read: true },
        { headers: { 'X-User-Id': userId } }
      );
      
      // Update local state
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
      // Use the bulk-action endpoint
      await AxiosInstance.post('/notifications/bulk-action/', 
        { mark_all_as_read: true },
        { headers: { 'X-User-Id': userId } }
      );
      
      // Update local state
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
                // For unread notifications, use force-delete
                await AxiosInstance.delete(`/notifications/${id}/force-delete/`, {
                  headers: { 'X-User-Id': userId }
                });
              } else {
                // For read notifications, normal delete
                await AxiosInstance.delete(`/notifications/${id}/`, {
                  headers: { 'X-User-Id': userId }
                });
              }
              
              // Update local state
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
              
              // Update local state - remove all read notifications
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

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    
    // Navigate based on action_type or action_url
    if (n.action_url) {
      // For action_url, make sure it's a valid route
      try {
        // Remove any leading slashes to make it relative
        const route = n.action_url.replace(/^\//, '');
        router.push(route as any);
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to default
        router.push('/customer/purchases');
      }
    } else if (n.action_type === 'view_order' && n.action_id) {
      router.push({
        pathname: '/customer/view-order',
        params: { orderId: n.action_id }
      } as any);
    } else if (n.action_type === 'view_refund' && n.action_id) {
      router.push({
        pathname: '/customer/view-refund',
        params: { refundId: n.action_id }
      } as any);
    } else if (n.type === 'order_update') {
      router.push('/customer/purchases');
    } else if (n.type === 'refund_update') {
      router.push({
        pathname: '/customer/purchases',
        params: { tab: 'Returns' }
      } as any);
    } else if (n.type === 'replacement') {
      router.push('/customer/purchases');
    } else if (n.type === 'delivery') {
      router.push('/customer/purchases');
    } else if (n.type === 'payment') {
      router.push('/customer/purchases');
    } else {
      router.push('/customer/purchases');
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

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case 'order_update':
        return { name: 'local-shipping' as const, color: '#2563EB' };
      case 'refund_update':
        return { name: 'currency-exchange' as const, color: '#10B981' };
      case 'replacement':
        return { name: 'autorenew' as const, color: '#8B5CF6' };
      case 'delivery':
        return { name: 'delivery-dining' as const, color: '#F59E0B' };
      case 'payment':
        return { name: 'payment' as const, color: '#059669' };
      case 'dispute':
        return { name: 'gavel' as const, color: '#EF4444' };
      case 'message':
        return { name: 'message' as const, color: '#3B82F6' };
      case 'system':
      default:
        return { name: 'info' as const, color: '#6366F1' };
    }
  };

  // Render footer for FlatList (load more indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  };

  // All conditional returns MUST come AFTER all hooks
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Please log in to view notifications</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view notifications</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CustomerLayout disableScroll>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {totalCount > 0 && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleDeleteAllRead}
                >
                  <MaterialIcons name="delete-sweep" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, unreadCount === 0 && styles.actionButtonDisabled]}
                onPress={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                <MaterialIcons name="done-all" size={18} color={unreadCount === 0 ? '#9CA3AF' : '#111827'} />
                <Text style={[styles.actionText, unreadCount === 0 && styles.actionTextDisabled]}>Mark all read</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
              {activeTab === 'all' && totalCount > 0 && (
                <Text style={[styles.tabCount, activeTab === 'all' && styles.tabCountActive]}>
                  {totalCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
              onPress={() => setActiveTab('unread')}
            >
              <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
                Unread
              </Text>
              {unreadCount > 0 && (
                <Text style={[styles.tabCount, activeTab === 'unread' && styles.tabCountActive]}>
                  {unreadCount}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={visibleNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6366F1']}
                tintColor="#6366F1"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="notifications-none" size={28} color="#6B7280" />
                </View>
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'unread'
                    ? 'You have no unread notifications right now.'
                    : 'You’ll see updates here when something happens.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const icon = iconForType(item.type);

              return (
                <TouchableOpacity
                  style={[
                    styles.card, 
                    !item.is_read && styles.cardUnread,
                    !item.is_read && styles.highlightBorder
                  ]}
                  onPress={() => handleOpenNotification(item)}
                  onLongPress={() => handleDeleteNotification(item.id, item.is_read)}
                  activeOpacity={0.85}
                >
                  {/* Highlight bar for unread notifications */}
                  {!item.is_read && <View style={styles.highlightBar} />}
                  
                  <View style={[styles.iconWrap, { backgroundColor: `${icon.color}1A` }]}>
                    <MaterialIcons name={icon.name} size={20} color={icon.color} />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.time, !item.is_read && styles.timeUnread]}>{item.time_ago || formatTimeLabel(item.created_at)}</Text>
                    </View>
                    <Text style={[styles.cardMessage, !item.is_read && styles.cardMessageUnread]} numberOfLines={2}>
                      {item.message}
                    </Text>

                    {!item.is_read && (
                      <View style={styles.unreadPill}>
                        <Text style={styles.unreadPillText}>New</Text>
                      </View>
                    )}
                  </View>

                  <MaterialIcons name="chevron-right" size={22} color={!item.is_read ? "#6366F1" : "#9CA3AF"} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </CustomerLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1, paddingHorizontal: 0, paddingTop: 12 }, // Removed horizontal padding for edge-to-edge
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    paddingHorizontal: 16, // Add padding to header only
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 14, color: '#6B7280' },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonDisabled: { backgroundColor: '#F3F4F6' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  actionTextDisabled: { color: '#9CA3AF' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    marginBottom: 12,
    marginHorizontal: 16, // Add margin to tabs
  },
  tab: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10, 
    borderRadius: 10, 
  },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: {
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    color: '#6B7280',
  },
  tabCountActive: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
  },

  listContent: { paddingBottom: 24 },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 0,
    borderRadius: 0,
    position: 'relative',
  },
  cardUnread: { 
    backgroundColor: '#F8FAFF',
  },
  highlightBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    paddingLeft: 12,
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#6366F1',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#6B7280' },
  cardTitleUnread: { color: '#111827', fontWeight: '700' },
  time: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  timeUnread: { color: '#6366F1', fontWeight: '600' },
  cardMessage: { marginTop: 6, fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  cardMessageUnread: { color: '#4B5563' },
  unreadPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#6366F1',
  },
  unreadPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  emptyText: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },

  message: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
  link: { fontSize: 16, color: '#6366F1', fontWeight: '600' },
});