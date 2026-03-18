// app/seller/more.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ShopDetails {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
  contact_number: string;
  verified: boolean;
  status: string;
  is_suspended: boolean;
  follower_count: number;
  province: string;
  city: string;
  barangay: string;
  street: string;
}

export default function MorePage() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchShopData();
    }
  }, [shopId]);

  const fetchShopData = async () => {
    if (!shopId || !userId) return;

    try {
      const shopResponse = await AxiosInstance.get('/customer-shops/', {
        params: { customer_id: userId }
      });

      if (shopResponse.data.success) {
        const shops = shopResponse.data.shops || [];
        const foundShop = shops.find((s: ShopDetails) => s.id === shopId);
        setShop(foundShop || null);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      Alert.alert('Error', 'Failed to load shop information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopData();
  };

  const getFullAddress = () => {
    if (!shop) return '';
    return [shop.street, shop.barangay, shop.city, shop.province]
      .filter(Boolean)
      .join(', ');
  };

  const MenuSection = ({ title, items }: { title: string; items: any[] }) => (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={22} color={item.iconColor} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.menuSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>
          <View style={styles.menuRight}>
            {item.badge !== undefined && item.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: item.badgeBg || '#EE4D2D' }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to manage your settings</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#64748B" />
        </View>
      </SafeAreaView>
    );
  }

  const menuSections = [
    {
      title: 'MANAGE',
      items: [
        {
          id: 'return-address',
          title: 'Return Address',
          subtitle: getFullAddress() || 'Add your return address',
          icon: 'location-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/return-address?shopId=${shopId}`),
        },
        {
          id: 'vouchers',
          title: 'Vouchers',
          subtitle: 'Create and manage shop vouchers',
          icon: 'pricetag-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/vouchers?shopId=${shopId}`),
        },
        {
          id: 'boost',
          title: 'Boost',
          subtitle: 'Promote your products',
          icon: 'rocket-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/boosts?shopId=${shopId}`),
        },
        {
          id: 'settings',
          title: 'Settings',
          subtitle: 'Shop preferences and configuration',
          icon: 'settings-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/settings?shopId=${shopId}`),
        },
      ],
    },
    {
      title: 'INSIGHTS',
      items: [
        {
          id: 'products',
          title: 'Products',
          subtitle: 'View and manage your products',
          icon: 'cube-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/product-list?shopId=${shopId}`),
        },
        {
          id: 'orders',
          title: 'Orders',
          subtitle: 'Track and process orders',
          icon: 'cart-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/orders?shopId=${shopId}`),
        },
        {
          id: 'refunds',
          title: 'Refunds',
          subtitle: 'Handle return requests',
          icon: 'refresh-outline',
          iconBg: '#F1F5F9',
          iconColor: '#475569',
          onPress: () => router.push(`/seller/seller-return-refund-cancel?shopId=${shopId}`),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#64748B"
          />
        }
      >
        {/* Edge to Edge Content */}
        <View style={styles.content}>
          {/* Simple Shop Header - No Card, No Stats */}
          <View style={styles.shopHeader}>
            <View style={styles.shopImageContainer}>
              {shop?.shop_picture ? (
                <Image source={{ uri: shop.shop_picture }} style={styles.shopImage} />
              ) : (
                <View style={[styles.shopImage, styles.shopImagePlaceholder]}>
                  <Ionicons name="storefront" size={28} color="#94A3B8" />
                </View>
              )}
            </View>
            
            <View style={styles.shopInfo}>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopName}>{shop?.name}</Text>
                {shop?.verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                )}
              </View>
              
              <View style={styles.shopMeta}>
                <View style={styles.statusBadge}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: shop?.status === 'Active' && !shop?.is_suspended ? '#22C55E' : '#EF4444' }
                  ]} />
                  <Text style={styles.statusText}>
                    {shop?.is_suspended ? 'Suspended' : shop?.status}
                  </Text>
                </View>
                
                <Text style={styles.metaDivider}>•</Text>
                
                <View style={styles.followerBadge}>
                  <Ionicons name="people-outline" size={14} color="#64748B" />
                  <Text style={styles.followerText}>{shop?.follower_count || 0}</Text>
                </View>
              </View>

              {/* Contact Info inline */}
              <View style={styles.contactInline}>
                <Ionicons name="call-outline" size={14} color="#94A3B8" />
                <Text style={styles.contactText}>{shop?.contact_number}</Text>
              </View>
            </View>
          </View>

          {/* Menu Sections */}
          {menuSections.map((section) => (
            <MenuSection key={section.title} title={section.title} items={section.items} />
          ))}

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  shopHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shopImageContainer: {
    marginRight: 16,
  },
  shopImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  shopImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    color: '#475569',
  },
  metaDivider: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  followerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followerText: {
    fontSize: 13,
    color: '#475569',
  },
  contactInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: '#64748B',
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 24,
    borderTopWidth: 8,
    borderTopColor: '#F1F5F9',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
  },
  noShopText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});