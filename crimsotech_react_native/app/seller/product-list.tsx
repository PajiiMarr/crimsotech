import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  TextInput
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, Plus, Edit3, X, Eye, Package, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

const TECH_INVENTORY = [
  { id: '1', title: 'MacBook Air M2 (8GB/256GB)', price: 48500, stock: 1, status: 'ACTIVE', sales: 0, image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=400&q=80' },
  { id: '2', title: 'Keychron K2 Mechanical Keyboard', price: 3200, stock: 5, status: 'LOW STOCK', sales: 12, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=400&q=80' },
  { id: '3', title: 'Sony WH-1000XM4 (Used)', price: 12500, stock: 0, status: 'OUT OF STOCK', sales: 3, image: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=400&q=80' },
  { id: '4', title: '27" LG 4K Monitor', price: 15900, stock: 2, status: 'ACTIVE', sales: 1, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80' },
  { id: '5', title: 'Logitech MX Master 3S', price: 4200, stock: 8, status: 'ACTIVE', sales: 25, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80' },
  { id: '6', title: 'iPhone 13 Pro 128GB Gold', price: 31000, stock: 1, status: 'ACTIVE', sales: 0, image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=400&q=80' },
];

export default function PersonalListingPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = TECH_INVENTORY.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'LOW STOCK': return { bg: '#FEF3C7', text: '#D97706' };
      case 'OUT OF STOCK': return { bg: '#FEE2E2', text: '#EF4444' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const renderProduct = ({ item }: { item: typeof TECH_INVENTORY[0] }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9}>
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
            <AlertCircle size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

            {/* ADD THIS FAB BUTTON AT THE END, JUST BEFORE THE CLOSING SafeAreaView */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => router.push('./createproducts')}
        // OR if that doesn't work, try:
        // onPress={() => router.push('createproducts')}
        // OR if using file-based routing with Expo Router:
        // onPress={() => router.push('/(app)/createproducts')}
      >
        <Plus name="plus" color="#fff" size={28} />
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