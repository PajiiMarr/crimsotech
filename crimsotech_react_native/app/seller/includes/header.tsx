// app/seller/includes/Header.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Image,
  Platform,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import AxiosInstance from '../../../contexts/axios';

interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  is_suspended: boolean;
  follower_count: number;
  province: string;
  city: string;
  barangay: string;
  street: string;
}

interface HeaderProps {
  shopId: string | null;
}

export default function Header({ shopId }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current screen is More tab
  const isMoreTab = pathname === '/seller/more';

  useEffect(() => {
    if (shopId) {
      fetchShopDetails();
    }
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await AxiosInstance.get('/shop-add-product/get_shop/', {
        headers: {
          'X-Shop-Id': shopId
        }
      });

      if (response.data.success) {
        setShop(response.data.shop);
      } else {
        setError('Failed to load shop details');
      }
    } catch (err: any) {
      console.error('Error fetching shop details:', err);
      setError(err.response?.data?.message || 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const handleMessages = () => {
    if (shopId) {
      // router.push(`/seller/messages?shopId=${shopId}`);
    }
  };

  const handleNotifications = () => {
    if (shopId) {
      router.push(`/seller/notification?shopId=${shopId}`);
    } else {
      router.push('/seller/notification');
    }
  };

  const handleSettings = () => {
    if (shopId) {
      router.push(`/seller/settings?shopId=${shopId}`);
    }
  };

  const handleSwitch = () => {
    router.push('/customer/shops');
  };

  // If no shopId is provided, show a simplified header
  if (!shopId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.leftContainer}>
            <Text style={styles.noShopText}>Select a Shop</Text>
          </View>
          <View style={styles.rightContainer}>
            <TouchableOpacity 
              onPress={handleSwitch} 
              style={styles.iconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="swap-horizontal-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // For More tab - show only shop name and settings/switch icons
  if (isMoreTab) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {/* Left side - Shop Name only */}
          <View style={styles.leftContainer}>
            {loading ? (
              <View style={styles.shopNameOnly}>
                <View style={styles.shopNamePlaceholder} />
              </View>
            ) : error ? (
              <Text style={styles.errorText} numberOfLines={1}>Error loading shop</Text>
            ) : shop ? (
              <Text style={styles.shopNameOnlyText} numberOfLines={1}>
                {shop.name}
              </Text>
            ) : null}
          </View>

          {/* Right side - Settings and Switch icons */}
          <View style={styles.rightContainer}>
            <TouchableOpacity 
              onPress={handleSettings} 
              style={styles.iconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={24} color="#374151" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSwitch} 
              style={styles.iconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="swap-horizontal-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // For other tabs - show full shop info with message icon
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Left side - Full Shop Info */}
        <TouchableOpacity 
          style={styles.leftContainer}
          disabled={loading || !shop}
        >
          {loading ? (
            <View style={styles.shopInfo}>
              <View style={[styles.shopImage, styles.shopImagePlaceholder]}>
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
              <View style={styles.shopDetails}>
                <View style={styles.shopNamePlaceholder} />
                <View style={styles.statusPlaceholder} />
              </View>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.errorText} numberOfLines={1}>Error loading shop</Text>
            </View>
          ) : shop ? (
            <View style={styles.shopInfo}>
              {shop.shop_picture ? (
                <Image 
                  source={{ uri: shop.shop_picture }} 
                  style={styles.shopImage}
                />
              ) : (
                <View style={[styles.shopImage, styles.shopImagePlaceholder]}>
                  <Ionicons name="storefront" size={20} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.shopDetails}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <View style={styles.statusRow}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: shop.status === 'Active' && !shop.is_suspended ? '#10B981' : '#EF4444' }
                  ]} />
                  <Text style={styles.statusText}>
                    {shop.is_suspended ? 'Suspended' : shop.status}
                  </Text>
                  {shop.verified && (
                    <>
                      <Text style={styles.statusDot}>•</Text>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Right side - Icons */}
        <View style={styles.rightContainer}>
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleMessages} 
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#374151" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSwitch} 
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="swap-horizontal-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
  },
  leftContainer: {
    flex: 1,
    marginRight: 12,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  shopImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopDetails: {
    marginLeft: 10,
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  shopNameOnly: {
    justifyContent: 'center',
  },
  shopNameOnlyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 2,
  },
  noShopText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  shopNamePlaceholder: {
    width: 100,
    height: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginBottom: 4,
  },
  statusPlaceholder: {
    width: 60,
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
});