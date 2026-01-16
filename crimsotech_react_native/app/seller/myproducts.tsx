import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router'; // Import Stack to control the header

export default function MyProducts() {
  const [activeTab, setActiveTab] = useState('Live');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Data
  const products = [
    {
      id: '2',
      name: 'Mechanical Keyboard - RGB Backlit',
      price: '₱2,499',
      stock: 0,
      sales: 12,
      image: 'https://via.placeholder.com/100',
      status: 'Sold Out'
    }
  ];

  const renderProductItem = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.details}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price}</Text>
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
        data={products.filter(p => activeTab === 'All' || p.status === activeTab)}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No products found</Text>
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