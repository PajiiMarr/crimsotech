import { useAuth } from '@/contexts/AuthContext';
import { getUserShops, registerUserAsCustomer } from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width} = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

  // helper to avoid strict typed route errors from expo-router's generated union
  const pushRoute = (path: string) => router.push(path as any);

  useEffect(() => {
    checkUserShop();
  }, [user]);

  const checkUserShop = async () => {
    if (!user?.user_id && !user?.id) {
      setHasShop(false);
      return;
    }

    try {
      setLoadingShop(true);

      // Try to register user as customer first
      const userId = user.user_id || user.id;
      try {
        await registerUserAsCustomer(userId);
      } catch (regError: any) {
        console.log('User might already be registered as customer:', regError.message);
        // Continue anyway since this might fail if already registered
      }

      // user_id is the User ID
      const userIdForRequest = String(userId);
      const response = await getUserShops(userIdForRequest);

      if (response.success && response.shops && response.shops.length > 0) {
        setHasShop(true);
      } else {
        setHasShop(false);
      }
    } catch (error) {
      console.error('Error checking shop:', error);
      setHasShop(false);
    } finally {
      setLoadingShop(false);
    }
  };

  const handleSwitchToShop = () => {
    // Don't return early, instead handle the null/undefined state
    if (hasShop === null) {
      // If still checking shop status, trigger the check again
      checkUserShop();
      return;
    }

    if (loadingShop) {
      // Still loading, don't do anything or show a temporary message
      Alert.alert('Please wait', 'Checking shop status...');
      return;
    }

    if (!hasShop) {
      // Navigate to create shop screen
      pushRoute('/main/create-shop');
    } else {
      // Navigate to shop dashboard/mode
      // For now, show alert - you can create a shop dashboard screen later
      Alert.alert(
        'Switch to Shop',
        'Shop mode coming soon! You can manage your shop from here.',
        [{ text: 'OK' }]
      );
      // TODO: Navigate to shop dashboard when created
      // router.push('/main/shop');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatar}>
            <MaterialIcons name="photo-camera" size={isSmallDevice ? 14 : 16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>
          {user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.first_name || user?.username || 'User'}
        </Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            // onPress={toggleOrderHistory}
          >
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            // onPress={() => router.push('/favorites')}
          >
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Shop Management Card */}
        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => {
            // Always go to shop management page where users can create or manage shops
            pushRoute('/shop');
          }}
        >
          <View style={styles.shopCardLeft}>
            <View style={[styles.shopCardIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons
                name="store"
                size={24}
                color="#FF9800"
              />
            </View>
            <View style={styles.shopCardTextContainer}>
              <Text style={styles.shopCardTitle}>
                {'Manage Your Shop'}
              </Text>
              <Text style={styles.shopCardSubtitle}>
                {hasShop ? 'View and manage your shops' : 'Create your first shop to start selling unlimited items'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/purchases')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffffffff' }]}>
              <MaterialIcons name="shopping-bag" size={isSmallDevice ? 20 : 22} color="#ec9c06ff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>My Purchases</Text>
              <Text style={styles.menuSubtext}>View your order history</Text>
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color="#B0BEC5"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/favorites')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffffffff' }]}>
              <MaterialIcons name="favorite" size={isSmallDevice ? 20 : 22} color="#E91E63" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Favorites</Text>
              <Text style={styles.menuSubtext}>Saved items & wishlist</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/addresses')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffffffff' }]}>
              <MaterialIcons name="location-on" size={isSmallDevice ? 20 : 22} color="#FF9800" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Addresses</Text>
              <Text style={styles.menuSubtext}>Shipping addresses</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => pushRoute('/pages/my-vouchers')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FCE4EC' }]}>
              <MaterialIcons name="local-offer" size={isSmallDevice ? 20 : 22} color="#E91E63" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>My Vouchers</Text>
              <Text style={styles.menuSubtext}>Claimed vouchers & discounts</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.menuItem}
          // onPress={() => router.push('/settings/notifications')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#ffffffff' }]}>
              <MaterialIcons name="notifications" size={isSmallDevice ? 20 : 22} color="#0288D1" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuSubtext}>Manage notifications</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>


        <TouchableOpacity
          style={styles.menuItem}
          // onPress={() => router.push('/settings/help')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="help-outline" size={isSmallDevice ? 20 : 22} color="#388E3C" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Help & Support</Text>
              <Text style={styles.menuSubtext}>FAQs & contact support</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          // onPress={() => router.push('/settings/about')}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="info" size={isSmallDevice ? 20 : 22} color="#F57C00" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>About</Text>
              <Text style={styles.menuSubtext}>App version & info</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0BEC5" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await logout();
        }}
      >
        <MaterialIcons name="logout" size={isSmallDevice ? 20 : 22} color="#F44336" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 24 : 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  avatar: {
    width: isSmallDevice ? 80 : isLargeDevice ? 100 : 90,
    height: isSmallDevice ? 80 : isLargeDevice ? 100 : 90,
    borderRadius: isSmallDevice ? 40 : isLargeDevice ? 50 : 45,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: isSmallDevice ? 32 : 36,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    width: isSmallDevice ? 28 : 32,
    height: isSmallDevice ? 28 : 32,
    borderRadius: isSmallDevice ? 14 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: isSmallDevice ? 22 : isLargeDevice ? 28 : 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'System',
  },
  userEmail: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    marginBottom: isSmallDevice ? 16 : 20,
    fontFamily: 'System',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: isSmallDevice ? 12 : 16,
    width: '100%',
    maxWidth: 400,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#6C757D',
    marginTop: 4,
    fontFamily: 'System',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: isSmallDevice ? 16 : 20,
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    borderRadius: 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: '#212529',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 12 : 16,
    fontFamily: 'System',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: isSmallDevice ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '500',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6C757D',
    fontFamily: 'System',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    marginTop: isSmallDevice ? 20 : 24,
    padding: isSmallDevice ? 14 : 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: 'System',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 24 : 32,
  },
  versionText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#ADB5BD',
    fontFamily: 'System',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: isSmallDevice ? 20 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    paddingBottom: isSmallDevice ? 16 : 20,
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  closeButton: {
    padding: 8,
  },
  trackingInfo: {
    marginBottom: isSmallDevice ? 24 : 30,
  },
  trackingNumberContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 12,
    marginBottom: isSmallDevice ? 12 : 16,
  },
  trackingNumberLabel: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#1976D2',
    fontWeight: '500',
    marginBottom: 4,
  },
  trackingNumber: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#1976D2',
    fontFamily: 'System',
  },
  orderIdContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 12,
  },
  orderIdLabel: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 4,
  },
  orderIdText: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  progressContainer: {
    marginBottom: isSmallDevice ? 24 : 30,
  },
  progressStep: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 24,
  },
  progressCircle: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: isSmallDevice ? 20 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 8 : 12,
    borderWidth: 2,
  },
  completedStep: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activeStep: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2196F3',
  },
  pendingStep: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  stepLabel: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'System',
  },
  stepDate: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    fontFamily: 'System',
  },
  currentStatus: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 24 : 30,
    fontFamily: 'System',
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42A5F5',
    paddingVertical: isSmallDevice ? 14 : 16,
    borderRadius: 12,
  },
  contactSupportText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: isSmallDevice ? 16 : 20,
    marginTop: isSmallDevice ? 16 : 20,
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 14 : 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  shopCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shopCardIcon: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 44 : 48,
    borderRadius: isSmallDevice ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  shopCardTextContainer: {
    flex: 1,
  },
  shopCardTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    color: '#212529',
    fontFamily: 'System',
    marginBottom: 2,
  },
  shopCardSubtitle: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    fontFamily: 'System',
  },
});