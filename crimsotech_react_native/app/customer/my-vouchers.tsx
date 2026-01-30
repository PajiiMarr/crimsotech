import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// --- Theme Colors ---
const COLORS = {
  primary: '#F97316', // Your Brand Orange
  secondary: '#2563EB', // Blue for Free Shipping
  dark: '#111827',
  muted: '#6B7280',
  bg: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
  success: '#10B981',
  discountBg: '#FFF7ED',
};

// --- Mock Data ---
const CUSTOMER_VOUCHERS = [
  {
    id: '1',
    brand: 'Platform Wide',
    title: '₱100 OFF Sitewide',
    minSpend: 'Min. Spend ₱500',
    expiry: 'Ending in: 2h 45m',
    type: 'Discount',
    status: 'active',
    isUrgent: true,
  },
  {
    id: '2',
    brand: 'Free Shipping',
    title: 'Free Shipping Special',
    minSpend: 'Min. Spend ₱0',
    expiry: 'Valid until 15 Feb 2025',
    type: 'Shipping',
    status: 'active',
    isUrgent: false,
  },
  {
    id: '3',
    brand: 'Samsung Store',
    title: '15% Off Smartphones',
    minSpend: 'Min. Spend ₱10,000',
    expiry: 'Valid until 01 Feb 2025',
    type: 'Shop',
    status: 'active',
    isUrgent: false,
  },
];

export default function MyVouchersPage() {
  const [activeTab, setActiveTab] = useState('Available');

  const renderVoucher = ({ item }: { item: typeof CUSTOMER_VOUCHERS[0] }) => {
    return (
      <View style={styles.voucherWrapper}>
        <View style={styles.voucherCard}>
          {/* Left Section: Icon/Type */}
          <View style={[
            styles.leftSection, 
            { backgroundColor: item.type === 'Shipping' ? COLORS.secondary : COLORS.primary }
          ]}>
             <MaterialCommunityIcons 
              name={item.type === 'Shipping' ? "truck-fast" : "ticket-percent"} 
              size={32} 
              color="#FFF" 
            />
            <Text style={styles.typeLabel}>{item.type.toUpperCase()}</Text>
            
            {/* Decorative Semi-circles for Ticket effect */}
            <View style={styles.semiCircleTop} />
            <View style={styles.semiCircleBottom} />
          </View>

          {/* Right Section: Info */}
          <View style={styles.rightSection}>
            <View style={styles.mainInfo}>
              <Text style={styles.brandText}>{item.brand}</Text>
              <Text style={styles.titleText}>{item.title}</Text>
              <Text style={styles.minSpendText}>{item.minSpend}</Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.expiryContainer}>
                <Feather 
                  name="clock" 
                  size={12} 
                  color={item.isUrgent ? COLORS.primary : COLORS.muted} 
                />
                <Text style={[styles.expiryText, item.isUrgent && styles.urgentText]}>
                  {item.expiry}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.useButton} onPress={() => router.push('/')}>
                <Text style={styles.useButtonText}>USE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Custom Customer Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vouchers</Text>
        <TouchableOpacity>
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Voucher Code Input */}
      <View style={styles.inputCard}>
        <View style={styles.inputWrapper}>
          <TextInput 
            placeholder="Enter voucher code" 
            style={styles.input}
            placeholderTextColor={COLORS.muted}
          />
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['Available', 'Used', 'Expired'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={CUSTOMER_VOUCHERS}
        keyExtractor={(item) => item.id}
        renderItem={renderVoucher}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.suggestedContainer}>
            <Text style={styles.suggestedTitle}>Suggested for you</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  historyText: { color: COLORS.muted, fontSize: 14 },

  // Input Section
  inputCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingLeft: 12,
    alignItems: 'center',
  },
  input: { flex: 1, height: 44, fontSize: 14, color: COLORS.dark },
  applyBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  applyBtnText: { color: COLORS.white, fontWeight: '700' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
  activeTabLabel: { color: COLORS.primary, fontWeight: '700' },

  // Voucher List
  listPadding: { paddingBottom: 30 },
  suggestedContainer: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 },
  suggestedTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },

  // Voucher Card UI
  voucherWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    height: 110,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  leftSection: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  typeLabel: { color: '#FFF', fontSize: 10, fontWeight: '800', marginTop: 5 },
  semiCircleTop: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    top: -8,
    right: -8,
  },
  semiCircleBottom: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    bottom: -8,
    right: -8,
  },

  // Right Side
  rightSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mainInfo: { flex: 1 },
  brandText: { fontSize: 11, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' },
  titleText: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginTop: 2 },
  minSpendText: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  expiryContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expiryText: { fontSize: 11, color: COLORS.muted },
  urgentText: { color: COLORS.primary, fontWeight: '600' },
  
  useButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  useButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
});