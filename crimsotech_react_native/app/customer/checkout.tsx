import React, { useState, useEffect, useCallback } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Platform
} from 'react-native';
import { router, useLocalSearchParams, Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';
import { 
  MaterialIcons,
  FontAwesome5,
  FontAwesome,
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  Entypo
} from '@expo/vector-icons';

// Types
interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  shop_name: string;
  shop_id: string;
  image?: string;
  is_ordered: boolean;
  subtotal: number;
}

interface Voucher {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  minimum_spend: number;
  shop_name: string;
  description: string;
  potential_savings: number;
  customer_tier?: string;
  is_recommended?: boolean;
  is_general?: boolean;
}

interface VoucherCategory {
  category: string;
  vouchers: Voucher[];
}

interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name?: string;
  floor_number?: string;
  unit_number?: string;
  landmark?: string;
  instructions?: string;
  address_type: string;
  is_default: boolean;
  full_address: string;
  created_at: string;
}

interface ShopAddress {
  shop_id: string;
  shop_name: string;
  shop_address: string;
  shop_street: string;
  shop_barangay: string;
  shop_city: string;
  shop_province: string;
  shop_contact_number?: string;
}

interface UserPurchaseStats {
  total_spent: number;
  recent_orders_count: number;
  average_order_value: number;
  customer_tier: string;
}

interface CheckoutSummary {
  subtotal: number;
  delivery: number;
  total: number;
  item_count: number;
  shop_count: number;
}

interface CheckoutData {
  success: boolean;
  checkout_items: CartItem[];
  summary: CheckoutSummary;
  available_vouchers: VoucherCategory[];
  user_purchase_stats: UserPurchaseStats;
  shipping_addresses: ShippingAddress[];
  default_shipping_address: ShippingAddress | null;
  shop_addresses: ShopAddress[];
}

// Payment methods
const paymentMethods = [
  {
    id: 'cod',
    name: (shippingMethod: string) => 
      shippingMethod === 'Pickup from Store' ? 'Cash on Pickup' : 'Cash on Delivery',
    description: (shippingMethod: string) => 
      shippingMethod === 'Pickup from Store' 
        ? 'Pay when you pick up your order' 
        : 'Pay when you receive your order',
    icon: 'wallet',
    iconSet: 'FontAwesome5' as const,
    iconColor: '#EA580C',
    requiresDetails: false,
    placeholder: {
      name: '',
      number: '',
      email: ''
    }
  },
  {
    id: 'gcash',
    name: 'GCash',
    description: 'Pay instantly via GCash',
    icon: 'mobile-alt',
    iconSet: 'FontAwesome5' as const,
    iconColor: '#EA580C',
    requiresDetails: true,
    placeholder: {
      name: 'GCash Account Name',
      number: 'GCash Mobile Number',
      email: 'GCash Registered Email'
    }
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    description: 'Pay using PayMaya wallet',
    icon: 'credit-card',
    iconSet: 'FontAwesome' as const,
    iconColor: '#EA580C',
    requiresDetails: true,
    placeholder: {
      name: 'PayMaya Account Name',
      number: 'PayMaya Mobile Number',
      email: 'PayMaya Registered Email'
    }
  }
];

// Shipping methods
const shippingMethods = [
  {
    id: 'pickup',
    name: 'Pickup from Store' as const,
    description: 'Collect your order directly from the seller\'s shop',
    icon: 'store',
    iconSet: 'MaterialIcons' as const,
    delivery: 'Ready in 1-2 hours',
    cost: 0,
  },
  {
    id: 'standard',
    name: 'Standard Delivery' as const,
    description: 'Door-to-door delivery service',
    icon: 'local-shipping',
    iconSet: 'MaterialIcons' as const,
    delivery: '2-4 business days',
    cost: 50.00,
  },
];

