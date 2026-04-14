// app/seller/create-voucher.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { X, Calendar, AlertCircle, Trash2, ChevronLeft, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AxiosInstance from '../../../contexts/axios';
import { useAuth } from '../../../contexts/AuthContext';

const generateVoucherCode = () => `VOUCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

export default function CreateVoucherPage() {
  const router = useRouter();
  const { userId, shopId } = useAuth();
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: generateVoucherCode(),
    voucher_type: 'shop' as 'shop' | 'product',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    minimum_spend: '',
    maximum_usage: '',
    start_date: new Date(),
    end_date: new Date(),
    is_active: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') as 'shop' | 'product';
    if (id) {
      setMode('edit');
      setVoucherId(id);
      fetchVoucher(id);
    } else if (type) {
      setFormData(prev => ({ ...prev, voucher_type: type }));
    }
  }, []);

  const fetchVoucher = async (id: string) => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await AxiosInstance.get(`/seller-vouchers/${id}/get_voucher/`, {
        params: { shop_id: shopId },
        headers: { 'X-User-Id': userId || '' },
      });
      if (res.data.success) {
        const v = res.data.voucher;
        setFormData({
          name: v.name,
          code: v.code,
          voucher_type: v.voucher_type,
          discount_type: v.discount_type,
          value: v.value.toString(),
          minimum_spend: v.minimum_spend.toString(),
          maximum_usage: v.maximum_usage.toString(),
          start_date: new Date(v.start_date),
          end_date: new Date(v.end_date),
          is_active: v.is_active,
        });
      } else {
        Alert.alert('Error', 'Failed to load voucher');
        router.back();
      }
    } catch (err) {
      console.error('Error fetching voucher:', err);
      Alert.alert('Error', 'Failed to load voucher');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Voucher",
      "Are you sure you want to remove this voucher? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(`/seller-vouchers/${voucherId}/delete_voucher/`, {
                headers: { 'X-User-Id': userId || '' },
                params: { shop_id: shopId }
              });
              if (response.data.success) {
                Alert.alert('Success', 'Voucher deleted successfully');
                router.back();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to delete');
              }
            } catch (e) {
              console.error('Error deleting:', e);
              Alert.alert("Error", "Failed to delete voucher");
            }
          }
        }
      ]
    );
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { setError('Voucher name is required'); return false; }
    if (!formData.code.trim()) { setError('Voucher code is required'); return false; }
    if (!formData.value || Number(formData.value) <= 0) { setError('Discount value must be greater than 0'); return false; }
    if (formData.start_date > formData.end_date) { setError('End date must be after start date'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!shopId) { setError('Shop ID not found'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        voucher_type: formData.voucher_type,
        discount_type: formData.discount_type,
        value: Number(formData.value),
        minimum_spend: formData.minimum_spend === '' ? 0 : Number(formData.minimum_spend),
        maximum_usage: formData.maximum_usage === '' ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        is_active: formData.is_active,
        shop_id: shopId,
      };

      let response;
      if (mode === 'create') {
        response = await AxiosInstance.post('/seller-vouchers/create_voucher/', payload, {
          headers: { 'X-User-Id': userId || '' },
        });
      } else {
        response = await AxiosInstance.put(`/seller-vouchers/${voucherId}/update_voucher/`, payload, {
          headers: { 'X-User-Id': userId || '' },
        });
      }

      if (response.data.success) {
        Alert.alert('Success', mode === 'create' ? 'Voucher created successfully' : 'Voucher updated successfully');
        router.back();
      } else {
        setError(response.data.error || `Failed to ${mode} voucher`);
      }
    } catch (err: any) {
      console.error(`Error ${mode}ing voucher:`, err);
      setError(err.response?.data?.error || err.message || `Failed to ${mode} voucher`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF9800" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <ChevronLeft size={20} color="#FF9800" />
          <Text style={styles.headerBackButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'create' ? 'Create Voucher' : 'Edit Voucher'}</Text>
        {mode === 'edit' && (
          <TouchableOpacity onPress={handleDelete} style={styles.headerDeleteButton}>
            <Trash2 size={20} color="#F44336" />
          </TouchableOpacity>
        )}
        {!mode.includes('edit') && <View style={{width: 44}} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {error && (
          <View style={styles.errorAlert}>
            <AlertCircle size={16} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Row 1: Name and Code */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Voucher Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="e.g., Summer Sale 2024"
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <Text style={styles.label}>Voucher Code *</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={formData.code}
                onChangeText={text => setFormData(prev => ({ ...prev, code: text.toUpperCase() }))}
                placeholder="VOUCHER123"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => setFormData(prev => ({ ...prev, code: generateVoucherCode() }))}
              >
                <Text style={styles.generateButtonText}>Gen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Row 2: Voucher Type and Active Status */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Voucher Type</Text>
            <View style={styles.miniTabs}>
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, voucher_type: 'shop' }))}
                style={[styles.miniTab, formData.voucher_type === 'shop' && styles.activeTab]}
              >
                <Text style={[styles.miniTabText, formData.voucher_type === 'shop' && styles.activeTabText]}>Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, voucher_type: 'product' }))}
                style={[styles.miniTab, formData.voucher_type === 'product' && styles.activeTab]}
              >
                <Text style={[styles.miniTabText, formData.voucher_type === 'product' && styles.activeTabText]}>Product</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.switchContainer}>
              <Switch
                value={formData.is_active}
                onValueChange={value => setFormData(prev => ({ ...prev, is_active: value }))}
                trackColor={{ false: '#E5E7EB', true: '#FF9800' }}
                thumbColor={formData.is_active ? '#FFFFFF' : '#F3F4F6'}
              />
              <Text style={styles.switchLabel}>{formData.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Row 3: Discount Type and Value */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Discount Type *</Text>
            <View style={styles.miniTabs}>
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, discount_type: 'percentage' }))}
                style={[styles.miniTab, formData.discount_type === 'percentage' && styles.activeTab]}
              >
                <Text style={[styles.miniTabText, formData.discount_type === 'percentage' && styles.activeTabText]}>%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, discount_type: 'fixed' }))}
                style={[styles.miniTab, formData.discount_type === 'fixed' && styles.activeTab]}
              >
                <Text style={[styles.miniTabText, formData.discount_type === 'fixed' && styles.activeTabText]}>₱</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{formData.discount_type === 'percentage' ? 'Percentage *' : 'Amount *'}</Text>
            <TextInput
              style={styles.input}
              value={formData.value}
              onChangeText={text => setFormData(prev => ({ ...prev, value: text }))}
              placeholder={formData.discount_type === 'percentage' ? '20' : '100'}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Row 4: Minimum Spend and Max Usage */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minimum Spend</Text>
            <TextInput
              style={styles.input}
              value={formData.minimum_spend}
              onChangeText={text => setFormData(prev => ({ ...prev, minimum_spend: text }))}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Usage</Text>
            <TextInput
              style={styles.input}
              value={formData.maximum_usage}
              onChangeText={text => setFormData(prev => ({ ...prev, maximum_usage: text }))}
              placeholder="Unlimited"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Row 5: Start Date and End Date with Clock Icons */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Calendar size={18} color="#FF9800" />
              <Text style={styles.dateText}>{formData.start_date.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End Date *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Clock size={18} color="#FF9800" />
              <Text style={styles.dateText}>{formData.end_date.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={formData.start_date}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setFormData(prev => ({ ...prev, start_date: date }));
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={formData.end_date}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setFormData(prev => ({ ...prev, end_date: date }));
            }}
          />
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'create' ? 'Create Voucher' : 'Update Voucher'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerBackButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  headerBackButtonText: { fontSize: 16, fontWeight: '600', color: '#FF9800' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#333' },
  headerDeleteButton: { paddingHorizontal: 8, paddingVertical: 6 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 20, gap: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#F44336' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#FFF' },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1 },
  generateButton: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  generateButtonText: { fontSize: 12, fontWeight: '600', color: '#FF9800' },
  miniTabs: { flexDirection: 'row', gap: 8, backgroundColor: '#F5F5F5', padding: 4, borderRadius: 8 },
  miniTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  miniTabText: { fontSize: 13, color: '#888', fontWeight: '500' },
  activeTabText: { color: '#FF9800', fontWeight: '600' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  switchLabel: { fontSize: 14, color: '#333' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#FFF' },
  dateText: { fontSize: 14, color: '#333', flex: 1 },
  submitButton: { backgroundColor: '#FF9800', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bottomPadding: { height: 40 },
});