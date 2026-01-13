import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { 
  ClipboardList, Package, Truck, Undo2, MessageSquare, 
  Tag, Gift, ChevronRight, Calendar, Star, RefreshCw, History 
} from 'lucide-react-native';
import { useRouter } from 'expo-router'; // Import the router hook
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';

export default function PersonalListingPage() {
  const { userRole } = useAuth();
  const router = useRouter(); // Initialize the router

  // Navigate to OrderPage and pass the tab name
  const goToOrders = (tabName) => {
    router.push({
      pathname: '/customer/orders', // Adjust path to match your folder structure
      params: { tab: tabName }      // Pass the tab name as a parameter
    });
  };

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.mainTitle}>Personal Listing</Text>

          {/* My Orders Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>My Orders</Text>
              <TouchableOpacity 
                style={styles.viewAllBtn}
                onPress={() => goToOrders('To Process')}
              >
                <Text style={styles.viewAllText}>View all</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.iconRow}>
              <IconButton 
                Icon={ClipboardList} 
                label="To Process" 
                onPress={() => goToOrders('To Process')} 
              />
              <IconButton 
                Icon={Package} 
                label="To Ship" 
                onPress={() => goToOrders('To Ship')} 
              />
              <IconButton 
                Icon={Truck} 
                label="Shipped" 
                onPress={() => goToOrders('Shipped')} 
              />
              <IconButton 
                Icon={Undo2} 
                label="Returns" 
                onPress={() => goToOrders('Returns')} 
              />
              <IconButton 
                Icon={MessageSquare} 
                label="Review" 
                badge={2} 
                onPress={() => goToOrders('Review')} 
              />
            </View>
          </View>

          {/* My Products Card */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { marginBottom: 16 }]}>My Products</Text>
            <View style={styles.productRow}>
              <TouchableOpacity style={styles.productBox}>
                <View style={styles.productIconCircle}><Tag size={20} color="#374151" /></View>
                <Text style={styles.productText}>Selling Products</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.productBox}>
                <View style={styles.productIconCircle}><Gift size={20} color="#374151" /></View>
                <Text style={styles.productText}>Gifting Products</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Subscription Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Subscription</Text>
              <TouchableOpacity style={styles.viewAllBtn}>
                <Text style={styles.viewAllText}>Details</Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.iconRow}>
              <IconButton Icon={Star} label="Subscription Plan" />
              <IconButton Icon={Calendar} label="Active Plan" />
              <IconButton Icon={RefreshCw} label="To Renew" />
              <IconButton Icon={History} label="History" />
            </View>
          </View>

        </ScrollView>
      </CustomerLayout>
    </SafeAreaView>
  );
}

type IconButtonProps = {
  Icon: React.ComponentType<any>;
  label: string;
  badge?: number | null;
  onPress?: () => void;
};

const IconButton: React.FC<IconButtonProps> = ({ Icon, label, badge = null, onPress }) => (
  <TouchableOpacity 
    style={styles.iconItem} 
    onPress={onPress} 
    activeOpacity={0.6}
  >
    <View style={styles.iconWrapper}>
      <Icon size={26} color="#111827" strokeWidth={1.5} />
      {badge !== null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.iconLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 16, color: '#6B7280' },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20, marginTop: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 13, color: '#9CA3AF', marginRight: 2 },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconItem: { alignItems: 'center', width: '20%' },
  iconWrapper: { position: 'relative' },
  iconLabel: { fontSize: 10, color: '#4B5563', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  badge: { position: 'absolute', right: -10, top: -6, backgroundColor: '#FFFFFF', borderColor: '#111827', borderWidth: 1, borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
  productRow: { flexDirection: 'row', justifyContent: 'space-between' },
  productBox: { backgroundColor: '#F3F4F6', width: '48.5%', paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  productText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});