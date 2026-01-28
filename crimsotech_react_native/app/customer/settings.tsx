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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

export default function SettingsPage() {
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
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  if (userRole && userRole !== 'customer') {
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
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} bounces={false}>
        {/* My Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Account</Text>
        </View>
        <View style={styles.group}>
          <SettingItem title="Account & Security" onPress={() => router.push('/customer/settings/account-security')} />
          <View style={styles.separator} />
          <SettingItem title="My Addresses" onPress={() => router.push('/customer/components/shipping-address')} />
          <View style={styles.separator} />
          <SettingItem title="Bank Accounts / Cards" onPress={() => router.push('/customer/settings/bank-accounts')} />
        </View>

        {/* Settings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>
        <View style={styles.group}>
          <SettingItem title="Chat Settings" onPress={() => router.push('/customer/settings/chat-settings')} />
          <View style={styles.separator} />
          <SettingItem title="Notification Settings" onPress={() => router.push('/customer/settings/notification-settings')} />
          <View style={styles.separator} />
          <SettingItem title="Privacy Settings" onPress={() => router.push('/customer/settings/privacy-settings')} />
        </View>

        {/* Account */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.group}>
          {userId ? (
            <SettingItem title="Log Out" onPress={handleLogout} />
          ) : (
            <SettingItem title="Log In" onPress={() => router.push('/(auth)/login')} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light grey background like the image
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerSafeArea: { backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333',
    flex: 1,
  },
  chatButton: {
    padding: 5,
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#FF4500',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E93',
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
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginLeft: 16, // Indented line like standard iOS/Android lists
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
});