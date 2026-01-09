import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getProvinces, getCitiesByProvince, getBarangaysByCity, type Province, type City, type Barangay } from '../../utils/philippinesAddresses';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  houseNumber: string;
  addressLine1: string;
  addressLine2?: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
  isDefault: boolean;
}

const mockAddresses: Address[] = [
  {
    id: '1',
    label: 'Home',
    fullName: 'Juan Dela Cruz',
    phone: '+63 912 345 6789',
    houseNumber: '123',
    addressLine1: 'Main Street',
    addressLine2: 'Near City Hall',
    province: 'Zamboanga del Sur',
    city: 'Zamboanga City',
    barangay: 'Tetuan',
    postalCode: '7000',
    isDefault: true,
  },
];

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  const [formData, setFormData] = useState({
    label: '',
    fullName: '',
    phone: '',
    houseNumber: '',
    addressLine1: '',
    addressLine2: '',
    province: '',
    provinceCode: '',
    city: '',
    cityCode: '',
    barangay: '',
    barangayCode: '',
    postalCode: '',
  });

  const [provinces] = useState<Province[]>(getProvinces());
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [filteredProvinces, setFilteredProvinces] = useState<Province[]>(provinces);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<Barangay[]>([]);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');

  useEffect(() => {
    if (provinceSearch) {
      setFilteredProvinces(
        provinces.filter((p) =>
          p.name.toLowerCase().includes(provinceSearch.toLowerCase())
        )
      );
    } else {
      setFilteredProvinces(provinces);
    }
  }, [provinceSearch, provinces]);

  useEffect(() => {
    if (formData.provinceCode) {
      const provinceCities = getCitiesByProvince(formData.provinceCode);
      setCities(provinceCities);
      setFilteredCities(provinceCities);
    } else {
      setCities([]);
      setFilteredCities([]);
    }
  }, [formData.provinceCode]);

  useEffect(() => {
    if (formData.cityCode) {
      const cityBarangays = getBarangaysByCity(formData.cityCode);
      setBarangays(cityBarangays);
      setFilteredBarangays(cityBarangays);
    } else {
      setBarangays([]);
      setFilteredBarangays([]);
    }
  }, [formData.cityCode]);

  useEffect(() => {
    if (barangaySearch) {
      setFilteredBarangays(
        barangays.filter((b) =>
          b.name.toLowerCase().includes(barangaySearch.toLowerCase())
        )
      );
    } else {
      setFilteredBarangays(barangays);
    }
  }, [barangaySearch, barangays]);

  useEffect(() => {
    if (citySearch) {
      setFilteredCities(
        cities.filter((c) =>
          c.name.toLowerCase().includes(citySearch.toLowerCase())
        )
      );
    } else {
      setFilteredCities(cities);
    }
  }, [citySearch, cities]);

  const handleProvinceSelect = (province: Province) => {
    setFormData({
      ...formData,
      province: province.name,
      provinceCode: province.code,
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
    });
    setShowProvinceModal(false);
    setProvinceSearch('');
  };

  const handleCitySelect = (city: City) => {
    setFormData({
      ...formData,
      city: city.name,
      cityCode: city.code,
      barangay: '',
      barangayCode: '',
    });
    setShowCityModal(false);
    setCitySearch('');
  };

  const handleBarangaySelect = (barangay: Barangay) => {
    setFormData({
      ...formData,
      barangay: barangay.name,
      barangayCode: barangay.code,
    });
    setShowBarangayModal(false);
    setBarangaySearch('');
  };

  const handleSaveAddress = () => {
    if (
      !formData.label ||
      !formData.fullName ||
      !formData.phone ||
      !formData.houseNumber ||
      !formData.addressLine1 ||
      !formData.province ||
      !formData.city ||
      !formData.barangay ||
      !formData.postalCode
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (editingAddress) {
      // Update existing address
      setAddresses(
        addresses.map((addr) =>
          addr.id === editingAddress.id
            ? {
                ...formData,
                id: editingAddress.id,
                isDefault: editingAddress.isDefault,
              }
            : addr
        )
      );
    } else {
      // Add new address
      const newAddress: Address = {
        ...formData,
        id: Date.now().toString(),
        isDefault: addresses.length === 0,
      };
      setAddresses([...addresses, newAddress]);
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAddresses(addresses.filter((addr) => addr.id !== id));
          },
        },
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    const provinceCode = provinces.find((p) => p.name === address.province)?.code || '';
    const provinceCities = getCitiesByProvince(provinceCode);
    const cityCode = provinceCities.find((c) => c.name === address.city)?.code || '';
    const cityBarangays = getBarangaysByCity(cityCode);
    const barangayCode = cityBarangays.find((b) => b.name === address.barangay)?.code || '';
    
    setFormData({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      houseNumber: address.houseNumber,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      province: address.province,
      provinceCode: provinceCode,
      city: address.city,
      cityCode: cityCode,
      barangay: address.barangay,
      barangayCode: barangayCode,
      postalCode: address.postalCode,
    });
    setCities(provinceCities);
    setFilteredCities(provinceCities);
    setBarangays(cityBarangays);
    setFilteredBarangays(cityBarangays);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      label: '',
      fullName: '',
      phone: '',
      houseNumber: '',
      addressLine1: '',
      addressLine2: '',
      province: '',
      provinceCode: '',
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
      postalCode: '',
    });
    setEditingAddress(null);
    setCities([]);
    setFilteredCities([]);
    setBarangays([]);
    setFilteredBarangays([]);
  };

  const renderAddressCard = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressLabelContainer}>
          <Text style={styles.addressLabel}>{item.label}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            onPress={() => handleEditAddress(item)}
            style={styles.actionButton}
          >
            <MaterialIcons name="edit" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteAddress(item.id)}
            style={styles.actionButton}
          >
            <MaterialIcons name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.addressName}>{item.fullName}</Text>
      <Text style={styles.addressPhone}>{item.phone}</Text>
      <Text style={styles.addressText}>
        {item.houseNumber} {item.addressLine1}
        {item.addressLine2 && `, ${item.addressLine2}`}
      </Text>
      <Text style={styles.addressText}>
        {item.barangay}, {item.city}, {item.province} {item.postalCode}
      </Text>
      {!item.isDefault && (
        <TouchableOpacity
          onPress={() => handleSetDefault(item.id)}
          style={styles.setDefaultButton}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Addresses</Text>
        <View style={styles.spacer} />
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="location-on" size={60} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Addresses</Text>
          <Text style={styles.emptySubtitle}>
            Add a shipping address to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddressCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      >
        <MaterialIcons name="add" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <MaterialIcons name="close" size={24} color="#212529" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Label *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Home, Office"
                value={formData.label}
                onChangeText={(text) => setFormData({ ...formData, label: text })}
              />

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+63 912 345 6789"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>House Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 123"
                value={formData.houseNumber}
                onChangeText={(text) => setFormData({ ...formData, houseNumber: text })}
                keyboardType="default"
              />

              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Street name, Subdivision, etc."
                value={formData.addressLine1}
                onChangeText={(text) => setFormData({ ...formData, addressLine1: text })}
              />

              <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Building, Unit, Landmark (optional)"
                value={formData.addressLine2}
                onChangeText={(text) => setFormData({ ...formData, addressLine2: text })}
              />

              <Text style={styles.inputLabel}>Province *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowProvinceModal(true)}
              >
                <Text style={[styles.selectInputText, !formData.province && styles.placeholder]}>
                  {formData.province || 'Select Province'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>City/Municipality *</Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  !formData.provinceCode && styles.disabledInput,
                ]}
                onPress={() => {
                  if (formData.provinceCode) {
                    setShowCityModal(true);
                  } else {
                    Alert.alert('Select Province', 'Please select a province first');
                  }
                }}
                disabled={!formData.provinceCode}
              >
                <Text
                  style={[
                    styles.selectInputText,
                    !formData.city && styles.placeholder,
                  ]}
                >
                  {formData.city || 'Select City/Municipality'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Barangay *</Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  !formData.cityCode && styles.disabledInput,
                ]}
                onPress={() => {
                  if (formData.cityCode) {
                    setShowBarangayModal(true);
                  } else {
                    Alert.alert('Select City', 'Please select a city/municipality first');
                  }
                }}
                disabled={!formData.cityCode}
              >
                <Text
                  style={[
                    styles.selectInputText,
                    !formData.barangay && styles.placeholder,
                  ]}
                >
                  {formData.barangay || 'Select Barangay'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Postal Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1200"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAddress}
              >
                <Text style={styles.saveButtonText}>
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Province Selection Modal */}
      <Modal
        visible={showProvinceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowProvinceModal(false);
          setProvinceSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Province</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProvinceModal(false);
                  setProvinceSearch('');
                }}
              >
                <MaterialIcons name="close" size={24} color="#212529" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search province..."
              value={provinceSearch}
              onChangeText={setProvinceSearch}
            />
            <FlatList
              data={filteredProvinces}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleProvinceSelect(item)}
                >
                  <Text style={styles.listItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCityModal(false);
          setCitySearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City/Municipality</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCityModal(false);
                  setCitySearch('');
                }}
              >
                <MaterialIcons name="close" size={24} color="#212529" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search city/municipality..."
              value={citySearch}
              onChangeText={setCitySearch}
            />
            {filteredCities.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                  No cities/municipalities found for this province
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleCitySelect(item)}
                  >
                    <Text style={styles.listItemText}>
                      {item.name} ({item.type === 'city' ? 'City' : 'Municipality'})
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Barangay Selection Modal */}
      <Modal
        visible={showBarangayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowBarangayModal(false);
          setBarangaySearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowBarangayModal(false);
                  setBarangaySearch('');
                }}
              >
                <MaterialIcons name="close" size={24} color="#212529" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search barangay..."
              value={barangaySearch}
              onChangeText={setBarangaySearch}
            />
            {filteredBarangays.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                  No barangays found for this city
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredBarangays}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleBarangaySelect(item)}
                  >
                    <Text style={styles.listItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  listContent: {
    padding: isSmallDevice ? 12 : 16,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallDevice ? 16 : 20,
    marginBottom: isSmallDevice ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLabel: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: '#212529',
    marginRight: 8,
    fontFamily: 'System',
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#388E3C',
    fontWeight: '500',
    fontFamily: 'System',
  },
  addressActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  addressName: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'System',
  },
  addressPhone: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'System',
  },
  addressText: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
    fontFamily: 'System',
  },
  setDefaultButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  setDefaultText: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#2196F3',
    fontWeight: '500',
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isSmallDevice ? 32 : 48,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f77d0cff',
    marginHorizontal: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  inputLabel: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
    marginTop: 16,
    fontFamily: 'System',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 14,
    fontSize: isSmallDevice ? 14 : 15,
    color: '#212529',
    fontFamily: 'System',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  selectInputText: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 15,
    color: '#212529',
    fontFamily: 'System',
  },
  placeholder: {
    color: '#9E9E9E',
  },
  saveButton: {
    backgroundColor: '#f77d0cff',
    borderRadius: 8,
    paddingVertical: isSmallDevice ? 14 : 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 14,
    fontSize: isSmallDevice ? 14 : 15,
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: 'System',
  },
  listItem: {
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  listItemText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: '#212529',
    fontFamily: 'System',
  },
  emptyListContainer: {
    padding: isSmallDevice ? 32 : 48,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

