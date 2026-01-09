import { useAuth } from '@/contexts/AuthContext';
import {
    createVoucher,
    deleteVoucher,
    getShopVouchers,
    updateVoucher,
} from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface Voucher {
  id: string;
  name: string;
  code: string;
  discount_type: string;
  value: number;
  minimum_spend: number;
  maximum_usage: number;
  usage_count: number;
  valid_until: string;
  is_active: boolean;
  status: string;
}

export default function ShopVouchersScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const shopId = params.shopId as string;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minimumSpend, setMinimumSpend] = useState('');
  const [maximumUsage, setMaximumUsage] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [validUntilDate, setValidUntilDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (shopId) {
      loadVouchers();
    }
  }, [shopId]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await getShopVouchers(shopId);
      if (response.success) {
        setVouchers(response.vouchers || []);
      }
    } catch (error: any) {
      console.error('Error loading vouchers:', error);
      Alert.alert('Error', error.message || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setDiscountType('percentage');
    setValue('');
    setMinimumSpend('');
    setMaximumUsage('');
    setValidUntil('');
    setValidUntilDate(null);
    setIsActive(true);
    setEditingVoucher(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setName(voucher.name);
    setCode(voucher.code);
    setDiscountType(voucher.discount_type as 'percentage' | 'fixed');
    setValue(voucher.value.toString());
    setMinimumSpend(voucher.minimum_spend.toString());
    setMaximumUsage(voucher.maximum_usage.toString());
    setValidUntil(voucher.valid_until);
    setValidUntilDate(voucher.valid_until ? new Date(voucher.valid_until) : null);
    setIsActive(voucher.is_active);
    setShowModal(true);
  };

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const handleSaveVoucher = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter voucher name');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter voucher code');
      return;
    }
    if (!value || parseFloat(value) <= 0) {
      Alert.alert('Error', 'Please enter a valid discount value');
      return;
    }
    if (!validUntilDate) {
      Alert.alert('Error', 'Please select an expiry date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(validUntilDate);
    picked.setHours(0, 0, 0, 0);
    if (picked < today) {
      Alert.alert('Not allowed', 'Expiry date cannot be before today');
      return;
    }

    const validUntilStr = formatDate(picked);

    try {
      const userId = user?.user_id || user?.id;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      if (editingVoucher) {
        // Update existing voucher
        const response = await updateVoucher({
          voucher_id: editingVoucher.id,
          name: name.trim(),
          discount_type: discountType,
          value: parseFloat(value),
          minimum_spend: parseFloat(minimumSpend) || 0,
          maximum_usage: parseInt(maximumUsage) || 0,
          valid_until: validUntilStr,
          is_active: isActive,
        });

        if (response.success) {
          Alert.alert('Success', 'Voucher updated successfully');
          setShowModal(false);
          resetForm();
          loadVouchers();
        }
      } else {
        // Create new voucher
        const response = await createVoucher({
          shop_id: shopId,
          customer_id: userId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          value: parseFloat(value),
          minimum_spend: parseFloat(minimumSpend) || 0,
          maximum_usage: parseInt(maximumUsage) || 0,
          valid_until: validUntilStr,
          is_active: isActive,
        });

        if (response.success) {
          Alert.alert('Success', 'Voucher created successfully');
          setShowModal(false);
          resetForm();
          loadVouchers();
        }
      }
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      Alert.alert('Error', error.message || 'Failed to save voucher');
    }
  };

  const handleDeleteVoucher = (voucher: Voucher) => {
    Alert.alert(
      'Delete Voucher',
      `Are you sure you want to delete "${voucher.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteVoucher(voucher.id);
              if (response.success) {
                Alert.alert('Success', 'Voucher deleted successfully');
                loadVouchers();
              }
            } catch (error: any) {
              console.error('Error deleting voucher:', error);
              Alert.alert('Error', error.message || 'Failed to delete voucher');
            }
          },
        },
      ]
    );
  };

  const toggleVoucherStatus = async (voucher: Voucher) => {
    try {
      const response = await updateVoucher({
        voucher_id: voucher.id,
        is_active: !voucher.is_active,
      });

      if (response.success) {
        loadVouchers();
      }
    } catch (error: any) {
      console.error('Error toggling voucher status:', error);
      Alert.alert('Error', error.message || 'Failed to update voucher status');
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(selectedDate);
    picked.setHours(0, 0, 0, 0);

    if (picked < today) {
      Alert.alert('Not allowed', 'Expiry date cannot be before today');
      return;
    }

    setValidUntilDate(picked);
    setValidUntil(formatDate(picked));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#9E9E9E';
      case 'expired':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderVoucherItem = ({ item }: { item: Voucher }) => (
    <View style={styles.voucherCard}>
      <View style={styles.voucherHeader}>
        <View style={styles.voucherHeaderLeft}>
          <Text style={styles.voucherName}>{item.name}</Text>
          <View style={styles.codeContainer}>
            <MaterialIcons name="local-offer" size={14} color="#ff6d0b" />
            <Text style={styles.voucherCode}>{item.code}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.voucherDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="discount" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.discount_type === 'percentage'
              ? `${item.value}% OFF`
              : `₱${item.value} OFF`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="shopping-cart" size={16} color="#666" />
          <Text style={styles.detailText}>Min Spend: ₱{item.minimum_spend}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="people" size={16} color="#666" />
          <Text style={styles.detailText}>
            Used: {item.usage_count}
            {item.maximum_usage > 0 ? ` / ${item.maximum_usage}` : ' (Unlimited)'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={16} color="#666" />
          <Text style={styles.detailText}>Valid Until: {item.valid_until}</Text>
        </View>
      </View>

      <View style={styles.voucherActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleVoucherStatus(item)}
        >
          <MaterialIcons
            name={item.is_active ? 'toggle-on' : 'toggle-off'}
            size={24}
            color={item.is_active ? '#4CAF50' : '#9E9E9E'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <MaterialIcons name="edit" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteVoucher(item)}>
          <MaterialIcons name="delete" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vouchers</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Vouchers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading vouchers...</Text>
        </View>
      ) : vouchers.length > 0 ? (
        <FlatList
          data={vouchers}
          renderItem={renderVoucherItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="local-offer" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Vouchers Yet</Text>
          <Text style={styles.emptySubtitle}>Create your first voucher to attract customers</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
            <Text style={styles.emptyButtonText}>Create Voucher</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVoucher ? 'Edit Voucher' : 'Create Voucher'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Voucher Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., New Year Sale"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Voucher Code * {editingVoucher && '(Cannot edit)'}</Text>
                <TextInput
                  style={[styles.input, editingVoucher && styles.inputDisabled]}
                  placeholder="e.g., NEWYEAR2025"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  editable={!editingVoucher}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Discount Type *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, discountType === 'percentage' && styles.radioButtonActive]}
                    onPress={() => setDiscountType('percentage')}
                  >
                    <Text style={[styles.radioText, discountType === 'percentage' && styles.radioTextActive]}>
                      Percentage (%)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, discountType === 'fixed' && styles.radioButtonActive]}
                    onPress={() => setDiscountType('fixed')}
                  >
                    <Text style={[styles.radioText, discountType === 'fixed' && styles.radioTextActive]}>
                      Fixed Amount (₱)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Discount Value * {discountType === 'percentage' ? '(%)' : '(₱)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Minimum Spend (₱)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500"
                  value={minimumSpend}
                  onChangeText={setMinimumSpend}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Maximum Usage (0 = Unlimited)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100"
                  value={maximumUsage}
                  onChangeText={setMaximumUsage}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Valid Until *</Text>
                <TouchableOpacity onPress={openDatePicker} style={styles.dateInput}>
                  <Text style={styles.dateText}>
                    {validUntil || 'Select a date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={validUntilDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.switchContainer}
                  onPress={() => setIsActive(!isActive)}
                >
                  <Text style={styles.label}>Active</Text>
                  <MaterialIcons
                    name={isActive ? 'toggle-on' : 'toggle-off'}
                    size={32}
                    color={isActive ? '#4CAF50' : '#9E9E9E'}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveVoucher}>
                <Text style={styles.saveButtonText}>
                  {editingVoucher ? 'Update Voucher' : 'Create Voucher'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#ff6d0b',
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voucherHeaderLeft: {
    flex: 1,
  },
  voucherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voucherCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6d0b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  voucherDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  voucherActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  actionButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputDisabled: {
    backgroundColor: '#E5E5E5',
    color: '#999',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#ff6d0b',
    backgroundColor: '#FFF3E0',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioTextActive: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#ff6d0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
