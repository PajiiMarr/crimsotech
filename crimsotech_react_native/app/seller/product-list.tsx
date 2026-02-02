import React, { useCallback, useMemo, useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Search, Plus, Edit3, X, Eye, Package, AlertCircle } from 'lucide-react-native';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x300?text=No+Image';

const buildImageUrl = (url?: string | null) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (AxiosInstance.defaults.baseURL || '').replace(/\/$/, '');
  if (!base) return url;
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

type ProductItem = {
  id: string;
  title: string;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'LOW STOCK' | 'OUT OF STOCK';
  sales: number;
  image: string;
};

export default function PersonalListingPage() {
  const { userId, shopId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'LOW STOCK': return { bg: '#FEF3C7', text: '#D97706' };
      case 'OUT OF STOCK': return { bg: '#FEE2E2', text: '#EF4444' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const fetchProducts = useCallback(async () => {
    if (!userId) {
      setError('User not found. Please login again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId },
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || ''
        }
      });

      const apiProducts = response.data?.products || [];
      const mapped: ProductItem[] = apiProducts.map((product: any) => {
        const stock = Number(product.quantity || 0);
        let status: ProductItem['status'] = 'ACTIVE';
        if (stock <= 0) status = 'OUT OF STOCK';
        else if (stock <= 2) status = 'LOW STOCK';

        const primaryUrl = product.primary_image?.url;
        const mediaUrl = Array.isArray(product.media_files) && product.media_files.length > 0
          ? (product.media_files[0].file_url || product.media_files[0].file_data)
          : undefined;

        return {
          id: String(product.id),
          title: product.name || 'Unnamed Product',
          price: Number(product.price || 0),
          stock,
          status,
          sales: Number(product.sales || 0),
          image: buildImageUrl(primaryUrl || mediaUrl || product.image || product.thumbnail || product.image_url)
        };
      });

      setProducts(mapped);
    } catch (err: any) {
      console.error('Failed to load seller products:', err);
      setError(err?.response?.data?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const renderProduct = ({ item }: { item: ProductItem }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => router.push({
          pathname: '/customer/view-product',
          params: { productId: item.id, source: 'seller', userId: userId || '' }
        })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={[styles.image, item.stock === 0 && styles.imageDimmed]} />
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Edit3 color="#fff" size={14} />
          </TouchableOpacity>
        </View>

        <View style={styles.details}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.productPrice}>₱{item.price.toLocaleString()}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Package size={12} color="#94A3B8" />
              <Text style={[styles.statValue, item.stock <= 1 && styles.warningText]}>{item.stock}</Text>
            </View>
            <View style={styles.statBox}>
              <Eye size={12} color="#94A3B8" />
              <Text style={styles.statValue}>{Math.floor(item.sales * 4.5)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Centered Header via Stack.Screen */}
      <Stack.Screen options={{ 
        title: 'Product List', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' }
      }} />

      {/* SEARCH SECTION */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={18} />
          <TextInput
            placeholder="Search products..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color="#94A3B8" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#0F172A" />
                <Text style={styles.emptyText}>Loading products...</Text>
              </>
            ) : (
              <>
                <AlertCircle size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>{error || 'No products found'}</Text>
              </>
            )}
          </View>
        }
      />

            {/* ADD THIS FAB BUTTON AT THE END, JUST BEFORE THE CLOSING SafeAreaView */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => router.push('/customer/create/add-selling-product-form')}
      >
        <Plus color="#fff" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B', fontWeight: '500' },

  listContainer: { padding: PADDING, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  
  card: { 
    width: CARD_WIDTH, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: GAP,
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  imageContainer: { height: 140, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageDimmed: { opacity: 0.4 },
  
  statusBadge: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  statusBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  
  editBtn: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    backgroundColor: 'rgba(15, 23, 42, 0.7)', 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    backdropFilter: 'blur(4px)'
  },

  details: { padding: 12 },
  productTitle: { fontSize: 13, fontWeight: '700', color: '#334155', height: 38, lineHeight: 18 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  warningText: { color: '#EF4444' },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12 },
  
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#0F172A', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
});