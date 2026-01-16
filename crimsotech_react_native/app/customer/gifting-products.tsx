// gifting-product.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather, Entypo } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  category: {
    id: string;
    name: string;
  };
  condition: string;
  status: string;
  quantity: number;
  stock_status: string;
  shop: {
    id: string;
    name: string;
    city: string;
  };
  customer: {
    name: string;
  };
  primary_image: string;
}

export default function GiftingProductPage() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Normalize image URLs returned by the API to absolute URLs that React Native can load
  const normalizeImageUrl = (raw?: string) => {
    const placeholder = 'https://via.placeholder.com/300';
    if (!raw) return placeholder;
    const trimmed = String(raw).trim();
    if (!trimmed) return placeholder;

    // If already absolute
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    // Protocol-relative
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    // Leading slash -> prefix base URL
    if (trimmed.startsWith('/')) return `${AxiosInstance.defaults.baseURL}${trimmed}`;
    // Otherwise, try prefixing baseURL
    return `${AxiosInstance.defaults.baseURL}/${trimmed}`;
  };

  useEffect(() => {
    if (user?.id) {
      fetchGiftProducts();
    }
  }, [user?.id]);

  const fetchGiftProducts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get('/api/customer-product-list/products_list/', {
        headers: {
          'X-User-Id': user.id,
        },
      });
      
      if (response.data) {
        const productsData = response.data.products || response.data.results || [];

        // Log a sample product for debugging image fields
        if (productsData.length > 0) {
          console.log('Sample product from API:', {
            id: productsData[0].id,
            keys: Object.keys(productsData[0]),
            media_files_sample: productsData[0].media_files ? (productsData[0].media_files[0] || productsData[0].media_files) : undefined,
            primary_image: productsData[0].primary_image,
          });
        }

        // Helper: Try multiple likely fields for image URL and handle objects
        const extractImageFromProduct = (product: any) => {
          if (!product) return undefined;

          const rawCandidates = [
            product.primary_image,
            product.primary_image_url,
            product.image_url,
            product.image,
            product.file,
            product.file_url,
            product.thumbnail,
            product.media_files?.[0],
            product.media_files?.[0]?.file_url,
            product.media_files?.[0]?.file_data,
            product.media_files?.[0]?.file_data?.url,
            product.media_files?.[0]?.file,
          ];

          for (const c of rawCandidates) {
            if (!c) continue;

            // If it's already a string URL
            if (typeof c === 'string') {
              const t = c.trim();
              if (t) return t;
              continue;
            }

            // If it's an object, try common nested keys
            if (typeof c === 'object') {
              // Common shapes: { url }, { file_url }, { raw_url }, { file_data: { url } }
              const nested = c.url || c.file_url || c.raw_url || (c.file_data && (c.file_data.url || c.file_data.file)) || c.file || c.thumbnail;
              if (nested && typeof nested === 'string') return nested;

              // If nested itself is an object with url
              if (nested && typeof nested === 'object' && (nested.url || nested.file_url)) {
                return nested.url || nested.file_url;
              }

              // As a last resort, if object has a toString that returns a URL-like string, try that
              try {
                const s = String(c);
                if (s && !s.toLowerCase().includes('[object')) return s;
              } catch (e) {}
            }
          }

          return undefined;
        }; 

        // Filter for gift products (price = 0 or is_gift flag)
        const giftProducts = productsData.filter((product: any) => {
          const price = parseFloat(product.price || '0');
          const isGiftFlag = product.is_gift === true || product.is_gift === 'true';
          return isGiftFlag || price === 0;
        });

        // Transform data
        const transformedProducts = giftProducts.map((product: any) => {
          const rawImage = extractImageFromProduct(product);
          if (!rawImage) {
            console.warn('No image found in product payload', product.id, { primary_image: product.primary_image, media_files: product.media_files });
          } else {
            // Log the exact resolved candidate prior to normalization for diagnosability
            console.log('Resolved image candidate for product', product.id, rawImage);
          }

          return {
            id: String(product.id),
            name: product.name,
            description: product.description || '',
            price: product.price || '0',
            category: {
              id: product.category?.id || '',
              name: product.category?.name || 'Uncategorized',
            },
            condition: product.condition || 'Good',
            status: product.status || 'active',
            quantity: product.quantity || 0,
            stock_status: product.stock_status || 'in_stock',
            shop: {
              id: product.shop?.id || '',
              name: product.shop?.name || 'Unknown Shop',
              city: product.shop?.city || '',
            },
            customer: {
              name: product.customer?.customer?.name || product.customer?.name || 'Seller',
            },
            primary_image: normalizeImageUrl(rawImage),
          };
        });

        setProducts(transformedProducts);
      }
    } catch (error: any) {
      console.error('Error fetching gift products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGiftProducts();
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.description.toLowerCase().includes(search.toLowerCase()) ||
    product.category.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockColor = (status: string, quantity: number) => {
    if (quantity === 0) return '#EF4444';
    if (status?.toLowerCase().includes('low')) return '#F59E0B';
    return '#10B981';
  };

  const getStockText = (quantity: number) => {
    return quantity === 0 ? 'Out of Stock' : `Stock: ${quantity}`;
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.7}>
      <View style={[styles.imageContainer, { backgroundColor: '#FFF5F5' }]}>
        <Image 
          source={{ uri: item.primary_image }} 
          style={styles.productImage} 
          resizeMode="contain"
          defaultSource={require('../../assets/images/icon.png')}
          onError={(e:any) => console.warn('Failed to load image for product', item.id, item.primary_image, e.nativeEvent?.error || e.nativeEvent)}
        />
      </View>
      
      <View style={styles.productInfo}>
        <View style={styles.textContainer}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.brandName}>
            {item.customer.name}
          </Text>
          
          {/* Stock Display */}
          <View style={styles.stockRow}>
            <Text style={[
              styles.stockLabel,
              { color: getStockColor(item.stock_status, item.quantity) }
            ]}>
              {getStockText(item.quantity)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.optionsBtn} 
          onPress={() => console.log('Options for:', item.id)}
        >
          <Entypo name="dots-three-vertical" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No gift products available</Text>
    </View>
  );

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.searchBar}>
            <Feather name="search" size={14} color="#9CA3AF" />
            <TextInput
              style={styles.searchField}
              placeholder="Search gifts..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={handleRefresh}
          >
            <Feather name="refresh-cw" size={18} color="#333" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listBody}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF4500']}
            tintColor="#FF4500"
          />
        }
      />

      {/* FAB Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/customer/create/add-gift')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#6B7280' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 } ,
  iconBtn: { 
    padding: 4 
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginHorizontal: 10,
    height: 32,
    paddingHorizontal: 10,
  },
  searchField: { 
    flex: 1, 
    marginLeft: 6, 
    fontSize: 13, 
    color: '#111827' 
  },

  listBody: { 
    padding: 12, 
    paddingBottom: 100 
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: { 
    width: 40, 
    height: 40 
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 12,
    alignItems: 'center',
  },
  textContainer: { 
    flex: 1 
  },
  productName: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#1F2937' 
  },
  brandName: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    marginTop: 1 
  },
  stockRow: { 
    marginTop: 4 
  },
  stockLabel: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  optionsBtn: { 
    padding: 8 
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#FF4500',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});