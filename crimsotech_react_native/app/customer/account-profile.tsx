import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  date_of_birth: string;
  sex: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
}

export default function AccountProfilePage() {
  const { user, userRole, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: '', middle_name: '', last_name: '',
    email: '', contact_number: '', date_of_birth: '',
    sex: '', street: '', barangay: '', city: '',
    province: '', zip_code: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await AxiosInstance.get('/profile/', {
          headers: { 'X-User-Id': String(userId) },
        });
        
        const userProfile = response.data?.profile?.user || response.data?.user || response.data || {};
        
        setFormData({
          first_name: userProfile.first_name || '',
          middle_name: userProfile.middle_name || '',
          last_name: userProfile.last_name || '',
          email: userProfile.email || '',
          contact_number: userProfile.contact_number || '',
          date_of_birth: userProfile.date_of_birth || '',
          sex: userProfile.sex || '',
          street: userProfile.street || '',
          barangay: userProfile.barangay || '',
          city: userProfile.city || '',
          province: userProfile.province || '',
          zip_code: userProfile.zip_code || '',
        });
        
        setProfilePicture(userProfile.profile_picture_url || null);
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      
      const response = await AxiosInstance.put('/profile/', formData, {
        headers: {
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
        setHasChanges(false);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.error || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload original data
    loadProfile();
    setIsEditing(false);
    setHasChanges(false);
  };

  const loadProfile = async () => {
    if (!userId) return;
    
    try {
      const response = await AxiosInstance.get('/profile/', {
        headers: { 'X-User-Id': String(userId) },
      });
      
      const userProfile = response.data?.profile?.user || response.data?.user || response.data || {};
      
      setFormData({
        first_name: userProfile.first_name || '',
        middle_name: userProfile.middle_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
        contact_number: userProfile.contact_number || '',
        date_of_birth: userProfile.date_of_birth || '',
        sex: userProfile.sex || '',
        street: userProfile.street || '',
        barangay: userProfile.barangay || '',
        city: userProfile.city || '',
        province: userProfile.province || '',
        zip_code: userProfile.zip_code || '',
      });
      
      setProfilePicture(userProfile.profile_picture_url || null);
    } catch (error) {
      console.error('Error reloading profile:', error);
    }
  };

  // Handle picking image from gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Handle taking photo with camera
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Upload profile picture to server
  const uploadProfilePicture = async (asset: any) => {
    if (!userId) return;

    try {
      setUploadingImage(true);

      // Create form data
      const formData = new FormData();
      
      // Get file name and type from URI
      const uriParts = asset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const fileName = `profile_${Date.now()}.${fileType}`;

      // Append the file
      formData.append('profile_picture', {
        uri: asset.uri,
        type: `image/${fileType}`,
        name: fileName,
      } as any);

      formData.append('action', 'update_profile_picture');

      // Upload to server
      const response = await AxiosInstance.post('/profile/', formData, {
        headers: {
          'X-User-Id': userId,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProfilePicture(response.data.profile_picture_url);
        Alert.alert('Success', 'Profile picture updated successfully');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to upload profile picture');
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.error || 'Failed to upload profile picture'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle remove profile picture
  const handleRemoveProfilePicture = async () => {
    if (!userId) return;

    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingImage(true);
              
              const response = await AxiosInstance.post('/profile/', {
                action: 'remove_profile_picture'
              }, {
                headers: {
                  'X-User-Id': userId,
                  'Content-Type': 'application/json',
                },
              });

              if (response.data.success) {
                setProfilePicture(null);
                Alert.alert('Success', 'Profile picture removed successfully');
              } else {
                Alert.alert('Error', response.data.error || 'Failed to remove profile picture');
              }
            } catch (error: any) {
              console.error('Error removing profile picture:', error);
              Alert.alert(
                'Error', 
                error.response?.data?.error || 'Failed to remove profile picture'
              );
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  // Show options for profile picture
  const showProfilePictureOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        ...(profilePicture ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: handleRemoveProfilePicture }] : [])
      ]
    );
  };

  const ProfileRow = ({ label, value, field }: any) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, styles.inputActive]}
          value={value}
          onChangeText={(text) => handleInputChange(field, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#9CA3AF"
          textAlign="right"
        />
      ) : (
        <Text style={styles.inputStatic}>{value || '—'}</Text>
      )}
    </View>
  );

  const getInitials = () => {
    const first = formData.first_name?.[0] || '';
    const last = formData.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (isEditing && hasChanges) {
              Alert.alert(
                'Discard Changes',
                'You have unsaved changes. Are you sure you want to go back?',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => router.back() }
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        {isEditing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              disabled={saving || !hasChanges}
              style={styles.headerButton}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FF4500" />
              ) : (
                <Text style={[styles.saveBtn, !hasChanges && styles.disabledBtn]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView bounces={false}>
        {/* Avatar Section - Now with upload functionality */}
        <TouchableOpacity 
          style={styles.avatarBar}
          onPress={showProfilePictureOptions}
          disabled={uploadingImage}
        >
          <View style={styles.avatarCircle}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#FF4500" />
            ) : profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{getInitials()}</Text>
            )}
            <View style={styles.cameraIconContainer}>
              <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.fullName}>
              {formData.first_name} {formData.last_name}
            </Text>
            <Text style={styles.subText}>{formData.email}</Text>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <ProfileRow label="First Name" value={formData.first_name} field="first_name" />
          <ProfileRow label="Middle Name" value={formData.middle_name} field="middle_name" />
          <ProfileRow label="Last Name" value={formData.last_name} field="last_name" />
          <ProfileRow label="Gender" value={formData.sex} field="sex" />
          <ProfileRow label="Birthday" value={formData.date_of_birth} field="date_of_birth" />

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Information</Text>
          <ProfileRow label="Email" value={formData.email} field="email" />
          <ProfileRow label="Phone" value={formData.contact_number} field="contact_number" />

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Address</Text>
          <ProfileRow label="Street" value={formData.street} field="street" />
          <ProfileRow label="Barangay" value={formData.barangay} field="barangay" />
          <ProfileRow label="City" value={formData.city} field="city" />
          <ProfileRow label="Province" value={formData.province} field="province" />
          <ProfileRow label="Zip Code" value={formData.zip_code} field="zip_code" />
        </View>

        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerButton: { padding: 4 },
  editBtn: { color: '#FF4500', fontWeight: '500', fontSize: 15 },
  cancelBtn: { color: '#6B7280', fontWeight: '500', fontSize: 15 },
  saveBtn: { color: '#FF4500', fontWeight: '600', fontSize: 15 },
  disabledBtn: { opacity: 0.5 },

  avatarBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FAFAFA' 
  },
  avatarCircle: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#E5E7EB', 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarLetter: { fontSize: 24, fontWeight: 'bold', color: '#9CA3AF' },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF4500',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInfo: { marginLeft: 16, flex: 1 },
  fullName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  changePhotoText: { fontSize: 11, color: '#FF4500', marginTop: 4 },

  content: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#9CA3AF', 
    textTransform: 'uppercase', 
    marginBottom: 8, 
    marginTop: 16 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 0.5, 
    borderBottomColor: '#F3F4F6' 
  },
  label: { fontSize: 14, color: '#4B5563', flex: 1 },
  input: { fontSize: 14, flex: 2, padding: 0, textAlign: 'right' },
  inputStatic: { fontSize: 14, color: '#111827', flex: 2, textAlign: 'right' },
  inputActive: { color: '#FF4500', fontWeight: '500' },

  logoutBtn: { marginTop: 32, marginBottom: 24, alignItems: 'center', padding: 16 },
  logoutText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});