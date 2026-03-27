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
  Image,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  Entypo,
  Feather
} from '@expo/vector-icons';

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
  
  // Get orderId from query string
  const orderId = params.orderId as string;
  
  console.log('OrderSuccessfulPage received params:', params);
  console.log('Order ID:', orderId);
  
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
      console.log('Fetching order details for:', orderId);
      
      const response = await AxiosInstance.get(`/checkout-order/get_order_details/${orderId}/`, {
        headers: {
          'X-User-Id': userId
        }
      });
      
      console.log('Order details response:', response.data);
      
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Order Confirmed',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 'hourglass-empty';
      case 'shipped':
        return 'local-shipping';
      case 'delivered':
        return 'check-circle';
      default:
        return 'shopping-cart';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'processing':
        return '#3B82F6';
      case 'shipped':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const handleTrackOrder = () => {
    if (order?.tracking_number) {
      Alert.alert(
        'Track Order',
        `Tracking Number: ${order.tracking_number}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy Number', onPress: () => {
            Alert.alert('Copied', 'Tracking number copied to clipboard');
          }},
        ]
      );
    } else {
      Alert.alert('Info', 'Tracking number will be available once order is shipped');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('tel:+1234567890');
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
          <Text style={styles.loadingText}>Loading Order Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={80} color="#DC2626" />
          <Text style={styles.errorTitle}>{error || 'Order Not Found'}</Text>
          <Text style={styles.errorText}>
            The order you're looking for doesn't exist or you don't have permission to view it.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/customer/purchases')}
          >
            <Text style={styles.backButtonText}>View All Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderDate = formatDate(order.created_at);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.header}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={48} color="#10B981" />
          </View>
          <Text style={styles.headerTitle}>Order Confirmed!</Text>
          <Text style={styles.headerSubtitle}>
            Thank you for your purchase. Your order has been received.
          </Text>
          <Text style={styles.orderId}>Order ID: {order.order_id}</Text>
        </View>

        {/* Order Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="shopping-cart" size={24} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Order Details</Text>
              <Text style={styles.cardDate}>Placed on {orderDate}</Text>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.statusSection}>
            <View style={styles.statusItem}>
              <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) }]}>
                <MaterialIcons name={getStatusIcon(order.status)} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>{getOrderStatusText(order.status)}</Text>
                <Text style={styles.statusDescription}>
                  Your order has been received and confirmed
                </Text>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Payment Method</Text>
                <Text style={styles.summaryValue}>{order.payment_method || 'Not specified'}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₱{parseFloat(order.total_amount.toString()).toFixed(2)}</Text>
              </View>
              
              {order.shipping_method && (
                <View style={[styles.summaryItem, styles.summaryItemFull]}>
                  <Text style={styles.summaryLabel}>Delivery Method</Text>
                  <Text style={styles.summaryValue}>{order.shipping_method}</Text>
                </View>
              )}
              
              {order.delivery_address_text && (
                <View style={[styles.summaryItem, styles.summaryItemFull]}>
                  <Text style={styles.summaryLabel}>Delivery Address</Text>
                  <Text style={styles.summaryValue}>{order.delivery_address_text}</Text>
                </View>
              )}
              
              {order.tracking_number && (
                <View style={[styles.summaryItem, styles.summaryItemFull]}>
                  <Text style={styles.summaryLabel}>Tracking Number</Text>
                  <Text style={styles.summaryValue}>{order.tracking_number}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleViewOrders}
          >
            <MaterialIcons name="shopping-bag" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleContinueShopping}
          >
            <MaterialIcons name="home" size={20} color="#EA580C" />
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Check your email for order confirmation{'\n'}
            • Track your order status in "My Orders"{'\n'}
            • Contact support for any questions
          </Text>
        </View>
      </ScrollView>
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  orderId: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusSection: {
    gap: 20,
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemFull: {
    flex: 0,
    width: '100%',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EA580C',
  },
  actionsSection: {
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#EA580C',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});