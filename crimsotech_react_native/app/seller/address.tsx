import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Modal, TextInput, ScrollView, Alert 
} from 'react-native';
import { MapPin, Phone, User, Plus, Trash2, Edit3, X, CheckCircle2 } from 'lucide-react-native';
import { Stack } from 'expo-router';

const INITIAL_ADDRESSES = [
  { 
    id: '1', 
    label: 'Main Warehouse (Pickup)', 
    name: 'Juan Dela Cruz', 
    phone: '0917 123 4567', 
    details: 'Unit 402, Tech Tower, 123 Ayala Ave.', 
    barangay: 'Bel-Air', 
    city: 'Makati City', 
    region: 'Metro Manila', 
    isDefault: true 
  },
  { 
    id: '2', 
    label: 'Home Office', 
    name: 'Juan Dela Cruz', 
    phone: '0918 987 6543', 
    details: 'Bldg 5, Green Residences', 
    barangay: 'Taft Ave', 
    city: 'Manila', 
    region: 'Metro Manila', 
    isDefault: false 
  },
];

export default function SellerAddressPage() {
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [modalVisible, setModalVisible] = useState(false);

  const deleteAddress = (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to remove this pickup location?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setAddresses(addresses.filter(a => a.id !== id)) }
    ]);
  };

  const renderAddress = ({ item }: { item: typeof INITIAL_ADDRESSES[0] }) => (
    <View style={[styles.card, item.isDefault && styles.defaultCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.labelRow}>
          <Text style={styles.addressLabel}>{item.label}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>PRIMARY PICKUP</Text>
            </View>
          )}
        </View>
        <View style={styles.actionIcons}>
          <TouchableOpacity onPress={() => {}} style={styles.iconBtn}>
            <Edit3 color="#64748B" size={18} />
          </TouchableOpacity>
          {!item.isDefault && (
            <TouchableOpacity onPress={() => deleteAddress(item.id)} style={styles.iconBtn}>
              <Trash2 color="#EF4444" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.infoRow}>
          <User color="#94A3B8" size={14} />
          <Text style={styles.infoText}>{item.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone color="#94A3B8" size={14} />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
      </View>

      <View style={styles.addressBody}>
        <MapPin color="#0F172A" size={16} style={{ marginTop: 2 }} />
        <View style={styles.addressDetails}>
          <Text style={styles.mainAddress}>{item.details}</Text>
          <Text style={styles.subAddress}>{item.barangay}, {item.city}, {item.region}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Pickup Address', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' }
      }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.subHeader}>Manage warehouse collection points</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#fff" size={18} />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={addresses}
        renderItem={renderAddress}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Location</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#0F172A" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Location Label</Text>
              <TextInput style={styles.input} placeholder="e.g. Main Warehouse" placeholderTextColor="#94A3B8" />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Contact Name</Text>
                  <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput style={styles.input} placeholder="09XX..." keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <Text style={styles.label}>Street / Building Details</Text>
              <TextInput style={styles.input} placeholder="Unit/House No., Street" placeholderTextColor="#94A3B8" />

              <Text style={styles.label}>Barangay / City / Region</Text>
              <TextInput style={styles.input} placeholder="Address Line 2" placeholderTextColor="#94A3B8" />

              <TouchableOpacity style={styles.submitBtn} onPress={() => setModalVisible(false)}>
                <CheckCircle2 color="#fff" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Save Location</Text>
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
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  subHeader: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  addBtn: { backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 13 },

  listContent: { padding: 16 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  defaultCard: { borderColor: '#0F172A', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  defaultBadge: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  defaultText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  actionIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 16 },

  contactInfo: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  infoText: { fontSize: 13, color: '#1E293B', marginLeft: 8, fontWeight: '600' },

  addressBody: { flexDirection: 'row' },
  addressDetails: { marginLeft: 12, flex: 1 },
  mainAddress: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  subAddress: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 14, color: '#0F172A', marginBottom: 16, fontWeight: '600' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});