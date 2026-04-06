import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from './search';
import { router, usePathname, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import AxiosInstance from '../../../contexts/axios';

interface CustomerHeaderProps {
  interfaceType?: 'main' | 'management';
  onInterfaceSwitch?: () => void;
}

export default function CustomerHeader({ 
  interfaceType = 'main', 
  onInterfaceSwitch 
}: CustomerHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const { userId, user } = useAuth();

  // Check if current page is profile
  const isProfilePage = pathname === '/customer/profile';
  
  // Don't show switch button on certain pages
  const showSwitchButton = !pathname.includes('/customer/notification') && 
                          !pathname.includes('/customer/settings') &&
                          !pathname.includes('/customer/view-product') &&
                          !pathname.includes('/customer/includes/search') &&
                          !isProfilePage; // Also hide on profile

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!userId) return;
    
    try {
      const response = await AxiosInstance.get('/notifications/unread-count/', {
        headers: { 'X-User-Id': userId }
      });
      
      if (response.data) {
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Use useFocusEffect to refetch when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchUnreadCount();
      }
    }, [userId])
  );

  // Poll for unread count every 30 seconds
  useEffect(() => {
    if (!userId) return;
    
    fetchUnreadCount();
    
    // Set up interval to fetch unread count periodically
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [userId]);

  // Listen for app state changes (when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && userId) {
        // App came to foreground, refresh unread count
        fetchUnreadCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userId]);

  const getSwitchIcon = () => {
    return interfaceType === 'main' ? 'swap-horizontal' : 'swap-horizontal-outline';
  };

  // Function to handle notification press
  const handleNotificationPress = () => {
    // Reset unread count optimistically
    setUnreadCount(0);
    router.push('/customer/notification');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        {isProfilePage ? (
          /* ================= PROFILE HEADER WITH APP NAME ================= */
          <View style={styles.profileHeader}>
            <View style={styles.appNameContainer}>
              <Text style={styles.appNameText}>Crimsotech</Text>
            </View>
            
            <View style={styles.profileIconsContainer}>
              {/* Message Icon */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push('/customer/messages')}
              >
                <View style={styles.iconBadgeContainer}>
                  <Ionicons name="chatbubble-outline" size={24} color="#111" />
                  <View style={styles.badgeDot} />
                </View>
              </TouchableOpacity>
              
              {/* Notification Icon with Unread Badge */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleNotificationPress}
              >
                <View style={styles.iconBadgeContainer}>
                  <Ionicons name="notifications-outline" size={24} color="#111" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Settings Icon */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push('/customer/settings')}
              >
                <Ionicons name="settings-outline" size={22} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ================= REGULAR HEADER WITH SEARCH ================= */
          <View style={styles.topBar}>
            {/* Search Bar */}
            <View style={styles.searchWrapper}>
              <SearchBar 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                onPressSearch={() => router.push('/customer/includes/search')}
                disableInput
              />
            </View>

            {/* Icons */}
            <View style={styles.iconsContainer}>
              {/* Message Icon */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push('/customer/messages')}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#111" />
              </TouchableOpacity>

              {/* Notification Icon with Unread Badge */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleNotificationPress}
              >
                <View style={styles.iconBadgeContainer}>
                  <Ionicons name="notifications-outline" size={24} color="#111" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Switch Button */}
              {showSwitchButton && (
                <TouchableOpacity 
                  style={styles.iconBtn} 
                  onPress={onInterfaceSwitch}
                >
                  <Ionicons 
                    name={getSwitchIcon()} 
                    size={24} 
                    color={interfaceType === 'management' ? '#EE4D2D' : '#111'} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  /* Regular Header Styles */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  searchWrapper: {
    flex: 1,
    marginRight: 12,
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  /* Profile Header Styles */
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 8,
  },
  appNameContainer: {
    flex: 1,
  },
  appNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EE4D2D', // Brand color for the app name
    marginBottom: 2,
  },
  userWelcomeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileIconsContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  iconBadgeContainer: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EE4D2D',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // New styles for notification badge with number
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EE4D2D',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});