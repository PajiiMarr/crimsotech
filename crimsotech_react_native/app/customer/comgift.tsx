import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ComGift() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ComGift</Text>
      <Text style={styles.sub}>This is the ComGift screen (placeholder).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14, color: '#666', marginTop: 8 },
});