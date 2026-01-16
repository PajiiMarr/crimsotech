import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ActivePlan() {
  // Mock data for the current active plan
  const activeSubscription = {
    planName: "Pro Plan",
    status: "Active",
    price: "₱1,188",
    billingCycle: "Yearly",
    expiryDate: "Dec 12, 2026",
    features: [
      { text: "Highlights 5 products", used: 2, total: 5 },
      { text: "Priority search visibility", included: true },
      { text: "Advanced shop analytics", included: true },
    ]
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.cardTitle}>Active Plan</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={[styles.card, { borderColor: '#A855F7', borderWidth: 1 }]}>
          <View style={styles.subsCardHeader}>
            <View>
              <Text style={styles.planLabel}>Current Plan</Text>
              <Text style={styles.activePlanTitle}>{activeSubscription.planName}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{activeSubscription.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>{activeSubscription.price}/{activeSubscription.billingCycle === 'Yearly' ? 'yr' : 'mo'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>Renews On</Text>
              <Text style={styles.infoValue}>{activeSubscription.expiryDate}</Text>
            </View>
          </View>
        </View>

        {/* Usage/Features Section */}
        <Text style={styles.sectionTitle}>Plan Usage & Features</Text>
        
        <View style={styles.card}>
          {activeSubscription.features.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureText}>{item.text}</Text>
                {item.total && (
                  <View style={styles.progressWrapper}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${(item.used! / item.total!) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{item.used} of {item.total} slots used</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <TouchableOpacity 
          style={styles.manageBtn}
          onPress={() => router.push('/customer/subscription-plan')}
        >
          <Text style={styles.manageBtnText}>Upgrade or Change Plan</Text>
          <Feather name="arrow-up-right" size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  
  // Card Styling
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  subsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  activePlanTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 4 },
  
  // Status Badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { fontSize: 12, color: '#047857', fontWeight: '700' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#374151' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginLeft: 4 },
  
  // Feature Items
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  featureIconBox: { marginRight: 12, marginTop: 2 },
  featureText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  
  // Progress Bar
  progressWrapper: { marginTop: 8 },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#A855F7' },
  progressText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  // Buttons
  manageBtn: { backgroundColor: '#111827', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 10 },
  manageBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 }
});