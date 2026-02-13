import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import RoleGuard from '../guards/RoleGuard';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';
import ModeratorLayout from './ModeratorLayout';

export default function ModeratorProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'recent',
  });
  const { userId } = useAuth();

  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/moderator-product/', {
        headers: { 'X-User-Id': userId },
      });
      setProducts(response.data.results || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#6b7280';
      case 'flagged':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <RoleGuard allowedRoles={['moderator']}>
      <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filters.status === 'all' && styles.filterBtnActive,
            ]}
            onPress={() => setFilters({ ...filters, status: 'all' })}
          >
            <Text
              style={[
                styles.filterText,
                filters.status === 'all' && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filters.status === 'flagged' && styles.filterBtnActive,
            ]}
            onPress={() => setFilters({ ...filters, status: 'flagged' })}
          >
            <Text
              style={[
                styles.filterText,
                filters.status === 'flagged' && styles.filterTextActive,
              ]}
            >
              Flagged
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9ca3af" />
          </View>
        ) : (
          <View style={styles.content}>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={products}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/moderator/products/${item.id}`)
                    }
                    style={styles.productCard}
                  >
                    <View style={styles.productHeader}>
                      <View style={styles.productTitleContainer}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.productShop}>{item.shop}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                    </View>
                    <View style={styles.productMeta}>
                      <Text style={styles.metaText}>Price: ₱{item.price}</Text>
                      <Text style={styles.metaText}>Stock: {item.quantity}</Text>
                      <Text style={styles.metaText}>
                        Reports: {item.reports_count || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </ModeratorLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  filterBtnActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productShop: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  productMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
