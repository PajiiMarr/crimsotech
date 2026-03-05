// app/customer/components/customerLayout.tsx
import React, { ReactNode, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, RefreshControlProps } from 'react-native';
import CustomerHeader from './includes/customerHeader';
import BottomTab from './includes/bottomTab';
import ManagementBottomTab from './includes/listingBottomTab';
import { FilterModalProvider } from './includes/FilterModalContext';
import { router, usePathname } from 'expo-router';

interface CustomerLayoutProps {
  children: ReactNode;
  disableScroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps> | null;
  hideHeader?: boolean;
}

export default function CustomerLayout({ 
  children, 
  disableScroll = false, 
  refreshControl = null,
  hideHeader = false
}: CustomerLayoutProps) {
  const [interfaceType, setInterfaceType] = useState<'main' | 'management'>('main');
  const pathname = usePathname();

  // Determine interface type based on current route
  useEffect(() => {
    const managementRoutes = [
      '/customer/personal-listing',
      '/customer/order-lists',
      '/customer/return-refund',
      '/customer/comgift',
      '/customer/Returns'
    ];
    
    if (managementRoutes.includes(pathname)) {
      setInterfaceType('management');
    } else {
      setInterfaceType('main');
    }
  }, [pathname]);

  const handleInterfaceSwitch = () => {
    if (interfaceType === 'main') {
      setInterfaceType('management');
      router.push('/customer/personal-listing');
    } else {
      setInterfaceType('main');
      router.push('/customer/home');
    }
  };

  return (
    <FilterModalProvider>
      <View style={styles.container}>
        {!hideHeader && (
          <CustomerHeader 
            interfaceType={interfaceType} 
            onInterfaceSwitch={handleInterfaceSwitch}
          />
        )}
        
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
        
        {interfaceType === 'main' ? <BottomTab /> : <ManagementBottomTab />}
      </View>
    </FilterModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, paddingHorizontal: 0 },
});