import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

const data: any[] = [];

export default function RiderOrderHistoryScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => String(idx)}
        ListEmptyComponent={<Text style={styles.empty}>No completed orders yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>Order #{item.id}</Text>
            <Text style={styles.subtitle}>Delivered on {item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  card: { borderWidth: 1, borderColor: '#eee', padding: 16, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  subtitle: { fontSize: 12, color: '#666' },
});
