import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Modal, TextInput, Image, ScrollView} from 'react-native';
import { Stack } from 'expo-router';
import { Tag, Package, Plus, X, Search, ChevronRight, Percent, CircleDollarSign } from 'lucide-react-native';

const INITIAL_PRODUCT_VOUCHERS = [
  { 
    id: 'pv1', 
    productName: 'MacBook Air M2', 
    productImage: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200',
    code: 'MACM2SAVE', 
    value: 1500, 
    type: 'FIXED', 
    claimed: 3, 
    total: 5,
    status: 'ACTIVE'
  },
  { 
    id: 'pv2', 
    productName: 'Keychron K2 Keyboard', 
    productImage: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200',
    code: 'CLICKY10', 
    value: 10, 
    type: 'PERCENTAGE', 
    claimed: 12, 
    total: 20,
    status: 'ACTIVE'
  },
  { 
    id: 'pv3', 
    productName: 'Sony WH-1000XM4', 
    productImage: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=200',
    code: 'SONYOFF', 
    value: 500, 
    type: 'FIXED', 
    claimed: 10, 
    total: 10,
    status: 'FULL'
  },
];

export default function ProductVoucherPage() {
  const [vouchers] = useState(INITIAL_PRODUCT_VOUCHERS);
  const [isModalVisible, setModalVisible] = useState(false);

  const renderVoucher = ({ item }: { item: typeof INITIAL_PRODUCT_VOUCHERS[0] }) => {
    const isFull = item.claimed >= item.total;

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardMain}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.productImage }} style={[styles.productThumb, isFull && styles.dimmed]} />
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {item.type === 'FIXED' ? `₱${item.value}` : `${item.value}%`}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <View style={styles.codeRow}>
              <Tag size={12} color="#0F172A" />
              <Text style={styles.codeText}>{item.code}</Text>
            </View>

            <View style={styles.usageContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.usageLabel}>Redemption Rate</Text>
                <Text style={styles.usageValue}>{item.claimed}/{item.total}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${(item.claimed / item.total) * 100}%` }]} />
              </View>
            </View>
          </View>

          <ChevronRight color="#CBD5E1" size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Product Vouchers', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' }
      }} />

      <View style={styles.topSection}>
        <View style={styles.searchContainer}>
          <Search color="#94A3B8" size={18} />
          <TextInput 
            placeholder="Search by product or code..." 
            style={styles.searchInput} 
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#fff" size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vouchers}
        renderItem={renderVoucher}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* CREATE MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Product Voucher</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#0F172A" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Target Product</Text>
              <TouchableOpacity style={styles.productPicker}>
                <Package color="#0F172A" size={20} />
                <Text style={styles.pickerText}>Select from Inventory</Text>
                <ChevronRight color="#94A3B8" size={18} />
              </TouchableOpacity>

              <Text style={styles.label}>Voucher Code</Text>
              <TextInput style={styles.input} placeholder="e.g. M2SAVE1500" autoCapitalize="characters" />

              <View style={styles.row}>
                <View style={{ flex: 1.2, marginRight: 10 }}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeToggle}>
                    <TouchableOpacity style={[styles.typeBtn, styles.activeType]}>
                      <CircleDollarSign size={14} color="#fff" />
                      <Text style={styles.activeTypeText}>Fixed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.typeBtn}>
                      <Percent size={14} color="#64748B" />
                      <Text style={styles.inactiveTypeText}>%</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Total Units Available</Text>
              <TextInput style={styles.input} placeholder="e.g. 50" keyboardType="numeric" />

              <TouchableOpacity style={styles.submitBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.submitBtnText}>Create Discount</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topSection: { 
    backgroundColor: '#fff', 
    padding: 16, 
    flexDirection: 'row', 
    gap: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  searchContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 48 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '500', color: '#0F172A' },
  addBtn: { 
    backgroundColor: '#0F172A', 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },

  listContainer: { padding: 16 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    padding: 12 
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  
  imageWrapper: { position: 'relative' },
  productThumb: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F8FAFC' },
  dimmed: { opacity: 0.4 },
  discountBadge: { 
    position: 'absolute', 
    bottom: -6, 
    alignSelf: 'center',
    backgroundColor: '#0F172A', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  infoSection: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  codeText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 6, letterSpacing: 0.5 },

  usageContainer: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  usageValue: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
  progressBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0F172A' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 },
  productPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerText: { flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  row: { flexDirection: 'row' },
  typeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeType: { backgroundColor: '#0F172A' },
  activeTypeText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#fff' },
  inactiveTypeText: { marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#64748B' },
  submitBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});