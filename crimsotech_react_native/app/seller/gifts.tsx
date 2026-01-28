import React, { useState } from 'react';
import { 
  SafeAreaView, View, Text, StyleSheet, FlatList, Image, 
  TouchableOpacity, Dimensions, TextInput, Modal, ScrollView 
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, X, Plus, Package, DollarSign, Clock, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

const INITIAL_GIFTS = [
  { id: 'g1', title: 'Gaming Mouse Pad (XL)', originalPrice: 850, totalGifts: 10, claimed: 7, endsIn: '2 days', image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400' },
  { id: 'g2', title: 'USB-C Hub 4-in-1', originalPrice: 1200, totalGifts: 5, claimed: 5, endsIn: 'Ended', image: 'https://images.unsplash.com/photo-1625842268584-8f3bf9ffad32?w=400' },
];

export default function SellerGiftPage() {
  const [gifts, setGifts] = useState(INITIAL_GIFTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [newGift, setNewGift] = useState({ title: '', price: '', qty: '', duration: '' });

  const handleAddGift = () => {
    if (!newGift.title) return;
    const item = {
      id: Date.now().toString(),
      title: newGift.title,
      originalPrice: parseInt(newGift.price) || 0,
      totalGifts: parseInt(newGift.qty) || 1,
      claimed: 0,
      endsIn: newGift.duration + ' days',
      image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400'
    };
    setGifts([item, ...gifts]);
    setModalVisible(false);
    setNewGift({ title: '', price: '', qty: '', duration: '' });
  };

  const renderGiftItem = ({ item }: { item: typeof INITIAL_GIFTS[0] }) => {
    const isSoldOut = item.claimed >= item.totalGifts;
    const progress = (item.claimed / item.totalGifts) * 100;

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={[styles.image, isSoldOut && styles.imageDimmed]} />
          <View style={styles.freeBadge}><Text style={styles.freeText}>FREE GIFT</Text></View>
          {item.endsIn === 'Ended' && (
             <View style={styles.endedOverlay}><Text style={styles.endedText}>CAMPAIGN ENDED</Text></View>
          )}
        </View>
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.originalPrice}>VALUE: ₱{item.originalPrice.toLocaleString()}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
                <Text style={styles.progressText}>{item.claimed}/{item.totalGifts}</Text>
                <Text style={styles.progressSubText}>CLAIMED</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Gift Center', 
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' }
      }} />

      <View style={styles.topSection}>
        <View style={styles.searchBar}>
          <Search color="#94A3B8" size={18} />
          <TextInput
            placeholder="Search campaigns..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addBtnText}>New Gift</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={gifts.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))}
        renderItem={renderGiftItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Launch Giveaway</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#0F172A" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Gift Product Name</Text>
              <View style={styles.inputRow}>
                <Package color="#0F172A" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="e.g. Wireless Mouse" value={newGift.title} onChangeText={(t) => setNewGift({...newGift, title: t})} />
              </View>

              <Text style={styles.label}>Market Value (₱)</Text>
              <View style={styles.inputRow}>
                <DollarSign color="#0F172A" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={newGift.price} onChangeText={(t) => setNewGift({...newGift, price: t})} />
              </View>

              <View style={styles.gridInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Inventory Qty</Text>
                  <View style={styles.inputRow}>
                    <TextInput style={styles.input} placeholder="10" keyboardType="numeric" value={newGift.qty} onChangeText={(t) => setNewGift({...newGift, qty: t})} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (Days)</Text>
                  <View style={styles.inputRow}>
                    <Clock color="#0F172A" size={18} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="7" keyboardType="numeric" value={newGift.duration} onChangeText={(t) => setNewGift({...newGift, duration: t})} />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddGift}>
                <CheckCircle2 color="#fff" size={20} style={{marginRight: 8}} />
                <Text style={styles.submitBtnText}>Start Giveaway</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topSection: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  addBtn: { backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, height: 48 },
  addBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 13 },

  listContent: { padding: 16 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  imageContainer: { height: 130, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageDimmed: { opacity: 0.4 },
  freeBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  freeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  endedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  endedText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  details: { padding: 16 },
  title: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  originalPrice: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  progressContainer: { marginTop: 14 },
  progressBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#0F172A' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressText: { fontSize: 11, color: '#0F172A', fontWeight: '800' },
  progressSubText: { fontSize: 9, color: '#94A3B8', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 18, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, fontSize: 14, color: '#0F172A', fontWeight: '600' },
  gridInputs: { flexDirection: 'row', gap: 12 },
  submitBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});