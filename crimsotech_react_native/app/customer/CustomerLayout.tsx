// app/customer/components/customerLayout.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import CustomerHeader from './includes/customerHeader';
import BottomTab from './includes/bottomTab';
import { FilterModalProvider } from './includes/FilterModalContext';

interface CustomerLayoutProps {
  children: ReactNode;
  disableScroll?: boolean;
}

export default function CustomerLayout({ children, disableScroll = false }: CustomerLayoutProps) {
  return (
    <FilterModalProvider>
      <View style={styles.container}>
        <CustomerHeader />
        {disableScroll ? (
          <View style={styles.content}>
            {children}
            {/* Bottom padding to prevent overlap with tab - reduced and colored to match page */}
            <View style={{ height: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#F8F9FA' }} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {children}
            {/* Bottom padding to prevent overlap with tab - reduced and colored to match page */}
            <View style={{ height: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#F8F9FA' }} />
          </ScrollView>
        )}
        <BottomTab />
      </View>
    </FilterModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, paddingHorizontal: 0 },
});
