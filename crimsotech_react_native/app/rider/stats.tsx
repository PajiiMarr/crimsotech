import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Mock data for demonstration
const mockDeliveryData = [
  { day: 'Mon', deliveries: 8 },
  { day: 'Tue', deliveries: 12 },
  { day: 'Wed', deliveries: 6 },
  { day: 'Thu', deliveries: 10 },
  { day: 'Fri', deliveries: 14 },
  { day: 'Sat', deliveries: 9 },
  { day: 'Sun', deliveries: 11 },
];

const mockEarningsData = [
  { day: 'Mon', earnings: 850 },
  { day: 'Tue', earnings: 1200 },
  { day: 'Wed', earnings: 600 },
  { day: 'Thu', earnings: 1000 },
  { day: 'Fri', earnings: 1400 },
  { day: 'Sat', earnings: 900 },
  { day: 'Sun', earnings: 1100 },
];

export default function RiderStatsScreen() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    avgRating: 0,
    deliveriesToday: 0,
    onTimeRate: 0,
    avgDeliveryTime: 0,
  });

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll use mock data
    setStats({
      totalDeliveries: 142,
      totalEarnings: 45600,
      avgRating: 4.8,
      deliveriesToday: 12,
      onTimeRate: 96,
      avgDeliveryTime: 32, // in minutes
    });
  }, [timeRange]);

  const chartData = {
    labels: mockDeliveryData.map(item => item.day),
    datasets: [
      {
        data: timeRange === 'week' 
          ? mockDeliveryData.map(item => item.deliveries) 
          : [12, 15, 10, 18, 14, 16, 20], // Mock monthly data
        strokeWidth: 2,
      },
    ],
  };

  const earningsChartData = {
    labels: mockEarningsData.map(item => item.day),
    datasets: [
      {
        data: timeRange === 'week' 
          ? mockEarningsData.map(item => item.earnings) 
          : [1200, 1500, 1000, 1800, 1400, 1600, 2000], // Mock monthly data
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  return (
    <ScrollView style={styles.container}>
      {/* Time Range Selector */}
      <View style={styles.timeSelector}>
        <TouchableOpacity 
          style={[styles.timeBtn, timeRange === 'week' && styles.activeTimeBtn]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.timeBtnText, timeRange === 'week' && styles.activeTimeBtnText]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeBtn, timeRange === 'month' && styles.activeTimeBtn]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.timeBtnText, timeRange === 'month' && styles.activeTimeBtnText]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeBtn, timeRange === 'year' && styles.activeTimeBtn]}
          onPress={() => setTimeRange('year')}
        >
          <Text style={[styles.timeBtnText, timeRange === 'year' && styles.activeTimeBtnText]}>Year</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Deliveries</Text>
          <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
          <Text style={styles.statChange}>+12% from last {timeRange}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earnings</Text>
          <Text style={styles.statValue}>₱{stats.totalEarnings.toLocaleString()}</Text>
          <Text style={styles.statChange}>+8% from last {timeRange}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg. Rating</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingValue}>{stats.avgRating}</Text>
            <Text style={styles.star}>⭐</Text>
          </View>
          <Text style={styles.statChange}>4.7/5.0</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Deliveries</Text>
          <Text style={styles.statValue}>{stats.deliveriesToday}</Text>
          <Text style={styles.statChange}>Goal: 15</Text>
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Deliveries Overview</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Earnings Trend</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={earningsChartData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>On-time Delivery Rate</Text>
          <View style={styles.metricValueContainer}>
            <Text style={styles.metricValue}>{stats.onTimeRate}%</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressFill, { width: `${stats.onTimeRate}%` }]} />
            </View>
          </View>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Avg. Delivery Time</Text>
          <View style={styles.metricValueContainer}>
            <Text style={styles.metricValue}>{stats.avgDeliveryTime} min</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressFill, { width: '85%' }]} />
            </View>
          </View>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Customer Satisfaction</Text>
          <View style={styles.metricValueContainer}>
            <Text style={styles.metricValue}>94%</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressFill, { width: '94%' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Weekly Summary */}
      <View style={styles.weeklySection}>
        <Text style={styles.sectionTitle}>This Week Summary</Text>
        <View style={styles.weeklyStats}>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>42</Text>
            <Text style={styles.weeklyStatLabel}>Deliveries</Text>
          </View>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>₱8,560</Text>
            <Text style={styles.weeklyStatLabel}>Earnings</Text>
          </View>
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>4.7</Text>
            <Text style={styles.weeklyStatLabel}>Rating</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 20,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  activeTimeBtn: {
    backgroundColor: '#3b82f6',
  },
  timeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTimeBtnText: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    flex: 1,
    margin: 6,
    minWidth: (width - 60) / 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#10b981',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 6,
  },
  star: {
    fontSize: 18,
  },
  chartSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  performanceSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  metricItem: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  weeklySection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weeklyStat: {
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  weeklyStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});