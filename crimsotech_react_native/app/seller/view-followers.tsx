// app/seller/view-followers.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

interface Follower {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_username: string;
  profile_picture: string | null;
  followed_at: string;
  total_orders?: number;
  total_spent?: number;
}

interface FollowersResponse {
  success: boolean;
  shop_id: string;
  shop_name: string;
  total_followers: number;
  followers: Follower[];
}

export default function ViewFollowers() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [shopName, setShopName] = useState('');
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchFollowers();
    }
  }, [shopId]);

  // In view-followers.tsx, update the fetchFollowers function:
  const fetchFollowers = async () => {
    if (!shopId) return;
  
    try {
      setLoading(true);
      
      // Use the new followers endpoint
      const response = await AxiosInstance.get(`/shops/${shopId}/followers/`, {
        headers: { 'X-User-Id': userId || '' }
      });
  
      if (response.data.success) {
        setShopName(response.data.shop_name || '');
        setTotalFollowers(response.data.total_followers || 0);
        setFollowers(response.data.followers || []);
      } else {
        console.error('Error:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowers();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const renderFollowerItem = ({ item }: { item: Follower }) => (
    <TouchableOpacity 
      style={styles.followerCard}
      activeOpacity={0.7}
      onPress={() => {
        // Navigate to customer profile or chat
        router.push(`/customer/profile?userId=${item.customer_id}`);
      }}
    >
      <View style={styles.followerAvatar}>
        {item.profile_picture ? (
          <Image 
            source={{ uri: item.profile_picture }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(item.customer_name || item.customer_username)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.followerInfo}>
        <Text style={styles.followerName}>
          {item.customer_name || item.customer_username}
        </Text>
        <Text style={styles.followerUsername}>@{item.customer_username}</Text>
        <View style={styles.followerMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
            <Text style={styles.metaText}>Followed {formatDate(item.followed_at)}</Text>
          </View>
          {item.total_orders !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="cart-outline" size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>{item.total_orders} orders</Text>
            </View>
          )}
          {item.total_spent !== undefined && item.total_spent > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>
                ₱{item.total_spent.toLocaleString('en-PH')}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.followerActions}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => {
            router.push(`/customer/messages?userId=${item.customer_id}`);
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Followers Yet</Text>
      <Text style={styles.emptyText}>
        When customers follow your shop, they'll appear here.
      </Text>
    </View>
  );

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color="#E5E7EB" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view followers</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Followers</Text>
          <Text style={styles.headerSubtitle}>{shopName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalFollowers}</Text>
          <Text style={styles.statLabel}>Total Followers</Text>
        </View>
      </View>

      {/* Followers List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7280" />
          <Text style={styles.loadingText}>Loading followers...</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderFollowerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#6B7280"
              colors={['#6B7280']}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  statsBanner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  followerAvatar: {
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  followerUsername: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  followerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  followerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  noShopTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#111827',
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