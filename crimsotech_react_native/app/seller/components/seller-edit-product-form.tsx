// app/seller/components/seller-edit-product-form.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AxiosInstance from '../../../contexts/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
}
interface MediaItem {
  id: string;
  file_data: string | null;
  file_type: string;
}
interface Depreciation {
  originalPrice: number | '';
  usagePeriod: number | '';
  usageUnit: 'weeks' | 'months' | 'years';
  depreciationRate: number | '';
  calculatedPrice: number | '';
  purchaseDate?: Date | null;
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
interface EditProductFormProps {
  product: Product;
  userId: string;
  onSuccess: (updated: Partial<Product>) => void;
  onCancel: () => void;
}
interface FormState {
  name: string;
  description: string;
  condition: number;
  upload_status: string;
  is_refundable: boolean;
  refund_days: string;
  category_admin_id: string;
}
interface VariantFormState {
  id?: string;
  title: string;
  sku_code: string;
  price: string;
  quantity: string;
  length: string;
  width: string;
  height: string;
  dimension_unit: string;
  weight: string;
  weight_unit: string;
  critical_trigger: string;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: string;
  allow_swap: boolean;
  swap_type: string;
  depreciation: Depreciation;
  minimum_additional_payment: string;
  maximum_additional_payment: string;
  swap_description: string;
  critical_stock: string;
  isNew?: boolean;
  image?: string | null;
  imagePending?: any | null;
  imagePreview?: string | null;
  imageToDelete?: boolean;
}
interface MediaFormState {
  existing: MediaItem[];
  toDelete: string[];
  pending: { preview: string; file: any }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CONDITION_SCALE: Record<
  number,
  { label: string; shortLabel: string; color: string; textColor: string; borderColor: string; stars: number }
> = {
  1: { label: 'Poor - Heavy signs of use, may not function perfectly', shortLabel: 'Poor', color: '#FEE2E2', textColor: '#991B1B', borderColor: '#FECACA', stars: 1 },
  2: { label: 'Fair - Visible wear, fully functional', shortLabel: 'Fair', color: '#FFEDD5', textColor: '#9A3412', borderColor: '#FED7AA', stars: 2 },
  3: { label: 'Good - Normal wear, well-maintained', shortLabel: 'Good', color: '#FEF9C3', textColor: '#854D0E', borderColor: '#FDE047', stars: 3 },
  4: { label: 'Very Good - Minimal wear, almost like new', shortLabel: 'Very Good', color: '#DBEAFE', textColor: '#1E40AF', borderColor: '#BFDBFE', stars: 4 },
  5: { label: 'Like New - No signs of use, original packaging', shortLabel: 'Like New', color: '#DCFCE7', textColor: '#166534', borderColor: '#BBF7D0', stars: 5 },
};

const WEIGHT_UNIT_OPTIONS = ['g', 'kg', 'lb', 'oz'];
const DIMENSION_UNIT_OPTIONS = ['cm', 'm', 'in', 'ft'];
const USAGE_UNIT_OPTIONS = [
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined || price === '') return '0.00';
  return parseFloat(String(price)).toFixed(2);
}
function diffInMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
function diffInWeeks(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 7));
}
function diffInYears(from: Date, to: Date): number {
  const y = to.getFullYear() - from.getFullYear();
  return to < new Date(from.getFullYear() + y, from.getMonth(), from.getDate()) ? y - 1 : y;
}

function buildInitialForm(product: Product | null | undefined): FormState {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    condition: product?.condition ?? 3,
    upload_status: product?.upload_status ?? 'draft',
    is_refundable: product?.is_refundable ?? false,
    refund_days: (product?.refund_days ?? 0).toString(),
    category_admin_id: product?.category_admin?.id ?? '',
  };
}

function calcDepreciatedPrice(
  originalPrice: number,
  usagePeriod: number,
  usageUnit: string,
  depreciationRate: number
): number {
  if (!originalPrice || !usagePeriod || !depreciationRate) return originalPrice;
  let years = usagePeriod;
  if (usageUnit === 'months') years = usagePeriod / 12;
  else if (usageUnit === 'weeks') years = usagePeriod / 52;
  const rate = depreciationRate / 100;
  return Math.max(0, Math.round(originalPrice * Math.pow(1 - rate, years) * 100) / 100);
}

function variantToFormState(v: Variant): VariantFormState {
  let calculatedPrice: number | '' = '';
  if (v.original_price && v.usage_period && v.depreciation_rate) {
    calculatedPrice = calcDepreciatedPrice(
      Number(v.original_price),
      Number(v.usage_period),
      v.usage_unit || 'months',
      Number(v.depreciation_rate)
    );
  }
  return {
    id: v.id,
    title: v.title || '',
    sku_code: v.sku_code || '',
    price: v.price?.toString() || '',
    quantity: v.quantity?.toString() || '0',
    length: v.length?.toString() || '',
    width: v.width?.toString() || '',
    height: v.height?.toString() || '',
    dimension_unit: v.dimension_unit || 'cm',
    weight: v.weight?.toString() || '',
    weight_unit: v.weight_unit || 'g',
    critical_trigger: v.critical_trigger?.toString() || '',
    is_active: v.is_active,
    is_refundable: v.is_refundable,
    refund_days: v.refund_days?.toString() || '0',
    allow_swap: v.allow_swap,
    swap_type: v.swap_type || 'direct_swap',
    depreciation: {
      originalPrice: v.original_price ? Number(v.original_price) : '',
      usagePeriod: v.usage_period ? Number(v.usage_period) : '',
      usageUnit: (v.usage_unit as 'weeks' | 'months' | 'years') || 'months',
      depreciationRate: v.depreciation_rate ? Number(v.depreciation_rate) : 10,
      calculatedPrice,
      purchaseDate: null,
    },
    minimum_additional_payment: v.minimum_additional_payment?.toString() || '0',
    maximum_additional_payment: v.maximum_additional_payment?.toString() || '0',
    swap_description: v.swap_description || '',
    critical_stock: v.critical_stock?.toString() || '',
    isNew: false,
    image: v.image ?? null,
    imagePending: null,
    imagePreview: null,
    imageToDelete: false,
  };
}

