// app/customer/request-refund.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AxiosInstance from '../../contexts/axios';

const { width, height } = Dimensions.get('window');

// Types - Matching web types
interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  shop_id: string | null;
  shop_name: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks: string;
  purchased_at: string;
  can_review: boolean;
  voucher_applied: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  payment_status: string | null;
  delivery_status: string | null;
  delivery_rider: string | null;
  items: OrderItem[];
  shipping?: {
    method: string;
  };
}

interface RefundType {
  id: 'return_item' | 'keep_item' | 'replacement';
  label: string;
  description: string;
  icon: string;
  refundAmount: 'full' | 'partial' | 'replacement';
}

interface RefundMethod {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: 'wallet' | 'bank' | 'voucher' | 'moneyback' | 'replace';
  allowedRefundTypes: ('return_item' | 'keep_item' | 'replacement')[];
}

interface EWalletDetails {
  provider: string;
  accountName: string;
  accountNumber: string;
  contactNumber: string;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  branch: string;
}

interface RemittanceDetails {
  provider: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  contactNumber: string;
  validIdType: string;
  validIdNumber: string;
}

// Refund types - Matching web
const refundTypes: RefundType[] = [
  {
    id: 'return_item',
    label: 'Return Item',
    description: 'Return the item for a full refund',
    icon: 'refresh',
    refundAmount: 'full'
  },
  {
    id: 'keep_item',
    label: 'Keep Item',
    description: 'Keep the item and request partial refund',
    icon: 'package-variant-closed',
    refundAmount: 'partial'
  },
  {
    id: 'replacement',
    label: 'Replacement',
    description: 'Return item for a replacement',
    icon: 'package-variant',
    refundAmount: 'replacement'
  }
];

// Refund methods - Matching web
const refundMethods: RefundMethod[] = [
  {
    id: 'wallet',
    label: 'Refund to Wallet',
    description: 'Get refund to your e-wallet',
    icon: 'wallet-outline',
    type: 'wallet',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    description: 'Get refund via bank transfer',
    icon: 'credit-card-outline',
    type: 'bank',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'voucher',
    label: 'Store Voucher',
    description: 'Receive a store voucher',
    icon: 'tag-outline',
    type: 'voucher',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'moneyback',
    label: 'Money Back (Remittance)',
    description: 'Get cash via remittance',
    icon: 'cash-multiple',
    type: 'moneyback',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'cash_on_hand',
    label: 'Cash on Hand',
    description: 'Collect cash directly from the seller at pickup',
    icon: 'hand-coin-outline',
    type: 'moneyback',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'replace',
    label: 'Replacement',
    description: 'Get a replacement item',
    icon: 'package-variant-plus',
    type: 'replace',
    allowedRefundTypes: ['replacement']
  }
];

const returnReasons = [
  'Product arrived damaged',
  'Item not delivered / missing',
  'Wrong item received',
  'Item defective or not working',
  'Product not as described',
  'Changed my mind / No longer needed',
  'Wrong size / Doesn\'t fit',
  'Received wrong color',
  'Missing parts or accessories',
  'Other',
];

// Helper Components
const Checkbox = ({ checked, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.checkbox, checked && styles.checkboxChecked]}
  >
    {checked && <Icon name="check" size={16} color="#fff" />}
  </TouchableOpacity>
);

const Badge = ({ children, variant = 'default' }: any) => (
  <View style={[styles.badge, styles[`badge${variant}`]]}>
    <Text style={[styles.badgeText, styles[`badgeText${variant}`]]}>
      {children}
    </Text>
  </View>
);

