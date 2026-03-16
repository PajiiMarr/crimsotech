// app/customer/create-product.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import RoleGuard from '../../guards/RoleGuard';
import CreateProductForm from '../components/listing-create-product-form';
import AxiosInstance from '../../../contexts/axios';

interface Category {
  id: string;
  name: string;
  shop: null;
  user: {
    id: string;
    username: string;
  };
}

export default function CreateProductPage() {
  const { userId } = useAuth();
  const [globalCategories, setGlobalCategories] = useState<Category[]>([]);
  const [modelClasses, setModelClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);



const fetchInitialData = async () => {
  try {
    setLoading(true);
    
    // Fix: Use the correct endpoint with '-viewset'
    const categoriesResponse = await AxiosInstance.get('/customer-products/global-categories/');
    if (categoriesResponse.data.success) {
      setGlobalCategories(categoriesResponse.data.categories || []);
    }
    
    // Get model classes (non-blocking if backend has no seeded categories yet)
    try {
      const classesResponse = await AxiosInstance.get('/classes/');
      if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
        setModelClasses(classesResponse.data.classes);
      }
    } catch {
      const fallbackClasses = (categoriesResponse.data?.categories || [])
        .map((category: Category) => category.name)
        .filter((name: string) => !!name);
      setModelClasses(fallbackClasses);
    }
    
    setError(null);
  } catch (err) {
    console.error('Failed to fetch data:', err);
    setError('Failed to load required data. Please try again.');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <RoleGuard allowedRoles={['customer']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Create New Product</Text>
              <Text style={styles.headerSubtitle}>Personal Listing</Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchInitialData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CreateProductForm 
              globalCategories={globalCategories}
              modelClasses={modelClasses}
            />
          )}
        </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});