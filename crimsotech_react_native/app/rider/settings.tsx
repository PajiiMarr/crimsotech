import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import RiderHeader from './includes/riderHeader';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

// Hide the default navigator header; we use a custom header inside this page
export const screenOptions = {
  headerShown: false,
};


export default function SettingsPage() {
  const { userRole, clearAuthData, userId } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // Ensure navigator header is hidden for this page (fix duplicate header issue)
    if (navigation && (navigation as any).setOptions) {
      (navigation as any).setOptions({ headerShown: false });
    }
  }, [navigation]);

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
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const SettingItem = ({ title, onPress }: { title: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemText}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* RIDER HEADER WITH BACK BUTTON */}
      <RiderHeader 
        title="Settings"
        showBackButton={true}
        showNotifications={false}
      />
      
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.group}>
          <SettingItem title="Account & Security" />
          <View style={styles.separator} />
          <SettingItem title="Bank Accounts / Cards" />
        </View>

        {/* Preferences Section (Renamed from Settings) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferences</Text>
        </View>
        <View style={styles.group}>
          <SettingItem title="Chat Settings" />
          <View style={styles.separator} />
          <SettingItem title="Notification Settings" />
          <View style={styles.separator} />
          <SettingItem title="Privacy Settings" />
        </View>

        {/* About Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <View style={styles.group}>
          <SettingItem title="Help & Support" />
          <View style={styles.separator} />
          <SettingItem title="Terms & Policies" />
        </View>

        {/* Session Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session</Text>
        </View>
        <View style={styles.group}>
          {userId ? (
            <TouchableOpacity 
              style={[styles.item, styles.logoutItem]} 
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <SettingItem title="Log In" onPress={() => router.push('/(auth)/login')} />
          )}
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutItem: {
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  versionContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});