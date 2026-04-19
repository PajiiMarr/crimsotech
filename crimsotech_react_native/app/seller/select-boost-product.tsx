// app/seller/select-boost-product.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type BoostPlan = {
  id: string;
  name: string;
  price: number;
  duration: number;
  time_unit: string;
  product_limit?: number;
  max_products?: number;
  description?: string;
  features?: any[];
};

type BoostCheckResult = {
  product_id: string;
  product_name: string;
  total_stock: number;
  has_stock: boolean;
  is_boosted: boolean;
  has_pending: boolean;
  boost_info: any;
  pending_info: any;
  eligibility: {
    is_eligible: boolean;
    issues: string[];
  };
  can_be_boosted: boolean;
  image: string | null;
};

type Variant = {
  id: string;
  title: string;
  price: string;
  quantity: number;
  image: string | null;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string;
  total_stock: number;
  starting_price: string;
  status: string;
  upload_status: string;
  variants: Variant[];
  is_boosted?: boolean;
  boost_info?: any;
  can_be_boosted?: boolean;
  eligibility?: {
    is_eligible: boolean;
    issues: string[];
  };
  image?: string;
};

export default function SelectBoostProduct() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { userId, shopId } = useAuth();

  const [plan, setPlan] = useState<BoostPlan | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planProductLimit, setPlanProductLimit] = useState<number>(1);
  const [activeBoostCount, setActiveBoostCount] = useState<number>(0);
  const [boostStatusChecked, setBoostStatusChecked] = useState(false);
  const [loadingBoostStatus, setLoadingBoostStatus] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (plan) {
      loadProducts();
    }
  }, [plan]);

  useEffect(() => {
    if (products.length > 0 && !boostStatusChecked) {
      checkBoostStatusForProducts();
    }
  }, [products]);

  const loadPlan = async () => {
    try {
      const response = await AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`, {
        headers: { 'X-User-Id': userId || '' },
      });
      const planData = response.data?.plan || response.data;
      setPlan(planData);
      setPlanProductLimit(planData?.product_limit || planData?.max_products || 1);
      
      if (userId && shopId) {
        const boostsResponse = await AxiosInstance.get('/seller-boosts/active/', {
          params: { customer_id: userId, shop_id: shopId },
          headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
        });
        if (boostsResponse.data.success) {
          const planActiveBoosts = boostsResponse.data.boosts?.filter(
            (boost: any) => boost.boost_plan_id === planId
          ) || [];
          setActiveBoostCount(planActiveBoosts.length);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load boost plan details');
      console.error(err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId, shop_id: shopId },
        headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
      });
      
      if (response.data?.success && response.data?.products) {
        const productsData = response.data.products;
        setProducts(Array.isArray(productsData) ? productsData : []);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkBoostStatusForProducts = async () => {
    if (!userId || products.length === 0) return;
    
    try {
      setLoadingBoostStatus(true);
      const productIds = products.map(p => p.id);
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        batches.push(productIds.slice(i, i + batchSize));
      }
      
      const allResults: BoostCheckResult[] = [];
      
      for (const batch of batches) {
        try {
          const response = await AxiosInstance.get('/seller-boosts/check_products/', {
            params: { customer_id: userId, product_ids: batch },
            paramsSerializer: { indexes: null },
            headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
          });
          
          if (response.data.success && response.data.results) {
            allResults.push(...response.data.results);
          }
        } catch (batchError) {
          console.error('Error checking boost status for batch:', batchError);
        }
      }
      
      if (allResults.length > 0) {
        setProducts(prevProducts =>
          prevProducts.map(product => {
            const boostResult = allResults.find((r: BoostCheckResult) => r.product_id === product.id);
            if (boostResult) {
              return {
                ...product,
                is_boosted: boostResult.is_boosted || false,
                has_pending: boostResult.has_pending || false,
                boost_info: boostResult.boost_info || null,
                can_be_boosted: boostResult.can_be_boosted || false,
                eligibility: boostResult.eligibility || { is_eligible: true, issues: [] },
                image: boostResult.image || product.image
              };
            }
            return product;
          })
        );
      }
      
      setBoostStatusChecked(true);
    } catch (error) {
      console.error('Error checking boost status:', error);
    } finally {
      setLoadingBoostStatus(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setBoostStatusChecked(false);
    Promise.all([loadPlan(), loadProducts()]);
  };

  const getProductPrice = (product: Product): number => {
    // Get the lowest active variant price
    if (product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter(v => v.is_active !== false);
      if (activeVariants.length > 0) {
        const prices = activeVariants.map(v => parseFloat(v.price));
        return Math.min(...prices);
      }
    }
    // Fallback to starting_price
    return parseFloat(product.starting_price) || 0;
  };

  const validateProductForBoost = (product: Product): string[] => {
    const errors: string[] = [];
    
    // Check if product can be boosted from backend result
    if (product.can_be_boosted === false) {
      if (product.eligibility?.issues && product.eligibility.issues.length > 0) {
        product.eligibility.issues.forEach(issue => {
          // Skip the "Product must be active" error if the product status is actually "Active"
          if (issue.includes('Product must be active') && 
              (product.status === 'Active' || product.status?.toLowerCase() === 'active')) {
            // This is a false positive, ignore this error
            return;
          }
          if (!errors.includes(issue)) {
            errors.push(issue);
          }
        });
      } else if (!errors.length) {
        errors.push("Product cannot be boosted");
      }
      return errors;
    }
    
    // Additional client-side validation
    if (product.is_boosted) {
      errors.push("Product already has an active boost");
    }
    
    if (product.total_stock <= 0) {
      errors.push("Product is out of stock");
    }
    
    if (product.upload_status !== 'published') {
      errors.push(`Product must be published (current: ${product.upload_status})`);
    }
    
    // Check if product status is active (case-insensitive)
    const normalizedStatus = product.status?.toLowerCase();
    if (normalizedStatus !== 'active') {
      errors.push(`Product must be active (current: ${product.status})`);
    }
    
    return errors;
  };

  const toggleProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const errors = validateProductForBoost(product);
    
    if (errors.length > 0) {
      setValidationErrors(prev => ({ ...prev, [productId]: errors }));
      Alert.alert('Cannot Select Product', errors[0]);
      return;
    }
    
    if (selectedIds.includes(productId)) {
      setSelectedIds(prev => prev.filter(p => p !== productId));
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[productId];
        return newErrors;
      });
    } else {
      const remainingSelectionLimit = Math.max(0, planProductLimit - activeBoostCount);
      if (selectedIds.length + 1 > remainingSelectionLimit) {
        Alert.alert(
          'Selection Limit Reached',
          `You can only select up to ${remainingSelectionLimit} product${remainingSelectionLimit !== 1 ? 's' : ''} for this boost plan.`
        );
        return;
      }
      setSelectedIds(prev => [...prev, productId]);
    }
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) {
      Alert.alert('Required', 'Please select at least one product to boost');
      return;
    }
    router.push(`/seller/pay-boosting?planId=${planId}&productIds=${selectedIds.join(',')}` as any);
  };

  const getProductImageUrl = (product: Product): string | null => {
    // Use image from boost check result first
    if (product.image && product.image.startsWith('http')) {
      return product.image;
    }
    // Check variants for image
    if (product.variants && product.variants.length > 0) {
      const variantWithImage = product.variants.find(v => v.image && v.image.startsWith('http'));
      if (variantWithImage?.image) return variantWithImage.image;
    }
    return null;
  };

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const formatPrice = (price: number | string) => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(priceNum)) return '₱0.00';
    return `₱${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const remainingSelectionLimit = Math.max(0, planProductLimit - activeBoostCount);
  const totalAmount = (plan?.price || 0) * selectedIds.length;

  if (loading || loadingBoostStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Products</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Products</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
          <Text style={styles.emptyText}>Boost plan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Products to Boost</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Plan Summary Banner */}
      <View style={styles.planBanner}>
        <View>
          <Text style={styles.planName}>{plan.name || 'Boost Plan'}</Text>
          <Text style={styles.planMeta}>
            ₱{Number(plan.price || 0).toFixed(2)} per product
            {planProductLimit > 0 && `  •  Max ${planProductLimit} product${planProductLimit !== 1 ? 's' : ''}`}
          </Text>
          {activeBoostCount > 0 && (
            <Text style={styles.activeBoostText}>
              {activeBoostCount} active boost{activeBoostCount !== 1 ? 's' : ''} already
            </Text>
          )}
        </View>
        <View style={styles.selectionBadge}>
          <Text style={styles.selectionBadgeText}>
            {selectedIds.length}{planProductLimit > 0 ? `/${remainingSelectionLimit}` : ''} selected
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EE4D2D" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {search ? 'Try adjusting your search' : 'Create a product to get started'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const productId = String(item.id);
          const isSelected = selectedIds.includes(productId);
          const isBoosted = item.is_boosted || false;
          // Check if product can be boosted - override if status is "Active" (capital A)
          let canBeBoosted = item.can_be_boosted !== false;
          const productStatus = item.status;
          
          // If the only eligibility issue is about status being "Active" but status is actually "Active", override
          if (item.eligibility?.issues && item.eligibility.issues.length > 0) {
            const hasOnlyStatusIssue = item.eligibility.issues.length === 1 && 
              item.eligibility.issues[0].includes('Product must be active') &&
              (productStatus === 'Active' || productStatus?.toLowerCase() === 'active');
            
            if (hasOnlyStatusIssue) {
              canBeBoosted = true;
            }
          }
          
          const errors = validationErrors[productId] || [];
          const hasError = errors.length > 0;
          const isDisabled = isBoosted || hasError || !canBeBoosted;
          const imageUrl = getProductImageUrl(item);
          const hasImageError = imageErrors[productId];
          const eligibilityIssues = item.eligibility?.issues || [];
          const productPrice = getProductPrice(item);
          
          return (
            <TouchableOpacity
              style={[
                styles.productCard,
                isSelected && styles.productCardSelected,
                isDisabled && styles.productCardDisabled,
              ]}
              onPress={() => toggleProduct(productId)}
              activeOpacity={0.7}
              disabled={isDisabled}
            >
              {/* Product Image */}
              <View style={styles.productImageContainer}>
                {imageUrl && !hasImageError ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.productImage}
                    onError={() => handleImageError(productId)}
                  />
                ) : (
                  <View style={[styles.productImage, styles.imagePlaceholder]}>
                    <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
                  </View>
                )}
                {isBoosted && (
                  <View style={styles.boostedBadge}>
                    <Ionicons name="rocket" size={12} color="#fff" />
                  </View>
                )}
              </View>
              
              {/* Product Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>{formatPrice(productPrice)}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productStock}>
                    Stock: {item.total_stock || 0}
                  </Text>
                  <Text style={[
                    styles.productStatus,
                    item.upload_status === 'published' ? styles.statusPublished : styles.statusDraft
                  ]}>
                    {item.upload_status === 'published' ? 'Published' : 'Draft'}
                  </Text>
                </View>
                {hasError && errors.length > 0 && (
                  <Text style={styles.errorText} numberOfLines={2}>
                    {errors[0]}
                  </Text>
                )}
                {!hasError && eligibilityIssues.length > 0 && !canBeBoosted && (
                  <Text style={styles.errorText} numberOfLines={2}>
                    {eligibilityIssues[0]}
                  </Text>
                )}
                {isBoosted && !hasError && (
                  <Text style={styles.boostedText}>
                    <Ionicons name="rocket" size={12} /> Already Boosted
                  </Text>
                )}
              </View>
              
              {/* Selection Checkbox */}
              {!isDisabled ? (
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isSelected ? '#EE4D2D' : '#9CA3AF'}
                />
              ) : (
                <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {selectedIds.length > 0 && (
          <View style={styles.footerTop}>
            <Text style={styles.selectedCount}>
              {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.totalAmount}>
              Total: ₱{totalAmount.toFixed(2)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.proceedBtn, selectedIds.length === 0 && styles.proceedBtnDisabled]}
          onPress={handleProceed}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.proceedText}>
            Proceed to Payment
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  planMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activeBoostText: {
    fontSize: 10,
    color: '#F59E0B',
    marginTop: 2,
  },
  selectionBadge: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  productCardSelected: {
    borderColor: '#EE4D2D',
    backgroundColor: '#FFF5F5',
  },
  productCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    padding: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EE4D2D',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productStock: {
    fontSize: 11,
    color: '#6B7280',
  },
  productStatus: {
    fontSize: 10,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPublished: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
  boostedText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EE4D2D',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EE4D2D',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});