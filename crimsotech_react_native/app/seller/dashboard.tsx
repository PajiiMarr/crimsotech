import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Dashboard() {
  const router = useRouter();

  const menuItems = [
    { 
      title: 'My Products', 
      icon: 'package-variant-closed', 
      provider: 'MaterialCommunityIcons', 
      color: '#EE4D2D', 
      route: '/seller/myproducts' 
    },
    { title: 'My Finance', icon: 'wallet-outline', provider: 'MaterialCommunityIcons', color: '#FFB100', route: '/seller/finance' },
    { title: 'Shop Performance', icon: 'bar-chart', provider: 'MaterialIcons', color: '#EE4D2D', route: '/seller/performance' },
    { title: 'Marketing Centre', icon: 'home-percent', provider: 'MaterialCommunityIcons', color: '#0046AB', route: '/seller/marketing' },
    { title: 'Seller Programme', icon: 'shopping-bag', provider: 'FontAwesome5', color: '#FFB100', route: '/seller/programme' },
    { title: 'Learn and Help', icon: 'help-circle-outline', provider: 'MaterialCommunityIcons', color: '#26AA99', route: '/seller/help' },
  ];

  const renderIcon = (item: any) => {
    const iconProps = { name: item.icon, size: 28, color: '#FFF' };
    return (
      <View style={[styles.iconBox, { backgroundColor: item.color }]}>
        {item.provider === 'MaterialCommunityIcons' && <MaterialCommunityIcons {...iconProps as any} />}
        {item.provider === 'MaterialIcons' && <MaterialIcons {...iconProps as any} />}
        {item.provider === 'FontAwesome5' && <FontAwesome5 {...iconProps as any} />}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuItem}
            onPress={() => item.route && router.push(item.route as any)}
          >
            {renderIcon(item)}
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 20 },
  menuItem: { width: '33.33%', alignItems: 'center', marginBottom: 25, paddingHorizontal: 5 },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuTitle: { fontSize: 12, color: '#333', textAlign: 'center', lineHeight: 16 },
});