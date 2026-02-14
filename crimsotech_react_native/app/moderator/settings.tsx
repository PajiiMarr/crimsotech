import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import RoleGuard from '../guards/RoleGuard';

export default function ModeratorSettings() {
  const { userRole, clearAuthData, userId } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAuthData();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ title, onPress, isDangerous = false }: { title: string; onPress?: () => void; isDangerous?: boolean }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.itemText, isDangerous && styles.dangerText]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={isDangerous ? '#EF4444' : '#C7C7CC'} />
    </TouchableOpacity>
  );

  return (
    <RoleGuard allowedRoles={['moderator']}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView style={styles.scrollView} bounces={false}>
          {/* Moderator Info */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Moderator Account</Text>
          </View>
          <View style={styles.group}>
            <SettingItem title="View Profile" onPress={() => router.push('/moderator/profile')} />
            <View style={styles.separator} />
            <SettingItem title="Account Security" onPress={() => {}} />
          </View>

          {/* Preferences */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          <View style={styles.group}>
            <SettingItem title="Notification Preferences" onPress={() => {}} />
            <View style={styles.separator} />
            <SettingItem title="Content Filters" onPress={() => {}} />
          </View>

          {/* Support & Help */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Help & Support</Text>
          </View>
          <View style={styles.group}>
            <SettingItem title="Documentation" onPress={() => {}} />
            <View style={styles.separator} />
            <SettingItem title="Report an Issue" onPress={() => {}} />
            <View style={styles.separator} />
            <SettingItem title="Contact Support" onPress={() => {}} />
          </View>

          {/* Account Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.group}>
            {userId ? (
              <SettingItem title="Log Out" onPress={handleLogout} isDangerous={true} />
            ) : (
              <SettingItem title="Log In" onPress={() => router.push('/(auth)/login')} />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginHorizontal: 0,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dangerText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
});
