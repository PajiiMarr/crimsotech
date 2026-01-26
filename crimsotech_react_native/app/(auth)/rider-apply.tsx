import { API_CONFIG } from '../../utils/config';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AxiosInstance from '../../contexts/axios';

const VEHICLE_TYPES = [
  { id: 'car', name: 'Car', icon: '🚗' },
  { id: 'motorcycle', name: 'Motorcycle', icon: '🏍️' },
  { id: 'bicycle', name: 'Bicycle', icon: '🚲' },
  { id: 'scooter', name: 'Scooter', icon: '🛴' },
  { id: 'van', name: 'Van', icon: '🚐' },
  { id: 'truck', name: 'Truck', icon: '🚚' },
];

export default function RiderApplyScreen() {
  const [vehicleType, setVehicleType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleImage, setVehicleImage] = useState<any>(null);
  const [licenseImage, setLicenseImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickImage = async (type: 'vehicle' | 'license') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'vehicle') {
          setVehicleImage(result.assets[0]);
        } else {
          setLicenseImage(result.assets[0]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!vehicleType) {
      newErrors.vehicle_type = 'Vehicle type is required';
    }
    if (!plateNumber.trim()) {
      newErrors.plate_number = 'Plate number is required';
    } else if (plateNumber.length > 20) {
      newErrors.plate_number = 'Plate number should be at most 20 characters';
    }
    if (!vehicleBrand.trim()) {
      newErrors.vehicle_brand = 'Vehicle brand is required';
    } else if (vehicleBrand.length > 50) {
      newErrors.vehicle_brand = 'Vehicle brand should be at most 50 characters';
    }
    if (!vehicleModel.trim()) {
      newErrors.vehicle_model = 'Vehicle model is required';
    } else if (vehicleModel.length > 50) {
      newErrors.vehicle_model = 'Vehicle model should be at most 50 characters';
    }
    if (!licenseNumber.trim()) {
      newErrors.license_number = 'License number is required';
    } else if (licenseNumber.length > 20) {
      newErrors.license_number = 'License number should be at most 20 characters';
    }
    if (!vehicleImage) {
      newErrors.vehicle_image = 'Vehicle image is required';
    }
    if (!licenseImage) {
      newErrors.license_image = 'License image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData
      const formData = new FormData();
      
      // Append text fields
      formData.append('vehicle_type', vehicleType);
      formData.append('plate_number', plateNumber.trim());
      formData.append('vehicle_brand', vehicleBrand.trim());
      formData.append('vehicle_model', vehicleModel.trim());
      formData.append('license_number', licenseNumber.trim());

      // Handle vehicle image
      if (vehicleImage) {
        // Get file extension
        const uriParts = vehicleImage.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];
        
        // Create file object
        const vehicleFile = {
          uri: vehicleImage.uri,
          type: `image/${fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'jpeg' : 'png'}`,
          name: `vehicle_${Date.now()}.${fileExtension}`,
        };

        // Append as blob
        formData.append('vehicle_image', vehicleFile as any);
      }

      // Handle license image
      if (licenseImage) {
        const uriParts = licenseImage.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];
        
        const licenseFile = {
          uri: licenseImage.uri,
          type: `image/${fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'jpeg' : 'png'}`,
          name: `license_${Date.now()}.${fileExtension}`,
        };

        formData.append('license_image', licenseFile as any);
      }

      console.log('📤 Sending rider registration (complete user+rider creation)...');
      
      // Use AxiosInstance for the API call - backend will create both user and rider
      const response = await AxiosInstance.post('/rider/register/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', response.data);

      if (response.status === 200 || response.status === 201) {
        const userId = response.data.user_id;
        const riderId = response.data.rider_id;

        if (userId && riderId) {
          // Store user and rider info in SecureStore
          await SecureStore.setItemAsync('riderId', riderId.toString());
          await SecureStore.setItemAsync('temp_user_id', userId.toString());
          await SecureStore.setItemAsync('registration_stage', '1');
          await SecureStore.setItemAsync('is_rider', 'true');

          // Also create a user object for auth context
          const userData = {
            user_id: userId,
            is_rider: true,
            registration_stage: 1,
          };
          await SecureStore.setItemAsync('user', JSON.stringify(userData));

          // Persist values expected by rider-signup (uses AsyncStorage)
          try {
            await AsyncStorage.setItem('userId', String(userId));
            await AsyncStorage.setItem('is_rider', 'true');
            await AsyncStorage.setItem('registration_stage', '1');
          } catch (e) {
            console.warn('Failed to persist AsyncStorage keys for rider signup', e);
          }

          Alert.alert(
            'Success',
            'Rider registration completed! Continue to create your rider account.',
            [{ 
              text: 'Continue to Sign up', 
              onPress: () => router.replace('/(auth)/rider-signup') 
            }]
          );
        } else {
          Alert.alert('Error', 'Invalid response from server');
        }
      } else {
        Alert.alert('Error', 'Registration failed with unexpected status');
      }
    } catch (error: any) {
      console.error('❌ Rider registration error:', error);
      
      // Handle Axios error
      if (error.response) {
        // Server responded with error status
        console.log('❌ Server validation errors:', error.response.data);
        
        const responseData = error.response.data;
        const fieldErrors: Record<string, string> = {};
        
        // Handle Django validation errors
        if (responseData && typeof responseData === 'object') {
          // Check for nested errors object
          if (responseData.errors) {
            Object.keys(responseData.errors).forEach(field => {
              if (Array.isArray(responseData.errors[field])) {
                fieldErrors[field] = responseData.errors[field][0];
              } else {
                fieldErrors[field] = responseData.errors[field];
              }
            });
          } else {
            // Direct field errors
            Object.keys(responseData).forEach(field => {
              if (Array.isArray(responseData[field])) {
                fieldErrors[field] = responseData[field][0];
              } else {
                fieldErrors[field] = responseData[field];
              }
            });
          }
          
          setErrors(fieldErrors);
          
          const errorMessages = Object.values(fieldErrors).join('\n');
          Alert.alert('Validation Error', errorMessages || 'Registration failed');
        } else {
          Alert.alert('Error', responseData?.error || responseData?.detail || 'Registration failed');
        }
      } else if (error.request) {
        // Request was made but no response
        console.log('❌ No response received:', error.request);
        Alert.alert('Network Error', 'No response from server. Please check your connection.');
      } else {
        // Something else happened
        console.log('❌ Error setting up request:', error.message);
        Alert.alert('Error', error.message || 'Failed to submit application. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply as Rider</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Become a Courier Partner</Text>
          <Text style={styles.subtitle}>
            Complete rider registration with your vehicle and license details
          </Text>

          {/* Vehicle Type Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Vehicle Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.vehicleGrid}>
              {VEHICLE_TYPES.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.vehicleCard,
                    vehicleType === vehicle.id && styles.vehicleCardSelected,
                  ]}
                  onPress={() => setVehicleType(vehicle.id)}
                >
                  <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.vehicle_type && <Text style={styles.errorText}>{errors.vehicle_type}</Text>}
          </View>

          {/* Plate Number */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Plate Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.plate_number && styles.inputError]}
              value={plateNumber}
              onChangeText={(text) => {
                setPlateNumber(text);
                if (errors.plate_number) setErrors(prev => ({ ...prev, plate_number: '' }));
              }}
              placeholder="Enter plate number"
              maxLength={20}
              autoCapitalize="characters"
              editable={!loading}
            />
            {errors.plate_number && <Text style={styles.errorText}>{errors.plate_number}</Text>}
          </View>

          {/* Vehicle Brand */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Vehicle Brand <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.vehicle_brand && styles.inputError]}
              value={vehicleBrand}
              onChangeText={(text) => {
                setVehicleBrand(text);
                if (errors.vehicle_brand) setErrors(prev => ({ ...prev, vehicle_brand: '' }));
              }}
              placeholder="e.g., Honda, Toyota"
              maxLength={50}
              editable={!loading}
            />
            {errors.vehicle_brand && <Text style={styles.errorText}>{errors.vehicle_brand}</Text>}
          </View>

          {/* Vehicle Model */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Vehicle Model <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.vehicle_model && styles.inputError]}
              value={vehicleModel}
              onChangeText={(text) => {
                setVehicleModel(text);
                if (errors.vehicle_model) setErrors(prev => ({ ...prev, vehicle_model: '' }));
              }}
              placeholder="e.g., Civic, Vios"
              maxLength={50}
              editable={!loading}
            />
            {errors.vehicle_model && <Text style={styles.errorText}>{errors.vehicle_model}</Text>}
          </View>

          {/* License Number */}
          <View style={styles.section}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.license_number && styles.inputError]}
              value={licenseNumber}
              onChangeText={(text) => {
                setLicenseNumber(text);
                if (errors.license_number) setErrors(prev => ({ ...prev, license_number: '' }));
              }}
              placeholder="Enter driver's license number"
              maxLength={20}
              autoCapitalize="characters"
              editable={!loading}
            />
            {errors.license_number && <Text style={styles.errorText}>{errors.license_number}</Text>}
          </View>

          {/* Vehicle Image */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Vehicle Photo <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.imageUpload, errors.vehicle_image && styles.inputError]}
              onPress={() => pickImage('vehicle')}
              disabled={loading}
            >
              {vehicleImage ? (
                <Image source={{ uri: vehicleImage.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={32} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Upload Vehicle Photo</Text>
                  <Text style={styles.imageHintText}>Maximum 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.vehicle_image && <Text style={styles.errorText}>{errors.vehicle_image}</Text>}
          </View>

          {/* License Image */}
          <View style={styles.section}>
            <Text style={styles.label}>
              License Photo <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.imageUpload, errors.license_image && styles.inputError]}
              onPress={() => pickImage('license')}
              disabled={loading}
            >
              {licenseImage ? (
                <Image source={{ uri: licenseImage.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={32} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Upload License Photo</Text>
                  <Text style={styles.imageHintText}>Maximum 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.license_image && <Text style={styles.errorText}>{errors.license_image}</Text>}
          </View>

          {/* General errors */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Complete Rider Registration</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Note: A temporary account has been created. You can now log in with your credentials.
            Your application will be reviewed by our team. You'll be notified once approved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 40,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ff6d0b',
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vehicleCard: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  vehicleCardSelected: {
    borderColor: '#ff6d0b',
    backgroundColor: '#fff5f0',
  },
  vehicleIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  imageUpload: {
    height: 200,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  imageHintText: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  generalErrorContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  generalErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
});