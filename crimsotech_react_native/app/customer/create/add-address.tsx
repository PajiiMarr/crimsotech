// app/customer/create/add-address.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';
import * as Location from 'expo-location';
import MapPickerModal from '../components/MapPickerModal';

interface AddressFormData {
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  barangay_id: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name: string;
  landmark: string;
  instructions: string;
  address_type: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
}

// All Zamboanga City Barangays
const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco",
  "Ayala",
  "Baliwasan",
  "Baliwasan Chico",
  "Baluno",
  "Boalan",
  "Bolong",
  "Buenavista",
  "Bunguiao",
  "Busay",
  "Cabatangan",
  "Cacao",
  "Calabasa",
  "Calarian",
  "Camino Nuevo",
  "Camino Viejo",
  "Canelar",
  "Capisan",
  "Cawit",
  "Culianan",
  "Curuan",
  "Dita",
  "Dulian (Upper Bunguiao)",
  "Dulian (Upper Curuan)",
  "Dumpsa",
  "Guisao",
  "Guiwan",
  "Lamisahan",
  "Latuan",
  "La Paz",
  "Lapakan",
  "Limpapa",
  "Lunzuran",
  "Lumayang",
  "Mampang",
  "Manalipa",
  "Manicahan",
  "Maasin",
  "Mangusu",
  "Mariki",
  "Mercedes",
  "Muti",
  "Pasonanca",
  "Patalon",
  "Pamucutan",
  "Pasilmanta",
  "Pitogo",
  "Poblacion",
  "Putik",
  "Quiniput",
  "Recodo",
  "Rio Hondo",
  "San Isidro",
  "San Jose Cawa-Cawa",
  "San Jose Gusu",
  "San Ramon",
  "San Roque",
  "Sangali",
  "Santa Barbara",
  "Santa Catalina",
  "Santa Maria",
  "Santo Niño",
  "Sinubong",
  "Sinunuc",
  "Tagasilay",
  "Taguiti",
  "Talisayan",
  "Talabaan",
  "Taluksangay",
  "Talon-Talon",
  "Tictapul",
  "Tigbalabag",
  "Tolosa",
  "Tugbungan",
  "Tumaga",
  "Tumitus",
  "Upper Calarian",
  "Victoria",
  "Vitali",
  "Zambowood",
  "Zone I (Poblacion)",
  "Zone II (Poblacion)",
  "Zone III (Poblacion)",
  "Zone IV (Poblacion)",
  "Zone V (Poblacion)"
].sort();

