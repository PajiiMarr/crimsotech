// app/customer/order-successful.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import {
  MaterialIcons,
  Ionicons,
} from '@expo/vector-icons';

// Helper function for number formatting
const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return "₱0.00";
  return `₱${amount.toLocaleString("en-PH", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Types
interface OrderDetails {
  id: string;
  order_id: string;
  user_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  shipping_method: string;
  delivery_address_text?: string;
  shipping_address?: {
    street_address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
    full_address?: string;
  };
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  tracking_number?: string;
  estimated_delivery?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  image_url?: string;
  shop_name: string;
}

export default function OrderSuccessfulPage() {
  const { userId, userRole } = useAuth();
  const params = useLocalSearchParams();
  
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId && userId) {
      fetchOrderDetails();
    } else if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
    } else if (!userId) {
      setError('Please login to view order details');
      setLoading(false);
    }
  }, [orderId, userId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await AxiosInstance.get(`/checkout-order/get_order_details/${orderId}/`, {
        headers: { 'X-User-Id': userId }
      });
      
      if (response.data) {
        setOrder(response.data);
      } else {
        setError('Order not found');
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormattedAddress = () => {
    if (order.delivery_address_text) {
      return order.delivery_address_text;
    }
    
    if (order.shipping_address) {
      const addr = order.shipping_address;
      if (addr.full_address) {
        return addr.full_address;
      }
      
      const parts = [
        addr.street_address,
        addr.city,
        addr.province,
        addr.postal_code,
        addr.country
      ].filter(Boolean);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return 'Pickup from store';
  };

  const handleContinueShopping = () => {
    router.push('/customer/home');
  };

  const handleViewOrders = () => {
    router.push('/customer/purchases');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={64} color="#DC2626" />
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/customer/purchases')}>
            <Text style={styles.backButtonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const parsedTotalAmount = parseFloat(order.total_amount?.toString() || '0');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="check" size={48} color="#FFFFFF" />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.subtitle}>Thank you for your purchase</Text>
        
        {/* Order ID */}
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderIdValue}>{order.order_id}</Text>
        </View>

        {/* Order Info - Simple List */}
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Placed on</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Payment</Text>
            <Text style={styles.infoValue}>{order.payment_method || 'COD'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Delivery</Text>
            <Text style={styles.infoValue}>{order.shipping_method || 'Standard'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={[styles.infoValue, styles.addressText]} numberOfLines={3}>
              {getFormattedAddress()}
            </Text>
          </View>
        </View>

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(parsedTotalAmount)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrders}>
            <Text style={styles.primaryButtonText}>View Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleContinueShopping}>
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  orderIdContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 70,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  addressText: {
    lineHeight: 18,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EA580C',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#EA580C',
    fontSize: 15,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});