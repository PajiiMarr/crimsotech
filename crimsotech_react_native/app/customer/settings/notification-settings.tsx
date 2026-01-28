import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

const ORANGE_ACCENT = '#EE4D2D';

interface NotificationSetting {
  id: string;
  title: string;
  status: string;
  hasHelpIcon?: boolean;
}

export default function NotificationSettingsPage() {
  const { userRole } = useAuth();

  const [notificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'push',
      title: 'Push Notifications',
      status: 'On',
    },
    {
      id: 'banner',
      title: 'In-App Banner Notifications',
      status: 'On',
      hasHelpIcon: true,
    },
    {
      id: 'email',
      title: 'Email Notifications',
      status: 'On',
    },
    {
      id: 'sms',
      title: 'SMS Notifications',
      status: 'On',
    },
  ]);

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleSettingPress = (id: string) => {
    console.log('Navigate to notification setting:', id);
    // TODO: Navigate to specific notification setting detail page
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ORANGE_ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notificationSettings.map((setting, index) => (
          <TouchableOpacity
            key={setting.id}
            style={[
              styles.settingRow,
              index === notificationSettings.length - 1 && styles.lastRow,
            ]}
            onPress={() => handleSettingPress(setting.id)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              {setting.hasHelpIcon && (
                <TouchableOpacity style={styles.helpIcon}>
                  <MaterialIcons name="help-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.statusText}>{setting.status}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  helpIcon: {
    marginLeft: 6,
    padding: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginRight: 4,
  },
});
