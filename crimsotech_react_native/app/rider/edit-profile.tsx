import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getRiderProfile, updateRiderProfile } from '../../utils/riderApi';
import * as ImagePicker from 'expo-image-picker';

const COLORS = {
  primary: '#EE4D2D',
  bg: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  subText: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
};

export default function EditProfile() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    date_of_birth: '',
    gender: '',
    bio: '',
    country: '',
    province: '',
    city: '',
    barangay: '',
    street: '',
    zip_code: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await getRiderProfile(userId);
      
      if (data.user) {
        setFormData({
          first_name: data.user.first_name || '',
          last_name: data.user.last_name || '',
          email: data.user.email || '',
          contact_number: data.user.contact_number || '',
          date_of_birth: data.user.date_of_birth || '',
          gender: data.user.gender || '',
          bio: data.user.bio || '',
          country: data.user.country || '',
          province: data.user.province || '',
          city: data.user.city || '',
          barangay: data.user.barangay || '',
          street: data.user.street || '',
          zip_code: data.user.zip_code || '',
        });
        
        if (data.user.profile_picture) {
          setProfilePicture(data.user.profile_picture);
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      setSaving(true);
      
      const updateData: any = { ...formData };
      
      // Handle profile picture if changed
      if (profilePicture && profilePicture.startsWith('file://')) {
        updateData.profile_picture = {
          uri: profilePicture,
          type: 'image/jpeg',
          name: 'profile.jpg',
        };
      }
      
      await updateRiderProfile(userId, updateData);
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity onPress={handleSelectImage} style={styles.profilePictureContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Feather name="user" size={40} color={COLORS.subText} />
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Feather name="camera" size={16} color={COLORS.card} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePictureLabel}>Tap to change photo</Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.first_name}
              onChangeText={(value) => updateField('first_name', value)}
              placeholder="Enter first name"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.last_name}
              onChangeText={(value) => updateField('last_name', value)}
              placeholder="Enter last name"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="Enter email"
              placeholderTextColor={COLORS.subText}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.contact_number}
              onChangeText={(value) => updateField('contact_number', value)}
              placeholder="Enter contact number"
              placeholderTextColor={COLORS.subText}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={formData.date_of_birth}
              onChangeText={(value) => updateField('date_of_birth', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={styles.input}
              value={formData.gender}
              onChangeText={(value) => updateField('gender', value)}
              placeholder="Male/Female/Other"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(value) => updateField('bio', value)}
              placeholder="Tell us about yourself"
              placeholderTextColor={COLORS.subText}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.country}
              onChangeText={(value) => updateField('country', value)}
              placeholder="Enter country"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Province</Text>
            <TextInput
              style={styles.input}
              value={formData.province}
              onChangeText={(value) => updateField('province', value)}
              placeholder="Enter province"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(value) => updateField('city', value)}
              placeholder="Enter city"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barangay</Text>
            <TextInput
              style={styles.input}
              value={formData.barangay}
              onChangeText={(value) => updateField('barangay', value)}
              placeholder="Enter barangay"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={formData.street}
              onChangeText={(value) => updateField('street', value)}
              placeholder="Enter street address"
              placeholderTextColor={COLORS.subText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zip Code</Text>
            <TextInput
              style={styles.input}
              value={formData.zip_code}
              onChangeText={(value) => updateField('zip_code', value)}
              placeholder="Enter zip code"
              placeholderTextColor={COLORS.subText}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.subText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.card,
    marginBottom: 12,
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  profilePictureLabel: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.subText,
  },
  section: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
