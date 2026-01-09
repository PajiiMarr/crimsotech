import { getAllProducts } from '@/utils/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

type SortOption = 'relevant' | 'price_low' | 'price_high' | 'newest' | 'oldest';
type Product = any;

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevant');
  
  // Filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string[]>([]);

  const conditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Refurbished'];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await getAllProducts();
      
      if (response && Array.isArray(response)) {
        setAllProducts(response);
      } else if (response && response.results) {
        setAllProducts(response.results);
      } else if (response && response.products) {
        setAllProducts(response.products);
      } else {
        setAllProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCondition = (condition: string) => {
    if (selectedCondition.includes(condition)) {
      setSelectedCondition(selectedCondition.filter(c => c !== condition));
    } else {
      setSelectedCondition([...selectedCondition, condition]);
    }
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedCondition([]);
    setSortBy('relevant');
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  // Filter and sort products
  const filteredProducts = allProducts
    .filter((product) => {
      // Search filter
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        const name = (product.name || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        const condition = (product.condition || '').toLowerCase();
        
        if (!name.includes(searchLower) && 
            !description.includes(searchLower) && 
            !condition.includes(searchLower)) {
          return false;
        }
      }

      // Price filter
      const price = parseFloat(product.price) || 0;
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;

      // Condition filter
      if (selectedCondition.length > 0 && !selectedCondition.includes(product.condition)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price_high':
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        default:
          return 0;
      }
    });

  const renderProduct = ({ item }: { item: Product }) => {
    const location = item.shop
      ? `${item.shop.barangay}, ${item.shop.city}`
      : item.customer
      ? `by ${item.customer.username}`
      : 'Unknown seller';

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/pages/product-detail?productId=${item.id}`)}
      >
        <View style={styles.productImage}>
          <MaterialIcons name="devices" size={40} color="#666" />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₱{parseFloat(item.price || 0).toFixed(2)}</Text>
          <View style={styles.productMeta}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{item.condition}</Text>
            </View>
            <View style={styles.locationContainer}>
              <MaterialIcons name={item.shop ? "location-on" : "person"} size={12} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortOption = (label: string, value: SortOption) => (
    <TouchableOpacity
      style={[styles.sortOption, sortBy === value && styles.sortOptionActive]}
      onPress={() => setSortBy(value)}
    >
      <Text style={[styles.sortOptionText, sortBy === value && styles.sortOptionTextActive]}>
        {label}
      </Text>
      {sortBy === value && <Ionicons name="checkmark" size={20} color="#ff6d0b" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter and Sort Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={18} color="#333" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {(selectedCondition.length > 0 || minPrice || maxPrice) && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedCondition.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {renderSortOption('Relevant', 'relevant')}
          {renderSortOption('Price ↑', 'price_low')}
          {renderSortOption('Price ↓', 'price_high')}
          {renderSortOption('Newest', 'newest')}
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {loading ? 'Searching...' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'result' : 'results'} found`}
        </Text>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            {searchText ? `No results for "${searchText}"` : 'Try adjusting your filters'}
          </Text>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor="#999"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor="#999"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Condition */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Condition</Text>
              <View style={styles.conditionChips}>
                {conditions.map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionChip,
                      selectedCondition.includes(condition) && styles.conditionChipActive
                    ]}
                    onPress={() => toggleCondition(condition)}
                  >
                    <Text style={[
                      styles.conditionChipText,
                      selectedCondition.includes(condition) && styles.conditionChipTextActive
                    ]}>
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginRight: 12,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filterBadge: {
    marginLeft: 6,
    backgroundColor: '#ff6d0b',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 4,
  },
  sortOptionActive: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
  },
  sortOptionText: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
  sortOptionTextActive: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  resultsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ff6d0b',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  conditionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  conditionText: {
    fontSize: 11,
    color: '#388E3C',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  priceSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  conditionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  conditionChipActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#ff6d0b',
  },
  conditionChipText: {
    fontSize: 14,
    color: '#666',
  },
  conditionChipTextActive: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#ff6d0b',
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
