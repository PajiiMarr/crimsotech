import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RenewPlan() {
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  // Mock data for the plan being renewed
  const renewalData = {
    planName: "Pro Plan",
    price: 1188,
    period: "Yearly",
    expiryDate: "Feb 16, 2026",
    savings: "200"
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.cardTitle}>Renew Subscription</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Renewal Alert Box */}
        <View style={styles.alertBox}>
          <Feather name="info" size={20} color="#F97316" />
          <Text style={styles.alertText}>
            Your subscription will expire in <Text style={{fontWeight: '700'}}>30 days</Text>. Renew now to keep your products highlighted.
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Renewal Summary</Text>
          <View style={styles.planInfoRow}>
            <View>
              <Text style={styles.planNameText}>{renewalData.planName}</Text>
              <Text style={styles.planDetailText}>{renewalData.period} Subscription</Text>
            </View>
            <Text style={styles.planPriceText}>₱{renewalData.price}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₱{renewalData.price}.00</Text>
          </View>
          
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>You save ₱{renewalData.savings} with this renewal</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        
        {/* GCash Option with Real Icon Logo */}
        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'GCash' && styles.paymentActive]} 
          onPress={() => setPaymentMethod('GCash')}
        >
          <View style={styles.paymentLeft}>
            <View style={styles.gcashIconContainer}>
               {/* Replace this URI with your local GCash asset if needed */}
               <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/GCash_logo.svg/1200px-GCash_logo.svg.png' }} 
                style={styles.gcashLogo}
                resizeMode="contain"
               />
            </View>
            <Text style={styles.paymentName}>GCash</Text>
          </View>
          <Ionicons 
            name={paymentMethod === 'GCash' ? "radio-button-on" : "radio-button-off"} 
            size={22} 
            color={paymentMethod === 'GCash' ? "#2056F3" : "#D1D5DB"} 
          />
        </TouchableOpacity>

        {/* Credit Card Option */}
        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'Card' && styles.paymentActive]} 
          onPress={() => setPaymentMethod('Card')}
        >
          <View style={styles.paymentLeft}>
            <View style={[styles.methodIcon, {backgroundColor: '#111'}]}>
               <Ionicons name="card" size={20} color="#FFF" />
            </View>
            <Text style={styles.paymentName}>Credit / Debit Card</Text>
          </View>
          <Ionicons 
            name={paymentMethod === 'Card' ? "radio-button-on" : "radio-button-off"} 
            size={22} 
            color={paymentMethod === 'Card' ? "#000" : "#D1D5DB"} 
          />
        </TouchableOpacity>

        {/* Action Button */}
        <View style={styles.footer}>
          <Text style={styles.footerInfo}>
            By clicking &quot;Renew Now&quot;, you agree to our Terms of Service.
          </Text>
          <TouchableOpacity style={styles.renewBtn}>
            <Text style={styles.renewBtnText}>Renew Now</Text>
            <Feather name="refresh-cw" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16 },
  
  // Header
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Alert
  alertBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FFEDD5' },
  alertText: { flex: 1, fontSize: 13, color: '#9A3412', lineHeight: 18 },

  // Summary
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  planInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planNameText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  planDetailText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  planPriceText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#000' },
  savingsBadge: { backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  savingsText: { fontSize: 12, color: '#059669', fontWeight: '600' },

  // Payment Options
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginLeft: 4 },
  paymentOption: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  paymentActive: { borderColor: '#2056F3', backgroundColor: '#F8F9FF' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  // GCash Specific Icon Style
  gcashIconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  gcashLogo: { width: '80%', height: '80%' },
  
  methodIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  paymentName: { fontSize: 15, fontWeight: '600', color: '#374151' },

  // Footer
  footer: { marginTop: 20, paddingBottom: 40 },
  footerInfo: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  renewBtn: { backgroundColor: '#111827', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, gap: 10 },
  renewBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});