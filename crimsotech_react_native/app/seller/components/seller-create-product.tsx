// app/seller/createproducts.tsx
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
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import AxiosInstance from '../../../contexts/axios';
import CreateProductForm from '../components/seller-create-product-form';

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

export default function CreateProduct() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  
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
      if (shopId) {
        const shopResponse = await AxiosInstance.get('/shop-add-product/get_shop/', {
          headers: { 'X-Shop-Id': shopId }
        });
        if (shopResponse.data.success) {
          setSelectedShop(shopResponse.data.shop);
        }
      }

      const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
      if (categoriesResponse.data.success) {
        setGlobalCategories(categoriesResponse.data.categories || []);
      }

      const classesResponse = await AxiosInstance.get('/classes/');
      if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
        setModelClasses(classesResponse.data.classes);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (shopId) {
      router.replace(`/seller/product-list?shopId=${shopId}`);
    } else {
      router.back();
    }
  };

  const RenderHeader = ({ subtitle }: { subtitle?: string }) => (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </TouchableOpacity>
      <View style={styles.topBarCenter}>
        <Text style={styles.topBarTitle}>Create Product</Text>
        {subtitle && (
          <Text style={styles.topBarSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={{ width: 38 }} />
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <RenderHeader subtitle={selectedShop?.name} />
        
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !shopId ? (
          <View style={styles.centerContent}>
            <Ionicons name="storefront-outline" size={64} color="#E2E8F0" />
            <Text style={styles.noShopTitle}>No Shop Selected</Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => router.push('/customer/shops')}
            >
              <Text style={styles.shopButtonText}>Choose Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              <CreateProductForm 
                selectedShop={selectedShop}
                globalCategories={globalCategories}
                modelClasses={modelClasses}
                errors={errors}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Matches the header
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Matches the form background
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    // Removed manual paddingTop - SafeAreaView handles this now
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
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
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  formContainer: {
    // Keep internal padding, but remove anything that pushes the header
    paddingBottom: 24,
  },
  noShopTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginVertical: 12,
  },
  shopButton: {
    backgroundColor: '#3B82F6',
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