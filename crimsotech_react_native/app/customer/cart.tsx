// app/(customer)/cart.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import {
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";

// ------------------ TYPES based on your API response ------------------
interface VariantDetails {
  id: string;
  title: string;
  sku_code: string;
  price: string;
  compare_price: string | null;
  image: string | null;
  option_title: string;
  options: Record<string, any>;
  quantity_available?: number;
}

interface ProductDetails {
  id: string;
  name: string;
  description: string;
  condition: string;
  shop_name: string;
  shop_id: string;
  main_image: string | null;
  media_files?: { id: string; url: string; file_type: string }[];
}

interface ApiCartItem {
  id: string;
  product: string;
  variant: string | null;
  quantity: number;
  added_at: string;
  product_details: ProductDetails;
  variant_details: VariantDetails | null;
  total_price: string;
}

interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
  applied_voucher: {
    id: string;
    name: string;
    code: string;
    discount_type: string;
    value: number;
    discount_amount: number;
  } | null;
}

interface Voucher {
  id: string;
  name: string;
  code: string;
  discount_type: string;
  value: number;
  discount_amount: number;
  minimum_spend: number;
  shop_id: string | null;
  shop_name: string;
  voucher_type: string;
}

interface CartApiResponse {
  success: boolean;
  cart_items: ApiCartItem[];
  totals: CartTotals;
  available_vouchers: Voucher[];
  voucher_error?: string;
  error?: string;
}

interface CartItemType {
  id: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
  shop_name: string;
  shop_id: string;
  selected: boolean;
  added_at: string;
  subtotal: number;
  variant_title: string | null;
  max_available?: number;
}

interface CartStore {
  shop_id: string;
  shop_name: string;
  items: CartItemType[];
  selected: boolean;
}

// ------------------ CONSTANTS ------------------
const DELIVERY_FEE = 0;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&q=80";

// ------------------ HELPER FUNCTIONS ------------------
const formatNumber = (value: number): string => {
  if (isNaN(value)) return "0.00";
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === "") return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const baseURL =
    AxiosInstance.defaults && AxiosInstance.defaults.baseURL
      ? AxiosInstance.defaults.baseURL.replace(/\/$/, "")
      : "http://localhost:8000";

  if (url.startsWith("/")) {
    return `${baseURL}${url}`;
  }

  return `${baseURL}/${url}`;
};

const resolveCartItemImage = (
  variantDetails: VariantDetails | null,
  productDetails: ProductDetails,
): string => {
  if (variantDetails?.image) {
    const resolved = formatImageUrl(variantDetails.image);
    if (resolved) return resolved;
  }

  if (productDetails?.main_image) {
    const resolved = formatImageUrl(productDetails.main_image);
    if (resolved) return resolved;
  }

  if (productDetails?.media_files && productDetails.media_files.length > 0) {
    const resolved = formatImageUrl(productDetails.media_files[0].url);
    if (resolved) return resolved;
  }

  return FALLBACK_IMAGE;
};

const transformApiData = (apiItems: ApiCartItem[]): CartItemType[] => {
  return apiItems.map((item) => {
    const productDetails = item.product_details;
    const variantDetails = item.variant_details;

    const price = variantDetails?.price ? parseFloat(variantDetails.price) : 0;
    const maxAvailable = variantDetails?.quantity_available ?? 999;
    const image = resolveCartItemImage(variantDetails, productDetails);
    const subtotal = item.total_price
      ? parseFloat(item.total_price)
      : price * item.quantity;

    const variantLabel =
      variantDetails?.option_title?.trim() ||
      variantDetails?.title?.trim() ||
      null;

    return {
      id: item.id,
      product_id: productDetails?.id || item.product,
      variant_id: item.variant,
      name: productDetails?.name || "Product",
      price,
      quantity: item.quantity,
      image,
      shop_name: productDetails?.shop_name || "Store",
      shop_id: productDetails?.shop_id || "",
      selected: false,
      added_at: item.added_at,
      subtotal,
      variant_title: variantLabel,
      max_available: maxAvailable,
    };
  });
};

