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
  Platform,
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
  condition?: number;
  category?: any;
  category_admin?: any;
  shop?: {
    id: string;
    name: string;
    shop_picture?: string;
  } | null;
  customer?: any;
  
  // Fields from the public products endpoint list() method
  min_variant_price?: number;
  max_variant_price?: number;
  total_variant_stock?: number;
  active_variant_count?: number;
  in_stock_variant_count?: number;
  
  // Computed fields from the list method
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
  
  // Original serializer fields
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

// ----------------------------
// Get product price (always show lowest price)
// ----------------------------
const getProductPrice = (product: Product): { 
  displayPrice: string; 
  isGift: boolean;
  hasStock: boolean;
} => {
  // Check if it's a gift by name
  const nameLower = product.name?.toLowerCase() || '';
  if (nameLower.includes('gift') || nameLower.includes('free')) {
    return {
      displayPrice: "FREE GIFT",
      isGift: true,
      hasStock: product.has_stock || false,
    };
  }
  
  // Use min_variant_price to show the lowest price
  if (product.min_variant_price !== undefined && product.min_variant_price !== null) {
    const minPrice = product.min_variant_price;
    
    // Check if it's a gift (all variants have zero price)
    if (minPrice === 0 && product.max_variant_price === 0) {
      return {
        displayPrice: "FREE GIFT",
        isGift: true,
        hasStock: product.has_stock || false,
      };
    }
    
    // Show only the lowest price
    return {
      displayPrice: `₱${minPrice.toFixed(2)}`,
      isGift: false,
      hasStock: product.has_stock || false,
    };
  }
  
  // Fallback to price_display from serializer
  if (product.price_display && product.price_display !== "Price unavailable") {
    // Check if price_display indicates a range, extract the lowest price
    if (product.price_display.includes(' - ')) {
      const lowestPrice = product.price_display.split(' - ')[0];
      return {
        displayPrice: lowestPrice,
        isGift: false,
        hasStock: product.has_stock || false,
      };
    }
    
    const isGift = product.price_display === "FREE GIFT" || 
                   product.price_display.includes("FREE") ||
                   product.price_display === "₱0" || 
                   product.price_display === "₱0.00";
    
    return {
      displayPrice: product.price_display,
      isGift,
      hasStock: product.has_stock || false,
    };
  }
  
  // Default fallback
  return {
    displayPrice: "Price unavailable",
    isGift: false,
    hasStock: false,
  };
};

