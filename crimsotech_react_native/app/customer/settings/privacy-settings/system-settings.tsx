import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../../contexts/AuthContext';

const ORANGE_ACCENT = '#EE4D2D';
const TEAL_ACCENT = '#14B8A6'; // Teal/green for toggles

interface PermissionSetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export default function SystemSettingsPage() {
  const { userRole } = useAuth();

  const [permissions, setPermissions] = useState<PermissionSetting[]>([
    {
      id: 'location',
      title: 'Location',
      description: 'Allow CrimsoTech to access your location for better delivery and product recommendations.',
      icon: 'location-on',
      enabled: true,
    },
    {
      id: 'contacts',
      title: 'Contacts',
      description: 'Access your contacts to help you connect with friends and share products easily.',
      icon: 'contacts',
      enabled: false,
    },
    {
      id: 'microphone',
      title: 'Microphone',
      description: 'Enable microphone access for voice search and customer support features.',
      icon: 'mic',
      enabled: false,
    },
    {
      id: 'camera',
      title: 'Camera',
      description: 'Allow camera access to scan QR codes, search by image, and upload product photos.',
      icon: 'camera-alt',
      enabled: true,
    },
  ]);

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleTogglePermission = (id: string, value: boolean) => {
    setPermissions(prev =>
      prev.map(perm =>
        perm.id === id ? { ...perm, enabled: value } : perm
      )
    );
    console.log(`Permission ${id} toggled:`, value);
    // TODO: Save permission preference to backend and request system permission
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ORANGE_ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {permissions.map((permission, index) => (
            <View
              key={permission.id}
              style={[
                styles.permissionRow,
                index === permissions.length - 1 && styles.lastRow,
              ]}
            >
              <View style={styles.permissionLeft}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={permission.icon as any} size={22} color="#6366F1" />
                </View>
                <View style={styles.permissionContent}>
                  <Text style={styles.permissionTitle}>{permission.title}</Text>
                  <Text style={styles.permissionDescription}>
                    {permission.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={permission.enabled}
                onValueChange={(value) => handleTogglePermission(permission.id, value)}
                trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                thumbColor={permission.enabled ? TEAL_ACCENT : '#F3F4F6'}
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              These permissions help us provide you with a better experience. You can change them anytime in your device settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  permissionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  infoSection: {
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 12,
  },
});
