import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Mock data for demonstration
const mockEarningsData = [
  { day: 'Mon', earnings: 850 },
  { day: 'Tue', earnings: 1200 },
  { day: 'Wed', earnings: 600 },
  { day: 'Thu', earnings: 1000 },
  { day: 'Fri', earnings: 1400 },
  { day: 'Sat', earnings: 900 },
  { day: 'Sun', earnings: 1100 },
];

const mockCategoryData = [
  { name: 'Electronics', population: 45, color: '#3b82f6', legendFontColor: '#666', legendFontSize: 14 },
  { name: 'Clothing', population: 25, color: '#10b981', legendFontColor: '#666', legendFontSize: 14 },
  { name: 'Food', population: 15, color: '#8b5cf6', legendFontColor: '#666', legendFontSize: 14 },
  { name: 'Books', population: 10, color: '#f59e0b', legendFontColor: '#666', legendFontSize: 14 },
  { name: 'Other', population: 5, color: '#ec4899', legendFontColor: '#666', legendFontSize: 14 },
];

const mockDeliveryTypes = [
  { name: 'Same Day', earnings: 15000, percentage: 45 },
  { name: 'Next Day', earnings: 12000, percentage: 35 },
  { name: 'Standard', earnings: 7000, percentage: 20 },
];

export default function RiderEarningsScreen() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    dailyAverage: 0,
    goal: 0,
    progress: 0,
  });

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll use mock data
    setEarnings({
      totalEarnings: 45600,
      weeklyEarnings: 8050,
      dailyAverage: 1150,
      goal: 10000,
      progress: 80.5,
    });
  }, [timeRange]);

  const chartData = {
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

      {/* Earnings Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Earnings</Text>
        <Text style={styles.summaryAmount}>₱{earnings.totalEarnings.toLocaleString()}</Text>
        
        <View style={styles.goalContainer}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalText}>Weekly Goal: ₱{earnings.goal.toLocaleString()}</Text>
            <Text style={styles.goalProgress}>{earnings.progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(earnings.progress, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.goalSubtitle}>₱{earnings.weeklyEarnings.toLocaleString()} earned this week</Text>
        </View>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        
        <View style={styles.breakdownGrid}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>This Week</Text>
            <Text style={styles.breakdownAmount}>₱{earnings.weeklyEarnings.toLocaleString()}</Text>
            <Text style={styles.breakdownChange}>+12% from last week</Text>
          </View>
          
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Daily Average</Text>
            <Text style={styles.breakdownAmount}>₱{earnings.dailyAverage.toLocaleString()}</Text>
            <Text style={styles.breakdownChange}>+5% from last week</Text>
          </View>
          
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Avg. per Delivery</Text>
            <Text style={styles.breakdownAmount}>₱215</Text>
            <Text style={styles.breakdownChange}>+3% from last week</Text>
          </View>
          
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Active Days</Text>
            <Text style={styles.breakdownAmount}>6/7</Text>
            <Text style={styles.breakdownChange}>+1 from last week</Text>
          </View>
        </View>
      </View>

      {/* Earnings Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Earnings Trend</Text>
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

      {/* Category Breakdown */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>By Category</Text>
        <View style={styles.pieChartContainer}>
          <PieChart
            data={mockCategoryData}
            width={width - 40}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>

      {/* Delivery Type Breakdown */}
      <View style={styles.deliveryTypesSection}>
        <Text style={styles.sectionTitle}>By Delivery Type</Text>
        {mockDeliveryTypes.map((type, index) => (
          <View key={index} style={styles.deliveryTypeItem}>
            <View style={styles.deliveryTypeHeader}>
              <Text style={styles.deliveryTypeLabel}>{type.name}</Text>
              <Text style={styles.deliveryTypeAmount}>₱{type.earnings.toLocaleString()}</Text>
            </View>
            <View style={styles.deliveryTypeProgress}>
              <View style={[styles.deliveryTypeFill, { width: `${type.percentage}%` }]} />
            </View>
            <Text style={styles.deliveryTypePercentage}>{type.percentage}% of total</Text>
          </View>
        ))}
      </View>

      {/* Payout Info */}
      <View style={styles.payoutSection}>
        <Text style={styles.sectionTitle}>Payout Information</Text>
        <View style={styles.payoutCard}>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Next Payout</Text>
            <Text style={styles.payoutValue}>Dec 22, 2025</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Amount</Text>
            <Text style={styles.payoutValue}>₱4,560</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Method</Text>
            <Text style={styles.payoutValue}>Bank Transfer</Text>
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
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  goalContainer: {
    marginTop: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    color: '#64748b',
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  goalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  breakdownSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  breakdownCard: {
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
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  breakdownAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  breakdownChange: {
    fontSize: 12,
    color: '#10b981',
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
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTypesSection: {
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
  deliveryTypeItem: {
    marginBottom: 16,
  },
  deliveryTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  deliveryTypeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  deliveryTypeProgress: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  deliveryTypeFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  deliveryTypePercentage: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  payoutSection: {
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
  payoutCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  payoutLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  payoutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});