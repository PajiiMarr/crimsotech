import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Package, ChevronRight, CircleDollarSign, Percent } from 'lucide-react-native';

export default function CreateProductVoucher() {
  const router = useRouter();
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');

  const handleCreate = () => {
    // Add creation logic here
    console.log("Voucher Created");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'New Voucher', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
        headerTintColor: '#0F172A'
      }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Voucher Configuration</Text>
          
          <Text style={styles.label}>Target Product</Text>
          <TouchableOpacity style={styles.productPicker}>
            <Package color="#0F172A" size={20} />
            <Text style={styles.pickerText}>Select from Inventory</Text>
            <ChevronRight color="#94A3B8" size={18} />
          </TouchableOpacity>

          <Text style={styles.label}>Voucher Code</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. M2SAVE1500" 
            autoCapitalize="characters" 
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.row}>
            <View style={{ flex: 1.2, marginRight: 10 }}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity 
                  style={[styles.typeBtn, discountType === 'FIXED' && styles.activeType]}
                  onPress={() => setDiscountType('FIXED')}
                >
                  <CircleDollarSign size={14} color={discountType === 'FIXED' ? "#fff" : "#64748B"} />
                  <Text style={[styles.typeText, discountType === 'FIXED' ? styles.activeTypeText : styles.inactiveTypeText]}>Fixed</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, discountType === 'PERCENTAGE' && styles.activeType]}
                  onPress={() => setDiscountType('PERCENTAGE')}
                >
                  <Percent size={14} color={discountType === 'PERCENTAGE' ? "#fff" : "#64748B"} />
                  <Text style={[styles.typeText, discountType === 'PERCENTAGE' ? styles.activeTypeText : styles.inactiveTypeText]}>%</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Amount</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                keyboardType="numeric" 
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <Text style={styles.label}>Total Units Available</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 50" 
            keyboardType="numeric" 
            placeholderTextColor="#94A3B8"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
          <Text style={styles.submitBtnText}>Create Discount</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 24 },
  
  formCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 20 },

  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 },
  productPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerText: { flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 14, fontWeight: '600' },
  
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  
  row: { flexDirection: 'row' },
  typeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeType: { backgroundColor: '#0F172A' },
  
  typeText: { marginLeft: 6, fontSize: 12 },
  activeTypeText: { fontWeight: '700', color: '#fff' },
  inactiveTypeText: { fontWeight: '600', color: '#64748B' },

  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});