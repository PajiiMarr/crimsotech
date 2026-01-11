import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ViewProductPage() {
  const params = useLocalSearchParams();
  const productId = params.productId as string | undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>View Product</Text>
        <Text style={styles.subtitle}>Product ID: {productId || 'N/A'}</Text>
        {/* TODO: Fetch product details by productId and render product view here */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8 },
});
