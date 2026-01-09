import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice: string;
  condition: string;
  rating: number;
  location: string;
}

// Mock products by category
const getProductsByCategory = (categoryId: string): Product[] => {
  const allProducts: { [key: string]: Product[] } = {
    '1': [ // Smartphones
      { id: '1', name: 'iPhone 13 Pro Max', price: '₱38,999', originalPrice: '₱59,999', condition: 'Excellent', rating: 4.7, location: 'Makati City' },
      { id: '3', name: 'Samsung Galaxy S22', price: '₱27,499', originalPrice: '₱44,999', condition: 'Like New', rating: 4.6, location: 'Quezon City' },
      { id: '11', name: 'iPhone 12 Pro', price: '₱32,999', originalPrice: '₱49,999', condition: 'Good', rating: 4.5, location: 'Pasig City' },
      { id: '12', name: 'OnePlus 10 Pro', price: '₱29,999', originalPrice: '₱42,999', condition: 'Excellent', rating: 4.8, location: 'BGC, Taguig' },
    ],
    '2': [ // Laptops
      { id: '2', name: 'MacBook Air M1', price: '₱41,999', originalPrice: '₱59,999', condition: 'Good', rating: 4.5, location: 'BGC, Taguig' },
      { id: '13', name: 'Dell XPS 13', price: '₱45,999', originalPrice: '₱65,999', condition: 'Excellent', rating: 4.6, location: 'Makati City' },
      { id: '14', name: 'HP Spectre x360', price: '₱39,999', originalPrice: '₱55,999', condition: 'Good', rating: 4.4, location: 'Mandaluyong' },
    ],
    '3': [ // Tablets
      { id: '15', name: 'iPad Pro 12.9"', price: '₱45,999', originalPrice: '₱69,999', condition: 'Excellent', rating: 4.9, location: 'Pasig City' },
      { id: '16', name: 'Samsung Galaxy Tab S8', price: '₱28,999', originalPrice: '₱42,999', condition: 'Like New', rating: 4.7, location: 'Quezon City' },
    ],
    '4': [ // Gaming
      { id: '17', name: 'PlayStation 5', price: '₱32,999', originalPrice: '₱39,999', condition: 'Excellent', rating: 4.9, location: 'Makati City' },
      { id: '18', name: 'Xbox Series X', price: '₱29,999', originalPrice: '₱36,999', condition: 'Good', rating: 4.8, location: 'BGC, Taguig' },
    ],
    '5': [ // Audio
      { id: '4', name: 'Sony WH-1000XM4', price: '₱10,999', originalPrice: '₱19,999', condition: 'Excellent', rating: 4.8, location: 'Mandaluyong' },
      { id: '19', name: 'AirPods Pro', price: '₱12,999', originalPrice: '₱18,999', condition: 'Like New', rating: 4.7, location: 'Pasig City' },
    ],
    '6': [ // Cameras
      { id: '20', name: 'Canon EOS R6', price: '₱89,999', originalPrice: '₱129,999', condition: 'Excellent', rating: 4.9, location: 'Makati City' },
      { id: '21', name: 'Sony A7 III', price: '₱95,999', originalPrice: '₱139,999', condition: 'Good', rating: 4.8, location: 'BGC, Taguig' },
    ],
    '7': [ // Smart Watches
      { id: '22', name: 'Apple Watch Series 8', price: '₱18,999', originalPrice: '₱28,999', condition: 'Excellent', rating: 4.7, location: 'Pasig City' },
      { id: '23', name: 'Samsung Galaxy Watch 5', price: '₱12,999', originalPrice: '₱19,999', condition: 'Like New', rating: 4.6, location: 'Quezon City' },
    ],
    '8': [ // Accessories
      { id: '24', name: 'MagSafe Charger', price: '₱2,999', originalPrice: '₱4,999', condition: 'Excellent', rating: 4.5, location: 'Makati City' },
      { id: '25', name: 'USB-C Hub', price: '₱1,999', originalPrice: '₱3,499', condition: 'Good', rating: 4.4, location: 'BGC, Taguig' },
    ],
  };
  return allProducts[categoryId] || [];
};

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [products] = useState<Product[]>(getProductsByCategory(id || '1'));

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/pages/product-detail?productId=${item.id}`)}
    >
      <View style={styles.itemImagePlaceholder}>
        <MaterialIcons name="devices" size={isSmallDevice ? 32 : 40} color="#666" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.itemPrice}>{item.price}</Text>
          <Text style={styles.originalPrice}>{item.originalPrice}</Text>
        </View>
        <View style={styles.itemMeta}>
          <View style={[
            styles.conditionBadge,
            item.condition === 'Excellent' ? styles.excellentBadge :
            item.condition === 'Like New' ? styles.likeNewBadge :
            styles.goodBadge
          ]}>
            <Text style={styles.conditionText}>{item.condition}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={12} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>{name || 'Category'}</Text>
        <View style={styles.spacer} />
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory-2" size={60} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            There are no products in this category yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  listContent: {
    padding: isSmallDevice ? 12 : 16,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 12 : 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemImagePlaceholder: {
    width: isSmallDevice ? 80 : 100,
    height: isSmallDevice ? 80 : 100,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 6,
    lineHeight: isSmallDevice ? 18 : 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#e28800ff',
    marginRight: 8,
    fontFamily: 'System',
  },
  originalPrice: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#ADB5BD',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionBadge: {
    paddingHorizontal: isSmallDevice ? 6 : 8,
    paddingVertical: isSmallDevice ? 3 : 4,
    borderRadius: 6,
    marginRight: 10,
  },
  excellentBadge: {
    backgroundColor: '#E8F5E9',
  },
  likeNewBadge: {
    backgroundColor: '#FFF3E0',
  },
  goodBadge: {
    backgroundColor: '#E3F2FD',
  },
  conditionText: {
    fontSize: isSmallDevice ? 10 : 11,
    color: '#495057',
    fontWeight: '600',
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginLeft: 4,
    fontFamily: 'System',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginLeft: 4,
    fontFamily: 'System',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isSmallDevice ? 32 : 48,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

