import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';

interface EarningsMetrics {
  total_deliveries?: number;
  total_earnings?: number;
}

interface DeliveryData {
  order_amount?: number;
}

type ViewMode = 'all' | 'today';

export default function Earnings() {
  const { user } = useAuth();
  const userId = user?.user_id || user?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewMode>('all');
  const [metrics, setMetrics] = useState<EarningsMetrics | null>(null);
  const [totalCollected, setTotalCollected] = useState<number>(0);

  const deductions = 0;

  const formatCurrency = (amount: number) =>
    `PHP ${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fetchEarningsData = async (tab: ViewMode = activeTab) => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {};

      if (tab === 'today') {
        params.start_date = today;
        params.end_date = today;
      }

      const res = await AxiosInstance.get('/rider-history/order_history/', {
        headers: { 'X-User-Id': userId },
        params,
      });

      if (res.data?.success) {
        setMetrics(res.data.metrics || null);
        const deliveries: DeliveryData[] = res.data.deliveries || [];
        const collected = deliveries.reduce(
          (sum, d) => sum + Number(d.order_amount || 0),
          0,
        );
        setTotalCollected(collected);
      } else {
        setMetrics(null);
        setTotalCollected(0);
      }
    } catch (error) {
      console.error('Failed to load earnings metrics', error);
      setMetrics(null);
      setTotalCollected(0);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarningsData(activeTab);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData(activeTab);
  };

  const onExport = async () => {
    const base = AxiosInstance.defaults.baseURL || '';
    if (!base || !userId) {
      Alert.alert('Export Failed', 'Missing export URL or user ID.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dateParams =
      activeTab === 'today' ? `&start_date=${today}&end_date=${today}` : '';
    const url = `${base}/rider-history/export_history/?format=csv&user_id=${userId}${dateParams}`;
    await Linking.openURL(url);
  };

  const MetricCard = ({
    title,
    value,
    icon,
    iconBgColor,
    iconColor,
  }: {
    title: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBgColor: string;
    iconColor: string;
  }) => (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
            {value}
          </Text>
        </View>
        <View style={{ backgroundColor: iconBgColor, padding: 10, borderRadius: 999 }}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ padding: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                Earnings
              </Text>
              <TouchableOpacity
                onPress={onExport}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#E5E7EB',
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="download-outline" size={16} color="#374151" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#374151',
                    marginLeft: 4,
                  }}
                >
                  Export
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/rider/withdraw' as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#111827',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                marginTop: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Ionicons name="wallet-outline" size={16} color="white" />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: 'white',
                  marginLeft: 6,
                }}
              >
                Wallet & Withdraw
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Quick summary of your delivery performance
            </Text>

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F3F4F6',
                borderRadius: 10,
                padding: 3,
                marginTop: 14,
              }}
            >
              {(['all', 'today'] as ViewMode[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: activeTab === tab ? 'white' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: activeTab === tab ? '#111827' : '#9CA3AF',
                    }}
                  >
                    {tab === 'all' ? 'All Time' : 'Today'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#1F2937',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              shadowColor: '#1F2937',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text style={{ fontSize: 14, color: '#D1D5DB', marginBottom: 8 }}>
              Total Balance
            </Text>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                {formatCurrency(Number(metrics?.total_earnings || 0))}
              </Text>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 32 }} />
          ) : (
            <View>
              <MetricCard
                title="Total Deliveries"
                value={(metrics?.total_deliveries ?? 0).toString()}
                icon="cube-outline"
                iconBgColor="#EFF6FF"
                iconColor="#2563EB"
              />
              <MetricCard
                title="Total Money Collected"
                value={formatCurrency(totalCollected)}
                icon="cash-outline"
                iconBgColor="#D1FAE5"
                iconColor="#059669"
              />
              <MetricCard
                title="Total Earnings (Delivery Fees)"
                value={formatCurrency(Number(metrics?.total_earnings || 0))}
                icon="wallet-outline"
                iconBgColor="#FEF3C7"
                iconColor="#D97706"
              />
              <MetricCard
                title="Deductions"
                value={formatCurrency(deductions)}
                icon="remove-circle-outline"
                iconBgColor="#FEE2E2"
                iconColor="#DC2626"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
