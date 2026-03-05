// app/customer/components/customerHeader.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from './search';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

interface CustomerHeaderProps {
  interfaceType?: 'main' | 'management';
  onInterfaceSwitch?: () => void;
}

export default function CustomerHeader({ 
  interfaceType = 'main', 
  onInterfaceSwitch 
}: CustomerHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const { username, user } = useAuth();

  // Check if current page is profile
  const isProfilePage = pathname === '/customer/profile';
  
  // Don't show switch button on certain pages
  const showSwitchButton = !pathname.includes('/customer/notification') && 
                          !pathname.includes('/customer/settings') &&
                          !pathname.includes('/customer/view-product') &&
                          !pathname.includes('/customer/includes/search') &&
                          !isProfilePage; // Also hide on profile

  const getSwitchIcon = () => {
    return interfaceType === 'main' ? 'swap-horizontal' : 'swap-horizontal-outline';
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
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push('/customer/notification')}
              >
                <View style={styles.iconBadgeContainer}>
                  <Ionicons name="chatbubble-outline" size={24} color="#111" />
                  <View style={styles.badgeDot} />
                </View>
              </TouchableOpacity>
              
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
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push('/customer/notification')}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#111" />
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
});