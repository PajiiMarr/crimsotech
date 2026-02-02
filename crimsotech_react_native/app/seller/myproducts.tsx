import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router'; // Import Stack to control the header
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_IMAGE = 'https://via.placeholder.com/100?text=No+Image';

type ProductItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  image: string;
  status: 'Live' | 'Sold Out' | 'Violation';
};

export default function MyProducts() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState('Live');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!userId) {
      setError('User not found. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId },
        headers: { 'X-User-Id': userId || '' }
      });

      const apiProducts = response.data?.products || [];
      const mapped: ProductItem[] = apiProducts.map((product: any) => {
        const stock = Number(product.quantity || 0);
        const status: ProductItem['status'] = stock <= 0 ? 'Sold Out' : 'Live';
        return {
          id: String(product.id),
          name: product.name || 'Unnamed Product',
          price: Number(product.price || 0),
          stock,
          sales: Number(product.sales || 0),
          image: product.image || product.thumbnail || FALLBACK_IMAGE,
          status
        };
      });

      setProducts(mapped);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err?.response?.data?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesTab = activeTab === 'All' || p.status === activeTab;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [products, activeTab, searchQuery]);

  const renderProductItem = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.details}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₱{item.price.toLocaleString()}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>Stock: {item.stock}</Text>
            <View style={styles.statDivider} />
            <Text style={styles.statsText}>Sales: {item.sales}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>More</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Feather name="share-2" size={16} color="#EE4D2D" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* This block forces the header to be centered and capitalized */}
      <Stack.Screen 
        options={{ 
          title: "My Products", 
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          headerShadowVisible: false, // Cleaner look
        }} 
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput 
            placeholder="Search for products" 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['All', 'Live', 'Sold Out', 'Violation'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#EE4D2D" />
            ) : (
              <MaterialCommunityIcons name="package-variant" size={60} color="#DDD" />
            )}
            <Text style={styles.emptyText}>{loading ? 'Loading products...' : (error || 'No products found')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F6' },
  searchContainer: { padding: 12, backgroundColor: '#FFF' },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    height: 40 
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1F2937' },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#EE4D2D' },
  tabText: { fontSize: 13, color: '#6B7280' },
  activeTabText: { color: '#EE4D2D', fontWeight: '700' },
  listContent: { padding: 12 },
  productCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  productInfo: { flexDirection: 'row' },
  productImage: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#F9FAFB' },
  details: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, color: '#1F2937', fontWeight: '500', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#EE4D2D', marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsText: { fontSize: 12, color: '#9CA3AF' },
  statDivider: { width: 1, height: 10, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  actionRow: { 
    flexDirection: 'row', 
    marginTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6', 
    paddingTop: 10,
    justifyContent: 'flex-end',
    gap: 8
  },
  secondaryBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 4, 
    borderWidth: 1, 
    borderColor: '#D1D5DB' 
  },
  secondaryBtnText: { fontSize: 13, color: '#4B5563' },
  shareBtn: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 4, 
    borderWidth: 1, 
    borderColor: '#EE4D2D' 
  },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9CA3AF', marginTop: 10 }
});