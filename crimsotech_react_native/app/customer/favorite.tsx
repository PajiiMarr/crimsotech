import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
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
  variants?: Array<{
    id: string;
    price: number;
    original_price: number | null;
    compare_price: number | null;
  }>;
  id: string;
  name: string;
  description: string;
  condition?: number;
  category?: any;
  category_admin?: any;
  shop?: {
    id: string;
    name: string;
    shop_picture?: string;
  } | null;
  customer?: any;
  average_rating?: number | null;
  review_count?: number | string;
  min_variant_price?: number;
  max_variant_price?: number;
  total_variant_stock?: number;
  active_variant_count?: number;
  in_stock_variant_count?: number;
  display_price?: string;
  total_stock?: number;
  available_stock?: number;
  ordered_quantity?: number;
  has_stock?: boolean;
  availability_status?: string;
  availability_message?: string;
  listing_type?: 'shop' | 'personal' | 'unknown';
  seller_id?: string;
  seller_name?: string;
  seller_avatar?: string | null;
  primary_image_url?: string | null;
  is_favorite?: boolean;
  primary_image?: { url: string } | null;
  media_files?: Array<{ file_data?: string; file_url?: string }>;
  price_display?: string;
  price_range?: {
    min: number;
    max: number;
    is_range: boolean;
  };
}

interface Category {
  id: string;
  name: string;
}

const insertCommas = (intPart: string): string => {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parse any value to a finite number, returns 0 if invalid
const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isFinite(n) ? n : 0;
};

// Format number with commas — always operates on a real number
const formatNumber = (val: number | string | null | undefined): string => {
  const n = toNumber(val);
  return n.toLocaleString('en-PH');
};

// Format currency — always operates on a real number
const formatCurrency = (val: number | string | null | undefined): string => {
  const n = toNumber(val);
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return `₱${insertCommas(intPart)}.${decPart}`;
};

// Format rating with one decimal place — always operates on a real number
const formatRating = (val: number | string | null | undefined): string => {
  return toNumber(val).toFixed(1);
};

// Get product price info (always show lowest price)
const getProductPrice = (product: Product): {
  displayPrice: string;
  originalPrice: string | null;
  hasDiscount: boolean;
  isGift: boolean;
  hasStock: boolean;
} => {
  const nameLower = product.name?.toLowerCase() || '';
  if (nameLower.includes('gift') || nameLower.includes('free')) {
    return { displayPrice: 'FREE GIFT', originalPrice: null, hasDiscount: false, isGift: true, hasStock: product.has_stock || false };
  }

  if (product.min_variant_price !== undefined && product.min_variant_price !== null) {
    const minPrice = toNumber(product.min_variant_price);
    const maxPrice = toNumber(product.max_variant_price);

    if (minPrice === 0 && maxPrice === 0) {
      return { displayPrice: 'FREE GIFT', originalPrice: null, hasDiscount: false, isGift: true, hasStock: product.has_stock || false };
    }

    let lowestOriginalPrice: number | null = null;
    let hasDiscount = false;

    if (product.variants && product.variants.length > 0) {
      const variantsWithOriginal = product.variants.filter(v =>
        toNumber(v.original_price) > 0 || toNumber(v.compare_price) > 0
      );

      if (variantsWithOriginal.length > 0) {
        const lowestPriceVariant = variantsWithOriginal.reduce((lowest, current) =>
          toNumber(current.price) < toNumber(lowest.price) ? current : lowest
        , variantsWithOriginal[0]);

        const origVal = toNumber(lowestPriceVariant.original_price) || toNumber(lowestPriceVariant.compare_price);
        const curPrice = toNumber(lowestPriceVariant.price) || minPrice;

        if (origVal > 0 && origVal > curPrice) {
          lowestOriginalPrice = origVal;
          hasDiscount = true;
        }
      }
    }

    return {
      displayPrice: formatCurrency(minPrice),
      originalPrice: hasDiscount && lowestOriginalPrice !== null ? formatCurrency(lowestOriginalPrice) : null,
      hasDiscount,
      isGift: false,
      hasStock: product.has_stock || false,
    };
  }

  if (product.price_display && product.price_display !== 'Price unavailable') {
    if (product.price_display.includes(' - ')) {
      return {
        displayPrice: product.price_display.split(' - ')[0],
        originalPrice: null,
        hasDiscount: false,
        isGift: false,
        hasStock: product.has_stock || false,
      };
    }

    const isGift =
      product.price_display === 'FREE GIFT' ||
      product.price_display.includes('FREE') ||
      product.price_display === '₱0' ||
      product.price_display === '₱0.00';

    return { displayPrice: product.price_display, originalPrice: null, hasDiscount: false, isGift, hasStock: product.has_stock || false };
  }

  return { displayPrice: 'Price unavailable', originalPrice: null, hasDiscount: false, isGift: false, hasStock: false };
};

