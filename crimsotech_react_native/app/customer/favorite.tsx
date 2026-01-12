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
  TextInput,
  Platform,
} from 'react-native';
import RoleGuard from '../guards/RoleGuard';
import AxiosInstance from '../../contexts/axios';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number | string;
  primary_image?: { url: string } | null;
  media_files?: any[];
  shop?: { name?: string; shop_picture?: string } | null;
  open_for_swap?: boolean;
}

const FAVORITES_KEY = 'optimistic_favorites';

const CompactFavoriteCard = ({ product, isFavorite, onToggle, onPress }: { product: Product; isFavorite: boolean; onToggle: (id: string, nowFav: boolean) => void; onPress: () => void }) => {
  const priceNumber = typeof product.price === 'number' ? product.price : Number(product.price);
  const hasValidPrice = !isNaN(priceNumber) && priceNumber !== null;
  const isGift = hasValidPrice && priceNumber === 0;

  const categoryName = (product as any).category?.name || (product as any).category_admin?.name || '';
  const getImageUrl = () => {
    if (product.primary_image?.url) return product.primary_image.url;
    if (product.shop?.shop_picture) return product.shop.shop_picture;
    return 'https://via.placeholder.com/150';
  };

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.8}>
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
        <TouchableOpacity onPress={() => onToggle(product.id, !isFavorite)}>
          <MaterialIcons name={isFavorite ? 'favorite' : 'favorite-border'} size={16} color={isFavorite ? '#EF4444' : '#666'} />
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
        {categoryName ? (
          <View style={styles.categoryBadge}>
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryInitial}>{categoryName.charAt(0)}</Text>
            </View>
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>
        ) : null}
        {product.shop?.name ? <Text style={styles.shopText}>{product.shop.name}</Text> : null}
        <View style={styles.priceContainer}>
          {isGift ? (
            <Text style={styles.freePrice}>FREE GIFT</Text>
          ) : hasValidPrice ? (
            <Text style={styles.price}>₱{Number(priceNumber).toFixed(2)}</Text>
          ) : (
            <Text style={styles.priceUnavailable}>Price unavailable</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchFavorites = async () => {
    if (!user?.id) return;
    setLoading(true);

    // Load optimistic favorites first
    try {
      const rawOpt = await AsyncStorage.getItem(FAVORITES_KEY);
      if (rawOpt) {
        const optimistic = JSON.parse(rawOpt) as Product[];
        if (optimistic && optimistic.length > 0) {
          setFavorites(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            optimistic.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load optimistic favorites', e);
    }

    try {
      const res = await AxiosInstance.get('/api/customer-favorites/', { headers: { 'X-User-Id': String(user.id) } });
      if (res.data && res.data.favorites) {
        const favoritesWithProduct = res.data.favorites.filter((f: any) => f.product);
        const products = await Promise.all(
          favoritesWithProduct.map(async (fav: any) => {
            try {
              const productId = typeof fav.product === 'string' ? fav.product : fav.product?.id;
              if (!productId) return null;

              // Try product detail endpoint
              try {
                const prodRes = await AxiosInstance.get(`/api/public-products/${productId}/`, { headers: { 'X-User-Id': String(user.id) } });
                const data = prodRes.data.data || prodRes.data;
                return {
                  id: data.id,
                  name: data.name || 'No name',
                  description: data.description || '',
                  price: Number(data.price) || 0,
                  primary_image: data.primary_image || null,
                  media_files: data.media_files || [],
                  shop: data.shop || null,
                  open_for_swap: data.open_for_swap || false,
                  // include category info (if present)
                  category: data.category ? { id: data.category.id, name: data.category.name } : data.category_admin ? { id: data.category_admin.id, name: data.category_admin.name } : null,
                } as Product;
              } catch (err: any) {
                // If product is not found (404) remove the favorite record to keep data consistent
                if (err?.response?.status === 404) {
                  console.warn('Favorite product not found on server, removing favorite entry:', productId);
                  try {
                    await AxiosInstance.delete('/api/customer-favorites/', {
                      data: { product: productId, customer: user.id },
                      headers: { 'X-User-Id': String(user.id) },
                    });
                    // remove from local favorite ids state optimistically
                    setFavoriteIds(prev => prev.filter(id => id !== productId));
                  } catch (delErr) {
                    console.warn('Failed to delete stale favorite', productId, delErr);
                  }

                  // also remove any optimistic storage entry for this product
                  try {
                    const rawOpt = await AsyncStorage.getItem(FAVORITES_KEY);
                    if (rawOpt) {
                      const existing = JSON.parse(rawOpt) as Product[];
                      const remaining = existing.filter(p => p.id !== productId);
                      if (remaining.length) await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(remaining));
                      else await AsyncStorage.removeItem(FAVORITES_KEY);
                    }
                  } catch (e) {
                    console.warn('Failed to clean optimistic storage for stale favorite', e);
                  }

                  return null;
                }

                console.warn('Failed to fetch favorite product', productId, err?.message || err);
                return null;
              }
            } catch (err) {
              console.error('Failed to fetch favorite product', err);
              return null;
            }
          })
        );

        const valid = products.filter(p => p !== null) as Product[];
        setFavorites(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          valid.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });

        // Update favoriteIds
        const ids = favoritesWithProduct.map((f: any) => typeof f.product === 'string' ? f.product : f.product?.id).filter(Boolean);
        setFavoriteIds(ids);

        // Clear optimistic entries which are now present
        try {
          const rawOpt2 = await AsyncStorage.getItem(FAVORITES_KEY);
          if (rawOpt2) {
            const optimistic = JSON.parse(rawOpt2) as Product[];
            const remaining = optimistic.filter(o => !valid.find(v => v.id === o.id));
            if (remaining.length > 0) await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(remaining));
            else await AsyncStorage.removeItem(FAVORITES_KEY);
          }
        } catch (e) {
          console.warn('Failed to clear optimistic favorites', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleFavorite = async (productId: string, nowFavorite: boolean) => {
    if (!user?.id) return;
    try {
      if (nowFavorite) {
        // Add to favorites
        await AxiosInstance.post('/api/customer-favorites/', { product: productId, customer: user.id }, { headers: { 'X-User-Id': String(user.id) } });
        setFavoriteIds(prev => Array.from(new Set([...prev, productId])));

        // Optionally add optimistic product object to AsyncStorage (so page + web can sync)
        try {
          const rawOpt = await AsyncStorage.getItem(FAVORITES_KEY);
          const existing = rawOpt ? JSON.parse(rawOpt) as Product[] : [];
          const productObj = favorites.find(f => f.id === productId);
          if (productObj) existing.push(productObj);
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(existing));
        } catch (e) { console.warn('Failed to set optimistic favorites', e); }
      } else {
        // Remove from favorites
        await AxiosInstance.delete('/api/customer-favorites/', { data: { product: productId, customer: user.id }, headers: { 'X-User-Id': String(user.id) } });
        setFavoriteIds(prev => prev.filter(id => id !== productId));

        // Remove from AsyncStorage optimistic list
        try {
          const rawOpt = await AsyncStorage.getItem(FAVORITES_KEY);
          if (rawOpt) {
            const existing = JSON.parse(rawOpt) as Product[];
            const remaining = existing.filter(p => p.id !== productId);
            if (remaining.length) await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(remaining));
            else await AsyncStorage.removeItem(FAVORITES_KEY);
          }
        } catch (e) { console.warn('Failed to remove optimistic favorite', e); }

        // Also remove from favorites shown list
        setFavorites(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  useEffect(() => { fetchFavorites(); }, [user?.id]);

  const onRefresh = () => { setRefreshing(true); fetchFavorites(); };

  const filtered = favorites.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    if (selectedCategory) {
      const cid = (p as any).category?.id;
      if (cid !== selectedCategory) return false;
    }
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.shop?.name || '').toLowerCase().includes(term)
    );
  });

  if (!user) {
    return (
      <RoleGuard allowedRoles={["customer"]}>
        <CustomerLayout>
          <View style={styles.center}>
            <Text style={styles.emptyText}>Please sign in to see your favorites</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["customer"]}>
      <CustomerLayout disableScroll>
        <FlatList
          data={filtered}
          renderItem={({ item }) => (
            <CompactFavoriteCard
              product={item}
              isFavorite={favoriteIds.includes(item.id)}
              onToggle={toggleFavorite}
              onPress={() => router.push({ pathname: '/customer/view-product', params: { productId: item.id } })}
            />
          )}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={styles.productGrid}
          contentContainerStyle={styles.flatListContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={() => {
            // derive categories from favorites
            const categories = favorites.reduce((acc: Array<any>, p) => {
              const c = (p as any).category;
              if (c && !acc.find(a => a.id === c.id)) acc.push(c);
              return acc;
            }, [] as Array<any>);

            return (
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Your saved products</Text>
                <Text style={styles.headerSubtitle}>{favorites.length} saved</Text>


                {categories.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
                    <TouchableOpacity style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]} onPress={() => setSelectedCategory(null)}>
                      <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity key={c.id} style={[styles.categoryChip, selectedCategory === c.id && styles.categoryChipActive]} onPress={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}>
                        <Text style={[styles.categoryChipText, selectedCategory === c.id && styles.categoryChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          }}
          ListEmptyComponent={() => (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="favorite" size={48} color="#EF4444" />
                <Text style={styles.emptyText}>You have no favorites yet</Text>
                <Text style={styles.conditionText}>Tap the heart on products to add them here</Text>
              </View>
            )
          )}
        />
      </CustomerLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingContainer: { paddingVertical: 40 },
  searchContainer: { padding: 12, backgroundColor: '#fff', marginTop: 8, marginHorizontal: 12, borderRadius: 8 },
  searchInput: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 },
  productGrid: { justifyContent: 'space-between', paddingHorizontal: 12 },
  productGridContent: { paddingBottom: 24 },
  flatListContent: { paddingBottom: 24, flexGrow: 1 },
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
  /* Category badge */
  categoryBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F3F5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  categoryInitial: { fontSize: 12, fontWeight: '700', color: '#666' },
  shopText: { fontSize: 10, color: '#6B7280', marginBottom: 8 },
  priceContainer: { marginTop: 'auto' },
  freePrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  price: { fontSize: 14, fontWeight: '700', color: '#111827' },
  priceUnavailable: { fontSize: 12, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  conditionText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  headerContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  categoriesRow: { marginTop: 8, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 16, marginRight: 8 },
  categoryChipActive: { backgroundColor: '#EDE9FE' },
  categoryChipText: { fontSize: 13, color: '#374151' },
  categoryChipTextActive: { color: '#4F46E5', fontWeight: '700' },
});