export default function AddAddressPage() {
  const { user } = useAuth();
  const { mode, address } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [mapLocation, setMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinnedAddress, setPinnedAddress] = useState<string>('');
  const [formData, setFormData] = useState<AddressFormData>({
    recipient_name: '',
    recipient_phone: '',
    street: '',
    barangay: '',
    barangay_id: '',
    city: 'Zamboanga City',
    province: 'Zamboanga del Sur',
    zip_code: '7000',
    country: 'Philippines',
    building_name: '',
    landmark: '',
    instructions: '',
    address_type: 'home',
    is_default: false,
    latitude: null,
    longitude: null,
  });
  const [errors, setErrors] = useState({
    recipient_name: '',
    recipient_phone: '',
    barangay: '',
    street: '',
  });

  // Fixed location details (Zamboanga only)
  const defaultLocation = {
    country: 'Philippines',
    province: 'Zamboanga del Sur',
    city: 'Zamboanga City',
    zip_code: '7000',
  };

  // Filtered barangays based on search
  const filteredBarangays = ZAMBOANGA_BARANGAYS.filter(barangay =>
    barangay.toLowerCase().includes(barangaySearch.toLowerCase())
  );

  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      
      if (mode === 'edit' && address) {
        setIsEditMode(true);
        
        try {
          const parsedAddress = JSON.parse(address as string);
          setAddressId(parsedAddress.id);
          
          setFormData({
            recipient_name: parsedAddress.recipient_name || '',
            recipient_phone: parsedAddress.recipient_phone || '',
            street: parsedAddress.street || '',
            barangay: parsedAddress.barangay || '',
            barangay_id: parsedAddress.barangay_id || '',
            city: parsedAddress.city || 'Zamboanga City',
            province: parsedAddress.province || 'Zamboanga del Sur',
            zip_code: parsedAddress.zip_code || '7000',
            country: parsedAddress.country || 'Philippines',
            building_name: parsedAddress.building_name || '',
            landmark: parsedAddress.landmark || '',
            instructions: parsedAddress.instructions || '',
            address_type: parsedAddress.address_type || 'home',
            is_default: parsedAddress.is_default || false,
            latitude: parsedAddress.latitude || null,
            longitude: parsedAddress.longitude || null,
          });
          
          if (parsedAddress.latitude && parsedAddress.longitude) {
            setMapLocation({
              latitude: parseFloat(parsedAddress.latitude),
              longitude: parseFloat(parsedAddress.longitude),
            });
            setPinnedAddress(parsedAddress.street || 'Pinned location');
          }
        } catch (error) {
          console.error('Error parsing address data:', error);
          Alert.alert('Error', 'Failed to load address data');
          router.back();
        }
      }
      
      setLoading(false);
    };

    initializeForm();
  }, [mode, address]);

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean | number | null) => {
    // Format phone number as user types
    if (field === 'recipient_phone' && typeof value === 'string') {
      // Remove all non-digits
      let cleaned = value.replace(/\D/g, '');
      // Limit to 11 digits
      if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
      value = cleaned;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBarangaySelect = (barangay: string) => {
    setFormData(prev => ({ ...prev, barangay, barangay_id: barangay.toLowerCase().replace(/\s+/g, '-') }));
    setErrors(prev => ({ ...prev, barangay: '' }));
    setShowBarangayModal(false);
    setBarangaySearch('');
  };

  const validateForm = (): boolean => {
    const newErrors = {
      recipient_name: '',
      recipient_phone: '',
      barangay: '',
      street: '',
    };
    let isValid = true;

    if (!formData.recipient_name.trim()) {
      newErrors.recipient_name = 'Recipient name is required';
      isValid = false;
    }
    if (!formData.recipient_phone.trim()) {
      newErrors.recipient_phone = 'Phone number is required';
      isValid = false;
    } else {
      // Remove any non-digit characters for validation
      const cleanPhone = formData.recipient_phone.replace(/\D/g, '');
      if (cleanPhone.length !== 11) {
        newErrors.recipient_phone = 'Phone number must be exactly 11 digits';
        isValid = false;
      } else if (!/^09\d{9}$/.test(cleanPhone)) {
        newErrors.recipient_phone = 'Please enter a valid Philippine mobile number (starting with 09)';
        isValid = false;
      }
    }
    if (!formData.barangay) {
      newErrors.barangay = 'Please select a barangay';
      isValid = false;
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<{
    fullAddress: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    country: string;
    zipCode: string;
  }> => {
    try {
      // Try OpenStreetMap Nominatim first (more detailed for Philippines)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CrimsotechApp/1.0 (contact@crimsotech.com)', Accept: 'application/json' },
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.warn('Nominatim returned non-JSON response (first 200 chars):', text.slice(0, 200));
        // Fallback to Expo Location
        try {
          const expoAddress = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (expoAddress.length > 0) {
            const a = expoAddress[0];
            return {
              fullAddress: [a.name, a.street, a.district, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', '),
              street: a.street || a.name || '',
              barangay: a.district || '',
              city: a.city || 'Zamboanga City',
              province: a.region || 'Zamboanga del Sur',
              country: a.country || 'Philippines',
              zipCode: a.postalCode || '7000',
            };
          }
        } catch (e) {
          console.error('Expo fallback error:', e);
        }

        return {
          fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          street: '',
          barangay: '',
          city: 'Zamboanga City',
          province: 'Zamboanga del Sur',
          country: 'Philippines',
          zipCode: '7000',
        };
      }

      if (data && data.address) {
        const address = data.address;
        const street = address.road || address.pedestrian || address.footway || '';
        const barangay = address.suburb || address.village || address.neighbourhood || address.hamlet || '';
        const city = address.city || address.town || address.municipality || '';
        const province = address.state || address.province || '';
        const country = address.country || '';
        const zipCode = address.postcode || '';

        const fullAddressParts = [];
        if (street) fullAddressParts.push(street);
        if (barangay) fullAddressParts.push(barangay);
        if (city) fullAddressParts.push(city);
        if (province) fullAddressParts.push(province);
        if (zipCode) fullAddressParts.push(zipCode);
        if (country) fullAddressParts.push(country);

        const fullAddress = fullAddressParts.length > 0 ? fullAddressParts.join(', ') : data.display_name;

        return {
          fullAddress: fullAddress || `${latitude}, ${longitude}`,
          street,
          barangay,
          city: city || 'Zamboanga City',
          province: province || 'Zamboanga del Sur',
          country: country || 'Philippines',
          zipCode: zipCode || '7000',
        };
      }

      throw new Error('No address found');
    } catch (error) {
      console.error('Nominatim error:', error);
      // Fallback to Expo Location
      try {
        const expoAddress = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (expoAddress.length > 0) {
          const a = expoAddress[0];
          return {
            fullAddress: [a.street, a.district, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', '),
            street: a.street || a.name || '',
            barangay: a.district || '',
            city: a.city || 'Zamboanga City',
            province: a.region || 'Zamboanga del Sur',
            country: a.country || 'Philippines',
            zipCode: a.postalCode || '7000',
          };
        }
      } catch (e) {
        console.error('Expo fallback error:', e);
      }

      return {
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        street: '',
        barangay: '',
        city: 'Zamboanga City',
        province: 'Zamboanga del Sur',
        country: 'Philippines',
        zipCode: '7000',
      };
    }
  };
  const isAddressValid = (address: string): boolean => {
    // Check if it's a Plus Code (e.g., "W46P+3X7, City Name")
    const isPlusCode = /^[A-Z0-9]{2,}\+[A-Z0-9]{2,}/.test(address);
    
    // Check if it contains generic terms
    const hasGenericTerms = /unnamed|unknown|unnamed road/i.test(address);
    
    // Check if it's too short or just coordinates
    const isTooShort = address.length < 10;
    const isCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(address);
    
    return !(isPlusCode || hasGenericTerms || isTooShort || isCoordinates);
  };
  const handleMapPickerSelect = async (location: { latitude: number; longitude: number; address: string }) => {
    // Update map location
    setMapLocation({ latitude: location.latitude, longitude: location.longitude });
    setPinnedAddress(location.address);
    
    // Update form data with coordinates
    setFormData(prev => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    
    // Get detailed address components
    const addressDetails = await reverseGeocode(location.latitude, location.longitude);
    
    // Check if the address is unknown (Plus Code or has no street)
    const isUnknownAddress = !addressDetails.street || 
      addressDetails.street === '' ||
      /^[A-Z0-9]{2,}\+[A-Z0-9]{2,}/.test(location.address) ||
      location.address.includes('+') && location.address.length < 20;
    
    if (isUnknownAddress) {
      // Only auto-fill barangay and other fields, leave street empty for manual input
      handleInputChange('street', ''); // Set empty for manual input
      handleInputChange('barangay', addressDetails.barangay);
      handleInputChange('city', addressDetails.city);
      handleInputChange('province', addressDetails.province);
      handleInputChange('country', addressDetails.country);
      handleInputChange('zip_code', addressDetails.zipCode);
      
      // No alert - just silently update
    } else {
      // Auto-fill ALL address fields including street
      handleInputChange('street', addressDetails.street);
      handleInputChange('barangay', addressDetails.barangay);
      handleInputChange('city', addressDetails.city);
      handleInputChange('province', addressDetails.province);
      handleInputChange('country', addressDetails.country);
      handleInputChange('zip_code', addressDetails.zipCode);
      
      // No alert - just silently update
    }
  };

  const handleAddAddress = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }
  
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
  
    try {
      setSaving(true);
      const response = await AxiosInstance.post(
        '/shipping-address/add_shipping_address/',
        {
          user_id: user.id,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          street: formData.street,
          barangay: formData.barangay,
          barangay_id: formData.barangay_id,
          city: defaultLocation.city,
          province: defaultLocation.province,
          zip_code: defaultLocation.zip_code,
          country: defaultLocation.country,
          building_name: formData.building_name,
          landmark: formData.landmark,
          instructions: formData.instructions,
          address_type: formData.address_type,
          is_default: formData.is_default,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Address added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error adding address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add address'
      );
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateAddress = async () => {
    if (!user?.id || !addressId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }
  
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
  
    try {
      setSaving(true);
      const response = await AxiosInstance.put(
        '/shipping-address/update_shipping_address/',
        {
          address_id: addressId,
          user_id: user.id,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          street: formData.street,
          barangay: formData.barangay,
          barangay_id: formData.barangay_id,
          city: defaultLocation.city,
          province: defaultLocation.province,
          zip_code: defaultLocation.zip_code,
          country: defaultLocation.country,
          building_name: formData.building_name,
          landmark: formData.landmark,
          instructions: formData.instructions,
          address_type: formData.address_type,
          is_default: formData.is_default,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Address updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error updating address:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update address'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (isEditMode) {
      handleUpdateAddress();
    } else {
      handleAddAddress();
    }
  };

  const handleDeleteAddress = () => {
    if (!user?.id || !addressId) return;

    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await AxiosInstance.delete(
                '/shipping-address/delete_shipping_address/',
                {
                  data: {
                    address_id: addressId,
                    user_id: user.id
                  }
                }
              );
              
              if (response.data.success) {
                Alert.alert('Success', 'Address deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              }
            } catch (error: any) {
              console.error('Error deleting address:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete address'
              );
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>
            {isEditMode ? 'Loading address...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Address' : 'Add New Address'}
          </Text>
          
          {isEditMode && (
            <TouchableOpacity 
              style={styles.deleteHeaderButton}
              onPress={handleDeleteAddress}
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card 1: Contact Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color="#F97316" />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Name *</Text>
            <TextInput
              style={[styles.input, errors.recipient_name ? styles.inputError : null]}
              value={formData.recipient_name}
              onChangeText={(text) => handleInputChange('recipient_name', text)}
              placeholder="Enter recipient name"
              placeholderTextColor="#9CA3AF"
            />
            {errors.recipient_name ? (
              <Text style={styles.errorText}>{errors.recipient_name}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.recipient_phone ? styles.inputError : null]}
              value={formData.recipient_phone}
              onChangeText={(text) => handleInputChange('recipient_phone', text)}
              placeholder="Enter 11-digit mobile number (e.g., 09123456789)"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={11}
            />
            {errors.recipient_phone ? (
              <Text style={styles.errorText}>{errors.recipient_phone}</Text>
            ) : null}
          </View>
        </View>

        {/* Card 2: Delivery Location Display */}
        <View style={styles.locationCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#F97316" />
            <Text style={styles.cardTitle}>Delivery Location</Text>
          </View>
          <View style={styles.locationContent}>
            <View style={styles.locationRow}>
              <Ionicons name="flag-outline" size={16} color="#78350F" />
              <Text style={styles.locationText}>{defaultLocation.country}</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="business-outline" size={16} color="#78350F" />
              <Text style={styles.locationText}>{defaultLocation.province}</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="home-outline" size={16} color="#78350F" />
              <Text style={styles.locationText}>{defaultLocation.city}</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="mail-outline" size={16} color="#78350F" />
              <Text style={styles.locationText}>Postal Code: {defaultLocation.zip_code}</Text>
            </View>
          </View>
        </View>

        {/* Card 3: Address Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={20} color="#F97316" />
            <Text style={styles.cardTitle}>Address Details</Text>
          </View>

          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <Ionicons name="map" size={18} color="#F97316" />
              <Text style={styles.mapTitle}>Pin Location (Optional)</Text>
            </View>
            <Text style={styles.mapSubtitle}>
              Pin your exact location on the map for easier delivery
            </Text>
            
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => setShowMapModal(true)}
            >
              <Ionicons name="location-outline" size={20} color="#F97316" />
              <Text style={styles.mapButtonText}>
                {formData.latitude && formData.longitude ? 'Update Pinned Location' : 'Pin Location on Map'}
              </Text>
            </TouchableOpacity>
            
            {formData.latitude && formData.longitude && pinnedAddress && (
              <View style={styles.pinnedLocationCard}>
                <Ionicons name="location-sharp" size={16} color="#10B981" />
                <Text style={styles.pinnedLocationText} numberOfLines={2}>
                  {pinnedAddress}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setMapLocation({ latitude: formData.latitude!, longitude: formData.longitude! });
                    setShowMapModal(true);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#F97316" />
                </TouchableOpacity>
              </View>
            )}

              {/* <View style={styles.detailedAddressCard}>
                <View style={styles.detailedAddressHeader}>
                  <Ionicons name="document-text-outline" size={16} color="#0369A1" />
                  <Text style={styles.detailedAddressTitle}>Full Address from Pin:</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📍 Street:</Text>
                  <Text style={styles.detailValue}>{formData.street || '—'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🏘️ Barangay:</Text>
                  <Text style={styles.detailValue}>{formData.barangay || '—'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🏙️ City:</Text>
                  <Text style={styles.detailValue}>{formData.city}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📌 Province:</Text>
                  <Text style={styles.detailValue}>{formData.province}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📮 ZIP Code:</Text>
                  <Text style={styles.detailValue}>{formData.zip_code}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🌏 Country:</Text>
                  <Text style={styles.detailValue}>{formData.country}</Text>
                </View>
              </View> */}
          </View>
          <View style={styles.divider} />
          
          {/* Barangay Selection - Custom Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barangay *</Text>
            <TouchableOpacity 
              style={[styles.barangayButton, errors.barangay ? styles.barangayButtonError : null]}
              onPress={() => setShowBarangayModal(true)}
            >
              <Text style={formData.barangay ? styles.barangayButtonText : styles.barangayButtonPlaceholder}>
                {formData.barangay || 'Select Barangay'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {errors.barangay ? <Text style={styles.errorText}>{errors.barangay}</Text> : null}
          </View>

          {/* Street Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={[styles.input, styles.streetInput, errors.street ? styles.inputError : null]}
              value={formData.street}
              onChangeText={(text) => handleInputChange('street', text)}
              placeholder="Enter house number, street name, purok"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <Text style={styles.helpText}>
              Example: 123 Rizal Street, Purok 1
            </Text>
            {errors.street ? <Text style={styles.errorText}>{errors.street}</Text> : null}
          </View>

          {/* Building/House/Floor/Unit - Combined */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Building/House/Floor/Unit (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.building_name}
              onChangeText={(text) => handleInputChange('building_name', text)}
              placeholder="e.g., ABC Building, 3rd Floor, Unit 5B"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <Text style={styles.helpText}>
              Include building name, floor number, and unit number here
            </Text>
          </View>

          {/* Landmark */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.landmark}
              onChangeText={(text) => handleInputChange('landmark', text)}
              placeholder="e.g., Near 7-Eleven, beside church"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Delivery Instructions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.instructions}
              onChangeText={(text) => handleInputChange('instructions', text)}
              placeholder="Special instructions for the rider"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Map Pin Location - Optional */}
      
          
         
        </View>

        {/* Card 4: Address Type & Default */}
        <View style={styles.card}>
          {/* <View style={styles.cardHeader}>
            <Ionicons name="settings-outline" size={20} color="#F97316" />
            <Text style={styles.cardTitle}>Preferences</Text>
          </View> */}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>
            <View style={styles.typeButtons}>
              {['home', 'work', 'other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.address_type === type && styles.typeButtonActive
                  ]}
                  onPress={() => handleInputChange('address_type', type)}
                >
                  <Ionicons 
                    name={type === 'home' ? 'home-outline' : type === 'work' ? 'briefcase-outline' : 'location-outline'} 
                    size={18} 
                    color={formData.address_type === type ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    formData.address_type === type && styles.typeButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleInputChange('is_default', !formData.is_default)}
          >
            <View style={[
              styles.checkbox,
              formData.is_default && styles.checkboxChecked
            ]}>
              {formData.is_default && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Set as default shipping address
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Address' : 'Save Address'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Barangay Modal */}
      <Modal
        visible={showBarangayModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay</Text>
              <TouchableOpacity onPress={() => setShowBarangayModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search barangay..."
                value={barangaySearch}
                onChangeText={setBarangaySearch}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <FlatList
              data={filteredBarangays}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.barangayItem}
                  onPress={() => handleBarangaySelect(item)}
                >
                  <Ionicons name="location-outline" size={18} color="#F97316" />
                  <Text style={styles.barangayItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onSelect={handleMapPickerSelect}
        initialLatitude={formData.latitude}
        initialLongitude={formData.longitude}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerSafeArea: { backgroundColor: '#FFF',paddingTop: Platform.OS === 'android' ? 30 : 20, },
  backButton: { marginRight: 20, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'black', flex: 1, textAlign: 'center' },
  deleteHeaderButton: { padding: 4 },
  content: { flex: 1, paddingHorizontal: 0, paddingTop: 12 },
  
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  locationCard: {
    backgroundColor: '#FFF7ED',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FED7AA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  textArea: { height: 80, textAlignVertical: 'top' },
  streetInput: { minHeight: 50 },
  helpText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  
  locationContent: { gap: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationText: { fontSize: 14, color: '#78350F', fontWeight: '500' },
  
  // Barangay Button
  barangayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  barangayButtonError: { borderColor: '#EF4444' },
  barangayButtonText: { fontSize: 15, color: '#111827' },
  barangayButtonPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  
  typeButtons: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  typeButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  typeButtonTextActive: { color: '#FFFFFF' },
  
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#F97316', borderColor: '#F97316' },
  checkboxLabel: { fontSize: 14, color: '#374151' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  mapSection: { marginTop: 4 },
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mapTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  mapSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  mapButtonText: { fontSize: 14, fontWeight: '600', color: '#F97316' },
  pinnedLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  pinnedLocationText: { flex: 1, fontSize: 12, color: '#065F46', fontWeight: '500' },
  
  detailedAddressCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  detailedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  detailedAddressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    width: 85,
  },
  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    flex: 1,
    lineHeight: 18,
  },
  
  submitButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  barangayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  barangayItemText: { fontSize: 15, color: '#111827', flex: 1 },
});