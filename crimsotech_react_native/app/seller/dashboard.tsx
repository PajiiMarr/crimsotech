// app/seller/dashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Package, Gift, ShoppingCart, MapPin, Store, Tag, TrendingUp, Wallet, Eye } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type DashboardStats = {
  balance: number;
  orders: number;
  views: number;
};

type StoreManagementCounts = {
  product_list: number;
  orders: number;
  gifts: number;
  address: number;
  shop_voucher: number;
  product_voucher: number;
};

export default function Dashboard() {
  const { userId, shopId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ balance: 0, orders: 0, views: 0 });
  const [managementCounts, setManagementCounts] = useState<StoreManagementCounts>({
    product_list: 0,
    orders: 0,
    gifts: 0,
    address: 0,
    shop_voucher: 0,
    product_voucher: 0,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!shopId) return;
      try {
        const response = await AxiosInstance.get('/seller-dashboard/get_dashboard/', {
          params: { shop_id: shopId },
          headers: {
            'X-User-Id': userId || '',
            'X-Shop-Id': shopId || '',
          }
        });

        const summary = response.data?.summary || {};
        const shopPerformance = response.data?.shop_performance || {};
        const storeCounts = response.data?.store_management_counts || {};

        console.log('Store management counts:', storeCounts);

        setStats({
          balance: Number(summary.period_sales || 0),
          orders: Number(summary.period_orders || 0),
          views: Number(shopPerformance.total_followers || 0)
        });

        setManagementCounts({
          product_list: Number(storeCounts.product_list || 0),
          orders: Number(storeCounts.orders || 0),
          gifts: Number(storeCounts.gifts || 0),
          address: Number(storeCounts.address || 0),
          shop_voucher: Number(storeCounts.shop_voucher || 0),
          product_voucher: Number(storeCounts.product_voucher || 0),
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };

    fetchDashboard();
  }, [shopId, userId]);
  const dashboardItems = [
    { title: 'Product List', Icon: Package, route: '/seller/product-list', badge: managementCounts.product_list, color: '#E0F2FE' },
    { title: 'Orders', Icon: ShoppingCart, route: '/seller/orders', badge: managementCounts.orders, color: '#FEF3C7' },
    { title: 'Gifts', Icon: Gift, route: '/seller/gifts', badge: managementCounts.gifts, color: '#F5F3FF' },
    { title: 'Address', Icon: MapPin, route: '/seller/address', badge: managementCounts.address, color: '#DCFCE7' },
    { title: 'Shop Voucher', Icon: Store, route: '/seller/shop-vouchers', badge: managementCounts.shop_voucher, color: '#FFEDD5' },
    { title: 'Product Voucher', Icon: Tag, route: '/seller/product-vouchers', badge: managementCounts.product_voucher, color: '#FCE7F3' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* This ensures the Dashboard title itself is correct */}
      <Stack.Screen options={{ 
        title: 'Seller Dashboard', 
        headerTitleAlign: 'center',
        headerShadowVisible: false 
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        
        {/* SHOP STATS SECTION */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Wallet size={16} color="#7C3AED" />
            <Text style={styles.statVal}>₱{stats.balance.toLocaleString()}</Text>
            <Text style={styles.statLab}>Balance</Text>
          </View>
          <View style={styles.statBox}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.statVal}>{stats.orders}</Text>
            <Text style={styles.statLab}>Orders</Text>
          </View>
          <View style={styles.statBox}>
            <Eye size={16} color="#0EA5E9" />
            <Text style={styles.statVal}>{stats.views}</Text>
            <Text style={styles.statLab}>Followers</Text>
          </View>
        </View>

        {/* MANAGEMENT GRID */}
        <View style={styles.gridCard}>
          <Text style={styles.gridTitle}>Store Management</Text>
          <View style={styles.grid}>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.gridItem} 
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.iconWrapper}>
                  <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                    <item.Icon size={22} color="#1F2937" strokeWidth={2} />
                  </View>
                  {item.badge !== undefined && item.badge !== null && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{Math.max(0, item.badge)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemLabel}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  statBox: { backgroundColor: '#FFF', width: '31%', padding: 12, borderRadius: 16, alignItems: 'center', borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  statVal: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  statLab: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  gridCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
  gridTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'visible' },
  gridItem: { width: '33.33%', alignItems: 'center', marginBottom: 25, overflow: 'visible' },
  iconWrapper: { position: 'relative', overflow: 'visible' },
  iconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 8, textAlign: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', zIndex: 10, elevation: 10 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' }
});