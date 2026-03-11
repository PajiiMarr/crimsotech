import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SellerVouchersPage() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Vouchers',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      />

      <View style={styles.content}>
        <Text style={styles.subtitle}>Choose voucher type to manage</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/seller/shop-vouchers' as any)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="storefront-outline" size={20} color="#1F2937" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>Shop Vouchers</Text>
            <Text style={styles.desc}>Create and manage vouchers for your whole shop</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/seller/product-vouchers' as any)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="cube-outline" size={20} color="#1F2937" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>Product Vouchers</Text>
            <Text style={styles.desc}>Manage vouchers for specific products</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  subtitle: { color: '#64748B', fontSize: 13, marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  desc: { marginTop: 2, fontSize: 12, color: '#64748B' },
});
