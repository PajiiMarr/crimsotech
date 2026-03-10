import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';

export default function SellerArrangeShipmentPage() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Arrange Shipment', headerTitleAlign: 'center', headerShadowVisible: false }} />
      <View style={styles.content}>
        <Text style={styles.title}>Arrange Shipment</Text>
        <Text style={styles.subtitle}>Order ID: {orderId || '-'}</Text>
        <Text style={styles.note}>
          This page is ready for shipment workflow integration (rider assignment, tracking, and waybill actions).
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#475569', fontWeight: '600' },
  note: { marginTop: 12, fontSize: 13, color: '#64748B', lineHeight: 20 },
  button: { marginTop: 20, height: 44, borderRadius: 10, backgroundColor: '#EE4D2D', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
