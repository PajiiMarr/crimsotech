// app/(auth)/setup-account.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker'; // Add this package: npx expo install @react-native-community/datetimepicker

export default function SetupAccountScreen() {
  const { register, updateUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    province: '',
    city: '',
    barangay: '',
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    province: '',
    city: '',
    barangay: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);
  const [date, setDate] = useState(new Date());
  const [mode] = useState<'date' | 'time'>('date');

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Handle the error field mapping - API returns different field names
    const errorFieldMap: { [key: string]: string } = {
      'sex': 'gender',  // Backend returns 'sex' but we use 'gender' in state
    };
    const errorField = errorFieldMap[field] || field;

    if (errors[errorField as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [errorField]: '' }));
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleString('default', { month: 'long' });
      const year = selectedDate.getFullYear();
      const age = new Date().getFullYear() - year;
      
      const dateStr = `${month} ${day.toString().padStart(2, '0')}, ${year}`;
      updateFormData('dateOfBirth', dateStr);
      updateFormData('age', age.toString());
    }
  };

  const selectSex = (gender: string) => {
    updateFormData('gender', gender);
    setShowSexDropdown(false);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      province: '',
      city: '',
      barangay: '',
    };

    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    if (!formData.gender.trim()) {
      newErrors.gender = 'Gender is required';
      isValid = false;
    }
    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
      isValid = false;
    }
    if (!formData.province.trim()) {
      newErrors.province = 'Province is required';
      isValid = false;
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City/Municipality is required';
      isValid = false;
    }
    if (!formData.barangay.trim()) {
      newErrors.barangay = 'Barangay is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

const handleNext = async () => {
  if (validateForm()) {
    try {
      // Format the date for the backend (Django expects YYYY-MM-DD format)
      // formData.dateOfBirth is in format "Month Day, Year", need to convert to YYYY-MM-DD
      let formattedDateOfBirth = null;
      if (formData.dateOfBirth) {
        // Parse the date string "December 15, 2025" to convert to YYYY-MM-DD
        const dateObj = new Date(formData.dateOfBirth);
        if (!isNaN(dateObj.getTime())) { // Check if date is valid
          formattedDateOfBirth = dateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        }
      }

      // Update the user profile with the provided information
      await updateUserProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        sex: formData.gender, // Using 'gender' state variable but backend expects 'sex'
        date_of_birth: formattedDateOfBirth,
        age: parseInt(formData.age) || null,
        province: formData.province,
        city: formData.city,
        barangay: formData.barangay,
        street: formData.barangay, // Using barangay as street for now
      });

      // Navigate to phone verification
      router.replace('/(auth)/verify-phone');
    } catch (error: any) {
      // Handle profile update error with specific messages
      if (error.response) {
        // Handle field-specific validation errors
        const errorResponse = error.response;
        let errorMessage = '';

        if (errorResponse.first_name) {
          setErrors(prev => ({ ...prev, firstName: errorResponse.first_name[0] }));
          errorMessage += 'First name: ' + errorResponse.first_name[0] + '\n';
        }
        if (errorResponse.last_name) {
          setErrors(prev => ({ ...prev, lastName: errorResponse.last_name[0] }));
          errorMessage += 'Last name: ' + errorResponse.last_name[0] + '\n';
        }
        if (errorResponse.sex) {
          setErrors(prev => ({ ...prev, gender: errorResponse.sex[0] }));
          errorMessage += 'Gender: ' + errorResponse.sex[0] + '\n';
        }
        if (errorResponse.date_of_birth) {
          setErrors(prev => ({ ...prev, dateOfBirth: errorResponse.date_of_birth[0] }));
          errorMessage += 'Date of birth: ' + errorResponse.date_of_birth[0] + '\n';
        }
        if (errorResponse.non_field_errors) {
          errorMessage += errorResponse.non_field_errors.join('\n');
        }

        if (!errorMessage) {
          errorMessage = 'Error setting up account. Please try again.';
        }

        alert(errorMessage);
      } else {
        // Handle network or other errors
        console.error('Setup account error:', error);
        alert('Error setting up account. Please try again.');
      }
    }
  }
};

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome User</Text>
          <Text style={styles.welcomeSubtitle}>Setup your account first!</Text>
        </View>

        {/* Account Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account profile</Text>

          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              placeholder="Enter first name"
              value={formData.firstName}
              onChangeText={(value) => updateFormData('firstName', value)}
            />
            {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              placeholder="Enter last name"
              value={formData.lastName}
              onChangeText={(value) => updateFormData('lastName', value)}
            />
            {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
          </View>

          {/* Middle Name (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Middle Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter middle name (optional)"
              value={formData.middleName}
              onChangeText={(value) => updateFormData('middleName', value)}
            />
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={[styles.input, styles.selectButton, errors.gender && styles.inputError]}
              onPress={() => setShowSexDropdown(true)}
            >
              <Text style={formData.gender ? styles.selectButtonText : styles.placeholderText}>
                {formData.gender || 'Select'}
              </Text>
            </TouchableOpacity>
            {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
          </View>

          {/* Date of Birth & Age */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateButton, errors.dateOfBirth && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={formData.dateOfBirth ? styles.dateText : styles.placeholderText}>
                  {formData.dateOfBirth || 'Select date'}
                </Text>
              </TouchableOpacity>
              {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.age}
                onChangeText={(value) => updateFormData('age', value)}
                keyboardType="numeric"
                editable={false}
              />
            </View>
          </View>

          {/* Address Section */}
          <Text style={styles.addressTitle}>Address</Text>

          {/* Province */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Province</Text>
            <TextInput
              style={[styles.input, errors.province && styles.inputError]}
              placeholder="Enter province"
              value={formData.province}
              onChangeText={(value) => updateFormData('province', value)}
            />
            {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}
          </View>

          {/* City/Municipality */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City / Municipality</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter city/municipality"
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </View>

          {/* Barangay */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barangay</Text>
            <TextInput
              style={[styles.input, errors.barangay && styles.inputError]}
              placeholder="Enter barangay"
              value={formData.barangay}
              onChangeText={(value) => updateFormData('barangay', value)}
            />
            {errors.barangay ? <Text style={styles.errorText}>{errors.barangay}</Text> : null}
          </View>
        </View>

        {/* Next Button */}
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sex Dropdown Modal */}
      <Modal
        visible={showSexDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSexDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSexDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => selectSex('Male')}
            >
              <Text style={styles.dropdownItemText}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => selectSex('Female')}
            >
              <Text style={styles.dropdownItemText}>Female</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => selectSex('Other')}
            >
              <Text style={styles.dropdownItemText}>Other</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
          themeVariant="light"
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6d0bff',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
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
    borderColor: '#ff6d0bff',
  },
  errorText: {
    color: '#ff6d0bff',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectButton: {
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  selectButtonText: {
    color: '#333',
    fontSize: 16,
  },
  dateButton: {
    justifyContent: 'center',
  },
  dateText: {
    color: '#333',
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6d0bff',
    marginTop: 10,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nextButton: {
    backgroundColor: '#ff6d0bff',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 40,
    marginTop: 30,
    marginBottom: 40,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
});