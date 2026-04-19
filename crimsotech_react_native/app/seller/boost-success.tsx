// app/seller/boost-success.tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function BoostSuccessPage() {
  const params = useLocalSearchParams();
  const { status, count, error, plan_id, product_ids, user_id } = params;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getTitle = () => {
    if (error) return 'Payment Error';
    if (status === 'failed') return 'Payment Failed';
    if (status === 'cancelled') return 'Payment Cancelled';
    return 'Payment Successful!';
  };

  const getMessage = () => {
    if (error) return `Error: ${error}`;
    if (status === 'failed') return 'Your payment could not be processed. Please try again.';
    if (status === 'cancelled') return 'You cancelled the payment process.';
    return `Your boost payment has been processed successfully. ${count || 'Your'} product${count !== '1' ? 's' : ''} ${count !== '1' ? 'are' : 'is'} now boosted!`;
  };

  const getIcon = () => {
    if (error || status === 'failed') return <Ionicons name="alert-circle" size={64} color="#DC2626" />;
    if (status === 'cancelled') return <Ionicons name="close-circle" size={64} color="#F59E0B" />;
    return <Ionicons name="checkmark-circle" size={64} color="#10B981" />;
  };

  const getIconColor = () => {
    if (error || status === 'failed') return '#DC2626';
    if (status === 'cancelled') return '#F59E0B';
    return '#10B981';
  };

  const handleGoToBoosts = () => {
    router.dismissAll();
    router.push('/seller/boosts' as any);
  };

  const handleTryAgain = () => {
    router.dismissAll();
    router.push('/seller/boosts' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuccess = !error && status !== 'failed' && status !== 'cancelled';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
          {getIcon()}
        </View>
        
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.message}>{getMessage()}</Text>

        {!isSuccess ? (
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.viewBoostsButton} onPress={handleGoToBoosts}>
              <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
              <Text style={styles.viewBoostsButtonText}>View My Boosts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.continueButton} onPress={handleGoToBoosts}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  tryAgainButton: {
    backgroundColor: '#EE4D2D',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewBoostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EE4D2D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  viewBoostsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});