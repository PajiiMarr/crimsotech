import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import CreateShopForm from './create-shop-form';
import { MaterialIcons } from '@expo/vector-icons';
import AxiosInstance from '../../../contexts/axios';

export default function CreateShopPage() {
  const { userId, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleCreateShop = async (formData: any) => {
    if (!userId) {
      Alert.alert('Error', 'Please login to create a shop');
      return;
    }

    setSubmitting(true);
    try {
      // Create FormData object
      const data = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'shop_picture' && typeof value === 'object') {
            // For image files - normalize file-like objects and cast to any so TypeScript accepts FormData.append
            const file = value as any;
            if (file instanceof Blob) {
              data.append(key, file);
            } else if (file && file.uri) {
              // React Native file object: { uri, name?, type? }
              data.append(key, { uri: file.uri, name: file.name ?? 'photo.jpg', type: file.type ?? 'image/jpeg' } as any);
            } else {
              // Fallback: append serialized object
              data.append(key, JSON.stringify(file));
            }
          } else {
            data.append(key, String(value));
          }
        }
      });

      // Add user ID
      data.append('customer', userId);

      const response = await AxiosInstance.post('/api/customer-shops/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-Id': String(userId),
        },
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Shop created successfully!',
          [
            {
              text: 'View Shop',
              onPress: () => router.push(`/customer/shops?shopId=${response.data.id}`),
            },
            {
              text: 'Go to Dashboard',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.data.error || response.data.errors || 'Failed to create shop');
      }
    } catch (error: any) {
      console.error('Shop creation error:', error);
      
      let errorMessage = 'Failed to create shop';
      
      if (error.response) {
        // Server responded with error
        const serverError = error.response.data;
        if (serverError.error) {
          errorMessage = serverError.error;
        } else if (serverError.errors) {
          // Handle validation errors
          const errorList = Object.entries(serverError.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
          errorMessage = errorList;
        } else if (serverError.details) {
          errorMessage = serverError.details;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <MaterialIcons name="store" size={64} color="#9CA3AF" />
            <Text style={styles.message}>Please login to create a shop</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <Text style={styles.title}>Create Your Shop</Text>
                <Text style={styles.subtitle}>
                  Set up your shop to start selling products
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <CreateShopForm 
                onSubmit={handleCreateShop}
                submitting={submitting}
              />
            </View>

            <View style={styles.tipsSection}>
              <MaterialIcons name="lightbulb" size={20} color="#F59E0B" />
              <View style={styles.tipsContent}>
                <Text style={styles.tipsTitle}>Tips for a successful shop</Text>
                <Text style={styles.tipsText}>
                  • Choose a clear shop name that represents your brand{'\n'}
                  • Add a high-quality profile picture{'\n'}
                  • Write a detailed description of what you sell{'\n'}
                  • Provide accurate contact information{'\n'}
                  • Complete all required fields marked with *
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tipsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});