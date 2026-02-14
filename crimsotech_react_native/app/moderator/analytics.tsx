import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import RoleGuard from '../guards/RoleGuard';
import AxiosInstance from '../../contexts/axios';
import { useAuth } from '../../contexts/AuthContext';
import ModeratorLayout from './ModeratorLayout';

export default function ModeratorAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useAuth();

  const fetchAnalytics = async () => {
    try {
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const defaultEndDate = new Date();

      const params = new URLSearchParams();
      params.append('start_date', defaultStartDate.toISOString().split('T')[0]);
      params.append('end_date', defaultEndDate.toISOString().split('T')[0]);
      params.append('range_type', 'monthly');

      const response = await AxiosInstance.get(
        `/moderator-analytics/get_comprehensive_analytics/?${params.toString()}`,
        { headers: { 'X-User-Id': userId } }
      );

      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
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
            {/* User Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Distribution</Text>
              {analyticsData?.user_distribution?.map(
                (user: any, index: number) => (
                  <StatRow
                    key={index}
                    label={user.role}
                    value={user.count}
                    percentage={user.percentage}
                  />
                )
              )}
            </View>

            {/* Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity</Text>
              <StatRow
                label="Total Orders"
                value={analyticsData?.total_orders}
              />
              <StatRow
                label="Active Shops"
                value={analyticsData?.active_shops}
              />
              <StatRow
                label="Total Products"
                value={analyticsData?.total_products}
              />
              <StatRow label="Active Riders" value={analyticsData?.riders} />
            </View>

            {/* Revenue */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue</Text>
              <StatRow
                label="Total Revenue"
                value={`₱${analyticsData?.total_revenue?.toFixed(2) || 0}`}
                isCurrency
              />
              <StatRow
                label="Platform Fees"
                value={`₱${analyticsData?.platform_fees?.toFixed(2) || 0}`}
                isCurrency
              />
            </View>

            {/* Issues */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content Status</Text>
              <StatRow
                label="Active Reports"
                value={analyticsData?.active_reports}
                color="#ef4444"
              />
              <StatRow
                label="Resolved Issues"
                value={analyticsData?.resolved_issues}
                color="#10b981"
              />
              <StatRow
                label="Pending Review"
                value={analyticsData?.pending_review}
                color="#f59e0b"
              />
            </View>
          </View>
        )}
      </ModeratorLayout>
    </RoleGuard>
  );
}

function StatRow({
  label,
  value,
  percentage,
  isCurrency,
  color,
}: {
  label: string;
  value: string | number;
  percentage?: number;
  isCurrency?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueContainer}>
        <Text style={[styles.statValue, color && { color }]}>
          {value}
        </Text>
        {percentage && (
          <Text style={styles.percentage}>{percentage}%</Text>
        )}
      </View>
    </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  percentage: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