function createEmptyVariant(): VariantFormState {
  return {
    title: '',
    sku_code: '',
    price: '',
    quantity: '0',
    length: '',
    width: '',
    height: '',
    dimension_unit: 'cm',
    weight: '',
    weight_unit: 'g',
    critical_trigger: '',
    is_active: true,
    is_refundable: false,
    refund_days: '0',
    allow_swap: false,
    swap_type: 'direct_swap',
    depreciation: {
      originalPrice: '',
      usagePeriod: '',
      usageUnit: 'months',
      depreciationRate: 10,
      calculatedPrice: '',
      purchaseDate: null,
    },
    minimum_additional_payment: '0',
    maximum_additional_payment: '0',
    swap_description: '',
    critical_stock: '',
    isNew: true,
    image: null,
    imagePending: null,
    imagePreview: null,
    imageToDelete: false,
  };
}

// ─── OrangeSlider ─────────────────────────────────────────────────────────────
interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}
function OrangeSlider({ value, onValueChange, min = 0, max = 100, step = 0.5 }: SliderProps) {
  const sliderWidth = SCREEN_WIDTH - 120;
  const thumbSize = 22;
  const valueToX = (v: number) => ((v - min) / (max - min)) * (sliderWidth - thumbSize);
  const xToValue = (x: number) => {
    const raw = (x / (sliderWidth - thumbSize)) * (max - min) + min;
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, parseFloat(stepped.toFixed(1))));
  };
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => onValueChange(xToValue(evt.nativeEvent.locationX - thumbSize / 2)),
      onPanResponderMove: (evt) => onValueChange(xToValue(evt.nativeEvent.locationX - thumbSize / 2)),
    })
  ).current;
  const thumbX = valueToX(value);
  return (
    <View style={{ height: 44, justifyContent: 'center' }} {...panResponder.panHandlers}>
      <View style={sliderStyles.track}>
        <View style={[sliderStyles.fill, { width: Math.max(0, thumbX + thumbSize / 2) }]} />
        <View style={[sliderStyles.thumb, { left: Math.max(0, thumbX) }]} />
      </View>
      <View style={sliderStyles.ticks}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <Text key={tick} style={sliderStyles.tickLabel}>{tick}%</Text>
        ))}
      </View>
    </View>
  );
}
const sliderStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: '#FED7AA', borderRadius: 3, position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, height: 6, backgroundColor: '#F97316', borderRadius: 3 },
  thumb: {
    position: 'absolute', top: -8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EA580C', borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  tickLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
});

// ─── DatePickerModal ──────────────────────────────────────────────────────────
interface DatePickerModalProps {
  visible: boolean;
  selectedDate?: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}
