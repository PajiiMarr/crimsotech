// shipping-timeline.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

// Updated interfaces to match view-order response
interface TimelineEvent {
  event: string;
  description: string;
  date: string | null;
  icon: string;
  color: string;
  completed: boolean;
}

interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  purchased_at: string;
  shop_info?: {
    id: string;
    name: string;
    picture: string | null;
  };
}

interface OrderData {
  order: {
    id: string;
    status: string;
    status_display: string;
    status_color: string;
    created_at: string;
    updated_at: string | null;
    payment_method: string;
    payment_status: string | null;
    delivery_status: string | null;
    delivery_rider: string | null;
    delivery_notes: string | null;
    delivery_date: string | null;
  };
  shipping_info: {
    logistics_carrier: string;
    tracking_number: string | null;
    delivery_method: string;
    estimated_delivery: string | null;
  };
  delivery_address: {
    recipient_name: string;
    phone_number: string;
    address: string;
  };
  items: OrderItem[];
  order_summary: {
    subtotal: string;
    shipping_fee: string;
    tax: string;
    discount: string;
    total: string;
    payment_fee: string;
  };
  summary_counts: {
    total_items: number;
    total_unique_items: number;
  };
  timeline: TimelineEvent[];
  actions: {
    can_cancel: boolean;
    can_track: boolean;
    can_review: boolean;
    can_return: boolean;
    can_contact_seller: boolean;
    can_buy_again: boolean;
  };
}

// Helper function to calculate progress percentage
const calculateProgressPercentage = (status: string): number => {
  const progressMap: Record<string, number> = {
    'pending': 10,
    'processing': 30,
    'shipped': 70,
    'delivered': 100,
    'completed': 100,
    'cancelled': 0,
    'refunded': 0,
  };
  return progressMap[status] || 0;
};

// Helper function to get shop name from first item
const getShopNameFromItems = (items: OrderItem[]): string => {
  if (items.length > 0 && items[0].shop_info) {
    return items[0].shop_info.name;
  }
  return 'Seller Warehouse';
};

