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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

export default function RiderAccountProfilePage() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', 
    middle_name: '', 
    last_name: '',
    email: '', 
    contact_number: '', 
    date_of_birth: '',
    sex: '', 
    street: '', 
    barangay: '', 
    city: '',
    province: '', 
    zip_code: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await AxiosInstance.get('/profile/', {
        headers: { 'X-User-Id': String(user.id) },
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
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await AxiosInstance.put('/profile/', formData, {
        headers: { 'X-User-Id': String(user.id) },
      });
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const ProfileRow = ({ label, value, field }: any) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isEditing ? styles.inputActive : styles.inputStatic]}
        value={value}
        editable={isEditing}
        onChangeText={(text) => setFormData({ ...formData, [field]: text })}
        textAlign="right"
        placeholder={isEditing ? `Enter ${label.toLowerCase()}` : ''}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (isEditing) {
            Alert.alert(
              'Discard Changes?',
              'You have unsaved changes. Are you sure you want to discard them?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => {
                  loadProfile(); // Reload original data
                  setIsEditing(false);
                }},
              ]
            );
          } else {
            router.back();
          }
        }}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Text style={styles.editBtn}>{isEditing ? "Save" : "Edit"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarBar}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {formData.first_name ? formData.first_name[0].toUpperCase() : 'R'}
            </Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.fullName}>
              {formData.first_name} {formData.last_name}
            </Text>
            <Text style={styles.subText}>{formData.email || 'No email'}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#DC2626" />
              <Text style={styles.verifiedText}>Verified Rider</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
          <ProfileRow label="First Name" value={formData.first_name} field="first_name" />
          <ProfileRow label="Middle Name" value={formData.middle_name} field="middle_name" />
          <ProfileRow label="Last Name" value={formData.last_name} field="last_name" />
          <ProfileRow label="Gender" value={formData.sex} field="sex" />
          <ProfileRow label="Birthday" value={formData.date_of_birth} field="date_of_birth" />

          {/* Contact Information */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CONTACT INFORMATION</Text>
          <ProfileRow label="Email" value={formData.email} field="email" />
          <ProfileRow label="Phone" value={formData.contact_number} field="contact_number" />

          {/* Address Information */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ADDRESS</Text>
          <ProfileRow label="Street" value={formData.street} field="street" />
          <ProfileRow label="Barangay" value={formData.barangay} field="barangay" />
          <ProfileRow label="City" value={formData.city} field="city" />
          <ProfileRow label="Province" value={formData.province} field="province" />
          <ProfileRow label="Zip Code" value={formData.zip_code} field="zip_code" />
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => {
                loadProfile();
                setIsEditing(false);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#1E293B',
  },
  editBtn: { 
    color: '#DC2626', 
    fontWeight: '600', 
    fontSize: 13,
  },

  // Avatar Section
  avatarBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 4,
  },

  // Content Section
  content: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  input: {
    fontSize: 13,
    flex: 1,
    marginLeft: 12,
  },
  inputStatic: {
    color: '#64748B',
  },
  inputActive: {
    color: '#1E293B',
    fontWeight: '500',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