function DatePickerModal({ visible, selectedDate, onSelect, onClose }: DatePickerModalProps) {
  const today = new Date();
  const [year, setYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [month, setMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());
  const [day, setDay] = useState(selectedDate?.getDate() ?? today.getDate());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const years = Array.from({ length: 30 }, (_, i) => today.getFullYear() - i);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dpStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={dpStyles.container}>
          <View style={dpStyles.header}>
            <Text style={dpStyles.title}>Purchase Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View style={dpStyles.pickerRow}>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Month</Text>
              <ScrollView style={dpStyles.pickerScroll} showsVerticalScrollIndicator={false}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity key={m} style={[dpStyles.pickerItem, month === i && dpStyles.pickerItemActive]} onPress={() => setMonth(i)}>
                    <Text style={[dpStyles.pickerItemText, month === i && dpStyles.pickerItemTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Day</Text>
              <ScrollView style={dpStyles.pickerScroll} showsVerticalScrollIndicator={false}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <TouchableOpacity key={d} style={[dpStyles.pickerItem, day === d && dpStyles.pickerItemActive]} onPress={() => setDay(d)}>
                    <Text style={[dpStyles.pickerItemText, day === d && dpStyles.pickerItemTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={dpStyles.pickerCol}>
              <Text style={dpStyles.pickerLabel}>Year</Text>
              <ScrollView style={dpStyles.pickerScroll} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity key={y} style={[dpStyles.pickerItem, year === y && dpStyles.pickerItemActive]} onPress={() => setYear(y)}>
                    <Text style={[dpStyles.pickerItemText, year === y && dpStyles.pickerItemTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={dpStyles.confirmButton} onPress={() => { onSelect(new Date(year, month, Math.min(day, daysInMonth))); onClose(); }}>
            <Text style={dpStyles.confirmButtonText}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  pickerRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerScroll: { maxHeight: 200, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemActive: { backgroundColor: '#FFF7ED' },
  pickerItemText: { fontSize: 14, color: '#374151' },
  pickerItemTextActive: { color: '#EA580C', fontWeight: '700' },
  confirmButton: { backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

// ─── StarRow ──────────────────────────────────────────────────────────────────
function StarRow({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB', fontSize: 14 }}>★</Text>
      ))}
    </View>
  );
}

// ─── SimpleModal (reusable list picker) ──────────────────────────────────────
interface SimpleModalProps {
  visible: boolean;
  title: string;
  items: { label: string; value: string }[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}
function SimpleModal({ visible, title, items, selected, onSelect, onClose }: SimpleModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, selected === item.value && { backgroundColor: '#FFF7ED' }]}
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
                {selected === item.value && <Ionicons name="checkmark" size={20} color="#EA580C" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditProductForm({ product, userId, onSuccess, onCancel }: EditProductFormProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(product));
  const [variants, setVariants] = useState<VariantFormState[]>([]);
  const [media, setMedia] = useState<MediaFormState>({ existing: product?.media ?? [], toDelete: [], pending: [] });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<number, boolean>>({});
  const [expandedSwap, setExpandedSwap] = useState<Record<number, boolean>>({});

  // Modal state
  const [conditionModal, setConditionModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [weightUnitModal, setWeightUnitModal] = useState<{ visible: boolean; idx: number | null }>({ visible: false, idx: null });
  const [dimUnitModal, setDimUnitModal] = useState<{ visible: boolean; idx: number | null }>({ visible: false, idx: null });
  const [usageUnitModal, setUsageUnitModal] = useState<{ visible: boolean; idx: number | null }>({ visible: false, idx: null });
  const [datePickerModal, setDatePickerModal] = useState<{ visible: boolean; idx: number | null }>({ visible: false, idx: null });
  const [swapTypeModal, setSwapTypeModal] = useState<{ visible: boolean; idx: number | null }>({ visible: false, idx: null });

  // ─── Load data ──────────────────────────────────────────────────────────────
  // Re-populate form whenever the product id changes (including initial mount)
  useEffect(() => {
    if (!product?.id) return;
    setForm(buildInitialForm(product));
    setErrors({});
    setMedia({ existing: product.media ?? [], toDelete: [], pending: [] });
    loadVariants();
    loadMedia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await AxiosInstance.get('/seller-products/global-categories/');
        if (res.data.success) setCategories(res.data.categories ?? []);
      } catch { } finally { setLoadingCategories(false); }
    })();
  }, []);

  const loadMedia = async () => {
    try {
    if (!product?.id) return;
      const res = await AxiosInstance.get(`/seller-products/${product?.id}/media/`);
      const items: MediaItem[] = res.data.media ?? (Array.isArray(res.data) ? res.data : []);
      setMedia((prev) => ({ ...prev, existing: items }));
    } catch { }
  };

  const loadVariants = async () => {
    setLoadingVariants(true);
    if (!product?.id) return;
    try {
      const res = await AxiosInstance.get(`/seller-products/${product?.id}/variants/`);
      const raw: Variant[] = res.data.variants ?? (Array.isArray(res.data) ? res.data : []);
      if (raw.length > 0) setVariants(raw.map(variantToFormState));
      else if (product?.variants?.length) setVariants(product.variants.map(variantToFormState));
      else setVariants([]);
    } catch {
      if (product?.variants?.length) setVariants(product.variants.map(variantToFormState));
      else setVariants([]);
    } finally { setLoadingVariants(false); }
  };

  // ─── Media helpers ───────────────────────────────────────────────────────────
  const pickProductImages = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia((prev) => ({
        ...prev,
        pending: [...prev.pending, { file: { uri: asset.uri, name: asset.uri.split('/').pop() || 'photo.jpg', type: 'image/jpeg' }, preview: asset.uri }],
      }));
    }
  };

  const queueDeleteExisting = (id: string) => {
    setMedia((prev) => ({ ...prev, existing: prev.existing.filter((m) => m.id !== id), toDelete: [...prev.toDelete, id] }));
  };
  const removePending = (index: number) => {
    setMedia((prev) => ({ ...prev, pending: prev.pending.filter((_, i) => i !== index) }));
  };

  const flushMedia = async () => {
    await Promise.allSettled(media.toDelete.map((id) => AxiosInstance.delete(`/seller-products/${product?.id}/media/${id}/`)));
    await Promise.allSettled(
      media.pending.map(({ file }) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('product_id', product?.id);
        return AxiosInstance.post(`/seller-products/${product?.id}/media/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      })
    );
  };

  // ─── Variant image helpers ───────────────────────────────────────────────────
  const pickVariantImage = async (index: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVariants((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], imagePending: { uri: asset.uri, name: asset.uri.split('/').pop() || 'image.jpg', type: 'image/jpeg' }, imagePreview: asset.uri, imageToDelete: false };
        return updated;
      });
    }
  };

  const removeVariantImage = (index: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], imagePending: null, imagePreview: null, image: null, imageToDelete: true };
      return updated;
    });
  };

  // ─── Depreciation helpers ────────────────────────────────────────────────────
  const calcAndSet = (idx: number, dep: Depreciation) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (dep.originalPrice && dep.usagePeriod && dep.depreciationRate) {
        const cp = calcDepreciatedPrice(Number(dep.originalPrice), Number(dep.usagePeriod), dep.usageUnit, Number(dep.depreciationRate));
        dep.calculatedPrice = cp;
        updated[idx] = { ...updated[idx], depreciation: dep, price: cp.toString() };
      } else {
        updated[idx] = { ...updated[idx], depreciation: dep };
      }
      return updated;
    });
  };

  const handleDepreciationChange = (idx: number, field: keyof Depreciation, value: any) => {
    const dep = { ...variants[idx].depreciation, [field]: value };
    calcAndSet(idx, dep);
  };

  const handlePurchaseDateChange = (idx: number, date: Date) => {
    const unit = variants[idx].depreciation.usageUnit || 'months';
    const today = new Date();
    let usagePeriod: number;
    if (unit === 'weeks') usagePeriod = diffInWeeks(date, today);
    else if (unit === 'years') usagePeriod = diffInYears(date, today);
    else usagePeriod = diffInMonths(date, today);
    const dep = { ...variants[idx].depreciation, purchaseDate: date, usagePeriod };
    calcAndSet(idx, dep);
  };

  const handleUsageUnitChange = (idx: number, value: 'weeks' | 'months' | 'years') => {
    const v = variants[idx];
    const dep = { ...v.depreciation, usageUnit: value };
    if (v.depreciation.purchaseDate) {
      const today = new Date();
      let usagePeriod: number;
      if (value === 'weeks') usagePeriod = diffInWeeks(v.depreciation.purchaseDate, today);
      else if (value === 'years') usagePeriod = diffInYears(v.depreciation.purchaseDate, today);
      else usagePeriod = diffInMonths(v.depreciation.purchaseDate, today);
      dep.usagePeriod = usagePeriod;
    }
    calcAndSet(idx, dep);
  };

  const handleDepreciationRate = (idx: number, rate: number) => {
    const dep = { ...variants[idx].depreciation, depreciationRate: rate };
    calcAndSet(idx, dep);
  };

  // ─── Variant field update ────────────────────────────────────────────────────
  const updateVariant = (index: number, field: keyof VariantFormState, value: any) => {
    setVariants((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };

  const addVariant = () => setVariants((prev) => [...prev, createEmptyVariant()]);

  const removeVariant = (index: number) => {
    if (variants.length <= 1) { Alert.alert('Cannot Remove', 'Products must have at least one variant'); return; }
    Alert.alert('Remove Variant', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setVariants((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  };

  const toggleVariant = (index: number) =>
    setExpandedVariants((prev) => ({ ...prev, [index]: !prev[index] }));

  // ─── Validation & Submit ─────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required.';
    else if (form.name.trim().length > 100) newErrors.name = 'Max 100 characters.';
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (!form.condition) newErrors.condition = 'Condition is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { Alert.alert('Validation Error', Object.values(newErrors)[0]); return false; }
    if (variants.length === 0) { Alert.alert('Validation Error', 'At least one variant is required.'); return false; }
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = v.title?.trim() ? `"${v.title}"` : `Variant ${i + 1}`;
      if (!v.title?.trim()) { Alert.alert('Validation Error', `${label}: title is required.`); return false; }
      if (!v.quantity || Number(v.quantity) < 0) { Alert.alert('Validation Error', `${label}: quantity must be 0 or more.`); return false; }
      const hasPrice = (v.depreciation.calculatedPrice && Number(v.depreciation.calculatedPrice) > 0) || (v.price && Number(v.price) > 0);
      if (!hasPrice) { Alert.alert('Validation Error', `${label}: a selling price is required. Fill the depreciation calculator or enter a price.`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        product_id: product?.id,
        user_id: userId,
        name: form.name.trim(),
        description: form.description.trim(),
        condition: form.condition,
        upload_status: form.upload_status,
        is_refundable: form.is_refundable,
        refund_days: form.is_refundable ? parseInt(form.refund_days) || 0 : 0,
      };
      if (form.category_admin_id) payload.category_admin_id = form.category_admin_id;
      await AxiosInstance.put(`/seller-products/${product?.id}/update_product/`, payload);

      const variantsPayload = variants.map((v) => ({
        id: v.id,
        title: v.title,
        sku_code: v.sku_code,
        price: v.depreciation.calculatedPrice && Number(v.depreciation.calculatedPrice) > 0
          ? parseFloat(v.depreciation.calculatedPrice.toString())
          : v.price ? parseFloat(v.price) : null,
        quantity: parseInt(v.quantity) || 0,
        length: v.length ? parseFloat(v.length) : null,
        width: v.width ? parseFloat(v.width) : null,
        height: v.height ? parseFloat(v.height) : null,
        dimension_unit: v.dimension_unit || 'cm',
        weight: v.weight ? parseFloat(v.weight) : null,
        weight_unit: v.weight_unit,
        critical_trigger: v.critical_trigger ? parseInt(v.critical_trigger) : null,
        is_active: v.is_active,
        is_refundable: v.is_refundable,
        refund_days: parseInt(v.refund_days) || 0,
        allow_swap: v.allow_swap,
        swap_type: v.swap_type,
        original_price: v.depreciation.originalPrice ? parseFloat(v.depreciation.originalPrice.toString()) : null,
        usage_period: v.depreciation.usagePeriod ? parseFloat(v.depreciation.usagePeriod.toString()) : null,
        usage_unit: v.depreciation.usageUnit,
        depreciation_rate: v.depreciation.depreciationRate ? parseFloat(v.depreciation.depreciationRate.toString()) : null,
        minimum_additional_payment: parseFloat(v.minimum_additional_payment) || 0,
        maximum_additional_payment: parseFloat(v.maximum_additional_payment) || 0,
        swap_description: v.swap_description,
        critical_stock: v.critical_stock ? parseInt(v.critical_stock) : null,
      }));
      await AxiosInstance.put(`/seller-products/${product?.id}/variants-bulk-update/`, { variants: variantsPayload });

      await Promise.allSettled(
        variants.map(async (v) => {
          if (!v.id) return;
          if (v.imagePending) {
            const fd = new FormData();
            fd.append('image', v.imagePending);
            await AxiosInstance.post(`/seller-products/${product?.id}/variants/${v.id}/image/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } else if (v.imageToDelete) {
            await AxiosInstance.delete(`/seller-products/${product?.id}/variants/${v.id}/image/`);
          }
        })
      );
      await flushMedia();

      const selectedCategory = categories.find((c) => c.id === form.category_admin_id) ?? null;
      Alert.alert('Success', 'Product updated successfully!', [
        { text: 'OK', onPress: () => onSuccess({ id: product?.id, name: form.name.trim(), description: form.description.trim(), condition: form.condition, upload_status: form.upload_status, is_refundable: form.is_refundable, refund_days: form.is_refundable ? parseInt(form.refund_days) || 0 : 0, category_admin: selectedCategory }) },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.response?.data?.detail ?? 'Failed to update product.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  };

  const totalImageCount = media.existing.length + media.pending.length;
  const conditionData = CONDITION_SCALE[form.condition] ?? CONDITION_SCALE[3];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Meta pills ─────────────────────────────────────────────────── */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Ionicons name="cube-outline" size={12} color="#6B7280" />
            <Text style={styles.pillText}>{product?.total_stock} in stock</Text>
          </View>
          {product?.starting_price && (
            <View style={styles.pill}>
              <Ionicons name="pricetag-outline" size={12} color="#6B7280" />
              <Text style={styles.pillText}>from ₱{parseFloat(product?.starting_price ?? "0").toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.pill, { backgroundColor: conditionData?.color ?? "#F3F4F6", borderColor: conditionData?.borderColor ?? "#E5E7EB" }]}>
            <StarRow count={conditionData?.stars ?? 0} />
            <Text style={[styles.pillText, { color: conditionData?.textColor ?? "#374151" }]}>{conditionData?.shortLabel ?? ""}</Text>
          </View>
        </View>

        {/* ── Product Images ──────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardHeaderLeft}>
              <Ionicons name="images-outline" size={16} color="#EA580C" />
              <Text style={styles.sectionCardTitle}>Product Images</Text>
              <Text style={styles.sectionCardCount}>({totalImageCount})</Text>
            </View>
            <TouchableOpacity style={styles.outlineButton} onPress={pickProductImages}>
              <Ionicons name="image" size={14} color="#EA580C" />
              <Text style={styles.outlineButtonText}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {totalImageCount === 0 ? (
            <TouchableOpacity style={styles.emptyImageArea} onPress={pickProductImages}>
              <Ionicons name="images-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyImageText}>Tap to add product images</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageGrid}>
              {media.existing.map((m) => (
                <View key={m.id} style={styles.imageGridItem}>
                  {m.file_data ? (
                    <Image source={{ uri: m.file_data }} style={styles.imageGridImg} />
                  ) : (
                    <View style={[styles.imageGridImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => queueDeleteExisting(m.id)}>
                    <Ionicons name="close" size={10} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {media.pending.map((p, i) => (
                <View key={`p-${i}`} style={styles.imageGridItem}>
                  <Image source={{ uri: p.preview }} style={styles.imageGridImg} />
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>New</Text></View>
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removePending(i)}>
                    <Ionicons name="close" size={10} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.imageAddMore} onPress={pickProductImages}>
                <Ionicons name="add" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Product Name ────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(v) => { setForm((f) => ({ ...f, name: v })); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
            placeholder="Enter product name"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
          />
          <View style={styles.charCountRow}>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.charCount}>{form.name.length}/100</Text>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={form.description}
            onChangeText={(v) => { setForm((f) => ({ ...f, description: v })); if (errors.description) setErrors((e) => ({ ...e, description: undefined })); }}
            placeholder="Describe your product…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={1000}
            textAlignVertical="top"
          />
          <View style={styles.charCountRow}>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            <Text style={styles.charCount}>{form.description.length}/1000</Text>
          </View>
        </View>

        {/* ── Condition + Category ─────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Condition <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={[styles.selectButton, errors.condition && styles.inputError]} onPress={() => setConditionModal(true)}>
                {form.condition ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <StarRow count={CONDITION_SCALE[form.condition]?.stars ?? 0} />
                    <Text style={styles.selectButtonText}>{CONDITION_SCALE[form.condition]?.shortLabel}</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select condition</Text>
                )}
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {form.condition ? (
                <View style={[styles.conditionBadge, { backgroundColor: CONDITION_SCALE[form.condition].color, borderColor: CONDITION_SCALE[form.condition].borderColor }]}>
                  <Text style={[styles.conditionBadgeText, { color: CONDITION_SCALE[form.condition].textColor }]} numberOfLines={2}>
                    {CONDITION_SCALE[form.condition].label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              {loadingCategories ? (
                <View style={[styles.selectButton, { justifyContent: 'center' }]}>
                  <ActivityIndicator size="small" color="#EA580C" />
                </View>
              ) : (
                <TouchableOpacity style={styles.selectButton} onPress={() => setCategoryModal(true)}>
                  <Text style={form.category_admin_id ? styles.selectButtonText : styles.placeholderText} numberOfLines={1}>
                    {categories.find((c) => c.id === form.category_admin_id)?.name || 'No category'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Variants ────────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>Product Variants</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={addVariant}>
              <Ionicons name="add" size={14} color="#EA580C" />
              <Text style={styles.outlineButtonText}>Add Variant</Text>
            </TouchableOpacity>
          </View>

          {loadingVariants ? (
            <View style={styles.centerPad}>
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
          ) : variants.length === 0 ? (
            <View style={styles.emptyVariants}>
              <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyVariantsText}>No variants added yet</Text>
              <TouchableOpacity onPress={addVariant}>
                <Text style={styles.emptyVariantsLink}>Add your first variant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            variants.map((variant, index) => {
              const currentImage = variant.imagePreview ?? variant.image ?? null;
              const hasCalculatedPrice = variant.depreciation.calculatedPrice && Number(variant.depreciation.calculatedPrice) > 0;
              const isExpanded = !!expandedVariants[index];

              return (
                <View key={index} style={styles.variantCard}>
                  {/* Variant Header */}
                  <TouchableOpacity style={styles.variantHeader} onPress={() => toggleVariant(index)}>
                    <View style={styles.variantHeaderLeft}>
                      {currentImage ? (
                        <Image source={{ uri: currentImage }} style={styles.variantThumb} />
                      ) : (
                        <View style={[styles.variantThumb, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="image-outline" size={14} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={styles.variantNumber}>
                        <Text style={styles.variantNumberText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.variantTitle} numberOfLines={1}>
                          {variant.title || `Variant ${index + 1}`}
                        </Text>
                        {hasCalculatedPrice ? (
                          <Text style={styles.variantPriceOrange}>₱{formatPrice(variant.depreciation.calculatedPrice)}</Text>
                        ) : variant.price && Number(variant.price) > 0 ? (
                          <Text style={styles.variantPriceBlue}>₱{formatPrice(variant.price)}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.variantHeaderRight}>
                      <TouchableOpacity onPress={() => removeVariant(index)} style={styles.variantDeleteBtn}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.variantContent}>
                      {/* Variant Image */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Variant Image</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {currentImage ? (
                            <View style={styles.variantImageContainer}>
                              <Image source={{ uri: currentImage }} style={styles.variantImage} />
                              {variant.imagePending && <View style={styles.newBadgeOnImage}><Text style={styles.newBadgeText}>New</Text></View>}
                              <TouchableOpacity style={styles.removeVariantImage} onPress={() => removeVariantImage(index)}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.addVariantImageBtn} onPress={() => pickVariantImage(index)}>
                              <Ionicons name="camera" size={22} color="#9CA3AF" />
                              <Text style={styles.addVariantImageText}>Add Photo</Text>
                            </TouchableOpacity>
                          )}
                          <View style={{ flex: 1, gap: 6 }}>
                            <TouchableOpacity style={styles.changeImgBtn} onPress={() => pickVariantImage(index)}>
                              <Ionicons name="camera-outline" size={12} color="#EA580C" />
                              <Text style={styles.changeImgBtnText}>{currentImage ? 'Change' : 'Upload'}</Text>
                            </TouchableOpacity>
                            {currentImage && (
                              <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeVariantImage(index)}>
                                <Ionicons name="trash-outline" size={12} color="#EF4444" />
                                <Text style={styles.removeImgBtnText}>Remove</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Title + Quantity */}
                      <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
                          <TextInput
                            style={styles.input}
                            value={variant.title}
                            onChangeText={(v) => updateVariant(index, 'title', v)}
                            placeholder="e.g., Small, Red"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                          <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
                          <TextInput
                            style={styles.input}
                            value={variant.quantity}
                            onChangeText={(v) => updateVariant(index, 'quantity', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>

                      {/* SKU */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>SKU Code</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.sku_code}
                          onChangeText={(v) => updateVariant(index, 'sku_code', v)}
                          placeholder="Optional"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>

                      {/* Manual Price (shown when no calculated price) */}
                      {!hasCalculatedPrice && (
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Selling Price <Text style={styles.required}>*</Text></Text>
                          <View style={styles.priceInputContainer}>
                            <Text style={styles.currencySymbol}>₱</Text>
                            <TextInput
                              style={styles.priceInput}
                              value={variant.price}
                              onChangeText={(v) => updateVariant(index, 'price', v)}
                              keyboardType="numeric"
                              placeholder="Enter selling price"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <Text style={styles.hintText}>Or fill the depreciation calculator below to auto-calculate.</Text>
                        </View>
                      )}

                      {/* ── Depreciation ─────────────────────────────────── */}
                      <View style={styles.depreciationSection}>
                        <View style={styles.depreciationHeader}>
                          <Ionicons name="calculator" size={16} color="#EA580C" />
                          <Text style={styles.depreciationTitle}>Price Depreciation Calculator</Text>
                        </View>

                        {/* Original Price */}
                        <View style={styles.formGroup}>
                          <Text style={styles.depLabel}>Original Price</Text>
                          <View style={styles.priceInputContainer}>
                            <Text style={styles.currencySymbol}>₱</Text>
                            <TextInput
                              style={styles.priceInput}
                              value={variant.depreciation.originalPrice?.toString() || ''}
                              onChangeText={(t) => handleDepreciationChange(index, 'originalPrice', parseFloat(t) || '')}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>

                        {/* Purchase Date */}
                        <View style={styles.formGroup}>
                          <Text style={styles.depLabel}>Purchase Date</Text>
                          <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setDatePickerModal({ visible: true, idx: index })}
                          >
                            <Ionicons name="calendar-outline" size={16} color="#EA580C" />
                            <Text style={variant.depreciation.purchaseDate ? styles.datePickerTextSet : styles.datePickerTextPlaceholder}>
                              {variant.depreciation.purchaseDate ? formatDate(variant.depreciation.purchaseDate) : 'Pick a date'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Depreciation Rate Slider */}
                        <View style={styles.sliderSection}>
                          <View style={styles.sliderHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="trending-down-outline" size={16} color="#EA580C" />
                              <Text style={styles.sliderTitle}>Annual Depreciation Rate</Text>
                            </View>
                            <View style={styles.rateBadge}>
                              <Text style={styles.rateBadgeText}>{variant.depreciation.depreciationRate || 0}%</Text>
                            </View>
                          </View>
                          <OrangeSlider
                            value={Number(variant.depreciation.depreciationRate) || 0}
                            onValueChange={(val) => handleDepreciationRate(index, val)}
                          />
                        </View>

                        {/* Calculated Price Card */}
                        <View style={styles.calculatedPriceCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <Ionicons name="calculator" size={18} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.calcCardLabel}>Calculated Price</Text>
                          </View>
                          {hasCalculatedPrice ? (
                            <View>
                              <Text style={styles.calcCardPrice}>
                                ₱{Number(variant.depreciation.calculatedPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                              <View style={styles.calcCardInfo}>
                                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.calcCardInfoText}>
                                  Based on {variant.depreciation.usagePeriod} {variant.depreciation.usageUnit} of use
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={{ alignItems: 'center' }}>
                              <Text style={styles.calcCardEmpty}>—</Text>
                              <View style={styles.calcCardHint}>
                                <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.calcCardHintText}>Fill in original price &amp; purchase date</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Status Toggles */}
                      <View style={styles.toggleRow}>
                        <View style={styles.toggleContainer}>
                          <Switch
                            value={variant.is_active}
                            onValueChange={(v) => updateVariant(index, 'is_active', v)}
                            trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                            thumbColor={variant.is_active ? '#EA580C' : '#9CA3AF'}
                          />
                          <Text style={styles.toggleLabel}>Active</Text>
                        </View>
                        <View style={styles.toggleContainer}>
                          <Switch
                            value={variant.is_refundable}
                            onValueChange={(v) => updateVariant(index, 'is_refundable', v)}
                            trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                            thumbColor={variant.is_refundable ? '#EA580C' : '#9CA3AF'}
                          />
                          <Text style={styles.toggleLabel}>Refundable</Text>
                        </View>
                      </View>

                      {/* ── Dimensions ────────────────────────────────────── */}
                      <View style={styles.sectionDivider}>
                        <View style={styles.advancedSectionHeader}>
                          <Ionicons name="resize-outline" size={15} color="#EA580C" />
                          <Text style={styles.advancedSectionTitle}>Dimensions</Text>
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Size (L × W × H)</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {(['length', 'width', 'height'] as const).map((dim, di) => (
                              <TextInput
                                key={dim}
                                style={[styles.input, { flex: 1 }]}
                                value={(variant as any)[dim]?.toString() || ''}
                                onChangeText={(t) => updateVariant(index, dim, parseFloat(t) || '')}
                                keyboardType="numeric"
                                placeholder={['L', 'W', 'H'][di]}
                                placeholderTextColor="#9CA3AF"
                              />
                            ))}
                            <TouchableOpacity
                              style={[styles.selectButton, { width: 56 }]}
                              onPress={() => setDimUnitModal({ visible: true, idx: index })}
                            >
                              <Text style={[styles.selectButtonText, { fontSize: 12 }]}>{variant.dimension_unit || 'cm'}</Text>
                              <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.row}>
                          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Weight</Text>
                            <TextInput
                              style={styles.input}
                              value={variant.weight}
                              onChangeText={(t) => updateVariant(index, 'weight', t)}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Unit</Text>
                            <TouchableOpacity
                              style={styles.selectButton}
                              onPress={() => setWeightUnitModal({ visible: true, idx: index })}
                            >
                              <Text style={styles.selectButtonText}>{variant.weight_unit || 'g'}</Text>
                              <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Low Stock Alert</Text>
                          <TextInput
                            style={styles.input}
                            value={variant.critical_trigger}
                            onChangeText={(t) => updateVariant(index, 'critical_trigger', t)}
                            keyboardType="numeric"
                            placeholder="Alert when stock below this number"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>

                      {/* ── Proof of Ownership ────────────────────────────── */}
                      <View style={[styles.sectionDivider, { marginTop: 8 }]}>
                        <View style={styles.advancedSectionHeader}>
                          <Ionicons name="shield-checkmark-outline" size={15} color="#EA580C" />
                          <Text style={styles.advancedSectionTitle}>Proof of Ownership</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {/* proof image placeholder – extend same as variant image if needed */}
                          <Text style={styles.hintText}>Upload receipt, certificate, or other proof of ownership/condition.</Text>
                        </View>
                      </View>

                      {/* ── Allow Swap ────────────────────────────────────── */}
                      <View style={[styles.sectionDivider, { marginTop: 8 }]}>
                        <View style={styles.advancedSectionHeader}>
                          <Ionicons name="swap-horizontal-outline" size={15} color="#EA580C" />
                          <Text style={styles.advancedSectionTitle}>Swap Settings</Text>
                        </View>
                        <View style={styles.toggleContainer}>
                          <Switch
                            value={variant.allow_swap}
                            onValueChange={(v) => updateVariant(index, 'allow_swap', v)}
                            trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                            thumbColor={variant.allow_swap ? '#EA580C' : '#9CA3AF'}
                          />
                          <Text style={styles.toggleLabel}>Allow Swap</Text>
                        </View>
                        {variant.allow_swap && (
                          <View style={{ marginTop: 12, gap: 12 }}>
                            <View style={styles.formGroup}>
                              <Text style={styles.label}>Swap Type</Text>
                              <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => setSwapTypeModal({ visible: true, idx: index })}
                              >
                                <Text style={styles.selectButtonText}>
                                  {variant.swap_type === 'swap_plus_payment' ? 'Swap + Payment' : 'Direct Swap'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                              </TouchableOpacity>
                            </View>
                            {variant.swap_type === 'swap_plus_payment' && (
                              <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                  <Text style={styles.label}>Min Additional Payment</Text>
                                  <View style={styles.priceInputContainer}>
                                    <Text style={styles.currencySymbol}>₱</Text>
                                    <TextInput
                                      style={styles.priceInput}
                                      value={variant.minimum_additional_payment}
                                      onChangeText={(v) => updateVariant(index, 'minimum_additional_payment', v)}
                                      keyboardType="numeric"
                                      placeholder="0.00"
                                      placeholderTextColor="#9CA3AF"
                                    />
                                  </View>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                  <Text style={styles.label}>Max Additional Payment</Text>
                                  <View style={styles.priceInputContainer}>
                                    <Text style={styles.currencySymbol}>₱</Text>
                                    <TextInput
                                      style={styles.priceInput}
                                      value={variant.maximum_additional_payment}
                                      onChangeText={(v) => updateVariant(index, 'maximum_additional_payment', v)}
                                      keyboardType="numeric"
                                      placeholder="0.00"
                                      placeholderTextColor="#9CA3AF"
                                    />
                                  </View>
                                </View>
                              </View>
                            )}
                            <View style={styles.formGroup}>
                              <Text style={styles.label}>Swap Description</Text>
                              <TextInput
                                style={[styles.input, styles.textArea]}
                                value={variant.swap_description}
                                onChangeText={(v) => updateVariant(index, 'swap_description', v)}
                                placeholder="Describe swap conditions..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={saving}>
          <Ionicons name="close" size={18} color="#6B7280" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={styles.saveButtonText}>Saving…</Text></>
          ) : (
            <><Ionicons name="save-outline" size={18} color="#FFFFFF" /><Text style={styles.saveButtonText}>Save Changes</Text></>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Condition Modal */}
      <Modal visible={conditionModal} transparent animationType="slide" onRequestClose={() => setConditionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setConditionModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Condition Rating</Text>
              <TouchableOpacity onPress={() => setConditionModal(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList
              data={Object.entries(CONDITION_SCALE)}
              keyExtractor={([key]) => key}
              renderItem={({ item: [key, cond] }) => {
                const val = parseInt(key);
                const isSelected = form.condition === val;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && { backgroundColor: '#FFF7ED' }]}
                    onPress={() => { setForm((f) => ({ ...f, condition: val })); setConditionModal(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <StarRow count={cond.stars} />
                        <Text style={[styles.modalItemText, { fontWeight: '600' }]}>{cond.shortLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{cond.label}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#EA580C" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Modal */}
      <Modal visible={categoryModal} transparent animationType="slide" onRequestClose={() => setCategoryModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: '', name: 'No category' }, ...categories]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, form.category_admin_id === item.id && { backgroundColor: '#FFF7ED' }]}
                  onPress={() => { setForm((f) => ({ ...f, category_admin_id: item.id })); setCategoryModal(false); }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {form.category_admin_id === item.id && <Ionicons name="checkmark" size={20} color="#EA580C" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight Unit Modal */}
      <SimpleModal
        visible={weightUnitModal.visible}
        title="Select Weight Unit"
        items={WEIGHT_UNIT_OPTIONS.map((v) => ({ label: v, value: v }))}
        selected={weightUnitModal.idx !== null ? variants[weightUnitModal.idx]?.weight_unit : undefined}
        onSelect={(v) => { if (weightUnitModal.idx !== null) updateVariant(weightUnitModal.idx, 'weight_unit', v); }}
        onClose={() => setWeightUnitModal({ visible: false, idx: null })}
      />

      {/* Dimension Unit Modal */}
      <SimpleModal
        visible={dimUnitModal.visible}
        title="Select Dimension Unit"
        items={DIMENSION_UNIT_OPTIONS.map((v) => ({ label: v, value: v }))}
        selected={dimUnitModal.idx !== null ? variants[dimUnitModal.idx]?.dimension_unit : undefined}
        onSelect={(v) => { if (dimUnitModal.idx !== null) updateVariant(dimUnitModal.idx, 'dimension_unit', v); }}
        onClose={() => setDimUnitModal({ visible: false, idx: null })}
      />

      {/* Usage Unit Modal */}
      <SimpleModal
        visible={usageUnitModal.visible}
        title="Select Time Unit"
        items={USAGE_UNIT_OPTIONS}
        selected={usageUnitModal.idx !== null ? variants[usageUnitModal.idx]?.depreciation.usageUnit : undefined}
        onSelect={(v) => { if (usageUnitModal.idx !== null) handleUsageUnitChange(usageUnitModal.idx, v as 'weeks' | 'months' | 'years'); }}
        onClose={() => setUsageUnitModal({ visible: false, idx: null })}
      />

      {/* Swap Type Modal */}
      <SimpleModal
        visible={swapTypeModal.visible}
        title="Select Swap Type"
        items={[{ label: 'Direct Swap', value: 'direct_swap' }, { label: 'Swap + Payment', value: 'swap_plus_payment' }]}
        selected={swapTypeModal.idx !== null ? variants[swapTypeModal.idx]?.swap_type : undefined}
        onSelect={(v) => { if (swapTypeModal.idx !== null) updateVariant(swapTypeModal.idx, 'swap_type', v); }}
        onClose={() => setSwapTypeModal({ visible: false, idx: null })}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerModal.visible}
        selectedDate={datePickerModal.idx !== null ? variants[datePickerModal.idx]?.depreciation.purchaseDate : null}
        onSelect={(date) => { if (datePickerModal.idx !== null) handlePurchaseDateChange(datePickerModal.idx, date); }}
        onClose={() => setDatePickerModal({ visible: false, idx: null })}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },

  // Pills
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  // Section cards
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, margin: 16, marginBottom: 0, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sectionCardCount: { fontSize: 13, color: '#9CA3AF' },

  // Buttons
  outlineButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  outlineButtonText: { fontSize: 13, color: '#EA580C', fontWeight: '500' },

  // Image grid
  emptyImageArea: { borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 10, padding: 32, alignItems: 'center', gap: 8 },
  emptyImageText: { fontSize: 13, color: '#9CA3AF' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageGridItem: { position: 'relative', width: 76, height: 76 },
  imageGridImg: { width: 76, height: 76, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  imageRemoveBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 3 },
  newBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249,115,22,0.85)', paddingVertical: 2, alignItems: 'center', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  newBadgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '600' },
  imageAddMore: { width: 76, height: 76, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Form
  formGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#EF4444', flex: 1 },
  charCountRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginTop: 4 },
  charCount: { fontSize: 11, color: '#9CA3AF' },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  // Condition badge
  conditionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  conditionBadgeText: { fontSize: 12, fontWeight: '500', flex: 1 },

  // Select
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#FFFFFF' },
  selectButtonText: { fontSize: 14, color: '#111827' },
  placeholderText: { fontSize: 14, color: '#9CA3AF' },

  // Row
  row: { flexDirection: 'row' },

  // Price input
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  currencySymbol: { fontSize: 14, color: '#6B7280', paddingLeft: 12 },
  priceInput: { flex: 1, paddingVertical: 11, paddingRight: 12, fontSize: 14, color: '#111827' },

  // Variants
  emptyVariants: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyVariantsText: { fontSize: 14, color: '#6B7280' },
  emptyVariantsLink: { fontSize: 14, color: '#EA580C', fontWeight: '500' },
  centerPad: { paddingVertical: 32, alignItems: 'center' },

  variantCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  variantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9FAFB' },
  variantHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  variantHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  variantThumb: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  variantNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  variantNumberText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  variantTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  variantPriceOrange: { fontSize: 12, color: '#EA580C', fontWeight: '500' },
  variantPriceBlue: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  variantDeleteBtn: { padding: 4 },
  variantContent: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },

  // Variant image
  variantImageContainer: { position: 'relative' },
  variantImage: { width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  newBadgeOnImage: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249,115,22,0.85)', paddingVertical: 2, alignItems: 'center', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  removeVariantImage: { position: 'absolute', top: -6, right: -6 },
  addVariantImageBtn: { width: 72, height: 72, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  addVariantImageText: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  changeImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FED7AA', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFF7ED' },
  changeImgBtnText: { fontSize: 12, color: '#EA580C', fontWeight: '500' },
  removeImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  removeImgBtnText: { fontSize: 12, color: '#EF4444' },

  // Depreciation
  depreciationSection: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FED7AA' },
  depreciationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  depreciationTitle: { fontSize: 13, fontWeight: '600', color: '#C2410C' },
  depLabel: { fontSize: 13, fontWeight: '500', color: '#92400E', marginBottom: 6 },

  datePickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FED7AA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  datePickerTextSet: { fontSize: 14, color: '#111827' },
  datePickerTextPlaceholder: { fontSize: 14, color: '#9CA3AF' },

  sliderSection: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sliderTitle: { fontSize: 13, fontWeight: '500', color: '#92400E' },
  rateBadge: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FED7AA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  rateBadgeText: { fontSize: 15, fontWeight: '700', color: '#EA580C' },

  calculatedPriceCard: { backgroundColor: '#EA580C', borderRadius: 12, padding: 16, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  calcCardLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },
  calcCardPrice: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  calcCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  calcCardInfoText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  calcCardEmpty: { fontSize: 30, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  calcCardHint: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  calcCardHintText: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  // Toggles
  toggleRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 14 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 14, color: '#374151' },

  // Dimensions / Proof sections
  sectionDivider: { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  advancedSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  advancedSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Footer
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 13, backgroundColor: '#FFFFFF' },
  cancelButtonText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
  saveButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EA580C', borderRadius: 10, paddingVertical: 13 },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 15, color: '#374151' },
});