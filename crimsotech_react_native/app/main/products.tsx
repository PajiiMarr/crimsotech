import { useAuth } from '@/contexts/AuthContext';
import { getSellerProducts } from '@/utils/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const MAX_LISTINGS = 5;

type Listing = {
  id: string;
  name: string;
  price: number;
  status: string;
  createdAt: string;
};

export default function ProductsScreen() {
  const { user } = useAuth();
  const userId = useMemo(() => {
    if (!user) return null;
    return (user as any).user_id || (user as any).id || null;
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);

  const loadListings = async () => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const resp = await getSellerProducts(userId);
      const results = Array.isArray(resp?.results)
        ? resp.results
        : Array.isArray(resp?.products)
        ? resp.products
        : Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];

      const safeResults = Array.isArray(results) ? results : [];

      const mapped: Listing[] = safeResults.map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        name: item.name || 'Untitled',
        price: Number(item.price) || 0,
        status: (item.status || 'draft').toString().toLowerCase(),
        createdAt: item.created_at || item.updated_at || new Date().toISOString(),
      }));
      setListings(mapped);
    } catch (error) {
      console.error('Failed to load seller listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [userId]);

  const renderListing = (item: Listing) => (
    <View key={item.id} style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle}>{item.name}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) }]}> 
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.listingPrice}>₱{item.price.toFixed(2)}</Text>
      <Text style={styles.listingDate}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>Sell your items</Text>
          <Text style={styles.heroSubtitle}>List up to {MAX_LISTINGS} items. They stay hidden from the main marketplace.</Text>
        </View>
        <MaterialIcons name="sell" size={32} color="#fff" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New listing</Text>
          <View style={styles.limitPill}>
            <Ionicons name="information-circle-outline" size={16} color="#0F172A" />
            <Text style={styles.limitText}>{listings.length}/{MAX_LISTINGS}</Text>
          </View>
        </View>
        <Text style={styles.helperText}>Start a new item and submit for review. Items stay hidden from the main marketplace.</Text>
        <TouchableOpacity
          style={[styles.submitButton, listings.length >= MAX_LISTINGS ? styles.submitButtonDisabled : null]}
          onPress={() => {
            if (!userId) {
              router.push('/(auth)/login');
              return;
            }
            if (listings.length >= MAX_LISTINGS) {
              Alert.alert(
                'Limit reached', 
                `You can list up to ${MAX_LISTINGS} items as a personal seller.\n\nWant to list unlimited items? Create a shop!`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Create Shop', onPress: () => router.push('/setup/create-shop') }
                ]
              );
              return;
            }
            router.push('/main/products/add');
          }}
          disabled={listings.length >= MAX_LISTINGS}
        >
          <Text style={styles.submitText}>Add product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your listings</Text>
          <TouchableOpacity onPress={loadListings} style={styles.refreshButton}>
            <Ionicons name="refresh" size={16} color="#0F172A" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#ff6d0b" />
            <Text style={styles.loadingText}>Loading your items...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inventory" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtitle}>Submit up to {MAX_LISTINGS} items for review.</Text>
          </View>
        ) : (
          listings.map(renderListing)
        )}
      </View>
    </ScrollView>
  );
}

const statusColor = (status: string) => {
  const lower = status.toLowerCase();
  if (lower === 'active' || lower === 'approved') return '#E8F5E9';
  if (lower === 'draft' || lower === 'inactive') return '#F1F5F9';
  if (lower === 'pending' || lower === 'review') return '#FFF7ED';
  return '#F8F9FA';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 32 : 40,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#E2E8F0',
    marginTop: 6,
    lineHeight: 18,
    fontSize: isSmallDevice ? 13 : 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: isSmallDevice ? 14 : 16,
    marginBottom: isSmallDevice ? 12 : 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  limitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  limitText: {
    marginLeft: 6,
    color: '#0F172A',
    fontWeight: '700',
  },
  helperText: {
    color: '#475569',
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#ff6d0b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 13,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    color: '#64748B',
    textAlign: 'center',
  },
  listingCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  listingTitle: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#0F172A',
  },
  listingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff6d0b',
  },
  listingDate: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },
});