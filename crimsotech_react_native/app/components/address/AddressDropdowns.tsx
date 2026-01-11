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
import axios from 'axios';

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
  const [provinces, setProvinces] = useState<AddressItem[]>([]);
  const [cities, setCities] = useState<AddressItem[]>([]);
  const [barangays, setBarangays] = useState<AddressItem[]>([]);
  
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (value.province) {
      const selectedProvince = provinces.find(p => p.name === value.province);
      if (selectedProvince) {
        fetchCities(selectedProvince.code);
      }
    }
  }, [value.province]);

  useEffect(() => {
    if (value.city) {
      const selectedCity = cities.find(c => c.name === value.city);
      if (selectedCity) {
        fetchBarangays(selectedCity.code);
      }
    }
  }, [value.city]);

  const fetchProvinces = async () => {
    try {
      const response = await axios.get('https://psgc.gitlab.io/api/provinces/');
      const sorted = response.data.sort((a: AddressItem, b: AddressItem) =>
        a.name.localeCompare(b.name)
      );
      setProvinces(sorted);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      const response = await axios.get(
        `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`
      );
      const uniqueCities = response.data.filter((city: AddressItem, index: number, self: AddressItem[]) =>
        index === self.findIndex((c) => c.name === city.name)
      );
      const sorted = uniqueCities.sort((a: AddressItem, b: AddressItem) =>
        a.name.localeCompare(b.name)
      );
      setCities(sorted);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    try {
      const response = await axios.get(
        `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`
      );
      const uniqueBarangays = response.data.filter((barangay: AddressItem, index: number, self: AddressItem[]) =>
        index === self.findIndex((b) => b.name === barangay.name)
      );
      const sorted = uniqueBarangays.sort((a: AddressItem, b: AddressItem) =>
        a.name.localeCompare(b.name)
      );
      setBarangays(sorted);
    } catch (error) {
      console.error('Error fetching barangays:', error);
    }
  };

  const handleProvinceSelect = (selectedProvince: AddressItem) => {
    onChange({
      province: selectedProvince.name,
      city: '',
      barangay: '',
      street: value.street,
    });
    setShowProvinceModal(false);
    setProvinceSearch('');
  };

  const handleCitySelect = (selectedCity: AddressItem) => {
    onChange({
      ...value,
      city: selectedCity.name,
      barangay: '',
    });
    setShowCityModal(false);
    setCitySearch('');
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

  const filteredProvinces = provinces.filter(province =>
    province.name.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const filteredBarangays = barangays.filter(barangay =>
    barangay.name.toLowerCase().includes(barangaySearch.toLowerCase())
  );

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
      {/* Province */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Province *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, errors?.province && styles.inputError]}
          onPress={() => setShowProvinceModal(true)}
          disabled={disabled}
        >
          <Text style={value.province ? styles.dropdownText : styles.dropdownPlaceholder}>
            {value.province || 'Select province'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        {errors?.province && <Text style={styles.errorText}>{errors.province}</Text>}
      </View>

      {/* City/Municipality */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City/Municipality *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, errors?.city && styles.inputError]}
          onPress={() => setShowCityModal(true)}
          disabled={disabled || !value.province}
        >
          <Text style={value.city ? styles.dropdownText : styles.dropdownPlaceholder}>
            {value.city || (value.province ? 'Select city' : 'Select province first')}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        {errors?.city && <Text style={styles.errorText}>{errors.city}</Text>}
      </View>

      {/* Barangay */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barangay *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, errors?.barangay && styles.inputError]}
          onPress={() => setShowBarangayModal(true)}
          disabled={disabled || !value.city}
        >
          <Text style={value.barangay ? styles.dropdownText : styles.dropdownPlaceholder}>
            {value.barangay || (value.city ? 'Select barangay' : 'Select city first')}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        {errors?.barangay && <Text style={styles.errorText}>{errors.barangay}</Text>}
      </View>

      {/* Street Address */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter street, house number, etc."
          value={value.street || ''}
          onChangeText={handleStreetChange}
          editable={!disabled}
        />
      </View>

      {/* Province Modal */}
      {renderDropdownModal(
        showProvinceModal,
        () => setShowProvinceModal(false),
        'Select Province',
        provinceSearch,
        setProvinceSearch,
        filteredProvinces,
        handleProvinceSelect,
        'Search provinces...'
      )}

      {/* City Modal */}
      {renderDropdownModal(
        showCityModal,
        () => setShowCityModal(false),
        'Select City/Municipality',
        citySearch,
        setCitySearch,
        filteredCities,
        handleCitySelect,
        'Search cities...'
      )}

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