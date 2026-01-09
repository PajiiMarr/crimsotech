import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Dimensions
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
      <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.iconText, { color }]}>{icon}</Text>
      </View>
    </View>
  );
};

export default function RiderHomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  const quickStats = [
    { title: 'Active Orders', value: '5', subtitle: 'Pending deliveries', icon: '📦', color: '#3b82f6' },
    { title: 'Today\'s Earnings', value: '₱1,240', subtitle: 'This week', icon: '💰', color: '#10b981' },
    { title: 'Completed', value: '12', subtitle: 'Deliveries today', icon: '✅', color: '#8b5cf6' },
    { title: 'Avg. Rating', value: '4.8', subtitle: 'Customer reviews', icon: '⭐', color: '#f59e0b' },
  ];

  const mainTiles = [
    { title: 'My Deliveries', route: '/rider/deliveries', icon: '🚚', color: '#3b82f6' },
    { title: 'Earnings', route: '/rider/earnings', icon: '💸', color: '#10b981' },
    { title: 'My Stats', route: '/rider/stats', icon: '📊', color: '#8b5cf6' },
    { title: 'Schedule', route: '/rider/schedule', icon: '📅', color: '#ec4899' },
    { title: 'Messages', route: '/rider/messages', icon: '💬', color: '#f59e0b' },
    { title: 'Settings', route: '/rider/settings', icon: '⚙️', color: '#6b7280' },
  ];

  // Placeholder for accepting new delivery
  const handleAcceptNewDelivery = () => {
    // Logic to fetch and accept new delivery
    alert('Looking for new delivery opportunities...');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.charAt(0) || 'R'}
            </Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>{greeting},</Text>
            <Text style={styles.userName}>
              {user?.first_name || user?.username || 'Rider'}!
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityRole="button" accessibilityLabel="Log out">
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats Cards */}
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Today's Overview</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={quickStats}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
        renderItem={({ item, index }) => (
          <View key={index} style={styles.statItem}>
            <StatCard 
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              icon={item.icon}
              color={item.color}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />

      {/* Active Delivery Banner */}
      <View style={styles.activeBanner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerIcon}>🚚</Text>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Active Delivery</Text>
            <Text style={styles.bannerSubtitle}>Order #ORD-7845 to Maria Santos</Text>
          </View>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.acceptDeliveryBtn}
          onPress={handleAcceptNewDelivery}
        >
          <Text style={styles.acceptDeliveryText}>Accept New Delivery</Text>
          <Text style={styles.acceptDeliveryIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <View style={styles.linksHeader}>
          <Text style={styles.linksTitle}>Quick Links</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={mainTiles}
          keyExtractor={(item) => item.route}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity 
                style={[styles.linkCard, { borderLeftColor: item.color }]} 
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.linkIconCircle, { backgroundColor: `${item.color}20` }]}>
                  <Text style={[styles.linkIcon, { color: item.color }]}>{item.icon}</Text>
                </View>
                <Text style={styles.linkTitle}>{item.title}</Text>
              </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  statsScrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statItem: {
    marginRight: 12,
  },
  statCard: {
    width: width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: 'relative',
  },
  statTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  iconCircle: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  activeBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  acceptDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  acceptDeliveryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptDeliveryIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickLinks: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
  },
  linksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  linksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  linkCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  linkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkIcon: {
    fontSize: 20,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});