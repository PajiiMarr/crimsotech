import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';

export default function CartPage() {
  const { userId, loading: authLoading, userRole } = useAuth();

  useEffect(() => {
    if (!authLoading && !userId) {
      // redirect to login if you want cart protected
    //   router.replace('/(auth)/login');
    }
  }, [authLoading, userId]);

  if (authLoading) return <ActivityIndicator size="large" color="#6366F1" />;

  if (!userId) {
    // alternative: show button to login instead of redirect
    return (
      <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text>Please log in to view your cart</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }


  if (userRole && userRole !== 'customer') {
    return (
        
      <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text>Not authorized to view cart</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex:1}}>
    <CustomerLayout disableScroll>
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text>Cart Page</Text>
      </View>
    </CustomerLayout>
    </SafeAreaView>
  );
}