export default function ShippingTimelinePage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { orderId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    // If there's no orderId, stop the loading indicator
    if (!orderId) {
      setLoading(false);
      return;
    }

    // When auth finishes and we don't have a signed-in user, stop loading and prompt to sign in
    if (authLoading === false && !user?.id) {
      setLoading(false);
      return;
    }

    // Normal flow: fetch when we have a user and orderId
    if (user?.id && orderId) {
      fetchOrderDetails();
    }
  }, [user?.id, orderId, authLoading]);

  const fetchOrderDetails = async () => {
    if (!user?.id || !orderId) {
      setLoading(false);
      return;
    }

    try {   
      setLoading(true);

      // Prefer the new shipping-timeline endpoint which returns a richer shape
      try {
        const resp = await AxiosInstance.get(
          `/purchases-buyer/${orderId}/shipping-timeline/`,
          { headers: { 'X-User-Id': user.id } }
        );

        if (resp?.data) {
          const d = resp.data as any;

          // Map shipping-timeline response into the component's OrderData shape
          const mapped: OrderData = {
            order: {
              id: d.order?.id || String(orderId),
              status: d.order?.status || 'pending',
              status_display: d.order?.status_display || d.order?.status || 'Pending',
              status_color: d.order?.status_color || '#6B7280',
              created_at: d.order?.created_at || '',
              updated_at: d.order?.updated_at || null,
              payment_method: d.order?.payment_method || '',
              payment_status: d.order?.payment_status || null,
              delivery_status: d.tracking?.status || d.order?.delivery_status || null,
              delivery_rider: d.rider_info?.name || d.order?.delivery_rider || null,
              delivery_notes: d.order?.delivery_notes || null,
              delivery_date: d.tracking?.delivery_date || d.order?.delivery_date || null,
            },
            shipping_info: {
              logistics_carrier: d.shipping_info?.carrier?.name || d.shipping_info?.logistics_carrier || '',
              tracking_number: d.tracking?.tracking_number || null,
              delivery_method: d.shipping_info?.carrier?.service_type || d.shipping_info?.delivery_method || '',
              estimated_delivery: d.tracking?.estimated_delivery || d.shipping_info?.estimated_delivery || null,
            },
            delivery_address: {
              recipient_name: d.shipping_info?.to_address?.recipient || d.delivery_address?.recipient_name || '',
              phone_number: d.shipping_info?.to_address?.phone || d.delivery_address?.phone_number || '',
              address: d.shipping_info?.to_address?.address || d.delivery_address?.address || '',
            },
            items: (d.package_contents?.items || []).map((it: any) => ({
              checkout_id: '',
              product_id: '',
              product_name: it.name || 'Item',
              quantity: Number(it.quantity || 1),
              price: String(it.value || '0'),
              subtotal: String(it.value || '0'),
              status: d.order?.status || 'pending',
              purchased_at: '',
              shop_info: undefined,
            })),
            order_summary: {
              subtotal: String(d.package_contents?.total_value || d.order?.total || '0'),
              shipping_fee: '0.00',
              tax: '0.00',
              discount: '0.00',
              total: d.order?.total || String(d.package_contents?.total_value || '0'),
              payment_fee: '0.00',
            },
            summary_counts: {
              total_items: d.package_contents?.total_items || 0,
              total_unique_items: (d.package_contents?.items || []).length || 0,
            },
            timeline: (d.timeline || []).map((ev: any) => ({
              event: ev.event,
              description: ev.description,
              date: ev.date || null,
              icon: ev.icon || 'time',
              color: ev.color || (ev.completed ? '#10B981' : '#6B7280'),
              completed: ev.status === 'completed' || !!ev.completed,
            })),
            actions: {
              can_cancel: !!d.actions?.can_cancel,
              can_track: !!d.actions?.can_track,
              can_review: !!d.actions?.can_review,
              can_return: !!d.actions?.can_return,
              can_contact_seller: !!d.actions?.can_contact_seller,
              can_buy_again: !!d.actions?.can_buy_again,
            }
          };

          setOrderData(mapped);
          setProgressPercentage(d.tracking?.progress_percentage ?? calculateProgressPercentage(mapped.order.status));
          return; // done
        }
      } catch (err) {
        // If shipping-timeline is not available, fallback to view-order
        console.warn('shipping-timeline fetch failed, falling back to view-order', err?.response?.status);
      }

      // Fallback to view-order for older shape
      const response = await AxiosInstance.get(
        `/purchases-buyer/${orderId}/view-order/`,
        {
          headers: {
            'X-User-Id': user.id,
          },
        }
      );

      if (response.data) {
        setOrderData(response.data as OrderData);
        const progress = calculateProgressPercentage(response.data.order.status);
        setProgressPercentage(progress);
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to load shipping information'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'checkmark-circle':
        return <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />;
      case 'card':
        return <Ionicons name="card-outline" size={20} color="#FFFFFF" />;
      case 'package':
        return <Ionicons name="cube-outline" size={20} color="#FFFFFF" />;
      case 'truck':
        return <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#FFFFFF" />;
      case 'checkmark-done':
        return <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />;
      case 'trophy':
        return <Ionicons name="trophy-outline" size={20} color="#FFFFFF" />;
      case 'time':
        return <Ionicons name="time-outline" size={20} color="#FFFFFF" />;
      default:
        return <Ionicons name="time-outline" size={20} color="#FFFFFF" />;
    }
  };

  const getStatusIcon = (status: 'completed' | 'pending') => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
      case 'pending':
        return <Ionicons name="time-outline" size={20} color="#6B7280" />;
      default:
        return <Ionicons name="time-outline" size={20} color="#6B7280" />;
    }
  };

  const handleContactRider = () => {
    if (orderData?.order.delivery_rider) {
      Alert.alert(
        'Contact Rider',
        `Contact information for rider would be available here.`,
        [
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  const handleChangeAddress = () => {
    Alert.alert(
      'Change Address',
      'This feature allows you to update your delivery address. Would you like to proceed?',
      [
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleRescheduleDelivery = () => {
    Alert.alert(
      'Reschedule Delivery',
      'Choose a new delivery date and time for your package.',
      [
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleViewProof = () => {
    Alert.alert(
      'Proof of Delivery',
      'This would show the delivery confirmation photo and signature.',
      [
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  // If auth finished but there's no signed-in user, prompt to sign in instead of showing an indefinite loader
  if (authLoading === false && !user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Please sign in to view this page</Text>
        <TouchableOpacity
          style={[styles.backButton, { marginTop: 16 }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.backButtonText}>Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading shipping information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Shipping information not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { order, shipping_info, delivery_address, items, timeline } = orderData;
  const shopName = getShopNameFromItems(items);

  return (
    <View style={styles.container}>
      {/* ===== SAFE HEADER ===== */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipping Timeline</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={fetchOrderDetails}>
              <Ionicons name="refresh" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ===== TRACKING HEADER ===== */}
        <View style={styles.trackingHeader}>
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingNumberLabel}>TRACKING NUMBER</Text>
            <View style={styles.trackingNumberContainer}>
              <Text style={styles.trackingNumber}>
                {shipping_info.tracking_number || `ORDER-${order.id.slice(0, 8).toUpperCase()}`}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => {
                  Alert.alert('Copied', 'Tracking number copied to clipboard');
                }}
              >
                <Ionicons name="copy-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.orderNumber}>Order: {order.id}</Text>
          </View>
          
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: order.status_color }]}>
              {order.status_display}
            </Text>
          </View>
        </View>

        {/* ===== DELIVERY PROGRESS (Stepper) ===== */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <MaterialCommunityIcons name="truck-fast-outline" size={24} color="#111827" />
            <Text style={styles.progressTitle}>Delivery Progress</Text>
          </View>

          {/* Delivered on X (show when delivered) */}
          {order.status === 'delivered' && (
            <Text style={styles.deliveredOnText}>Delivered on {formatDate(order.updated_at || order.delivery_date)}</Text>
          )}

          <View style={styles.stepperContainer}>
            <View style={styles.step}>
              <View style={[styles.stepCircle, order.status === 'pending' || order.status === 'processing' ? styles.stepActive : styles.stepCompleted]}>
                {order.status === 'pending' || order.status === 'processing' ? (
                  <Ionicons name="time-outline" size={16} color={order.status === 'pending' || order.status === 'processing' ? '#111827' : '#FFFFFF'} />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.stepLabel}>Shipped</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.step}>
              <View style={[styles.stepCircle, order.status === 'shipped' ? styles.stepCompleted : (order.status === 'delivered' ? styles.stepCompleted : styles.stepInactive)]}>
                {order.status === 'shipped' ? (
                  <Ionicons name="time-outline" size={16} color="#111827" />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.stepLabel}>Out for Delivery</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.step}>
              <View style={[styles.stepCircle, order.status === 'delivered' ? styles.stepCompleted : styles.stepInactive]}>
                {order.status === 'delivered' ? (
                  <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                ) : (
                  <Ionicons name="time-outline" size={16} color="#111827" />
                )}
              </View>
              <Text style={styles.stepLabel}>Delivered</Text>
            </View>
          </View>

          <View style={styles.progressDetailsCompact}>
            <View style={styles.progressDetail}>
              <Text style={styles.progressDetailLabel}>Estimated Delivery</Text>
              <Text style={styles.progressDetailValue}>
                {formatDate(shipping_info.estimated_delivery)}
              </Text>
            </View>
            <View style={styles.progressDetail}>
              <Text style={styles.progressDetailLabel}>Last Update</Text>
              <Text style={styles.progressDetailValue}>
                {formatDateTime(order.updated_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* ===== SHIPPING TIMELINE ===== */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <MaterialIcons name="timeline" size={24} color="#111827" />
            <Text style={styles.timelineTitle}>Shipping Timeline</Text>
          </View>
          
          <View style={styles.timelineContainer}>
            {timeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDate}>
                    <Text style={styles.timelineDateText}>{formatDate(event.date)}</Text>
                    <Text style={styles.timelineTimeText}>{formatTime(event.date)}</Text>
                  </View>

                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: event.completed ? event.color : '#E5E7EB' }
                  ]}>
                    {getIconComponent(event.icon)}
                  </View>
                  {index < timeline.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                
                <View style={styles.timelineRight}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={styles.timelineEvent}>{event.event}</Text>
                    {getStatusIcon(event.completed ? 'completed' : 'pending')}
                  </View>
                  <Text style={styles.timelineDescription}>{event.description}</Text>

                  {/* Show proof link for delivered events */}
                  {event.event && event.event.toLowerCase().includes('delivered') && (
                    <TouchableOpacity style={styles.proofLink} onPress={handleViewProof}>
                      <Text style={styles.proofLinkText}>View Proof of Delivery</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>


        {/* ===== RIDER INFORMATION ===== */}
        {order.delivery_rider && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="bike" size={24} color="#111827" />
              <Text style={styles.cardTitle}>Delivery Rider</Text>
            </View>
            
            <View style={styles.riderInfo}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderInitial}>
                  {order.delivery_rider.substring(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.riderDetails}>
                <Text style={styles.riderName}>{order.delivery_rider}</Text>
                <View style={styles.riderStats}>
                  <View style={styles.riderStat}>
                    <Ionicons name="car-outline" size={14} color="#6B7280" />
                    <Text style={styles.riderStatText}>Motorcycle</Text>
                  </View>
                  <View style={styles.riderStat}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.riderStatText}>On the way</Text>
                  </View>
                </View>
                <Text style={styles.riderETA}>
                  ETA: {formatTime(shipping_info.estimated_delivery)}
                </Text>
              </View>
            </View>
            
            {order.delivery_status === 'shipped' && (
              <TouchableOpacity 
                style={styles.contactRiderButton}
                onPress={handleContactRider}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                <Text style={styles.contactRiderButtonText}>Contact Rider</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        

        {/* ===== ACTION BUTTONS ===== */}
        <View style={styles.actionButtonsContainer}>
          {/* {order.status === 'shipped' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleRescheduleDelivery}
            >
              <MaterialIcons name="schedule" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Reschedule Delivery</Text>
            </TouchableOpacity>
          )} */}
          
          {order.status === 'delivered' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleViewProof}
            >
              <MaterialIcons name="photo-camera" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>View Proof of Delivery</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(`/customer/view-order?orderId=${orderId}`)}
          >
            <Ionicons name="receipt-outline" size={20} color="#F97316" />
            <Text style={styles.actionButtonText}>View Order Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F3F4F6' 
  },
  headerSafeArea: { 
    backgroundColor: '#FFF', 
    paddingTop: Platform.OS === 'android' ? 40 : 0 
  },
  header: { 
    height: 56, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600' 
  },
  headerIcons: { 
    flexDirection: 'row' 
  },
  content: { 
    flex: 1 
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#6B7280' 
  },

  // Tracking Header
  trackingHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  trackingInfo: {
    flex: 1,
  },
  trackingNumberLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trackingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  orderNumber: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetail: {
    alignItems: 'flex-start',
  },
  progressDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    width: 96,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineRight: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 4,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineEvent: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timelineDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  timelineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },

  // Info Cards
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  cardSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  contentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contentName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  contentDetails: {
    alignItems: 'flex-end',
  },
  contentQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  contentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  // Carrier Info
  carrierInfo: {
    marginTop: 8,
  },
  carrierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  carrierLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carrierLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  carrierDetails: {
    marginLeft: 12,
    flex: 1,
  },
  carrierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  carrierService: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Rider Info
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  riderDetails: {
    marginLeft: 12,
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  riderStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  riderStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  riderStatText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  riderETA: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  contactRiderButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactRiderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Route Container
  routeContainer: {
    marginTop: 8,
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fromIcon: {
    backgroundColor: '#F59E0B',
  },
  toIcon: {
    backgroundColor: '#10B981',
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  addressContact: {
    fontSize: 13,
    color: '#6B7280',
  },
  routeArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
  },
  changeAddressButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Action Buttons
  actionButtonsContainer: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },

  // Stepper / Compact progress
  deliveredOnText: {
    color: '#10B981',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  step: {
    alignItems: 'center',
    width: '30%',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#F3F4F6',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressDetailsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  // Timeline date/time column
  timelineDate: {
    alignItems: 'flex-end',
    width: 72,
    marginRight: 8,
  },
  timelineDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timelineTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  proofLink: {
    marginTop: 8,
  },
  proofLinkText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});