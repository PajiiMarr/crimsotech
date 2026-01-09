// app/pages/cart.tsx
import { useAuth } from '@/contexts/AuthContext';
import { removeCartItem, updateCartItem } from '@/utils/cartApi';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

interface CartItem {
  id: string;
  // Backend may return product as an ID (string) or object; make it flexible
  product: any;
  user: string;
  quantity: number;
  added_at: string;
  // Additional fields present in API response
  item_price?: string;
  item_name?: string;
  item_image?: string | null;
  available_stock?: number;
  product_details?: { 
    id?: string; 
    name?: string; 
    price?: string; 
    condition?: string; 
    quantity?: number;
    shop?: { id?: string; name?: string };
  } | null;
}

interface ShopGroup {
  shop_id: string;
  shop_name: string;
  items: CartItem[];
}

export default function CartScreen() {
  const { cartItems, getCartItems, addToCart, user, cartCount } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCartData();
  }, []);

  const loadCartData = async () => {
    if (user) {
      await getCartItems();
    }
    setIsLoading(false);
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (!user) return;
    try {
      const userId = (user as any).user_id || (user as any).id;
      const result = await removeCartItem(userId, cartItemId);
      if (result.success) {
        await loadCartData();
      } else {
        Alert.alert('Error', result.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Remove item error:', error);
      Alert.alert('Error', 'Failed to remove item. Please try again.');
    }
  };

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number, availableStock: number) => {
    if (newQuantity < 1) {
      // If quantity would be 0, remove the item instead
      await handleRemoveItem(cartItemId);
      return;
    }
    
    if (newQuantity > availableStock) {
      Alert.alert('Stock Limit', `Only ${availableStock} items available in stock`);
      return;
    }
    
    if (!user) return;
    
    try {
      const userId = (user as any).user_id || (user as any).id;
      const result = await updateCartItem(userId, cartItemId, newQuantity);
      if (result.success) {
        await loadCartData();
      } else {
        Alert.alert('Error', result.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const groupItemsByShop = (): ShopGroup[] => {
    const grouped: { [key: string]: ShopGroup } = {};
    
    cartItems.forEach(item => {
      const shopId = (item as any)?.product_details?.shop?.id || 'individual';
      const shopName = (item as any)?.product_details?.shop?.name || 'Individual Seller';
      
      if (!grouped[shopId]) {
        grouped[shopId] = {
          shop_id: shopId,
          shop_name: shopName,
          items: []
        };
      }
      grouped[shopId].items.push(item);
    });
    
    return Object.values(grouped);
  };

  const handleShopCheckout = (shopGroup: ShopGroup) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to proceed with checkout');
      return;
    }
    
    // Navigate to checkout with shop items
    const cartItemIds = shopGroup.items.map(item => item.id).join(',');
    router.push({
      pathname: '/pages/checkout',
      params: {
        cartItemIds,
        shopId: shopGroup.shop_id,
        shopName: shopGroup.shop_name
      }
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to proceed with checkout');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    // Navigate to checkout screen (cart-based checkout to be implemented)
    router.push('/pages/checkout');
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const raw = (item?.product?.price ?? (item as any)?.item_price ?? (item as any)?.product_details?.price ?? '0') as string | number;
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₱,]/g, '')) || 0;
      return total + (num * (item.quantity || 0));
    }, 0);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImageContainer}>
        <View style={styles.itemImagePlaceholder}>
          <MaterialIcons name="devices" size={isSmallDevice ? 36 : 40} color="#666" />
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{(item?.product?.name ?? item?.item_name ?? (item as any)?.product_details?.name ?? 'Product')}</Text>
        { (item?.product?.condition || (item as any)?.product_details?.condition) && (
          <Text style={styles.itemCondition}>{item?.product?.condition ?? (item as any)?.product_details?.condition}</Text>
        )}
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => {
              const stock = item?.available_stock ?? (item as any)?.product_details?.quantity ?? 999;
              handleUpdateQuantity(item.id, item.quantity - 1, stock);
            }}
          >
            <MaterialIcons name="remove" size={isSmallDevice ? 16 : 18} color="#666" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => {
              const stock = item?.available_stock ?? (item as any)?.product_details?.quantity ?? 999;
              handleUpdateQuantity(item.id, item.quantity + 1, stock);
            }}
          >
            <MaterialIcons name="add" size={isSmallDevice ? 16 : 18} color="#666" />
          </TouchableOpacity>
        </View>
        {item.available_stock && (
          <Text style={styles.stockText}>{item.available_stock} available</Text>
        )}
      </View>
      
      <View style={styles.itemPriceContainer}>
        <Text style={styles.itemPrice}>
          {(() => {
            const raw = (item?.product?.price ?? (item as any)?.item_price ?? (item as any)?.product_details?.price ?? '0') as string | number;
            const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₱,]/g, '')) || 0;
            return `₱${(num * (item.quantity || 0)).toFixed(2)}`;
          })()}
        </Text>
        <TouchableOpacity 
          style={styles.removeItemButton}
          onPress={() => handleRemoveItem(item.id)}
        >
          <MaterialIcons name="delete" size={isSmallDevice ? 20 : 22} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <Text style={styles.title}>Cart</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading cart items...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Cart ({cartCount})</Text>
        <View style={styles.spacer} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartIcon}>
            <Ionicons name="cart-outline" size={isLargeDevice ? 80 : 70} color="#DDD" />
          </View>
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartSubtitle}>Add some items to get started</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.push('/main/home')}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {groupItemsByShop().map((shopGroup) => {
              const shopTotal = shopGroup.items.reduce((sum, item) => {
                const raw = (item?.product?.price ?? (item as any)?.item_price ?? (item as any)?.product_details?.price ?? '0') as string | number;
                const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[₱,]/g, '')) || 0;
                return sum + (num * (item.quantity || 0));
              }, 0);
              
              return (
                <View key={shopGroup.shop_id} style={styles.shopSection}>
                  <View style={styles.shopHeader}>
                    <View style={styles.shopInfo}>
                      <MaterialIcons name="store" size={20} color="#ff6d0b" />
                      <View style={styles.shopTextContainer}>
                        <Text style={styles.shopName}>{shopGroup.shop_name}</Text>
                        <Text style={styles.shopItemCount}>{shopGroup.items.length} item{shopGroup.items.length > 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.shopBuyButton}
                      onPress={() => handleShopCheckout(shopGroup)}
                    >
                      <Text style={styles.shopBuyButtonText}>Buy Now</Text>
                      <MaterialIcons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.shopItems}>
                    {shopGroup.items.map((item) => (
                      <View key={item.id}>
                        {renderCartItem({ item })}
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.shopFooter}>
                    <Text style={styles.shopTotalLabel}>Shop Subtotal:</Text>
                    <Text style={styles.shopTotalAmount}>₱{shopTotal.toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
            
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₱{calculateTotal().toFixed(2)}</Text>
            </View>
            <Text style={styles.footerNote}>Grouped by shop for separate deliveries</Text>
            <Text style={styles.footerSubNote}>After checkout, your order will be sent to the seller/shop owner for approval. You will see the status as Pending until it is accepted.</Text>
          </View>
        </>
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
    paddingVertical: isSmallDevice ? 12 : 16,
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
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: 16,
  },
  shopSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFF7F0',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5D0',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  shopTextContainer: {
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  shopItemCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'System',
  },
  shopBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  shopBuyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  shopItems: {
    backgroundColor: '#FFFFFF',
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  shopTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'System',
  },
  shopTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6d0b',
    fontFamily: 'System',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
        elevation: 1,
      },
    }),
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: isSmallDevice ? 70 : 80,
    height: isSmallDevice ? 70 : 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 4,
  },
  itemCondition: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6C757D',
    marginBottom: 8,
    fontFamily: 'System',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 100,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#212529',
    marginHorizontal: 8,
    fontFamily: 'System',
  },
  stockText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: isSmallDevice ? 15 : 17,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  removeItemButton: {
    padding: 8,
    marginTop: 8,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'System',
  },
  footerSubNote: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
    fontFamily: 'System',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
  },
  totalAmount: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#2196F3',
    fontFamily: 'System',
  },
  checkoutButton: {
    backgroundColor: '#ff6d0bff',
    padding: isSmallDevice ? 14 : 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyCartIcon: {
    marginBottom: 24,
  },
  emptyCartTitle: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptyCartSubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'System',
  },
  browseButton: {
    backgroundColor: '#ff6d0bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});