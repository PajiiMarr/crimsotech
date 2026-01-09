import { useAuth } from '@/contexts/AuthContext';
import { checkout as checkoutApi, getCartItems, removeCartItem } from '@/utils/cartApi';
import { API_CONFIG } from '@/utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import VoucherSelectionModal from './voucher-selection-modal';

type ShippingMethod = 'pickup' | 'standard';
type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'paypal';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  images?: string[];
  media_files?: Array<{ file_data: string; file_type: string }>;    
}

interface CartItem {
  id: string;
  product: any;
  quantity: number;
  item_name?: string;
  item_price?: string;
  available_stock?: number;
  product_details?: any;
}

export default function CheckoutScreen() {
  const { user } = useAuth();
  const { productId, qty, cartItemIds, shopName, shopId } = useLocalSearchParams<{ 
    productId?: string; 
    qty?: string;
    cartItemIds?: string;
    shopName?: string;
    shopId?: string;
  }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Voucher state
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [ewalletName, setEwalletName] = useState('');
  const [ewalletNumber, setEwalletNumber] = useState('');
  const [ewalletEmail, setEwalletEmail] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Cart-based checkout
        if (cartItemIds) {
          const itemIds = cartItemIds.split(',');
          const userId = (user as any)?.user_id || (user as any)?.id;
          
          if (!userId) {
            Alert.alert('Error', 'Please log in');
            setLoading(false);
            return;
          }
          
          const response = await getCartItems(userId);
          if (response.success && response.cart_items) {
            const filtered = response.cart_items.filter((item: CartItem) => 
              itemIds.includes(item.id)
            );
            
            const prods: Product[] = filtered.map((item: CartItem) => ({
              id: typeof item.product === 'string' ? item.product : item?.product?.id || item?.product_details?.id || '',
              name: item?.item_name || item?.product_details?.name || 'Product',
              price: parseFloat(String(item?.item_price || item?.product_details?.price || '0').replace(/[₱,]/g, '')) || 0,
              quantity: item.quantity || 1,
              // Carry through shop id for voucher validation
              shopId: item?.product_details?.shop?.id,
            }));
            
            setProducts(prods);
          } else {
            Alert.alert('Error', 'Failed to load cart items');
          }
        }
        // Single product checkout (Buy Now)
        else if (productId) {
          const url = `${API_CONFIG.BASE_URL}/api/public-products/${productId}/`;
          const resp = await fetch(url);
          if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${t}`);
          }
          const data = await resp.json();
          const images = (data.media_files || []).map((m: any) => {
            const path = m.file_data || m.url || '';
            if (path.startsWith('http')) return path;
            return `${API_CONFIG.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
          });
          const q = Number(qty || '1');
          const quantity = Number.isFinite(q) && q > 0 ? q : 1;
          setProducts([{ id: data.id, name: data.name, price: parseFloat(data.price) || 0, quantity, images }]);
        }
      } catch (e: any) {
        console.error('Checkout load error:', e);
        Alert.alert('Error', `Failed to load: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [productId, cartItemIds, qty, user]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0);
  }, [products]);
  const shippingCost = shippingMethod === 'pickup' ? 0 : 50;
  const tax = subtotal * 0.12;
  const totalBeforeDiscount = subtotal + shippingCost + tax;
  const total = Math.max(totalBeforeDiscount - voucherDiscount, 0);

  const requiresEwallet = paymentMethod !== 'cod';
  const ewalletValid = !requiresEwallet || (
    ewalletName.trim() !== '' &&
    (paymentMethod === 'paypal' ? ewalletEmail.trim() !== '' : ewalletNumber.trim() !== '')
  );
  const canPlaceOrder = Boolean(user?.user_id || user?.id) && products.length > 0 && agreeTerms && ewalletValid && !placing;

  const placeOrder = async () => {
    if (products.length === 0 || !user) return;
    try {
      setPlacing(true);
      const customer_id = (user as any).user_id || (user as any).id;
      
      // For now, checkout single product (backend needs multi-item support)
      if (products.length === 1) {
        const resp = await checkoutApi({ customer_id, product_id: products[0].id, quantity: products[0].quantity || 1 });
        if ((resp as any)?.success) {
          // If this checkout came from cart selection, remove purchased items from cart
          if (cartItemIds) {
            const userId = (user as any)?.user_id || (user as any)?.id;
            const ids = String(cartItemIds).split(',').filter(Boolean);
            for (const id of ids) {
              try { await removeCartItem(userId, id); } catch {}
            }
          }
          Alert.alert(
            'Order placed',
            `Order Ref: ${(resp as any).order_reference}\nTotal: ₱${Number((resp as any).total_amount || total).toFixed(2)}\nStatus: Pending seller approval`,
            [
              { text: 'OK', onPress: () => router.replace('/pages/purchases') },
            ]
          );
        } else {
          Alert.alert('Checkout failed', (resp as any)?.error || 'Please try again');
        }
      } else {
        // Multi-item: simulate success for now
        // Simulate removal from cart for multi-item checkout
        if (cartItemIds) {
          const userId = (user as any)?.user_id || (user as any)?.id;
          const ids = String(cartItemIds).split(',').filter(Boolean);
          for (const id of ids) {
            try { await removeCartItem(userId, id); } catch {}
          }
        }
        Alert.alert(
          'Order placed',
          `${products.length} items from ${shopName || 'shop'}\nTotal: ₱${total.toFixed(2)}\nStatus: Pending seller approval\n\n(Multi-item backend integration pending)`,
          [
            { text: 'OK', onPress: () => router.replace('/pages/cart') },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Checkout failed', e?.message || 'Please try again');
  } finally {
      setPlacing(false);
    }
  };

  // Local voucher validation helper (previously imported from utils/cartApi)
  async function validateVoucher(code: string, shopId: string, amount: number) {
    try {
      const url = `${API_CONFIG.BASE_URL}/api/vouchers/validate/`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, shop_id: shopId, amount }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${t}`);
      }
      const data = await resp.json();
      // Expected response shape: { success, valid, voucher, discount_amount, error }
      return data;
    } catch (e: any) {
      return { success: false, valid: false, error: e?.message || 'Network error' };
    }
  }

  const handleSelectVoucher = async (selectedVoucher: any) => {
    try {
      // Determine shopId: prefer route param, else first product's shop
      const currentShopId = (shopId as string) || (products[0] as any)?.shopId || (products[0] as any)?.shop?.id || '';
      
      const resp = await validateVoucher(selectedVoucher.code, currentShopId, totalBeforeDiscount);
      if (resp.success && resp.valid) {
        setAppliedVoucher(resp.voucher);
        setVoucherDiscount(resp.discount_amount || 0);
      } else {
        Alert.alert('Error', resp.error || 'Voucher not valid for this order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply voucher');
    }
  };

  const clearVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerWrap}>
          <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
          <Text style={styles.infoText}>No items to checkout</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/pages/cart')}>
            <Text style={styles.primaryBtnText}>Go to Cart</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Order Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary {shopName && `- ${shopName}`}</Text>
            {products.map((prod, idx) => (
              <View key={idx} style={[styles.summaryRow, idx > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEE' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>{prod.name}</Text>
                  <Text style={styles.muted}>Qty: {prod.quantity || 1}</Text>
                </View>
                <Text style={styles.amount}>₱{(prod.price * (prod.quantity || 1)).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <MaterialIcons name="location-on" size={20} color="#ff6d0b" />
            </View>
            <View style={styles.addressBox}>
              <View style={styles.addressRow}>
                <MaterialIcons name="person" size={16} color="#6C757D" />
                <Text style={styles.addressText}>Juan Dela Cruz</Text>
              </View>
              <View style={styles.addressRow}>
                <MaterialIcons name="phone" size={16} color="#6C757D" />
                <Text style={styles.addressText}>+63 912 345 6789</Text>
              </View>
              <View style={styles.addressRow}>
                <MaterialIcons name="home" size={16} color="#6C757D" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressText}>123 Main Street, Brgy. Tetuan</Text>
                  <Text style={styles.addressText}>Zamboanga City, Zamboanga del Sur 7000</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Shipping Method */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipping Method</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={[styles.radioItem, shippingMethod === 'pickup' && styles.radioActive]} onPress={() => setShippingMethod('pickup')}>
                <View style={[styles.radioDot, shippingMethod === 'pickup' && styles.radioDotActive]} />
                <Text style={styles.radioLabel}>Pickup from Store</Text>
                <Text style={styles.badgeFree}>FREE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.radioItem, shippingMethod === 'standard' && styles.radioActive]} onPress={() => setShippingMethod('standard')}>
                <View style={[styles.radioDot, shippingMethod === 'standard' && styles.radioDotActive]} />
                <Text style={styles.radioLabel}>Standard Delivery</Text>
                <Text style={styles.muted}>2-4 business days</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.radioGroup}>
              {(['cod','gcash','paymaya','paypal'] as PaymentMethod[]).map((pm) => (
                <TouchableOpacity key={pm} style={[styles.radioItem, paymentMethod === pm && styles.radioActive]} onPress={() => setPaymentMethod(pm)}>
                  <View style={[styles.radioDot, paymentMethod === pm && styles.radioDotActive]} />
                  <Text style={styles.radioLabel}>{pm === 'cod' ? 'Cash on Delivery' : pm.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {requiresEwallet && (
              <View style={styles.ewalletBox}>
                <Text style={styles.ewalletTitle}>Enter {paymentMethod.toUpperCase()} Details</Text>
                <TextInput
                  placeholder="Account Name"
                  value={ewalletName}
                  onChangeText={setEwalletName}
                  style={styles.input}
                />
                {paymentMethod !== 'paypal' ? (
                  <TextInput
                    placeholder="Mobile Number"
                    keyboardType="phone-pad"
                    value={ewalletNumber}
                    onChangeText={setEwalletNumber}
                    style={styles.input}
                  />
                ) : (
                  <TextInput
                    placeholder="Email"
                    keyboardType="email-address"
                    value={ewalletEmail}
                    onChangeText={setEwalletEmail}
                    style={styles.input}
                  />
                )}
                <Text style={styles.securityNote}>Your payment info is used for verification only.</Text>
              </View>
            )}
          </View>

          {/* Voucher Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Promo Code</Text>
            {appliedVoucher ? (
              <View>
                <View style={styles.appliedVoucherBox}>
                  <MaterialIcons name="check-circle" size={20} color="#1E88E5" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appliedVoucherTitle}>{appliedVoucher.code}</Text>
                    <Text style={styles.appliedVoucherDesc}>
                      {appliedVoucher.discount_type === 'percentage' 
                        ? `${appliedVoucher.value}% off`
                        : `₱${appliedVoucher.value} off`
                      }
                    </Text>
                    {appliedVoucher.is_admin_voucher && (
                      <Text style={styles.platformVoucherNote}>✓ Works on any shop</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={clearVoucher}>
                    <MaterialIcons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.selectVoucherButton}
                onPress={() => setShowVoucherModal(true)}
              >
                <MaterialIcons name="local-offer" size={20} color="#ff6d0b" />
                <Text style={styles.selectVoucherButtonText}>Select Voucher</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Totals */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.rowBetween}><Text style={styles.muted}>Subtotal</Text><Text style={styles.amount}>₱{subtotal.toFixed(2)}</Text></View>
            <View style={styles.rowBetween}><Text style={styles.muted}>Shipping</Text><Text style={styles.amount}>{shippingCost === 0 ? 'FREE' : `₱${shippingCost.toFixed(2)}`}</Text></View>
            <View style={styles.rowBetween}><Text style={styles.muted}>Tax (12%)</Text><Text style={styles.amount}>₱{tax.toFixed(2)}</Text></View>
            {voucherDiscount > 0 && (
              <View style={styles.rowBetween}><Text style={styles.discountText}>Discount</Text><Text style={styles.discountAmount}>-₱{voucherDiscount.toFixed(2)}</Text></View>
            )}
            <View style={styles.divider} />
            <View style={styles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text></View>
          </View>

          {/* Terms */}
          <View style={[styles.card, { paddingVertical: 12 }]}> 
            <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.muted}>I agree to the Terms of Service and Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {/* Place Order */}
          <TouchableOpacity disabled={!canPlaceOrder} onPress={placeOrder} style={[styles.placeBtn, !canPlaceOrder && { opacity: 0.6 }]}> 
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeBtnText}>{paymentMethod === 'cod' ? 'Place Order' : `Pay with ${paymentMethod.toUpperCase()}`} • ₱{total.toFixed(2)}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Voucher Selection Modal */}
      <VoucherSelectionModal 
        visible={showVoucherModal} 
        onClose={() => setShowVoucherModal(false)} 
        onSelectVoucher={handleSelectVoucher} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E9ECEF',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 }, android: { elevation: 2 } })
  },
  iconBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#212529' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  infoText: { marginTop: 12, color: '#666', fontSize: 16 },
  primaryBtn: { marginTop: 16, backgroundColor: '#ff6d0b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#FFF', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addressBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E9ECEF' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  addressText: { fontSize: 14, color: '#495057', lineHeight: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productName: { fontSize: 14, fontWeight: '600', color: '#212529', marginBottom: 4 },
  muted: { color: '#6C757D', fontSize: 13 },
  amount: { color: '#212529', fontSize: 14, fontWeight: '700' },
  radioGroup: { gap: 10 },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#EEE', borderRadius: 10, backgroundColor: '#FAFAFA' },
  radioActive: { borderColor: '#ff6d0b', backgroundColor: '#FFF7F0' },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#CCC', marginRight: 2, alignItems: 'center', justifyContent: 'center' },
  radioDotActive: { borderColor: '#ff6d0b', backgroundColor: '#ff6d0b' },
  radioLabel: { fontSize: 14, color: '#212529', flex: 1 },
  badgeFree: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  ewalletBox: { marginTop: 12, backgroundColor: '#F4F7FF', borderWidth: 1, borderColor: '#D6E4FF', padding: 12, borderRadius: 10 },
  ewalletTitle: { fontWeight: '600', color: '#1E3A8A', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  securityNote: { marginTop: 8, fontSize: 12, color: '#1E3A8A' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#212529' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#212529' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#ff6d0b', borderColor: '#ff6d0b' },
  placeBtn: { marginHorizontal: 16, marginTop: 4, backgroundColor: '#ff6d0b', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }, android: { elevation: 3 } }) },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  selectVoucherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7F0', borderWidth: 1.5, borderColor: '#ff6d0b', paddingVertical: 12, borderRadius: 8, gap: 8 },
  selectVoucherButtonText: { color: '#ff6d0b', fontWeight: '600', fontSize: 14 },
  appliedVoucherBox: { marginTop: 12, padding: 12, backgroundColor: '#F3F8FF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedVoucherTitle: { fontSize: 14, fontWeight: '700', color: '#1E88E5' },
  appliedVoucherDesc: { fontSize: 12, color: '#4A5568', marginTop: 4 },
  platformVoucherNote: { fontSize: 11, color: '#2E7D32', marginTop: 4, fontWeight: '500' },
  discountText: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  discountAmount: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
});