export default function CheckoutPage() {
  const { userId, userRole, loading: authLoading } = useAuth();
  const params = useLocalSearchParams();
  // Normalize selected ids from query params (supports string, array, or alternate keys)
  const getSelectedIds = () => {
    const raw = (params?.selected ?? params?.selectedIds ?? params?.items ?? params?.ids) as string | string[] | undefined;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) return raw.flatMap(r => String(r).split(',')).map(s => s.trim()).filter(Boolean);
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  };
  const selectedIds = getSelectedIds();
  console.log('Checkout params:', params, 'resolved selectedIds:', selectedIds);
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [showAvailableVouchers, setShowAvailableVouchers] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [activeVoucherCategory, setActiveVoucherCategory] = useState('all');
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    agreeTerms: false,
    shippingMethod: 'Pickup from Store' as 'Pickup from Store' | 'Standard Delivery',
    paymentMethod: 'Cash on Pickup',
    ewalletName: '',
    ewalletNumber: '',
    ewalletEmail: '',
    remarks: '',
    selectedAddressId: null as string | null,
  });
  
  const [processingOrder, setProcessingOrder] = useState(false);

  // Fetch checkout data
  const fetchCheckoutData = useCallback(async () => {
    if (!userId || selectedIds.length === 0) {
      setLoading(false);
      setError(userId ? 'No items selected for checkout' : 'Please login to checkout');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching checkout items...');
      console.log('User ID:', userId);
      console.log('Selected IDs:', selectedIds);

      const response = await AxiosInstance.get('/api/checkout-order/get_checkout_items/', {
        params: {
          selected: selectedIds.join(','),
          user_id: userId
        }
      });

      console.log('Checkout API Response:', response.data);

      if (response.data.success) {
        const hasOrderedItems = response.data.checkout_items?.some((item: any) => item.is_ordered === true);
        
        if (hasOrderedItems) {
          setError('Some items in your cart have already been ordered. Please refresh your cart.');
          setCheckoutData(null);
          return;
        }
        
        setCheckoutData(response.data);
        
        // Set default shipping address if available
        if (response.data.default_shipping_address) {
          setFormData(prev => ({
            ...prev,
            selectedAddressId: response.data.default_shipping_address.id
          }));
        } else if (response.data.shipping_addresses && response.data.shipping_addresses.length > 0) {
          setFormData(prev => ({
            ...prev,
            selectedAddressId: response.data.shipping_addresses[0].id
          }));
        }
      } else {
        setError(response.data.error || 'Failed to load checkout items');
      }
    } catch (error: any) {
      console.error('Error fetching checkout data:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMessage = 'Failed to load checkout items';
      if (error.response?.status === 404) {
        errorMessage = error.response.data?.error || 'Checkout items not found';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      setCheckoutData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedIds]);

  // Log render state to help diagnose stuck loading
  console.log('Checkout render state:', { authLoading, loading, userId, selectedIds, error, params });

  // Fix the useEffect in checkout.tsx
  useEffect(() => {
    console.log('Checkout useEffect triggered:', {
      authLoading,
      loading,
      userId,
      selectedIds,
      params
    });

    if (authLoading) {
      console.log('Waiting for auth to finish...');
      return;
    }

    if (!userId) {
      console.log('No userId, setting error');
      setLoading(false);
      setError('Please login to checkout');
      return;
    }

    if (selectedIds.length === 0) {
      console.log('No selected items, setting error');
      setLoading(false);
      setError('No items selected for checkout');
      return;
    }

    // Only fetch if we have everything we need
    console.log('Fetching checkout data...');
    fetchCheckoutData();
  }, [authLoading, userId, selectedIds.length]); // Only depend on these

  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckoutData();
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update payment method name when shipping method changes
    if (field === 'shippingMethod') {
      const codMethod = paymentMethods.find(m => m.id === 'cod');
      if (codMethod) {
        const methodName = typeof codMethod.name === 'function' 
          ? codMethod.name(value) 
          : codMethod.name;
        
        if (formData.paymentMethod === 'Cash on Pickup' || formData.paymentMethod === 'Cash on Delivery') {
          setFormData(prev => ({ ...prev, paymentMethod: methodName }));
        }
      }
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      const methodName = typeof method.name === 'function' 
        ? method.name(formData.shippingMethod) 
        : method.name;
      
      setFormData(prev => ({ 
        ...prev, 
        paymentMethod: methodName,
        ...(methodId === 'cod' && {
          ewalletName: '',
          ewalletNumber: '',
          ewalletEmail: ''
        })
      }));
    }
  };

  // Get current payment method
  const getCurrentPaymentMethod = () => {
    return paymentMethods.find(method => {
      const methodName = typeof method.name === 'function' 
        ? method.name(formData.shippingMethod) 
        : method.name;
      return methodName === formData.paymentMethod;
    });
  };

  // Validate e-wallet fields
  const isEwalletFieldsValid = () => {
    const currentMethod = getCurrentPaymentMethod();
    if (!currentMethod?.requiresDetails) return true;
    
    const isValid = formData.ewalletName.trim() !== '' && 
      (currentMethod.id === 'paypal' 
        ? formData.ewalletEmail.trim() !== '' 
        : formData.ewalletNumber.trim() !== '');
    
    return isValid;
  };

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Please enter a voucher code');
      return;
    }

    if (!checkoutData || !userId) {
      setVoucherError('Unable to apply voucher');
      return;
    }

    setVoucherLoading(true);
    setVoucherError(null);

    try {
      const response = await AxiosInstance.post('/api/checkout-order/validate_voucher/', {
        voucher_code: voucherCode.toUpperCase(),
        user_id: userId,
        subtotal: checkoutData.summary.subtotal,
      });

      if (response.data.valid) {
        setAppliedVoucher(response.data.voucher);
        setVoucherError(null);
        setVoucherCode('');
        setShowVoucherInput(false);
        setIsVoucherModalVisible(false);
      } else {
        setVoucherError(response.data.error || 'Invalid voucher code');
      }
    } catch (err: any) {
      setVoucherError(err.response?.data?.error || 'Failed to validate voucher');
      console.error('Voucher validation error:', err);
    } finally {
      setVoucherLoading(false);
    }
  };

  // Remove voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError(null);
  };

  // Fetch vouchers by amount
  const fetchVouchersByAmount = async (amount: number) => {
    if (!userId) return;

    setLoadingVouchers(true);
    try {
      const response = await AxiosInstance.get('/api/checkout-order/get_vouchers_by_amount/', {
        params: {
          user_id: userId,
          amount: amount
        }
      });

      if (response.data.success && checkoutData) {
        setCheckoutData(prev => ({
          ...prev!,
          available_vouchers: response.data.available_vouchers || []
        }));
      }
    } catch (err: any) {
      console.error('Error fetching vouchers by amount:', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!checkoutData) {
      return { subtotal: 0, delivery: 0, discount: 0, total: 0 };
    }

    const subtotal = checkoutData.summary.subtotal;
    const deliveryCost = formData.shippingMethod === 'Pickup from Store' ? 0 : 50.00;
    const discount = appliedVoucher?.potential_savings || 0;
    const total = subtotal + deliveryCost - discount;

    return { subtotal, delivery: deliveryCost, discount, total };
  };

  // Get selected address
  const getSelectedAddress = () => {
    if (!checkoutData?.shipping_addresses) return null;
    return checkoutData.shipping_addresses.find(addr => addr.id === formData.selectedAddressId);
  };

  // Get shop addresses for products
  const getShopAddressesForProducts = () => {
    if (!checkoutData || !checkoutData.shop_addresses || checkoutData.shop_addresses.length === 0) {
      return [];
    }
    
    const productShopIds = [...new Set(checkoutData.checkout_items.map(p => p.shop_id))];
    return checkoutData.shop_addresses.filter(shop => 
      shop.shop_id && productShopIds.includes(shop.shop_id)
    );
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (!userId || !checkoutData || !formData.selectedAddressId) {
      Alert.alert('Error', 'Please complete all required information');
      return;
    }

    if (!formData.agreeTerms) {
      Alert.alert('Required', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    const currentMethod = getCurrentPaymentMethod();
    if (currentMethod?.requiresDetails && !isEwalletFieldsValid()) {
      Alert.alert('Required', 'Please fill in all required payment details');
      return;
    }

    setProcessingOrder(true);
    setError(null);

    try {
      const requestBody = {
        user_id: userId,
        selected_ids: checkoutData.checkout_items.map(p => p.id),
        shipping_address_id: formData.selectedAddressId,
        payment_method: formData.paymentMethod,
        shipping_method: formData.shippingMethod,
        voucher_id: appliedVoucher?.id || null,
        remarks: formData.remarks.substring(0, 500) || null,
        ...(currentMethod?.requiresDetails && {
          ewallet_details: {
            name: formData.ewalletName,
            number: formData.ewalletNumber,
            email: formData.ewalletEmail,
          }
        })
      };

      console.log('Placing order with data:', requestBody);

      const response = await AxiosInstance.post('/api/checkout-order/create_order/', requestBody);

      if (response.data.success) {
        Alert.alert(
            'Success',
            'Order placed successfully!',
            [
              {
                text: 'View Order',
                onPress: () => router.push(`/customer/orders/${String(response.data.order_id)}` as any)
              },
              {
                text: 'Continue Shopping',
                onPress: () => router.push('/customer/home')
              }
            ]
          );
      } else {
        throw new Error(response.data.error || 'Failed to create order');
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'An error occurred while placing your order';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      console.error('Order placement error:', err.response?.data || err);
    } finally {
      setProcessingOrder(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loadingText}>Loading checkout...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Role guard
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="warning" size={64} color="#F59E0B" />
            <Text style={styles.message}>Not authorized to view this page</Text>
            <Text style={styles.subMessage}>This page is for customers only</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Error or no data state
  if (error || !checkoutData || checkoutData.checkout_items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll>
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={80} color="#E5E5E5" />
            <Text style={styles.emptyTitle}>
              {error || 'No items selected'}
            </Text>
            <Text style={styles.emptyText}>
              {error ? error : 'Please add items to your cart first'}
            </Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => router.push('/customer/cart')}
            >
              <Text style={styles.shopButtonText}>Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  const { subtotal, delivery, discount, total } = calculateTotals();
  const selectedAddress = getSelectedAddress();
  const shopAddresses = getShopAddressesForProducts();
  const currentPaymentMethod = getCurrentPaymentMethod();
  const currentPaymentMethodName = currentPaymentMethod
    ? (typeof currentPaymentMethod.name === 'function'
        ? currentPaymentMethod.name(formData.shippingMethod)
        : currentPaymentMethod.name)
    : '';
  const allVouchers = checkoutData.available_vouchers.flatMap(category => category.vouchers);
  const filteredVouchers = activeVoucherCategory === 'all' 
    ? allVouchers
    : (checkoutData.available_vouchers.find(cat => 
        cat.category.includes(activeVoucherCategory.replace('_', ' '))
      )?.vouchers || []);

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#EA580C']}
              tintColor="#EA580C"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Checkout</Text>
              <Text style={styles.headerSubtitle}>Complete your purchase</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {error && (
            <View style={styles.errorCard}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Order Summary */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="shopping-cart" size={24} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <Text style={styles.sectionSubtitle}>Review your items and shipping details</Text>
              </View>
            </View>

            <View style={styles.itemsList}>
              {checkoutData.checkout_items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <MaterialIcons name="image" size={24} color="#9CA3AF" />
                    </View>
                  )}
                  
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemShop}>{item.shop_name}</Text>
                    
                    <View style={styles.itemBottomRow}>
                      <View>
                        <Text style={styles.itemTotalPrice}>
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </Text>
                        <Text style={styles.itemEachPrice}>
                          ₱{item.price.toFixed(2)} each
                        </Text>
                      </View>
                      
                      <View style={styles.itemQuantity}>
                        <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Shipping Method */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="local-shipping" size={24} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Shipping Method</Text>
                <Text style={styles.sectionSubtitle}>Choose how you want to receive your order</Text>
              </View>
            </View>

            <View style={styles.shippingMethods}>
              {shippingMethods.map((method) => {
                const IconComponent = MaterialIcons; // All shipping icons are MaterialIcons
                const isSelected = formData.shippingMethod === method.name;
                
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.shippingMethodCard,
                      isSelected && styles.shippingMethodCardSelected
                    ]}
                    onPress={() => handleInputChange('shippingMethod', method.name)}
                  >
                    <View style={styles.shippingMethodContent}>
                      <View style={styles.shippingMethodLeft}>
                        <IconComponent 
                          name={method.icon as any} 
                          size={24} 
                          color={isSelected ? '#EA580C' : '#6B7280'} 
                        />
                        <View style={styles.shippingMethodInfo}>
                          <Text style={[
                            styles.shippingMethodName,
                            isSelected && styles.shippingMethodNameSelected
                          ]}>
                            {method.name}
                          </Text>
                          <Text style={styles.shippingMethodDescription}>
                            {method.description}
                          </Text>
                          <Text style={styles.shippingMethodDelivery}>
                            Estimated delivery: {method.delivery}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.shippingMethodRight}>
                        <Text style={styles.shippingMethodCost}>
                          {method.cost === 0 ? 'FREE' : `₱${method.cost.toFixed(2)}`}
                        </Text>
                        <View style={[
                          styles.radioButton,
                          isSelected && styles.radioButtonSelected
                        ]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Delivery Address (for Standard Delivery) */}
          {formData.shippingMethod === 'Standard Delivery' && (
            <View style={styles.sectionCard}>
              <View style={styles.addressHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <Text style={styles.sectionSubtitle}>Select where to deliver your order</Text>
                </View>
                <TouchableOpacity 
                  style={styles.manageButton}
                  onPress={() => setIsAddressModalVisible(true)}
                >
                  <MaterialIcons name="edit" size={16} color="#374151" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>

              {checkoutData.shipping_addresses && checkoutData.shipping_addresses.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.addressesScroll}
                >
                  {checkoutData.shipping_addresses.map((address) => {
                    const isSelected = formData.selectedAddressId === address.id;
                    return (
                      <TouchableOpacity
                        key={address.id}
                        style={[
                          styles.addressCard,
                          isSelected && styles.addressCardSelected
                        ]}
                        onPress={() => handleInputChange('selectedAddressId', address.id)}
                      >
                        <View style={styles.addressCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.addressNameRow}>
                              <Text style={styles.addressName}>{address.recipient_name}</Text>
                              {address.is_default && (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.addressPhone}>{address.recipient_phone}</Text>
                          </View>
                          <View style={[
                            styles.addressRadio,
                            isSelected && styles.addressRadioSelected
                          ]} />
                        </View>
                        
                        <Text style={styles.addressFull} numberOfLines={2}>
                          {address.full_address}
                        </Text>
                        
                        {address.instructions && (
                          <Text style={styles.addressInstructions} numberOfLines={1}>
                            📝 {address.instructions}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.noAddressContainer}>
                  <MaterialIcons name="location-off" size={48} color="#D1D5DB" />
                  <Text style={styles.noAddressTitle}>No Shipping Addresses</Text>
                  <Text style={styles.noAddressText}>
                    You need to add a shipping address for delivery orders.
                  </Text>
                  <TouchableOpacity 
                    style={styles.addAddressButton}
                    onPress={() => router.push('/customer/cart')}
                  >
                    <MaterialIcons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addAddressText}>Add Shipping Address</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Pickup Location (for Pickup from Store) */}
          {formData.shippingMethod === 'Pickup from Store' && shopAddresses.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="store" size={24} color="#EA580C" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Pickup Location</Text>
                  <Text style={styles.sectionSubtitle}>Where to pick up your order</Text>
                </View>
              </View>

              {shopAddresses.map((shop, index) => (
                <View key={index} style={styles.pickupLocationCard}>
                  <View style={styles.pickupShopHeader}>
                    <MaterialIcons name="storefront" size={20} color="#374151" />
                    <Text style={styles.pickupShopName}>{shop.shop_name}</Text>
                  </View>
                  <Text style={styles.pickupAddress}>{shop.shop_address}</Text>
                  {shop.shop_contact_number && (
                    <Text style={styles.pickupContact}>
                      Contact: {shop.shop_contact_number}
                    </Text>
                  )}
                </View>
              ))}
              
              <View style={styles.pickupInstructions}>
                <MaterialIcons name="info" size={16} color="#EA580C" />
                <Text style={styles.pickupInstructionsText}>
                  Orders are typically ready within 1-2 hours. Please bring your order confirmation when picking up.
                </Text>
              </View>
            </View>
          )}

          {/* Vouchers & Discounts */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="local-offer" size={24} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.voucherHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Voucher & Discounts</Text>
                    <Text style={styles.sectionSubtitle}>Apply a voucher code to save on your order</Text>
                  </View>
                  {allVouchers.length > 0 && (
                    <TouchableOpacity 
                      style={styles.viewAllButton}
                      onPress={() => setIsVoucherModalVisible(true)}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {appliedVoucher ? (
              <View style={styles.appliedVoucherCard}>
                <View style={styles.appliedVoucherHeader}>
                  <View style={styles.appliedVoucherIcon}>
                    <MaterialIcons name="check-circle" size={24} color="#059669" />
                  </View>
                  <View style={styles.appliedVoucherInfo}>
                    <View style={styles.voucherCodeRow}>
                      <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                      {appliedVoucher.customer_tier && appliedVoucher.customer_tier !== 'all' && (
                        <View style={styles.tierBadge}>
                          <Text style={styles.tierBadgeText}>{appliedVoucher.customer_tier}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.appliedVoucherName}>{appliedVoucher.name}</Text>
                    <Text style={styles.appliedVoucherDiscount}>
                      -₱{appliedVoucher.potential_savings.toFixed(2)} discount applied
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeVoucherButton}
                    onPress={handleRemoveVoucher}
                  >
                    <MaterialIcons name="close" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : !showVoucherInput ? (
              <TouchableOpacity 
                style={styles.enterVoucherButton}
                onPress={() => setShowVoucherInput(true)}
              >
                <MaterialIcons name="local-offer" size={20} color="#EA580C" />
                <Text style={styles.enterVoucherText}>Enter Voucher Code</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.voucherInputContainer}>
                <View style={styles.voucherInputRow}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Enter voucher code (e.g., SUMMER2024)"
                    placeholderTextColor="#9CA3AF"
                    value={voucherCode}
                    onChangeText={(text) => setVoucherCode(text.toUpperCase())}
                    editable={!voucherLoading}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity 
                    style={[
                      styles.applyVoucherButton,
                      (!voucherCode.trim() || voucherLoading) && styles.applyVoucherButtonDisabled
                    ]}
                    onPress={handleApplyVoucher}
                    disabled={!voucherCode.trim() || voucherLoading}
                  >
                    {voucherLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyVoucherText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                {voucherError && (
                  <View style={styles.voucherErrorCard}>
                    <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                    <Text style={styles.voucherErrorText}>{voucherError}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Show some available vouchers */}
            {allVouchers.length > 0 && !appliedVoucher && (
              <View style={styles.availableVouchersPreview}>
                <Text style={styles.availableVouchersTitle}>
                  Available Vouchers ({allVouchers.length})
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.vouchersPreviewScroll}
                >
                  {allVouchers.slice(0, 3).map((voucher, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.voucherPreviewCard}
                      onPress={() => {
                        setVoucherCode(voucher.code);
                        handleApplyVoucher();
                      }}
                    >
                      <View style={styles.voucherPreviewHeader}>
                        <MaterialIcons 
                          name={voucher.discount_type === 'percentage' ? 'percent' : 'attach-money'} 
                          size={20} 
                          color="#EA580C" 
                        />
                        <Text style={styles.voucherPreviewCode}>{voucher.code}</Text>
                      </View>
                      <Text style={styles.voucherPreviewDescription} numberOfLines={2}>
                        {voucher.description}
                      </Text>
                      <Text style={styles.voucherPreviewSavings}>
                        Save ₱{voucher.potential_savings.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Payment Method */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialIcons name="payment" size={24} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <Text style={styles.sectionSubtitle}>Choose your preferred payment option</Text>
              </View>
            </View>

            <View style={styles.paymentMethods}>
              {paymentMethods.map((method) => {
                const methodName = typeof method.name === 'function' 
                  ? method.name(formData.shippingMethod) 
                  : method.name;
                const isSelected = formData.paymentMethod === methodName;
                const IconComponent = method.iconSet === 'FontAwesome5' ? FontAwesome5 : 
                                   method.iconSet === 'FontAwesome' ? FontAwesome : MaterialIcons;
                
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      isSelected && styles.paymentMethodCardSelected
                    ]}
                    onPress={() => handlePaymentMethodChange(method.id)}
                  >
                    <View style={styles.paymentMethodIcon}>
                      <IconComponent 
                        name={method.icon as any} 
                        size={20} 
                        color={isSelected ? '#EA580C' : '#6B7280'} 
                      />
                    </View>
                    
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[
                        styles.paymentMethodName,
                        isSelected && styles.paymentMethodNameSelected
                      ]}>
                        {methodName}
                      </Text>
                      <Text style={styles.paymentMethodDescription}>
                        {typeof method.description === 'function' 
                          ? method.description(formData.shippingMethod) 
                          : method.description}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.paymentRadio,
                      isSelected && styles.paymentRadioSelected
                    ]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* E-wallet details */}
            {currentPaymentMethod?.requiresDetails && (
              <View style={styles.ewalletDetailsCard}>
                <View style={styles.ewalletHeader}>
                  <MaterialIcons name="smartphone" size={20} color="#EA580C" />
                  <Text style={styles.ewalletTitle}>
                    {currentPaymentMethodName} Details
                  </Text>
                </View>
                
                <Text style={styles.ewalletDescription}>
                  Please provide your {currentPaymentMethodName} account information for payment verification.
                </Text>

                <View style={styles.ewalletForm}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {currentPaymentMethod.placeholder.name}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={currentPaymentMethod.placeholder.name}
                      placeholderTextColor="#9CA3AF"
                      value={formData.ewalletName}
                      onChangeText={(text) => handleInputChange('ewalletName', text)}
                    />
                  </View>

                  {currentPaymentMethod.id !== 'paypal' && (
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {currentPaymentMethod.placeholder.number}
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder={currentPaymentMethod.placeholder.number}
                        placeholderTextColor="#9CA3AF"
                        value={formData.ewalletNumber}
                        onChangeText={(text) => handleInputChange('ewalletNumber', text)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {currentPaymentMethod.placeholder.email}
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder={currentPaymentMethod.placeholder.email}
                      placeholderTextColor="#9CA3AF"
                      value={formData.ewalletEmail}
                      onChangeText={(text) => handleInputChange('ewalletEmail', text)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.securityNote}>
                  <MaterialIcons name="security" size={16} color="#059669" />
                  <Text style={styles.securityText}>
                    Your payment information is secure and encrypted.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Order Remarks */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Remarks (Optional)</Text>
            <TextInput
              style={styles.remarksInput}
              placeholder="Any special instructions for this order? (Max 500 characters)"
              placeholderTextColor="#9CA3AF"
              value={formData.remarks}
              onChangeText={(text) => handleInputChange('remarks', text)}
              multiline
              maxLength={500}
            />
            <Text style={styles.remarksCounter}>
              {formData.remarks.length}/500 characters
            </Text>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.termsRow}
              onPress={() => handleInputChange('agreeTerms', !formData.agreeTerms)}
            >
              <View style={[
                styles.checkbox,
                formData.agreeTerms && styles.checkboxChecked
              ]}>
                {formData.agreeTerms && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer with Order Summary and Checkout Button */}
        <View style={styles.footer}>
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({checkoutData.summary.item_count} items)</Text>
              <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
            </View>
            
            {appliedVoucher && (
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>
                  Discount ({appliedVoucher.code})
                </Text>
                <Text style={styles.discountValue}>-₱{discount.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                {delivery === 0 ? 'FREE' : `₱${delivery.toFixed(2)}`}
              </Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={styles.totalRight}>
                <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
                <Text style={styles.totalVat}>Including VAT</Text>
              </View>
            </View>
            
            {appliedVoucher && (
              <Text style={styles.savingsText}>
                You saved ₱{discount.toFixed(2)} with {appliedVoucher.code}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={[
              styles.checkoutButton,
              (!formData.agreeTerms || !formData.selectedAddressId || !isEwalletFieldsValid() || processingOrder) && 
              styles.checkoutButtonDisabled
            ]}
            onPress={handlePlaceOrder}
            disabled={!formData.agreeTerms || !formData.selectedAddressId || !isEwalletFieldsValid() || processingOrder}
          >
            {processingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutButtonText}>
                  {['Cash on Pickup', 'Cash on Delivery'].includes(formData.paymentMethod)
                    ? `Place Order • ₱${total.toFixed(2)}`
                    : `Pay with ${formData.paymentMethod} • ₱${total.toFixed(2)}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerNotes}>
            <MaterialIcons name="verified" size={16} color="#059669" />
            <Text style={styles.footerNoteText}>
              Secure checkout • Your payment information is encrypted
            </Text>
          </View>

          {/* Validation messages */}
          {!formData.agreeTerms && (
            <View style={styles.validationMessage}>
              <MaterialIcons name="warning" size={16} color="#D97706" />
              <Text style={styles.validationText}>
                Please agree to the Terms of Service and Privacy Policy
              </Text>
            </View>
          )}
          
          {currentPaymentMethod?.requiresDetails && !isEwalletFieldsValid() && (
            <View style={styles.validationMessage}>
              <MaterialIcons name="warning" size={16} color="#D97706" />
              <Text style={styles.validationText}>
                Please fill in all required {currentPaymentMethodName} details
              </Text>
            </View>
          )}
          
          {formData.shippingMethod === 'Standard Delivery' && !formData.selectedAddressId && (
            <View style={styles.validationMessage}>
              <MaterialIcons name="warning" size={16} color="#D97706" />
              <Text style={styles.validationText}>
                Please select a shipping address for delivery
              </Text>
            </View>
          )}
        </View>

        {/* Address Selection Modal */}
        <Modal
          visible={isAddressModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddressModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Shipping Address</Text>
                <TouchableOpacity 
                  onPress={() => setIsAddressModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {checkoutData.shipping_addresses.map((address) => {
                  const isSelected = formData.selectedAddressId === address.id;
                  return (
                    <TouchableOpacity
                      key={address.id}
                      style={[
                        styles.modalAddressCard,
                        isSelected && styles.modalAddressCardSelected
                      ]}
                      onPress={() => {
                        handleInputChange('selectedAddressId', address.id);
                        setIsAddressModalVisible(false);
                      }}
                    >
                      <View style={styles.modalAddressHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.modalAddressNameRow}>
                            <Text style={styles.modalAddressName}>{address.recipient_name}</Text>
                            {address.is_default && (
                              <View style={styles.modalDefaultBadge}>
                                <Text style={styles.modalDefaultBadgeText}>Default</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modalAddressPhone}>{address.recipient_phone}</Text>
                        </View>
                        <View style={[
                          styles.modalAddressRadio,
                          isSelected && styles.modalAddressRadioSelected
                        ]} />
                      </View>
                      
                      <Text style={styles.modalAddressFull}>{address.full_address}</Text>
                      
                      {address.instructions && (
                        <Text style={styles.modalAddressInstructions}>
                          📝 {address.instructions}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity 
                  style={styles.addNewAddressButton}
                  onPress={() => {
                    setIsAddressModalVisible(false);
                    router.push('/customer/home');
                  }}
                >
                  <MaterialIcons name="add" size={24} color="#EA580C" />
                  <Text style={styles.addNewAddressText}>Add New Address</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Voucher Selection Modal */}
        <Modal
          visible={isVoucherModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsVoucherModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Available Vouchers</Text>
                <TouchableOpacity 
                  onPress={() => setIsVoucherModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {/* Voucher Categories */}
                {checkoutData.available_vouchers.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.voucherCategoryScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.voucherCategoryButton,
                        activeVoucherCategory === 'all' && styles.voucherCategoryButtonActive
                      ]}
                      onPress={() => setActiveVoucherCategory('all')}
                    >
                      <Text style={[
                        styles.voucherCategoryText,
                        activeVoucherCategory === 'all' && styles.voucherCategoryTextActive
                      ]}>
                        All Vouchers
                      </Text>
                    </TouchableOpacity>
                    
                    {checkoutData.available_vouchers.map((category, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.voucherCategoryButton,
                          activeVoucherCategory === category.category && styles.voucherCategoryButtonActive
                        ]}
                        onPress={() => setActiveVoucherCategory(category.category)}
                      >
                        <Text style={[
                          styles.voucherCategoryText,
                          activeVoucherCategory === category.category && styles.voucherCategoryTextActive
                        ]}>
                          {category.category.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {/* Vouchers List */}
                {loadingVouchers ? (
                  <View style={styles.loadingVouchers}>
                    <ActivityIndicator size="large" color="#EA580C" />
                    <Text style={styles.loadingVouchersText}>Loading vouchers...</Text>
                  </View>
                ) : filteredVouchers.length > 0 ? (
                  filteredVouchers.map((voucher, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalVoucherCard}
                      onPress={() => {
                        setVoucherCode(voucher.code);
                        handleApplyVoucher();
                      }}
                    >
                      <View style={styles.modalVoucherHeader}>
                        <View style={styles.modalVoucherLeft}>
                          <View style={styles.modalVoucherIcon}>
                            {voucher.discount_type === 'percentage' ? (
                              <MaterialIcons name="percent" size={24} color="#EA580C" />
                            ) : (
                              <MaterialIcons name="attach-money" size={24} color="#EA580C" />
                            )}
                          </View>
                          <View style={styles.modalVoucherInfo}>
                            <View style={styles.modalVoucherCodeRow}>
                              <Text style={styles.modalVoucherCode}>{voucher.code}</Text>
                              {voucher.is_recommended && (
                                <View style={styles.recommendedBadge}>
                                  <MaterialIcons name="bolt" size={12} color="#FFFFFF" />
                                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
                                </View>
                              )}
                              {voucher.customer_tier && voucher.customer_tier !== 'all' && (
                                <View style={[
                                  styles.tierBadge,
                                  voucher.customer_tier === 'platinum' && styles.tierBadgePlatinum,
                                  voucher.customer_tier === 'gold' && styles.tierBadgeGold,
                                  voucher.customer_tier === 'silver' && styles.tierBadgeSilver,
                                ]}>
                                  <Text style={styles.tierBadgeText}>{voucher.customer_tier}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.modalVoucherName}>{voucher.name}</Text>
                            <Text style={styles.modalVoucherDescription}>{voucher.description}</Text>
                            
                            <View style={styles.modalVoucherDetails}>
                              <View style={styles.modalVoucherDetail}>
                                <MaterialIcons name="store" size={14} color="#6B7280" />
                                <Text style={styles.modalVoucherDetailText}>{voucher.shop_name}</Text>
                              </View>
                              <View style={styles.modalVoucherDetail}>
                                <Text style={styles.modalVoucherDetailText}>
                                  Min: ₱{voucher.minimum_spend.toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.modalVoucherRight}>
                          <View style={styles.modalVoucherDiscount}>
                            <Text style={styles.modalVoucherDiscountValue}>
                              {voucher.discount_type === 'percentage' 
                                ? `${voucher.value}%` 
                                : `₱${voucher.value}`}
                            </Text>
                            <Text style={styles.modalVoucherDiscountLabel}>OFF</Text>
                          </View>
                          
                          {voucher.potential_savings > 0 && (
                            <Text style={styles.modalVoucherSavings}>
                              Save ₱{voucher.potential_savings.toFixed(2)}
                            </Text>
                          )}
                          
                          <TouchableOpacity 
                            style={styles.modalApplyButton}
                            onPress={() => {
                              setVoucherCode(voucher.code);
                              handleApplyVoucher();
                            }}
                          >
                            <Text style={styles.modalApplyButtonText}>Apply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noVouchersContainer}>
                    <MaterialIcons name="local-offer" size={48} color="#D1D5DB" />
                    <Text style={styles.noVouchersTitle}>No Vouchers Available</Text>
                    <Text style={styles.noVouchersText}>
                      No vouchers available for your current order amount.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
    backgroundColor: '#EA580C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  itemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemShop: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTotalPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  itemEachPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemQuantity: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  shippingMethods: {
    gap: 12,
  },
  shippingMethodCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  shippingMethodCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  shippingMethodContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shippingMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shippingMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shippingMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  shippingMethodNameSelected: {
    color: '#EA580C',
  },
  shippingMethodDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  shippingMethodDelivery: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  shippingMethodRight: {
    alignItems: 'flex-end',
  },
  shippingMethodCost: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  radioButtonSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manageButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  addressesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  addressCard: {
    width: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  addressCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addressPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addressRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  addressRadioSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  addressFull: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
    marginBottom: 4,
  },
  addressInstructions: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noAddressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addAddressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pickupLocationCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickupShopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pickupShopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pickupAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  pickupContact: {
    fontSize: 12,
    color: '#EA580C',
  },
  pickupInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  pickupInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  appliedVoucherCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  appliedVoucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedVoucherIcon: {
    marginRight: 12,
  },
  appliedVoucherInfo: {
    flex: 1,
  },
  voucherCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  appliedVoucherCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
  },
  appliedVoucherName: {
    fontSize: 12,
    color: '#065F46',
    marginBottom: 4,
  },
  appliedVoucherDiscount: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  removeVoucherButton: {
    padding: 4,
  },
  tierBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  enterVoucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  enterVoucherText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  voucherInputContainer: {
    gap: 8,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  applyVoucherButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyVoucherButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  applyVoucherText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  voucherErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  voucherErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
  },
  availableVouchersPreview: {
    marginTop: 16,
  },
  availableVouchersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  vouchersPreviewScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  voucherPreviewCard: {
    width: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  voucherPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voucherPreviewCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  voucherPreviewDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  voucherPreviewSavings: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  paymentMethodCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  paymentMethodNameSelected: {
    color: '#EA580C',
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  paymentRadioSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  ewalletDetailsCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFBEB',
  },
  ewalletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ewalletTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  ewalletDescription: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 16,
  },
  ewalletForm: {
    gap: 12,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  remarksCounter: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  orderSummary: {
    gap: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  discountLabel: {
    fontSize: 14,
    color: '#059669',
  },
  discountValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalRight: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  totalVat: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  savingsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#6B7280',
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  validationText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalAddressCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalAddressCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  modalAddressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalAddressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalAddressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  modalDefaultBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalDefaultBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalAddressPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modalAddressRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  modalAddressRadioSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  modalAddressFull: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  modalAddressInstructions: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EA580C',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  addNewAddressText: {
    fontSize: 16,
    color: '#EA580C',
    fontWeight: '600',
  },
  voucherCategoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  voucherCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  voucherCategoryButtonActive: {
    backgroundColor: '#EA580C',
  },
  voucherCategoryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  voucherCategoryTextActive: {
    color: '#FFFFFF',
  },
  loadingVouchers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingVouchersText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  modalVoucherCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalVoucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalVoucherLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  modalVoucherIcon: {
    marginRight: 12,
  },
  modalVoucherInfo: {
    flex: 1,
  },
  modalVoucherCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  modalVoucherCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  recommendedBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tierBadgePlatinum: {
    backgroundColor: '#92400E',
  },
  tierBadgeGold: {
    backgroundColor: '#D97706',
  },
  tierBadgeSilver: {
    backgroundColor: '#6B7280',
  },
  modalVoucherName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  modalVoucherDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  modalVoucherDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalVoucherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalVoucherDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  modalVoucherRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  modalVoucherDiscount: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalVoucherDiscountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalVoucherDiscountLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  modalVoucherSavings: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  modalApplyButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noVouchersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noVouchersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noVouchersText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});