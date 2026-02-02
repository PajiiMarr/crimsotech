import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, TextInput, Image 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Tag, Plus, Search, ChevronRight } from 'lucide-react-native';

const INITIAL_PRODUCT_VOUCHERS = [
  { 
    id: 'pv1', 
    productName: 'MacBook Air M2', 
    productImage: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200',
    code: 'MACM2SAVE', 
    value: 1500, 
    type: 'FIXED', 
    claimed: 3, 
    total: 5,
    status: 'ACTIVE'
  },
  { 
    id: 'pv2', 
    productName: 'Keychron K2 Keyboard', 
    productImage: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200',
    code: 'CLICKY10', 
    value: 10, 
    type: 'PERCENTAGE', 
    claimed: 12, 
    total: 20,
    status: 'ACTIVE'
  },
  { 
    id: 'pv3', 
    productName: 'Sony WH-1000XM4', 
    productImage: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=200',
    code: 'SONYOFF', 
    value: 500, 
    type: 'FIXED', 
    claimed: 10, 
    total: 10,
    status: 'FULL'
  },
];

export default function ProductVoucherPage() {
  const router = useRouter();
  const [vouchers] = useState(INITIAL_PRODUCT_VOUCHERS);

  const renderVoucher = ({ item }: { item: typeof INITIAL_PRODUCT_VOUCHERS[0] }) => {
    const isFull = item.claimed >= item.total;

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardMain}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.productImage }} style={[styles.productThumb, isFull && styles.dimmed]} />
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {item.type === 'FIXED' ? `₱${item.value}` : `${item.value}%`}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <View style={styles.codeRow}>
              <Tag size={12} color="#0F172A" />
              <Text style={styles.codeText}>{item.code}</Text>
            </View>

            <View style={styles.usageContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.usageLabel}>Redemption Rate</Text>
                <Text style={styles.usageValue}>{item.claimed}/{item.total}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${(item.claimed / item.total) * 100}%` }]} />
              </View>
            </View>
          </View>

          <ChevronRight color="#CBD5E1" size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Product Vouchers', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' }
      }} />

      <View style={styles.topSection}>
        <View style={styles.searchContainer}>
          <Search color="#94A3B8" size={18} />
          <TextInput 
            placeholder="Search by product or code..." 
            style={styles.searchInput} 
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => router.push('/seller/create-product-vouchers')}
        >
          <Plus color="#fff" size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vouchers}
        renderItem={renderVoucher}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topSection: { 
    backgroundColor: '#fff', 
    padding: 16, 
    flexDirection: 'row', 
    gap: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  searchContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    height: 48 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '500', color: '#0F172A' },
  addBtn: { 
    backgroundColor: '#0F172A', 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },

  listContainer: { padding: 16 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    padding: 12 
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  
  imageWrapper: { position: 'relative' },
  productThumb: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F8FAFC' },
  dimmed: { opacity: 0.4 },
  discountBadge: { 
    position: 'absolute', 
    bottom: -6, 
    alignSelf: 'center',
    backgroundColor: '#0F172A', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  infoSection: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  codeText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 6, letterSpacing: 0.5 },

  usageContainer: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  usageValue: { fontSize: 10, fontWeight: '800', color: '#0F172A' },
  progressBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0F172A' },
});