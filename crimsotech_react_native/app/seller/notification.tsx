import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
} from 'lucide-react-native';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type SellerNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'order' | 'product' | 'voucher' | 'payout' | 'delivery' | 'alert' | 'system';
  isRead: boolean;
};

type ShopLite = {
  id: string;
};

const typeMeta = {
  order: { icon: ShoppingCart, bg: '#FEF3C7', accent: '#B45309' },
  product: { icon: Package, bg: '#E0F2FE', accent: '#0284C7' },
  voucher: { icon: Tag, bg: '#FCE7F3', accent: '#BE185D' },
  payout: { icon: Wallet, bg: '#DCFCE7', accent: '#16A34A' },
  delivery: { icon: Truck, bg: '#EDE9FE', accent: '#7C3AED' },
  alert: { icon: AlertTriangle, bg: '#FFE4E6', accent: '#E11D48' },
  system: { icon: Info, bg: '#E2E8F0', accent: '#334155' },
} as const;

const mapType = (raw?: string): SellerNotification['type'] => {
  const value = String(raw || '').toLowerCase();
  if (value.includes('order')) return 'order';
  if (value.includes('product')) return 'product';
  if (value.includes('voucher')) return 'voucher';
  if (value.includes('pay')) return 'payout';
  if (value.includes('deliver') || value.includes('ship')) return 'delivery';
  if (value.includes('alert') || value.includes('warning') || value.includes('report')) return 'alert';
  return 'system';
};

export default function SellerNotificationScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ shopId?: string }>();
  const [activeShopId, setActiveShopId] = useState<string>(params.shopId ? String(params.shopId) : '');
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      let shopId = activeShopId;
      if (!shopId) {
        shopId = await fetchFallbackShop();
        if (shopId) setActiveShopId(shopId);
      }

      if (!shopId) {
        setNotifications([]);
        return;
      }

      const response = await AxiosInstance.get('/seller-dashboard/get_dashboard/', {
        params: { shop_id: shopId, range_type: 'monthly' },
      });

      const latest = response.data?.reports?.latest_notifications || [];
      const mapped: SellerNotification[] = latest.map((item: any) => ({
        id: String(item.id),
        title: String(item.title || 'Update'),
        message: String(item.message || ''),
        time: String(item.time || 'Just now'),
        type: mapType(item.type),
        isRead: Boolean(item.is_read),
      }));

      setNotifications(mapped);
    } catch (error) {
      console.error('Failed to load seller notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeShopId, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const markAllReadLocal = () => {
    // Backend endpoint for mark-all-read is not currently exposed in seller routes.
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const toggleReadLocal = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#0F172A" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />}
        >
          <View style={styles.headerCard}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Bell size={18} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Seller Alerts</Text>
                <Text style={styles.headerSubtitle}>
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
              onPress={markAllReadLocal}
              disabled={unreadCount === 0}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {!activeShopId ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No shop selected</Text>
              <Text style={styles.emptyText}>Choose a shop to view seller notifications.</Text>
              <TouchableOpacity onPress={() => router.push('/customer/shops')} style={styles.shopButton}>
                <Text style={styles.shopButtonText}>Choose Shop</Text>
              </TouchableOpacity>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Recent seller updates will show up here.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {notifications.map((item) => {
                const meta = typeMeta[item.type];
                const Icon = meta.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notificationRow, !item.isRead && styles.unreadRow]}
                    onPress={() => toggleReadLocal(item.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                      <Icon size={18} color={meta.accent} />
                    </View>
                    <View style={styles.textBlock}>
                      <View style={styles.rowTop}>
                        <Text style={styles.titleText}>{item.title}</Text>
                        {!item.isRead && <View style={styles.dot} />}
                      </View>
                      <Text style={styles.messageText}>{item.message}</Text>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
  markAllButton: {
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
  },
  unreadRow: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    paddingHorizontal: 8,
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
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 8,
  },
  messageText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
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
});
