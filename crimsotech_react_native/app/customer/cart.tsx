// app/(customer)/cart.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
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

interface CartApiResponse {
  success: boolean;
  cart_items: ApiCartItem[];
  error?: string;
}

interface CartCountResponse {
  success: boolean;
  count: number;
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
const DELIVERY_FEE = 50.0;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&q=80";

// ------------------ HELPER FUNCTIONS ------------------
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
      selected: true,
      added_at: item.added_at,
      subtotal,
      variant_title: variantLabel,
      max_available: maxAvailable,
    };
  });
};

// ------------------ COMPONENTS ------------------

// Coupon Modal Component
const CouponModal = ({
  visible,
  onClose,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    setIsApplying(true);
    try {
      await onApply(couponCode.trim());
      setCouponCode("");
      onClose();
    } finally {
      setIsApplying(false);
    }
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
            <Text style={styles.modalTitle}>Apply Coupon</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.couponInputContainer}>
              <MaterialIcons name="local-offer" size={20} color="#F97316" />
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                placeholderTextColor="#9CA3AF"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                editable={!isApplying}
              />
            </View>

            {isApplying ? (
              <View style={styles.applyButton}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  !couponCode.trim() && styles.applyButtonDisabled,
                ]}
                onPress={handleApply}
                disabled={!couponCode.trim()}
              >
                <Text style={styles.applyButtonText}>Apply Coupon</Text>
              </TouchableOpacity>
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
  itemCount,
  shopTotal,
  allSelected,
  onSelectShop,
  isExpanded,
  onToggleExpand,
}: {
  shopName: string;
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
        onPress={onToggleExpand}
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
            {shopTotal.toFixed(2)}
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

  const handleIncrement = () => {
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

  return (
    <View style={styles.cartItem}>
      <TouchableOpacity
        onPress={() => onSelect(item.id, !item.selected)}
        style={{ padding: 4 }} // Add some hit slop/padding instead of the checkbox style
        disabled={isUpdating}
      >
        <View
          style={[
            styles.checkbox,
            { marginRight: 0 }, // Remove margin from the box itself since we might want spacing on container
            item.selected && styles.checkboxChecked,
          ]}
        >
          {item.selected && (
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      <Image
        source={{ uri: imageError ? FALLBACK_IMAGE : item.image }}
        style={styles.itemImage}
        onError={() => setImageError(true)}
      />

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>
            ₱{(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>

        {item.variant_title && (
          <Text style={styles.variantText}>{item.variant_title}</Text>
        )}

        <View style={styles.itemDetails}>
          <Text style={styles.itemPriceEach}>
            ₱{item.price.toFixed(2)} each
          </Text>

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
              disabled={
                isUpdating ||
                (item.max_available !== undefined &&
                  item.quantity >= item.max_available)
              }
            >
              <MaterialIcons name="add" size={16} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        {item.max_available !== undefined &&
          item.quantity >= item.max_available && (
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
                ₱{selectedTotal.toFixed(2)}
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
  delivery,
  itemCount,
  shopCount,
  onApplyCoupon,
  onProceedToCheckout,
}: {
  subtotal: number;
  discount: number;
  delivery: number;
  itemCount: number;
  shopCount: number;
  onApplyCoupon: () => void;
  onProceedToCheckout: () => void;
}) => {
  const total = subtotal - discount + delivery;

  return (
    <View style={styles.orderSummary}>
      {/* Details Section */}
      <View style={styles.detailsContainer}>
        <View style={styles.summaryRowCompact}>
          <Text style={styles.summaryLabelCompact}>
            Subtotal ({itemCount} items)
          </Text>
          <Text style={styles.summaryValueCompact}>₱{subtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.summaryRowCompact}>
          <Text style={styles.summaryLabelCompact}>Delivery Fee</Text>
          <Text style={styles.summaryValueCompact}>₱{delivery.toFixed(2)}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.summaryRowCompact}>
            <Text style={[styles.summaryLabelCompact, { color: "#059669" }]}>
              Discount
            </Text>
            <Text style={[styles.summaryValueCompact, { color: "#059669" }]}>
              -₱{discount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryDivider} />

      {/* Bottom Action Section */}
      <View style={styles.compactContainer}>
        <View style={styles.totalInfoContainer}>
          <Text style={styles.totalLabelCompact}>Total Payment</Text>
          <View style={styles.totalValueRow}>
            <Text style={styles.totalCurrency}>₱</Text>
            <Text style={styles.totalValueCompact}>{total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.compactCouponBtn}
          onPress={onApplyCoupon}
        >
          <MaterialIcons name="local-offer" size={16} color="#F97316" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.checkoutBtnCompact,
            itemCount === 0 && styles.checkoutBtnDisabled,
          ]}
          onPress={onProceedToCheckout}
          disabled={itemCount === 0}
        >
          <Text style={styles.checkoutBtnTextCompact}>
            Checkout ({itemCount})
          </Text>
        </TouchableOpacity>
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
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);

  const fetchCartCount = async () => {
    if (!userId) return;
    try {
      const response = await AxiosInstance.get<CartCountResponse>(
        "/cart/count/",
        {
          params: { user_id: userId },
        },
      );
      if (response.data.success) {
        setCartCount(response.data.count);
      }
    } catch (err) {
      console.error("Error fetching cart count:", err);
    }
  };

  const fetchCartData = async () => {
    if (!userId) {
      Alert.alert("Login Required", "Please login to view your cart");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get<CartApiResponse>("/view-cart/", {
        params: { user_id: userId },
      });

      if (response.data.success && response.data.cart_items) {
        const transformedItems = transformApiData(response.data.cart_items);
        setCartCount(transformedItems.length);

        const groupedItems = transformedItems.reduce<Record<string, CartStore>>(
          (acc, item) => {
            if (!acc[item.shop_id]) {
              acc[item.shop_id] = {
                shop_id: item.shop_id,
                shop_name: item.shop_name,
                items: [],
                selected: true,
              };
            }
            acc[item.shop_id].items.push(item);
            return acc;
          },
          {},
        );

        const storesArray: CartStore[] = Object.values(groupedItems);
        setCartStores(storesArray);
      } else {
        setCartStores([]);
        setCartCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching cart:", error);

      let errorMessage = "Failed to load cart items";
      if (error.response?.status === 404) {
        errorMessage = "Cart is empty";
      } else if (error.response?.status === 401) {
        errorMessage = "Please login to view your cart";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      }

      Alert.alert("Error", errorMessage);
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

        fetchCartCount();
      } else {
        Alert.alert(
          "Error",
          response.data.error || "Failed to update quantity",
        );
      }
    } catch (error: any) {
      console.error("Error updating quantity:", error);

      let errorMessage = "Failed to update quantity";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.available_quantity) {
          errorMessage += `. Only ${error.response.data.available_quantity} available.`;
        }
      }

      Alert.alert("Error", errorMessage);
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
        `/view-cart/delete/${itemId}/`,
        {
          data: { user_id: userId },
        },
      );

      if (response.data.success) {
        setCartStores((prev) => {
          const newStores = prev
            .map((store) => ({
              ...store,
              items: store.items.filter((item) => item.id !== itemId),
            }))
            .filter((store) => store.items.length > 0);

          setCartCount(
            newStores.reduce((acc, store) => acc + store.items.length, 0),
          );
          return newStores;
        });
      } else {
        Alert.alert("Error", response.data.error || "Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Failed to remove item. Please try again.");
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
    setCartStores((prev) =>
      prev.map((store) => ({
        ...store,
        items: store.items.map((item) =>
          item.id === id ? { ...item, selected: checked } : item,
        ),
      })),
    );
  };

  const handleSelectShop = (shopId: string, checked: boolean) => {
    setCartStores((prev) =>
      prev.map((store) =>
        store.shop_id === shopId
          ? {
              ...store,
              items: store.items.map((item) => ({
                ...item,
                selected: checked,
              })),
            }
          : store,
      ),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setCartStores((prev) =>
      prev.map((store) => ({
        ...store,
        items: store.items.map((item) => ({ ...item, selected: checked })),
      })),
    );
  };

  const handleApplyCoupon = async (code: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    Alert.alert("Success", `Coupon "${code}" applied successfully!`);
  };

  const allItems = cartStores.flatMap((store) => store.items);
  const selectedItems = allItems.filter((item) => item.selected);
  const selectedShops = new Set(selectedItems.map((item) => item.shop_id)).size;

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = 0;
  const delivery = selectedItems.length > 0 ? DELIVERY_FEE : 0;
  const allSelected =
    allItems.length > 0 && allItems.every((item) => item.selected);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select items to checkout");
      return;
    }

    const selectedIds = selectedItems.map((item) => item.id).join(",");
    router.push(`/customer/checkout?selected=${selectedIds}`);
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
      <View style={{ flex: 1 }}>
        {/* Cart Header */}
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
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Shop Sections */}
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
        </ScrollView>

        {/* Order Summary - Floating/Fixed at bottom */}
        <OrderSummary
          subtotal={subtotal}
          discount={discount}
          delivery={delivery}
          itemCount={selectedItems.length}
          shopCount={selectedShops}
          onApplyCoupon={() => setCouponModalVisible(true)}
          onProceedToCheckout={handleCheckout}
        />
      </View>

      {/* Coupon Modal */}
      <CouponModal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        onApply={handleApplyCoupon}
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12, // Reduced padding
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 }, // Subtler shadow
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 12,
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
    fontSize: 11,
    color: "#6B7280",
  },
  summaryValueCompact: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  totalLabelCompact: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 0,
  },
  totalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalCurrency: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F97316",
    marginRight: 2,
  },
  totalValueCompact: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F97316",
  },
  savedText: {
    fontSize: 9,
    color: "#059669",
  },
  compactCouponBtn: {
    marginRight: 10,
    padding: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 6,
  },
  compactCouponText: {
    fontSize: 10,
    color: "#F97316",
    fontWeight: "600",
    marginLeft: 4,
  },
  checkoutBtnCompact: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  checkoutBtnTextCompact: {
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
  couponInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  couponInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#111827",
  },
  applyButton: {
    backgroundColor: "#F97316",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
