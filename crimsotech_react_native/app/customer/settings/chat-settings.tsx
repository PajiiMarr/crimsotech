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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

const ORANGE_ACCENT = '#EE4D2D';

export default function ChatSettingsPage() {
  const { userRole } = useAuth();
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleAllowReceivingChats = () => {
    console.log('Navigate to Allow Receiving Chats settings');
    // TODO: Navigate to chat permission settings
  };

  const handleAutoReplyToggle = (value: boolean) => {
    setAutoReplyEnabled(value);
    console.log('Auto-Reply toggled:', value);
    // TODO: Save auto-reply preference to backend
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ORANGE_ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Settings</Text>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="chat-processing" size={24} color={ORANGE_ACCENT} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Allow Receiving Chats From */}
        <TouchableOpacity 
          style={styles.settingRow} 
          onPress={handleAllowReceivingChats}
          activeOpacity={0.7}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Allow Receiving Chats From</Text>
            <Text style={styles.settingSubtitle}>Set where your messages come from.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Send Auto-Reply Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Send Auto-Reply in chat</Text>
            <Text style={styles.settingSubtitle}>
              Enable to send self-defined reply message to buyers when they chat with you.
            </Text>
          </View>
          <Switch
            value={autoReplyEnabled}
            onValueChange={handleAutoReplyToggle}
            trackColor={{ false: '#D1D5DB', true: '#FED7D2' }}
            thumbColor={autoReplyEnabled ? ORANGE_ACCENT : '#F3F4F6'}
            ios_backgroundColor="#D1D5DB"
          />
        </View>
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
  headerRight: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
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
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
