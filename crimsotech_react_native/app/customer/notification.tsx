import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';

export default function NotificationPage() {
  const { userId, loading: authLoading, userRole } = useAuth();

  useEffect(() => {
    // optional forced redirect:
    // if (!authLoading && !userId) router.replace('/(auth)/login');
  }, [authLoading, userId]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Please log in to view notifications</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view notifications</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <CustomerLayout disableScroll>
      <View style={styles.inner}>
        <Text style={styles.title}>Notification Page</Text>
      </View>
    </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#111827' },
  message: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
  link: { fontSize: 16, color: '#6366F1', fontWeight: '600' },
});
