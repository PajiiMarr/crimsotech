// app/customer/home.tsx
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import RoleGuard from '../guards/RoleGuard';
import AxiosInstance from '../../contexts/axios';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  primary_image?: { url: string } | null;
  shop?: { name: string; shop_picture?: string };
  condition?: string;
  category?: any;
  category_admin?: any;
  open_for_swap?: boolean;
  original_price?: number;
}

interface Category {
  id: string;
  name: string;
}

// Product Card Component
const CompactProductCard = ({
  product,
  onPress
}: {
  product: Product;
  onPress: () => void;
}) => {
  const priceNumber = typeof product.price === 'number' ? product.price : Number(product.price);
  const hasValidPrice = !isNaN(priceNumber) && priceNumber !== null;
  const isGift = hasValidPrice && priceNumber === 0;

  const categoryName = typeof product.category === 'string'
    ? product.category
    : product.category?.name || product.category_admin?.name || '';

  const getImageUrl = () => {
    if (product.primary_image?.url) return product.primary_image.url;
    if (product.shop?.shop_picture) return product.shop.shop_picture;
    return 'https://via.placeholder.com/150';
  };

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.7}>
      {isGift ? (
        <View style={styles.giftBadge}>
          <MaterialIcons name="card-giftcard" size={10} color="#059669" />
          <Text style={styles.giftText}>FREE GIFT</Text>
        </View>
      ) : product.open_for_swap ? (
        <View style={styles.swapBadge}>
          <MaterialIcons name="swap-horiz" size={10} color="#4F46E5" />
          <Text style={styles.swapText}>SWAP</Text>
        </View>
      ) : null}

      <View style={styles.favoriteButton}>
        <TouchableOpacity>
          <MaterialIcons name="favorite-border" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: getImageUrl() }}
          style={styles.productImage}
          defaultSource={require('../../assets/images/icon.png')}
        />
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {categoryName ? <Text style={styles.categoryText}>{categoryName}</Text> : null}
        {product.shop?.name ? <Text style={styles.shopText}>{product.shop.name}</Text> : null}
        <View style={styles.priceContainer}>
          {isGift ? (
            <Text style={styles.freePrice}>FREE GIFT</Text>
          ) : hasValidPrice ? (
            <Text style={styles.price}>₱{priceNumber.toFixed(2)}</Text>
          ) : (
            <Text style={styles.priceUnavailable}>Price unavailable</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function CustomerHome() {
  const { user, registrationStage, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories(), fetchFavorites()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/api/public-products/', {
        headers: { 'X-User-Id': String(user?.id || '') }
      });
      if (response.status === 200) {
        let productsData = response.data;
        if (Array.isArray(productsData)) setProducts(productsData);
        else if (productsData.products && Array.isArray(productsData.products)) setProducts(productsData.products);
        else if (productsData.results && Array.isArray(productsData.results)) setProducts(productsData.results);
        else setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await AxiosInstance.get('/api/customer-products/global-categories/');
      if (response.status === 200) {
        const categoriesData = response.data;
        setCategories(categoriesData.categories || categoriesData || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchFavorites = async () => {
    if (!user?.id) return;
    try {
      const response = await AxiosInstance.get('/api/customer-favorites/', { headers: { 'X-User-Id': String(user.id) } });
      if (response.data.favorites) {
        const favIds = response.data.favorites
          .map((f: any) => typeof f.product === 'string' ? f.product : f.product?.id)
          .filter(Boolean);
        setFavoriteIds(favIds);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Prevent access to home unless registration stage is 4
  useEffect(() => {
    if (!authLoading && registrationStage !== 4) {
      console.log('Access denied: registrationStage !== 4', { registrationStage });
      router.replace('/(auth)/login');
    }
  }, [authLoading, registrationStage]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredProducts = selectedCategory === ''
    ? products
    : products.filter((product: Product) => {
      let prodCatId;
      if (typeof product.category === 'string') prodCatId = product.category;
      else if (product.category && typeof product.category === 'object') prodCatId = (product.category as any).id;
      else prodCatId = product.category_admin?.id;
      return prodCatId && prodCatId === selectedCategory;
    });

  if (loading) {
    return (
      <RoleGuard allowedRoles={['customer']}>
        <CustomerLayout>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout>
        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            <TouchableOpacity
              style={[styles.categoryItem, selectedCategory === '' && styles.categoryItemActive]}
              onPress={() => setSelectedCategory('')}
            >
              <View style={[styles.categoryIcon, selectedCategory === '' && styles.categoryIconActive]}>
                <Text style={[styles.categoryInitial, selectedCategory === '' && styles.categoryInitialActive]}>A</Text>
              </View>
              <Text style={[styles.categoryName, selectedCategory === '' && styles.categoryNameActive]}>All</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryItem, selectedCategory === cat.id && styles.categoryItemActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              >
                <View style={[styles.categoryIcon, selectedCategory === cat.id && styles.categoryIconActive]}>
                  <Text style={[styles.categoryInitial, selectedCategory === cat.id && styles.categoryInitialActive]}>{cat.name.charAt(0)}</Text>
                </View>
                <Text style={[styles.categoryName, selectedCategory === cat.id && styles.categoryNameActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested For You</Text>
          </View>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => (
                <CompactProductCard
                  product={item}
                  onPress={() => router.push({ pathname: '/customer/view-product', params: { productId: item.id } })}
                />
              )}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productGrid}
              scrollEnabled={false}
              contentContainerStyle={styles.productGridContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>No products available yet</Text>
              <Text style={styles.conditionText}>Check back later for new listings!</Text>
            </View>
          )}
        </View>
      </CustomerLayout>
    </RoleGuard>
  );
}

// Keep your styles as-is
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', paddingBottom: Platform.OS === 'ios' ? 74 : 64 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  categoriesSection: { backgroundColor: '#FFFFFF', marginTop: 8, marginHorizontal: 4, paddingVertical: 14, borderRadius: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12, marginLeft: 12 },
  categoriesContent: { paddingHorizontal: 12 },
  categoryItem: { alignItems: 'center', marginRight: 12, width: 68 },
  categoryItemActive: {},
  categoryIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F3F5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryIconActive: { backgroundColor: '#EEF2FF' },
  categoryInitial: { fontSize: 16, fontWeight: '600', color: '#666' },
  categoryInitialActive: { color: '#4F46E5' },
  categoryName: { fontSize: 13, color: '#666', textAlign: 'center' },
  categoryNameActive: { color: '#4F46E5', fontWeight: '600' },
  productsSection: { backgroundColor: '#FFFFFF', marginTop: 16, marginHorizontal: 3, marginBottom: 16, paddingVertical: 14, borderRadius: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 0 },
  productGrid: { justifyContent: 'space-between', paddingHorizontal: 12 },
  productGridContent: { paddingBottom: 8 },
  productCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  giftBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  giftText: { fontSize: 9, color: '#059669', fontWeight: '700', marginLeft: 2 },
  swapBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  swapText: { fontSize: 9, color: '#4F46E5', fontWeight: '700', marginLeft: 2 },
  favoriteButton: { position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 4 },
  productImageContainer: { width: '100%', aspectRatio: 0.95, backgroundColor: '#F9FAFB' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 3, lineHeight: 15, height: 28 },
  categoryText: { fontSize: 11, color: '#3B82F6', fontWeight: '500', marginBottom: 2 },
  shopText: { fontSize: 10, color: '#6B7280', marginBottom: 8 },
  priceContainer: { marginTop: 'auto' },
  freePrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  price: { fontSize: 14, fontWeight: '700', color: '#111827' },
  priceUnavailable: { fontSize: 12, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  conditionText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  bottomPadding: { height: Platform.OS === 'ios' ? 74 : 64 },
});
