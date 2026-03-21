import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AddressItem {
  code: string;
  name: string;
}

interface AddressDropdownsProps {
  value: {
    province: string;
    city: string;
    barangay: string;
    street?: string;
  };
  onChange: (data: {
    province: string;
    city: string;
    barangay: string;
    street?: string;
  }) => void;
  errors?: {
    province?: string;
    city?: string;
    barangay?: string;
  };
  disabled?: boolean;
}

export default function AddressDropdowns({
  value,
  onChange,
  errors,
  disabled = false,
}: AddressDropdownsProps) {
  // Hardcoded data
  const HARDCODED_PROVINCE = "Zamboanga Del Sur";
  const HARDCODED_CITY = "City of Zamboanga";
  
  // Hardcoded barangays for City of Zamboanga
  const BARANGAYS: AddressItem[] = [
    { code: "1", name: "Abong-Abong" },
    { code: "2", name: "Arena Blanco" },
    { code: "3", name: "Ayala" },
    { code: "4", name: "Baliwasan" },
    { code: "5", name: "Baluno" },
    { code: "6", name: "Boalan" },
    { code: "7", name: "Bolong" },
    { code: "8", name: "Buenavista" },
    { code: "9", name: "Bunguiao" },
    { code: "10", name: "Busay" },
    { code: "11", name: "Cabaluay" },
    { code: "12", name: "Cabatangan" },
    { code: "13", name: "Cacao" },
    { code: "14", name: "Calabasa" },
    { code: "15", name: "Calarian" },
    { code: "16", name: "Camino Nuevo" },
    { code: "17", name: "Camino Viejo" },
    { code: "18", name: "Canelar" },
    { code: "19", name: "Capisan" },
    { code: "20", name: "Cawit" },
    { code: "21", name: "Dulian (Upper Bunguiao)" },
    { code: "22", name: "Dumagoc" },
    { code: "23", name: "Dumpsa" },
    { code: "24", name: "Guiwan" },
    { code: "25", name: "Labuan" },
    { code: "26", name: "La Paz" },
    { code: "27", name: "Lapakan" },
    { code: "28", name: "Limpapa" },
    { code: "29", name: "Lunzuran" },
    { code: "30", name: "Mampang" },
    { code: "31", name: "Manicahan" },
    { code: "32", name: "Maasin" },
    { code: "33", name: "Mercedes" },
    { code: "34", name: "Pasonanca" },
    { code: "35", name: "Patalon" },
    { code: "36", name: "Putik" },
    { code: "37", name: "Pueblo" },
    { code: "38", name: "Recodo" },
    { code: "39", name: "Rio Hondo" },
    { code: "40", name: "San Jose Cawa-Cawa" },
    { code: "41", name: "San Jose Gusu" },
    { code: "42", name: "San Roque" },
    { code: "43", name: "Santa Barbara" },
    { code: "44", name: "Santa Catalina" },
    { code: "45", name: "Santa Maria" },
    { code: "46", name: "Santo Niño" },
    { code: "47", name: "Sinunuc" },
    { code: "48", name: "Talabaan" },
    { code: "49", name: "Talisayan" },
    { code: "50", name: "Tetuan" },
    { code: "51", name: "Tictapul" },
    { code: "52", name: "Tigbalabag" },
    { code: "53", name: "Tolosa" },
    { code: "54", name: "Tugbungan" },
    { code: "55", name: "Tumaga" },
    { code: "56", name: "Victoria" },
    { code: "57", name: "Vitali" },
    { code: "58", name: "Zambowood" },
  ];
  
  const [barangays] = useState<AddressItem[]>(BARANGAYS.sort((a, b) => a.name.localeCompare(b.name)));
  const [filteredBarangays, setFilteredBarangays] = useState<AddressItem[]>(barangays);
  
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  // Initialize and ensure province and city are always set
  useEffect(() => {
    // Always ensure province and city are set to hardcoded values
    const needsUpdate = value.province !== HARDCODED_PROVINCE || value.city !== HARDCODED_CITY;
    
    if (needsUpdate) {
      onChange({
        province: HARDCODED_PROVINCE,
        city: HARDCODED_CITY,
        barangay: value.barangay || '',
        street: value.street || '',
      });
    }
  }, []); // Run once on mount

  // Filter barangays based on search
  useEffect(() => {
    const filtered = barangays.filter(barangay =>
      barangay.name.toLowerCase().includes(barangaySearch.toLowerCase())
    );
    setFilteredBarangays(filtered);
  }, [barangaySearch, barangays]);

  const handleBarangaySelect = (selectedBarangay: AddressItem) => {
    onChange({
      ...value,
      barangay: selectedBarangay.name,
    });
    setShowBarangayModal(false);
    setBarangaySearch('');
  };

  const handleStreetChange = (text: string) => {
    onChange({
      ...value,
      street: text,
    });
  };

  const renderDropdownModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    searchValue: string,
    onSearchChange: (text: string) => void,
    data: AddressItem[],
    onSelect: (item: AddressItem) => void,
    placeholder: string
  ) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder}
              value={searchValue}
              onChangeText={onSearchChange}
              placeholderTextColor="#999"
            />
          </View>
          
          <FlatList
            data={data}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.dropdownItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No results found</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {/* Province - Hardcoded to Zamboanga Del Sur */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Province *</Text>
        <View style={[styles.dropdownTrigger, styles.disabledTrigger]}>
          <Text style={styles.dropdownText}>
            {HARDCODED_PROVINCE}
          </Text>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        </View>
        {/* Only show error if province is actually empty (which it never is) */}
        {!value.province && errors?.province && <Text style={styles.errorText}>{errors.province}</Text>}
      </View>

      {/* City/Municipality - Hardcoded to City of Zamboanga */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City/Municipality *</Text>
        <View style={[styles.dropdownTrigger, styles.disabledTrigger]}>
          <Text style={styles.dropdownText}>
            {HARDCODED_CITY}
          </Text>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        </View>
        {/* Only show error if city is actually empty (which it never is) */}
        {!value.city && errors?.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      {/* Barangay */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barangay *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, errors?.barangay && styles.inputError]}
          onPress={() => setShowBarangayModal(true)}
          disabled={disabled}
        >
          <Text style={value.barangay ? styles.dropdownText : styles.dropdownPlaceholder}>
            {value.barangay || 'Select barangay'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        {errors?.barangay && <Text style={styles.errorText}>{errors.barangay}</Text>}
      </View>

      {/* Street Address */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter street, house number, etc."
          value={value.street || ''}
          onChangeText={handleStreetChange}
          editable={!disabled}
        />
      </View>

      {/* Barangay Modal */}
      {renderDropdownModal(
        showBarangayModal,
        () => setShowBarangayModal(false),
        'Select Barangay',
        barangaySearch,
        setBarangaySearch,
        filteredBarangays,
        handleBarangaySelect,
        'Search barangays...'
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledTrigger: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff6d0b',
  },
  errorText: {
    color: '#ff6d0b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontSize: 16,
  },
});