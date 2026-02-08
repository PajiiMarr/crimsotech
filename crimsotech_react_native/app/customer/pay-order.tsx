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
// Use legacy FileSystem API to keep using getInfoAsync (avoids deprecation error on Expo v54)
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

// Types
interface OrderDetails {
  order_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  payment_qr_code?: string; // Add this field for backend QR code
}

export default function PayOrderPage() {
  const { userId, userRole } = useAuth();
  const params = useLocalSearchParams();
  const orderId = params.order_id as string;
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setError("No order ID provided");
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await AxiosInstance.get(`/checkout-order/get_order_details/${orderId}/`);
      if (response.data.success) {
        setOrderDetails(response.data.order);
        setPaymentStatus(response.data.order.status === 'paid' ? 'paid' : 'pending');
      } else {
        setError(response.data.error || "Failed to load order details");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error fetching order details");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = () => {
    if (!orderDetails) return 'credit-card';
    switch(orderDetails.payment_method) {
      case 'GCash': return 'mobile-alt';
      case 'Maya': return 'credit-card';
      default: return 'wallet';
    }
  };

  const getQRCodeImage = () => {
    if (!orderDetails) return null;
    
    // Option 1: Check if backend provides QR code URL
    if (orderDetails.payment_qr_code) {
      return orderDetails.payment_qr_code;
    }
    
    // Option 2: Use your local assets (requires adding images to your mobile app)
    // Make sure to add these images to your assets folder
    switch(orderDetails.payment_method) {
      case 'GCash': 
        // For Expo, you would typically use require() for local images
        // return require('../../assets/gcash-qr.png');
        // For now, using a placeholder or backend should provide this
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCashPayment:' + orderId;
      case 'Maya': 
        // return require('../../assets/maya-qr.png');
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MayaPayment:' + orderId;
      default: return null;
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
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
        setShowReceiptModal(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
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
        
        // Check file size
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
        setShowReceiptModal(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleFilePick = () => {
    setShowReceiptModal(true);
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
      
      // Create file object
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
        handlePaymentComplete();
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
              onPress: async () => {
                try {
                  await router.replace('/customer/purchases');
                } catch (e) {
                  console.warn('Navigation to /customer/purchases failed, falling back to /customer/orders', e);
                  router.push('/customer/orders');
                }
              }
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
      'Are you sure you want to skip payment? You can upload your receipt later.',
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
  const formattedDate = new Date(orderDetails.created_at).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Complete Your Payment</Text>
            </View>
          </View>
        </View>

        {/* Success Message */}
        {paymentStatus === 'paid' && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={32} color="#059669" />
            </View>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Payment Confirmed!</Text>
              <Text style={styles.successText}>Your payment has been verified</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              {qrCodeImage ? (
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
              ) : (
                <View style={styles.noQrContainer}>
                  <MaterialIcons name="credit-card" size={60} color="#D1D5DB" />
                  <Text style={styles.noQrText}>
                    QR Code not available for {orderDetails.payment_method}
                  </Text>
                  <Text style={styles.noQrSubtext}>
                    Please proceed with manual payment and upload receipt
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
                  <MaterialIcons name="receipt" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Order ID</Text>
                  <Text style={styles.detailValue}>{orderDetails.order_id}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="paid" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>₱{orderDetails.total_amount.toFixed(2)}</Text>
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
                  <MaterialIcons name="payment" size={20} color="#EA580C" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>{orderDetails.payment_method}</Text>
                </View>
              </View>
            </View>

            {/* Upload Receipt */}
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
                onPress={handleFilePick}
                disabled={paymentStatus === 'paid' || uploadingReceipt}
              >
                {receiptFile ? (
                  <View style={styles.receiptPreview}>
                    <Image 
                      source={{ uri: receiptFile.uri }}
                      style={styles.receiptImage}
                      resizeMode="cover"
                    />
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptFileName} numberOfLines={1}>
                        {receiptFile.name}
                      </Text>
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
              
              {receiptFile && !uploadingReceipt && paymentStatus === 'pending' && (
                <TouchableOpacity 
                  style={styles.confirmUploadButton}
                  onPress={uploadReceipt}
                >
                  <Text style={styles.confirmUploadText}>Confirm Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Total Amount */}
            <View style={styles.totalCard}>
              <View style={styles.totalContent}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalSubLabel}>Including all charges</Text>
                </View>
                <Text style={styles.totalAmount}>₱{orderDetails.total_amount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {paymentStatus === 'pending' ? (
                <>
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
                  
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={handleSkipPayment}
                    disabled={uploadingReceipt}
                  >
                    <Text style={styles.skipButtonText}>Skip Payment for Now</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.viewOrderButton}
                  onPress={async () => {
                    try {
                      await router.replace('/customer/purchases');
                    } catch (e) {
                      console.warn('Navigation to /customer/purchases failed, falling back to /customer/orders', e);
                      router.push('/customer/orders');
                    }
                  }}
                >
                  <MaterialIcons name="visibility" size={20} color="#FFFFFF" />
                  <Text style={styles.viewOrderText}>View Order Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Receipt Modal */}
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
                  <Text style={styles.requirementText}>Transaction ID</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.requirementText}>Amount Paid</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.requirementText}>Date & Time</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerRight: {
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
  receiptPreview: {
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
    alignItems: 'center',
  },
  receiptFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    maxWidth: 200,
  },
  confirmUploadButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmUploadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});