// ------------------ COMPONENTS ------------------

// Voucher Modal Component - Shows all available vouchers and highlights qualified ones
const VoucherModal = ({
  visible,
  onClose,
  onApply,
  isApplying,
  availableVouchers = [],
  cartSubtotal = 0,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  isApplying: boolean;
  availableVouchers: Voucher[];
  cartSubtotal: number;
}) => {
  const isVoucherQualified = (voucher: Voucher) => {
    return cartSubtotal >= voucher.minimum_spend;
  };

  const getQualifiedStatusText = (voucher: Voucher) => {
    if (isVoucherQualified(voucher)) {
      return "✓ Qualified";
    }
    return `Need ₱${formatNumber(voucher.minimum_spend - cartSubtotal)} more`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Available Vouchers</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {availableVouchers.length === 0 ? (
              <View style={styles.noVouchersContainer}>
                <MaterialIcons name="local-offer" size={48} color="#D1D5DB" />
                <Text style={styles.noVouchersText}>No vouchers available</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.vouchersListModal}
                showsVerticalScrollIndicator={false}
              >
                {availableVouchers.map((voucher) => {
                  const qualified = isVoucherQualified(voucher);
                  return (
                    <TouchableOpacity
                      key={voucher.id}
                      style={[
                        styles.voucherItemModal,
                        qualified && styles.voucherItemQualified,
                        !qualified && styles.voucherItemNotQualified,
                      ]}
                      onPress={() => qualified && onApply(voucher.code)}
                      disabled={!qualified || isApplying}
                    >
                      <View style={styles.voucherInfoModal}>
                        <View style={styles.voucherHeader}>
                          <Text style={[
                            styles.voucherCodeModal,
                            !qualified && styles.textDimmed
                          ]}>
                            {voucher.code}
                          </Text>
                          {qualified && (
                            <View style={styles.qualifiedBadge}>
                              <Text style={styles.qualifiedBadgeText}>Qualified</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.voucherNameModal,
                          !qualified && styles.textDimmed
                        ]}>
                          {voucher.name}
                        </Text>
                        <Text style={[
                          styles.voucherDiscountModal,
                          !qualified && styles.textDimmed
                        ]}>
                          {voucher.discount_type === 'percentage' 
                            ? `${voucher.value}% off` 
                            : `₱${formatNumber(voucher.value)} off`}
                        </Text>
                        <Text style={[
                          styles.voucherMinimumModal,
                          !qualified && styles.textDimmed
                        ]}>
                          Min. spend: ₱{formatNumber(voucher.minimum_spend)}
                        </Text>
                        <Text style={[
                          styles.voucherShopModal,
                          !qualified && styles.textDimmed
                        ]}>
                          {voucher.shop_name}
                        </Text>
                      </View>
                      <View style={[
                        styles.voucherApplyButtonModal,
                        !qualified && styles.voucherApplyButtonDisabled
                      ]}>
                        {isApplying ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.voucherApplyTextModal}>
                            {qualified ? "Apply" : getQualifiedStatusText(voucher)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Shop Header Component
const ShopHeader = ({
  shopName,
  shopId,
  itemCount,
  shopTotal,
  allSelected,
  onSelectShop,
  isExpanded,
  onToggleExpand,
}: {
  shopName: string;
  shopId: string;
  itemCount: number;
  shopTotal: number;
  allSelected: boolean;
  onSelectShop: (checked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  return (
    <View style={styles.shopHeader}>
      <TouchableOpacity
        onPress={() => onSelectShop(!allSelected)}
        style={styles.shopCheckbox}
      >
        <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
          {allSelected && (
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.shopHeaderContent}
        onPress={() => {
          if (shopId) {
            router.push(`/customer/view-shop?shopId=${shopId}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.shopIconContainer}>
          <MaterialIcons name="storefront" size={20} color="#F97316" />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopNameText} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={styles.shopSummary}>
            {itemCount} {itemCount === 1 ? "item" : "items"} • ₱
            {formatNumber(shopTotal)}
          </Text>
        </View>
        <MaterialIcons
          name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>
    </View>
  );
};

// Cart Item Component
const CartItemComponent = ({
  item,
  onUpdateQuantity,
  onRemove,
  onSelect,
  isUpdating,
}: {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string, checked: boolean) => void;
  isUpdating: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  
  const isOutOfStock = item.max_available === 0 || (item.max_available !== undefined && item.max_available <= 0);

  const handleIncrement = () => {
    if (isOutOfStock) {
      Alert.alert("Out of Stock", "This item is currently out of stock");
      return;
    }
    if (
      item.max_available !== undefined &&
      item.quantity >= item.max_available
    ) {
      Alert.alert(
        "Maximum Quantity",
        `Only ${item.max_available} items available`,
      );
      return;
    }
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity <= 1) {
      Alert.alert("Remove Item", "Remove this item from cart?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemove(item.id),
        },
      ]);
      return;
    }
    onUpdateQuantity(item.id, item.quantity - 1);
  };

  const handleProductPress = () => {
    if (item.product_id) {
      router.push(`/customer/view-product?id=${item.product_id}`);
    }
  };

  return (
    <View style={[styles.cartItem, isOutOfStock && styles.cartItemOutOfStock]}>
      <TouchableOpacity
        onPress={() => !isOutOfStock && onSelect(item.id, !item.selected)}
        style={{ padding: 4 }}
        disabled={isUpdating || isOutOfStock}
      >
        <View
          style={[
            styles.checkbox,
            { marginRight: 0 },
            item.selected && styles.checkboxChecked,
            isOutOfStock && styles.checkboxDisabled,
          ]}
        >
          {item.selected && (
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleProductPress} activeOpacity={0.7}>
        <Image
          source={{ uri: imageError ? FALLBACK_IMAGE : item.image }}
          style={[styles.itemImage, isOutOfStock && styles.itemImageDimmed]}
          onError={() => setImageError(true)}
        />
      </TouchableOpacity>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <TouchableOpacity onPress={handleProductPress} style={{ flex: 1 }}>
            <Text style={[styles.itemName, isOutOfStock && styles.textDimmed]} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.itemPrice, isOutOfStock && styles.textDimmed]}>
            ₱{formatNumber(item.price * item.quantity)}
          </Text>
        </View>

        {item.variant_title && (
          <Text style={[styles.variantText, isOutOfStock && styles.textDimmed]}>
            {item.variant_title}
          </Text>
        )}

        <View style={styles.itemDetails}>
          <Text style={[styles.itemPriceEach, isOutOfStock && styles.textDimmed]}>
            ₱{formatNumber(item.price)} each
          </Text>

          {isOutOfStock ? (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          ) : (
            <View style={styles.quantityControl}>
              <TouchableOpacity
                onPress={handleDecrement}
                style={[styles.qtyBtn, isUpdating && styles.qtyBtnDisabled]}
                disabled={isUpdating}
              >
                <MaterialIcons name="remove" size={16} color="#4B5563" />
              </TouchableOpacity>

              {isUpdating ? (
                <ActivityIndicator
                  size="small"
                  color="#F97316"
                  style={styles.qtyValue}
                />
              ) : (
                <Text style={styles.qtyValue}>{item.quantity}</Text>
              )}

              <TouchableOpacity
                onPress={handleIncrement}
                style={[styles.qtyBtn, isUpdating && styles.qtyBtnDisabled]}
                disabled={isUpdating || isOutOfStock}
              >
                <MaterialIcons name="add" size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.max_available !== undefined &&
          item.quantity >= item.max_available &&
          !isOutOfStock && (
            <Text style={styles.maxAvailableText}>Max available quantity</Text>
          )}
      </View>
    </View>
  );
};

// Shop Section Component
const ShopSection = ({
  shop,
  onUpdateQuantity,
  onRemove,
  onSelectItem,
  onSelectShop,
  updatingId,
}: {
  shop: CartStore;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onSelectShop: (shopId: string, checked: boolean) => void;
  updatingId: string | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const shopTotal = shop.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const allSelected = shop.items.every((item) => item.selected);
  const selectedItems = shop.items.filter((item) => item.selected);
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <View style={styles.shopSection}>
      <ShopHeader
        shopName={shop.shop_name}
        shopId={shop.shop_id}
        itemCount={shop.items.length}
        shopTotal={shopTotal}
        allSelected={allSelected}
        onSelectShop={(checked) => onSelectShop(shop.shop_id, checked)}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <>
          <View style={styles.itemsContainer}>
            {shop.items.map((item) => (
              <CartItemComponent
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                onSelect={onSelectItem}
                isUpdating={updatingId === item.id}
              />
            ))}
          </View>

          <View style={styles.shopSummaryContainer}>
            <View style={styles.shopSummaryRow}>
              <Text style={styles.shopSummaryLabel}>
                Selected from {shop.shop_name}:
              </Text>
              <Text style={styles.shopSummaryValue}>
                {selectedItems.length} of {shop.items.length}
              </Text>
            </View>
            <View style={styles.shopSummaryRow}>
              <Text style={styles.shopSummaryLabel}>Subtotal:</Text>
              <Text style={styles.shopSummaryTotal}>
                ₱{formatNumber(selectedTotal)}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

// Order Summary Component
const OrderSummary = ({
  subtotal,
  discount,
  itemCount,
  appliedVoucher,
  onRemoveVoucher,
  onProceedToCheckout,
  onVoucherIconPress,
}: {
  subtotal: number;
  discount: number;
  itemCount: number;
  appliedVoucher: CartTotals['applied_voucher'];
  onRemoveVoucher: () => void;
  onProceedToCheckout: () => void;
  onVoucherIconPress: () => void;
}) => {
  const total = subtotal - discount;

  return (
    <View style={styles.orderSummary}>
      <View style={styles.detailsContainer}>
        <View style={styles.summaryRowCompact}>
          <Text style={styles.summaryLabelCompact}>
            Subtotal ({itemCount} items)
          </Text>
          <Text style={styles.summaryValueCompact}>₱{formatNumber(subtotal)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.summaryRowCompact}>
            <Text style={[styles.summaryLabelCompact, { color: "#059669" }]}>
              Discount
            </Text>
            <Text style={[styles.summaryValueCompact, { color: "#059669" }]}>
              -₱{formatNumber(discount)}
            </Text>
          </View>
        )}

        {appliedVoucher && (
          <View style={styles.appliedVoucherContainer}>
            <View style={styles.appliedVoucherBadge}>
              <MaterialIcons name="local-offer" size={14} color="#059669" />
              <Text style={styles.appliedVoucherText} numberOfLines={1}>
                {appliedVoucher.code} • -₱{formatNumber(appliedVoucher.discount_amount)}
              </Text>
              <TouchableOpacity
                onPress={onRemoveVoucher}
                style={styles.removeVoucherButton}
              >
                <MaterialIcons name="close" size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.bottomActions}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <View style={styles.totalValueRow}>
            <Text style={styles.totalCurrency}>₱</Text>
            <Text style={styles.totalValue}>{formatNumber(total)}</Text>
          </View>
          {discount > 0 && (
            <Text style={styles.savedText}>
              You saved ₱{formatNumber(discount)}
            </Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.voucherIconButton}
            onPress={onVoucherIconPress}
          >
            <MaterialIcons name="local-offer" size={24} color="#F97316" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkoutButton,
              itemCount === 0 && styles.checkoutButtonDisabled,
            ]}
            onPress={onProceedToCheckout}
            disabled={itemCount === 0}
          >
            <Text style={styles.checkoutButtonText}>
              Checkout ({itemCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ------------------ MAIN COMPONENT ------------------
export default function CartPage() {
  const { loading: authLoading, userId } = useAuth();
  const [cartStores, setCartStores] = useState<CartStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [cartTotals, setCartTotals] = useState<CartTotals>({
    subtotal: 0,
    discount: 0,
    total: 0,
    applied_voucher: null
  });
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const fetchCartData = async (voucherCode?: string) => {
    if (!userId) {
      Alert.alert("Login Required", "Please login to view your cart");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = { user_id: userId };
      if (voucherCode) {
        params.voucher_code = voucherCode;
      }

      const response = await AxiosInstance.get<CartApiResponse>("/view-cart/", {
        params
      });

      if (response.data.success) {
        if (response.data.cart_items && response.data.cart_items.length > 0) {
          const transformedItems = transformApiData(response.data.cart_items);
          
          if (response.data.totals) {
            setCartTotals(response.data.totals);
          }

          if (response.data.available_vouchers) {
            setAvailableVouchers(response.data.available_vouchers);
          }

          if (response.data.voucher_error) {
            Alert.alert("Voucher Error", response.data.voucher_error);
          }

          const groupedItems = transformedItems.reduce<Record<string, CartStore>>(
            (acc, item) => {
              if (!acc[item.shop_id]) {
                acc[item.shop_id] = {
                  shop_id: item.shop_id,
                  shop_name: item.shop_name,
                  items: [],
                  selected: false,
                };
              }
              acc[item.shop_id].items.push(item);
              return acc;
            },
            {},
          );

          const storesArray: CartStore[] = Object.values(groupedItems);
          storesArray.forEach(store => {
            store.items.forEach(item => {
              item.selected = true;
            });
          });
          setCartStores(storesArray);
          updateTotalsFromStores(storesArray, response.data.totals.applied_voucher);
        } else {
          setCartStores([]);
          setCartTotals({
            subtotal: 0,
            discount: 0,
            total: 0,
            applied_voucher: null
          });
          setAvailableVouchers([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      
      if (error.response?.status !== 404) {
        Alert.alert("Error", "Failed to load cart items");
      }
      
      setCartStores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchCartData();
    }
  }, [authLoading, userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCartData();
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (!userId || newQuantity < 1) return;

    setUpdatingId(itemId);
    try {
      const response = await AxiosInstance.put(`/view-cart/update/${itemId}/`, {
        user_id: userId,
        quantity: newQuantity,
      });

      if (response.data.success) {
        setCartStores((prev) =>
          prev.map((store) => ({
            ...store,
            items: store.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    quantity: newQuantity,
                    subtotal: item.price * newQuantity,
                  }
                : item,
            ),
          })),
        );

        if (response.data.totals) {
          setCartTotals(response.data.totals);
        }
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      Alert.alert("Error", "Failed to update quantity");
      fetchCartData();
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!userId) return;

    setUpdatingId(itemId);
    try {
      const response = await AxiosInstance.delete(
        `/view-cart/delete/${itemId}/?user_id=${userId}`,
      );

      if (response.data.success) {
        setCartStores((prev) => {
          const newStores = prev
            .map((store) => ({
              ...store,
              items: store.items.filter((item) => item.id !== itemId),
            }))
            .filter((store) => store.items.length > 0);

          return newStores;
        });

        if (response.data.totals) {
          setCartTotals(response.data.totals);
        }
      }
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Failed to remove item");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeSelectedItems = async () => {
    const selectedIds = selectedItems.map((item) => item.id);
    if (selectedIds.length === 0) return;

    Alert.alert(
      "Remove Items",
      `Remove ${selectedIds.length} selected item(s) from cart?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await Promise.all(selectedIds.map((id) => removeItem(id)));
          },
        },
      ],
    );
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setCartStores((prev) => {
      const newStores = prev.map((store) => ({
        ...store,
        items: store.items.map((item) =>
          item.id === id ? { ...item, selected: checked } : item,
        ),
      }));
      
      updateTotalsFromStores(newStores);
      return newStores;
    });
  };

  const handleSelectShop = (shopId: string, checked: boolean) => {
    setCartStores((prev) => {
      const newStores = prev.map((store) =>
        store.shop_id === shopId
          ? {
              ...store,
              items: store.items.map((item) => ({
                ...item,
                selected: checked,
              })),
            }
          : store,
      );
      
      updateTotalsFromStores(newStores);
      return newStores;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setCartStores((prev) => {
      const newStores = prev.map((store) => ({
        ...store,
        items: store.items.map((item) => ({ ...item, selected: checked })),
      }));
      
      updateTotalsFromStores(newStores);
      return newStores;
    });
  };

  const updateTotalsFromStores = (stores: CartStore[], appliedVoucherData = cartTotals.applied_voucher) => {
    const allItems = stores.flatMap(store => store.items);
    const selected = allItems.filter(item => item.selected);
    
    const subtotal = selected.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    
    let discount = 0;
    if (appliedVoucherData) {
      if (appliedVoucherData.discount_type === 'percentage') {
        discount = (subtotal * appliedVoucherData.value) / 100;
      } else if (appliedVoucherData.discount_type === 'fixed') {
        discount = Math.min(appliedVoucherData.value, subtotal);
      }
    }
    
    const total = subtotal - discount;
    
    setCartTotals(prev => ({
      ...prev,
      subtotal,
      discount,
      total
    }));
  };

  const handleApplyVoucher = async (code: string) => {
    setIsApplyingVoucher(true);
    try {
      const voucher = availableVouchers.find(v => v.code === code);
      
      if (voucher && cartTotals.subtotal >= voucher.minimum_spend) {
        let discountAmount = 0;
        if (voucher.discount_type === 'percentage') {
          discountAmount = (cartTotals.subtotal * voucher.value) / 100;
        } else {
          discountAmount = Math.min(voucher.value, cartTotals.subtotal);
        }
        
        setCartTotals(prev => ({
          ...prev,
          discount: discountAmount,
          applied_voucher: {
            id: voucher.id,
            name: voucher.name,
            code: voucher.code,
            discount_type: voucher.discount_type,
            value: voucher.value,
            discount_amount: discountAmount
          }
        }));
        
        setVoucherModalVisible(false);
        Alert.alert("Success", "Voucher applied successfully!");
      } else {
        Alert.alert("Error", "Voucher not qualified or invalid");
      }
    } catch (error) {
      console.error("Error applying voucher:", error);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    fetchCartData();
  };

  const handleVoucherIconPress = () => {
    setVoucherModalVisible(true);
  };

  const allItems = cartStores.flatMap((store) => store.items);
  const selectedItems = allItems.filter((item) => item.selected);
  const allSelected =
    allItems.length > 0 && allItems.every((item) => item.selected);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select items to checkout");
      return;
    }

    const selectedIds = selectedItems.map((item) => item.id).join(",");
    const voucherParam = cartTotals.applied_voucher 
      ? `&voucher=${cartTotals.applied_voucher.id}` 
      : '';
    router.push(`/customer/checkout?selected=${selectedIds}${voucherParam}`);
  };

  if (authLoading || loading) {
    return (
      <CustomerLayout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </CustomerLayout>
    );
  }

  if (cartStores.length === 0) {
    return (
      <CustomerLayout>
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="shopping-cart" size={48} color="#F97316" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Add items from your favorite shops to get started
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/customer/home")}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout disableScroll={true}>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.cartHeader}>
          <View>
            <Text style={styles.shopName}>Shopping Cart</Text>
            <Text style={styles.pageTitle}>My Items ({allItems.length})</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => handleSelectAll(!allSelected)}
              style={styles.selectAllButton}
            >
              <Text style={styles.headerActionText}>
                {allSelected ? "Deselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
            {selectedItems.length > 0 && (
              <TouchableOpacity
                onPress={removeSelectedItems}
                style={styles.removeSelectedButton}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color="#EF4444"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#F97316"]}
              tintColor="#F97316"
            />
          }
          contentContainerStyle={styles.scrollViewContent}
        >
          {cartStores.map((store) => (
            <ShopSection
              key={store.shop_id}
              shop={store}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
              onSelectItem={handleSelectItem}
              onSelectShop={handleSelectShop}
              updatingId={updatingId}
            />
          ))}
          
          <View style={{ height: 180 }} />
        </ScrollView>

        <OrderSummary
          subtotal={cartTotals.subtotal}
          discount={cartTotals.discount}
          itemCount={selectedItems.length}
          appliedVoucher={cartTotals.applied_voucher}
          onRemoveVoucher={handleRemoveVoucher}
          onProceedToCheckout={handleCheckout}
          onVoucherIconPress={handleVoucherIconPress}
        />
      </View>

      <VoucherModal
        visible={voucherModalVisible}
        onClose={() => setVoucherModalVisible(false)}
        onApply={handleApplyVoucher}
        isApplying={isApplyingVoucher}
        availableVouchers={availableVouchers}
        cartSubtotal={cartTotals.subtotal}
      />
    </CustomerLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  shopButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shopName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerActionText: {
    fontSize: 12,
    color: "#F97316",
    fontWeight: "600",
  },
  removeSelectedButton: {
    padding: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  shopSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shopCheckbox: {
    marginRight: 8,
  },
  shopHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  shopIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  shopInfo: {
    flex: 1,
  },
  shopNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 1,
  },
  shopSummary: {
    fontSize: 11,
    color: "#6B7280",
  },
  itemsContainer: {
    paddingHorizontal: 12,
  },
  cartItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  itemContent: {
    flex: 1,
    marginLeft: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F97316",
  },
  variantText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemPriceEach: {
    fontSize: 11,
    color: "#6B7280",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qtyBtn: {
    padding: 4,
    paddingHorizontal: 8,
  },
  qtyBtnDisabled: {
    opacity: 0.5,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    minWidth: 24,
    textAlign: "center",
  },
  maxAvailableText: {
    fontSize: 10,
    color: "#F97316",
    marginBottom: 2,
  },
  shopSummaryContainer: {
    padding: 12,
    backgroundColor: "#FFF7ED",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
  },
  shopSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  shopSummaryLabel: {
    fontSize: 11,
    color: "#4B5563",
  },
  shopSummaryValue: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  shopSummaryTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F97316",
  },
  orderSummary: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  detailsContainer: {
    marginBottom: 8,
  },
  summaryRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabelCompact: {
    fontSize: 12,
    color: "#6B7280",
  },
  summaryValueCompact: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  appliedVoucherContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  appliedVoucherBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  appliedVoucherText: {
    fontSize: 11,
    color: "#059669",
    marginLeft: 4,
    marginRight: 4,
    fontWeight: "500",
    flex: 1,
  },
  removeVoucherButton: {
    padding: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  totalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalCurrency: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
    marginRight: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F97316",
  },
  savedText: {
    fontSize: 10,
    color: "#059669",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voucherIconButton: {
    padding: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
  },
  checkoutButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  noVouchersContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noVouchersText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  vouchersListModal: {
    maxHeight: 500,
  },
  voucherItemModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  voucherItemQualified: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F97316",
  },
  voucherItemNotQualified: {
    opacity: 0.7,
  },
  voucherInfoModal: {
    flex: 1,
    marginRight: 8,
  },
  voucherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  voucherCodeModal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F97316",
  },
  qualifiedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualifiedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  voucherNameModal: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  voucherDiscountModal: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "500",
    marginBottom: 2,
  },
  voucherMinimumModal: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  voucherShopModal: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  voucherApplyButtonModal: {
    backgroundColor: "#F97316",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  voucherApplyButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  voucherApplyTextModal: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  cartItemOutOfStock: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  checkboxDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  itemImageDimmed: {
    opacity: 0.5,
  },
  textDimmed: {
    color: '#9CA3AF',
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
});