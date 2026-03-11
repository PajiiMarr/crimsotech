import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type ShopInfo = {
  id: string;
  name: string;
  description: string;
};

export default function SellerSettings() {
  const { userId, shopId } = useAuth();
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!shopId) {
        setLoading(false);
        return;
      }

      try {
        const [shopRes] = await Promise.all([
          AxiosInstance.get(`/shops/${shopId}/`),
        ]);

        const loadedShop: ShopInfo = {
          id: String(shopRes.data.id),
          name: String(shopRes.data.name || 'My Shop'),
          description: String(shopRes.data.description || ''),
        };

        setShopInfo(loadedShop);
        setEditedName(loadedShop.name);
        setEditedDescription(loadedShop.description);
      } catch (err) {
        console.error('Failed to load settings data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shopId, userId]);

  const openEdit = () => {
    setEditedName(shopInfo?.name || '');
    setEditedDescription(shopInfo?.description || '');
    setEditVisible(true);
  };

  const saveShopInfo = async () => {
    if (!shopId) return;
    if (!editedName.trim()) {
      Alert.alert('Validation', 'Shop name is required.');
      return;
    }

    try {
      setSaving(true);
      await AxiosInstance.patch(
        `/shops/${shopId}/`,
        {
          name: editedName.trim(),
          description: editedDescription.trim(),
        },
        {
          headers: {
            'X-User-Id': userId || '',
            'X-Shop-Id': shopId || '',
          },
        }
      );

      setShopInfo((prev) => ({
        id: prev?.id || String(shopId),
        name: editedName.trim(),
        description: editedDescription.trim(),
      }));

      setEditVisible(false);
      Alert.alert('Success', 'Shop information updated.');
    } catch (err: any) {
      console.error('Failed to update shop info:', err);
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to update shop info.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#EE4D2D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          {loading ? (
            <ActivityIndicator size="small" color="#EE4D2D" />
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="construct-outline" size={22} color="#EE4D2D" />
              </View>
              <Text style={styles.placeholderTitle}>Settings Coming Soon</Text>
              <Text style={styles.placeholderText}>
                This section is being updated to match the latest web settings flow.
              </Text>
              <View style={styles.shopBox}>
                <Text style={styles.shopLabel}>Current Shop</Text>
                <Text style={styles.shopName}>{shopInfo?.name || 'No shop selected'}</Text>
                {!!shopInfo?.description && (
                  <Text style={styles.shopDescription} numberOfLines={2}>{shopInfo.description}</Text>
                )}
              </View>

              <View style={styles.actionsWrap}>
                <TouchableOpacity style={styles.actionRowBtn} onPress={openEdit} activeOpacity={0.8}>
                  <View style={styles.actionRowLeft}>
                    <View style={styles.actionRowIconWrap}>
                      <Ionicons name="create-outline" size={18} color="#475569" />
                    </View>
                    <Text style={styles.actionRowText}>Edit Shop Information</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRowBtn} onPress={() => setAboutVisible(true)} activeOpacity={0.8}>
                  <View style={styles.actionRowLeft}>
                    <View style={styles.actionRowIconWrap}>
                      <Ionicons name="information-circle-outline" size={18} color="#475569" />
                    </View>
                    <Text style={styles.actionRowText}>About App</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Shop Information</Text>

            <Text style={styles.fieldLabel}>Shop Name</Text>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              style={styles.input}
              placeholder="Enter shop name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={editedDescription}
              onChangeText={setEditedDescription}
              style={[styles.input, styles.textArea]}
              placeholder="Enter shop description"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={saveShopInfo} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>About App</Text>
            <Text style={styles.aboutText}>Crimsotech Seller Mobile</Text>
            <Text style={styles.aboutSubText}>Version 1.0.0</Text>
            <Text style={styles.aboutSubText}>Manage your shop, products, and seller operations.</Text>

            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn, { marginTop: 10 }]} onPress={() => setAboutVisible(false)}>
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  placeholderText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  shopBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    padding: 12,
  },
  shopLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  shopName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  shopDescription: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  actionsWrap: {
    width: '100%',
    marginTop: 14,
    gap: 10,
  },
  actionRowBtn: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#EE4D2D',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  aboutSubText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});

