// app/seller/dashboard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Package, Gift, ShoppingCart, MapPin, Store, Tag, TrendingUp, Wallet, Eye } from 'lucide-react-native';
import { router, Stack } from 'expo-router';

export default function Dashboard() {
  const dashboardItems = [
    { title: 'Product List', Icon: Package, route: '/seller/product-list', color: '#E0F2FE' },
    { title: 'Orders', Icon: ShoppingCart, route: '/seller/orders', badge: 2, color: '#FEF3C7' },
    { title: 'Gifts', Icon: Gift, route: '/seller/gifts', color: '#F5F3FF' },
    { title: 'Address', Icon: MapPin, route: '/seller/address', color: '#DCFCE7' },
    { title: 'Shop Voucher', Icon: Store, route: '/seller/shop-vouchers', color: '#FFEDD5' },
    { title: 'Product Voucher', Icon: Tag, route: '/seller/product-vouchers', color: '#FCE7F3' },
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
            <Text style={styles.statVal}>₱12,450</Text>
            <Text style={styles.statLab}>Balance</Text>
          </View>
          <View style={styles.statBox}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.statVal}>24</Text>
            <Text style={styles.statLab}>Orders</Text>
          </View>
          <View style={styles.statBox}>
            <Eye size={16} color="#0EA5E9" />
            <Text style={styles.statVal}>1.2k</Text>
            <Text style={styles.statLab}>Views</Text>
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
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                  <item.Icon size={22} color="#1F2937" strokeWidth={2} />
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', alignItems: 'center', marginBottom: 25 },
  iconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 8, textAlign: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' }
});