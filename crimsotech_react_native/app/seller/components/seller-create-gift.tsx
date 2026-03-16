// app/seller/create-gift.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import AxiosInstance from '../../../contexts/axios';
import CreateGiftForm from '../components/seller-create-gift-form';

interface Shop {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
}

interface Category {
  id: string;
  name: string;
  shop: null;
  user: {
    id: string;
    username: string;
  };
}

export default function CreateGift() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [globalCategories, setGlobalCategories] = useState<Category[]>([]);
  const [modelClasses, setModelClasses] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch shop details
      if (shopId) {
        try {
          const shopResponse = await AxiosInstance.get('/shop-add-product/get_shop/', {
            headers: { 'X-Shop-Id': shopId }
          });
          if (shopResponse.data.success) {
            setSelectedShop(shopResponse.data.shop);
          }
        } catch (error) {
          console.error('Failed to fetch shop:', error);
        }
      }

      // Fetch global categories
      try {
        const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
        if (categoriesResponse.data.success) {
          setGlobalCategories(categoriesResponse.data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }

      // Fetch model classes
      try {
        const classesResponse = await AxiosInstance.get('/classes/');
        if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
          setModelClasses(classesResponse.data.classes);
        }
      } catch (error) {
        console.error('Failed to fetch model classes:', error);
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load required data');
    } finally {
      setLoading(false);
    }
  };

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="gift-outline" size={64} color="#E2E8F0" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to create gifts</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#9333EA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text style={styles.backButtonText}>Back to Gift List</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create New Gift</Text>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <CreateGiftForm 
            selectedShop={selectedShop}
            globalCategories={globalCategories}
            modelClasses={modelClasses}
            errors={errors}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});