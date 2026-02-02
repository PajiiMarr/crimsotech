import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

export default function AccountSecurityPage() {
  const { userId, username, email, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // Fetch user profile data
      const response = await AxiosInstance.get('/profile/', {
        headers: { 'X-User-Id': String(userId || '') },
      });
      if (response.data?.profile?.user) {
        setProfileData(response.data.profile.user);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (profileData?.full_name) {
      const names = profileData.full_name.trim().split(' ');
      if (names.length > 1) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (username) return username.charAt(0).toUpperCase();
    return 'U';
  };

  const handleQuickLoginToggle = (value: boolean) => {
    setQuickLoginEnabled(value);
    // TODO: Implement quick login API call
    Alert.alert(
      'Quick Login',
      value 
        ? 'Quick login has been enabled for this device' 
        : 'Quick login has been disabled'
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'This feature will be available soon');
    // TODO: Navigate to change password screen
    // router.push('/customer/settings/change-password');
  };

  const handleManagePasskeys = () => {
    Alert.alert('Passkeys', 'This feature will be available soon');
    // TODO: Navigate to passkeys management
    // router.push('/customer/settings/passkeys');
  };

  const handleCheckAccountActivity = () => {
    Alert.alert('Account Activity', 'This feature will be available soon');
    // TODO: Navigate to account activity screen
    // router.push('/customer/settings/account-activity');
  };

  const handleManageLoginDevices = () => {
    Alert.alert('Login Devices', 'This feature will be available soon');
    // TODO: Navigate to manage devices screen
    // router.push('/customer/settings/login-devices');
  };

  const handleManageSocialAccounts = () => {
    Alert.alert('Social Media Accounts', 'This feature will be available soon');
    // TODO: Navigate to social accounts management
    // router.push('/customer/settings/social-accounts');
  };

  const handleEditProfile = () => {
    router.push('/customer/account-profile');
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <>
            {/* ========== ACCOUNT SECTION ========== */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>ACCOUNT</Text>
              
              {/* Profile Picture with Edit Overlay */}
              <View style={styles.profilePictureContainer}>
                <View style={styles.profilePictureWrapper}>
                  {profileData?.has_profile_picture ? (
                    <Image
                      source={{ uri: `${AxiosInstance.defaults.baseURL}/media/profile/${userId}/` }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <Text style={styles.profileInitials}>{getInitials()}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.editOverlay} onPress={handleEditProfile}>
                    <MaterialIcons name="photo-camera" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* My Profile - Primary Link */}
              <TouchableOpacity 
                style={styles.primaryItem} 
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                    <MaterialIcons name="person" size={22} color="#6366F1" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.primaryItemText}>My Profile</Text>
                    <Text style={styles.itemSubtext}>Manage name, bio, gender, birthday</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Account Details */}
              <View style={styles.detailsSection}>
                <Text style={styles.subsectionTitle}>Account Details</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>{profileData?.username || username || 'N/A'}</Text>
                </View>
                
                <View style={styles.separator} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.contact_number || 'Not provided'}
                  </Text>
                </View>
                
                <View style={styles.separator} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {profileData?.email || email || 'Not provided'}
                  </Text>
                </View>
              </View>

              {/* Social Connections */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleManageSocialAccounts}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialCommunityIcons name="link-variant" size={22} color="#F59E0B" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemText}>Social Media Accounts</Text>
                    <Text style={styles.itemSubtext}>Google, Facebook, Apple</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* ========== SECURITY SECTION ========== */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>SECURITY</Text>

              {/* Authentication */}
              <View style={styles.subsectionContainer}>
                <Text style={styles.subsectionTitle}>Authentication</Text>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleChangePassword}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                      <MaterialIcons name="lock" size={22} color="#3B82F6" />
                    </View>
                    <Text style={styles.itemText}>Change Password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleManagePasskeys}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                      <MaterialIcons name="fingerprint" size={22} color="#6366F1" />
                    </View>
                    <Text style={styles.itemText}>Passkeys</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Quick Login Toggle */}
              <View style={styles.quickLoginContainer}>
                <View style={styles.quickLoginHeader}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                      <MaterialIcons name="smartphone" size={22} color="#10B981" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemText}>Quick Login</Text>
                      <Text style={styles.itemSubtext}>
                        Allow quick login on this device for faster access
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={quickLoginEnabled}
                    onValueChange={handleQuickLoginToggle}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                    thumbColor={quickLoginEnabled ? '#FFFFFF' : '#F3F4F6'}
                    ios_backgroundColor="#D1D5DB"
                  />
                </View>
              </View>

              {/* Account Monitoring */}
              <View style={styles.subsectionContainer}>
                <Text style={styles.subsectionTitle}>Account Monitoring</Text>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleCheckAccountActivity}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialIcons name="history" size={22} color="#EF4444" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemText}>Check Account Activity</Text>
                      <Text style={styles.itemSubtext}>View recent login history & IPs</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleManageLoginDevices}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                      <MaterialIcons name="devices" size={22} color="#3B82F6" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemText}>Manage Login Devices</Text>
                      <Text style={styles.itemSubtext}>View & revoke device access</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: Platform.OS === 'android' ? 30 : 0,
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
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  // Section Styles
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Profile Picture
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePictureWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 42,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Primary Item (My Profile)
  primaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  // Details Section
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1.5,
    textAlign: 'right',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtext: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Subsection Container
  subsectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

  // Quick Login
  quickLoginContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickLoginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
});
