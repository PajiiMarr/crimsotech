import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import AxiosInstance from "../../contexts/axios";

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

export default function RiderNotificationPage() {
  const { userId, loading: authLoading, userRole } = useAuth();

  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [activeFilter, notifications]);

  const fetchNotifications = async (refresh = false, pageNum = 1) => {
    if (!userId) return;
    
    if (refresh) {
      setLoading(true);
      setPage(1);
    } else if (pageNum > 1) {
      setLoadingMore(true);
    }
    
    try {
      const params: any = {
        page: pageNum,
        page_size: 20,
      };
      
      if (activeFilter === "unread") {
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
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchNotifications(true);
      }
    }, [userId, activeFilter])
  );

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

  const handleFilterSelect = (filter: "all" | "unread") => {
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
    } else if (n.action_type === 'view_delivery' && n.action_id) {
      router.push({
        pathname: '/rider/delivery-details',
        params: { deliveryId: n.action_id }
      } as any);
    } else if (n.type === 'delivery') {
      router.push('/rider/active-orders');
    } else if (n.type === 'payment') {
      router.push('/rider/earnings');
    } else {
      router.push('/rider/home');
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
      case 'delivery':
        return { name: "local-shipping" as const, color: "#F59E0B" };
      case 'payment':
        return { name: "account-balance-wallet" as const, color: "#10B981" };
      case 'order_update':
        return { name: "shopping-bag" as const, color: "#3B82F6" };
      case 'system':
      default:
        return { name: "info" as const, color: "#6B7280" };
    }
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
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.filterOption, activeFilter === 'all' && styles.filterOptionActive]}
            onPress={() => handleFilterSelect('all')}
          >
            <MaterialIcons 
              name="notifications-none" 
              size={24} 
              color={activeFilter === 'all' ? '#6366F1' : '#6B7280'} 
            />
            <View style={styles.filterOptionTextContainer}>
              <Text style={[styles.filterOptionTitle, activeFilter === 'all' && styles.filterOptionTitleActive]}>
                All Notifications
              </Text>
              <Text style={styles.filterOptionSubtitle}>
                Show all notifications ({totalCount})
              </Text>
            </View>
            {activeFilter === 'all' && (
              <MaterialIcons name="check" size={20} color="#6366F1" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterOption, activeFilter === 'unread' && styles.filterOptionActive]}
            onPress={() => handleFilterSelect('unread')}
          >
            <MaterialIcons 
              name="mark-email-unread" 
              size={24} 
              color={activeFilter === 'unread' ? '#6366F1' : '#6B7280'} 
            />
            <View style={styles.filterOptionTextContainer}>
              <Text style={[styles.filterOptionTitle, activeFilter === 'unread' && styles.filterOptionTitleActive]}>
                Unread Only
              </Text>
              <Text style={styles.filterOptionSubtitle}>
                Show only unread notifications ({unreadCount})
              </Text>
            </View>
            {activeFilter === 'unread' && (
              <MaterialIcons name="check" size={20} color="#6366F1" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="small" color="#1F2937" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Please log in to view notifications</Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.link}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view notifications</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.subtitle}>
              {activeFilter === 'unread' 
                ? `${unreadCount} unread` 
                : totalCount > 0 ? `${totalCount} total` : 'All caught up'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, activeFilter === 'unread' && styles.filterActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <MaterialIcons 
                name="filter-list" 
                size={18} 
                color={activeFilter === 'unread' ? '#6366F1' : '#6B7280'} 
              />
              {activeFilter === 'unread' && <View style={styles.activeFilterDot} />}
            </TouchableOpacity>

            {totalCount > 0 && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleDeleteAllRead}
              >
                <MaterialIcons name="delete-sweep" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                unreadCount === 0 && styles.actionButtonDisabled,
              ]}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <MaterialIcons
                name="done-all"
                size={16}
                color={unreadCount === 0 ? "#9CA3AF" : "#111827"}
              />
              <Text
                style={[
                  styles.actionText,
                  unreadCount === 0 && styles.actionTextDisabled,
                ]}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1F2937']}
              tintColor="#1F2937"
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#1F2937" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialIcons
                  name="notifications-none"
                  size={28}
                  color="#6B7280"
                />
              </View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyText}>
                {activeFilter === "unread"
                  ? "You have no unread notifications right now."
                  : "You'll see updates here when something happens."}
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
                  !item.is_read && styles.highlightBorder,
                ]}
                onPress={() => handleOpenNotification(item)}
                onLongPress={() => handleDeleteNotification(item.id, item.is_read)}
                activeOpacity={0.85}
              >
                {!item.is_read && <View style={styles.highlightBar} />}
                
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${icon.color}1A` },
                  ]}
                >
                  <MaterialIcons
                    name={icon.name}
                    size={20}
                    color={icon.color}
                  />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[
                        styles.cardTitle,
                        !item.is_read && styles.cardTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.time, !item.is_read && styles.timeUnread]}>
                      {item.time_ago || formatTimeLabel(item.created_at)}
                    </Text>
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
      
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  inner: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: { flex: 1, paddingRight: 8 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: { marginTop: 1, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    position: "relative",
  },
  filterActive: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  activeFilterDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6366F1",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionButtonDisabled: { backgroundColor: "#F9FAFB" },
  actionText: { fontSize: 11, fontWeight: "700", color: "#1F2937" },
  actionTextDisabled: { color: "#9CA3AF" },

  listContent: { paddingBottom: 24 },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 8,
    position: "relative",
  },
  cardUnread: { 
    backgroundColor: "#F8FAFF",
    borderColor: "#6366F133",
  },
  highlightBorder: {
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  highlightBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#6366F1",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { 
    flex: 1, 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#6B7280" 
  },
  cardTitleUnread: { 
    color: "#1F2937", 
    fontWeight: "700" 
  },
  time: { 
    fontSize: 10, 
    color: "#9CA3AF", 
    fontWeight: "500" 
  },
  timeUnread: { 
    color: "#6366F1", 
    fontWeight: "600" 
  },
  cardMessage: { 
    marginTop: 4, 
    fontSize: 11, 
    color: "#9CA3AF", 
    lineHeight: 16 
  },
  cardMessageUnread: { 
    color: "#4B5563" 
  },
  unreadPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#6366F1",
  },
  unreadPillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },

  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  message: { fontSize: 16, color: "#6B7280", marginBottom: 12 },
  link: { fontSize: 16, color: "#EE4D2D", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 280,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  filterOptionActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  filterOptionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  filterOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  filterOptionTitleActive: {
    color: "#6366F1",
  },
  filterOptionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
});