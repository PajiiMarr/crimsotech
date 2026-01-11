// app/seller/components/sellerHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Props = {
  title?: string;
  subtitle?: string;
  onSettings?: () => void;
  onExit?: () => void;
  onNotifications?: () => void;
  notificationsCount?: number;
};

export default function SellerHeader({ title = 'My Shop', subtitle, onSettings, onExit, onNotifications, notificationsCount = 0 }: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.leftContainer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => (onNotifications ? onNotifications() : router.push('/seller/notifications' as any))}
          >
            <Ionicons name="notifications-outline" size={22} color="#4F46E5" />
            {notificationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationsCount > 99 ? '99+' : notificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => (onSettings ? onSettings() : router.push('/seller/home' as any))}
          >
            <Ionicons name="settings-outline" size={22} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 54 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
