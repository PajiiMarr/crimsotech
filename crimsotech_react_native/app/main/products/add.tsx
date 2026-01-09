import { useAuth } from '@/contexts/AuthContext';
import { getSellerProducts } from '@/utils/api';
import { API_CONFIG } from '@/utils/config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const MAX_LISTINGS = 5;

type FormState = {
  name: string;
  price: string;
  quantity: string;
  condition: string;
  category: string;
  description: string;
};

type Listing = {
  id: string;
};

export default function AddPersonalProductScreen() {
  const { user } = useAuth();
  const userId = useMemo(() => {
    if (!user) return null;
    return (user as any).user_id || (user as any).id || null;
  }, [user]);

  const [form, setForm] = useState<FormState>({
    name: '',
    price: '',
    quantity: '1',
    condition: 'Excellent',
    category: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  const loadListings = async () => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const resp = await getSellerProducts(userId);
      const results = Array.isArray(resp?.results) ? resp.results : resp?.data || resp || [];
      const mapped: Listing[] = (results || []).map((item: any) => ({ id: item.id?.toString() || Math.random().toString() }));
      setListings(mapped);
    } catch (error) {
      console.error('Failed to load seller listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      router.replace('/(auth)/login');
    }
  }, [userId]);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!userId) {
      router.replace('/(auth)/login');
      return;
    }

    if (listings.length >= MAX_LISTINGS) {
      Alert.alert(
        'Limit reached', 
        `You can list up to ${MAX_LISTINGS} items as a personal seller.\n\nWant to list unlimited items? Create a shop!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Shop', onPress: () => router.push('/setup/create-shop') }
        ]
      );
      return;
    }

    if (!form.name.trim() || !form.price.trim() || !form.description.trim()) {
      Alert.alert('Missing fields', 'Name, price, and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('description', form.description.trim());
      payload.append('price', form.price.trim());
      payload.append('quantity', form.quantity.trim() || '1');
      payload.append('condition', form.condition);
      // Don't send category for personal listings - backend will handle it
      // payload.append('category', form.category || 'Misc');
      payload.append('customer_id', userId);
      payload.append('upload_status', 'draft');
      payload.append('status', 'inactive');

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/seller-products/`, {
        method: 'POST',
        body: payload,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error || data?.details || 'Unable to save your listing right now.';
        console.error('Submit error:', data);
        Alert.alert('Save failed', typeof message === 'string' ? message : JSON.stringify(message));
        return;
      }

      Alert.alert('Saved', 'Your item is submitted. Pending approval.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Submit listing error:', error);
      Alert.alert('Network error', 'Could not submit your listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add product</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>Create a listing</Text>
          <Text style={styles.heroSubtitle}>Limit {listings.length}/{MAX_LISTINGS}. Items stay hidden from the main marketplace.</Text>
        </View>
        <MaterialIcons name="sell" size={32} color="#fff" />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Checking your slots…</Text>
        </View>
      ) : (
        <>
          <View style={styles.formRow}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="What are you selling?"
              value={form.name}
              onChangeText={(text) => onChange('name', text)}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Price (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={form.price}
              onChangeText={(text) => onChange('price', text)}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.formRow, styles.half]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={(text) => onChange('quantity', text)}
              />
            </View>
            <View style={[styles.formRow, styles.half]}>
              <Text style={styles.label}>Condition</Text>
              <TextInput
                style={styles.input}
                value={form.condition}
                onChangeText={(text) => onChange('condition', text)}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Phones, Laptops"
              value={form.category}
              onChangeText={(text) => onChange('category', text)}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe the item and its condition"
              multiline
              numberOfLines={4}
              value={form.description}
              onChangeText={(text) => onChange('description', text)}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting || listings.length >= MAX_LISTINGS ? styles.submitButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={submitting || listings.length >= MAX_LISTINGS}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit for review</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: isSmallDevice ? 12 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 28,
  },
  hero: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#E2E8F0',
    marginTop: 6,
    lineHeight: 18,
    fontSize: isSmallDevice ? 13 : 14,
  },
  formRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    color: '#475569',
  },
});
