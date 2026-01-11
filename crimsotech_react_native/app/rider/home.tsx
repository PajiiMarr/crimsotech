import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../guards/RoleGuard';
import { MaterialIcons } from '@expo/vector-icons';

export default function RiderHome() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Navigation will be handled by the auth context/logout function
  };

  return (
    <RoleGuard allowedRoles={['rider']}>
      <View style={styles.container}>
        {/* Header with Logout Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Rider Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#ff6d0b" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Welcome to your rider home screen!</Text>
          
          {/* You can add more rider-specific features here */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="delivery-dining" size={40} color="#ff6d0b" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Deliveries Today</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="attach-money" size={40} color="#4CAF50" />
              <Text style={styles.statNumber}>₱0.00</Text>
              <Text style={styles.statLabel}>Earnings Today</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="location-on" size={24} color="#fff" />
              <Text style={styles.actionText}>Go Online</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
              <MaterialIcons name="history" size={24} color="#fff" />
              <Text style={styles.actionText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0e6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff6d0b',
  },
  logoutText: {
    marginLeft: 6,
    color: '#ff6d0b',
    fontWeight: '500',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6d0b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});