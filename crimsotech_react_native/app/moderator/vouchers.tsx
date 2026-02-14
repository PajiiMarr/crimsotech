import React, { useState, useEffect } from 'react';
import {
  View,
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

export default function ModeratorVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useAuth();

  const fetchVouchers = async () => {
    try {
      const response = await AxiosInstance.get('/moderator-vouchers/', {
        headers: { 'X-User-Id': userId },
      });
      setVouchers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVouchers();
  };

  return (
    <RoleGuard allowedRoles={['moderator']}>
      <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9ca3af" />
          </View>
        ) : (
          <View style={styles.content}>
            {vouchers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No vouchers found</Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={vouchers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/moderator/vouchers/${item.id}`)
                    }
                    style={styles.voucherCard}
                  >
                    <View style={styles.voucherHeader}>
                      <View style={styles.codeContainer}>
                        <Text style={styles.code}>{item.code}</Text>
                        <Text style={styles.discount}>
                          {item.discount_type === 'percentage'
                            ? `${item.value}%`
                            : `₱${item.value}`}{' '}
                          off
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.activeBadge,
                          {
                            backgroundColor: item.is_active
                              ? '#10b981'
                              : '#6b7280',
                          },
                        ]}
                      >
                        <Text style={styles.activeText}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.voucherMeta}>
                      <Text style={styles.metaText}>{item.shop_name}</Text>
                      <Text style={styles.metaText}>
                        Valid until:{' '}
                        {new Date(item.valid_until).toLocaleDateString()}
                      </Text>
                      <Text style={styles.metaText}>
                        Uses: {item.uses_count || 0}
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
  voucherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  codeContainer: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  discount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  voucherMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
