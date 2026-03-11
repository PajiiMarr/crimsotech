import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

type BoostPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  max_products?: number;
  product_limit?: number;
  features: string[];
};

type BoostItem = {
  id: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | string;
  created_at?: string;
  start_date?: string;
  end_date?: string;
  days_remaining?: number;
  product?: { name?: string };
  plan?: { name?: string; price?: number; duration?: number; time_unit?: string };
};

type BoostCounts = {
  total: number;
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
};

export default function BoostsScreen() {
  const { userId, shopId } = useAuth();
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [boosts, setBoosts] = useState<BoostItem[]>([]);
  const [counts, setCounts] = useState<BoostCounts>({ total: 0, active: 0, pending: 0, expired: 0, cancelled: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'cancelled'>('all');

  const fetchPlans = async () => {
    if (!shopId) return;
    
    try {
      if (!refreshing) setLoading(true);
      
      const response = await AxiosInstance.get('/seller-boosts/plans/', {
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || '',
        },
      });

      if (response.data && response.data.success) {
        setPlans(response.data.plans || []);
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error('Error fetching boost plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBoosts = async () => {
    if (!userId) return;

    try {
      const response = await AxiosInstance.get(`/seller-boosts/user/${userId}/`, {
        params: { status: statusFilter },
        headers: {
          'X-User-Id': userId || '',
          'X-Shop-Id': shopId || '',
        },
      });

      if (response.data?.success) {
        setBoosts(Array.isArray(response.data.boosts) ? response.data.boosts : []);
        setCounts(response.data.counts || { total: 0, active: 0, pending: 0, expired: 0, cancelled: 0 });
      } else {
        setBoosts([]);
      }
    } catch (error) {
      console.error('Error fetching boosts:', error);
      setBoosts([]);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [shopId, userId]);

  useEffect(() => {
    fetchBoosts();
  }, [userId, shopId, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchPlans(), fetchBoosts()]).finally(() => setRefreshing(false));
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return '#16A34A';
    if (status === 'pending') return '#D97706';
    if (status === 'expired') return '#6B7280';
    if (status === 'cancelled') return '#DC2626';
    return '#6B7280';
  };

  const handleBuyPlan = (plan: BoostPlan) => {
    setSelectedPlan(plan);
    setModalVisible(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedPlan) {
      router.push(`/seller/select-boost-product?planId=${selectedPlan.id}` as any);
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Loading boost plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Boost Your Products</Text>
        <Text style={styles.headerSubtitle}>
          Increase visibility and sales
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EE4D2D" />
        }
      >
        <View style={styles.statusWrap}>
          {([
            { id: 'all', label: `All (${counts.total})` },
            { id: 'active', label: `Active (${counts.active})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'expired', label: `Expired (${counts.expired})` },
            { id: 'cancelled', label: `Cancelled (${counts.cancelled})` },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.statusChip, statusFilter === tab.id && styles.statusChipActive]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text style={[styles.statusChipText, statusFilter === tab.id && styles.statusChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Your Boosts</Text>
          {boosts.length === 0 ? (
            <Text style={styles.sectionEmpty}>No boosts found for this filter.</Text>
          ) : (
            boosts.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.boostCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/seller/boost-details?id=${item.id}` as any)}
              >
                <View style={styles.boostRowTop}>
                  <Text style={styles.boostProduct} numberOfLines={1}>{item.product?.name || 'Boosted Product'}</Text>
                  <Text style={[styles.boostStatus, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.boostMeta} numberOfLines={1}>{item.plan?.name || 'Boost Plan'}</Text>
                <Text style={styles.boostMeta}>Days remaining: {item.days_remaining ?? 0}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="rocket-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No boost plans available</Text>
            <Text style={styles.emptySubtext}>
              Check back later for available boost options
            </Text>
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDuration}>{plan.duration} days</Text>
                  </View>
                  <Text style={styles.planPrice}>₱{plan.price}</Text>
                </View>

                <Text style={styles.planDescription}>{plan.description}</Text>

                <View style={styles.featuresContainer}>
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.featureText}>
                        Boost up to {plan.max_products || plan.product_limit || 'unlimited'} products
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => handleBuyPlan(plan)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buyButtonText}>Buy Plan</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Purchase</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <View style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Plan</Text>
                    <Text style={styles.modalValue}>{selectedPlan.name}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Duration</Text>
                    <Text style={styles.modalValue}>{selectedPlan.duration} days</Text>
                  </View>

                  <View style={[styles.modalSection, { borderBottomWidth: 0 }]}>
                    <Text style={styles.modalLabel}>Price</Text>
                    <Text style={styles.priceValue}>₱{selectedPlan.price}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleConfirmPurchase}
                  >
                    <Text style={styles.confirmButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  plansContainer: {
    paddingBottom: 24,
  },
  statusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  statusChipActive: {
    borderColor: '#EE4D2D',
    backgroundColor: '#FFF1EE',
  },
  statusChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#EE4D2D',
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionEmpty: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  boostCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  boostRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boostProduct: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  boostStatus: {
    fontSize: 10,
    fontWeight: '800',
  },
  boostMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  planDuration: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EE4D2D',
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#EE4D2D',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#EE4D2D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    color: '#EE4D2D',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#EE4D2D',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


