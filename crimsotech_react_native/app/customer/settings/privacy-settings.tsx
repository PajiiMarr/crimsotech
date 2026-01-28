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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

const ORANGE_ACCENT = '#EE4D2D';

export default function PrivacySettingsPage() {
  const { userRole } = useAuth();
  const [hideFollowerList, setHideFollowerList] = useState(false);
  const [invisibleToContacts, setInvisibleToContacts] = useState(false);

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleHideFollowerListToggle = (value: boolean) => {
    setHideFollowerList(value);
    console.log('Hide follower list:', value);
    // TODO: Save preference to backend
  };

  const handleInvisibleToContactsToggle = (value: boolean) => {
    setInvisibleToContacts(value);
    console.log('Invisible to contacts:', value);
    // TODO: Save preference to backend
  };

  const handleVideoSettings = () => {
    console.log('Navigate to Video Settings');
    // TODO: Navigate to video settings
  };

  const handleSystemSettings = () => {
    console.log('Navigate to System Settings');
    // TODO: Navigate to system settings
  };

  const handleRecommendationSettings = () => {
    console.log('Navigate to Recommendation Settings');
    // TODO: Navigate to recommendation settings
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ORANGE_ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Section */}
        <View style={styles.section}>
          {/* Hide Follower List Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleTitle}>Hide my follower and following list</Text>
              <Text style={styles.toggleSubtitle}>
                Enable the option to hide your Follower and Following list from other Shopee users
              </Text>
            </View>
            <Switch
              value={hideFollowerList}
              onValueChange={handleHideFollowerListToggle}
              trackColor={{ false: '#D1D5DB', true: '#FED7D2' }}
              thumbColor={hideFollowerList ? ORANGE_ACCENT : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>

          {/* Invisible to Contacts Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleTitle}>Invisible to contacts</Text>
              <Text style={styles.toggleSubtitle}>
                Turn on to be hidden from your contact friends on Shopee.
              </Text>
            </View>
            <Switch
              value={invisibleToContacts}
              onValueChange={handleInvisibleToContactsToggle}
              trackColor={{ false: '#D1D5DB', true: '#FED7D2' }}
              thumbColor={invisibleToContacts ? ORANGE_ACCENT : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* Navigation Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.navRow}
            onPress={handleVideoSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.navTitle}>Shopee Video Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navRow}
            onPress={handleSystemSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.navTitle}>System Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navRow, styles.lastRow]}
            onPress={handleRecommendationSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.navTitle}>Recommendation Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
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
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  navRow: {
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
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
