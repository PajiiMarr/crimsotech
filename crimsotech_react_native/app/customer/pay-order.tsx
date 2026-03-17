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
  TextInput,
  Alert,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  MaterialIcons,
  FontAwesome5,
  FontAwesome,
  Ionicons,
  Feather,
  AntDesign,
  Entypo
} from '@expo/vector-icons';

// Types - Updated to match web version
interface OrderDetails {
  order_id: string;
  status: string;
  approval: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  shipping_address?: {
    recipient_name: string;
    recipient_phone: string;
    full_address: string;
    address_type: string;
  };
}

interface MayaPaymentResponse {
  success: boolean;
  message: string;
  order_id: string;
  maya_checkout_id: string;
  redirect_url: string;
  reference_number: string;
  total_amount: number;
  items: any[];
  sandbox_mode: boolean;
  test_card?: {
    message: string;
    card_number: string;
    expiry: string;
    cvv: string;
    otp: string;
  };
}

// Environment variable for sandbox mode
const ENABLE_SANDBOX = true; // Set to false in production

export default function PayOrderPage() {
  const { userId } = useAuth();
  const params = useLocalSearchParams();
  const orderId = params.order_id as string;
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [mayaPayment, setMayaPayment] = useState<MayaPaymentResponse | null>(null);
  const [processingMaya, setProcessingMaya] = useState(false);
  const [showTestCardModal, setShowTestCardModal] = useState(false);

  useEffect(() => {
    console.log('PayOrderPage mounted with orderId:', orderId);
    console.log('User ID:', userId);
    
    if (orderId) {
      fetchOrderDetails();
    } else {
      setError("No order ID provided");
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log('Fetching order details for ID:', orderId);
      
      const response = await AxiosInstance.get(`/checkout-order/get_order_details/${orderId}/`);
      
      console.log('Order details response:', JSON.stringify(response.data, null, 2));
      
      // Check if the response has the order data (web version returns the order object directly)
      if (response.data && response.data.order_id) {
        // The backend returns the order object directly (like in web version)
        setOrderDetails(response.data);
        setPaymentStatus(response.data.status === 'paid' || response.data.status === 'completed' ? 'paid' : 'pending');
      } else if (response.data.success && response.data.order) {
        // Alternative structure if wrapped
        setOrderDetails(response.data.order);
        setPaymentStatus(response.data.order.status === 'paid' || response.data.order.status === 'completed' ? 'paid' : 'pending');
      } else {
        setError(response.data.error || "Failed to load order details");
      }
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = "Error fetching order details";
      if (err.response?.status === 404) {
        errorMessage = "Order not found";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (): any => {
    if (!orderDetails) return 'credit-card';
    switch(orderDetails.payment_method) {
      case 'GCash': return 'mobile-alt';
      case 'Maya': return 'credit-card';
      default: return 'money-bill';
    }
  };

  const getQRCodeImage = () => {
    if (!orderDetails) return null;
    
    // In sandbox mode for Maya, don't show QR code
    if (ENABLE_SANDBOX && orderDetails.payment_method === 'Maya') {
      return null;
    }
    
    switch(orderDetails.payment_method) {
      case 'GCash': 
        return 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GCashPayment:' + orderId;
      case 'Maya': 
        return 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MayaPayment:' + orderId;
      default: return null;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload receipts.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Check file size (max 5MB)
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && fileInfo.size) {
          const fileSizeMB = fileInfo.size / (1024 * 1024);
          if (fileSizeMB > 5) {
            Alert.alert('File too large', 'Please select an image smaller than 5MB.');
            return;
          }
        }

        setReceiptFile({
          uri: asset.uri,
          name: `receipt_${orderId}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        });
        setReceiptPreview(asset.uri);
        setShowReceiptModal(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && fileInfo.size) {
          const fileSizeMB = fileInfo.size / (1024 * 1024);
          if (fileSizeMB > 5) {
            Alert.alert('File too large', 'Please take a photo with smaller size.');
            return;
          }
        }

        setReceiptFile({
          uri: asset.uri,
          name: `receipt_${orderId}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        });
        setReceiptPreview(asset.uri);
        setShowReceiptModal(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadReceipt = async () => {
    if (!receiptFile) {
      setError("Please select a receipt file first.");
      return;
    }

    try {
      setUploadingReceipt(true);
      
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('user_id', userId || '');
      
      formData.append('receipt', {
        uri: receiptFile.uri,
        name: receiptFile.name,
        type: receiptFile.type
      } as any);

      const response = await AxiosInstance.post('/checkout-order/add_receipt/', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        Alert.alert(
          'Receipt Uploaded',
          'Your receipt has been uploaded successfully. Please wait for confirmation.',
          [
            {
              text: 'OK',
              onPress: () => router.push(`/customer/order-successful/${orderId}` as any)
            }
          ]
        );
      } else {
        setError(response.data.error || "Failed to upload receipt");
        Alert.alert('Error', response.data.error || "Failed to upload receipt");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Error uploading receipt";
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleMayaPayment = async () => {
    if (!orderDetails || !userId) return;
    
    try {
      setProcessingMaya(true);
      setError(null);

      console.log("Initiating Maya payment for order:", orderId);
      console.log("User ID:", userId);

      const response = await AxiosInstance.post('/checkout-order/initiate_maya_payment/', {
        order_id: orderId,
        user_id: userId
      });
      
      console.log('Maya payment response:', response.data);
      
      if (response.data.success) {
        setMayaPayment(response.data);
        
        // If in sandbox mode and test card info is provided, show it
        if (response.data.sandbox_mode && response.data.test_card) {
          setShowTestCardModal(true);
        }
        
        // Open the redirect URL in browser
        if (response.data.redirect_url) {
          const supported = await Linking.canOpenURL(response.data.redirect_url);
          if (supported) {
            await Linking.openURL(response.data.redirect_url);
          } else {
            Alert.alert('Error', 'Cannot open payment page');
          }
        }
      } else {
        setError(response.data.error || "Failed to initiate Maya payment");
        Alert.alert('Error', response.data.error || "Failed to initiate Maya payment");
      }
    } catch (err: any) {
      console.error('Maya payment error:', err);
      const errorMsg = err.response?.data?.error || "Error initiating Maya payment";
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setProcessingMaya(false);
    }
  };

  const handlePaymentComplete = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.post('/checkout-order/confirm_payment/', {
        order_id: orderId,
        user_id: userId
      });
      if (response.data.success) {
        setPaymentStatus('paid');
        Alert.alert(
          'Payment Confirmed!',
          'Your payment has been successfully confirmed.',
          [
            {
              text: 'View Order',
              onPress: () => router.push(`/customer/order-successful/${orderId}` as any)
            }
          ]
        );
      } else {
        setError(response.data.error || "Failed to confirm payment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error confirming payment");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPayment = () => {
    Alert.alert(
      'Skip Payment',
      'Are you sure you want to skip payment? You can upload your receipt later from your orders.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip',
          onPress: () => router.push(`/customer/order-successful/${orderId}` as any)
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading Payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !orderDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={80} color="#DC2626" />
          <Text style={styles.errorTitle}>{error || "Order Not Found"}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/customer/orders')}
          >
            <Text style={styles.backButtonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const PaymentIcon = getPaymentMethodIcon();
  const qrCodeImage = getQRCodeImage();
  const formattedDate = formatDate(orderDetails.created_at);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.paymentIconContainer}>
              {PaymentIcon === 'mobile-alt' ? (
                <FontAwesome5 name={PaymentIcon} size={24} color="#FFFFFF" />
              ) : (
                <FontAwesome name={PaymentIcon} size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Complete Your Payment</Text>
              <Text style={styles.headerSubtitle}>Order #{orderDetails.order_id.slice(0, 8)}</Text>
            </View>
          </View>
          
          <View style={styles.headerAmountContainer}>
            <Text style={styles.headerAmount}>₱{parseFloat(orderDetails.total_amount).toFixed(2)}</Text>
            <Text style={styles.headerAmountLabel}>Total</Text>
          </View>
        </View>

        {/* Sandbox Mode Badge */}
        {ENABLE_SANDBOX && (
          <View style={styles.sandboxBadge}>
            <MaterialIcons name="security" size={16} color="#FFFFFF" />
            <Text style={styles.sandboxBadgeText}>Sandbox Mode Active</Text>
          </View>
        )}

        {/* Success Message */}
        {paymentStatus === 'paid' && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={32} color="#059669" />
            </View>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Payment Confirmed!</Text>
              <Text style={styles.successText}>Your order is being processed</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              {qrCodeImage && !(ENABLE_SANDBOX && orderDetails.payment_method === 'Maya') ? (
                <>
                  <Image 
                    source={{ uri: qrCodeImage }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <View style={styles.qrPaymentInfo}>
                    <View style={styles.paymentMethodBadge}>
                      {PaymentIcon === 'mobile-alt' ? (
                        <FontAwesome5 name={PaymentIcon} size={16} color="#EA580C" />
                      ) : (
                        <FontAwesome name={PaymentIcon} size={16} color="#EA580C" />
                      )}
                      <Text style={styles.paymentMethodName}>{orderDetails.payment_method}</Text>
                    </View>
                    <Text style={styles.qrInstruction}>
                      Scan this QR code with your {orderDetails.payment_method} app
                    </Text>
                  </View>
                </>
              ) : ENABLE_SANDBOX && orderDetails.payment_method === 'Maya' ? (
                <View style={styles.sandboxQRContainer}>
                  <View style={styles.sandboxIconContainer}>
                    <FontAwesome name="credit-card" size={60} color="#FFFFFF" />
                  </View>
                  <Text style={styles.sandboxTitle}>Sandbox Mode</Text>
                  <Text style={styles.sandboxDescription}>
                    You're testing Maya payments. Click the sandbox button to proceed.
                  </Text>
                </View>
              ) : (
                <View style={styles.noQrContainer}>
                  <MaterialIcons name="credit-card" size={60} color="#D1D5DB" />
                  <Text style={styles.noQrText}>
                    Please complete your payment via {orderDetails.payment_method}
                  </Text>
                  <Text style={styles.noQrSubtext}>
                    Instructions will be provided by the seller
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Payment Details</Text>
            
            {/* Order Info */}
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="payment" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>{orderDetails.payment_method}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="receipt" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Order ID</Text>
                  <Text style={styles.detailValue}>{orderDetails.order_id}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="date-range" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Order Date</Text>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="local-shipping" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Delivery Method</Text>
                  <Text style={styles.detailValue}>{orderDetails.delivery_method}</Text>
                </View>
              </View>

              {orderDetails.delivery_address && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <MaterialIcons name="location-on" size={20} color="#EA580C" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Delivery Address</Text>
                    <Text style={styles.detailValue}>{orderDetails.delivery_address}</Text>
                  </View>
                </View>
              )}

              {orderDetails.shipping_address && (
                <View style={styles.addressDetail}>
                  <Text style={styles.detailLabel}>Shipping Details</Text>
                  <Text style={styles.addressName}>{orderDetails.shipping_address.recipient_name}</Text>
                  <Text style={styles.addressPhone}>{orderDetails.shipping_address.recipient_phone}</Text>
                  <Text style={styles.addressFull}>{orderDetails.shipping_address.full_address}</Text>
                </View>
              )}
            </View>

            {/* Upload Receipt - Hide for sandbox Maya payments */}
            {!(ENABLE_SANDBOX && orderDetails.payment_method === 'Maya') && (
              <View style={styles.uploadCard}>
                <View style={styles.uploadHeader}>
                  <View style={styles.uploadIcon}>
                    <MaterialIcons name="cloud-upload" size={24} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.uploadTitle}>Upload Payment Receipt</Text>
                    <Text style={styles.uploadSubtitle}>
                      Upload a screenshot or photo of your payment confirmation
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => setShowReceiptModal(true)}
                  disabled={paymentStatus === 'paid' || uploadingReceipt}
                >
                  {receiptPreview ? (
                    <View style={styles.receiptPreviewContainer}>
                      <Image 
                        source={{ uri: receiptPreview }}
                        style={styles.receiptImage}
                        resizeMode="cover"
                      />
                      <View style={styles.receiptInfo}>
                        <Text style={styles.receiptFileName} numberOfLines={1}>
                          {receiptFile?.name}
                        </Text>
                        <TouchableOpacity onPress={removeReceipt}>
                          <MaterialIcons name="close" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <MaterialIcons name="upload" size={40} color="#3B82F6" />
                      <Text style={styles.uploadButtonText}>
                        {paymentStatus === 'paid' ? 'Receipt Uploaded' : 'Choose File'}
                      </Text>
                      <Text style={styles.uploadFormat}>
                        JPG, PNG (max 5MB)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Total Amount */}
            <View style={styles.totalCard}>
              <View style={styles.totalContent}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalSubLabel}>Including all charges</Text>
                </View>
                <Text style={styles.totalAmount}>₱{parseFloat(orderDetails.total_amount).toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {paymentStatus === 'pending' ? (
                <>
                  {ENABLE_SANDBOX && orderDetails.payment_method === 'Maya' ? (
                    <TouchableOpacity 
                      style={[styles.payButton, styles.mayaButton]}
                      onPress={handleMayaPayment}
                      disabled={processingMaya}
                    >
                      {processingMaya ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <FontAwesome name="credit-card" size={20} color="#FFFFFF" />
                          <Text style={styles.payButtonText}>
                            Pay with Maya Sandbox
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[
                        styles.payButton,
                        (!receiptFile || uploadingReceipt) && styles.payButtonDisabled
                      ]}
                      onPress={uploadReceipt}
                      disabled={!receiptFile || uploadingReceipt}
                    >
                      {uploadingReceipt ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.payButtonText}>
                            Confirm Payment with {orderDetails.payment_method}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={handleSkipPayment}
                    disabled={uploadingReceipt || processingMaya}
                  >
                    <Text style={styles.skipButtonText}>Skip Payment for Now</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.viewOrderButton}
                  onPress={() => router.push(`/customer/order-successful/${orderId}` as any)}
                >
                  <MaterialIcons name="visibility" size={20} color="#FFFFFF" />
                  <Text style={styles.viewOrderText}>View Order Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Receipt Selection Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Receipt</Text>
              <TouchableOpacity 
                onPress={() => setShowReceiptModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Please provide proof of payment:
              </Text>
              
              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.requirementText}>Transaction ID / Reference Number</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.requirementText}>Amount Paid</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.requirementText}>Date & Time of Payment</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={takePhoto}
              >
                <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={pickImage}
              >
                <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Test Card Info Modal for Maya Sandbox */}
      <Modal
        visible={showTestCardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTestCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.testCardModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sandbox Test Card</Text>
              <TouchableOpacity 
                onPress={() => setShowTestCardModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.testCardIcon}>
                <FontAwesome name="credit-card" size={48} color="#EA580C" />
              </View>
              
              <Text style={styles.testCardMessage}>
                {mayaPayment?.test_card?.message || 'Use these test card details for sandbox payment:'}
              </Text>
              
              {mayaPayment?.test_card && (
                <View style={styles.testCardDetails}>
                  <View style={styles.testCardRow}>
                    <Text style={styles.testCardLabel}>Card Number:</Text>
                    <Text style={styles.testCardValue}>{mayaPayment.test_card.card_number}</Text>
                  </View>
                  <View style={styles.testCardRow}>
                    <Text style={styles.testCardLabel}>Expiry:</Text>
                    <Text style={styles.testCardValue}>{mayaPayment.test_card.expiry}</Text>
                  </View>
                  <View style={styles.testCardRow}>
                    <Text style={styles.testCardLabel}>CVV:</Text>
                    <Text style={styles.testCardValue}>{mayaPayment.test_card.cvv}</Text>
                  </View>
                  <View style={styles.testCardRow}>
                    <Text style={styles.testCardLabel}>OTP:</Text>
                    <Text style={styles.testCardValue}>{mayaPayment.test_card.otp}</Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.testCardButton}
                onPress={() => setShowTestCardModal(false)}
              >
                <Text style={styles.testCardButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
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
    backgroundColor: '#EA580C',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonHeader: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerAmountContainer: {
    alignItems: 'flex-end',
  },
  headerAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerAmountLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  sandboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  sandboxBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successIcon: {
    marginRight: 12,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  successText: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  qrSection: {
    marginBottom: 16,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
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
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  qrPaymentInfo: {
    alignItems: 'center',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    gap: 6,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
  },
  qrInstruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  sandboxQRContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sandboxIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sandboxTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  sandboxDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 250,
  },
  noQrContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noQrText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
  },
  noQrSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addressDetail: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginTop: 8,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  addressFull: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
    lineHeight: 18,
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 12,
  },
  uploadFormat: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  receiptPreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  receiptImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  receiptFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  totalCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EA580C',
  },
  actionButtons: {
    gap: 12,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  mayaButton: {
    backgroundColor: '#3B82F6',
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  viewOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  testCardModal: {
    maxHeight: '70%',
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
    paddingVertical: 24,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  requirementsList: {
    gap: 12,
    marginBottom: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requirementText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  testCardIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  testCardMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  testCardDetails: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  testCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  testCardLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  testCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  testCardButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  testCardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});