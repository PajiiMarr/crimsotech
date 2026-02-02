import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Dimensions 
} from 'react-native';
import { Stack, useRouter } from 'expo-router'; // 1. Import useRouter
import { Plus, Users, Tag, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

const INITIAL_VOUCHERS = [
  { id: '1', code: 'NEWTECH2026', type: 'FIXED', value: 500, minSpend: 5000, usageLimit: 100, used: 45, expiry: 'Feb 28, 2026', status: 'ACTIVE' },
  { id: '2', code: 'REUSED10', type: 'PERCENTAGE', value: 10, minSpend: 1000, usageLimit: 50, used: 50, expiry: 'Expired', status: 'EXPIRED' },
  { id: '3', code: 'LAPTOPOFF', type: 'FIXED', value: 1500, minSpend: 25000, usageLimit: 20, used: 2, expiry: 'Jun 01, 2026', status: 'ACTIVE' },
];

export default function ShopVoucherPage() {
  const router = useRouter(); // 2. Initialize router
  const [vouchers] = useState(INITIAL_VOUCHERS);

  const renderVoucher = ({ item }: { item: typeof INITIAL_VOUCHERS[0] }) => {
    const isExpired = item.status === 'EXPIRED' || item.used >= item.usageLimit;
    const usagePercent = (item.used / item.usageLimit) * 100;

    return (
      <TouchableOpacity 
        style={[styles.voucherCard, isExpired && styles.expiredCard]} 
        activeOpacity={0.9}
      >
        <View style={[styles.cardTop, isExpired ? styles.expiredBg : styles.activeBg]}>
          <Text style={[styles.discountValue, isExpired && styles.expiredTextMain]}>
            {item.type === 'FIXED' ? `₱${item.value}` : `${item.value}%`}
          </Text>
          <Text style={[styles.discountLabel, isExpired && styles.expiredTextMain]}>DISCOUNT</Text>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.leftCutout} />
          <View style={styles.dashedLine} />
          <View style={styles.rightCutout} />
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.codeRow}>
            <Tag size={12} color={isExpired ? "#94A3B8" : "#0F172A"} />
            <Text style={[styles.codeText, isExpired && styles.expiredTextStrikethrough]}>
              {item.code}
            </Text>
          </View>
          
          <Text style={styles.minSpend}>Min. Spend ₱{item.minSpend.toLocaleString()}</Text>
          
          <View style={styles.progressSection}>
            <View style={styles.usageBarBg}>
              <View style={[
                styles.usageBarFill, 
                { width: `${usagePercent}%` },
                isExpired ? { backgroundColor: '#CBD5E1' } : { backgroundColor: '#0F172A' }
              ]} />
            </View>
            <View style={styles.usageRow}>
              <Users size={10} color="#94A3B8" />
              <Text style={styles.usageText}>{item.used}/{item.usageLimit}</Text>
              <Text style={styles.expiryText}>• {item.expiry}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Shop Vouchers', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' }
      }} />

      <View style={styles.topActions}>
        <View style={styles.infoBox}>
          <Info size={16} color="#64748B" />
          <Text style={styles.infoText}>Active vouchers are shown at checkout.</Text>
        </View>
        
        {/* 3. Navigation Action */}
        <TouchableOpacity 
          style={styles.createBtn} 
          onPress={() => router.push('/seller/create-shop-vouchers')}
        >
          <Plus color="#fff" size={18} />
          <Text style={styles.createBtnText}>Create New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vouchers}
        renderItem={renderVoucher}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topActions: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 10, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#64748B', marginLeft: 8, fontWeight: '500' },
  createBtn: { backgroundColor: '#0F172A', height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  listContent: { padding: 16 },
  columnWrapper: { justifyContent: 'space-between' },

  voucherCard: { 
    width: CARD_WIDTH, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  expiredCard: { opacity: 0.6 },
  cardTop: { paddingVertical: 18, alignItems: 'center' },
  activeBg: { backgroundColor: '#F8FAFC' },
  expiredBg: { backgroundColor: '#F1F5F9' },
  discountValue: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  discountLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
  expiredTextMain: { color: '#94A3B8' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', height: 20, backgroundColor: '#fff' },
  leftCutout: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FAFAFA', marginLeft: -6 },
  rightCutout: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FAFAFA', marginRight: -6 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },

  cardBottom: { padding: 12, paddingBottom: 16 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  codeText: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginLeft: 6 },
  expiredTextStrikethrough: { color: '#94A3B8', textDecorationLine: 'line-through' },
  minSpend: { fontSize: 11, color: '#64748B', fontWeight: '500', marginBottom: 12 },
  
  progressSection: { gap: 6 },
  usageBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  usageBarFill: { height: '100%', backgroundColor: '#0F172A' },
  usageRow: { flexDirection: 'row', alignItems: 'center' },
  usageText: { fontSize: 10, color: '#64748B', marginLeft: 4, fontWeight: '700' },
  expiryText: { fontSize: 10, color: '#94A3B8', marginLeft: 4 },
});