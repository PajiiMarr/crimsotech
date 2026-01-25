// app/rider/riderHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface RiderHeaderProps {
  title?: string;
  subtitle?: string;
  showNotifications?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
}

export default function RiderHeader({
  title = 'Rider Dashboard',
  subtitle = 'Manage your deliveries',
  showNotifications = true,
  showBackButton = false,
  onBackPress,
  onNotificationsPress,
  onProfilePress
}: RiderHeaderProps) {
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleNotificationsPress = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
    } else {
      // router.push('/rider/notifications');
    }
  };

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      // router.push('/rider/profile');
    }
  };

  return (
    <View style={styles.header}>
      {/* Left Section: Back Button or Profile */}
      <View style={styles.headerLeft}>
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={handleProfilePress}
          >
            <View style={styles.profileIcon}>
              <MaterialIcons name="person" size={20} color="#EE4D2D" />
            </View>
          </TouchableOpacity>
        )}
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {/* Right Section: Icons */}
      <View style={styles.headerRight}>
        {showNotifications && !showBackButton && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleNotificationsPress}
          >
            <MaterialIcons name="notifications" size={22} color="#374151" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {!showBackButton && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/rider/settings')}
          >
            <MaterialIcons name="settings" size={22} color="#374151" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  profileButton: {
    marginRight: 12,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE4D9',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});