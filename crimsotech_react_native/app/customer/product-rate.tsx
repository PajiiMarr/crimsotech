import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Star } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function ProductRatePage() {
  const params = useLocalSearchParams<{ productId?: string; orderId?: string; productName?: string }>();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const productLabel = useMemo(() => params.productName || params.productId || 'Product', [params.productName, params.productId]);

  const submitReview = () => {
    if (!rating) {
      Alert.alert('Rating Required', 'Please select a star rating first.');
      return;
    }

    Alert.alert('Submitted', 'Your product review has been recorded.');
    if (params.orderId) {
      router.push(`/customer/view-completed-order?orderId=${params.orderId}&productId=${params.productId || ''}`);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <Text style={styles.title}>Rate Product</Text>
          <Text style={styles.subtitle}>{productLabel}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>How was your order?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = value <= rating;
                return (
                  <TouchableOpacity key={value} onPress={() => setRating(value)} style={styles.starButton}>
                    <Star size={28} color={selected ? '#F59E0B' : '#D1D5DB'} fill={selected ? '#F59E0B' : 'transparent'} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Write a short review</Text>
            <TextInput
              style={styles.input}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
              placeholder="Share your experience"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 13 },
  card: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600' },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  starButton: { marginRight: 8, paddingVertical: 6 },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
