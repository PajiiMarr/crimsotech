// app/seller/apply-gift.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

export default function ApplyGift() {
  const { giftId } = useLocalSearchParams<{ giftId: string }>();
  const { userId, shopId } = useAuth();

  const [giftProduct, setGiftProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [giftRes, productsRes] = await Promise.all([
        giftId
          ? AxiosInstance.get(`/seller-gift/${giftId}/`, { headers: { 'X-User-Id': userId || '' } })
          : Promise.resolve({ data: null }),
        AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId, shop_id: shopId },
          headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
        }),
      ]);
      if (giftRes.data) setGiftProduct(giftRes.data?.product || giftRes.data);
      setProducts(Array.isArray(productsRes.data?.products) ? productsRes.data.products : (Array.isArray(productsRes.data) ? productsRes.data : []));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!giftId) { Alert.alert('Required', 'No gift product selected'); return; }
    if (selectedProducts.length === 0) { Alert.alert('Required', 'Select at least one eligible product'); return; }
    if (!startDate) { Alert.alert('Required', 'Start date is required'); return; }
    if (!endDate) { Alert.alert('Required', 'End date is required'); return; }

    // Basic date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Invalid', 'Please enter valid dates (YYYY-MM-DD)');
      return;
    }
    if (end <= start) {
      Alert.alert('Invalid', 'End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      await AxiosInstance.post('/seller-gift/', {
        shop_id: shopId,
        gift_product_id: giftId,
        start_time: `${startDate}T00:00:00`,
        end_time: `${endDate}T23:59:59`,
        eligible_product_ids: selectedProducts,
      }, {
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
      });

      Alert.alert('Success', 'Gift promotion applied successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to apply gift';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply Gift</Text>
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
        <Text style={styles.headerTitle}>Apply Gift</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gift Product Info */}
        {giftProduct && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gift Product</Text>
            <View style={styles.giftRow}>
              {giftProduct.media_files?.[0]?.file_url ? (
                <Image source={{ uri: giftProduct.media_files[0].file_url }} style={styles.giftImage} />
              ) : (
                <View style={[styles.giftImage, styles.imagePlaceholder]}>
                  <Ionicons name="gift-outline" size={24} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.giftInfo}>
                <Text style={styles.giftName}>{giftProduct.name || 'Unknown product'}</Text>
                <Text style={styles.giftMeta}>Qty: {giftProduct.quantity || 0} available</Text>
              </View>
            </View>
          </View>
        )}

        {/* Promo Period */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promotion Period</Text>
          <Text style={styles.label}>Start Date <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.label}>End Date <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Eligible Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Eligible Products
            {selectedProducts.length > 0 && (
              <Text style={styles.selectedCount}> ({selectedProducts.length} selected)</Text>
            )}
          </Text>
          <Text style={styles.cardSubtitle}>
            Customers who purchase any of these products will receive the gift
          </Text>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            filteredProducts.map(p => {
              const pid = String(p.id);
              const isSelected = selectedProducts.includes(pid);
              return (
                <TouchableOpacity key={pid} style={[styles.productRow, isSelected && styles.productRowSelected]} onPress={() => toggleProduct(pid)}>
                  {p.media_files?.[0]?.file_url ? (
                    <Image source={{ uri: p.media_files[0].file_url }} style={styles.productThumbnail} />
                  ) : (
                    <View style={[styles.productThumbnail, styles.imagePlaceholder]}>
                      <Ionicons name="cube-outline" size={16} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productPrice}>₱{Number(p.price || 0).toFixed(2)}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? '#EE4D2D' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || selectedProducts.length === 0 || !startDate || !endDate) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || selectedProducts.length === 0 || !startDate || !endDate}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="gift-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Apply Gift Promotion</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  selectedCount: { color: '#EE4D2D', fontWeight: '600' },
  giftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  giftImage: { width: 60, height: 60, borderRadius: 8 },
  imagePlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  giftInfo: { flex: 1 },
  giftName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  giftMeta: { fontSize: 12, color: '#6B7280' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  emptyProducts: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10,
  },
  productRowSelected: { backgroundColor: '#FFF5F5' },
  productThumbnail: { width: 44, height: 44, borderRadius: 6 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '500', color: '#1F2937' },
  productPrice: { fontSize: 12, color: '#EE4D2D', marginTop: 2, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EE4D2D', paddingVertical: 15, borderRadius: 12, gap: 8, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
