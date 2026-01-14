// app/customer/components/customerHeader.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from './search';
import { router } from 'expo-router';

export default function CustomerHeader() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          {/* ================= SEARCH BAR ================= */}
          <View style={styles.searchWrapper}>
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onFocus={() => router.push('/customer/includes/search')} />
          </View>

          {/* ================= ICONS ================= */}
          <View style={styles.iconsContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/customer/notification')}>
              <Ionicons name="notifications-outline" size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/customer/settings')}>
              <Ionicons name="settings-outline" size={22} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30, // extra padding inside header
  },
  searchWrapper: {
    flex: 1,
    marginRight: 12,
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
});
