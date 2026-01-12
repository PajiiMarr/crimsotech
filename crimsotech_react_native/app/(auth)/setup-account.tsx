import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AxiosInstance from '../../contexts/axios';
import * as SecureStore from 'expo-secure-store';
import AddressDropdowns from '../components/address/AddressDropdowns';

type Gender = 'male' | 'female' | 'prefer_not_to_say';

export default function SetupAccountScreen() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRider, setIsRider] = useState(false);
  const [username, setUsername] = useState('');
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [dateValue, setDateValue] = useState('');
  
  // Calendar state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  
  // Address fields
  const [address, setAddress] = useState({
    province: '',
    city: '',
    barangay: '',
    street: '',
  });
  
  // Dropdown modals
  const [showGenderModal, setShowGenderModal] = useState(false);
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [age, setAge] = useState<string>('');

  useEffect(() => {
    checkUserStage();
  }, []);

  useEffect(() => {
    calculateAge();
  }, [dateOfBirth]);

  // Function to format date for display (June 01, 2025)
  const formatDate = (date: Date | null) => { 
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateForAPI = (date: Date | null): string => {
    if (!date) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isValidDate = (date: Date | null) => {
    if (!date) {
      return false;
    }
    return !isNaN(date.getTime());
  };

  const calculateAge = () => {
    if (!dateOfBirth || !isValidDate(dateOfBirth)) {
      setAge("");
      return;
    }
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    
    setAge(calculatedAge.toString());
  };

  const checkUserStage = async () => {
    try {
      const userJson = await SecureStore.getItemAsync('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUsername(user.username || '');
        
        const stage = user.registration_stage || 1;
        const isUserRider = user.is_rider || false;
        setIsRider(isUserRider);
        
        console.log('📊 User stage check:', { stage, isUserRider });
        
        // Stage logic with stage 3 as completed for customers
        if (isUserRider) {
          // Rider flow
          if (stage === 1) {
            router.replace('/(auth)/signup');
            return;
          } else if (stage === 2) {
            // Good - stay on profiling
            setUserId(user.user_id?.toString() || null);
          } else if (stage === 3) {
            router.replace('/(auth)/verify-phone');
            return;
          } else if (stage >= 4) {
            router.replace('/rider/home');
            return;
          }
        } else {
          // Customer flow
          if (stage === 1) {
            // Good - stay on profiling
            setUserId(user.user_id?.toString() || null);
          } else if (stage === 2) {
            router.replace('/(auth)/verify-phone');
            return;
          } else if (stage === 4) {
            // Only allow navigation to home when registration is fully complete (stage 4)
            router.replace('/customer/home');
            return;
          }
        }
        
        // Load user profiling data if available
        await loadUserProfilingData(user.user_id?.toString() || null);
      } else {
        // No user found, redirect to login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error checking user stage:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const loadUserProfilingData = async (userId: string | null) => {
    if (!userId) return;
    
    try {
      const response = await AxiosInstance.get('/api/profiling/', {
        headers: { 'X-User-Id': userId }
      });
      
      if (response.data) {
        const data = response.data;
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setMiddleName(data.middle_name || '');
        setEmail(data.email || '');
        setGender(data.sex || '');
        
        if (data.date_of_birth) {
          const dob = new Date(data.date_of_birth);
          if (isValidDate(dob)) {
            setDateOfBirth(dob);
            setDateValue(formatDate(dob));
            setSelectedDate(dob);
            setSelectedMonth(dob.getMonth());
            setSelectedYear(dob.getFullYear());
          }
        }
        
        setAddress({
          province: data.province || '',
          city: data.city || '',
          barangay: data.barangay || '',
          street: data.street || '',
        });
      }
    } catch (error) {
      console.error('Error loading profiling data:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.first_name = 'First name is required';
    if (!lastName.trim()) newErrors.last_name = 'Last name is required';
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (!gender) newErrors.sex = 'Sex is required';
    
    if (!dateOfBirth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else if (parseInt(age) < 15) {
      newErrors.age = 'You must be at least 15 years old!';
    }
    
    if (!address.province) newErrors.province = 'Province is required';
    if (!address.city) newErrors.city = 'City is required';
    if (!address.barangay) newErrors.barangay = 'Barangay is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🎯 Submit button clicked');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    if (!userId) {
      console.log('❌ No user ID found');
      Alert.alert('Error', 'User session expired. Please login again.');
      return;
    }

    setLoading(true);
    
    try {
      const apiDateOfBirth = formatDateForAPI(dateOfBirth);
      const registrationStage = isRider ? 3 : 2;
      
      const payload = {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        email: email,
        sex: gender,
        date_of_birth: apiDateOfBirth,
        age: age,
        province: address.province,
        city: address.city,
        barangay: address.barangay,
        street: address.street,
        registration_stage: registrationStage,
      };

      console.log('📤 Sending to API:', {
        endpoint: '/api/profiling/',
        headers: { 'X-User-Id': userId },
        payload,
        isRider,
        newStage: registrationStage
      });
      
      const response = await AxiosInstance.put('/api/profiling/', payload, {
        headers: { 'X-User-Id': userId }
      });

      console.log('✅ API Response:', response.data);
      
      // Update user data with new registration stage
      const userJson = await SecureStore.getItemAsync('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        user.registration_stage = registrationStage;
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      }
      
      // Save temp_user_id for next stage
      await SecureStore.setItemAsync('temp_user_id', userId);
      
      // Navigate to phone verification
      console.log('🚀 Navigating to verify-phone...');
      router.replace('/(auth)/verify-phone');
      
    } catch (error: any) {
      console.error('❌ ERROR DETAILS:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🏁 Loading finished');
      setLoading(false);
    }
  };

  // Calendar Functions
  const openCalendar = () => {
    if (dateOfBirth) {
      setSelectedDate(dateOfBirth);
      setSelectedMonth(dateOfBirth.getMonth());
      setSelectedYear(dateOfBirth.getFullYear());
    } else {
      const defaultDate = new Date(2000, 0, 1);
      setSelectedDate(defaultDate);
      setSelectedMonth(defaultDate.getMonth());
      setSelectedYear(defaultDate.getFullYear());
    }
    setShowCalendarModal(true);
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    setSelectedDate(newDate);
  };

  const handleMonthChange = (change: number) => {
    let newMonth = selectedMonth + change;
    let newYear = selectedYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
  };

  const confirmDate = () => {
    setDateOfBirth(selectedDate);
    setDateValue(formatDate(selectedDate));
    setShowCalendarModal(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getGenderDisplay = () => {
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      case 'prefer_not_to_say': return 'Prefer not to say';
      default: return 'Select';
    }
  };

  // Generate years for dropdown (from current year to 1900)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1900 + 1 }, 
    (_, i) => currentYear - i
  );

  const selectedYearIndex = Math.max(
    0,
    Math.min(years.length - 1, currentYear - selectedYear)
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate calendar days
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDayOfMonth = getFirstDayOfMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brandTitle}>CrimsoTech</Text>
        </View>

        <View style={styles.content}>
          {/* Welcome Header */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome {username}</Text>
            <Text style={styles.welcomeSubtitle}>Setup your account first!</Text>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Profile</Text>
            
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>First Name</Text>
                  {errors.first_name && (
                    <Text style={styles.fieldErrorText}>{errors.first_name}</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.input, errors.first_name && styles.inputError]}
                  placeholder="Enter first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!loading}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  {errors.last_name && (
                    <Text style={styles.fieldErrorText}>{errors.last_name}</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.input, errors.last_name && styles.inputError]}
                  placeholder="Enter last name"
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Middle Name</Text>
                {errors.middle_name && (
                  <Text style={styles.fieldErrorText}>{errors.middle_name}</Text>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter middle name"
                value={middleName}
                onChangeText={setMiddleName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Email</Text>
                {errors.email && (
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                )}
              </View>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Sex</Text>
                  {errors.sex && (
                    <Text style={styles.fieldErrorText}>{errors.sex}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, errors.sex && styles.inputError]}
                  onPress={() => setShowGenderModal(true)}
                  disabled={loading}
                >
                  <Text style={gender ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {getGenderDisplay()}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Age</Text>
                  {errors.age && (
                    <Text style={styles.fieldErrorText}>{errors.age}</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: '#f5f5f5' }]}
                  value={age}
                  editable={false}
                  placeholder="Auto-calculated"
                />
              </View>
            </View>

            {/* Date of Birth Section */}
            <View style={styles.dateOfBirthContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                {errors.date_of_birth && (
                  <Text style={styles.fieldErrorText}>{errors.date_of_birth}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dateInput, errors.date_of_birth && styles.inputError]}
                onPress={openCalendar}
                disabled={loading}
              >
                <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
                  {dateOfBirth ? formatDate(dateOfBirth) : 'Select date'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Address Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            
            <AddressDropdowns
              value={address}
              onChange={(data) =>
                setAddress((prev) => ({
                  ...prev,
                  ...data,
                  street: data.street ?? prev.street,
                }))
              }
              errors={{
                province: errors.province,
                city: errors.city,
                barangay: errors.barangay,
              }}
              disabled={loading}
            />
          </View>

          {/* Error display for backend errors */}
          {errors.details && (
            <View style={styles.backendErrorContainer}>
              <Text style={styles.backendErrorText}>
                {typeof errors.details === 'object' 
                  ? Object.values(errors.details).map((errorMessage, index) => (
                      <Text key={index}>{String(errorMessage)}</Text>
                    ))
                  : String(errors.details)
                }
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sex</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setGender('male'); setShowGenderModal(false); }}
            >
              <Text style={styles.dropdownItemText}>Male</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setGender('female'); setShowGenderModal(false); }}
            >
              <Text style={styles.dropdownItemText}>Female</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setGender('prefer_not_to_say'); setShowGenderModal(false); }}
            >
              <Text style={styles.dropdownItemText}>Prefer not to say</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Month/Year Selector */}
            <View style={styles.monthYearSelector}>
              <TouchableOpacity 
                style={styles.monthNavButton}
                onPress={() => handleMonthChange(-1)}
              >
                <MaterialIcons name="chevron-left" size={24} color="#333" />
              </TouchableOpacity>
              
              <View style={styles.monthYearDisplay}>
                <Text style={styles.monthText}>{monthNames[selectedMonth]}</Text>
                
                {/* Year Dropdown */}
                <View style={styles.yearSelectorContainer}>
                  <TouchableOpacity 
                    style={styles.yearButton}
                    onPress={() => setShowYearDropdown(!showYearDropdown)}
                  >
                    <Text style={styles.yearText}>{selectedYear}</Text>
                    <MaterialIcons 
                      name={showYearDropdown ? "arrow-drop-up" : "arrow-drop-down"} 
                      size={24} 
                      color="#333" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.monthNavButton}
                onPress={() => handleMonthChange(1)}
              >
                <MaterialIcons name="chevron-right" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.dayHeaderText}>{day}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {/* Empty days for the first week */}
              {emptyDays.map((_, index) => (
                <View key={`empty-${index}`} style={styles.calendarDayEmpty} />
              ))}
              
              {/* Days of the month */}
              {days.map((day) => {
                const isSelected = selectedDate.getDate() === day && 
                                 selectedDate.getMonth() === selectedMonth && 
                                 selectedDate.getFullYear() === selectedYear;
                const isToday = day === new Date().getDate() && 
                               selectedMonth === new Date().getMonth() && 
                               selectedYear === new Date().getFullYear();
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isToday && styles.calendarDayToday
                    ]}
                    onPress={() => handleDateSelect(day)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      isToday && !isSelected && styles.calendarDayTextToday
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Date Display */}
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateLabel}>Selected Date:</Text>
              <Text style={styles.selectedDateText}>
                {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.calendarActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCalendarModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmDate}
              >
                <Text style={styles.confirmButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal (inside Calendar) */}
      <Modal
        visible={showYearDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearDropdown(false)}
      >
        <Pressable
          style={styles.yearPickerOverlay}
          onPress={() => setShowYearDropdown(false)}
        >
          <Pressable style={styles.yearPickerCard} onPress={() => {}}>
            <Text style={styles.yearPickerTitle}>Select Year</Text>
            <FlatList
              data={years}
              keyExtractor={(year) => String(year)}
              initialScrollIndex={selectedYearIndex}
              getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
              showsVerticalScrollIndicator={true}
              renderItem={({ item: year }) => (
                <TouchableOpacity
                  style={[
                    styles.yearItem,
                    selectedYear === year && styles.yearItemSelected,
                  ]}
                  onPress={() => handleYearSelect(year)}
                >
                  <Text
                    style={[
                      styles.yearItemText,
                      selectedYear === year && styles.yearItemTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingLeft: 40,
    paddingBottom: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 0,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6d0b',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
    marginBottom: 15,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#ff6d0b',
    marginLeft: 8,
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
  dateOfBirthContainer: {
    marginBottom: 15,
  },
  dateInput: {
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
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  backendErrorContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    borderRadius: 6,
  },
  backendErrorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  // Calendar Modal Styles
  calendarModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthNavButton: {
    padding: 10,
  },
  monthYearDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  yearSelectorContainer: {
    position: 'relative',
    zIndex: 10,
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 5,
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  yearPickerCard: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  yearPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  yearItemSelected: {
    backgroundColor: '#ff6d0b',
  },
  yearItemText: {
    fontSize: 14,
    color: '#333',
  },
  yearItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  calendarDayEmpty: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 5,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  calendarDaySelected: {
    backgroundColor: '#ff6d0b',
    borderRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: '#ff6d0b',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarDayTextToday: {
    color: '#ff6d0b',
    fontWeight: '600',
  },
  selectedDateContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  selectedDateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ff6d0b',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});