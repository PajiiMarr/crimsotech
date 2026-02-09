import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router, useNavigation } from 'expo-router';
import RiderHeader from './includes/riderHeader';
import { getRiderProfile } from '../../utils/riderApi';

// --- Theme Colors ---
const COLORS = {
  primary: '#DC2626',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1E293B',
  subText: '#64748B',
  border: '#E2E8F0',
  danger: '#DC2626',
  iconBg: '#FEE2E2',
};

export default function SettingsPage() {
  const { userId, userRole, clearAuthData } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await getRiderProfile(userId);
      setProfileData(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract user data from profile
  const userData = profileData ? {
    name: `${profileData.user?.first_name || ''} ${profileData.user?.last_name || ''}`.trim() || 'Rider',
    id: profileData.rider?.id || 'N/A',
    email: profileData.user?.email || '',
    avatar: profileData.user?.profile_picture || null,
    phone: profileData.user?.contact_number || '',
    verified: profileData.rider?.verified || false,
  } : {
    name: 'Rider',
    id: 'N/A',
    email: '',
    avatar: null,
    phone: '',
    verified: false,
  };

  useEffect(() => {
    if (navigation && (navigation as any).setOptions) {
      (navigation as any).setOptions({ headerShown: false });
    }
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAuthData();
            router.replace('/(auth)/login');
          } catch (err) {
            console.error('Logout error:', err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  // --- Reusable Setting Item Component ---
  const SettingItem = ({ 
    icon, 
    iconColor = COLORS.primary, 
    title, 
    subtitle,
    onPress, 
    isDestructive = false,
    showChevron = true
  }: { 
    icon: any; 
    iconColor?: string; 
    title: string; 
    subtitle?: string;
    onPress?: () => void; 
    isDestructive?: boolean;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#FEF2F2' : COLORS.iconBg }]}>
          <Feather name={icon} size={20} color={isDestructive ? COLORS.danger : iconColor} />
        </View>
        <View>
          <Text style={[styles.itemText, isDestructive && styles.destructiveText]}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <RiderHeader 
        title="Settings"
        showBackButton={true}
        showNotifications={false}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* --- Profile Card --- */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>JR</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.name}</Text>
              <Text style={styles.profileId}>ID: {userData.id}</Text>
              {userData.verified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color={COLORS.primary} />
                  <Text style={styles.verifiedText}>Verified Rider</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.editProfileBtn}
              onPress={() => router.push('/rider/edit-profile')}
            >
              <Feather name="edit-2" size={18} color={COLORS.subText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Account Section --- */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionGroup}>
          <SettingItem 
            icon="user" 
            title="Personal Information" 
            subtitle={userData.phone ? `${userData.email}, ${userData.phone}` : userData.email}
            onPress={() => router.push('/rider/edit-profile')} 
          />
          <View style={styles.separator} />
          <SettingItem 
            icon="shield" 
            title="Login & Security" 
            onPress={() => {}} 
          />
          <View style={styles.separator} />
          <SettingItem 
            icon="credit-card" 
            title="Bank Accounts & Cards" 
            onPress={() => {}} 
          />
        </View>

        {/* --- App Preferences --- */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={styles.sectionGroup}>
          <SettingItem 
            icon="bell" 
            title="Notifications" 
            onPress={() => {}} 
          />
          <View style={styles.separator} />
          <SettingItem 
            icon="map-pin" 
            title="Navigation Settings" 
            onPress={() => {}} 
          />
          <View style={styles.separator} />
          <SettingItem 
            icon="moon" 
            title="Appearance" 
            subtitle="System Default"
            onPress={() => {}} 
          />
        </View>

        {/* --- Support --- */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionGroup}>
          <SettingItem 
            icon="help-circle" 
            title="Help Center" 
            onPress={() => {}} 
          />
          <View style={styles.separator} />
          <SettingItem 
            icon="file-text" 
            title="Terms & Policies" 
            onPress={() => {}} 
          />
        </View>

        {/* --- Logout --- */}
        <View style={[styles.sectionGroup, styles.logoutGroup]}>
          <SettingItem 
            icon="log-out" 
            title="Log Out" 
            isDestructive={true}
            showChevron={false}
            onPress={handleLogout}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Electronics Delivery App v1.0.0</Text>
        </View>

        {/* Extra spacing for bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: COLORS.subText,
  },
  
  // Profile Card
  profileSection: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileId: {
    fontSize: 11,
    color: COLORS.subText,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FEF2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  editProfileBtn: {
    padding: 6,
  },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subText,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionGroup: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutGroup: {
    marginTop: 16,
    borderColor: '#FECACA',
  },
  
  // Setting Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemSubtitle: {
    fontSize: 11,
    color: COLORS.subText,
    marginTop: 2,
  },
  destructiveText: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 56,
  },

  // Footer
  versionContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: COLORS.subText,
  },
});