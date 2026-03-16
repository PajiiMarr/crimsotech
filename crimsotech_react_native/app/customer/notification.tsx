import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import { MaterialIcons } from '@expo/vector-icons';
import AxiosInstance from '../../contexts/axios';

type NotificationType = 'order' | 'promo' | 'system' | 'message' | 'shipping' | 'payment' | 'review';

type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeLabel: string;
  isRead: boolean;
  route?: string;
};

const wsUrlFromApiBase = (apiBaseUrl?: string): string | null => {
  if (!apiBaseUrl) return null;
  const trimmed = apiBaseUrl.trim();
  if (!trimmed) return null;

  const noApiSuffix = trimmed.replace(/\/api\/?$/i, '');
  if (noApiSuffix.startsWith('https://')) return noApiSuffix.replace(/^https:\/\//, 'wss://');
  if (noApiSuffix.startsWith('http://')) return noApiSuffix.replace(/^http:\/\//, 'ws://');
  return null;
};

const mapType = (raw?: string): NotificationType => {
  const value = String(raw || '').toLowerCase();
  if (value.includes('message') || value.includes('chat')) return 'message';
  if (value.includes('ship') || value.includes('deliver')) return 'shipping';
  if (value.includes('payment') || value.includes('payout')) return 'payment';
  if (value.includes('promo') || value.includes('voucher')) return 'promo';
  if (value.includes('review') || value.includes('rating')) return 'review';
  if (value.includes('order')) return 'order';
  return 'system';
};

const toTimeLabel = (value?: string) => {
  if (!value) return 'Just now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diff = Date.now() - parsed.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return parsed.toLocaleDateString();
};

const getRouteForNotification = (type: NotificationType, data?: Record<string, any>) => {
  if (typeof data?.link === 'string' && data.link.startsWith('/')) {
    return data.link;
  }

  switch (type) {
    case 'message':
      return '/customer/messages';
    case 'promo':
      return '/customer/my-vouchers';
    case 'review':
      return '/customer/purchases';
    case 'shipping':
    case 'payment':
    case 'order':
      return '/customer/purchases';
    default:
      return '/customer/home';
  }
};

export default function NotificationPage() {
  const { userId, loading: authLoading, userRole } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connecting, setConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsBaseUrl = useMemo(() => {
    const envWs = process.env.EXPO_PUBLIC_WEBSOCKET_URL;
    if (envWs && envWs.trim()) return envWs.trim().replace(/\/$/, '');
    return wsUrlFromApiBase(process.env.EXPO_PUBLIC_API_URL) || wsUrlFromApiBase(AxiosInstance.defaults.baseURL);
  }, []);

  useEffect(() => {
    if (authLoading || !userId || !wsBaseUrl) {
      if (!authLoading) setConnecting(false);
      return;
    }

    const socket = new WebSocket(`${wsBaseUrl}/ws/notifications/`);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnectionError(null);
      socket.send(JSON.stringify({ type: 'authenticate', user_id: userId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'authenticated') {
          const mapped = (data.notifications || []).map((item: any) => {
            const type = mapType(item.type);
            return {
              id: String(item.id),
              type,
              title: String(item.title || 'Notification'),
              message: String(item.message || ''),
              timeLabel: toTimeLabel(item.created_at),
              isRead: Boolean(item.is_read),
              route: getRouteForNotification(type, item.data),
            } as AppNotification;
          });
          setNotifications(mapped);
          setConnecting(false);
          return;
        }

        if (data.type === 'new_notification') {
          const type = mapType(data.notification_type);
          setNotifications((prev) => [
            {
              id: String(data.notification_id),
              type,
              title: String(data.title || 'Notification'),
              message: String(data.message || ''),
              timeLabel: toTimeLabel(data.created_at),
              isRead: false,
              route: getRouteForNotification(type, data.data),
            },
            ...prev,
          ]);
          return;
        }

        if (data.type === 'marked_read') {
          setNotifications((prev) => prev.map((item) => item.id === String(data.notification_id) ? { ...item, isRead: true } : item));
          return;
        }

        if (data.type === 'marked_all_read') {
          setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        }
      } catch (error) {
        console.error('Failed to parse notification websocket payload:', error);
      }
    };

    socket.onerror = () => {
      setConnectionError('Live notifications are unavailable right now.');
      setConnecting(false);
    };

    socket.onclose = () => {
      setConnecting(false);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [authLoading, userId, wsBaseUrl]);

  const unreadCount = useMemo(
    () => notifications.reduce((count, n) => (n.isRead ? count : count + 1), 0),
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [activeTab, notifications]);

  if (authLoading || connecting) {
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

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return { name: 'local-shipping' as const, color: '#2563EB' };
      case 'promo':
        return { name: 'local-offer' as const, color: '#F97316' };
      case 'system':
      default:
        return { name: 'info' as const, color: '#6366F1' };
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'mark_read', notification_id: id }));
    }
  };

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.route) router.push(n.route as any);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'mark_all_read' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <CustomerLayout disableScroll>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {connectionError ? connectionError : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, unreadCount === 0 && styles.actionButtonDisabled]}
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <MaterialIcons name="done-all" size={18} color={unreadCount === 0 ? '#9CA3AF' : '#111827'} />
            <Text style={[styles.actionText, unreadCount === 0 && styles.actionTextDisabled]}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
            onPress={() => setActiveTab('unread')}
          >
            <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={visibleNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
                style={[styles.card, !item.isRead && styles.cardUnread]}
                onPress={() => handleOpenNotification(item)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${icon.color}1A` }]}>
                  <MaterialIcons name={icon.name} size={20} color={icon.color} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.time}>{item.timeLabel}</Text>
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>
                    {item.message}
                  </Text>

                  {!item.isRead && (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>New</Text>
                    </View>
                  )}
                </View>

                <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flex: 1, paddingRight: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 14, color: '#6B7280' },
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
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  tabTextActive: { color: '#FFFFFF' },

  listContent: { paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  cardUnread: { borderColor: '#11182733' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827' },
  cardTitleUnread: { color: '#111827' },
  time: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  cardMessage: { marginTop: 4, fontSize: 13, color: '#374151', lineHeight: 18 },
  unreadPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  unreadPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

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
