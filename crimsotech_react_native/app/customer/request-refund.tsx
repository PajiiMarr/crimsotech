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
import AxiosInstance from '../../contexts/axios';

const { width, height } = Dimensions.get('window');

// Types
interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  variant_title?: string | null;      // from user_purchases (list)
  product_variant?: string | null;    // from view_order_detail (single)
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
  product_images?: Array<{
    id?: string;
    url?: string;
    file_data?: string;
    file_type?: string;
  }>;
  primary_image?: {
    id?: string;
    url?: string;
    file_type?: string;
  } | null;
  shop_info?: {
    id?: string;
    name?: string;
    picture?: string | null;
  };
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

// Refund types
const refundTypes: RefundType[] = [
  {
    id: 'return_item',
    label: 'Return Item',
    description: 'Return the item for a full refund',
    icon: 'refresh',
    refundAmount: 'full'
  },
  // {
  //   id: 'keep_item',
  //   label: 'Keep Item',
  //   description: 'Keep the item and request partial refund',
  //   icon: 'package-variant-closed',
  //   refundAmount: 'partial'
  // },
  {
    id: 'replacement',
    label: 'Replacement',
    description: 'Return item for a replacement',
    icon: 'package-variant',
    refundAmount: 'replacement'
  }
];

// Refund methods
const refundMethods: RefundMethod[] = [
  {
    id: 'wallet',
    label: 'Refund to Wallet',
    description: 'Get refund to your e-wallet',
    icon: 'wallet-outline',
    type: 'wallet',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  // {
  //   id: 'bank',
  //   label: 'Bank Transfer',
  //   description: 'Get refund via bank transfer',
  //   icon: 'credit-card-outline',
  //   type: 'bank',
  //   allowedRefundTypes: ['return_item', 'keep_item']
  // },
  // {
  //   id: 'voucher',
  //   label: 'Store Voucher',
  //   description: 'Receive a store voucher',
  //   icon: 'tag-outline',
  //   type: 'voucher',
  //   allowedRefundTypes: ['return_item', 'keep_item']
  // },
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

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => {
  const badgeStyle = variant === 'info' ? styles.badgeinfo :
                     variant === 'success' ? styles.badgesuccess :
                     variant === 'warning' ? styles.badgewarning :
                     variant === 'purple' ? styles.badgepurple :
                     variant === 'disabled' ? styles.badgedisabled :
                     styles.badgedefault;
  
  const textStyle = variant === 'info' ? styles.badgeTextinfo :
                    variant === 'success' ? styles.badgeTextsuccess :
                    variant === 'warning' ? styles.badgeTextwarning :
                    variant === 'purple' ? styles.badgeTextpurple :
                    variant === 'disabled' ? styles.badgeTextdisabled :
                    styles.badgeTextdefault;
  
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const ProgressBar = ({ progress }: any) => (
  <View style={styles.progressBarContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
    <View style={styles.progressLabels}>
      <Text style={progress >= 33 ? styles.progressLabelActive : styles.progressLabel}>Select Items</Text>
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
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
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

  // Saved payment methods
  const [savedEwallets, setSavedEwallets] = useState<any[]>([]);
  const [savedBanks, setSavedBanks] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Already refunded items
  const [refundedCheckoutIds, setRefundedCheckoutIds] = useState<Set<string>>(new Set());

  // Media handling
  const [mediaFiles, setMediaFiles] = useState<Array<{ uri: string; name: string; type: string; mimeType?: string }>>([]);
  const [mediaUris, setMediaUris] = useState<string[]>([]);

  // Modals
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showRefundTypeModal, setShowRefundTypeModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showWalletSelectionModal, setShowWalletSelectionModal] = useState(false);
  const [showBankSelectionModal, setShowBankSelectionModal] = useState(false);

  // Fetch order data
  useEffect(() => {
    fetchOrderData();
  }, [decodedOrderId, userId]);

  // After order loads, fetch existing refunds for this order
  useEffect(() => {
    if (order) {
      fetchExistingRefundsForOrder();
    }
  }, [order]);

  // When selected items change, initialize quantities to max for new selections
  useEffect(() => {
    if (!order) return;
    const newQuantities = { ...refundQuantities };
    let changed = false;
    selectedItems.forEach(checkoutId => {
      if (newQuantities[checkoutId] === undefined) {
        const item = order.items.find(i => i.checkout_id === checkoutId);
        if (item) {
          newQuantities[checkoutId] = item.quantity;
          changed = true;
        }
      }
    });
    // Remove quantities for unselected items (optional)
    Object.keys(newQuantities).forEach(cid => {
      if (!selectedItems.includes(cid)) {
        delete newQuantities[cid];
        changed = true;
      }
    });
    if (changed) {
      setRefundQuantities(newQuantities);
    }
  }, [selectedItems, order]);

  // Fetch saved payment methods when wallet method is selected
  useEffect(() => {
    if (selectedRefundMethod?.type === 'wallet') {
      fetchSavedEwallets();
    } else {
      setSelectedWalletId(null);
      setEWalletDetails({ provider: '', accountName: '', accountNumber: '', contactNumber: '' });
    }
  }, [selectedRefundMethod]);

  // Fetch saved banks when bank method is selected
  useEffect(() => {
    if (selectedRefundMethod?.type === 'bank') {
      fetchSavedBanks();
    } else {
      setSelectedBankId(null);
      setBankDetails({ bankName: '', accountName: '', accountNumber: '', accountType: '', branch: '' });
    }
  }, [selectedRefundMethod]);

  // When a saved wallet is selected, populate eWalletDetails
  useEffect(() => {
    if (selectedWalletId) {
      const selected = savedEwallets.find(m => m.payment_id === selectedWalletId);
      if (selected) {
        const fullNumber = selected.full_account_number || selected.account_number;
        setEWalletDetails({
          provider: selected.payment_method === 'gcash' ? 'GCash' : selected.payment_method === 'paymaya' ? 'PayMaya' : '',
          accountName: selected.account_name,
          accountNumber: fullNumber,
          contactNumber: fullNumber,
        });
      }
    }
  }, [selectedWalletId, savedEwallets]);

  // When a saved bank is selected, populate bankDetails
  useEffect(() => {
    if (selectedBankId) {
      const selected = savedBanks.find(b => b.payment_id === selectedBankId);
      if (selected) {
        setBankDetails({
          bankName: selected.bank_name || '',
          accountName: selected.account_name || '',
          accountNumber: selected.account_number || '',
          accountType: selected.account_type || '',
          branch: selected.branch || '',
        });
      }
    }
  }, [selectedBankId, savedBanks]);

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
      const response = await AxiosInstance.get(`/purchases-buyer/${decodedOrderId}/view-order/`, {
        headers: { 'X-User-Id': userId },
      });
      
      if (!response?.data) {
        setError('Order information is not available');
        setOrder(null);
        return;
      }

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
        shipping: { method: orderData.shipping_info?.delivery_method || '' }
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

  const fetchExistingRefundsForOrder = async () => {
    if (!userId || !decodedOrderId) return;
    try {
      const response = await AxiosInstance.get('/return-refund/get_my_refunds/', {
        headers: { 'X-User-Id': userId }
      });
      const allRefunds = response.data || [];
      const orderRefunds = allRefunds.filter((r: any) => r.order_id === decodedOrderId);
      const activeStatuses = ['pending', 'approved', 'negotiation', 'under_review', 'waiting', 'to_verify'];
      const activeRefunds = orderRefunds.filter((r: any) => activeStatuses.includes(r.status));
      const checkoutIds = new Set<string>();
      activeRefunds.forEach((refund: any) => {
        if (refund.items && refund.items.length) {
          refund.items.forEach((item: any) => {
            if (item.checkout_id) checkoutIds.add(item.checkout_id);
          });
        }
      });
      setRefundedCheckoutIds(checkoutIds);
    } catch (error) {
      console.error('Error fetching existing refunds:', error);
    }
  };

  const fetchSavedEwallets = async () => {
    if (!userId) return;
    setLoadingSaved(true);
    try {
      const response = await AxiosInstance.get('/user-payment-details/get_my_payment_methods/', {
        headers: { 'X-User-Id': userId }
      });
      const ewallets = (response.data || []).filter(
        (m: any) => m.payment_method === 'gcash' || m.payment_method === 'paymaya'
      );
      setSavedEwallets(ewallets);
    } catch (error) {
      console.error('Error fetching e-wallets:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchSavedBanks = async () => {
    if (!userId) return;
    setLoadingBanks(true);
    try {
      const response = await AxiosInstance.get('/user-payment-details/get_my_payment_methods/', {
        headers: { 'X-User-Id': userId }
      });
      const banks = (response.data || []).filter((m: any) => m.payment_method === 'bank');
      setSavedBanks(banks);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoadingBanks(false);
    }
  };

  const getProductImageUrl = (item: OrderItem) => {
    if (item.primary_image?.url) return item.primary_image.url;
    if (item.product_images && item.product_images.length > 0) {
      const firstImage = item.product_images[0];
      if (firstImage.url) return firstImage.url;
      if (firstImage.file_data) return firstImage.file_data;
    }
    if (item.shop_info?.picture) return item.shop_info.picture;
    return '';
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
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const calculateProgress = () => {
    let progress = 0;
    if (selectedItems.length > 0) progress += 33;
    if (selectedRefundType && selectedRefundMethod) progress += 33;
    if (returnReason) progress += 33;
    return Math.min(100, progress);
  };

  const handleItemSelect = (checkoutId: string) => {
    if (refundedCheckoutIds.has(checkoutId)) return; // already refunded
    setSelectedItems(prev =>
      prev.includes(checkoutId) ? prev.filter(id => id !== checkoutId) : [...prev, checkoutId]
    );
  };

  const handleSelectAll = () => {
    if (!order) return;
    const selectableItems = order.items.filter(item => !refundedCheckoutIds.has(item.checkout_id));
    if (selectedItems.length === selectableItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableItems.map(item => item.checkout_id));
    }
  };

  const updateQuantity = (checkoutId: string, newQuantity: number) => {
    const item = order?.items.find(i => i.checkout_id === checkoutId);
    if (!item) return;
    const maxQty = item.quantity;
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > maxQty) newQuantity = maxQty;
    setRefundQuantities(prev => ({ ...prev, [checkoutId]: newQuantity }));
  };

  // Compute selected items details with quantities
  const selectedItemsDetails = order?.items.filter(item => 
    selectedItems.includes(item.checkout_id)
  ).map(item => ({
    ...item,
    refundQuantity: refundQuantities[item.checkout_id] ?? item.quantity,
  })) || [];

  const calculateRefundAmounts = () => {
    if (!order || selectedItems.length === 0) return { fullAmount: 0, maxPartialAmount: 0 };
    
    // Calculate the actual amount for selected items from their subtotal
    // This is the actual price they paid for these items (including any discounts applied at item level)
    const fullAmount = selectedItemsDetails.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.refundQuantity), 0
    );
    
    // For partial refund (keep_item), max is 70% of the selected items' value
    const maxPartialAmount = fullAmount * 0.7;
    
    return { fullAmount, maxPartialAmount };
};

  const { fullAmount, maxPartialAmount } = calculateRefundAmounts();

  const computeRefundBreakdown = () => {
    // Calculate base amount as the sum of selected items' prices (what they paid for these items)
    let baseAmount = selectedItemsDetails.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.refundQuantity), 0
    );
    
    if (selectedRefundType && selectedRefundType.id === 'keep_item') {
        baseAmount = partialAmount ? parseFloat(partialAmount) : maxPartialAmount;
    }
    
    let fee = 0;
    const methodType = selectedRefundMethod?.type;
    if (selectedRefundMethod?.id === 'cash_on_hand') fee = 0;
    else if (methodType === 'moneyback') fee = 50;
    else if (methodType === 'bank') fee = 50;
    else if (methodType === 'wallet') fee = 0;
    else if (methodType === 'replace') fee = 0;
    
    const finalAmount = Math.max(0, baseAmount - fee);
    return { baseAmount, fee, finalAmount };
};

  const breakdown = computeRefundBreakdown();

  const getAvailableMethods = () => {
    if (!selectedRefundType) return refundMethods;
    // Only show methods that are allowed for the selected refund type
    // This will automatically filter to only 'wallet' for return_item/keep_item
    // and 'replace' for replacement
    return refundMethods.filter(method => method.allowedRefundTypes.includes(selectedRefundType.id));
  };

  const pickMedia = async () => {
    if (mediaFiles.length >= 4) {
      Alert.alert('Limit Reached', 'Maximum 4 files (images/videos) allowed');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your media library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split('/').pop() || (asset.type === 'video' ? 'video.mp4' : 'image.jpg');
      const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
      setMediaUris([...mediaUris, uri]);
      setMediaFiles(prev => [...prev, {
        uri,
        name: fileName,
        type: asset.type || 'image',
        mimeType,
      }]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUris(mediaUris.filter((_, i) => i !== index));
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const isPaymentDetailsValid = () => {
    if (!selectedRefundMethod) return false;
    if (selectedRefundMethod.type === 'wallet') return !!selectedWalletId;
    if (selectedRefundMethod.type === 'bank') return !!selectedBankId;
    return true;
  };

  const validateForm = () => {
    if (selectedItems.length === 0) return 'Please select at least one item';
    // Check that all selected items have valid quantities
    for (const item of selectedItemsDetails) {
      const qty = item.refundQuantity;
      if (!qty || qty < 1 || qty > item.quantity) {
        return `Invalid quantity for ${item.product_name}. Must be between 1 and ${item.quantity}.`;
      }
    }
    if (!selectedRefundType) return 'Please select a refund type';
    if (!selectedRefundMethod) return 'Please select a refund method';
    if (!isPaymentDetailsValid()) {
      if (selectedRefundMethod.type === 'wallet') return 'Please select a saved e-wallet or add one first';
      if (selectedRefundMethod.type === 'bank') return 'Please select a saved bank account or add one first';
      return 'Please complete the payment details';
    }
    if (!returnReason) return 'Please select a reason for return';
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
      // Build items array
      const items = selectedItemsDetails.map(item => ({
        checkout_id: item.checkout_id,
        quantity: item.refundQuantity,
        amount: (parseFloat(item.price) * item.refundQuantity), 
      }));

      const breakdown = computeRefundBreakdown();
      const requestedBaseAmount = Number((breakdown.baseAmount || 0).toFixed(2));
      const feeAmount = Number((breakdown.fee || 0).toFixed(2));
      const finalRefundAmount = Number((breakdown.finalAmount || 0).toFixed(2));

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

      const formData = new FormData();
      const refundData = {
        order_id: order?.order_id,
        reason: returnReason === 'Other' ? customReason : returnReason,
        preferred_refund_method: mapTypeToRefundMethod(selectedRefundMethod!.type),
        requested_refund_amount: requestedBaseAmount,
        refund_fee: feeAmount,
        total_refund_amount: finalRefundAmount,
        customer_note: additionalDetails || '',
        refund_category: selectedRefundType!.id,
        final_refund_type: null,
        selected_payment_id: selectedRefundMethod!.type === 'wallet' ? selectedWalletId : (selectedRefundMethod!.type === 'bank' ? selectedBankId : undefined),
        items: items,  // new items array
        ...(selectedRefundMethod!.type === 'wallet' ? {
          wallet_details: {
            provider: eWalletDetails.provider,
            account_name: eWalletDetails.accountName,
            account_number: eWalletDetails.accountNumber,
            contact_number: eWalletDetails.contactNumber,
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
      };

      formData.append('refund_data', JSON.stringify(refundData));

      mediaFiles.forEach((file, index) => {
        let mimeType = file.mimeType;
        if (!mimeType) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'mp4') mimeType = 'video/mp4';
          else if (ext === 'mov') mimeType = 'video/quicktime';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'gif') mimeType = 'image/gif';
          else mimeType = 'application/octet-stream';
        }
        formData.append(`evidence_${index}`, {
          uri: file.uri,
          name: file.name,
          type: mimeType,
        } as any);
      });

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
          params: { tab: 'Returns', success: 'true' }
        });
      } else {
        setError(response.data.error || 'Failed to submit request.');
      }
    } catch (err: any) {
      console.error('Error submitting refund request:', err);
      const resp = err?.response;
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
        if (resp.status === 400 && resp.data?.error) setError(resp.data.error);
        else if (resp.data?.errors) setError(Object.values(resp.data.errors).flat().join(', '));
        else if (resp.data?.detail) setError(resp.data.detail);
        else setError(resp.data?.error || 'Failed to submit request. Please try again.');
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
    const isAlreadyRefunded = refundedCheckoutIds.has(item.checkout_id);
    const imageUrl = getProductImageUrl(item);
    const refundQty = refundQuantities[item.checkout_id] ?? item.quantity;

    let sellerDisplay = '';
    if (item.shop_name) {
      sellerDisplay = `Shop: ${item.shop_name}`;
    } else if (item.seller_username) {
      sellerDisplay = `Seller: ${item.seller_username}`;
    } else {
      sellerDisplay = '';
    }

    // Get variant name – backend may send as 'product_variant' (view-order) or 'variant_title' (list)
    const variantName = item.product_variant || item.variant_title;

    return (
      <TouchableOpacity
        key={item.checkout_id}
        style={[styles.orderItem, isSelected && styles.orderItemSelected, isAlreadyRefunded && styles.orderItemDisabled]}
        onPress={() => handleItemSelect(item.checkout_id)}
        activeOpacity={isAlreadyRefunded ? 1 : 0.7}
        disabled={isAlreadyRefunded}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked, isAlreadyRefunded && styles.checkboxDisabled]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
        
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Icon name="package-variant" size={24} color="#6b7280" />
          </View>
        )}
        
        <View style={styles.itemDetails}>
          <Text style={[styles.itemName, isAlreadyRefunded && styles.textMuted]} numberOfLines={2}>
            {item.product_name}
          </Text>
          {variantName ? (
            <Text style={[styles.variantName, isAlreadyRefunded && styles.textMuted]} numberOfLines={1}>
              {variantName}
            </Text>
          ) : null}
          <Text style={[styles.itemShop, isAlreadyRefunded && styles.textMuted]}>
            {sellerDisplay}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={[styles.itemQuantity, isAlreadyRefunded && styles.textMuted]}>Qty: {item.quantity}</Text>
            <Text style={[styles.itemPrice, isAlreadyRefunded && styles.textMuted]}>{formatCurrency(item.price)} each</Text>
          </View>
          {item.remarks && (
            <Text style={[styles.itemRemarks, isAlreadyRefunded && styles.textMuted]} numberOfLines={1}>{item.remarks}</Text>
          )}
        </View>
        
        <View style={styles.itemTotal}>
          <Text style={[styles.itemTotalText, isAlreadyRefunded && styles.textMuted]}>{formatCurrency(item.subtotal)}</Text>
          {isSelected && !isAlreadyRefunded && (
            <View style={styles.quantityControl}>
              <TouchableOpacity
                onPress={() => updateQuantity(item.checkout_id, refundQty - 1)}
                disabled={refundQty <= 1}
                style={styles.qtyButton}
              >
                <Icon name="minus" size={16} color={refundQty <= 1 ? '#ccc' : '#4f46e5'} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{refundQty}</Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.checkout_id, refundQty + 1)}
                disabled={refundQty >= item.quantity}
                style={styles.qtyButton}
              >
                <Icon name="plus" size={16} color={refundQty >= item.quantity ? '#ccc' : '#4f46e5'} />
              </TouchableOpacity>
            </View>
          )}
          {isAlreadyRefunded && <Badge variant="disabled">Refund requested</Badge>}
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
        {isSelected && <Icon name="check-circle" size={24} color="#10b981" />}
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
        {isSelected && <Icon name="check-circle" size={24} color="#10b981" />}
      </TouchableOpacity>
    );
  };

  const renderPaymentDetails = () => {
    if (!selectedRefundMethod) return null;

    switch (selectedRefundMethod.type) {
      case 'wallet':
        if (loadingSaved) {
          return (
            <View style={[styles.paymentDetailsCard, styles.walletCard]}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Loading your e-wallets...</Text>
            </View>
          );
        }
        if (savedEwallets.length === 0) {
          return (
            <View style={[styles.paymentDetailsCard, styles.walletCard]}>
              <View style={styles.paymentDetailsHeader}>
                <Icon name="wallet-outline" size={20} color="#1e40af" />
                <Text style={styles.paymentDetailsTitle}>E-Wallet Details</Text>
              </View>
              <View style={styles.infoBox}>
                <Icon name="information-outline" size={16} color="#1e40af" />
                <Text style={styles.infoBoxText}>You don't have any saved e-wallet yet. Please add one first.</Text>
              </View>
              <TouchableOpacity style={styles.addWalletButton} onPress={() => router.push('/customer/create/add-payment-method')}>
                <Icon name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addWalletButtonText}>Add E-Wallet</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={[styles.paymentDetailsCard, styles.walletCard]}>
            <View style={styles.paymentDetailsHeader}>
              <Icon name="wallet-outline" size={20} color="#1e40af" />
              <Text style={styles.paymentDetailsTitle}>Select E-Wallet</Text>
            </View>
            {!selectedWalletId ? (
              <TouchableOpacity style={styles.selectWalletButton} onPress={() => setShowWalletSelectionModal(true)}>
                <Text style={styles.selectWalletButtonText}>Choose a saved e-wallet</Text>
                <Icon name="chevron-down" size={20} color="#4f46e5" />
              </TouchableOpacity>
            ) : (
              <View style={styles.selectedWalletContainer}>
                <View style={styles.selectedWalletInfo}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <View>
                    <Text style={styles.selectedWalletProvider}>
                      {savedEwallets.find(m => m.payment_id === selectedWalletId)?.payment_method === 'gcash' ? 'GCash' : 'PayMaya'}
                    </Text>
                    <Text style={styles.selectedWalletDetails}>
                      {savedEwallets.find(m => m.payment_id === selectedWalletId)?.account_name}
                    </Text>
                    <Text style={styles.selectedWalletDetails}>
                      {savedEwallets.find(m => m.payment_id === selectedWalletId)?.display_number || 
                       savedEwallets.find(m => m.payment_id === selectedWalletId)?.account_number}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setSelectedWalletId(null); setEWalletDetails({ provider: '', accountName: '', accountNumber: '', contactNumber: '' }); }}>
                  <Icon name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'bank':
        if (loadingBanks) {
          return (
            <View style={[styles.paymentDetailsCard, styles.bankCard]}>
              <ActivityIndicator size="small" color="#166534" />
              <Text style={styles.loadingText}>Loading your bank accounts...</Text>
            </View>
          );
        }
        if (savedBanks.length === 0) {
          return (
            <View style={[styles.paymentDetailsCard, styles.bankCard]}>
              <View style={styles.paymentDetailsHeader}>
                <Icon name="credit-card-outline" size={20} color="#166534" />
                <Text style={styles.paymentDetailsTitle}>Bank Account Details</Text>
              </View>
              <View style={styles.infoBox}>
                <Icon name="information-outline" size={16} color="#166534" />
                <Text style={styles.infoBoxText}>You don't have any saved bank account yet. Please add one first.</Text>
              </View>
              <TouchableOpacity style={styles.addWalletButton} onPress={() => router.push('/customer/create/add-payment-method')}>
                <Icon name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addWalletButtonText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={[styles.paymentDetailsCard, styles.bankCard]}>
            <View style={styles.paymentDetailsHeader}>
              <Icon name="credit-card-outline" size={20} color="#166534" />
              <Text style={styles.paymentDetailsTitle}>Select Bank Account</Text>
            </View>
            {!selectedBankId ? (
              <TouchableOpacity style={styles.selectWalletButton} onPress={() => setShowBankSelectionModal(true)}>
                <Text style={styles.selectWalletButtonText}>Choose a saved bank account</Text>
                <Icon name="chevron-down" size={20} color="#4f46e5" />
              </TouchableOpacity>
            ) : (
              <View style={styles.selectedWalletContainer}>
                <View style={styles.selectedWalletInfo}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <View>
                    <Text style={styles.selectedWalletProvider}>
                      {savedBanks.find(b => b.payment_id === selectedBankId)?.bank_name || 'Bank Account'}
                    </Text>
                    <Text style={styles.selectedWalletDetails}>
                      {savedBanks.find(b => b.payment_id === selectedBankId)?.account_name}
                    </Text>
                    <Text style={styles.selectedWalletDetails}>
                      {savedBanks.find(b => b.payment_id === selectedBankId)?.account_number}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setSelectedBankId(null); setBankDetails({ bankName: '', accountName: '', accountNumber: '', accountType: '', branch: '' }); }}>
                  <Icon name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.infoBox}>
              <Icon name="bell-outline" size={16} color="#166534" />
              <Text style={styles.infoBoxText}>
                Refunds will be transferred to this bank account. Processing may take 3-5 business days. 
                <Text style={styles.boldText}> A bank transfer fee of ₱50 will be deducted from the refund amount.</Text>
              </Text>
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
              Vouchers will be sent directly to your notifications and email once approved. No additional details required.
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
              A replacement item will be shipped once we receive and verify the returned item. Please allow 7-14 business days for processing.
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
                <Icon name="package-variant" size={14} color="#6b7280" />
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

          {order.delivery_address && (
            <View style={styles.deliveryInfo}>
              <Icon name="map-marker-outline" size={16} color="#6b7280" />
              <View style={styles.deliveryInfoContent}>
                <Text style={styles.deliveryInfoTitle}>Delivery Address</Text>
                <Text style={styles.deliveryInfoText}>{order.delivery_address}</Text>
                {order.delivery_method && <Text style={styles.deliveryMethodText}>Method: {order.delivery_method}</Text>}
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
                {selectedItems.length === order.items.filter(i => !refundedCheckoutIds.has(i.checkout_id)).length ? 'Deselect All' : 'Select All'}
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
              Order Total: {formatCurrency(order.total_amount)}
            </Text>
          </View>
        )}
       
        </View>

        {/* Refund Type */}
        <TouchableOpacity style={styles.selectionCard} onPress={() => setShowRefundTypeModal(true)}>
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
                  {selectedRefundType.id === 'return_item' ? 'Full Refund' : selectedRefundType.id === 'keep_item' ? 'Partial Refund' : 'Replacement'}
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
          <TouchableOpacity style={styles.selectionCard} onPress={() => setShowMethodModal(true)}>
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
        <TouchableOpacity style={styles.selectionCard} onPress={() => setShowReasonModal(true)}>
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

        {/* Upload Media */}
        <View style={styles.card}>
          <Text style={styles.uploadTitle}>Upload Evidence (Optional)</Text>
          <Text style={styles.uploadHint}>Max 4 files (images/videos), 100MB each</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickMedia}>
              <Icon name="camera-plus-outline" size={32} color="#9ca3af" />
              <Text style={styles.uploadButtonText}>Add Media</Text>
              <Text style={styles.uploadCounter}>{mediaFiles.length}/4</Text>
            </TouchableOpacity>
            
            {mediaUris.map((uri, index) => {
              const file = mediaFiles[index];
              const isVideo = file?.type === 'video' || (file?.mimeType && file.mimeType.startsWith('video/'));
              return (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.uploadedImage} />
                  {isVideo && (
                    <View style={styles.videoOverlay}>
                      <Icon name="play-circle" size={32} color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeMedia(index)}>
                    <Icon name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>
                      {isVideo ? 'Video' : 'Image'} {index + 1}
                    </Text>
                  </View>
                </View>
              );
            })}
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
      <Modal visible={showRefundTypeModal} animationType="slide" transparent onRequestClose={() => setShowRefundTypeModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Refund Type</Text>
              <TouchableOpacity onPress={() => setShowRefundTypeModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList data={refundTypes} renderItem={({ item }) => renderRefundType(item)} keyExtractor={(item) => item.id} />
          </View>
        </View>
      </Modal>

      <Modal visible={showMethodModal} animationType="slide" transparent onRequestClose={() => setShowMethodModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Refund Method</Text>
              <TouchableOpacity onPress={() => setShowMethodModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList data={getAvailableMethods()} renderItem={({ item }) => renderRefundMethod(item)} keyExtractor={(item) => item.id} />
          </View>
        </View>
      </Modal>

      <Modal visible={showWalletSelectionModal} animationType="slide" transparent onRequestClose={() => setShowWalletSelectionModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select E-Wallet</Text>
              <TouchableOpacity onPress={() => setShowWalletSelectionModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList
              data={savedEwallets}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.walletItem, selectedWalletId === item.payment_id && styles.walletItemSelected]} onPress={() => { setSelectedWalletId(item.payment_id); setShowWalletSelectionModal(false); }}>
                  <View style={styles.walletItemIcon}><Icon name={item.payment_method === 'gcash' ? 'cellphone' : 'credit-card'} size={24} color="#4f46e5" /></View>
                  <View style={styles.walletItemContent}>
                    <Text style={styles.walletItemProvider}>{item.payment_method === 'gcash' ? 'GCash' : 'PayMaya'}</Text>
                    <Text style={styles.walletItemName}>{item.account_name}</Text>
                    <Text style={styles.walletItemNumber}>{item.display_number || item.account_number}</Text>
                  </View>
                  {selectedWalletId === item.payment_id && <Icon name="check-circle" size={24} color="#10b981" />}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.payment_id}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.addNewButton} onPress={() => { setShowWalletSelectionModal(false); router.push('/customer/create/add-payment-method'); }}>
                <Icon name="plus-circle" size={20} color="#4f46e5" />
                <Text style={styles.addNewButtonText}>Add New E-Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBankSelectionModal} animationType="slide" transparent onRequestClose={() => setShowBankSelectionModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank Account</Text>
              <TouchableOpacity onPress={() => setShowBankSelectionModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList
              data={savedBanks}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.walletItem, selectedBankId === item.payment_id && styles.walletItemSelected]} onPress={() => { setSelectedBankId(item.payment_id); setShowBankSelectionModal(false); }}>
                  <View style={styles.walletItemIcon}><Icon name="bank-outline" size={24} color="#4f46e5" /></View>
                  <View style={styles.walletItemContent}>
                    <Text style={styles.walletItemProvider}>{item.bank_name || 'Bank Account'}</Text>
                    <Text style={styles.walletItemName}>{item.account_name}</Text>
                    <Text style={styles.walletItemNumber}>{item.account_number}</Text>
                  </View>
                  {selectedBankId === item.payment_id && <Icon name="check-circle" size={24} color="#10b981" />}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.payment_id}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.addNewButton} onPress={() => { setShowBankSelectionModal(false); router.push('/customer/create/add-payment-method'); }}>
                <Icon name="plus-circle" size={20} color="#4f46e5" />
                <Text style={styles.addNewButtonText}>Add New Bank Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReasonModal} animationType="slide" transparent onRequestClose={() => setShowReasonModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Return Reason</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList
              data={returnReasons}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.reasonItem} onPress={() => {
                  setReturnReason(item);
                  if (item === 'Other') {
                    Alert.prompt('Specify Reason', 'Please specify your reason for return:', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'OK', onPress: (reason?: string) => { if (reason) setCustomReason(reason); } }
                    ]);
                  }
                  setShowReasonModal(false);
                }}>
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
  // ... (keep all existing styles, but ensure the variantName style is present)
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  message: { fontSize: 16, color: '#6b7280' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { padding: 4 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  headerRight: { width: 32 },
  statusBadgeContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusCompleted: { backgroundColor: '#d1fae5' },
  statusDelivered: { backgroundColor: '#dbeafe' },
  statusShipped: { backgroundColor: '#e0e7ff' },
  statusProcessing: { backgroundColor: '#fef3c7' },
  statusPending: { backgroundColor: '#f3f4f6' },
  statusCancelled: { backgroundColor: '#fee2e2' },
  statusDefault: { backgroundColor: '#f3f4f6' },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  statusCompletedText: { color: '#059669' },
  statusDeliveredText: { color: '#2563eb' },
  statusShippedText: { color: '#4f46e5' },
  statusProcessingText: { color: '#b45309' },
  statusPendingText: { color: '#6b7280' },
  statusCancelledText: { color: '#dc2626' },
  statusDefaultText: { color: '#6b7280' },
  scrollView: { flex: 1, marginBottom: 80 },
  progressSection: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  progressBarContainer: { marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f46e5' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 12, color: '#9ca3af' },
  progressLabelActive: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }, android: { elevation: 2 } }) },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  orderInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  orderInfoItem: { width: '47%' },
  orderInfoLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  orderInfoLabelText: { fontSize: 11, color: '#6b7280' },
  orderInfoValue: { fontSize: 13, fontWeight: '500', color: '#111827', marginLeft: 18 },
  paymentStatusPaid: { color: '#059669' },
  deliveryInfo: { flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, gap: 8 },
  deliveryInfoContent: { flex: 1 },
  deliveryInfoTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  deliveryInfoText: { fontSize: 12, color: '#4b5563', lineHeight: 16 },
  deliveryMethodText: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  selectAllText: { fontSize: 13, color: '#4f46e5', fontWeight: '500' },
  itemsList: { gap: 8 },
  orderItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff' },
  orderItemSelected: { borderColor: '#4f46e5', backgroundColor: '#f5f3ff' },
  orderItemDisabled: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', opacity: 0.7 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  checkboxDisabled: { borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
  itemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#f3f4f6' },
  itemImagePlaceholder: { width: 60, height: 60, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 2 },
  variantName: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 2 },
  itemShop: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  itemQuantity: { fontSize: 12, color: '#6b7280' },
  itemPrice: { fontSize: 12, color: '#6b7280' },
  itemRemarks: { fontSize: 11, color: '#2563eb', fontStyle: 'italic', marginTop: 2 },
  itemTotal: { marginLeft: 8, alignItems: 'flex-end', gap: 4 },
  itemTotalText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  qtyButton: { padding: 4, backgroundColor: '#f3f4f6', borderRadius: 4, width: 28, alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', color: '#111827', minWidth: 20, textAlign: 'center' },
  textMuted: { color: '#9ca3af' },
  selectedSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  selectedCount: { fontSize: 14, color: '#6b7280' },
  selectedAmount: { fontSize: 16, fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeinfo: { backgroundColor: '#dbeafe' },
  badgesuccess: { backgroundColor: '#d1fae5' },
  badgewarning: { backgroundColor: '#fef3c7' },
  badgedefault: { backgroundColor: '#f3f4f6' },
  badgepurple: { backgroundColor: '#f3e8ff' },
  badgedisabled: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  badgeTextinfo: { color: '#1e40af' },
  badgeTextsuccess: { color: '#065f46' },
  badgeTextwarning: { color: '#b45309' },
  badgeTextdefault: { color: '#4b5563' },
  badgeTextpurple: { color: '#6b21a8' },
  badgeTextdisabled: { color: '#6b7280' },
  selectionCard: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }, android: { elevation: 2 } }) },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  selectionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedOption: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  selectedOptionText: { fontSize: 14, color: '#111827', flex: 1 },
  placeholderText: { fontSize: 14, color: '#9ca3af', flex: 1 },
  refundTypeInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  refundTypeInfoText: { fontSize: 12, color: '#4b5563', lineHeight: 18 },
  boldText: { fontWeight: '700', color: '#111827' },
  refundMethodInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' },
  refundMethodInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refundMethodInfoLabel: { fontSize: 12, color: '#6b7280' },
  refundMethodInfoValue: { fontSize: 12, fontWeight: '500', color: '#ef4444' },
  refundMethodInfoNet: { fontSize: 14, fontWeight: '700', color: '#059669' },
  refundBreakdownCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  refundBreakdownTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  breakdownLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  breakdownSubLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  breakdownAmount: { fontSize: 16, fontWeight: '600', color: '#111827' },
  breakdownFee: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  separator: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  finalAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalAmountLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  finalAmount: { fontSize: 20, fontWeight: '700', color: '#10b981' },
  partialAmountInfo: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  partialAmountTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  partialAmountGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  partialAmountItem: { alignItems: 'center', flex: 1 },
  partialAmountLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  partialAmountValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  partialAmountMax: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  partialAmountRequest: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, marginTop: 8, backgroundColor: '#f9fafb' },
  currencySymbol: { fontSize: 16, color: '#374151', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 12 },
  amountError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  paymentDetailsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  walletCard: { borderColor: '#bfdbfe' },
  bankCard: { borderColor: '#bbf7d0' },
  remittanceCard: { borderColor: '#fed7aa' },
  paymentDetailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  paymentDetailsTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  infoBox: { flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  infoBoxText: { flex: 1, fontSize: 12, color: '#4b5563', lineHeight: 16 },
  formGrid: { gap: 12 },
  inputGroup: { width: '100%' },
  inputGroupFull: { width: '100%' },
  inputLabel: { fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1 },
  cashOnHandCard: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  voucherCard: { borderColor: '#e9d5ff', backgroundColor: '#faf5ff' },
  replacementCard: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoCardTitle: { fontSize: 16, fontWeight: '600' },
  infoCardText: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  selectedReasonBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', padding: 8, borderRadius: 8, marginTop: 12, gap: 6 },
  selectedReasonText: { fontSize: 12, color: '#065f46', flex: 1 },
  textAreaTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  textArea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, backgroundColor: '#f9fafb' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  uploadHint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  imageScrollView: { flexDirection: 'row' },
  uploadButton: { width: 100, height: 100, borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#f9fafb' },
  uploadButtonText: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  uploadCounter: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  imageContainer: { position: 'relative', marginRight: 12 },
  uploadedImage: { width: 100, height: 100, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } }) },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  imageOverlayText: { color: '#fff', fontSize: 9, textAlign: 'center' },
  policyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 100, borderWidth: 1, borderColor: '#e5e7eb' },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  policyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  policyPoints: { marginLeft: 4 },
  policyPoint: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  policyText: { fontSize: 13, color: '#4b5563', flex: 1, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 4 } }) },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  errorBannerText: { fontSize: 13, color: '#991b1b', flex: 1 },
  submitButton: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  refundTypeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  refundTypeCardSelected: { backgroundColor: '#f5f3ff' },
  refundTypeIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  refundTypeIconContainerSelected: { backgroundColor: '#4f46e5' },
  refundTypeContent: { flex: 1 },
  refundTypeLabel: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 },
  refundTypeLabelSelected: { color: '#4f46e5' },
  refundTypeDescription: { fontSize: 13, color: '#6b7280' },
  refundTypeDescriptionSelected: { color: '#4f46e5' },
  refundMethodCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  refundMethodCardSelected: { backgroundColor: '#f5f3ff' },
  refundMethodIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  refundMethodIconContainerSelected: { backgroundColor: '#4f46e5' },
  refundMethodContent: { flex: 1 },
  refundMethodLabel: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 },
  refundMethodLabelSelected: { color: '#4f46e5' },
  refundMethodDescription: { fontSize: 13, color: '#6b7280' },
  refundMethodDescriptionSelected: { color: '#4f46e5' },
  reasonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reasonText: { fontSize: 15, color: '#374151' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  goBackButton: { backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  addWalletButton: { backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, marginTop: 12 },
  addWalletButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  selectWalletButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, backgroundColor: '#f9fafb' },
  selectWalletButtonText: { fontSize: 14, color: '#374151' },
  selectedWalletContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginTop: 8 },
  selectedWalletInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  selectedWalletProvider: { fontSize: 14, fontWeight: '600', color: '#111827' },
  selectedWalletDetails: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  walletItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  walletItemSelected: { backgroundColor: '#f5f3ff' },
  walletItemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  walletItemContent: { flex: 1 },
  walletItemProvider: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  walletItemName: { fontSize: 14, color: '#4b5563' },
  walletItemNumber: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  addNewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 },
  addNewButtonText: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
});