// ----------------------------
// Product Card Component
// ----------------------------
const CompactProductCard = ({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) => {
  const [productInfo, setProductInfo] = useState(getProductPrice(product));

  useEffect(() => {
    setProductInfo(getProductPrice(product));
  }, [product]);

  const categoryName = typeof product.category === 'string'
    ? product.category
    : product.category?.name || product.category_admin?.name || '';

  const getImageUrl = () => {
    // Use primary_image_url from the API first
    if (product.primary_image_url) {
      return product.primary_image_url;
    }
    
    // Try primary_image object
    if (product.primary_image?.url) {
      const url = product.primary_image.url;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const base = AxiosInstance?.defaults?.baseURL || '';
      const normalizedBase = base.replace(/\/$/, '');
      const normalizedRaw = url.startsWith('/') ? url : `/${url}`;
      return normalizedBase ? `${normalizedBase}${normalizedRaw}` : normalizedRaw;
    }
    
    // Try media_files
    if (product.media_files && product.media_files.length > 0) {
      const media = product.media_files[0];
      const url = media.file_data || media.file_url;
      if (url) {
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const base = AxiosInstance?.defaults?.baseURL || '';
        const normalizedBase = base.replace(/\/$/, '');
        const normalizedRaw = url.startsWith('/') ? url : `/${url}`;
        return normalizedBase ? `${normalizedBase}${normalizedRaw}` : normalizedRaw;
      }
    }
    
    // Fallback to shop picture
    if (product.shop?.shop_picture) {
      const pic = product.shop.shop_picture;
      if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
      const base = AxiosInstance?.defaults?.baseURL || '';
      const normalizedBase = base.replace(/\/$/, '');
      const normalizedRaw = pic.startsWith('/') ? pic : `/${pic}`;
      return normalizedBase ? `${normalizedBase}${normalizedRaw}` : normalizedRaw;
    }
    
    return 'https://via.placeholder.com/150';
  };

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.7}>
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

      {/* Product image */}
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: getImageUrl() }}
          style={[
            styles.productImage,
            !productInfo.hasStock && styles.outOfStockImage
          ]}
          defaultSource={require('../../assets/images/icon.png')}
          onError={(e: any) => console.warn('Failed to load image for product', product.id)}
        />
      </View>

      {/* Product info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {categoryName ? <Text style={styles.categoryText}>{categoryName}</Text> : null}
        
        {/* Seller info */}
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

        {/* Price - Always shows lowest price */}
        <View style={styles.priceContainer}>
          <Text style={productInfo.isGift ? styles.freePrice : styles.price}>
            {productInfo.displayPrice}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function CustomerHome() {
  const { user, registrationStage, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      await fetchProducts();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/public-products/', {
        headers: { 'X-User-Id': String(user?.id || '') },
      });

      let productsData = response.data;
      let productsList = [];
      
      if (Array.isArray(productsData)) {
        productsList = productsData;
      } else if (productsData.results) {
        productsList = productsData.results;
      } else {
        productsList = [];
      }

      console.log(`Fetched ${productsList.length} products from public endpoint`);
      
      setProducts(productsList);
      
      // Extract unique categories from products
      const categoryMap = new Map();
      productsList.forEach((product: Product) => {
        const cat = product.category || product.category_admin;
        if (cat && cat.id && !categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, { id: cat.id, name: cat.name });
        }
      });
      setCategories(Array.from(categoryMap.values()));
      
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setCategories([]);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Prevent access to home unless registration stage is 4
  useEffect(() => {
    if (!authLoading && registrationStage !== 4) {
      console.log('Access denied: registrationStage !== 4', { registrationStage });
      router.replace('/(auth)/login');
    }
  }, [authLoading, registrationStage]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchData(); 
  };

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
        <CustomerLayout refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EE4D2D" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <CustomerLayout refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
              <TouchableOpacity
                style={[styles.categoryItem, selectedCategory === '' && styles.categoryItemActive]}
                onPress={() => setSelectedCategory('')}
              >
                <View style={[styles.categoryIcon, selectedCategory === '' && styles.categoryIconActive]}>
                  <Text style={[styles.categoryInitial, selectedCategory === '' && styles.categoryInitialActive]}>All</Text>
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
        )}

        {/* Products */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>For You</Text>
            <Text style={styles.productCount}>{filteredProducts.length} items</Text>
          </View>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => (
                <CompactProductCard
                  product={item}
                  onPress={() => router.push({ 
                    pathname: '/customer/view-product', 
                    params: { productId: item.id } 
                  })}
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

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    paddingBottom: Platform.OS === 'ios' ? 74 : 64 
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  categoriesSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 8, 
    marginHorizontal: 4, 
    paddingVertical: 14, 
    borderRadius: 12, 
    ...Platform.select({ 
      ios: { 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 3, 
        shadowOffset: { width: 0, height: 1 } 
      }, 
      android: { elevation: 1 } 
    }) 
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12, marginLeft: 12 },
  productCount: { fontSize: 12, color: '#6B7280', marginRight: 12 },
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
    marginBottom: 8 
  },
  categoryIconActive: { backgroundColor: '#EEF2FF' },
  categoryInitial: { fontSize: 16, fontWeight: '600', color: '#666' },
  categoryInitialActive: { color: '#4F46E5' },
  categoryName: { fontSize: 13, color: '#666', textAlign: 'center' },
  categoryNameActive: { color: '#4F46E5', fontWeight: '600' },
  productsSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 16, 
    marginHorizontal: 3, 
    marginBottom: 16, 
    paddingVertical: 14, 
    borderRadius: 12, 
    ...Platform.select({ 
      ios: { 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 3, 
        shadowOffset: { width: 0, height: 1 } 
      }, 
      android: { elevation: 1 } 
    }) 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12, 
    paddingHorizontal: 12 
  },
  productGrid: { justifyContent: 'space-between', paddingHorizontal: 12 },
  productGridContent: { paddingBottom: 8 },
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
      ios: { 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 3, 
        shadowOffset: { width: 0, height: 1 } 
      }, 
      android: { elevation: 1 } 
    }) 
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
    zIndex: 2 
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
  outOfStockText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productImageContainer: { width: '100%', aspectRatio: 0.95, backgroundColor: '#F9FAFB' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  outOfStockImage: { opacity: 0.5 },
  productInfo: { padding: 10 },
  productName: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 3, 
    lineHeight: 15, 
    height: 30 
  },
  categoryText: { fontSize: 11, color: '#3B82F6', fontWeight: '500', marginBottom: 2 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  sellerText: { 
    fontSize: 10, 
    color: '#6B7280',
    flex: 1,
  },
  priceContainer: { 
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freePrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  price: { fontSize: 14, fontWeight: '700', color: '#111827' },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 48, 
    paddingHorizontal: 16 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginTop: 12, 
    textAlign: 'center', 
    fontWeight: '500' 
  },
  conditionText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  bottomPadding: { height: Platform.OS === 'ios' ? 74 : 64 },
});