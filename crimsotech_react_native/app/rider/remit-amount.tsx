import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

interface UnremittedDelivery {
  delivery_id: string;
  order_amount: number;
  delivery_fee: number;
  total_to_remit: number;
  is_cod: boolean;
}

interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

interface RemitModalProps {
  visible: boolean;
  onClose: () => void;
  availableCOD: number;
  paymentMethods: PaymentMethod[];
  onSuccess: () => void;
  submitting: boolean;
}

function RemitModal({ visible, onClose, availableCOD, paymentMethods, onSuccess, submitting }: RemitModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [proofImage, setProofImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const quickAmounts = [500, 1000, 2000, 5000];

  useEffect(() => {
    if (visible) {
      const defaultMethod = paymentMethods.find((m) => m.is_default);
      setSelectedMethodId(defaultMethod?.payment_id || paymentMethods[0]?.payment_id || '');
      setAmount('');
      setProofImage(null);
    }
  }, [visible, paymentMethods]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProofImage(result.assets[0]);
    }
  };

  const submitRemit = () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid remittance amount.');
      return;
    }
    if (parsedAmount > availableCOD) {
      Alert.alert('Amount Exceeded', 'You cannot remit more than your Cash on Hand (COD).');
      return;
    }
    if (!selectedMethodId) {
      Alert.alert('Method Required', 'Please select a payment method.');
      return;
    }
    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload a proof of receipt.');
      return;
    }

    onSuccess(parsedAmount, selectedMethodId, proofImage);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Remit Cash</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            Cash on Hand (COD): PHP {availableCOD.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setAmount(String(value))}
                style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, marginBottom: 8 }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>PHP {value}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setAmount(String(availableCOD))}
              style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, marginBottom: 8 }}
            >
              <Text style={{ color: '#EA580C', fontWeight: '600', fontSize: 12 }}>Remit All</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Payment Method</Text>
          <ScrollView style={{ maxHeight: 180, marginBottom: 10 }}>
            {paymentMethods.length === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push('/rider/payment-methods');
                }}
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 10, padding: 12 }}
              >
                <Text style={{ fontSize: 13, color: '#374151', textAlign: 'center' }}>No payment methods yet. Tap to add one.</Text>
              </TouchableOpacity>
            ) : (
              paymentMethods.map((m) => (
                <TouchableOpacity
                  key={m.payment_id}
                  onPress={() => setSelectedMethodId(m.payment_id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedMethodId === m.payment_id ? '#EA580C' : '#E5E7EB',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: selectedMethodId === m.payment_id ? '#FFF7ED' : 'white',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: selectedMethodId === m.payment_id ? '#EA580C' : '#111827' }}>{m.account_name}</Text>
                  <Text style={{ fontSize: 12, color: selectedMethodId === m.payment_id ? '#EA580C' : '#6B7280', marginTop: 2 }}>
                    {(m.bank_name || m.payment_method).toUpperCase()} | {m.account_number}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Proof of Receipt</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 10,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F9FAFB',
              minHeight: 120,
              marginBottom: 10,
              borderStyle: proofImage ? 'solid' : 'dashed',
            }}
          >
            {proofImage ? (
              <Image source={{ uri: proofImage.uri }} style={{ width: '100%', height: 150, borderRadius: 8 }} resizeMode="contain" />
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 13 }}>Tap to upload proof of receipt</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitRemit}
            disabled={submitting}
            style={{ backgroundColor: '#EA580C', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Submit Remittance</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function RemitAmount() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [amountToRemit, setAmountToRemit] = useState(0);
  const [unremittedDeliveries, setUnremittedDeliveries] = useState<UnremittedDelivery[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchUnremittedBalance = async () => {
    try {
      setLoading(true);
      
      const [historyRes, profileRes] = await Promise.all([
        AxiosInstance.get('/rider-history/unremitted_amounts/', {
          headers: { 'X-User-Id': userId },
        }),
        AxiosInstance.get('/profile/', {
          headers: { 'X-User-Id': userId },
        })
      ]);

      if (historyRes.data?.success) {
        setAmountToRemit(historyRes.data.summary?.total_unremitted_amount || 0);
        setDeliveredCount(historyRes.data.summary?.total_deliveries || 0);
        setTotalCollected(historyRes.data.summary?.total_cod_order_amount || 0);
        setTotalEarnings(historyRes.data.summary?.total_delivery_fees || 0);
        setUnremittedDeliveries(historyRes.data.unremitted_deliveries || []);
      } else {
        setAmountToRemit(0);
        setDeliveredCount(0);
        setTotalCollected(0);
        setTotalEarnings(0);
        setUnremittedDeliveries([]);
      }
      
      if (profileRes.data?.success && profileRes.data.profile?.payment_methods) {
        setPaymentMethods(profileRes.data.profile.payment_methods);
      } else {
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error('Failed to load remit data:', error);
      setAmountToRemit(0);
      setDeliveredCount(0);
      setTotalCollected(0);
      setTotalEarnings(0);
      setUnremittedDeliveries([]);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUnremittedBalance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUnremittedBalance();
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleRemitSubmit = async (amount: number, method: string, proofImage: any) => {
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      unremittedDeliveries.forEach(d => formData.append('delivery_ids[]', d.delivery_id));
      formData.append('method', method);
      formData.append('amount', String(amount));
      
      if (proofImage) {
        formData.append('proof_image', {
          uri: proofImage.uri,
          type: proofImage.mimeType || 'image/jpeg',
          name: proofImage.uri.split('/').pop() || 'proof.jpg',
        } as any);
      }

      const res = await AxiosInstance.post(
        '/rider-history/submit_manual_remittance/',
        formData,
        { 
          headers: { 
            'X-User-Id': userId,
            'Content-Type': 'multipart/form-data',
          } 
        },
      );
      
      if (res.data?.success) {
        setReferenceNo(res.data.reference_number || `REM${Math.floor(100000 + Math.random() * 900000)}`);
        setShowRemitModal(false);
        setShowSuccess(true);
      } else {
        Alert.alert('Failed', res.data?.error || 'Could not submit remittance.');
      }
    } catch (error: any) {
      Alert.alert('Failed', error?.response?.data?.error || 'Could not submit remittance right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: '#EA580C', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Remit Amount</Text>
          <Text style={{ color: '#FED7AA', fontSize: 12, marginTop: 2 }}>Submit your daily cash remittance</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 40 }} />
        ) : amountToRemit <= 0 ? (
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#16A34A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 10 }}>No amount to remit today</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
              Great job. You have no pending remittance for today.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>Unremitted Balance</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#EA580C', marginTop: 2 }}>{formatCurrency(amountToRemit)}</Text>

              <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 }} />

              <View style={{ marginTop: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Pending Deliveries Summary</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Unremitted Orders: {deliveredCount}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Total COD Collected: {formatCurrency(totalCollected)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowRemitModal(true)}
              style={{ backgroundColor: '#EA580C', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Remit Cash</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <RemitModal
        visible={showRemitModal}
        onClose={() => setShowRemitModal(false)}
        availableCOD={amountToRemit}
        paymentMethods={paymentMethods}
        onSuccess={handleRemitSubmit}
        submitting={submitting}
      />

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 18, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={46} color="#16A34A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 10 }}>Remittance Submitted</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Reference: {referenceNo}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowSuccess(false);
                router.push('/rider/earnings');
              }}
              style={{ marginTop: 14, backgroundColor: '#EA580C', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
