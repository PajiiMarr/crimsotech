// app/seller/pay-boosting.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const PAYMENT_METHODS = [
  { id: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' as const },
  { id: 'maya', label: 'Maya', icon: 'card-outline' as const },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' as const },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' as const },
];

export default function PayBoosting() {
  const { planId, productIds } = useLocalSearchParams<{ planId: string; productIds: string }>();
  const { userId, shopId } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [receipt, setReceipt] = useState<string | null>(null);

  const productIdList = productIds ? productIds.split(',').filter(Boolean) : [];

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const res = await AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`, {
        headers: { 'X-User-Id': userId || '' },
      });
      setPlan(res.data?.plan || res.data);
    } catch {
      Alert.alert('Error', 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setReceipt(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take a photo');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setReceipt(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!receipt) {
      Alert.alert('Required', 'Please upload your payment receipt');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('plan_id', planId || '');
      formData.append('customer_id', userId || '');
      formData.append('shop_id', shopId || '');
      formData.append('payment_method', paymentMethod);
      productIdList.forEach(id => formData.append('product_ids', id));
      formData.append('receipt_image', { uri: receipt, name: 'receipt.jpg', type: 'image/jpeg' } as any);

      await AxiosInstance.post('/seller-boosts/add_receipt/', formData, {
        headers: {
          'X-User-Id': userId || '',
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        'Submitted!',
        'Your boost payment has been submitted for verification. Your products will be boosted once verified.',
        [{ text: 'Done', onPress: () => { router.dismissAll(); router.push('/seller/boosts' as any); } }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to submit payment';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pricePerProduct = Number(plan?.price || 0);
  const totalAmount = pricePerProduct * productIdList.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color="#EE4D2D" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boost Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Plan</Text>
            <Text style={styles.summaryValue}>{plan?.name || 'Boost Plan'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Products Selected</Text>
            <Text style={styles.summaryValue}>{productIdList.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per Product</Text>
            <Text style={styles.summaryValue}>₱{pricePerProduct.toFixed(2)}</Text>
          </View>
          {plan?.duration_days && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Boost Duration</Text>
              <Text style={styles.summaryValue}>{plan.duration_days} days</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodRow, paymentMethod === method.id && styles.methodRowSelected]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons name={method.icon} size={22} color={paymentMethod === method.id ? '#EE4D2D' : '#6B7280'} />
              <Text style={[styles.methodLabel, paymentMethod === method.id && styles.methodLabelSelected]}>
                {method.label}
              </Text>
              <View style={[styles.radioOuter, paymentMethod === method.id && styles.radioOuterSelected]}>
                {paymentMethod === method.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Receipt Upload */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Receipt <Text style={styles.required}>*</Text></Text>
          <Text style={styles.cardSubtitle}>
            Please send payment to our account and upload the receipt for verification
          </Text>

          {receipt ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receipt }} style={styles.receiptImage} resizeMode="cover" />
              <TouchableOpacity style={styles.changeReceiptBtn} onPress={pickReceipt}>
                <Ionicons name="refresh-outline" size={14} color="#EE4D2D" />
                <Text style={styles.changeReceiptText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color="#EE4D2D" />
                <Text style={styles.uploadBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt}>
                <Ionicons name="image-outline" size={24} color="#EE4D2D" />
                <Text style={styles.uploadBtnText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !receipt) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !receipt}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Submit Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  required: { color: '#EF4444' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#1F2937', fontWeight: '500' },
  totalRow: { borderBottomWidth: 0, marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  totalAmount: { fontSize: 17, fontWeight: '800', color: '#EE4D2D' },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  methodRowSelected: { backgroundColor: '#FFF5F5' },
  methodLabel: { flex: 1, fontSize: 14, color: '#374151' },
  methodLabelSelected: { color: '#EE4D2D', fontWeight: '600' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: '#EE4D2D' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EE4D2D' },
  receiptPreview: { alignItems: 'center', gap: 10 },
  receiptImage: { width: '100%', height: 200, borderRadius: 10 },
  changeReceiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeReceiptText: { fontSize: 13, color: '#EE4D2D', fontWeight: '600' },
  uploadBtns: { flexDirection: 'row', gap: 12 },
  uploadBtn: {
    flex: 1, borderWidth: 1, borderColor: '#EE4D2D', borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 20, alignItems: 'center', gap: 8,
  },
  uploadBtnText: { fontSize: 13, color: '#EE4D2D', fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EE4D2D', paddingVertical: 15, borderRadius: 12, gap: 8, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
