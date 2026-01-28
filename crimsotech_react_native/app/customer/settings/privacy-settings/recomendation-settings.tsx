import React from 'react';
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
import { useAuth } from '../../../../contexts/AuthContext';

const ORANGE_ACCENT = '#EE4D2D';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  status: string;
  icon: string;
}

export default function RecommendationSettingsPage() {
  const { userRole } = useAuth();

  const recommendationSettings: RecommendationItem[] = [
    {
      id: 'location-based',
      title: 'Location-Based Recommendations',
      description: 'Get product suggestions based on your current location',
      status: 'While Using',
      icon: 'location-on',
    },
    {
      id: 'browsing-history',
      title: 'Browsing History',
      description: 'Personalized recommendations from your browsing activity',
      status: 'When triggered',
      icon: 'history',
    },
    {
      id: 'purchase-history',
      title: 'Purchase History',
      description: 'Suggestions based on your previous purchases',
      status: 'Always',
      icon: 'shopping-bag',
    },
    {
      id: 'search-history',
      title: 'Search History',
      description: 'Recommendations from your search queries',
      status: 'When triggered',
      icon: 'search',
    },
    {
      id: 'wishlist',
      title: 'Wishlist & Favorites',
      description: 'Get notified about items you liked or saved',
      status: 'Always',
      icon: 'favorite',
    },
    {
      id: 'contacts',
      title: 'Contact Recommendations',
      description: 'Find friends and get suggestions from their activity',
      status: 'Never',
      icon: 'people',
    },
  ];

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleItemPress = (id: string) => {
    console.log('Navigate to recommendation setting:', id);
    // TODO: Navigate to detail page for specific recommendation setting
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Always':
        return '#10B981'; // Green
      case 'While Using':
        return '#3B82F6'; // Blue
      case 'When triggered':
        return '#F59E0B'; // Amber
      case 'Never':
        return '#6B7280'; // Gray
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ORANGE_ACCENT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recommendation Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {recommendationSettings.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.settingRow,
                index === recommendationSettings.length - 1 && styles.lastRow,
              ]}
              onPress={() => handleItemPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={item.icon as any} size={22} color="#6366F1" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Control how we use your data to personalize your shopping experience. Tap any item to adjust its settings.
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
  settingRow: {
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
  settingLeft: {
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
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
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
