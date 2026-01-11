// app/customer/search.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import RoleGuard from '../../guards/RoleGuard';
import AxiosInstance from '../../../contexts/axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useFilterModal, useFilterModalSafe } from './FilterModalContext';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onFocus?: () => void;
  onPressFilter?: () => void;
}

export function SearchBar({ searchQuery, setSearchQuery, onFocus, onPressFilter }: SearchBarProps) {
  const modal = useFilterModalSafe();

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={onFocus}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => { console.log('[SearchBar] filter pressed', !!modal); (onPressFilter ? onPressFilter() : modal?.openFilter?.()); }}
        >
          <MaterialIcons name="filter-list" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface Product {
  id: string;
  name: string;
  price?: number | string;
  primary_image?: { url: string } | null;
  condition?: string;
  open_for_swap?: boolean;
  shop?: { name?: string; shop_picture?: string };
  category?: any;
  category_admin?: any;
}

const CompactProductCard = ({ product, onPress }: { product: Product; onPress: () => void }) => {
  const priceNumber = typeof product.price === 'number' ? product.price : Number(product.price);
  const hasValidPrice = !isNaN(priceNumber) && priceNumber !== null;
  const isGift = hasValidPrice && priceNumber === 0;

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
        <Image source={{ uri: getImageUrl() }} style={styles.productImage} />
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
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

export default function SearchPage() {
  const params = useLocalSearchParams();
  const showFiltersParam = String(params.showFilters) === '1';
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // filter state is managed globally via FilterModalContext
  const { filterVisible, openFilter, closeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice, condition, setCondition, type, setType, resetFilters } = useFilterModal();

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (showFiltersParam) openFilter();
  }, [params.showFilters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };



  const filteredProducts = products.filter((p) => {
    const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;

    const priceNumber = typeof p.price === 'number' ? p.price : Number(p.price);
    const hasValidPrice = !isNaN(priceNumber) && priceNumber !== null;

    // Type filter
    if (type === 'gift') {
      if (!hasValidPrice || priceNumber !== 0) return false;
    }

    // Condition filter
    if (condition && (p.condition || '').toLowerCase() !== condition.toLowerCase()) return false;

    // Price range filter
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!isNaN(min) && hasValidPrice && priceNumber < min) return false;
    if (!isNaN(max) && hasValidPrice && priceNumber > max) return false;

    return true;
  });

  if (loading) {
    return (
      <RoleGuard allowedRoles={["customer"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["customer"]}>
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onFocus={() => router.push('/customer/includes/search')} onPressFilter={() => openFilter()} />



        {/* Results */}
        <View style={styles.resultsContainer}>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => (
                <CompactProductCard product={item} onPress={() => router.push({ pathname: '/customer/view-product', params: { productId: item.id } })} />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productGrid}
              contentContainerStyle={styles.productGridContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>No products match your filters</Text>
            </View>
          )}
        </View>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: 3, paddingVertical: 12, backgroundColor: '#fff' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', padding: 0 },
  clearButton: { padding: 4 },
  filterButton: { marginLeft: 8, padding: 4 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', paddingBottom: Platform.OS === 'ios' ? 74 : 64 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },

  filtersContainer: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filtersTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  filterRow: { marginBottom: 12 },
  filterLabel: { fontSize: 13, color: '#374151', marginBottom: 6 },
  filterInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, width: 110, marginRight: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F3F4F6' },
  segmentBtnActive: { backgroundColor: '#4F46E5' },
  segmentText: { color: '#374151' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  filterActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  resetBtn: { padding: 10 },
  resetText: { color: '#6B7280' },
  applyBtn: { backgroundColor: '#4F46E5', padding: 10, borderRadius: 8 },
  applyText: { color: '#fff', fontWeight: '700' },

  resultsContainer: { flex: 1, paddingTop: 8 },
  productGrid: { justifyContent: 'space-between', paddingHorizontal: 12 },
  productGridContent: { paddingBottom: 8 },
  productCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12, overflow: 'hidden' },
  giftBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  giftText: { fontSize: 9, color: '#059669', fontWeight: '700', marginLeft: 2 },
  swapBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  swapText: { fontSize: 9, color: '#4F46E5', fontWeight: '700', marginLeft: 2 },
  favoriteButton: { position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 4 },
  productImageContainer: { width: '100%', aspectRatio: 0.95, backgroundColor: '#F9FAFB' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '600', color: '#111827', marginBottom: 3, lineHeight: 15, height: 28 },
  priceContainer: { marginTop: 'auto' },
  freePrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  price: { fontSize: 14, fontWeight: '700', color: '#111827' },
  priceUnavailable: { fontSize: 12, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center', fontWeight: '500' },

  /* Modal */
  modalWrapper: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70%' },
});
