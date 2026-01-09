import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getFavorites, removeFavorite } from '@/utils/api';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

type FavoriteItem = {
  favorite_id: string;
  product_id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  condition: string;
  status: string;
  shop?: {
    id: string;
    name: string;
    barangay: string;
    city: string;
    province: string;
  };
  customer?: {
    id: string;
    username: string;
  };
  primary_image?: string | null;
  created_at?: string;
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const userId = useMemo(() => {
    if (!user) return null;
    return (user as any).user_id || (user as any).id || null;
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await getFavorites(userId);
      if (response.success) {
        setFavorites(response.favorites || []);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      Alert.alert('Error', 'Failed to load your favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [userId]);

  const handleRemoveFavorite = async (productId: string, productName: string) => {
    if (!userId) return;

    Alert.alert(
      'Remove from Favorites',
      `Remove "${productName}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFavorite(userId, productId);
              setFavorites(favorites.filter((item) => item.product_id !== productId));
            } catch (error) {
              console.error('Failed to remove favorite:', error);
              Alert.alert('Error', 'Failed to remove item from favorites');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => {
    const location = item.shop
      ? `${item.shop.barangay}, ${item.shop.city}`
      : item.customer
      ? `by ${item.customer.username}`
      : 'Unknown seller';

    return (
      <TouchableOpacity
        style={styles.favoriteCard}
        onPress={() => router.push(`/pages/product-detail?productId=${item.product_id}`)}
      >
        <View style={styles.itemImagePlaceholder}>
          <MaterialIcons name="devices" size={isSmallDevice ? 32 : 40} color="#666" />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveFavorite(item.product_id, item.name)}
              style={styles.favoriteButton}
            >
              <MaterialIcons
                name="favorite"
                size={24}
                color="#E91E63"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₱{parseFloat(item.price).toFixed(2)}</Text>
          </View>
          <View style={styles.itemMeta}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{item.condition}</Text>
            </View>
            <View style={styles.locationContainer}>
              <MaterialIcons name={item.shop ? "location-on" : "person"} size={14} color="#666" />
              <Text style={styles.location} numberOfLines={1}>{location}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <Text style={styles.title}>Favorites</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={60} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Please Log In</Text>
          <Text style={styles.emptySubtitle}>Log in to view your saved items</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={24} color="#212529" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={60} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtitle}>Start saving your favorite items</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/main/home')}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.favorite_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: isSmallDevice ? 12 : 16,
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallDevice ? 12 : 16,
    marginBottom: isSmallDevice ? 12 : 16,
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
  itemImagePlaceholder: {
    width: isSmallDevice ? 80 : 100,
    height: isSmallDevice ? 80 : 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallDevice ? 12 : 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    color: '#212529',
    marginRight: 8,
    fontFamily: 'System',
  },
  favoriteButton: {
    padding: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
    color: '#f77d0cff',
    marginRight: 8,
    fontFamily: 'System',
  },
  originalPrice: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
    fontFamily: 'System',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  conditionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  conditionText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#388E3C',
    fontWeight: '500',
    fontFamily: 'System',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  rating: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'System',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'System',
  },
  wishlistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  wishlistText: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#E91E63',
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isSmallDevice ? 32 : 48,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    textAlign: 'center',
    fontFamily: 'System',
  },
  loginButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