const ProgressBar = ({ progress }: any) => (
  <View style={styles.progressBarContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
    <View style={styles.progressLabels}>
      <Text style={styles.progressLabelActive}>Select Items</Text>
      <Text style={progress >= 66 ? styles.progressLabelActive : styles.progressLabel}>Choose Method</Text>
      <Text style={progress >= 100 ? styles.progressLabelActive : styles.progressLabel}>Review & Submit</Text>
    </View>
  </View>
);

export default function RequestRefundPage() {
  const { userRole, userId } = useAuth();
  const { orderId, productId } = useLocalSearchParams();
  const router = useRouter();
  const decodedOrderId = orderId ? decodeURIComponent(String(orderId)) : null;
  const decodedProductId = productId ? decodeURIComponent(String(productId)) : null;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedItems, setSelectedItems] = useState<string[]>(decodedProductId ? [decodedProductId] : []);
  const [selectedRefundType, setSelectedRefundType] = useState<RefundType | null>(null);
  const [selectedRefundMethod, setSelectedRefundMethod] = useState<RefundMethod | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  // Payment details
  const [eWalletDetails, setEWalletDetails] = useState<EWalletDetails>({
    provider: '',
    accountName: '',
    accountNumber: '',
    contactNumber: '',
  });

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: '',
    branch: '',
  });

  const [remittanceDetails, setRemittanceDetails] = useState<RemittanceDetails>({
    provider: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    contactNumber: '',
    validIdType: '',
    validIdNumber: '',
  });

  // Image handling
  const [images, setImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Modals
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showRefundTypeModal, setShowRefundTypeModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);

  // Fetch order data
  useEffect(() => {
    fetchOrderData();
  }, [decodedOrderId, userId]);

  // When refund type is partial (keep_item), default the partial amount
  useEffect(() => {
    if (selectedRefundType && selectedRefundType.id === 'keep_item') {
      if (!partialAmount || parseFloat(String(partialAmount)) <= 0) {
        const { maxPartialAmount } = calculateRefundAmounts();
        setPartialAmount((Math.round((maxPartialAmount || 0) * 100) / 100).toFixed(2));
      }
    }
  }, [selectedRefundType]);

  const fetchOrderData = async () => {
    if (!decodedOrderId) {
      setError('No order specified. Please pick an order to refund.');
      setLoading(false);
      return;
    }
    if (!userId) {
      setError('Please login to view this page');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // FIXED: Use the view-order endpoint which has all the detailed data (like web)
      const response = await AxiosInstance.get(`/purchases-buyer/${decodedOrderId}/view-order/`, {
        headers: {
          'X-User-Id': userId,
        },
      });
      
      if (!response?.data) {
        setError('Order information is not available');
        setOrder(null);
        return;
      }

      // Transform the data to match your component's expected format (like web)
      const orderData = response.data;
      
      const transformedOrder = {
        order_id: orderData.order?.id || decodedOrderId,
        status: orderData.order?.status || 'pending',
        total_amount: orderData.order_summary?.total || '0',
        payment_method: orderData.order?.payment_method || '',
        delivery_method: orderData.order?.delivery_method || '',
        delivery_address: orderData.delivery_address?.address || '',
        created_at: orderData.order?.created_at || new Date().toISOString(),
        payment_status: orderData.order?.payment_status || null,
        delivery_status: orderData.order?.delivery_status || null,
        delivery_rider: orderData.order?.delivery_rider || null,
        items: orderData.items || [],
        shipping: {
          method: orderData.shipping_info?.delivery_method || ''
        }
      };

      setOrder(transformedOrder);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      if (err.response?.status === 404) {
        setError('Order not found');
      } else if (err.response?.status === 401) {
        setError('Please login again');
      } else {
        setError(err.response?.data?.error || 'Failed to load order details');
      }
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '₱0.00';
    return `₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    let progress = 0;
    if (selectedItems.length > 0) progress += 33;
    if (selectedRefundType && selectedRefundMethod) progress += 33;
    if (returnReason) progress += 33;
    return Math.min(100, progress);
  };

  const handleItemSelect = (checkoutId: string) => {
    setSelectedItems(prev =>
      prev.includes(checkoutId)
        ? prev.filter(id => id !== checkoutId)
        : [...prev, checkoutId]
    );
  };

  const handleSelectAll = () => {
    if (!order) return;
    
    if (selectedItems.length === order.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(order.items.map(item => item.checkout_id));
    }
  };

  // Get selected items details
  const selectedItemsDetails = order?.items.filter(item => 
    selectedItems.includes(item.checkout_id)
  ) || [];

  const calculateRefundAmounts = () => {
    if (!order || selectedItems.length === 0) return { fullAmount: 0, maxPartialAmount: 0 };
    
    const fullAmount = selectedItemsDetails.reduce((sum: number, item: OrderItem) => 
      sum + parseFloat(item.subtotal), 0
    );
    
    // For keep items, max 70% of full amount
    const maxPartialAmount = fullAmount * 0.7;
    
    return { fullAmount, maxPartialAmount };
  };

  const { fullAmount, maxPartialAmount } = calculateRefundAmounts();

  // Compute refund breakdown (base amount, fee, final amount)
  const computeRefundBreakdown = () => {
    const selectedTotal = selectedItemsDetails.reduce((sum: number, item: OrderItem) => 
      sum + parseFloat(item.subtotal), 0
    );

    // Base amount depends on refund type
    let baseAmount = selectedTotal;
    if (selectedRefundType && selectedRefundType.id === 'keep_item') {
      baseAmount = partialAmount ? parseFloat(partialAmount) : maxPartialAmount;
    } else if (selectedRefundType && (selectedRefundType.id === 'return_item' || selectedRefundType.id === 'replacement')) {
      baseAmount = selectedTotal;
    }

    // Fee rules by refund method subtype
    let fee = 0;
    const methodType = selectedRefundMethod?.type;
    // Cash on Hand should have no extra fee
    if (selectedRefundMethod?.id === 'cash_on_hand') {
      fee = 0;
    } else if (methodType === 'moneyback') {
      fee = 50; // remittance fee
    } else if (methodType === 'bank') {
      fee = 50; // bank transfer fee
    } else if (methodType === 'wallet') {
      fee = 10; // e-wallet fee
    }

    const finalAmount = Math.max(0, baseAmount - fee);

    return { baseAmount, fee, finalAmount };
  };

  const breakdown = computeRefundBreakdown();

  const getAvailableMethods = () => {
    if (!selectedRefundType) return refundMethods;
    
    const deliveryMethod = (order?.delivery_method || order?.shipping?.method || '').toString().toLowerCase();
    const isPickup = deliveryMethod.includes('pickup');

    return refundMethods.filter(method => 
      method.allowedRefundTypes.includes(selectedRefundType.id) &&
      // Only allow Cash on Hand when the order is a pickup
      (method.id !== 'cash_on_hand' || isPickup)
    );
  };

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert('Limit Reached', 'Maximum 4 images allowed');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImages([...images, uri]);
      
      const fileName = uri.split('/').pop() || 'image.jpg';
      const fileType = 'image/jpeg';
      
      setUploadedFiles(prev => [...prev, {
        uri,
        name: fileName,
        type: fileType,
      }]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const isPaymentDetailsValid = () => {
    if (!selectedRefundMethod) return false;
    
    if (selectedRefundMethod.type === 'wallet') {
      return eWalletDetails.provider && eWalletDetails.accountNumber && 
             eWalletDetails.accountName && eWalletDetails.contactNumber;
    }
    
    if (selectedRefundMethod.type === 'bank') {
      return bankDetails.bankName && bankDetails.accountNumber && 
             bankDetails.accountName && bankDetails.accountType;
    }
    
    // For Money Back: remittance requires details, except for Cash on Hand which doesn't
    if (selectedRefundMethod.type === 'moneyback') {
      if (selectedRefundMethod.id === 'cash_on_hand') {
        return true; // no details needed
      }

      return remittanceDetails.provider && remittanceDetails.firstName && 
             remittanceDetails.lastName && remittanceDetails.contactNumber &&
             remittanceDetails.validIdType && remittanceDetails.validIdNumber;
    }
    
    // For voucher and replace methods, no additional details needed
    return true;
  };

  const validateForm = () => {
    if (selectedItems.length === 0) {
      return 'Please select at least one item';
    }
    if (!selectedRefundType) {
      return 'Please select a refund type';
    }
    if (!selectedRefundMethod) {
      return 'Please select a refund method';
    }
    if (!isPaymentDetailsValid()) {
      return 'Please complete the payment details';
    }
    if (!returnReason) {
      return 'Please select a reason for return';
    }
    if (selectedRefundType.id === 'keep_item' && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      return 'Please enter a valid partial refund amount';
    }
    if (selectedRefundType.id === 'keep_item' && parseFloat(partialAmount) > maxPartialAmount) {
      return `Amount cannot exceed ${formatCurrency(maxPartialAmount)}`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Recompute breakdown and use final amount as the total refund stored in DB
      const breakdown = computeRefundBreakdown();
      const requestedBaseAmount = Number((breakdown.baseAmount || 0).toFixed(2));
      const feeAmount = Number((breakdown.fee || 0).toFixed(2));
      const finalRefundAmount = Number((breakdown.finalAmount || 0).toFixed(2));

      // Map type to backend expected value
      const mapTypeToRefundMethod = (type: string) => {
        switch (type) {
          case 'wallet': return 'wallet';
          case 'bank': return 'bank';
          case 'voucher': return 'voucher';
          case 'moneyback': return 'remittance';
          case 'replace': return 'replace';
          default: return type;
        }
      };

      // Create FormData for file uploads
      const formData = new FormData();

      // Add refund data as JSON string (include breakdown fields)
      const refundData = {
        order_id: order?.order_id,
        reason: returnReason === 'Other' ? customReason : returnReason,
        preferred_refund_method: mapTypeToRefundMethod(selectedRefundMethod!.type),
        requested_refund_amount: requestedBaseAmount, // buyer requested/base amount (before fees)
        refund_fee: feeAmount,
        total_refund_amount: finalRefundAmount, // final amount to be paid to buyer (stored)
        customer_note: additionalDetails || '',
        refund_category: selectedRefundType!.id,
        final_refund_type: null, // default null; final type will be set when seller approves
        // Add payment method details based on type
        ...(selectedRefundMethod!.type === 'wallet' ? {
          wallet_details: {
            provider: eWalletDetails.provider,
            account_name: eWalletDetails.accountName,
            account_number: eWalletDetails.accountNumber,
            contact_number: eWalletDetails.contactNumber
          }
        } : {}),
        ...(selectedRefundMethod!.type === 'bank' ? {
          bank_details: {
            bank_name: bankDetails.bankName,
            account_name: bankDetails.accountName,
            account_number: bankDetails.accountNumber,
            account_type: bankDetails.accountType,
            branch: bankDetails.branch || ''
          }
        } : {}),
        ...(selectedRefundMethod!.type === 'moneyback' && selectedRefundMethod.id !== 'cash_on_hand' ? {
          remittance_details: {
            provider: remittanceDetails.provider,
            first_name: remittanceDetails.firstName,
            last_name: remittanceDetails.lastName,
            contact_number: remittanceDetails.contactNumber,
            address: remittanceDetails.address,
            city: remittanceDetails.city,
            province: remittanceDetails.province,
            zip_code: remittanceDetails.zipCode || '',
            valid_id_type: remittanceDetails.validIdType,
            valid_id_number: remittanceDetails.validIdNumber
          }
        } : {})
      };

      // Add JSON data to formData
      formData.append('refund_data', JSON.stringify(refundData));

      // Add selected items
      selectedItems.forEach((itemId, index) => {
        formData.append(`selected_item_${index}`, itemId);
      });

      // Add uploaded files
      uploadedFiles.forEach((file, index) => {
        formData.append(`evidence_${index}`, {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      });

      // Submit to backend
      const response = await AxiosInstance.post('/return-refund/create_refund/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-Id': userId,
        },
      });

      if (response.data.refund_id || response.data.request_number) {
        const refundRequestId = response.data.refund_id || response.data.request_number;
        
        Alert.alert(
          'Success',
          'Return request submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Redirect buyers to Purchases -> Returns tab to view their request
                router.replace({
                  pathname: '/customer/purchases' as any,
                  params: { 
                    tab: 'Returns',
                    success: 'true',
                    message: 'Return request submitted successfully!',
                    refundId: refundRequestId
                  }
                });
              },
            },
          ]
        );
      } else if (response.data.message) {
        Alert.alert('Success', 'Return request submitted successfully!');
        router.replace({
          pathname: '/customer/purchases' as any,
          params: { 
            tab: 'Returns',
            success: 'true'
          }
        });
      } else {
        setError(response.data.error || 'Failed to submit request.');
      }
    } catch (err: any) {
      console.error('Error submitting refund request:', err);

      const resp = err?.response;

      // If a refund request already exists, show an alert and offer to view it in Purchases -> Returns
      if (resp?.data?.refund_id) {
        const existingRequestId = resp.data.refund_id;
        Alert.alert(
          'Request In Progress',
          resp.data.error || 'A refund request for this order is already in progress.',
          [
            { text: 'View Requests', onPress: () => router.replace({ pathname: '/customer/purchases' as any, params: { tab: 'Returns', refundId: existingRequestId } }) },
            { text: 'OK', style: 'cancel' }
          ]
        );
        setError(resp.data.error || 'A refund request for this order is already in progress');
      } else if (resp) {
        if (resp.status === 400 && resp.data?.error) {
          setError(resp.data.error);
        } else if (resp.data?.errors) {
          const errors = Object.values(resp.data.errors).flat();
          setError(errors.join(', '));
        } else if (resp.data?.detail) {
          setError(resp.data.detail);
        } else {
          setError(resp.data?.error || 'Failed to submit request. Please try again.');
        }
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to submit request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrderItem = (item: OrderItem) => {
    const isSelected = selectedItems.includes(item.checkout_id);
    
    return (
      <TouchableOpacity
        key={item.checkout_id}
        style={[styles.orderItem, isSelected && styles.orderItemSelected]}
        onPress={() => handleItemSelect(item.checkout_id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
        
        <View style={styles.itemImagePlaceholder}>
          <Icon name="package-variant" size={24} color="#6b7280" />
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.product_name}
          </Text>
          <Text style={styles.itemShop}>
            {item.shop_name || item.seller_username || 'Unknown Shop'}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(item.price)} each</Text>
          </View>
          {item.remarks && (
            <Text style={styles.itemRemarks} numberOfLines={1}>{item.remarks}</Text>
          )}
        </View>
        
        <View style={styles.itemTotal}>
          <Text style={styles.itemTotalText}>{formatCurrency(item.subtotal)}</Text>
          {isSelected && (
            <Badge variant="success">Selected</Badge>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRefundType = (type: RefundType) => {
    const isSelected = selectedRefundType?.id === type.id;
    
    return (
      <TouchableOpacity
        key={type.id}
        style={[styles.refundTypeCard, isSelected && styles.refundTypeCardSelected]}
        onPress={() => {
          setSelectedRefundType(type);
          setShowRefundTypeModal(false);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.refundTypeIconContainer, isSelected && styles.refundTypeIconContainerSelected]}>
          <Icon name={type.icon} size={24} color={isSelected ? '#fff' : '#4f46e5'} />
        </View>
        <View style={styles.refundTypeContent}>
          <Text style={[styles.refundTypeLabel, isSelected && styles.refundTypeLabelSelected]}>{type.label}</Text>
          <Text style={[styles.refundTypeDescription, isSelected && styles.refundTypeDescriptionSelected]}>{type.description}</Text>
        </View>
        {isSelected && (
          <Icon name="check-circle" size={24} color="#10b981" />
        )}
      </TouchableOpacity>
    );
  };

  const renderRefundMethod = (method: RefundMethod) => {
    const isSelected = selectedRefundMethod?.id === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.refundMethodCard, isSelected && styles.refundMethodCardSelected]}
        onPress={() => {
          setSelectedRefundMethod(method);
          setShowMethodModal(false);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.refundMethodIconContainer, isSelected && styles.refundMethodIconContainerSelected]}>
          <Icon name={method.icon} size={24} color={isSelected ? '#fff' : '#4f46e5'} />
        </View>
        <View style={styles.refundMethodContent}>
          <Text style={[styles.refundMethodLabel, isSelected && styles.refundMethodLabelSelected]}>{method.label}</Text>
          <Text style={[styles.refundMethodDescription, isSelected && styles.refundMethodDescriptionSelected]}>{method.description}</Text>
        </View>
        {isSelected && (
          <Icon name="check-circle" size={24} color="#10b981" />
        )}
      </TouchableOpacity>
    );
  };

  // Render payment details based on selected method
  const renderPaymentDetails = () => {
    if (!selectedRefundMethod) return null;

    switch (selectedRefundMethod.type) {
      case 'wallet':
        return (
          <View style={[styles.paymentDetailsCard, styles.walletCard]}>
            <View style={styles.paymentDetailsHeader}>
              <Icon name="wallet-outline" size={20} color="#1e40af" />
              <Text style={styles.paymentDetailsTitle}>E-Wallet Details</Text>
            </View>
            
            <View style={styles.infoBox}>
              <Icon name="bell-outline" size={16} color="#1e40af" />
              <Text style={styles.infoBoxText}>
                Refunds will be sent to this e-wallet. Ensure details are correct.
              </Text>
            </View>
            
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-Wallet Provider *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Select provider (GCash, PayMaya, etc.)"
                  value={eWalletDetails.provider}
                  onChangeText={(text) => setEWalletDetails({...eWalletDetails, provider: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09XXXXXXXXX"
                  value={eWalletDetails.accountNumber}
                  onChangeText={(text) => setEWalletDetails({...eWalletDetails, accountNumber: text})}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="As it appears in the app"
                  value={eWalletDetails.accountName}
                  onChangeText={(text) => setEWalletDetails({...eWalletDetails, accountName: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09XXXXXXXXX"
                  value={eWalletDetails.contactNumber}
                  onChangeText={(text) => setEWalletDetails({...eWalletDetails, contactNumber: text})}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        );

      case 'bank':
        return (
          <View style={[styles.paymentDetailsCard, styles.bankCard]}>
            <View style={styles.paymentDetailsHeader}>
              <Icon name="credit-card-outline" size={20} color="#166534" />
              <Text style={styles.paymentDetailsTitle}>Bank Account Details</Text>
            </View>
            
            <View style={styles.infoBox}>
              <Icon name="bell-outline" size={16} color="#166534" />
              <Text style={styles.infoBoxText}>
                Refunds will be transferred to this bank account. Processing may take 3-5 business days. 
                <Text style={styles.boldText}> A bank transfer fee of ₱50 will be deducted from the refund amount.</Text>
              </Text>
            </View>
            
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Select bank (BDO, BPI, etc.)"
                  value={bankDetails.bankName}
                  onChangeText={(text) => setBankDetails({...bankDetails, bankName: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000-000-000"
                  value={bankDetails.accountNumber}
                  onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="As it appears in bank records"
                  value={bankDetails.accountName}
                  onChangeText={(text) => setBankDetails({...bankDetails, accountName: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Savings/Checking/Current"
                  value={bankDetails.accountType}
                  onChangeText={(text) => setBankDetails({...bankDetails, accountType: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Branch (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bank branch location"
                  value={bankDetails.branch}
                  onChangeText={(text) => setBankDetails({...bankDetails, branch: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        );

      case 'moneyback':
        if (selectedRefundMethod.id === 'cash_on_hand') {
          return (
            <View style={[styles.infoCard, styles.cashOnHandCard]}>
              <View style={styles.infoCardHeader}>
                <Icon name="hand-coin-outline" size={20} color="#854d0e" />
                <Text style={styles.infoCardTitle}>Cash on Hand</Text>
              </View>
              <Text style={styles.infoCardText}>
                No payment details required — you will collect cash from the seller at pickup.
              </Text>
            </View>
          );
        }

        return (
          <View style={[styles.paymentDetailsCard, styles.remittanceCard]}>
            <View style={styles.paymentDetailsHeader}>
              <Icon name="cash-multiple" size={20} color="#854d0e" />
              <Text style={styles.paymentDetailsTitle}>Remittance Details</Text>
            </View>
            
            <View style={styles.infoBox}>
              <Icon name="bell-outline" size={16} color="#854d0e" />
              <Text style={styles.infoBoxText}>
                Money back will be sent via remittance. You'll receive a notification when ready for pickup.
              </Text>
            </View>
            
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Remittance Provider *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Palawan, LBC, Cebuana, etc."
                  value={remittanceDetails.provider}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, provider: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Given name"
                  value={remittanceDetails.firstName}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, firstName: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Surname"
                  value={remittanceDetails.lastName}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, lastName: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09XXXXXXXXX"
                  value={remittanceDetails.contactNumber}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, contactNumber: text})}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Valid ID Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Driver's License, Passport, etc."
                  value={remittanceDetails.validIdType}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, validIdType: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Valid ID Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ID number"
                  value={remittanceDetails.validIdNumber}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, validIdNumber: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroupFull}>
                <Text style={styles.inputLabel}>Complete Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street, Barangay"
                  value={remittanceDetails.address}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, address: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City/Municipality *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={remittanceDetails.city}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, city: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Province *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Province"
                  value={remittanceDetails.province}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, province: text})}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ZIP Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0000"
                  value={remittanceDetails.zipCode}
                  onChangeText={(text) => setRemittanceDetails({...remittanceDetails, zipCode: text})}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        );

      case 'voucher':
        return (
          <View style={[styles.infoCard, styles.voucherCard]}>
            <View style={styles.infoCardHeader}>
              <Icon name="tag-outline" size={20} color="#6b21a8" />
              <Text style={styles.infoCardTitle}>Store Voucher</Text>
            </View>
            <Text style={styles.infoCardText}>
              Vouchers will be sent directly to your notifications and email once approved.
              No additional details required.
            </Text>
          </View>
        );

      case 'replace':
        return (
          <View style={[styles.infoCard, styles.replacementCard]}>
            <View style={styles.infoCardHeader}>
              <Icon name="package-variant-plus" size={20} color="#166534" />
              <Text style={styles.infoCardTitle}>Replacement</Text>
            </View>
            <Text style={styles.infoCardText}>
              A replacement item will be shipped once we receive and verify the returned item.
              Please allow 7-14 business days for processing.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorMessage}>
            {error || "The order you're looking for doesn't exist or you don't have access to it."}
          </Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Request Return / Refund</Text>
          <Text style={styles.headerSubtitle}>Order #{order.order_id}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Order Status Badge */}
      <View style={styles.statusBadgeContainer}>
        <View style={[styles.statusBadge, 
          order.status === 'completed' ? styles.statusCompleted :
          order.status === 'delivered' ? styles.statusDelivered :
          order.status === 'shipped' ? styles.statusShipped :
          order.status === 'processing' ? styles.statusProcessing :
          order.status === 'pending' ? styles.statusPending :
          order.status === 'cancelled' ? styles.statusCancelled :
          styles.statusDefault
        ]}>
          <Icon 
            name={
              order.status === 'completed' ? 'check-circle' :
              order.status === 'delivered' ? 'package-variant' :
              order.status === 'shipped' ? 'truck' :
              order.status === 'processing' || order.status === 'pending' ? 'schedule' :
              order.status === 'cancelled' ? 'close' : 'schedule'
            } 
            size={14} 
            color={
              order.status === 'completed' ? '#059669' :
              order.status === 'delivered' ? '#2563eb' :
              order.status === 'shipped' ? '#4f46e5' :
              order.status === 'processing' ? '#b45309' :
              order.status === 'pending' ? '#6b7280' :
              order.status === 'cancelled' ? '#dc2626' : '#6b7280'
            } 
          />
          <Text style={[
            styles.statusBadgeText,
            order.status === 'completed' ? styles.statusCompletedText :
            order.status === 'delivered' ? styles.statusDeliveredText :
            order.status === 'shipped' ? styles.statusShippedText :
            order.status === 'processing' ? styles.statusProcessingText :
            order.status === 'pending' ? styles.statusPendingText :
            order.status === 'cancelled' ? styles.statusCancelledText :
            styles.statusDefaultText
          ]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <ProgressBar progress={calculateProgress()} />
        </View>

        {/* Order Info */}
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <Icon name="shopping-outline" size={20} color="#4f46e5" />
            <Text style={styles.orderId}>Order Details</Text>
            <Badge variant="info">{order.items.length} Items</Badge>
          </View>
          
          <View style={styles.orderInfoGrid}>
            <View style={styles.orderInfoItem}>
              <View style={styles.orderInfoLabel}>
                <Icon name="calendar-outline" size={14} color="#6b7280" />
                <Text style={styles.orderInfoLabelText}>Order Date</Text>
              </View>
              <Text style={styles.orderInfoValue}>{formatDate(order.created_at)}</Text>
            </View>
            
            <View style={styles.orderInfoItem}>
              <View style={styles.orderInfoLabel}>
                <Icon name="package-outline" size={14} color="#6b7280" />
                <Text style={styles.orderInfoLabelText}>Total Items</Text>
              </View>
              <Text style={styles.orderInfoValue}>{order.items.length} items</Text>
            </View>
            
            <View style={styles.orderInfoItem}>
              <View style={styles.orderInfoLabel}>
                <Icon name="credit-card-outline" size={14} color="#6b7280" />
                <Text style={styles.orderInfoLabelText}>Payment Method</Text>
              </View>
              <Text style={styles.orderInfoValue}>{order.payment_method?.toUpperCase() || 'N/A'}</Text>
            </View>
            
            <View style={styles.orderInfoItem}>
              <View style={styles.orderInfoLabel}>
                <Icon name="check-circle-outline" size={14} color="#6b7280" />
                <Text style={styles.orderInfoLabelText}>Payment Status</Text>
              </View>
              <Text style={[styles.orderInfoValue, styles.paymentStatusPaid]}>
                {order.payment_status || 'Paid'}
              </Text>
            </View>
          </View>

          {/* Delivery Info */}
          {order.delivery_address && (
            <View style={styles.deliveryInfo}>
              <Icon name="map-marker-outline" size={16} color="#6b7280" />
              <View style={styles.deliveryInfoContent}>
                <Text style={styles.deliveryInfoTitle}>Delivery Address</Text>
                <Text style={styles.deliveryInfoText}>{order.delivery_address}</Text>
                {order.delivery_method && (
                  <Text style={styles.deliveryMethodText}>Method: {order.delivery_method}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Select Items */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="shopping-outline" size={20} color="#4f46e5" />
              <Text style={styles.sectionTitle}>Select Items to Return</Text>
            </View>
            <TouchableOpacity onPress={handleSelectAll}>
              <Text style={styles.selectAllText}>
                {selectedItems.length === order.items.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.itemsList}>
            {order.items.map(renderOrderItem)}
          </View>
          
          {selectedItems.length > 0 && (
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedCount}>
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </Text>
              <Text style={styles.selectedAmount}>
                Total: {formatCurrency(fullAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Refund Type */}
        <TouchableOpacity
          style={styles.selectionCard}
          onPress={() => setShowRefundTypeModal(true)}
        >
          <View style={styles.selectionHeader}>
            <Icon name="refresh" size={20} color="#4f46e5" />
            <Text style={styles.selectionTitle}>Refund Type</Text>
          </View>
          <View style={styles.selectionContent}>
            {selectedRefundType ? (
              <View style={styles.selectedOption}>
                <Icon name={selectedRefundType.icon} size={18} color="#10b981" />
                <Text style={styles.selectedOptionText}>{selectedRefundType.label}</Text>
                <Badge variant={selectedRefundType.id === 'return_item' ? 'info' : selectedRefundType.id === 'keep_item' ? 'warning' : 'purple'}>
                  {selectedRefundType.id === 'return_item' ? 'Full Refund' : 
                   selectedRefundType.id === 'keep_item' ? 'Partial Refund' : 'Replacement'}
                </Badge>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select refund type</Text>
            )}
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </View>
          
          {selectedRefundType && (
            <View style={styles.refundTypeInfo}>
              <Text style={styles.refundTypeInfoText}>
                {selectedRefundType.id === 'return_item' && (
                  <>
                    You'll return the item and receive a full refund of <Text style={styles.boldText}>{formatCurrency(fullAmount)}</Text>.
                    {selectedRefundMethod && (
                      <Text>
                        {breakdown.fee > 0 ? 
                          ` Fee (${selectedRefundMethod.label}): ${formatCurrency(breakdown.fee)} — You will receive ${formatCurrency(breakdown.finalAmount)}` :
                          ` You will receive ${formatCurrency(breakdown.finalAmount)}`
                        }
                      </Text>
                    )}
                  </>
                )}
                {selectedRefundType.id === 'keep_item' && (
                  <>
                    You'll keep the item and can request up to <Text style={styles.boldText}>{formatCurrency(maxPartialAmount)}</Text> (70% of item value).
                    {selectedRefundMethod && (
                      <Text>
                        {breakdown.fee > 0 ? 
                          ` Fee (${selectedRefundMethod.label}): ${formatCurrency(breakdown.fee)} — You will receive ${formatCurrency(breakdown.finalAmount)}` :
                          ` You will receive ${formatCurrency(breakdown.finalAmount)}`
                        }
                      </Text>
                    )}
                  </>
                )}
                {selectedRefundType.id === 'replacement' && (
                  <>You'll return the item and receive a replacement</>
                )}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Refund Method */}
        {selectedRefundType && (
          <TouchableOpacity
            style={styles.selectionCard}
            onPress={() => setShowMethodModal(true)}
          >
            <View style={styles.selectionHeader}>
              <Icon name="credit-card-outline" size={20} color="#4f46e5" />
              <Text style={styles.selectionTitle}>Refund Method</Text>
            </View>
            <View style={styles.selectionContent}>
              {selectedRefundMethod ? (
                <View style={styles.selectedOption}>
                  <Icon name={selectedRefundMethod.icon} size={18} color="#10b981" />
                  <Text style={styles.selectedOptionText}>{selectedRefundMethod.label}</Text>
                  <Badge variant="success">
                    {selectedRefundMethod.type === 'wallet' ? 'E-Wallet' :
                     selectedRefundMethod.type === 'bank' ? 'Bank Transfer' :
                     selectedRefundMethod.type === 'voucher' ? 'Store Voucher' :
                     selectedRefundMethod.type === 'moneyback' ? 'Remittance' : 'Replacement'}
                  </Badge>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select refund method</Text>
              )}
              <Icon name="chevron-right" size={20} color="#9ca3af" />
            </View>
            
            {selectedRefundMethod && (
              <View style={styles.refundMethodInfo}>
                <View style={styles.refundMethodInfoRow}>
                  <Text style={styles.refundMethodInfoLabel}>Fee:</Text>
                  <Text style={styles.refundMethodInfoValue}>{formatCurrency(breakdown.fee)}</Text>
                </View>
                <View style={styles.refundMethodInfoRow}>
                  <Text style={styles.refundMethodInfoLabel}>Net:</Text>
                  <Text style={styles.refundMethodInfoNet}>{formatCurrency(breakdown.finalAmount)}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Refund Breakdown */}
        {selectedRefundMethod && (
          <View style={styles.refundBreakdownCard}>
            <Text style={styles.refundBreakdownTitle}>Refund Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <View>
                <Text style={styles.breakdownLabel}>
                  {selectedRefundType?.id === 'return_item' ? 'Full Refund Amount' : 
                   selectedRefundType?.id === 'keep_item' ? 'Partial Refund Amount' : 'Replacement Value'}
                </Text>
                <Text style={styles.breakdownSubLabel}>
                  {selectedRefundType?.id === 'keep_item' ? 'You keep the item and request partial refund' :
                   selectedRefundType?.id === 'return_item' ? 'You return the item for full refund' :
                   'You return the item for replacement'}
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(breakdown.baseAmount)}</Text>
            </View>
            
            {breakdown.fee > 0 && (
              <View style={styles.breakdownRow}>
                <View>
                  <Text style={styles.breakdownLabel}>
                    Fee ({selectedRefundMethod.type === 'moneyback' ? 'Remittance' : 
                          selectedRefundMethod.type === 'wallet' ? 'E-Wallet' : 
                          selectedRefundMethod.type === 'bank' ? 'Bank Transfer' : 'Processing'})
                  </Text>
                  <Text style={styles.breakdownSubLabel}>
                    {selectedRefundMethod.type === 'moneyback' ? 'Remittance service charge' :
                     selectedRefundMethod.type === 'bank' ? 'Bank transfer processing fee' :
                     selectedRefundMethod.type === 'wallet' ? 'E-wallet processing fee' : 'Processing fee'}
                  </Text>
                </View>
                <Text style={styles.breakdownFee}>- {formatCurrency(breakdown.fee)}</Text>
              </View>
            )}
            
            <View style={styles.separator} />
            
            <View style={styles.finalAmountRow}>
              <Text style={styles.finalAmountLabel}>You will receive:</Text>
              <Text style={styles.finalAmount}>{formatCurrency(breakdown.finalAmount)}</Text>
            </View>
            
            {selectedRefundType?.id === 'keep_item' && (
              <View style={styles.partialAmountInfo}>
                <Text style={styles.partialAmountTitle}>Partial Refund Details</Text>
                <View style={styles.partialAmountGrid}>
                  <View style={styles.partialAmountItem}>
                    <Text style={styles.partialAmountLabel}>Full Amount</Text>
                    <Text style={styles.partialAmountValue}>{formatCurrency(fullAmount)}</Text>
                  </View>
                  <View style={styles.partialAmountItem}>
                    <Text style={styles.partialAmountLabel}>Max Partial (70%)</Text>
                    <Text style={styles.partialAmountMax}>{formatCurrency(maxPartialAmount)}</Text>
                  </View>
                  <View style={styles.partialAmountItem}>
                    <Text style={styles.partialAmountLabel}>Your Request</Text>
                    <Text style={styles.partialAmountRequest}>
                      {partialAmount ? formatCurrency(parseFloat(partialAmount)) : formatCurrency(maxPartialAmount)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={partialAmount}
                    onChangeText={setPartialAmount}
                    placeholder={formatCurrency(maxPartialAmount)}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                
                {partialAmount && parseFloat(partialAmount) > maxPartialAmount && (
                  <Text style={styles.amountError}>
                    Amount cannot exceed {formatCurrency(maxPartialAmount)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Payment Details */}
        {selectedRefundMethod && renderPaymentDetails()}

        {/* Return Reason */}
        <TouchableOpacity
          style={styles.selectionCard}
          onPress={() => setShowReasonModal(true)}
        >
          <View style={styles.selectionHeader}>
            <Icon name="alert-circle-outline" size={20} color="#4f46e5" />
            <Text style={styles.selectionTitle}>Return Reason</Text>
          </View>
          <View style={styles.selectionContent}>
            {returnReason ? (
              <Text style={styles.selectedOptionText} numberOfLines={1}>
                {returnReason === 'Other' ? customReason : returnReason}
              </Text>
            ) : (
              <Text style={styles.placeholderText}>Select a reason</Text>
            )}
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </View>
          
          {returnReason && returnReason !== 'Other' && (
            <View style={styles.selectedReasonBadge}>
              <Icon name="check-circle" size={16} color="#10b981" />
              <Text style={styles.selectedReasonText}>Selected: {returnReason}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Additional Details */}
        <View style={styles.card}>
          <Text style={styles.textAreaTitle}>Additional Details (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            placeholder="Please provide any additional details about your return request (e.g., specific issues, photos description)..."
            multiline
            numberOfLines={4}
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>

        {/* Upload Images */}
        <View style={styles.card}>
          <Text style={styles.uploadTitle}>Upload Evidence (Optional)</Text>
          <Text style={styles.uploadHint}>Max 4 images, 5MB each</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Icon name="camera-plus-outline" size={32} color="#9ca3af" />
              <Text style={styles.uploadButtonText}>Add Photo</Text>
              <Text style={styles.uploadCounter}>{images.length}/4</Text>
            </TouchableOpacity>
            
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Icon name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageOverlayText}>Evidence {index + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Return Policy */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Icon name="shield-check-outline" size={20} color="#10b981" />
            <Text style={styles.policyTitle}>Return Policy</Text>
          </View>
          <View style={styles.policyPoints}>
            <View style={styles.policyPoint}>
              <Icon name="check-circle-outline" size={16} color="#10b981" />
              <Text style={styles.policyText}>7-day return window from delivery date</Text>
            </View>
            <View style={styles.policyPoint}>
              <Icon name="check-circle-outline" size={16} color="#10b981" />
              <Text style={styles.policyText}>Items must be in original condition with all accessories</Text>
            </View>
            <View style={styles.policyPoint}>
              <Icon name="check-circle-outline" size={16} color="#10b981" />
              <Text style={styles.policyText}>Refunds processed within 3-5 business days after approval</Text>
            </View>
            <View style={styles.policyPoint}>
              <Icon name="check-circle-outline" size={16} color="#10b981" />
              <Text style={styles.policyText}>Free return shipping for damaged/wrong items</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        {error && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, 
            (!selectedItems.length || submitting || !selectedRefundType || !selectedRefundMethod || !returnReason || 
             (selectedRefundType?.id === 'keep_item' && (!partialAmount || parseFloat(partialAmount) > maxPartialAmount))) && 
            styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!selectedItems.length || submitting || !selectedRefundType || !selectedRefundMethod || !returnReason || 
                   (selectedRefundType?.id === 'keep_item' && (!partialAmount || parseFloat(partialAmount) > maxPartialAmount))}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Return Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Modal
        visible={showRefundTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRefundTypeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Refund Type</Text>
              <TouchableOpacity onPress={() => setShowRefundTypeModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={refundTypes}
              renderItem={({ item }) => renderRefundType(item)}
              keyExtractor={(item) => item.id}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMethodModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMethodModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Refund Method</Text>
              <TouchableOpacity onPress={() => setShowMethodModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getAvailableMethods()}
              renderItem={({ item }) => renderRefundMethod(item)}
              keyExtractor={(item) => item.id}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReasonModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Return Reason</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={returnReasons}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reasonItem}
                  onPress={() => {
                    setReturnReason(item);
                    if (item === 'Other') {
                      Alert.prompt(
                        'Specify Reason',
                        'Please specify your reason for return:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'OK',
                            onPress: (reason) => {
                              if (reason) setCustomReason(reason);
                            },
                          },
                        ]
                      );
                    }
                    setShowReasonModal(false);
                  }}
                >
                  <Text style={styles.reasonText}>{item}</Text>
                  <Icon name="chevron-right" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  statusBadgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusDelivered: {
    backgroundColor: '#dbeafe',
  },
  statusShipped: {
    backgroundColor: '#e0e7ff',
  },
  statusProcessing: {
    backgroundColor: '#fef3c7',
  },
  statusPending: {
    backgroundColor: '#f3f4f6',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusDefault: {
    backgroundColor: '#f3f4f6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusCompletedText: {
    color: '#059669',
  },
  statusDeliveredText: {
    color: '#2563eb',
  },
  statusShippedText: {
    color: '#4f46e5',
  },
  statusProcessingText: {
    color: '#b45309',
  },
  statusPendingText: {
    color: '#6b7280',
  },
  statusCancelledText: {
    color: '#dc2626',
  },
  statusDefaultText: {
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
    marginBottom: 80,
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressLabelActive: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  orderInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  orderInfoItem: {
    width: '47%',
  },
  orderInfoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  orderInfoLabelText: {
    fontSize: 11,
    color: '#6b7280',
  },
  orderInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 18,
  },
  paymentStatusPaid: {
    color: '#059669',
  },
  deliveryInfo: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  deliveryInfoContent: {
    flex: 1,
  },
  deliveryInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  deliveryInfoText: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 16,
  },
  deliveryMethodText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectAllText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '500',
  },
  itemsList: {
    gap: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  orderItemSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  itemShop: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemRemarks: {
    fontSize: 11,
    color: '#2563eb',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemTotal: {
    marginLeft: 8,
    alignItems: 'flex-end',
    gap: 4,
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  selectedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectedCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeinfo: {
    backgroundColor: '#dbeafe',
  },
  badgesuccess: {
    backgroundColor: '#d1fae5',
  },
  badgewarning: {
    backgroundColor: '#fef3c7',
  },
  badgedefault: {
    backgroundColor: '#f3f4f6',
  },
  badgepurple: {
    backgroundColor: '#f3e8ff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextinfo: {
    color: '#1e40af',
  },
  badgeTextsuccess: {
    color: '#065f46',
  },
  badgeTextwarning: {
    color: '#b45309',
  },
  badgeTextdefault: {
    color: '#4b5563',
  },
  badgeTextpurple: {
    color: '#6b21a8',
  },
  selectionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedOptionText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 1,
  },
  refundTypeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  refundTypeInfoText: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  refundMethodInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refundMethodInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refundMethodInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  refundMethodInfoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
  },
  refundMethodInfoNet: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  refundBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  refundBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  breakdownSubLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  finalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  finalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  partialAmountInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  partialAmountTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  partialAmountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  partialAmountItem: {
    alignItems: 'center',
    flex: 1,
  },
  partialAmountLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  partialAmountValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  partialAmountMax: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  partialAmountRequest: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#f9fafb',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#374151',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  amountError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  paymentDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  walletCard: {
    borderColor: '#bfdbfe',
  },
  bankCard: {
    borderColor: '#bbf7d0',
  },
  remittanceCard: {
    borderColor: '#fed7aa',
  },
  paymentDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paymentDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 16,
  },
  formGrid: {
    gap: 12,
  },
  inputGroup: {
    width: '100%',
  },
  inputGroupFull: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cashOnHandCard: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  voucherCard: {
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
  },
  replacementCard: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCardText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  selectedReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  selectedReasonText: {
    fontSize: 12,
    color: '#065f46',
    flex: 1,
  },
  textAreaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  imageScrollView: {
    flexDirection: 'row',
  },
  uploadButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f9fafb',
  },
  uploadButtonText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  uploadCounter: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 9,
    textAlign: 'center',
  },
  policyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  policyPoints: {
    marginLeft: 4,
  },
  policyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  policyText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991b1b',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  refundTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  refundTypeCardSelected: {
    backgroundColor: '#f5f3ff',
  },
  refundTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  refundTypeIconContainerSelected: {
    backgroundColor: '#4f46e5',
  },
  refundTypeContent: {
    flex: 1,
  },
  refundTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  refundTypeLabelSelected: {
    color: '#4f46e5',
  },
  refundTypeDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  refundTypeDescriptionSelected: {
    color: '#4f46e5',
  },
  refundMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  refundMethodCardSelected: {
    backgroundColor: '#f5f3ff',
  },
  refundMethodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  refundMethodIconContainerSelected: {
    backgroundColor: '#4f46e5',
  },
  refundMethodContent: {
    flex: 1,
  },
  refundMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  refundMethodLabelSelected: {
    color: '#4f46e5',
  },
  refundMethodDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  refundMethodDescriptionSelected: {
    color: '#4f46e5',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reasonText: {
    fontSize: 15,
    color: '#374151',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});