import { getShopById, getShopProducts } from '@/utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const cardWidth = (width - 48) / 2;

export default function ShopProductsScreen() {
  const params = useLocalSearchParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    if (shopId) {
      loadShopInfo();
      loadProducts(true);
    }
  }, [shopId]);

  const loadShopInfo = async () => {
    try {
      const response = await getShopById(shopId);
      if (response.success && response.shops?.[0]) {
        setShop(response.shops[0]);
      }
    } catch (error) {
      console.error('Error loading shop info:', error);
    }
  };

  const loadProducts = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = initial ? 1 : page + 1;
      const response = await getShopProducts(shopId, currentPage, pageSize);
      const items = Array.isArray(response)
        ? response
        : response.products || response.results || [];

      if (initial) {
        setProducts(items || []);
      } else {
        setProducts((prev) => [...prev, ...(items || [])]);
      }

      setPage(currentPage);
      const next =
        typeof response?.has_next === 'boolean'
          ? response.has_next
          : items?.length === pageSize;
      setHasNext(next);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const imageUrl =
      item.primary_image?.url ||
      (item.media_files && item.media_files[0]?.file_data) ||
      undefined;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/pages/product-detail?productId=${item.id}`)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <MaterialIcons name="image" size={28} color="#B0BEC5" />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>
            ₱{Number(item.price || 0).toLocaleString()}
          </Text>
          {item.condition && (
            <Text style={styles.cardCondition}>{item.condition}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasNext) {
      return products.length > 0 ? (
        <View style={styles.footerContainer}>
          <Text style={styles.endOfListText}>You've reached the end</Text>
        </View>
      ) : null;
    }

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => loadProducts(false)}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loadMoreText}>Load more</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inventory" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No products yet</Text>
      <Text style={styles.emptySubtitle}>
        This shop hasn't listed any products.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shop Products</Text>
          {shop && <Text style={styles.headerSubtitle}>{shop.name}</Text>}
        </View>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6d0b" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 70,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        paddingTop: 10,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: cardWidth,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
  cardImage: {
    width: '100%',
    height: cardWidth,
    backgroundColor: '#F5F5F5',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: cardWidth,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700',
    color: '#ff6d0b',
    marginBottom: 4,
  },
  cardCondition: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#ff6d0b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  endOfListText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
