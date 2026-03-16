import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type Variant = {
  id: string;
  title?: string;
  sku_code?: string;
  price?: string | null;
  quantity?: number;
  is_active?: boolean;
  image?: string | null;
};

type ProductDetail = {
  id: string;
  name: string;
  description?: string;
  condition?: string;
  upload_status?: string;
  status?: string;
  is_removed?: boolean;
  removal_reason?: string | null;
  category_admin?: { id: string; name: string } | null;
  price_range?: { min?: string | null; max?: string | null };
  quantity?: number;
  variants?: Variant[];
  media?: Array<{ id: string; file_data?: string | null }>;
};

const statusColor = (status?: string) => {
  const value = String(status || '').toLowerCase();
  if (value === 'published') return '#16A34A';
  if (value === 'draft') return '#D97706';
  if (value === 'archived') return '#64748B';
  return '#475569';
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = String(AxiosInstance.defaults.baseURL || '').replace(/\/api\/?$/, '');
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
};

export default function SellerViewProductScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ productId?: string; shopId?: string }>();
  const productId = params.productId ? String(params.productId) : '';
  const shopId = params.shopId ? String(params.shopId) : '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId || !userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await AxiosInstance.get(`/seller-products/${productId}/get_product/?user_id=${userId}`);
      if (response.data?.success) {
        setProduct(response.data.product || null);
      } else {
        setProduct(null);
      }
    } catch (error) {
      console.error('Failed to fetch seller product details:', error);
      Alert.alert('Error', 'Unable to load product details.');
      setProduct(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, userId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  const heroImage = useMemo(() => {
    const variantImage = product?.variants?.find((v) => v.image)?.image;
    const mediaImage = product?.media?.find((m) => m.file_data)?.file_data;
    return resolveMediaUrl(variantImage || mediaImage || null);
  }, [product]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#0F172A" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Product Details</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#6B7280' }}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 }}>Product Details</Text>
        <TouchableOpacity
          onPress={() => router.push(`/seller/components/seller-create-product?productId=${product.id}&shopId=${shopId}`)}
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ height: 190, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            {heroImage ? (
              <Image source={{ uri: heroImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={40} color="#9CA3AF" />
            )}
          </View>
          <View style={{ padding: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{product.name}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              {product.category_admin?.name || 'Uncategorized'} • {product.condition || 'N/A'}
            </Text>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 12, color: statusColor(product.upload_status), fontWeight: '700' }}>
                  {(product.upload_status || 'unknown').toUpperCase()}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#F8FAFC' }}>
                <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>
                  Stock: {product.quantity || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Description</Text>
          <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
            {product.description || 'No description provided.'}
          </Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Pricing</Text>
          <Text style={{ fontSize: 13, color: '#374151' }}>
            Min: {product.price_range?.min ? `₱${product.price_range.min}` : 'N/A'}
          </Text>
          <Text style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
            Max: {product.price_range?.max ? `₱${product.price_range.max}` : 'N/A'}
          </Text>
          <Text style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
            Status: {product.status || 'N/A'}
          </Text>
        </View>

        {product.is_removed && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B91C1C' }}>Removed Product</Text>
            <Text style={{ fontSize: 13, color: '#991B1B', marginTop: 6 }}>
              {product.removal_reason || 'No removal reason available.'}
            </Text>
          </View>
        )}

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
            Variants ({product.variants?.length || 0})
          </Text>
          {(product.variants || []).length === 0 ? (
            <Text style={{ fontSize: 13, color: '#6B7280' }}>No variants available.</Text>
          ) : (
            (product.variants || []).map((variant) => (
              <View key={variant.id} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                  {variant.title || variant.sku_code || 'Variant'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  SKU: {variant.sku_code || 'N/A'}
                </Text>
                <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                  Price: {variant.price ? `₱${variant.price}` : 'N/A'}
                </Text>
                <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                  Quantity: {variant.quantity ?? 0} • {variant.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
