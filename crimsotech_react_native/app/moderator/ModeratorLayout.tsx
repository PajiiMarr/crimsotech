import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Platform, RefreshControlProps } from 'react-native';
import ModeratorHeader from './includes/moderatorHeader';
import ModeratorBottomTab from './includes/moderatorBottomTab';

interface ModeratorLayoutProps {
  children: ReactNode;
  disableScroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps> | null;
}

export default function ModeratorLayout({ children, disableScroll = false, refreshControl = null }: ModeratorLayoutProps) {
  return (
    <View style={styles.container}>
      <ModeratorHeader />
      {disableScroll ? (
        <View style={styles.content}>
          {children}
          <View style={{ height: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#F8F9FA' }} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl || undefined}>
          {children}
          <View style={{ height: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#F8F9FA' }} />
        </ScrollView>
      )}
      <ModeratorBottomTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, paddingHorizontal: 0 },
});
