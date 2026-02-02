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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';

export default function AccountProfilePage() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    email: '', contact_number: '', date_of_birth: '',
    sex: '', street: '', barangay: '', city: '',
    province: '', zip_code: '',
  });

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user?.id]);

  const ProfileRow = ({ label, value, field }: any) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isEditing ? styles.inputActive : styles.inputStatic]}
        value={value}
        editable={isEditing}
        onChangeText={(text) => setFormData({ ...formData, [field]: text })}
        textAlign="right"
      />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF4500" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Ultra Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => isEditing ? setIsEditing(false) : router.back()}>
          <Ionicons name="chevron-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Text style={styles.editBtn}>{isEditing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false}>
        {/* Compact Avatar Section */}
        <View style={styles.avatarBar}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{formData.first_name[0]}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.fullName}>{formData.first_name} {formData.last_name}</Text>
            <Text style={styles.subText}>{formData.email}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Personal</Text>
          <ProfileRow label="First Name" value={formData.first_name} field="first_name" />
          <ProfileRow label="Middle Name" value={formData.middle_name} field="middle_name" />
          <ProfileRow label="Last Name" value={formData.last_name} field="last_name" />
          <ProfileRow label="Gender" value={formData.sex} field="sex" />
          <ProfileRow label="Birthday" value={formData.date_of_birth} field="date_of_birth" />

          <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Contact & Address</Text>
          <ProfileRow label="Phone" value={formData.contact_number} field="contact_number" />
          <ProfileRow label="Street" value={formData.street} field="street" />
          <ProfileRow label="Barangay" value={formData.barangay} field="barangay" />
          <ProfileRow label="City" value={formData.city} field="city" />
          <ProfileRow label="Province" value={formData.province} field="province" />
          <ProfileRow label="Zip" value={formData.zip_code} field="zip_code" />
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
  editBtn: { color: '#FF4500', fontWeight: '500', fontSize: 15 },

  avatarBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FAFAFA' 
  },
  avatarCircle: { 
    width: 50, height: 50, borderRadius: 25, 
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' 
  },
  avatarLetter: { fontSize: 20, fontWeight: 'bold', color: '#9CA3AF' },
  avatarInfo: { marginLeft: 12 },
  fullName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subText: { fontSize: 12, color: '#6B7280' },

  content: { paddingHorizontal: 16 },
  sectionTitle: { 
    fontSize: 11, fontWeight: '700', color: '#9CA3AF', 
    textTransform: 'uppercase', marginBottom: 4, marginTop: 10 
  },
  row: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' 
  },
  label: { fontSize: 14, color: '#4B5563', flex: 1 },
  input: { fontSize: 14, flex: 2, padding: 0 },
  inputStatic: { color: '#111827' },
  inputActive: { color: '#FF4500', fontWeight: '500' },

  logoutBtn: { marginTop: 20, alignItems: 'center', padding: 15 },
  logoutText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});