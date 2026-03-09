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
  system_handles: string[];
  seller_responsibilities: string[];
  buyer_expectations: string[];
  pros: string[];
  cons: string[];
}

// Delivery methods
const deliveryMethods: DeliveryMethod[] = [
  {
    id: "seller_delivery",
    name: "Seller Delivery",
    description: "You deliver directly to buyer's address",
    icon: <Truck width={32} height={32} color="#374151" />,
    cost: 0.00,
    estimated_days: "Flexible (you set timeline)",
    system_handles: [
      "Provides buyer's address",
      "Sends delivery instructions",
      "Notifies buyer",
      "Tracks delivery status"
    ],
    seller_responsibilities: [
      "Arrange own transportation",
      "Schedule delivery with buyer",
      "Travel to buyer's address",
      "Handle item delivery"
    ],
    buyer_expectations: [
      "Be available at address",
      "Provide clear directions",
      "Inspect item upon delivery"
    ],
    pros: [
      "Full control over delivery",
      "No middleman fees",
      "Personal customer service"
    ],
    cons: [
      "Requires time and effort",
      "Transportation costs",
      "Safety considerations"
    ]
  },
  {
    id: "choose_rider",
    name: "Choose a Rider",
    description: "Select from available verified riders and make an offer",
    icon: <UserCircle width={32} height={32} color="#374151" />,
    cost: 50.00,
    estimated_days: "1-2 business days",
    system_handles: [
      "Shows available riders",
      "Provides rider profiles",
      "Facilitates offer system",
      "Handles delivery updates"
    ],
    seller_responsibilities: [
      "Package item securely",
      "Select preferred rider",
      "Make fair delivery offer",
      "Be available for pickup"
    ],
    buyer_expectations: [
      "Receive tracking updates",
      "Be available for delivery",
      "Inspect item upon delivery"
    ],
    pros: [
      "Choose trusted rider",
      "Negotiate delivery cost",
      "Better control",
      "Preferred scheduling"
    ],
    cons: [
      "Must make fair offer",
      "Rider may decline offer",
      "Must be available for pickup"
    ]
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['order', 'method']));

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
      
      // Get order details
      const orderResponse = await AxiosInstance.get(`/customer-arrange-shipment/${orderId}/get_order_details/`, {
        params: { user_id: userId }
      });

      // Get available riders
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

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car':
        return <Car width={16} height={16} color="#6B7280" />;
      case 'motorcycle':
        return <Bike width={16} height={16} color="#6B7280" />;
      default:
        return <Car width={16} height={16} color="#6B7280" />;
    }
  };

  const calculateFairOffer = (baseFee: number) => {
    const itemWeight = order?.items[0]?.product.weight || 1;
    const weightMultiplier = itemWeight > 5 ? 1.5 : itemWeight > 2 ? 1.2 : 1;
    return Math.max(50, Math.round(baseFee * weightMultiplier));
  };

  const getSuggestedOfferRange = (rider: Rider) => {
    const min = 50;
    const base = rider.base_fee;
    const fair = calculateFairOffer(base);
    const max = Math.max(fair * 1.5, base * 2);
    return { min, base, fair, max };
  };

  const selectedRiderData = riders.find(r => r.id === selectedRider);
  const selectedMethodData = deliveryMethods.find(method => method.id === selectedMethod);

  // Update offer amount when rider changes
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
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handleSubmitOffer = async () => {
    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to the terms and conditions");
      return;
    }

    if (selectedMethod === "choose_rider" && !selectedRider) {
      Alert.alert("Error", "Please select a rider");
      return;
    }

    if (selectedMethod === "choose_rider" && offerAmount < 50) {
      Alert.alert("Error", "Offer amount must be at least ₱50");
      return;
    }

    setSubmitting(true);

    try {
      if (selectedMethod === "choose_rider" && selectedRiderData) {
        // Submit shipment offer
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

        const offerData: OfferResponse = response.data;

        if (offerData.success) {
          Alert.alert(
            "Success! 🎉",
            `Delivery Method: ${selectedMethodData?.name}\n` +
            `Rider: ${selectedRiderData.user.first_name} ${selectedRiderData.user.last_name}\n` +
            `Your Offer: ${formatCurrency(offerAmount)}\n` +
            `Vehicle: ${selectedRiderData.vehicle_type}\n\n` +
            `✅ Offer sent to rider for review\n` +
            `✅ Rider has 24 hours to accept/decline\n` +
            `✅ You'll be notified of their decision\n` +
            `✅ If accepted, pickup will be scheduled\n` +
            `\n📧 Notification sent to buyer: ${order?.buyer.email}`,
            [
              {
                text: "OK",
                onPress: () => router.push('/customer/order-lists?tab=processing')
              }
            ]
          );
        } else {
          Alert.alert("Error", offerData.message || "Failed to submit offer");
        }
      } else {
        // Seller delivery
        Alert.alert(
          "Success! 🎉",
          `Delivery Method: ${selectedMethodData?.name}\n\n` +
          `✅ You will coordinate delivery with buyer\n` +
          `✅ Buyer's address has been provided\n` +
          `✅ No delivery fees\n` +
          `✅ Mark as delivered when complete\n` +
          `\n📧 Notification sent to buyer: ${order?.buyer.email}`,
          [
            {
              text: "OK",
              onPress: () => router.push('/customer/order-lists?tab=processing')
            }
          ]
        );
      }
    } catch (error: any) {
      console.error("Submit offer error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to submit offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel",
      "Are you sure you want to cancel? Any changes will be lost.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          onPress: () => router.back(),
          style: "destructive"
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading shipment data...</Text>
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
            <AlertCircle width={64} height={64} color="#DC2626" />
            <Text style={styles.errorTitle}>Error Loading Data</Text>
            <Text style={styles.errorText}>{error || "Order not found"}</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft width={20} height={20} color="#FFFFFF" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
              <ArrowLeft width={24} height={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>Arrange Shipment</Text>
              <Text style={styles.subtitle}>
                Order #{order.order_id.slice(0, 8)} • {formatDate(order.created_at)}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.current_status || 'Ready to Ship'}</Text>
            </View>
          </View>

          {/* Order Summary Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('order')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Package width={20} height={20} color="#374151" />
              <Text style={styles.sectionTitle}>Order Details</Text>
            </View>
            {expandedSections.has('order') ? (
              <ChevronUp width={20} height={20} color="#9CA3AF" />
            ) : (
              <ChevronDown width={20} height={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {expandedSections.has('order') && (
            <View style={styles.sectionContent}>
              {/* Items */}
              {order.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemIcon}>
                    <Box width={24} height={24} color="#6B7280" />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                      {item.product.weight && (
                        <Text style={styles.itemWeight}>Weight: {item.product.weight} kg</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.itemPrice}>{formatCurrency(item.total_amount)}</Text>
                </View>
              ))}

              {/* Seller & Buyer Info */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <Store width={14} height={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Seller (You)</Text>
                  </View>
                  <Text style={styles.infoValue}>{order.seller_info.name}</Text>
                  <Text style={styles.infoSubvalue}>{order.seller_info.username}</Text>
                  <Text style={styles.infoSubvalue}>{order.seller_info.phone}</Text>
                  <Text style={styles.infoSubvalue}>{order.seller_info.address}</Text>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <User width={14} height={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Buyer</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {order.buyer.first_name} {order.buyer.last_name}
                  </Text>
                  <Text style={styles.infoSubvalue}>{order.buyer.email}</Text>
                  {order.buyer.phone && (
                    <Text style={styles.infoSubvalue}>{order.buyer.phone}</Text>
                  )}
                </View>

                <View style={[styles.infoCard, styles.fullWidthCard]}>
                  <View style={styles.infoHeader}>
                    <MapPin width={14} height={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Delivery Address</Text>
                  </View>
                  <Text style={styles.infoValue}>{order.address_details.street}</Text>
                  <Text style={styles.infoSubvalue}>
                    {order.address_details.city}, {order.address_details.province} {order.address_details.postal_code}
                  </Text>
                  <Text style={styles.infoSubvalue}>
                    Contact: {order.address_details.contact_person} - {order.address_details.contact_phone}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Delivery Method Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('method')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Truck width={20} height={20} color="#374151" />
              <Text style={styles.sectionTitle}>Select Delivery Method</Text>
            </View>
            {expandedSections.has('method') ? (
              <ChevronUp width={20} height={20} color="#9CA3AF" />
            ) : (
              <ChevronDown width={20} height={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {expandedSections.has('method') && (
            <View style={styles.sectionContent}>
              {/* Method Selection */}
              <View style={styles.methodList}>
                {deliveryMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodCard,
                      selectedMethod === method.id && styles.methodCardSelected
                    ]}
                    onPress={() => setSelectedMethod(method.id)}
                  >
                    <View style={styles.methodHeader}>
                      <View style={styles.methodIcon}>
                        {method.icon}
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        <Text style={styles.methodCost}>
                          {method.cost > 0 ? formatCurrency(method.cost) : 'FREE'}
                        </Text>
                      </View>
                      <View style={styles.methodRadio}>
                        {selectedMethod === method.id ? (
                          <CircleCheckIcon width={20} height={20} color="#2563EB" />
                        ) : (
                          <CircleIcon width={20} height={20} color="#D1D5DB" />
                        )}
                      </View>
                    </View>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                    <View style={styles.methodTimeline}>
                      <Clock width={12} height={12} color="#9CA3AF" />
                      <Text style={styles.methodTimelineText}>{method.estimated_days}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rider Selection for Choose Rider Method */}
              {selectedMethod === "choose_rider" && (
                <View style={styles.riderSection}>
                  <Text style={styles.riderSectionTitle}>Select Rider</Text>
                  <Text style={styles.riderSectionSubtitle}>
                    {selectedRider 
                      ? 'Tap to change your rider selection' 
                      : 'Choose a rider for delivery'}
                  </Text>

                  {/* Selected Rider Preview */}
                  {selectedRiderData && (
                    <TouchableOpacity
                      style={styles.selectedRiderCard}
                      onPress={() => setShowRiderModal(true)}
                    >
                      <View style={styles.selectedRiderHeader}>
                        <View style={styles.riderAvatar}>
                          <Text style={styles.riderInitials}>
                            {selectedRiderData.user.first_name[0]}
                            {selectedRiderData.user.last_name[0]}
                          </Text>
                        </View>
                        <View style={styles.selectedRiderInfo}>
                          <Text style={styles.selectedRiderName}>
                            {selectedRiderData.user.first_name} {selectedRiderData.user.last_name}
                          </Text>
                          <View style={styles.selectedRiderStats}>
                            <Star width={12} height={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.riderStatText}>{selectedRiderData.rating}</Text>
                            <Text style={styles.riderStatDivider}>•</Text>
                            <Text style={styles.riderStatText}>
                              {selectedRiderData.total_deliveries} deliveries
                            </Text>
                          </View>
                        </View>
                        <Badge text="Selected" color="#2563EB" />
                      </View>
                      <View style={styles.selectedRiderDetails}>
                        <View style={styles.riderDetailItem}>
                          {getVehicleIcon(selectedRiderData.vehicle_type)}
                          <Text style={styles.riderDetailText}>
                            {selectedRiderData.vehicle_type} • {selectedRiderData.vehicle_brand}
                          </Text>
                        </View>
                        <View style={styles.riderDetailItem}>
                          <Tag width={12} height={12} color="#6B7280" />
                          <Text style={styles.riderDetailText}>
                            Base Fee: {formatCurrency(selectedRiderData.base_fee)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Select Rider Button */}
                  <TouchableOpacity
                    style={styles.selectRiderButton}
                    onPress={() => setShowRiderModal(true)}
                  >
                    <Text style={styles.selectRiderButtonText}>
                      {selectedRider ? 'Change Rider' : 'Select a Rider'}
                    </Text>
                    <ChevronDown width={16} height={16} color="#6B7280" />
                  </TouchableOpacity>

                  {/* Offer Configuration */}
                  {selectedRiderData && (
                    <View style={styles.offerSection}>
                      <View style={styles.offerHeader}>
                        <Tag width={16} height={16} color="#374151" />
                        <Text style={styles.offerTitle}>Make Delivery Offer</Text>
                      </View>

                      {/* Offer Type */}
                      <View style={styles.offerTypeContainer}>
                        <Text style={styles.offerTypeLabel}>Offer Type</Text>
                        <View style={styles.offerTypeButtons}>
                          <TouchableOpacity
                            style={[
                              styles.offerTypeButton,
                              offerType === 'base_fee' && styles.offerTypeButtonActive
                            ]}
                            onPress={() => setOfferType('base_fee')}
                          >
                            <Text style={[
                              styles.offerTypeButtonText,
                              offerType === 'base_fee' && styles.offerTypeButtonTextActive
                            ]}>
                              Base Fee ({formatCurrency(selectedRiderData.base_fee)})
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.offerTypeButton,
                              offerType === 'custom' && styles.offerTypeButtonActive,
                              !selectedRiderData.accepts_custom_offers && styles.offerTypeButtonDisabled
                            ]}
                            onPress={() => selectedRiderData.accepts_custom_offers && setOfferType('custom')}
                            disabled={!selectedRiderData.accepts_custom_offers}
                          >
                            <Text style={[
                              styles.offerTypeButtonText,
                              offerType === 'custom' && styles.offerTypeButtonTextActive,
                              !selectedRiderData.accepts_custom_offers && styles.offerTypeButtonTextDisabled
                            ]}>
                              Custom Offer
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Custom Offer Input */}
                      {offerType === 'custom' && (
                        <View style={styles.customOfferContainer}>
                          <View style={styles.offerAmountHeader}>
                            <Text style={styles.offerAmountLabel}>Offer Amount</Text>
                            <Text style={styles.offerAmountValue}>
                              {formatCurrency(offerAmount)}
                            </Text>
                          </View>

                          <View style={styles.sliderContainer}>
                            <View style={styles.sliderTrack}>
                              <View 
                                style={[
                                  styles.sliderFill,
                                  { width: `${((offerAmount - 50) / 450) * 100}%` }
                                ]} 
                              />
                            </View>
                            <View style={styles.sliderValues}>
                              <Text style={styles.sliderMin}>₱50</Text>
                              <Text style={styles.sliderBase}>Base: {formatCurrency(selectedRiderData.base_fee)}</Text>
                              <Text style={styles.sliderMax}>₱500</Text>
                            </View>
                          </View>

                          <View style={styles.offerPresets}>
                            <TouchableOpacity
                              style={styles.offerPreset}
                              onPress={() => setOfferAmount(selectedRiderData.base_fee)}
                            >
                              <Text style={styles.offerPresetText}>Base Fee</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.offerPreset}
                              onPress={() => setOfferAmount(calculateFairOffer(selectedRiderData.base_fee))}
                            >
                              <Text style={styles.offerPresetText}>Fair Offer</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.offerGuidelines}>
                            <Info width={14} height={14} color="#D97706" />
                            <Text style={styles.offerGuidelinesText}>
                              Fair offer: {formatCurrency(calculateFairOffer(selectedRiderData.base_fee))}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Base Fee Display */}
                      {offerType === 'base_fee' && (
                        <View style={styles.baseFeeCard}>
                          <View>
                            <Text style={styles.baseFeeTitle}>Using Rider's Base Fee</Text>
                            <Text style={styles.baseFeeSubtitle}>
                              {selectedRiderData.accepts_custom_offers 
                                ? 'Accepts custom offers' 
                                : 'Fixed fee only'}
                            </Text>
                          </View>
                          <Badge text={formatCurrency(selectedRiderData.base_fee)} color="#6B7280" />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Additional Notes */}
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Any special instructions or notes for the rider..."
                      value={deliveryNotes}
                      onChangeText={setDeliveryNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Method Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Method Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Selected Method</Text>
                <Text style={styles.detailValue}>
                  {selectedMethodData?.name}
                </Text>
              </View>

              {selectedMethod === "choose_rider" && selectedRiderData && (
                <>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Selected Rider</Text>
                    <Text style={styles.detailValue}>
                      {selectedRiderData.user.first_name} {selectedRiderData.user.last_name}
                    </Text>
                    <Text style={styles.detailSubvalue}>
                      {selectedRiderData.vehicle_type} • {selectedRiderData.rating} ⭐
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Your Offer</Text>
                    <Text style={styles.detailOfferValue}>
                      {formatCurrency(offerAmount)}
                    </Text>
                    <Text style={styles.detailSubvalue}>
                      {offerType === 'base_fee' ? "Rider's base fee" : 'Custom offer'}
                      {offerAmount < selectedRiderData.base_fee && ' • Below base fee'}
                      {offerAmount > selectedRiderData.base_fee && ' • Above base fee'}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Timeline</Text>
                <Text style={styles.detailValue}>
                  {selectedMethodData?.estimated_days}
                </Text>
              </View>
            </View>
          </View>

          {/* Agreement Section */}
          <View style={styles.agreementSection}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
            >
              <View style={[styles.checkboxBox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Check width={12} height={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to proceed with the selected delivery method
              </Text>
            </TouchableOpacity>

            <View style={styles.termsList}>
              {selectedMethod === "seller_delivery" ? (
                <>
                  <Text style={styles.termItem}>• I am responsible for delivering the item</Text>
                  <Text style={styles.termItem}>• I will coordinate directly with the buyer</Text>
                  <Text style={styles.termItem}>• No delivery fee will be charged</Text>
                </>
              ) : (
                <>
                  <Text style={styles.termItem}>• My offer of {formatCurrency(offerAmount)} will be sent to the rider</Text>
                  <Text style={styles.termItem}>• Rider has 24 hours to accept/decline</Text>
                  <Text style={styles.termItem}>• If declined, I can choose another rider</Text>
                  <Text style={styles.termItem}>• Final delivery fee charged to buyer</Text>
                  <Text style={styles.termItem}>• Item must be properly packaged</Text>
                </>
              )}
            </View>
          </View>

          {/* Delivery Summary */}
          <View style={styles.deliverySummaryCard}>
            <View style={styles.summaryHeader}>
              <Sparkles width={16} height={16} color="#374151" />
              <Text style={styles.summaryTitle}>Delivery Summary</Text>
            </View>
            <View style={styles.summaryMethods}>
              <View style={[styles.summaryMethod, selectedMethod === "seller_delivery" && styles.summaryMethodSelected]}>
                <Truck width={12} height={12} color="#6B7280" />
                <Text style={styles.summaryMethodText}>Seller Delivery</Text>
                <Text style={styles.summaryMethodDetail}>• You handle transportation • No extra fees • Direct buyer contact</Text>
              </View>
              <View style={[styles.summaryMethod, selectedMethod === "choose_rider" && styles.summaryMethodSelected]}>
                <Handshake width={12} height={12} color="#6B7280" />
                <Text style={styles.summaryMethodText}>Choose a Rider</Text>
                <Text style={styles.summaryMethodDetail}>• Make delivery offer (min ₱50) • Rider reviews offer • See ratings & reviews</Text>
              </View>
            </View>
          </View>

          {/* Offer Guidelines */}
          {selectedMethod === "choose_rider" && (
            <View style={styles.guidelinesCard}>
              <View style={styles.guidelinesHeader}>
                <Calculator width={16} height={16} color="#374151" />
                <Text style={styles.guidelinesTitle}>Offer Guidelines</Text>
              </View>
              
              <View style={styles.guidelinesContent}>
                <View style={[styles.guidelineItem, styles.guidelineFair]}>
                  <Text style={[styles.guidelineItemTitle, styles.guidelineFairTitle]}>Fair Offers</Text>
                  <Text style={[styles.guidelineItemText, styles.guidelineFairText]}>
                    • Base fee: Rider's starting price{"\n"}
                    • Fair offer: Base + weight/distance{"\n"}
                    • Higher offers = faster acceptance
                  </Text>
                </View>

                <View style={[styles.guidelineItem, styles.guidelineLow]}>
                  <Text style={[styles.guidelineItemTitle, styles.guidelineLowTitle]}>Low Offers</Text>
                  <Text style={[styles.guidelineItemText, styles.guidelineLowText]}>
                    • Below base fee may be declined{"\n"}
                    • Minimum offer: ₱50{"\n"}
                    • Consider item value & distance
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
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
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Processing...</Text>
                </>
              ) : selectedMethod === "choose_rider" ? (
                <>
                  <Send width={16} height={16} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    Send Offer ({formatCurrency(offerAmount)})
                  </Text>
                </>
              ) : (
                <Text style={styles.submitButtonText}>Confirm Shipment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Shield width={16} height={16} color="#6B7280" />
            <Text style={styles.footerText}>
              All riders are verified and insured. Offers are binding for 24 hours.
            </Text>
          </View>
        </ScrollView>

        {/* Rider Selection Modal */}
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
                  <X width={24} height={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={riders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item: rider }) => {
                  const offerRange = getSuggestedOfferRange(rider);
                  return (
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
                      <View style={styles.modalRiderHeader}>
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
                            <Star width={12} height={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.modalRiderRatingText}>{rider.rating}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.modalRiderDetails}>
                        <View style={styles.modalRiderDetail}>
                          {getVehicleIcon(rider.vehicle_type)}
                          <Text style={styles.modalRiderDetailText}>
                            {rider.vehicle_type} • {rider.vehicle_brand} {rider.vehicle_model}
                          </Text>
                        </View>
                        <View style={styles.modalRiderDetail}>
                          <MapPin width={12} height={12} color="#6B7280" />
                          <Text style={styles.modalRiderDetailText}>{rider.current_location}</Text>
                        </View>
                        <View style={styles.modalRiderStats}>
                          <Text style={styles.modalRiderStat}>{rider.total_deliveries} deliveries</Text>
                          <Text style={styles.modalRiderStatDivider}>•</Text>
                          <Text style={styles.modalRiderStat}>{rider.delivery_success_rate}% success</Text>
                        </View>
                      </View>

                      <View style={styles.modalRiderFooter}>
                        <View style={styles.modalRiderFee}>
                          <Text style={styles.modalRiderFeeLabel}>Base Fee:</Text>
                          <Text style={styles.modalRiderFeeValue}>{formatCurrency(rider.base_fee)}</Text>
                        </View>
                        {rider.verified && (
                          <View style={styles.verifiedBadge}>
                            <ShieldCheck width={12} height={12} color="#059669" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                          </View>
                        )}
                      </View>

                      {!rider.accepts_custom_offers && (
                        <View style={styles.fixedFeeBadge}>
                          <Info width={12} height={12} color="#D97706" />
                          <Text style={styles.fixedFeeText}>Fixed fee only</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </CustomerLayout>
    </SafeAreaView>
  );
}

// Badge Component
const Badge = ({ text, color }: { text: string; color: string }) => (
  <View style={[styles.badge, { borderColor: color }]}>
    <Text style={[styles.badgeText, { color }]}>{text}</Text>
  </View>
);

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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
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
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // Order Items
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  itemQuantity: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemWeight: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },

  // Info Grid
  infoGrid: {
    gap: 8,
    marginTop: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  fullWidthCard: {
    width: '100%',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  infoSubvalue: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Method Selection
  methodList: {
    gap: 12,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  methodCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  methodCost: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  methodRadio: {
    marginLeft: 8,
  },
  methodDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  methodTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  methodTimelineText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Rider Section
  riderSection: {
    marginTop: 16,
  },
  riderSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  riderSectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },

  // Selected Rider
  selectedRiderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedRiderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  selectedRiderInfo: {
    flex: 1,
  },
  selectedRiderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectedRiderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderStatText: {
    fontSize: 11,
    color: '#6B7280',
  },
  riderStatDivider: {
    fontSize: 11,
    color: '#D1D5DB',
  },
  selectedRiderDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  riderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Select Rider Button
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
  selectRiderButtonText: {
    fontSize: 14,
    color: '#374151',
  },

  // Offer Section
  offerSection: {
    marginTop: 16,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  offerTypeContainer: {
    marginBottom: 16,
  },
  offerTypeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  offerTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  offerTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  offerTypeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  offerTypeButtonDisabled: {
    opacity: 0.5,
  },
  offerTypeButtonText: {
    fontSize: 11,
    color: '#374151',
  },
  offerTypeButtonTextActive: {
    color: '#2563EB',
    fontWeight: '500',
  },
  offerTypeButtonTextDisabled: {
    color: '#9CA3AF',
  },

  // Custom Offer
  customOfferContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  offerAmountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerAmountLabel: {
    fontSize: 13,
    color: '#374151',
  },
  offerAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMin: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  sliderBase: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '500',
  },
  sliderMax: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  offerPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  offerGuidelines: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
  },
  offerGuidelinesText: {
    flex: 1,
    fontSize: 11,
    color: '#D97706',
  },

  // Base Fee Card
  baseFeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  baseFeeTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  baseFeeSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Notes Section
  notesSection: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
  },

  // Details Section
  detailsSection: {
    marginTop: 12,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  detailOfferValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  detailSubvalue: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  // Agreement Section
  agreementSection: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  termsList: {
    paddingLeft: 30,
  },
  termItem: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },

  // Delivery Summary
  deliverySummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryMethods: {
    gap: 8,
  },
  summaryMethod: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  summaryMethodSelected: {
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  summaryMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  summaryMethodDetail: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Guidelines
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  guidelinesContent: {
    gap: 8,
  },
  guidelineItem: {
    padding: 12,
    borderRadius: 6,
  },
  guidelineFair: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  guidelineFairTitle: {
    color: '#059669',
  },
  guidelineFairText: {
    color: '#065F46',
  },
  guidelineLow: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guidelineLowTitle: {
    color: '#D97706',
  },
  guidelineLowText: {
    color: '#92400E',
  },
  guidelineItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  guidelineItemText: {
    fontSize: 11,
    lineHeight: 16,
  },

  // Action Buttons
  actionButtons: {
    marginTop: 20,
    gap: 10,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },

  // Badge
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
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
    fontSize: 18,
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
    padding: 16,
    marginBottom: 12,
  },
  modalRiderCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  modalRiderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalRiderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalRiderInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalRiderInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRiderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalRiderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  modalRiderRatingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  modalRiderDetails: {
    gap: 6,
    marginBottom: 12,
  },
  modalRiderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalRiderDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalRiderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalRiderStat: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalRiderStatDivider: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  modalRiderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRiderFee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalRiderFeeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalRiderFeeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  fixedFeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fixedFeeText: {
    fontSize: 11,
    color: '#D97706',
  },
});