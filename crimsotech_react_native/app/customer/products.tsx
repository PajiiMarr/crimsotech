import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import CustomerLayout from './CustomerLayout';

type ProductImage = {
  url?: string;
  file_data?: string;
} | string | null;

interface Product {
  id: string;
  name?: string;
  price?: string | number;
  compare_price?: string | number | null;
  primary_image?: ProductImage;
  media_files?: ProductImage[];
  productmedia_set?: { file_data?: string; url?: string }[];
  shop_name?: string;
}

const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, '') || 'http://localhost:8000';
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

const getProductImage = (product: Product) => {
  if (product.primary_image) {
    if (typeof product.primary_image === 'string') return ensureAbsoluteUrl(product.primary_image);
    return ensureAbsoluteUrl(product.primary_image.url || product.primary_image.file_data || null);
  }
  if (product.media_files?.length) {
    const media = product.media_files[0];
    if (typeof media === 'string') return ensureAbsoluteUrl(media);
    return ensureAbsoluteUrl(media?.url || media?.file_data || null);
  }
  if (product.productmedia_set?.length) {
    const media = product.productmedia_set[0];
    return ensureAbsoluteUrl(media?.file_data || media?.url || null);
  }
  return null;
};

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/public-products/', {
        headers: { 'X-User-Id': String(user?.id || '') },
      });

      const data = response.data;
      const list = Array.isArray(data) ? data : data?.results || data?.products || [];
      setProducts(list || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderItem = ({ item }: { item: Product }) => {
    const imageUrl = getProductImage(item);
    const price = Number(item.price);
    const hasValidPrice = !Number.isNaN(price) && Number.isFinite(price);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/customer/view-product?productId=${item.id}`)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={2}>{item.name || 'Unnamed product'}</Text>
          <Text style={styles.shopName} numberOfLines={1}>{item.shop_name || 'Shop'}</Text>
          {hasValidPrice ? (
            <Text style={styles.price}>₱{price.toFixed(2)}</Text>
          ) : (
            <Text style={styles.priceUnavailable}>Price unavailable</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No products available.</Text>
              </View>
            }
          />
        )}
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: '#6B7280' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  image: { width: 90, height: 90, backgroundColor: '#E5E7EB' },
  imagePlaceholder: { width: 90, height: 90, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 11, color: '#9CA3AF' },
  cardBody: { flex: 1, padding: 12 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  shopName: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '700', color: '#F97316', marginTop: 6 },
  priceUnavailable: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
});