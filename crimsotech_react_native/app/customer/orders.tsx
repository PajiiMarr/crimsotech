import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ClipboardList, Package, Truck, Undo2, MessageSquare, Clock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import CustomerLayout from './CustomerLayout';

export default function OrderPage() {
  const { userRole } = useAuth();
  // State to track which tab is active
  const [activeTab, setActiveTab] = useState('To Process');

  // Simple role guard
  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const tabs = [
    { label: 'All', icon: ClipboardList },
    { label: 'To Process', icon: ClipboardList },
    { label: 'To Ship', icon: Package },
    { label: 'Shipped', icon: Truck },
    { label: 'Returns', icon: Undo2 },
    { label: 'Review', icon: MessageSquare, badge: 2 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout>
        {/* Added Label Section */}
        <View style={styles.headerLabelContainer}>
          <Text style={styles.headerLabel}>Personal Listing</Text>
        </View>

        <View style={styles.tabBarWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabBar}
          >
            {tabs.map((tab) => (
              <TouchableOpacity 
                key={tab.label} 
                onPress={() => setActiveTab(tab.label)}
                style={[
                  styles.tabItem, 
                  activeTab === tab.label && styles.activeTabItem
                ]}
              >
                <Text style={[
                  styles.tabLabel, 
                  activeTab === tab.label && styles.activeTabLabel
                ]}>
                  {tab.label}
                </Text>
                {tab.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Area - Matches your "Empty" image */}
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Clock size={60} color="#D1D5DB" strokeWidth={1} />
            </View>
            <Text style={styles.emptyText}>It is empty here..</Text>

            {(activeTab === 'Review' || activeTab === 'Rate') && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => router.push('/customer/purchases?tab=Rate')}
              >
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#6B7280' },

  // Label Styles
  headerLabelContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  // Tab Bar Styles
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabBar: {
    paddingHorizontal: 10,
    height: 50,
    alignItems: 'center',
  },
  tabItem: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#111827', 
  },
  tabLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#111827'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },

  // Empty State Styles
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  emptyIconCircle: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  rateButton: {
    marginTop: 18,
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});