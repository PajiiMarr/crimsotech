import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import CustomerLayout from './CustomerLayout';

export default function PendingApprovalPage() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          <View style={styles.card}>
            <ShieldAlert size={54} color="#D97706" />
            <Text style={styles.title}>Pending Approval</Text>
            <Text style={styles.description}>
              Your request is currently waiting for admin verification. We will notify you once it is approved.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/customer/notification')}>
              <Text style={styles.primaryButtonText}>View Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 18,
    alignItems: 'center',
  },
  title: { marginTop: 10, fontSize: 20, fontWeight: '800', color: '#111827' },
  description: { marginTop: 8, textAlign: 'center', color: '#6B7280', lineHeight: 20 },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#F97316',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
