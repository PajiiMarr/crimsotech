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
  hideBottomTab?: boolean; // Add this prop
}

export default function CustomerLayout({ 
  children, 
  disableScroll = false, 
  refreshControl = null,
  hideHeader = false,
  hideBottomTab = false // Add with default value
}: CustomerLayoutProps) {
  const [interfaceType, setInterfaceType] = useState<'main' | 'management'>('main');
  const pathname = usePathname();

  // Routes where bottom tab should be hidden regardless of interface type
  const hideBottomTabRoutes = [
    '/customer/product/view-product',
    '/customer/product/',
    '/customer/checkout',
    '/customer/order-confirmation',
    '/customer/rate',
  ];

  // Determine interface type based on current route
  useEffect(() => {
    const managementRoutePrefixes = [
      '/customer/personal-listing',
      '/customer/order-lists',
      '/customer/listing-return-refund',
      '/customer/comgift',
      '/customer/Returns',
      '/customer/product-listing',
      '/customer/order-lists',
      '/customer/listing-returns'
    ];

    const isManagement = managementRoutePrefixes.some(prefix => pathname.startsWith(prefix));
    setInterfaceType(isManagement ? 'management' : 'main');
  }, [pathname]);

  // Check if current route should hide the tab
  const shouldHideTabByRoute = hideBottomTabRoutes.some(route => 
    pathname?.startsWith(route)
  );

  // Determine if bottom tab should be shown
  // Hide if: explicitly hidden by prop OR hidden by route
  const shouldHideTab = hideBottomTab || shouldHideTabByRoute;

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
        
        {/* Only show bottom tab if not hidden */}
        {!shouldHideTab && (interfaceType === 'main' ? <BottomTab /> : <ManagementBottomTab />)}
      </View>
    </FilterModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, paddingHorizontal: 0 },
});