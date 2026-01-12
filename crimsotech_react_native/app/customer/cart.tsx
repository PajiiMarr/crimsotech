import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StyleSheet, 
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

// Types
interface ProductMedia {
  id: string;
  file_url: string;
  file_type: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  shop: string;
  shop_name?: string;
  productmedia_set: ProductMedia[];
}

interface CartItem {
  id: string;
  product: string;
  product_details: Product | null;
  item_name: string;
  item_price: string;
  quantity: number;
  added_at: string;
  subtotal: number;
  selected: boolean;
}

interface CartStore {
  shop_id: string;
  shop_name: string;
  items: CartItem[];
}

export default function CartPage() {
  const { loading: authLoading, userId } = useAuth();
  const [cartStores, setCartStores] = useState<CartStore[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  // Fetch cart data from API
  const fetchCartData = async () => {
    if (!userId) {
      Alert.alert('Login Required', 'Please login to view your cart');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get('/api/view-cart/', {
        params: { user_id: userId },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Cart API Response:', response.data);

      if (response.data.success && response.data.cart_items) {
        // Transform API data to match our structure
        const items: CartItem[] = response.data.cart_items.map((item: any) => ({
          ...item,
          selected: true, // Default to selected
          product_details: item.product_details || null
        }));

        // Group items by shop
        const groupedItems = items.reduce((acc: Record<string, CartStore>, item: CartItem) => {
          const shopId = item.product_details?.shop || 'unknown';
          const shopName = item.product_details?.shop_name || 'Unknown Store';
          
          if (!acc[shopId]) {
            acc[shopId] = {
              shop_id: shopId,
              shop_name: shopName,
              items: []
            };
          }
          
          acc[shopId].items.push(item);
          return acc;
        }, {} as Record<string, CartStore>);

        // Convert to array
        const storesArray: CartStore[] = Object.values(groupedItems);
        setCartStores(storesArray);
        
        // Select all items by default
        setSelectedItems(items.map((item: CartItem) => item.id));
      } else {
        setCartStores([]);
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Failed to load cart items';
      if (error.response?.status === 404) {
        errorMessage = 'Cart is empty';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please login to view your cart';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage);
      setCartStores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchCartData();
    }
  }, [authLoading, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCartData();
  };

  // Update quantity in API
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (!userId || newQuantity < 1) return;

    try {
      setUpdatingItem(itemId);
      
      const response = await AxiosInstance.put(`/api/view-cart/update/${itemId}/`, {
        user_id: userId,
        quantity: newQuantity
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Update quantity response:', response.data);

      if (response.data.success) {
        // Update local state
        setCartStores(prev => prev.map(store => ({
          ...store,
          items: store.items.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  quantity: newQuantity,
                  subtotal: parseFloat(item.item_price) * newQuantity 
                } 
              : item
          )
        })));
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update quantity');
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      
      let errorMessage = 'Failed to update quantity';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.available_quantity) {
          errorMessage += `. Only ${error.response.data.available_quantity} available.`;
        }
      }
      
      Alert.alert('Error', errorMessage);
      
      // Refresh cart to get correct quantities
      fetchCartData();
    } finally {
      setUpdatingItem(null);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: string) => {
    if (!userId) return;

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(`/api/view-cart/delete/${itemId}/`, {
                data: { user_id: userId },
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              console.log('Remove item response:', response.data);

              if (response.data.success) {
                // Remove from local state
                setCartStores(prev => 
                  prev.map(store => ({
                    ...store,
                    items: store.items.filter(item => item.id !== itemId)
                  })).filter(store => store.items.length > 0) // Remove empty stores
                );
                
                // Remove from selected items
                setSelectedItems(prev => prev.filter(id => id !== itemId));
                
                Alert.alert('Success', 'Item removed from cart');
              } else {
                Alert.alert('Error', response.data.error || 'Failed to remove item');
              }
            } catch (error: any) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item. Please try again.');
            }
          }
        }
      ]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectStore = (storeItems: CartItem[]) => {
    const ids = storeItems.map(i => i.id);
    const allSelected = ids.every(id => selectedItems.includes(id));
    setSelectedItems(prev => 
      allSelected 
        ? prev.filter(id => !ids.includes(id)) 
        : [...new Set([...prev, ...ids])]
    );
  };

  const toggleSelectAll = () => {
    const allItems = cartStores.flatMap(store => store.items);
    setSelectedItems(
      selectedItems.length === allItems.length 
        ? [] 
        : allItems.map(i => i.id)
    );
  };

  // Get product image URL
  const getProductImage = (item: CartItem): string => {
    const baseURL = (AxiosInstance.defaults && AxiosInstance.defaults.baseURL) ? AxiosInstance.defaults.baseURL.replace(/\/$/, '') : 'http://localhost:8000';

    // 1) New serializer shape: product_details.media_files -> [{ file_url }]
    const pd: any = item.product_details as any;
    if (pd?.media_files && Array.isArray(pd.media_files) && pd.media_files.length > 0) {
      const media = pd.media_files[0];
      const fileUrl = media.file_url || media.file || '';
      if (fileUrl) {
        if (fileUrl.startsWith('http')) return fileUrl;
        if (fileUrl.startsWith('/')) return `${baseURL}${fileUrl}`;
        return `${baseURL}/${fileUrl}`;
      }
    }

    // 2) Older/alternate shape: product_details.productmedia_set -> [{ file_url }]
    if (pd?.productmedia_set && Array.isArray(pd.productmedia_set) && pd.productmedia_set.length > 0) {
      const media = pd.productmedia_set[0];
      const fileUrl = media.file_url || media.file || (media.file_data && media.file_data.url) || '';
      if (fileUrl) {
        if (fileUrl.startsWith('http')) return fileUrl;
        if (fileUrl.startsWith('/')) return `${baseURL}${fileUrl}`;
        return `${baseURL}/${fileUrl}`;
      }
    }

    // 3) Serializer also exposes item_image sometimes
    // (CartItemSerializer.get_item_image returns absolute URL when request provided)
    const maybeItemImage = (item as any).item_image;
    if (maybeItemImage) {
      if (maybeItemImage.startsWith('http')) return maybeItemImage;
      if (maybeItemImage.startsWith('/')) return `${baseURL}${maybeItemImage}`;
      return `${baseURL}/${maybeItemImage}`;
    }

    // Fallback placeholders based on product name
    const productName = (item.item_name || '').toLowerCase();
    const placeholders: Record<string, string> = {
      phone: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&q=80',
      iphone: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&q=80',
      headphone: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
      mouse: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80',
      nintendo: 'https://images.unsplash.com/photo-1612444530582-fc66183b16f7?w=400&q=80',
      keyboard: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80',
      kindle: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
      default: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&q=80'
    };

    if (productName.includes('iphone') || productName.includes('phone')) return placeholders.phone;
    if (productName.includes('headphone') || productName.includes('earphone')) return placeholders.headphone;
    if (productName.includes('mouse')) return placeholders.mouse;
    if (productName.includes('nintendo')) return placeholders.nintendo;
    if (productName.includes('keyboard')) return placeholders.keyboard;
    if (productName.includes('kindle')) return placeholders.kindle;

    return placeholders.default;
  };

  // Calculate totals
  const allItems = cartStores.flatMap(store => store.items);
  const selectedCartItems = allItems.filter(item => selectedItems.includes(item.id));
  
  const totalPrice = selectedCartItems.reduce((sum, item) => {
    const price = parseFloat(item.item_price) || 0;
    return sum + (price * item.quantity);
  }, 0);

  const itemCount = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Handle checkout
  // In cart.tsx, update the handleCheckout function:
const handleCheckout = () => {
  if (selectedCartItems.length === 0) {
    Alert.alert('No Items Selected', 'Please select items to checkout');
    return;
  }

  // Prepare checkout data
  const checkoutData = {
    items: selectedCartItems.map(item => ({
      id: item.id,
      product_id: item.product,
      name: item.item_name,
      price: parseFloat(item.item_price),
      quantity: item.quantity,
      shop_id: item.product_details?.shop,
      shop_name: item.product_details?.shop_name || 'Unknown Store'
    })),
    total: totalPrice,
    itemCount: selectedCartItems.length,
    shopCount: new Set(selectedCartItems.map(item => item.product_details?.shop)).size
  };

  // Navigate to checkout page
  Alert.alert(
    'Proceed to Checkout',
    `Total: ₱${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}\nItems: ${itemCount}\n\nProceed to checkout?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Checkout', 
        onPress: () => {
          console.log('Checkout data:', checkoutData);
          // Use simpler navigation
          router.push(`/customer/checkout?selected=${selectedItems.join(',')}`);
        }
      }
    ]
  );
};

  // Loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading cart...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Empty cart state
  if (cartStores.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#E5E5E5" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add items from your favorite shops</Text>
            <TouchableOpacity style={styles.shopButton}>
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.shopName}>Shopping Cart</Text>
            <Text style={styles.pageTitle}>My Items ({allItems.length})</Text>
          </View>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.headerAction}>
              {selectedItems.length === allItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#000']}
              tintColor="#000"
            />
          }
        >
          {cartStores.map((store) => {
            const isStoreSelected = store.items.every(item => selectedItems.includes(item.id));

            return (
              <View key={store.shop_id} style={styles.storeSection}>
                <TouchableOpacity 
                  style={styles.storeHeader} 
                  onPress={() => toggleSelectStore(store.items)}
                >
                  <Ionicons 
                    name={isStoreSelected ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={isStoreSelected ? "#111" : "#C4C4C4"} 
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.storeName}>{store.shop_name}</Text>
                  <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
                </TouchableOpacity>

                {store.items.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const price = parseFloat(item.item_price) || 0;
                  const subtotal = price * item.quantity;

                  return (
                    <View key={item.id} style={styles.cartItem}>
                      <TouchableOpacity 
                        onPress={() => toggleSelect(item.id)} 
                        style={styles.checkbox}
                        disabled={updatingItem === item.id}
                      >
                        <Ionicons 
                          name={isSelected ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={isSelected ? "#111" : "#E5E5E5"} 
                        />
                      </TouchableOpacity>

                      <Image 
                        source={{ uri: getProductImage(item) }} 
                        style={styles.itemImage} 
                      />

                      <View style={styles.itemContent}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.item_name}
                        </Text>
                        
                        <View style={styles.bottomRow}>
                          <View>
                            <Text style={styles.itemPrice}>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            <Text style={styles.itemPriceEach}>₱{price.toLocaleString()} each</Text>
                          </View>
                          
                          <View style={styles.qtyControl}>
                            <TouchableOpacity 
                              onPress={() => updateQuantity(item.id, item.quantity - 1)}
                              style={styles.qtyBtn}
                              disabled={updatingItem === item.id || item.quantity <= 1}
                            >
                              <Ionicons name="remove" size={14} color="#333" />
                            </TouchableOpacity>
                            
                            {updatingItem === item.id ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <Text style={styles.qtyValue}>{item.quantity}</Text>
                            )}
                            
                            <TouchableOpacity 
                              onPress={() => updateQuantity(item.id, item.quantity + 1)}
                              style={styles.qtyBtn}
                              disabled={updatingItem === item.id}
                            >
                              <Ionicons name="add" size={14} color="#333" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeItem(item.id)}
                          disabled={updatingItem === item.id}
                        >
                          <Ionicons name="trash-outline" size={14} color="#666" />
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>
              ₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.itemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'} selected</Text>
          </View>
          <TouchableOpacity 
            style={[styles.checkoutBtn, { opacity: selectedCartItems.length > 0 ? 1 : 0.5 }]}
            disabled={selectedCartItems.length === 0}
            onPress={handleCheckout}
          >
            <Text style={styles.checkoutText}>
              Checkout ({selectedCartItems.length})
            </Text>
          </TouchableOpacity>
        </View>

      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    minHeight: 400
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
    minHeight: 400,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    paddingHorizontal: 20, 
    paddingVertical: 20, 
    backgroundColor: '#FFF' 
  },
  shopName: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#999', 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  pageTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#000', 
    marginTop: 2 
  },
  headerAction: { 
    fontSize: 13, 
    color: '#666', 
    fontWeight: '600' 
  },
  scrollContent: { 
    paddingBottom: 120 
  },
  storeSection: { 
    marginTop: 12, 
    backgroundColor: '#FFF', 
    marginHorizontal: 16, 
    borderRadius: 16, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#F0F0F0' 
  },
  storeHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8F8F8', 
    backgroundColor: '#FAFAFA' 
  },
  storeName: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#333', 
    marginRight: 4,
    flex: 1 
  },
  cartItem: { 
    flexDirection: 'row', 
    padding: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8F8F8' 
  },
  checkbox: { 
    justifyContent: 'center', 
    paddingRight: 10 
  },
  itemImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 10, 
    backgroundColor: '#F3F3F3' 
  },
  itemContent: { 
    flex: 1, 
    marginLeft: 12, 
    justifyContent: 'space-between' 
  },
  itemName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#111',
    marginBottom: 8 
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemPrice: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#000' 
  },
  itemPriceEach: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  qtyControl: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#EEE' 
  },
  qtyBtn: { 
    padding: 6, 
    paddingHorizontal: 10 
  },
  qtyValue: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#333', 
    minWidth: 20, 
    textAlign: 'center' 
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#F5F5F5'
  },
  removeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#FFF', 
    padding: 20, 
    paddingBottom: 35, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  totalLabel: { 
    fontSize: 11, 
    color: '#999', 
    fontWeight: '600' 
  },
  totalPrice: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#000' 
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  checkoutBtn: { 
    backgroundColor: '#000', 
    paddingVertical: 14, 
    paddingHorizontal: 30, 
    borderRadius: 12 
  },
  checkoutText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 15 
  },
});