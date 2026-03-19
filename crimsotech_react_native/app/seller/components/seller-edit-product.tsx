// app/seller/components/seller-edit-product.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AxiosInstance from '../../../contexts/axios';
import { useAuth } from '../../../contexts/AuthContext';
import EditProductForm from './seller-edit-product-form';

interface Category {
  id: string;
  name: string;
}
interface MediaItem {
  id: string;
  file_data: string | null;
  file_type: string;
}
interface Variant {
  id: string;
  title: string;
  sku_code?: string | null;
  price?: number | null;
  compare_price?: number | null;
  quantity: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit?: string | null;
  weight?: number | null;
  weight_unit: string;
  critical_trigger?: number | null;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price?: number | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  minimum_additional_payment: number;
  maximum_additional_payment: number;
  swap_description?: string | null;
  image?: string | null;
  critical_stock?: number | null;
  created_at: string;
  updated_at: string;
}
interface Product {
  id: string;
  name: string;
  description: string;
  condition: number;
  upload_status: string;
  status: string;
  is_refundable: boolean;
  refund_days: number;
  category_admin: Category | null;
  category: Category | null;
  total_stock: number;
  starting_price: string | null;
  variants?: Variant[];
  media?: MediaItem[];
}

export default function SellerEditProductScreen() {
  const router = useRouter();
  const { userId } = useAuth();

  // Product is passed as a JSON-encoded route param from the product list
  const { productId, shopId, product: productParam } = useLocalSearchParams<{ productId: string; shopId: string; product: string }>();

  const [product, setProduct] = useState<Product | null>(() => {
    if (productParam) {
      try { return JSON.parse(decodeURIComponent(productParam)); } catch { return null; }
    }
    return null;
  });
  const [loading, setLoading] = useState(!productParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If product wasn't passed via params, fall back to fetching it
    if (!productParam && productId) fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AxiosInstance.get(`/seller-products/${productId}/`);
      const data = res.data?.product ?? res.data;
      setProduct(data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to load product.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (updated: Partial<Product>) => {
    // Go back to the product list after a successful save
    router.replace(`/seller/product-list?shopId=${shopId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Product</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Product</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load product</Text>
          <Text style={styles.errorText}>{error ?? 'Product not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProduct}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Edit Product</Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>{product.name}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Form — takes the remaining space; footer is inside the form */}
      <EditProductForm
        product={product}
        userId={userId ?? ''}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  errorText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});