// app/seller/order.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Order() {
  const statusItems = [
    { label: 'To Ship', count: 0 },
    { label: 'Cancelled', count: 0 },
    { label: 'Return', count: 0 },
    { label: 'Review', count: 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Status</Text>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => router.push('/seller/home')}
        >
          <Text style={styles.historyText}>View Sales History</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9E9E9E" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusGrid}>
        {statusItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.statusItem}>
            <Text style={styles.countText}>{item.count}</Text>
            <Text style={styles.labelSize}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  countText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#333',
    marginBottom: 8,
  },
  labelSize: {
    fontSize: 13,
    color: '#666',
  },
});