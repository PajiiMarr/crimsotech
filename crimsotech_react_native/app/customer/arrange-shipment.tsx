// app/customer/arrange-shipment.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Store,
  Phone,
  Mail,
  AlertCircle,
  Box,
  Weight,
  Home,
  Check,
  Handshake,
  ShoppingBag,
  Building,
  PhoneCall,
  MessageSquare,
  Sparkles,
  UserCircle,
  Star,
  ShieldCheck,
  Award,
  Car,
  Bike,
  Target,
  Tag,
  Send,
  Info,
  Calculator,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  CircleCheck as CircleCheckIcon,
  Circle as CircleIcon,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import CustomerLayout from './CustomerLayout';

// Orange color palette
const ORANGE = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316', // Primary orange
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
};

// Types
interface Rider {
  id: string;
  rider_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_model: string;
  plate_number: string;
  verified: boolean;
  rating: number;
  total_deliveries: number;
  delivery_success_rate: number;
  response_time: string;
  current_location: string;
  base_fee: number;
  accepts_custom_offers: boolean;
}

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    weight?: number;
    dimensions?: string;
    seller: {
      id: string;
      name: string;
      username: string;
      first_name: string;
      last_name: string;
      address: string;
      phone: string;
    };
  };
  quantity: number;
  total_amount: number;
}

interface OrderData {
  success: boolean;
  message: string;
  data: {
    order_id: string;
    buyer: {
      id: string;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
    };
    delivery_address: string;
    address_details: {
      street: string;
      city: string;
      province: string;
      postal_code: string;
      country: string;
      contact_person: string;
      contact_phone: string;
      notes?: string;
    };
    items: OrderItem[];
    total_amount: number;
    payment_method: string;
    created_at: string;
    current_status: string;
    seller_info: {
      id: string;
      name: string;
      username: string;
      address: string;
      phone: string;
    };
  };
}

interface RidersResponse {
  success: boolean;
  message: string;
  data: Rider[];
}

interface OfferResponse {
  success: boolean;
  message: string;
  data: {
    order_id: string;
    delivery_id: string;
    rider_name: string;
    offer_amount: number;
    offer_type: string;
    delivery_notes: string;
    status: string;
    submitted_at: string;
    seller_info: {
      id: string;
      name: string;
    };
  };
}

interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  cost: number;
  estimated_days: string;
}

// Simplified delivery methods
const deliveryMethods: DeliveryMethod[] = [
  {
    id: "seller_delivery",
    name: "Deliver Yourself",
    description: "You deliver directly to buyer",
    icon: <Truck width={24} height={24} color={ORANGE[500]} />,
    cost: 0,
    estimated_days: "You set timeline"
  },
  {
    id: "choose_rider",
    name: "Hire a Rider",
    description: "Select from verified riders",
    icon: <UserCircle width={24} height={24} color={ORANGE[500]} />,
    cost: 50,
    estimated_days: "1-2 days"
  }
];

