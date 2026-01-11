import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Pressable, StyleSheet } from 'react-native';

type FilterState = {
  filterVisible: boolean;
  openFilter: () => void;
  closeFilter: () => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  type: 'all' | 'gift';
  setType: (v: 'all' | 'gift') => void;
  resetFilters: () => void;
};

const FilterModalContext = createContext<FilterState | undefined>(undefined);

export function useFilterModal() {
  const ctx = useContext(FilterModalContext);
  if (!ctx) throw new Error('useFilterModal must be used within a FilterModalProvider');
  return ctx;
}

// Safe hook that returns undefined outside provider
export function useFilterModalSafe() {
  return useContext(FilterModalContext);
}

export function FilterModalProvider({ children }: { children: ReactNode }) {
  const [filterVisible, setFilterVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [type, setType] = useState<'all' | 'gift'>('all');

  const openFilter = () => { console.log('[FilterModal] openFilter called'); setFilterVisible(true); };
  const closeFilter = () => { console.log('[FilterModal] closeFilter called'); setFilterVisible(false); };
  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setType('all');
  };

  return (
    <FilterModalContext.Provider
      value={{ filterVisible, openFilter, closeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice, condition, setCondition, type, setType, resetFilters }}
    >
      {children}

      <Modal visible={filterVisible} animationType="fade" transparent onRequestClose={closeFilter}>
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modalOverlay} onPress={closeFilter} />
          <View style={styles.modalContent}>
            <Text style={styles.filtersTitle}>Filters</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>DEBUG: modal is open</Text>
            <ScrollView horizontal={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Price Min</Text>
                <TextInput style={styles.filterInput} keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} placeholder="0" />
                <Text style={styles.filterLabel}>Price Max</Text>
                <TextInput style={styles.filterInput} keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} placeholder="1000" />
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Condition</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity style={[styles.segmentBtn, condition === '' && styles.segmentBtnActive]} onPress={() => setCondition('')}>
                    <Text style={[styles.segmentText, condition === '' && styles.segmentTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentBtn, condition === 'new' && styles.segmentBtnActive]} onPress={() => setCondition(condition === 'new' ? '' : 'new')}>
                    <Text style={[styles.segmentText, condition === 'new' && styles.segmentTextActive]}>New</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentBtn, condition === 'used' && styles.segmentBtnActive]} onPress={() => setCondition(condition === 'used' ? '' : 'used')}>
                    <Text style={[styles.segmentText, condition === 'used' && styles.segmentTextActive]}>Used</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Type</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity style={[styles.segmentBtn, type === 'all' && styles.segmentBtnActive]} onPress={() => setType('all')}>
                    <Text style={[styles.segmentText, type === 'all' && styles.segmentTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentBtn, type === 'gift' && styles.segmentBtnActive]} onPress={() => setType(type === 'gift' ? 'all' : 'gift')}>
                    <Text style={[styles.segmentText, type === 'gift' && styles.segmentTextActive]}>Gift</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterActionsRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={closeFilter}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </FilterModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 18, borderRadius: 12, width: '92%', maxWidth: 520, maxHeight: '80%', elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

  filtersTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  filterRow: { marginBottom: 12 },
  filterLabel: { fontSize: 13, color: '#374151', marginBottom: 6 },
  filterInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, width: 110, marginRight: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F3F4F6' },
  segmentBtnActive: { backgroundColor: '#4F46E5' },
  segmentText: { color: '#374151' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  filterActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  resetBtn: { padding: 10 },
  resetText: { color: '#6B7280' },
  applyBtn: { backgroundColor: '#4F46E5', padding: 10, borderRadius: 8 },
  applyText: { color: '#fff', fontWeight: '700' },
});