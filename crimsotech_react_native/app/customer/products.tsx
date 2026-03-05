// app/customer/my-products.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import CustomerLayout from './CustomerLayout';
import { Ionicons } from '@expo/vector-icons';

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

export default function MyProducts() {
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
            <Ionicons name="image-outline" size={30} color="#9CA3AF" />
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
    <CustomerLayout disableScroll>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
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
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>My Products</Text>
              <TouchableOpacity 
                style={styles.addButton}
                // onPress={() => router.push('/products')}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>No products yet</Text>
              <Text style={styles.emptySubtext}>Start adding your products to sell!</Text>
              <TouchableOpacity 
                style={styles.emptyAddButton}
                // onPress={() => router.push('/customer/add-product')}
              >
                <Text style={styles.emptyAddButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </CustomerLayout>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24,
    minHeight: 400
  },
  loadingText: { marginTop: 10, color: '#6B7280' },
  listContent: { 
    padding: 16, 
    paddingBottom: 80 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  image: { width: 90, height: 90, backgroundColor: '#E5E7EB' },
  imagePlaceholder: { 
    width: 90, 
    height: 90, 
    backgroundColor: '#E5E7EB', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardBody: { flex: 1, padding: 12 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  shopName: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '700', color: '#EE4D2D', marginTop: 6 },
  priceUnavailable: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});