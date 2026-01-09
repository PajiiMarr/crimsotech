import { useAuth } from '@/contexts/AuthContext';
import { getOrders } from '@/utils/cartApi';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type NotificationItem = {
  id: string;
  orderId: string;
  status: OrderStatus;
  createdAt: string;
  message: string;
};

const statusCopy: Record<OrderStatus, string> = {
  delivered: 'Delivered',
  shipped: 'On the way',
  processing: 'Preparing your order',
  pending: 'Waiting for confirmation',
  cancelled: 'Order cancelled',
};

const statusColor: Record<OrderStatus, string> = {
  delivered: '#4CAF50',
  shipped: '#2196F3',
  processing: '#FF9800',
  pending: '#9E9E9E',
  cancelled: '#F44336',
};

const fallbackCopy = 'We will keep you posted on every update for your orders.';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = useMemo(() => {
    if (!user) return null;
    return (user as any).user_id || (user as any).id || null;
  }, [user]);

  const loadNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const resp = await getOrders(userId);

      if (resp.success && resp.orders) {
        const items: NotificationItem[] = resp.orders
          .map((order: any) => {
            const status = (order.status || 'pending') as OrderStatus;
            const createdAt = order.created_at || order.updated_at || order.date || new Date().toISOString();
            return {
              id: order.order_id,
              orderId: order.order_id,
              status,
              createdAt,
              message: statusCopy[status] || fallbackCopy,
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(items);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderNotification = (item: NotificationItem) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <MaterialIcons name="notifications" size={isSmallDevice ? 20 : 22} color={statusColor[item.status]} />
          <View style={styles.titleTextWrap}>
            <Text style={styles.cardTitle}>Order #{item.orderId}</Text>
            <Text style={styles.cardMessage}>{item.message}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor[item.status]}15` }]}> 
          <Text style={[styles.statusText, { color: statusColor[item.status] }]}>{statusCopy[item.status]}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color="#D0D5DD" />
      <Text style={styles.emptyTitle}>You are all caught up</Text>
      <Text style={styles.emptySubtitle}>{fallbackCopy}</Text>
      <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/pages/purchases')}>
        <Text style={styles.ctaButtonText}>Go to orders</Text>
      </TouchableOpacity>
    </View>
  );

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="person-outline" size={64} color="#D0D5DD" />
          <Text style={styles.emptyTitle}>Sign in to see updates</Text>
          <Text style={styles.emptySubtitle}>We will notify you when your orders move.</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.ctaButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.manageButton} onPress={() => router.push('/pages/purchases')}>
          <Text style={styles.manageText}>Orders</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.emptySubtitle}>Checking for updates</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {notifications.length === 0 ? renderEmpty() : notifications.map(renderNotification)}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: isSmallDevice ? 17 : 18,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  manageButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  manageText: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#0288D1',
    fontWeight: '600',
    fontFamily: 'System',
  },
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: isSmallDevice ? 12 : 16,
    marginTop: isSmallDevice ? 12 : 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    paddingHorizontal: isSmallDevice ? 14 : 16,
    paddingVertical: isSmallDevice ? 12 : 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  cardTitle: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  cardMessage: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#4B5563',
    marginTop: 2,
    fontFamily: 'System',
  },
  statusPill: {
    paddingHorizontal: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 4 : 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: isSmallDevice ? 12 : 13,
    fontWeight: '700',
    fontFamily: 'System',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  timestamp: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6B7280',
    fontFamily: 'System',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: isSmallDevice ? 80 : 100,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'System',
  },
  ctaButton: {
    marginTop: 20,
    backgroundColor: '#0288D1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: 60,
  },
});