// ----------------------------
// Favorite Product Card Component (Same as home but with heart icon)
// ----------------------------
const CompactFavoriteCard = ({ product, isFavorite, onToggle, onPress }: { 
  product: Product; 
  isFavorite: boolean; 
  onToggle: (id: string, nowFav: boolean) => void; 
  onPress: () => void;
}) => {
  const [productInfo, setProductInfo] = useState(getProductPrice(product));

  useEffect(() => {
    setProductInfo(getProductPrice(product));
  }, [product]);

  const categoryName =
    typeof product.category === 'string'
      ? product.category
      : product.category?.name || product.category_admin?.name || '';

  const getImageUrl = (): string => {
    if (product.primary_image_url) return product.primary_image_url;

    const base = (AxiosInstance?.defaults?.baseURL || '').replace(/\/$/, '');
    const resolve = (url: string) => {
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return base ? `${base}${url.startsWith('/') ? url : `/${url}`}` : url;
    };

    if (product.primary_image?.url) return resolve(product.primary_image.url);

    if (product.media_files && product.media_files.length > 0) {
      const url = product.media_files[0].file_data || product.media_files[0].file_url;
      if (url) return resolve(url);
    }

    if (product.shop?.shop_picture) return resolve(product.shop.shop_picture);

    return 'https://via.placeholder.com/150';
  };

  // Always parse review_count to a number before formatting
  const formattedReviewCount = formatNumber(toNumber(product.review_count));
  const formattedRating = formatRating(product.average_rating);

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.7}>
      {/* Discount Badge */}
      {productInfo.hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>SALE</Text>
        </View>
      )}

      {/* Gift Badge */}
      {productInfo.isGift && (
        <View style={styles.giftBadge}>
          <MaterialIcons name="card-giftcard" size={10} color="#059669" />
          <Text style={styles.giftText}>FREE GIFT</Text>
        </View>
      )}

      {/* Out of stock badge */}
      {!productInfo.hasStock && product.availability_status && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>
            {product.availability_status === 'sold_out' ? 'SOLD OUT' : 'OUT OF STOCK'}
          </Text>
        </View>
      )}

      {/* Heart Icon for Favorites */}
      <View style={styles.favoriteButton}>
        <TouchableOpacity onPress={() => onToggle(product.id, !isFavorite)}>
          <MaterialIcons 
            name={isFavorite ? 'favorite' : 'favorite-border'} 
            size={20} 
            color={isFavorite ? '#EF4444' : '#9CA3AF'} 
          />
        </TouchableOpacity>
      </View>

      {/* Product image */}
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: getImageUrl() }}
          style={[styles.productImage, !productInfo.hasStock && styles.outOfStockImage]}
          defaultSource={require('../../assets/images/icon.png')}
          onError={() => console.warn('Failed to load image for product', product.id)}
        />
      </View>

      {/* Product info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>

        {/* Rating */}
        {product.average_rating !== null && product.average_rating !== undefined && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={12}
                  color={star <= Math.round(toNumber(product.average_rating)) ? '#F59E0B' : '#D1D5DB'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {formattedRating} ({formattedReviewCount})
            </Text>
          </View>
        )}

        {categoryName ? <Text style={styles.categoryText}>{categoryName}</Text> : null}

        {/* Seller */}
        <View style={styles.sellerRow}>
          <MaterialIcons
            name={product.listing_type === 'shop' ? 'store' : 'person'}
            size={10}
            color="#6B7280"
          />
          <Text style={styles.sellerText} numberOfLines={1}>
            {product.seller_name || product.shop?.name || 'Unknown Seller'}
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <View style={styles.priceWrapper}>
            {productInfo.originalPrice && (
              <Text style={styles.originalPrice}>{productInfo.originalPrice}</Text>
            )}
            <Text style={productInfo.isGift ? styles.freePrice : styles.price}>
              {productInfo.displayPrice}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FAVORITES_KEY = 'optimistic_favorites';

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
      const res = await AxiosInstance.get('/customer-favorites/', { headers: { 'X-User-Id': String(user.id) } });
      if (res.data && res.data.favorites) {
        const favoritesWithProduct = res.data.favorites.filter((f: any) => f.product);
        const products = await Promise.all(
          favoritesWithProduct.map(async (fav: any) => {
            try {
              const productId = typeof fav.product === 'string' ? fav.product : fav.product?.id;
              if (!productId) return null;

              // Try product detail endpoint
              try {
                const prodRes = await AxiosInstance.get(`/public-products/${productId}/`, { headers: { 'X-User-Id': String(user.id) } });
                const data = prodRes.data;
                
                // Ensure all numeric fields are real numbers
                const normalized = {
                  ...data,
                  average_rating: data.average_rating !== undefined && data.average_rating !== null ? toNumber(data.average_rating) : null,
                  review_count: toNumber(data.review_count),
                  min_variant_price: toNumber(data.min_variant_price),
                  max_variant_price: toNumber(data.max_variant_price),
                  total_variant_stock: toNumber(data.total_variant_stock),
                  total_stock: toNumber(data.total_stock),
                  available_stock: toNumber(data.available_stock),
                  ordered_quantity: toNumber(data.ordered_quantity),
                  variants: data.variants || [],
                };
                
                return normalized as Product;
              } catch (err: any) {
                // If product is not found (404) remove the favorite record to keep data consistent
                if (err?.response?.status === 404) {
                  console.warn('Favorite product not found on server, removing favorite entry:', productId);
                  try {
                    await AxiosInstance.delete('/customer-favorites/', {
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
        await AxiosInstance.post('/customer-favorites/', { product: productId, customer: user.id }, { headers: { 'X-User-Id': String(user.id) } });
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
        await AxiosInstance.delete('/customer-favorites/', { data: { product: productId, customer: user.id }, headers: { 'X-User-Id': String(user.id) } });
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

  // Derive categories from favorites
  const categories = favorites.reduce((acc: Category[], p) => {
    const c = p.category || p.category_admin;
    if (c && c.id && !acc.find(a => a.id === c.id)) acc.push({ id: c.id, name: c.name });
    return acc;
  }, []);

  const filtered = favorites.filter(p => {
    const term = searchTerm.trim().toLowerCase();
    if (selectedCategory) {
      const cid = (p.category || p.category_admin)?.id;
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
              onPress={() => router.push({ pathname: '/customer/view-product', params: { id: item.id } })}
            />
          )}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={styles.productGrid}
          contentContainerStyle={styles.flatListContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={() => (
            <View style={styles.headerContainer}>
              {/* <Text style={styles.headerTitle}>Your saved products</Text>
              <Text style={styles.headerSubtitle}>{favorites.length} saved</Text> */}

              {/* Search Bar */}
              {/* <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your favorites..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor="#9CA3AF"
                />
                {searchTerm !== '' && (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <MaterialIcons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View> */}

              {/* Categories */}
              {categories.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.categoriesRow} 
                  contentContainerStyle={styles.categoriesContent}
                >
                  <TouchableOpacity 
                    style={[styles.categoryItem, !selectedCategory && styles.categoryItemActive]} 
                    onPress={() => setSelectedCategory(null)}
                  >
                    <View style={[styles.categoryIcon, !selectedCategory && styles.categoryIconActive]}>
                      <Text style={[styles.categoryInitial, !selectedCategory && styles.categoryInitialActive]}>All</Text>
                    </View>
                    <Text style={[styles.categoryName, !selectedCategory && styles.categoryNameActive]}>All</Text>
                  </TouchableOpacity>

                  {categories.map(c => (
                    <TouchableOpacity 
                      key={c.id} 
                      style={[styles.categoryItem, selectedCategory === c.id && styles.categoryItemActive]} 
                      onPress={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                    >
                      <View style={[styles.categoryIcon, selectedCategory === c.id && styles.categoryIconActive]}>
                        <Text style={[styles.categoryInitial, selectedCategory === c.id && styles.categoryInitialActive]}>
                          {c.name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={[styles.categoryName, selectedCategory === c.id && styles.categoryNameActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          ListEmptyComponent={() => (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EE4D2D" />
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

// ----------------------------
// Styles (Copied exactly from home.tsx)
// ----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  flatListContent: { paddingBottom: 24, flexGrow: 1 },
  productGrid: { justifyContent: 'space-between', paddingHorizontal: 12 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  giftBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  giftText: { fontSize: 9, color: '#059669', fontWeight: '700', marginLeft: 2 },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 2,
  },
  outOfStockText: { fontSize: 9, color: '#FFFFFF', fontWeight: '700' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 2,
  },
  discountText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 6,
  },
  productImageContainer: { width: '100%', aspectRatio: 0.95, backgroundColor: '#F9FAFB' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  outOfStockImage: { opacity: 0.5 },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 3, lineHeight: 15, height: 30 },
  categoryText: { fontSize: 11, color: '#3B82F6', fontWeight: '500', marginBottom: 2 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 2 },
  sellerText: { fontSize: 10, color: '#6B7280', flex: 1 },
  priceContainer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceWrapper: { flexDirection: 'column', alignItems: 'flex-start' },
  freePrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  price: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  originalPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', marginBottom: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  starsContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 10, color: '#6B7280' },
  headerContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  categoriesRow: { marginTop: 8, marginBottom: 10 },
  categoriesContent: { paddingHorizontal: 12 },
  categoryItem: { alignItems: 'center', marginRight: 12, width: 68 },
  categoryItemActive: {},
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconActive: { backgroundColor: '#EEF2FF' },
  categoryInitial: { fontSize: 16, fontWeight: '600', color: '#666' },
  categoryInitialActive: { color: '#4F46E5' },
  categoryName: { fontSize: 13, color: '#666', textAlign: 'center' },
  categoryNameActive: { color: '#4F46E5', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  conditionText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  bottomPadding: { height: Platform.OS === 'ios' ? 74 : 64 },
});