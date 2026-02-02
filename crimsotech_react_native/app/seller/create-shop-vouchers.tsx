import React from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, SafeAreaView 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Calendar } from 'lucide-react-native';

export default function CreateShopVouchers() {
  const router = useRouter();

  const handlePublish = () => {
    // Add API logic here
    console.log("Voucher Created");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Configuration */}
      <Stack.Screen options={{ 
        title: 'New Voucher', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
        headerTintColor: '#0F172A', // Makes back arrow black
      }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Voucher Details</Text>
            
            <Text style={styles.label}>Voucher Code</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. TECHPOWER500" 
              autoCapitalize="characters" 
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.inputGrid}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Value</Text>
                <TextInput style={styles.input} placeholder="500" keyboardType="numeric" placeholderTextColor="#94A3B8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Min. Spend</Text>
                <TextInput style={styles.input} placeholder="1000" keyboardType="numeric" placeholderTextColor="#94A3B8" />
              </View>
            </View>

            <Text style={styles.label}>Usage Limit</Text>
            <TextInput style={styles.input} placeholder="Number of claims allowed" keyboardType="numeric" placeholderTextColor="#94A3B8" />

            <Text style={styles.label}>Expiration</Text>
            <TouchableOpacity style={styles.dateSelector}>
              <Calendar size={18} color="#0F172A" />
              <Text style={styles.datePlaceholder}>Select Expiry Date</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 2. Bottom Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
          <Text style={styles.publishBtnText}>Publish Voucher</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 24 },
  
  formSection: { backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 20 },

  label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 14, color: '#0F172A', marginBottom: 20, fontWeight: '600' },
  inputGrid: { flexDirection: 'row', gap: 12 },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16 },
  datePlaceholder: { marginLeft: 10, color: '#0F172A', fontWeight: '600' },

  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  publishBtn: { backgroundColor: '#0F172A', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  publishBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});