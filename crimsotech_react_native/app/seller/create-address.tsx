import React from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, TextInput, 
  ScrollView, TouchableOpacity 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

export default function CreateAddress() {
  const router = useRouter();

  const handleSave = () => {
    // Logic to save address goes here
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'New Location', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
        headerTintColor: '#0F172A'
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Location Label</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Main Warehouse" 
            placeholderTextColor="#94A3B8" 
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Contact Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Full Name" 
                placeholderTextColor="#94A3B8" 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput 
                style={styles.input} 
                placeholder="09XX..." 
                keyboardType="phone-pad" 
                placeholderTextColor="#94A3B8" 
              />
            </View>
          </View>

          <Text style={styles.label}>Street / Building Details</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Unit/House No., Street" 
            placeholderTextColor="#94A3B8" 
          />

          <Text style={styles.label}>Barangay / City / Region</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Address Line 2" 
            placeholderTextColor="#94A3B8" 
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
          <CheckCircle2 color="#fff" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.submitBtnText}>Save Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 20 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#94A3B8', 
    marginBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 14, 
    color: '#0F172A', 
    marginBottom: 16, 
    fontWeight: '600' 
  },
  row: { flexDirection: 'row' },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  submitBtn: { 
    backgroundColor: '#0F172A', 
    height: 60, 
    borderRadius: 18, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});