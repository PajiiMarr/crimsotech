// app/seller/file-dispute.tsx
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const DISPUTE_REASONS = [
  'Item not returned',
  'Item returned damaged',
  'Incorrect item returned',
  'Refund amount incorrect',
  'Fraudulent claim',
  'Other',
];

export default function FileDispute() {
  const { refundId } = useLocalSearchParams<{ refundId: string }>();
  const { userId } = useAuth();

  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setEvidence(prev => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a dispute reason');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the dispute');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('dispute_reason', selectedReason);
      formData.append('description', description);
      evidence.forEach((uri, i) => {
        formData.append('file', { uri, name: `evidence_${i}.jpg`, type: 'image/jpeg' } as any);
      });

      await AxiosInstance.post(`/return-refund/${refundId}/file_dispute/`, formData, {
        headers: {
          'X-User-Id': userId || '',
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Dispute Filed', 'Your dispute has been submitted. Our team will review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to file dispute';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File Dispute</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          <Text style={styles.noticeText}>
            You are filing a dispute for refund <Text style={{ fontWeight: '700' }}>#{String(refundId).slice(0, 8).toUpperCase()}</Text>. 
            Our support team will review and contact you within 3-5 business days.
          </Text>
        </View>

        {/* Reason */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dispute Reason <Text style={styles.required}>*</Text></Text>
          <View style={styles.reasonsGrid}>
            {DISPUTE_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonChip, selectedReason === reason && styles.reasonChipActive]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.reasonChipText, selectedReason === reason && styles.reasonChipTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue in detail. Include relevant order details, dates, and what you expect to happen."
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* Evidence */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evidence Photos (optional)</Text>
          <Text style={styles.cardSubtitle}>Upload up to 5 photos to support your dispute</Text>
          <View style={styles.evidenceRow}>
            {evidence.map((uri, i) => (
              <View key={i} style={styles.evidenceThumb}>
                <Image source={{ uri }} style={styles.thumbImage} />
                <TouchableOpacity style={styles.removeThumb} onPress={() => removeEvidence(i)}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {evidence.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={24} color="#6B7280" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !selectedReason || !description.trim()) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedReason || !description.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  noticeText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 19 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  required: { color: '#EF4444' },
  reasonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  reasonChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  reasonChipActive: { backgroundColor: '#FEE2E2', borderColor: '#EE4D2D' },
  reasonChipText: { fontSize: 13, color: '#374151' },
  reasonChipTextActive: { color: '#EE4D2D', fontWeight: '600' },
  textArea: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1F2937', minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  evidenceThumb: { position: 'relative' },
  thumbImage: { width: 72, height: 72, borderRadius: 8 },
  removeThumb: { position: 'absolute', top: -6, right: -6 },
  addPhotoBtn: {
    width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addPhotoText: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EE4D2D', paddingVertical: 15, borderRadius: 12, gap: 8, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
