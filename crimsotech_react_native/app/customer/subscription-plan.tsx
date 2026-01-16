import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SubscriptionPlan() {
  // State to handle the toggle
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Yearly');

  // Plan Data mapped to the billing cycle
  const pricing = {
    Monthly: {
      basic: "29",
      pro: "99",
      premium: "249",
      suffix: "/mo",
      label: "Billed monthly"
    },
    Yearly: {
      basic: "588",
      pro: "1188",
      premium: "2988",
      suffix: "/yr",
      label: "Billed at"
    }
  };

  const currentPricing = pricing[billingCycle];

  const FeatureRow = ({ text }: { text: string }) => (
    <View style={styles.subsFeatureItem}>
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
      <Text style={styles.subsFeatureText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.center}>
          <Text style={styles.mainTitle}>Subscription Plan</Text>
          <Text style={styles.message}>Boost your product for higher visibility</Text>
        </View>

        {/* Functional Billing Switcher */}
        <View style={styles.switcher}>
          <TouchableOpacity 
            onPress={() => setBillingCycle('Monthly')} 
            style={[styles.switchTab, billingCycle === 'Monthly' && styles.activeTab]}
          >
            <Text style={billingCycle === 'Monthly' ? styles.activeTabText : styles.switchText}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setBillingCycle('Yearly')} 
            style={[styles.switchTab, billingCycle === 'Yearly' && styles.activeTab]}
          >
            <Text style={billingCycle === 'Yearly' ? styles.activeTabText : styles.switchText}>Yearly</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Plan */}
        <View style={styles.card}>
          <View style={styles.subsCardHeader}>
            <Text style={styles.subsPlanTitle}>Basic</Text>
            <View style={styles.subsBadge}><Text style={styles.subsBadgeText}>No Discount</Text></View>
          </View>
          <Text style={styles.subsDescription}>Start your shop with a budget-friendly product highlight.</Text>
          <Text style={styles.subsPrice}>₱{currentPricing.basic}<Text style={styles.subsYearText}>{currentPricing.suffix}</Text></Text>
          <Text style={styles.subsBilledInfo}>
             {billingCycle === 'Yearly' ? `${currentPricing.label} ₱${currentPricing.basic} /yr` : currentPricing.label}
          </Text>
          
          <TouchableOpacity style={[styles.subsPurchaseBtn, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.subsPurchaseBtnText}>Purchase</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.subsGuarantee}><Feather name="clock" size={12} /> 7-day money-back guarantee</Text>
          
          <View style={styles.subsFeatureList}>
            <FeatureRow text="Highlights a single product" />
            <FeatureRow text="Valid for 30 days" />
            <FeatureRow text="Gain improved visibility in search results" />
          </View>
        </View>

        {/* Pro Plan */}
        <View style={[styles.card, { borderColor: '#A855F7', borderWidth: 2 }]}>
          <View style={styles.subsPopularTag}>
            <Text style={styles.subsPopularTagText}>Most Popular</Text>
          </View>
          <View style={styles.subsCardHeader}>
            <Text style={styles.subsPlanTitle}>Pro</Text>
            <View style={styles.subsBadge}><Text style={styles.subsBadgeText}>No Discount</Text></View>
          </View>
          <Text style={styles.subsDescription}>Boost your shop&apos;s presence with affordable product highlights.</Text>
          <Text style={styles.subsPrice}>₱{currentPricing.pro}<Text style={styles.subsYearText}>{currentPricing.suffix}</Text></Text>
          <Text style={styles.subsBilledInfo}>
            {billingCycle === 'Yearly' ? `${currentPricing.label} ₱${currentPricing.pro} /yr` : currentPricing.label}
          </Text>
          
          <TouchableOpacity style={[styles.subsPurchaseBtn, { backgroundColor: '#A855F7' }]}>
            <Text style={styles.subsPurchaseBtnText}>Purchase</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.subsGuarantee}><Feather name="clock" size={12} /> 7-day money-back guarantee</Text>
          
          <View style={styles.subsFeatureList}>
            <FeatureRow text="Highlights 5 products" />
            <FeatureRow text="Valid for 30 days" />
            <FeatureRow text="Enjoy improved visibility in search results" />
          </View>
        </View>

        {/* Premium Plan */}
        <View style={styles.card}>
          <View style={styles.subsCardHeader}>
            <Text style={styles.subsPlanTitle}>Premium</Text>
            <View style={styles.subsBadge}><Text style={styles.subsBadgeText}>No Discount</Text></View>
          </View>
          <Text style={styles.subsDescription}>Enhance the visibility of your products with priority placement.</Text>
          <Text style={styles.subsPrice}>₱{currentPricing.premium}<Text style={styles.subsYearText}>{currentPricing.suffix}</Text></Text>
          <Text style={styles.subsBilledInfo}>
            {billingCycle === 'Yearly' ? `${currentPricing.label} ₱${currentPricing.premium} /yr` : currentPricing.label}
          </Text>
          
          <TouchableOpacity style={[styles.subsPurchaseBtn, { backgroundColor: '#FACC15' }]}>
            <Text style={styles.subsPurchaseBtnText}>Purchase</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.subsGuarantee}><Feather name="clock" size={12} /> 7-day money-back guarantee</Text>
          
          <View style={styles.subsFeatureList}>
            <FeatureRow text="Highlights 15 products" />
            <FeatureRow text="Valid for 30 days" />
            <FeatureRow text="Gain higher ranking in search results" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  mainTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 24, 
    marginBottom: 32, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12,
    position: 'relative' 
  },
  switcher: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 25, padding: 4, marginVertical: 30, alignSelf: 'center' },
  switchTab: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  activeTab: { backgroundColor: '#000' },
  switchText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FFF', fontWeight: '600' },
  subsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subsPlanTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subsBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subsBadgeText: { fontSize: 10, color: '#2563EB', fontWeight: '700' },
  subsDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  subsPrice: { fontSize: 36, fontWeight: '800', color: '#111827' },
  subsYearText: { fontSize: 16, color: '#6B7280', fontWeight: '400' },
  subsBilledInfo: { fontSize: 12, color: '#9CA3AF', marginBottom: 24 },
  subsPurchaseBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  subsPurchaseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  subsGuarantee: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
  subsFeatureList: { marginTop: 24, gap: 12 },
  subsFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subsFeatureText: { fontSize: 13, color: '#4B5563' },
  subsPopularTag: { 
    position: 'absolute', 
    top: -14, 
    alignSelf: 'center', 
    backgroundColor: '#A855F7', 
    paddingHorizontal: 16, 
    paddingVertical: 4, 
    borderRadius: 20,
    zIndex: 10 
  },
  subsPopularTagText: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
});