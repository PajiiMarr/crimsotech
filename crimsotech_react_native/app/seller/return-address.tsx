import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type ReturnAddress = {
  id: string;
  recipient_name: string;
  contact_number: string;
  country: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  zip_code: string;
  notes?: string;
};

const EMPTY_FORM = {
  recipient_name: '',
  contact_number: '',
  country: 'Philippines',
  province: '',
  city: '',
  barangay: '',
  street: '',
  zip_code: '',
  notes: '',
};

export default function SellerReturnAddressPage() {
  const { userId, shopId } = useAuth();
  const [items, setItems] = useState<ReturnAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAddresses = async (isRefresh = false) => {
    if (!userId || !shopId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      const res = await AxiosInstance.get('/return-address/', {
        headers: {
          'X-User-Id': userId,
          'X-Shop-Id': shopId,
        },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list.map((a: any) => ({ ...a, id: String(a.id) })));
    } catch (err) {
      console.error('Failed to load return addresses:', err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAddresses(false);
  }, [shopId, userId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (item: ReturnAddress) => {
    setEditingId(item.id);
    setForm({
      recipient_name: item.recipient_name || '',
      contact_number: item.contact_number || '',
      country: item.country || 'Philippines',
      province: item.province || '',
      city: item.city || '',
      barangay: item.barangay || '',
      street: item.street || '',
      zip_code: item.zip_code || '',
      notes: item.notes || '',
    });
    setModalVisible(true);
  };

  const saveAddress = async () => {
    if (!form.recipient_name || !form.contact_number || !form.province || !form.city || !form.barangay || !form.street) {
      Alert.alert('Validation', 'Please complete all required address fields.');
      return;
    }

    try {
      if (editingId) {
        await AxiosInstance.put(`/return-address/${editingId}/`, form, {
          headers: {
            'X-User-Id': userId || '',
            'X-Shop-Id': shopId || '',
          },
        });
      } else {
        await AxiosInstance.post('/return-address/', form, {
          headers: {
            'X-User-Id': userId || '',
            'X-Shop-Id': shopId || '',
          },
        });
      }
      setModalVisible(false);
      fetchAddresses(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save return address.');
    }
  };

  const deleteAddress = (id: string) => {
    Alert.alert('Delete', 'Delete this return address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await AxiosInstance.delete(`/return-address/${id}/`, {
              headers: {
                'X-User-Id': userId || '',
                'X-Shop-Id': shopId || '',
              },
            });
            fetchAddresses(false);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Return Address', headerTitleAlign: 'center', headerShadowVisible: false }} />

      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Saved Return Addresses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Loading...' : 'No return address yet'}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.recipient_name}</Text>
            <Text style={styles.meta}>{item.contact_number}</Text>
            <Text style={styles.meta}>
              {item.street}, {item.barangay}, {item.city}, {item.province}, {item.country} {item.zip_code}
            </Text>
            {!!item.notes && <Text style={styles.notes}>Notes: {item.notes}</Text>}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteAddress(item.id)}>
                <Text style={[styles.actionBtnText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalWrap}>
          <Stack.Screen options={{ title: editingId ? 'Edit Return Address' : 'Create Return Address' }} />
          <ScrollView contentContainerStyle={styles.form}>
            {Object.entries(form).map(([key, value]) => (
              <View key={key} style={styles.fieldWrap}>
                <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, [key]: text }))}
                  multiline={key === 'notes'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={saveAddress}>
              <Text style={styles.saveBtnText}>{editingId ? 'Update Address' : 'Create Address'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  addBtn: { backgroundColor: '#EE4D2D', paddingHorizontal: 12, height: 34, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  name: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  meta: { marginTop: 4, color: '#475569', fontSize: 12 },
  notes: { marginTop: 6, color: '#64748B', fontSize: 12, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  actionBtnText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  deleteText: { color: '#B91C1C' },
  empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
  modalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  form: { padding: 16, paddingBottom: 32 },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 11, color: '#64748B', fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: { marginTop: 8, backgroundColor: '#EE4D2D', height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800' },
  cancelBtn: { marginTop: 10, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  cancelText: { color: '#334155', fontWeight: '700' },
});

