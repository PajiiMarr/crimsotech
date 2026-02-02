import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Alert, useWindowDimensions 
} from 'react-native';
import { MapPin, Phone, User, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';

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
  const router = useRouter();
  const { width } = useWindowDimensions(); // Hook for responsiveness
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);

  // Responsive constants
  const isTablet = width > 768;
  const numColumns = isTablet ? 2 : 1;

  const deleteAddress = (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to remove this pickup location?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setAddresses(addresses.filter(a => a.id !== id)) }
    ]);
  };

  const renderAddress = ({ item }: { item: typeof INITIAL_ADDRESSES[0] }) => (
    <View style={[
      styles.card, 
      item.isDefault && styles.defaultCard,
      isTablet && { width: (width / 2) - 24 } // Adjust width for 2 columns
    ]}>
      <View style={styles.cardHeader}>
        <View style={styles.labelRow}>
          <Text style={styles.addressLabel} numberOfLines={1}>{item.label}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>PRIMARY</Text>
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
          <Text style={styles.infoText} numberOfLines={1}>{item.name}</Text>
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

      <View style={[styles.header, { paddingHorizontal: width > 1024 ? '10%' : 20 }]}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.subHeader} numberOfLines={1}>Warehouse collection points</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => router.push('/seller/create-address')}
        >
          <Plus color="#fff" size={18} />
          {width > 380 && <Text style={styles.addBtnText}>Add New</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        key={numColumns} // Re-render when switching columns
        data={addresses}
        renderItem={renderAddress}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: width > 1024 ? '10%' : 16 }
        ]}
        columnWrapperStyle={isTablet ? styles.columnWrapper : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
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

  listContent: { paddingVertical: 16 },
  columnWrapper: { justifyContent: 'space-between' },
  
  card: { 
    flex: 1, // Allows card to grow in grid
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16, 
    marginHorizontal: 4, // Added for grid spacing
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  defaultCard: { borderColor: '#0F172A', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  addressLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  defaultBadge: { backgroundColor: '#0F172A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  defaultText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  actionIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 12 },

  contactInfo: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', // Responsive wrapping
    marginBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9', 
    paddingBottom: 16,
    gap: 12
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#1E293B', marginLeft: 8, fontWeight: '600' },

  addressBody: { flexDirection: 'row' },
  addressDetails: { marginLeft: 12, flex: 1 },
  mainAddress: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  subAddress: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
});