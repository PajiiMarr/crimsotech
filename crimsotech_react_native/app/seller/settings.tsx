import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
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

type SettingItem = {
  id: string;
  title: string;
  route?: string;
  badge?: number;
  action?: 'edit-shop';
  subtitle?: string;
};

export default function SellerSettings() {
  const { userId, shopId } = useAuth();
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [items, setItems] = useState<SettingItem[]>([
    { id: 'edit-shop', title: 'Edit Shop Info', action: 'edit-shop' },
    { id: 'earnings', title: 'Earnings', route: '/seller/earnings' },
    { id: 'boosts', title: 'Boosts', route: '/seller/boosts' },
    { id: 'disputes', title: 'Disputes', route: '/seller/disputes' },
    { id: 'return-address', title: 'Return Address', route: '/seller/return-address' },
    { id: 'address', title: 'Address', route: '/seller/address', badge: 0 },
    { id: 'shop-voucher', title: 'Shop Voucher', route: '/seller/shop-vouchers', badge: 0 },
    { id: 'product-voucher', title: 'Product Voucher', route: '/seller/product-vouchers', badge: 0 },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!shopId) return;

      try {
        const [shopRes, dashRes] = await Promise.all([
          AxiosInstance.get(`/shops/${shopId}/`),
          AxiosInstance.get('/seller-dashboard/get_dashboard/', {
            params: { shop_id: shopId },
            headers: { 'X-User-Id': userId || '', 'X-Shop-Id': shopId || '' },
          }),
        ]);

        const loadedShop: ShopInfo = {
          id: String(shopRes.data.id),
          name: String(shopRes.data.name || 'My Shop'),
          description: String(shopRes.data.description || ''),
        };

        setShopInfo(loadedShop);
        setEditedName(loadedShop.name);
        setEditedDescription(loadedShop.description);

        const storeCounts = dashRes.data?.store_management_counts || {};
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            subtitle: item.id === 'edit-shop' ? loadedShop.name : item.subtitle,
            badge:
              item.id === 'address'
                ? Number(storeCounts.address || 0)
                : item.id === 'shop-voucher'
                ? Number(storeCounts.shop_voucher || 0)
                : item.id === 'product-voucher'
                ? Number(storeCounts.product_voucher || 0)
                : item.badge,
          }))
        );
      } catch (err) {
        console.error('Failed to load settings data:', err);
      }
    };

    fetchData();
  }, [shopId, userId]);

  const onPressItem = (item: SettingItem) => {
    if (item.action === 'edit-shop') {
      setEditedName(shopInfo?.name || '');
      setEditedDescription(shopInfo?.description || '');
      setEditVisible(true);
      return;
    }

    if (item.route) {
      router.push(item.route as any);
    }
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

      const updated: ShopInfo = {
        id: String(shopInfo?.id || shopId),
        name: editedName.trim(),
        description: editedDescription.trim(),
      };
      setShopInfo(updated);
      setItems((prev) =>
        prev.map((item) =>
          item.id === 'edit-shop' ? { ...item, subtitle: updated.name } : item
        )
      );
      setEditVisible(false);
      Alert.alert('Success', 'Shop info updated.');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#EE4D2D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.settingRow, index === items.length - 1 && styles.lastRow]}
              onPress={() => onPressItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                {!!item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
              </View>
              <View style={styles.settingRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Shop Info</Text>

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
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveShopInfo}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    color: '#111827',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
});