export default function ArrangeShipment() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { orderId, userId } = params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderData['data'] | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("choose_rider");
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [offerAmount, setOfferAmount] = useState<number>(50);
  const [offerType, setOfferType] = useState<'base_fee' | 'custom'>('base_fee');
  const [error, setError] = useState<string | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (orderId && userId) {
      fetchShipmentData();
    }
  }, [orderId, userId]);

  const fetchShipmentData = async () => {
    if (!orderId || !userId) {
      setError("Order ID and User ID are required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const orderResponse = await AxiosInstance.get(`/customer-arrange-shipment/${orderId}/get_order_details/`, {
        params: { user_id: userId }
      });

      const ridersResponse = await AxiosInstance.get(`/customer-arrange-shipment/${orderId}/get_available_riders/`, {
        params: { user_id: userId }
      });

      setOrder(orderResponse.data.data);
      setRiders(ridersResponse.data.data || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching shipment data:", error);
      setError(error.response?.data?.message || "Failed to load shipment data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShipmentData();
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car':
        return <Car width={14} height={14} color="#6B7280" />;
      case 'motorcycle':
        return <Bike width={14} height={14} color="#6B7280" />;
      default:
        return <Car width={14} height={14} color="#6B7280" />;
    }
  };

  const calculateFairOffer = (baseFee: number) => {
    const itemWeight = order?.items[0]?.product.weight || 1;
    const weightMultiplier = itemWeight > 5 ? 1.5 : itemWeight > 2 ? 1.2 : 1;
    return Math.max(50, Math.round(baseFee * weightMultiplier));
  };

  const selectedRiderData = riders.find(r => r.id === selectedRider);

  useEffect(() => {
    if (selectedRiderData && offerType === 'base_fee') {
      setOfferAmount(selectedRiderData.base_fee);
    }
  }, [selectedRiderData, offerType]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH')}`;
  };

  const handleSubmitOffer = async () => {
    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to terms");
      return;
    }

    if (selectedMethod === "choose_rider" && !selectedRider) {
      Alert.alert("Error", "Please select a rider");
      return;
    }

    if (selectedMethod === "choose_rider" && offerAmount < 50) {
      Alert.alert("Error", "Minimum offer is ₱50");
      return;
    }

    setSubmitting(true);

    try {
      if (selectedMethod === "choose_rider" && selectedRiderData) {
        const response = await AxiosInstance.post(
          `/customer-arrange-shipment/${orderId}/submit_shipment_offer/`,
          {
            user_id: userId,
            rider_id: selectedRiderData.rider_id,
            offer_amount: offerAmount,
            offer_type: offerType,
            delivery_notes: deliveryNotes
          }
        );

        if (response.data.success) {
          Alert.alert(
            "Success!",
            `Offer sent to ${selectedRiderData.user.first_name}`,
            [{ text: "OK", onPress: () => router.push('/customer/order-lists?tab=processing') }]
          );
        }
      } else {
        Alert.alert(
          "Success!",
          "You'll coordinate delivery with buyer",
          [{ text: "OK", onPress: () => router.push('/customer/order-lists?tab=processing') }]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={ORANGE[500]} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout>
          <View style={styles.centerContainer}>
            <AlertCircle width={48} height={48} color="#DC2626" />
            <Text style={styles.errorText}>{error || "Order not found"}</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft width={16} height={16} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE[500]} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft width={20} height={20} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>Arrange Shipment</Text>
              <Text style={styles.subtitle}>#{order.order_id.slice(0, 8)}</Text>
            </View>
          </View>

          {/* Order Card */}
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Package width={16} height={16} color={ORANGE[500]} />
              <Text style={styles.orderTitle}>Items ({order.items.length})</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                <View style={styles.itemRow}>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.total_amount)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(order.total_amount)}</Text>
            </View>
          </View>

          {/* Delivery Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck width={16} height={16} color={ORANGE[500]} />
              <Text style={styles.sectionTitle}>Delivery Method</Text>
            </View>
            <View style={styles.methodGrid}>
              {deliveryMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === method.id && styles.methodCardSelected
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={styles.methodIcon}>{method.icon}</View>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDesc}>{method.description}</Text>
                  <View style={styles.methodMeta}>
                    <Clock width={10} height={10} color="#9CA3AF" />
                    <Text style={styles.methodMetaText}>{method.estimated_days}</Text>
                  </View>
                  {method.cost > 0 && (
                    <View style={styles.methodCost}>
                      <Tag width={10} height={10} color={ORANGE[500]} />
                      <Text style={styles.methodCostText}>Min ₱{method.cost}</Text>
                    </View>
                  )}
                  {selectedMethod === method.id && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle width={14} height={14} color={ORANGE[500]} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rider Selection */}
          {selectedMethod === "choose_rider" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <UserCircle width={16} height={16} color={ORANGE[500]} />
                <Text style={styles.sectionTitle}>Select Rider</Text>
              </View>

              {selectedRiderData ? (
                <TouchableOpacity
                  style={styles.selectedRiderCard}
                  onPress={() => setShowRiderModal(true)}
                >
                  <View style={styles.riderRow}>
                    <View style={styles.riderAvatar}>
                      <Text style={styles.riderInitials}>
                        {selectedRiderData.user.first_name[0]}
                        {selectedRiderData.user.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.riderInfo}>
                      <Text style={styles.riderName}>
                        {selectedRiderData.user.first_name} {selectedRiderData.user.last_name}
                      </Text>
                      <View style={styles.riderRating}>
                        <Star width={10} height={10} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.riderRatingText}>{selectedRiderData.rating}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.changeButton}
                      onPress={() => setShowRiderModal(true)}
                    >
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.riderDetails}>
                    <View style={styles.riderDetail}>
                      {getVehicleIcon(selectedRiderData.vehicle_type)}
                      <Text style={styles.riderDetailText}>
                        {selectedRiderData.vehicle_type} • {selectedRiderData.vehicle_brand}
                      </Text>
                    </View>
                    <View style={styles.riderDetail}>
                      <MapPin width={10} height={10} color="#6B7280" />
                      <Text style={styles.riderDetailText}>{selectedRiderData.current_location}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.selectRiderButton}
                  onPress={() => setShowRiderModal(true)}
                >
                  <Text style={styles.selectRiderText}>Choose a rider</Text>
                  <ChevronDown width={16} height={16} color="#6B7280" />
                </TouchableOpacity>
              )}

              {/* Offer */}
              {selectedRiderData && (
                <View style={styles.offerSection}>
                  <View style={styles.offerHeader}>
                    <Tag width={14} height={14} color={ORANGE[500]} />
                    <Text style={styles.offerTitle}>Your Offer</Text>
                  </View>

                  <View style={styles.offerTypeRow}>
                    <TouchableOpacity
                      style={[styles.offerType, offerType === 'base_fee' && styles.offerTypeActive]}
                      onPress={() => setOfferType('base_fee')}
                    >
                      <Text style={[styles.offerTypeText, offerType === 'base_fee' && styles.offerTypeTextActive]}>
                        Base (₱{selectedRiderData.base_fee})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.offerType,
                        offerType === 'custom' && styles.offerTypeActive,
                        !selectedRiderData.accepts_custom_offers && styles.offerTypeDisabled
                      ]}
                      onPress={() => selectedRiderData.accepts_custom_offers && setOfferType('custom')}
                      disabled={!selectedRiderData.accepts_custom_offers}
                    >
                      <Text style={[
                        styles.offerTypeText,
                        offerType === 'custom' && styles.offerTypeTextActive,
                        !selectedRiderData.accepts_custom_offers && styles.offerTypeTextDisabled
                      ]}>
                        Custom
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {offerType === 'custom' && (
                    <View style={styles.customOffer}>
                      <Text style={styles.offerAmount}>₱{offerAmount}</Text>
                      <View style={styles.offerPresets}>
                        <TouchableOpacity
                          style={styles.offerPreset}
                          onPress={() => setOfferAmount(selectedRiderData.base_fee)}
                        >
                          <Text style={styles.offerPresetText}>Base</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.offerPreset}
                          onPress={() => setOfferAmount(calculateFairOffer(selectedRiderData.base_fee))}
                        >
                          <Text style={styles.offerPresetText}>Fair</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <TextInput
                    style={styles.notesInput}
                    placeholder="Notes for rider (optional)"
                    placeholderTextColor="#9CA3AF"
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                    multiline
                  />
                </View>
              )}
            </View>
          )}

          {/* Agreement */}
          <TouchableOpacity
            style={styles.agreement}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms && <Check width={12} height={12} color="#FFFFFF" />}
            </View>
            <Text style={styles.agreementText}>
              I agree to proceed
            </Text>
          </TouchableOpacity>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!agreeToTerms || (selectedMethod === "choose_rider" && !selectedRider) || submitting) && 
              styles.submitButtonDisabled
            ]}
            onPress={handleSubmitOffer}
            disabled={!agreeToTerms || (selectedMethod === "choose_rider" && !selectedRider) || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {selectedMethod === "choose_rider" ? `Send Offer (${formatCurrency(offerAmount)})` : 'Confirm'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Rider Modal */}
        <Modal
          visible={showRiderModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRiderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Rider</Text>
                <TouchableOpacity onPress={() => setShowRiderModal(false)}>
                  <X width={20} height={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={riders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item: rider }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalRiderCard,
                      selectedRider === rider.id && styles.modalRiderCardSelected
                    ]}
                    onPress={() => {
                      setSelectedRider(rider.id);
                      setShowRiderModal(false);
                    }}
                  >
                    <View style={styles.modalRiderRow}>
                      <View style={styles.modalRiderAvatar}>
                        <Text style={styles.modalRiderInitials}>
                          {rider.user.first_name[0]}{rider.user.last_name[0]}
                        </Text>
                      </View>
                      <View style={styles.modalRiderInfo}>
                        <Text style={styles.modalRiderName}>
                          {rider.user.first_name} {rider.user.last_name}
                        </Text>
                        <View style={styles.modalRiderRating}>
                          <Star width={10} height={10} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.modalRiderRatingText}>{rider.rating}</Text>
                        </View>
                      </View>
                      <Text style={styles.modalRiderFee}>₱{rider.base_fee}</Text>
                    </View>

                    <View style={styles.modalRiderDetails}>
                      <View style={styles.modalRiderDetail}>
                        {getVehicleIcon(rider.vehicle_type)}
                        <Text style={styles.modalRiderDetailText}>
                          {rider.vehicle_type} • {rider.vehicle_brand}
                        </Text>
                      </View>
                      <View style={styles.modalRiderDetail}>
                        <MapPin width={10} height={10} color="#6B7280" />
                        <Text style={styles.modalRiderDetailText}>{rider.current_location}</Text>
                      </View>
                    </View>

                    {rider.verified && (
                      <View style={styles.verifiedBadge}>
                        <ShieldCheck width={10} height={10} color="#059669" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
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
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  orderItem: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 13,
    color: '#111827',
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: ORANGE[500],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: ORANGE[600],
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  // Method Grid
  methodGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  methodCardSelected: {
    borderColor: ORANGE[400],
    backgroundColor: ORANGE[50],
  },
  methodIcon: {
    marginBottom: 10,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  methodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  methodMetaText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  methodCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  methodCostText: {
    fontSize: 10,
    color: ORANGE[500],
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Rider Selection
  selectedRiderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ORANGE[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  riderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  riderRatingText: {
    fontSize: 11,
    color: '#F59E0B',
  },
  changeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  changeButtonText: {
    fontSize: 11,
    color: '#6B7280',
  },
  riderDetails: {
    gap: 6,
  },
  riderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riderDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  selectRiderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  selectRiderText: {
    fontSize: 14,
    color: '#374151',
  },

  // Offer Section
  offerSection: {
    marginTop: 8,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  offerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  offerTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  offerType: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  offerTypeActive: {
    borderColor: ORANGE[400],
    backgroundColor: ORANGE[50],
  },
  offerTypeDisabled: {
    opacity: 0.5,
  },
  offerTypeText: {
    fontSize: 12,
    color: '#374151',
  },
  offerTypeTextActive: {
    color: ORANGE[600],
    fontWeight: '500',
  },
  offerTypeTextDisabled: {
    color: '#9CA3AF',
  },
  customOffer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: ORANGE[500],
    textAlign: 'center',
    marginBottom: 10,
  },
  offerPresets: {
    flexDirection: 'row',
    gap: 8,
  },
  offerPreset: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offerPresetText: {
    fontSize: 11,
    color: '#374151',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 60,
  },

  // Agreement
  agreement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: ORANGE[500],
    borderColor: ORANGE[500],
  },
  agreementText: {
    fontSize: 13,
    color: '#374151',
  },

  // Submit Button
  submitButton: {
    backgroundColor: ORANGE[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalList: {
    padding: 16,
  },
  modalRiderCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  modalRiderCardSelected: {
    borderColor: ORANGE[400],
    backgroundColor: ORANGE[50],
  },
  modalRiderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalRiderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ORANGE[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalRiderInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalRiderInfo: {
    flex: 1,
  },
  modalRiderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  modalRiderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  modalRiderRatingText: {
    fontSize: 11,
    color: '#F59E0B',
  },
  modalRiderFee: {
    fontSize: 15,
    fontWeight: '600',
    color: ORANGE[500],
  },
  modalRiderDetails: {
    gap: 6,
  },
  modalRiderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalRiderDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
  },
});