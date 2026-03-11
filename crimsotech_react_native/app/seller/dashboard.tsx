// app/seller/dashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Wallet, Eye, Bell } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type DashboardStats = {
  balance: number;
  orders: number;
  views: number;
};

export default function Dashboard() {
  const { userId, shopId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ balance: 0, orders: 0, views: 0 });

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
        setStats({
          balance: Number(summary.period_sales || 0),
          orders: Number(summary.period_orders || 0),
          views: Number(shopPerformance.total_followers || 0)
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };

    fetchDashboard();
  }, [shopId, userId]);
  return (
    <SafeAreaView style={styles.container}>
      {/* This ensures the Dashboard title itself is correct */}
      <Stack.Screen
        options={{
          title: 'Seller Dashboard',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/seller/notification' as any)}
            >
              <Bell size={18} color="#4F46E5" />
            </TouchableOpacity>
          ),
        }}
      />

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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});

