import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
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
    street?: string;
  };
  disabled?: boolean;
}

// PSGC API Base URL
const PSGC_API_BASE = 'https://psgc.gitlab.io/api';

// Zamboanga City code (City of Zamboanga)
const ZAMBOANGA_CITY_CODE = '097332000';

export default function AddressDropdowns({
  value,
  onChange,
  errors,
  disabled = false,
}: AddressDropdownsProps) {
  // Hardcoded province and city
  const HARDCODED_PROVINCE = "Zamboanga del Sur";
  const HARDCODED_CITY = "City of Zamboanga";
  
  const [barangays, setBarangays] = useState<AddressItem[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<AddressItem[]>([]);
  
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  // Ensure province and city are always set to hardcoded values on mount
  useEffect(() => {
    const needsUpdate = value.province !== HARDCODED_PROVINCE || value.city !== HARDCODED_CITY;
    
    if (needsUpdate) {
      onChange({
        province: HARDCODED_PROVINCE,
        city: HARDCODED_CITY,
        barangay: value.barangay || '',
        street: value.street || '',
      });
    }
    
    // Fetch barangays for Zamboanga City
    fetchBarangays();
  }, []);

  // Filter barangays based on search
  useEffect(() => {
    const filtered = barangays.filter(barangay =>
      barangay.name.toLowerCase().includes(barangaySearch.toLowerCase())
    );
    setFilteredBarangays(filtered);
  }, [barangaySearch, barangays]);

  const fetchBarangays = async () => {
    setLoadingBarangays(true);
    try {
      // Fetch barangays for Zamboanga City
      const response = await fetch(`${PSGC_API_BASE}/cities-municipalities/${ZAMBOANGA_CITY_CODE}/barangays.json`);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        const barangayList = data.map((barangay: any) => ({
          code: barangay.code,
          name: barangay.name,
        }));
        setBarangays(barangayList);
        setFilteredBarangays(barangayList);
      }
    } catch (error) {
      console.error('Error fetching barangays:', error);
    } finally {
      setLoadingBarangays(false);
    }
  };

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

  const renderBarangayModal = () => (
    <Modal
      visible={showBarangayModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBarangayModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Barangay</Text>
            <TouchableOpacity onPress={() => setShowBarangayModal(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search barangays..."
              value={barangaySearch}
              onChangeText={setBarangaySearch}
              placeholderTextColor="#999"
            />
          </View>
          
          {loadingBarangays ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff6d0b" />
              <Text style={styles.loadingText}>Loading barangays...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBarangays}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleBarangaySelect(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No barangays found</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {/* Province - Hardcoded to Zamboanga del Sur */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Province *</Text>
        <View style={[styles.dropdownTrigger, styles.disabledTrigger]}>
          <Text style={styles.dropdownText}>
            {HARDCODED_PROVINCE}
          </Text>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
        </View>
        {errors?.province && !value.province && <Text style={styles.errorText}>{errors.province}</Text>}
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
        {errors?.city && !value.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      {/* Barangay - Fetched from PSGC API */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barangay *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, errors?.barangay && !value.barangay && styles.inputError]}
          onPress={() => setShowBarangayModal(true)}
          disabled={disabled || loadingBarangays}
        >
          <Text style={value.barangay ? styles.dropdownText : styles.dropdownPlaceholder}>
            {value.barangay || (loadingBarangays ? 'Loading barangays...' : 'Select barangay')}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        {errors?.barangay && !value.barangay && <Text style={styles.errorText}>{errors.barangay}</Text>}
      </View>

      {/* Street Address */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={[styles.input, errors?.street && !value.street && styles.inputError]}
          placeholder="Enter street, house number, etc."
          value={value.street || ''}
          onChangeText={handleStreetChange}
          editable={!disabled}
        />
        {errors?.street && !value.street && <Text style={styles.errorText}>{errors.street}</Text>}
      </View>

      {/* Barangay Modal */}
      {renderBarangayModal()}
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});