// app/seller/select-boost-product.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

export default function SelectBoostProduct() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { userId, shopId } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [planRes, productsRes] = await Promise.all([
        AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`, {
          headers: { 'X-User-Id': userId || '' },
        }),
        AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId, shop_id: shopId },
          headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
        }),
      ]);
      setPlan(planRes.data?.plan || planRes.data);
      setProducts(
        Array.isArray(productsRes.data?.products)
          ? productsRes.data.products
          : Array.isArray(productsRes.data) ? productsRes.data : []
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id: string) => {
    const limit = plan?.max_products || plan?.product_limit || Infinity;
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(p => p !== id));
    } else {
      if (selectedIds.length >= limit) {
        Alert.alert('Limit Reached', `This plan allows up to ${limit} product(s)`);
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) {
      Alert.alert('Required', 'Please select at least one product to boost');
      return;
    }
    router.push(`/seller/pay-boosting?planId=${planId}&productIds=${selectedIds.join(',')}` as any);
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const limit = plan?.max_products || plan?.product_limit || null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Products</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color="#EE4D2D" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Products to Boost</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Plan Summary Banner */}
      {plan && (
        <View style={styles.planBanner}>
          <View>
            <Text style={styles.planName}>{plan.name || 'Boost Plan'}</Text>
            <Text style={styles.planMeta}>
              ₱{Number(plan.price || 0).toFixed(2)} per product
              {limit ? `  •  Max ${limit} products` : ''}
            </Text>
          </View>
          <View style={styles.selectionBadge}>
            <Text style={styles.selectionBadgeText}>{selectedIds.length}{limit ? `/${limit}` : ''} selected</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pid = String(item.id);
          const isSelected = selectedIds.includes(pid);
          const isBoosted = item.is_boosted || item.boosted;
          return (
            <TouchableOpacity
              style={[styles.productCard, isSelected && styles.productCardSelected]}
              onPress={() => !isBoosted && toggleProduct(pid)}
              activeOpacity={isBoosted ? 1 : 0.7}
            >
              {item.media_files?.[0]?.file_url ? (
                <Image source={{ uri: item.media_files[0].file_url }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.imagePlaceholder]}>
                  <Ionicons name="cube-outline" size={22} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                {isBoosted && <Text style={styles.boostedTag}>Already Boosted</Text>}
              </View>
              {!isBoosted ? (
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isSelected ? '#EE4D2D' : '#9CA3AF'}
                />
              ) : (
                <Ionicons name="rocket" size={20} color="#F59E0B" />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {plan && selectedIds.length > 0 && (
          <Text style={styles.totalText}>
            Total: ₱{(Number(plan.price || 0) * selectedIds.length).toFixed(2)}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.proceedBtn, selectedIds.length === 0 && styles.proceedBtnDisabled]}
          onPress={handleProceed}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.proceedText}>Proceed to Payment</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  planBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF5F5', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#FCA5A5',
  },
  planName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  planMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  selectionBadge: {
    backgroundColor: '#EE4D2D', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  selectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  productCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
  },
  productCardSelected: { borderColor: '#EE4D2D', backgroundColor: '#FFF5F5' },
  productImage: { width: 56, height: 56, borderRadius: 8 },
  imagePlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 3 },
  productPrice: { fontSize: 12, color: '#EE4D2D', fontWeight: '600' },
  boostedTag: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 2 },
  footer: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  totalText: { fontSize: 13, color: '#6B7280', marginBottom: 8, textAlign: 'center' },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EE4D2D', paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  proceedBtnDisabled: { opacity: 0.5 },
  proceedText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
