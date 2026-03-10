// app/seller/create-gift.tsx
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];
const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];

export default function CreateGift() {
  const { userId } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('New');
  const [quantity, setQuantity] = useState('1');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...uris].slice(0, 6));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Product name is required'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Description is required'); return; }
    if (!quantity || Number(quantity) < 1) { Alert.alert('Required', 'Quantity must be at least 1'); return; }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('customer_id', userId || '');
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('condition', condition);
      formData.append('quantity', quantity);
      formData.append('upload_status', 'published');
      if (weight) { formData.append('weight', weight); formData.append('weight_unit', weightUnit); }

      images.forEach((uri, i) => {
        formData.append('files', { uri, name: `gift_${i}.jpg`, type: 'image/jpeg' } as any);
      });

      await AxiosInstance.post('/seller-gift/create_gift/', formData, {
        headers: {
          'X-User-Id': userId || '',
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Gift product created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to create gift product';
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
        <Text style={styles.headerTitle}>Create Gift Product</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Images */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Images</Text>
          <Text style={styles.cardSubtitle}>Add up to 6 photos of your gift item</Text>
          <View style={styles.imagesRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageTile}>
                <Image source={{ uri }} style={styles.tileImage} />
                <TouchableOpacity style={styles.removeTile} onPress={() => removeImage(i)}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
                {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
              </View>
            ))}
            {images.length < 6 && (
              <TouchableOpacity style={styles.addTile} onPress={pickImages}>
                <Ionicons name="camera-outline" size={26} color="#9CA3AF" />
                <Text style={styles.addTileText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>

          <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter gift product name"
            value={name}
            onChangeText={setName}
            maxLength={200}
          />

          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the gift item (condition, brand, specs, etc.)"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
          />

          <Text style={styles.label}>Condition</Text>
          <View style={styles.chipsRow}>
            {CONDITIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, condition === c && styles.chipActive]}
                onPress={() => setCondition(c)}
              >
                <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inventory */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory & Shipping</Text>

          <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={styles.label}>Weight (optional)</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <View style={styles.unitPicker}>
              {WEIGHT_UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, weightUnit === u && styles.unitChipActive]}
                  onPress={() => setWeightUnit(u)}
                >
                  <Text style={[styles.unitChipText, weightUnit === u && styles.unitChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !name.trim() || !description.trim()) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !name.trim() || !description.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="gift-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Create Gift Product</Text>
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
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#FEE2E2', borderColor: '#EE4D2D' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#EE4D2D', fontWeight: '600' },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  imageTile: { position: 'relative' },
  tileImage: { width: 80, height: 80, borderRadius: 8 },
  removeTile: { position: 'absolute', top: -6, right: -6 },
  mainBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  addTile: {
    width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  addTileText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  weightRow: { flexDirection: 'row', alignItems: 'center' },
  unitPicker: { flexDirection: 'row', gap: 5 },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  unitChipActive: { backgroundColor: '#EE4D2D', borderColor: '#EE4D2D' },
  unitChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  unitChipTextActive: { color: '#fff' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EE4D2D', paddingVertical: 15, borderRadius: 12, gap: 8, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

