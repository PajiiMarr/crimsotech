import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';

// --- CLEANED DATA: ONLY YOUR REQUESTED STATUSES ---
const INITIAL_CART_DATA = [
  {
    storeId: 'store_1',
    storeName: 'Tech Central PH',
    items: [
      { 
        id: '101', 
        name: 'iPhone 13 Pro', 
        variant: '128GB · Sierra Blue', 
        condition: 'Used - Excellent', 
        price: 38500.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&q=80' 
      },
      { 
        id: '102', 
        name: 'Sony WH-1000XM4', 
        variant: 'Black · ANC', 
        condition: 'Refurbished', 
        price: 12400.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80' 
      },
      { 
        id: '103', 
        name: 'Logitech MX Master', 
        variant: 'Space Grey', 
        condition: 'Used - Good', 
        price: 4500.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80' 
      },
    ]
  },
  {
    storeId: 'store_2',
    storeName: 'Elite Gadgets',
    items: [
      { 
        id: '201', 
        name: 'Nintendo Switch OLED', 
        variant: 'White Joycons', 
        condition: 'Like New', 
        price: 14500.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1612444530582-fc66183b16f7?w=400&q=80' 
      },
      { 
        id: '202', 
        name: 'Mechanical Keyboard', 
        variant: 'Blue Switches', 
        condition: 'New', 
        price: 3200.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80' 
      },
      { 
        id: '203', 
        name: 'Kindle Paperwhite', 
        variant: '16GB · Black', 
        condition: 'Used - Excellent', 
        price: 7800.00, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80' 
      },
    ]
  }
];

export default function CartPage() {
  const { loading: authLoading } = useAuth();
  const [cartStores, setCartStores] = useState(INITIAL_CART_DATA);
  const [selectedItems, setSelectedItems] = useState([]);

  const allItems = cartStores.flatMap(store => store.items);

  const updateQuantity = (itemId, change) => {
    setCartStores(prev => prev.map(store => ({
      ...store,
      items: store.items.map(item => item.id === itemId 
        ? { ...item, quantity: Math.max(1, item.quantity + change) } 
        : item
      )
    })));
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectStore = (storeItems) => {
    const ids = storeItems.map(i => i.id);
    const allSelected = ids.every(id => selectedItems.includes(id));
    setSelectedItems(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const toggleSelectAll = () => {
    setSelectedItems(selectedItems.length === allItems.length ? [] : allItems.map(i => i.id));
  };

  const totalPrice = allItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (authLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.shopName}>CrimsoTech</Text>
            <Text style={styles.pageTitle}>Shopping Cart</Text>
          </View>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.headerAction}>
              {selectedItems.length === allItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {cartStores.map((store) => {
            const isStoreSelected = store.items.every(id => selectedItems.includes(id.id));

            return (
              <View key={store.storeId} style={styles.storeSection}>
                <TouchableOpacity style={styles.storeHeader} onPress={() => toggleSelectStore(store.items)}>
                  <Ionicons 
                    name={isStoreSelected ? "checkbox" : "square-outline"} 
                    size={20} color={isStoreSelected ? "#111" : "#C4C4C4"} 
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.storeName}>{store.storeName}</Text>
                  <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
                </TouchableOpacity>

                {store.items.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <View key={item.id} style={styles.cartItem}>
                      <TouchableOpacity onPress={() => toggleSelect(item.id)} style={styles.checkbox}>
                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#111" : "#E5E5E5"} />
                      </TouchableOpacity>

                      <Image source={{ uri: item.image }} style={styles.itemImage} />

                      <View style={styles.itemContent}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        
                        <View style={styles.statusContainer}>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.condition}</Text>
                          </View>
                          <Text style={styles.itemVariant} numberOfLines={1}> | {item.variant}</Text>
                        </View>

                        <View style={styles.bottomRow}>
                          <Text style={styles.itemPrice}>₱{item.price.toLocaleString()}</Text>
                          
                          <View style={styles.qtyControl}>
                             <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                               <Ionicons name="remove" size={14} color="#333" />
                             </TouchableOpacity>
                             <Text style={styles.qtyValue}>{item.quantity}</Text>
                             <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                               <Ionicons name="add" size={14} color="#333" />
                             </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.checkoutBtn, { opacity: selectedItems.length > 0 ? 1 : 0.5 }]}
            disabled={selectedItems.length === 0}
            onPress={() => Alert.alert('Checkout', `Confirming ₱${totalPrice.toLocaleString()}`)}
          >
            <Text style={styles.checkoutText}>Checkout ({selectedItems.length})</Text>
          </TouchableOpacity>
        </View>

      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#FFF' },
  shopName: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 1, textTransform: 'uppercase' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#000', marginTop: 2 },
  headerAction: { fontSize: 13, color: '#666', fontWeight: '600' },
  scrollContent: { paddingBottom: 120 },
  storeSection: { marginTop: 12, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  storeHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8F8F8', backgroundColor: '#FAFAFA' },
  storeName: { fontSize: 13, fontWeight: '700', color: '#333', marginRight: 4 },
  cartItem: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  checkbox: { justifyContent: 'center', paddingRight: 10 },
  itemImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#F3F3F3' },
  itemContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E5E5E5' },
  statusText: { fontSize: 9, fontWeight: '700', color: '#555' },
  itemVariant: { fontSize: 12, color: '#888', flex: 1 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: '#000' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  qtyBtn: { padding: 6, paddingHorizontal: 10 },
  qtyValue: { fontSize: 14, fontWeight: '700', color: '#333', minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE' },
  totalLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  totalPrice: { fontSize: 20, fontWeight: '800', color: '#000' },
  checkoutBtn: { backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
  checkoutText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});