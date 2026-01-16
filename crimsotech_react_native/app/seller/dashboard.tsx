// app/seller/dashboard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { 
  Package, 
  Gift, 
  ShoppingCart, 
  MapPin, 
  Store, 
  Tag 
} from 'lucide-react-native';
import { router } from 'expo-router';

interface DashboardItem {
  title: string;
  Icon: React.ComponentType<any>;
  badge?: number | null;
  route?: string;
}

export default function Dashboard() {
  const dashboardItems: DashboardItem[] = [
    { 
      title: 'Products', 
      Icon: Package,
      route: '/seller/product-list'
    },
    { 
      title: 'Gift', 
      Icon: Gift,
      route: '/seller/gifts'
    },
    { 
      title: 'Orders', 
      Icon: ShoppingCart,
      route: '/seller/orders'
    },
    { 
      title: 'Address', 
      Icon: MapPin,
      route: '/seller/address'
    },
    { 
      title: 'Shop Voucher', 
      Icon: Store,
      route: '/seller/shop-vouchers'
    },
    { 
      title: 'Product Voucher', 
      Icon: Tag,
      route: '/seller/product-vouchers'
    },
  ];

  const handlePress = (item: DashboardItem) => {
    // Explicit routing for Products to ensure it goes to the product list page
    if (item.title === 'Products') {
      console.log('Navigating to seller product list');
      router.push('/seller/product-list');
      return;
    }

    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Seller Dashboard</Text>
        </View>
        
        <View style={styles.iconRow}>
          {dashboardItems.map((item, index) => (
            <IconButton 
              key={index}
              Icon={item.Icon}
              label={item.title}
              badge={item.badge}
              onPress={() => handlePress(item)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

type IconButtonProps = {
  Icon: React.ComponentType<any>;
  label: string;
  badge?: number | null;
  onPress?: () => void;
};

const IconButton: React.FC<IconButtonProps> = ({ Icon, label, badge = null, onPress }) => (
  <TouchableOpacity 
    style={styles.iconItem} 
    onPress={onPress} 
    activeOpacity={0.6}
  >
    <View style={styles.iconWrapper}>
      <Icon size={20} color="#111827" strokeWidth={1.2} />
      {badge !== null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.iconLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginHorizontal: -16, // make full width relative to container padding
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconItem: {
    alignItems: 'center',
    width: '25%', // more compact grid
    marginBottom: 12,
  },
  iconWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    borderWidth: 1,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#111827',
  },
});