import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

const { width } = Dimensions.get("window");
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import AxiosInstance from "../../contexts/axios";
import CustomerLayout from "./CustomerLayout";

type ErrorType = "not_found" | "suspended" | "server" | "other";
type ActiveTab = "products" | "details" | "reviews";

interface ShopCategory {
  id: string;
  name: string;
}

interface ShopInfo {
  id: string;
  name?: string;
  description?: string;
  address?: string;
  contact_number?: string;
  rating?: number;
  rating_count?: number;
  total_products?: number;
  product_sold?: number;
  total_customers?: number;
  repeated_customers?: number;
  total_followers?: number;
  is_following?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string | null;
  shop_picture?: string | null;
  products?: ProductItem[];
  categories?: any[];
}

interface ProductItem {
  id: string;
  name?: string;
  description?: string;
  price?: number | string;
  compare_price?: number | string;
  condition?: string;
  open_for_swap?: boolean;
  image?: string;
  media_files?: { file_data?: string; file_url?: string }[];
  primary_image?: { url?: string };
  category?: any;
  category_admin?: any;
  shop?: {
    name?: string;
    shop_picture?: string;
  };
  is_gift?: boolean;
  listing_type?: string;
}

interface ShopReview {
  id: string;
  customer_name?: string;
  customer?: string;
  rating?: number;
  comment?: string;
}

const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url) return "https://via.placeholder.com/200";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, "") || "";
  if (!base) return url;

  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
};

const formatNumber = (value: number | null | undefined) => {
  if (value == null) return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n >= 1000) {
    const val = n / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
  }
  return String(n);
};

const getProductImage = (product: ProductItem) => {
  if (product?.primary_image?.url)
    return ensureAbsoluteUrl(product.primary_image.url);

  if (Array.isArray(product?.media_files) && product.media_files.length > 0) {
    return ensureAbsoluteUrl(
      product.media_files[0].file_data ||
        product.media_files[0].file_url ||
        null,
    );
  }

  if (product?.image) return ensureAbsoluteUrl(product.image);
  if (product?.shop?.shop_picture)
    return ensureAbsoluteUrl(product.shop.shop_picture);

  return "https://via.placeholder.com/200";
};

const getCategoryValue = (cat: any): { id: string; name: string } | null => {
  if (!cat) return null;
  if (typeof cat === "string") return { id: cat, name: cat };
  if (typeof cat === "object") {
    const id = String(cat.id || cat.uuid || cat.name || "");
    if (!id) return null;
    return { id, name: cat.name || id };
  }
  return null;
};

const ProductCard = ({ product }: { product: ProductItem }) => {
  const price = Number(product.price || 0);
  const comparePrice = Number(product.compare_price || 0);

  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.85}
      onPress={() =>
        router.push(`/customer/view-product?productId=${product.id}`)
      }
    >
      {product.open_for_swap ? (
        <View style={styles.swapBadge}>
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={12}
            color="#4338CA"
          />
          <Text style={styles.swapBadgeText}>Swap</Text>
        </View>
      ) : null}

      <Image
        source={{ uri: getProductImage(product) }}
        style={styles.productImage}
        resizeMode="cover"
      />

      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name || "Unnamed Product"}
        </Text>

        {!!product.shop?.name && (
          <Text style={styles.productShop} numberOfLines={1}>
            {product.shop.name}
          </Text>
        )}

        <View style={styles.priceRow}>
          {comparePrice > price && comparePrice > 0 ? (
            <Text style={styles.oldPrice}>₱{comparePrice.toFixed(2)}</Text>
          ) : null}
          <Text style={styles.price}>₱{price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ViewShopPage() {
  const params = useLocalSearchParams();
  const rawShopId = params.shopId;
  const shopId = Array.isArray(rawShopId) ? rawShopId[0] : rawShopId;

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>("other");

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Gift">("All");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Conditions list as requested
  const conditionOptions = [
    "Used - Excellent",
    "Used - Good",
    "Like New",
    "New",
    "Refurbished",
  ];

  useEffect(() => {
    if (!shopId) {
      setError("Shop ID is required");
      setLoading(false);
      return;
    }

    const fetchShopData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await AxiosInstance.get(`/shops/${shopId}/`);
        const data = response.data as ShopInfo;

        if (data.is_suspended) {
          setErrorType("suspended");
          setError(
            `This shop is currently suspended. Reason: ${data.suspension_reason || "Not specified"}`,
          );
          setShopInfo(data);
          setIsFollowing(!!data.is_following);
          setFollowersCount(Number(data.total_followers || 0));
          return;
        }

        setShopInfo(data);
        const prods = Array.isArray(data.products) ? data.products : [];

        setProducts(prods);
        setIsFollowing(!!data.is_following);
        setFollowersCount(Number(data.total_followers || 0));

        const rawCats = data.categories || [];
        if (Array.isArray(rawCats) && rawCats.length > 0) {
          const normalized = rawCats
            .map((c: any) => ({
              id: String(c.id || c.uuid || c.name || ""),
              name: c.name || String(c.id || c.uuid || c.name || ""),
            }))
            .filter((c: ShopCategory) => c.id && c.name);
          setCategories(normalized);
        } else {
          const map = new Map<string, string>();
          prods.forEach((p) => {
            [p.category, p.category_admin].forEach((cat) => {
              const parsed = getCategoryValue(cat);
              if (parsed) map.set(parsed.id, parsed.name);
            });
          });

          setCategories(
            Array.from(map.entries()).map(([id, name]) => ({ id, name })),
          );
        }
      } catch (err: any) {
        let errorMessage = "Failed to load shop data";
        let type: ErrorType = "other";

        if (err.response) {
          const { status, data } = err.response;

          switch (status) {
            case 404:
              type = "not_found";
              errorMessage = `Shop not found. The shop with ID "${shopId}" doesn't exist.`;
              break;
            case 403:
              type = "suspended";
              errorMessage = `Shop is suspended. ${data?.suspension_reason ? `Reason: ${data.suspension_reason}` : ""}`;
              setShopInfo(data);
              break;
            case 500:
              type = "server";
              errorMessage = "Server error. Please try again later.";
              break;
            default:
              errorMessage = `API Error (${status}): ${data?.detail || data?.error || "Unknown error"}`;
          }
        } else if (err.request) {
          type = "server";
          errorMessage = "No response from server. Check your connection.";
        } else {
          errorMessage = `Error: ${err.message}`;
        }

        setErrorType(type);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [shopId]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!shopId) return;
      setReviewsLoading(true);
      setReviewsError(null);

      try {
        const res = await AxiosInstance.get(`/shops/${shopId}/reviews/`);
        const data = res.data.reviews || res.data || [];
        setReviews(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e.response?.status === 404) {
          setReviews([]);
        } else {
          setReviewsError("Failed to load reviews");
        }
      } finally {
        setReviewsLoading(false);
      }
    };

    if (activeTab === "reviews") fetchReviews();
  }, [activeTab, shopId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (product.name || "").toLowerCase().includes(q) ||
        (product.description || "").toLowerCase().includes(q);

      const p = Number(product.price || 0);
      const min = minPrice === "" ? null : Number(minPrice);
      const max = maxPrice === "" ? null : Number(maxPrice);

      const matchesMin = min === null || (!Number.isNaN(min) && p >= min);
      const matchesMax = max === null || (!Number.isNaN(max) && p <= max);

      const matchesCondition =
        selectedCondition === "" ||
        (product.condition &&
          product.condition.toLowerCase() === selectedCondition.toLowerCase());

      const catMatch = (cat: any) => {
        if (!cat) return false;
        if (typeof cat === "string") return cat === selectedCategory;
        if (typeof cat === "object") {
          return (
            String(cat.id) === selectedCategory ||
            String(cat.uuid) === selectedCategory ||
            String(cat.name) === selectedCategory
          );
        }
        return false;
      };

      const matchesCategory =
        !selectedCategory ||
        catMatch(product.category) ||
        catMatch(product.category_admin);

      const matchesType =
        filterType === "All" ||
        (filterType === "Gift" &&
          (product.is_gift === true || product.listing_type === "gift"));

      return (
        matchesSearch &&
        matchesMin &&
        matchesMax &&
        matchesCondition &&
        matchesCategory &&
        matchesType
      );
    });
  }, [
    products,
    searchQuery,
    minPrice,
    maxPrice,
    selectedCondition,
    selectedCategory,
    filterType,
  ]);

  const handleFollowToggle = async () => {
    if (followLoading || !shopId) return;

    setFollowLoading(true);
    try {
      if (!isFollowing) {
        await AxiosInstance.post(`/shops/${shopId}/follow/`);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      } else {
        await AxiosInstance.delete(`/shops/${shopId}/unfollow/`);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (e) {
      console.error("Follow action failed", e);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll hideBottomTab={true}>
          <View style={styles.centeredBlock}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.mutedText}>Loading shop...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  if (error && !shopInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomerLayout disableScroll hideBottomTab={true}>
          <View style={styles.centeredBlock}>
            <Ionicons
              name={
                errorType === "not_found" ? "alert-circle" : "warning-outline"
              }
              size={48}
              color="#EF4444"
            />
            <Text style={styles.errorTitle}>
              {errorType === "not_found"
                ? "Shop Not Found"
                : "Unable to Load Shop"}
            </Text>
            <Text style={styles.errorText}>{error}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => router.push("/customer/messages")}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/customer/personal-listing")}
            style={styles.headerIconBtn}
          >
            <Ionicons name="swap-horizontal" size={24} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      <CustomerLayout disableScroll hideBottomTab={true} hideHeader={true}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {shopInfo ? (
            <View style={styles.headerCard}>
              {shopInfo.is_suspended ? (
                <View style={styles.suspendedBanner}>
                  <Ionicons name="warning-outline" size={16} color="#92400E" />
                  <Text style={styles.suspendedText} numberOfLines={2}>
                    Suspended:{" "}
                    {shopInfo.suspension_reason || "No reason provided"}
                  </Text>
                </View>
              ) : null}

              <View style={styles.shopTopRow}>
                <Image
                  source={{
                    uri: ensureAbsoluteUrl(shopInfo.shop_picture || null),
                  }}
                  style={styles.shopAvatar}
                />

                <View style={styles.shopMainInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.shopName} numberOfLines={1}>
                      {shopInfo.name || "Shop"}
                    </Text>

                    <TouchableOpacity
                      style={styles.followBtn}
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                    >
                      <Ionicons
                        name={isFollowing ? "heart" : "heart-outline"}
                        size={14}
                        color={isFollowing ? "#DC2626" : "#4B5563"}
                      />
                      <Text style={styles.followBtnText}>
                        {followLoading
                          ? "..."
                          : isFollowing
                            ? "Following"
                            : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!!shopInfo.description && (
                    <Text style={styles.shopDescription} numberOfLines={2}>
                      {shopInfo.description}
                    </Text>
                  )}

                  {!!shopInfo.address && (
                    <View style={styles.inlineRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#6B7280"
                      />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {shopInfo.address}
                      </Text>
                    </View>
                  )}

                  <View style={styles.inlineRow}>
                    <Ionicons name="people-outline" size={13} color="#6B7280" />
                    <Text style={styles.smallMeta}>
                      {followersCount} followers
                    </Text>
                    {shopInfo.rating ? (
                      <>
                        <Ionicons
                          name="star"
                          size={13}
                          color="#F59E0B"
                          style={styles.metaIconGap}
                        />
                        <Text style={styles.smallMeta}>
                          {shopInfo.rating} ({shopInfo.rating_count || 0})
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.tabBar}>
            {(["products", "details", "reviews"] as ActiveTab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      active && styles.tabBtnTextActive,
                    ]}
                  >
                    {tab === "products"
                      ? "Products"
                      : tab === "details"
                        ? "Shop Details"
                        : "Reviews"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === "products" ? (
            <View>
              <View style={styles.filterContainer}>
                <View style={styles.searchWrap}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#9CA3AF"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search in this shop..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.searchInput}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={styles.filterBtn}
                >
                  <Ionicons name="options-outline" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeader}>Categories</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCategory("")}
                  style={styles.categoryItem}
                >
                  <View
                    style={[
                      styles.categoryCircle,
                      selectedCategory === "" && styles.categoryCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryLetter,
                        selectedCategory === "" && styles.categoryLetterActive,
                      ]}
                    >
                      All
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === "" && styles.categoryLabelActive,
                    ]}
                    // Removed numberOfLines={1} to show full name
                  >
                    All
                  </Text>
                </TouchableOpacity>

                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  const letter = cat.name
                    ? cat.name.charAt(0).toUpperCase()
                    : "?";
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(active ? "" : cat.id)}
                      style={styles.categoryItem}
                    >
                      <View
                        style={[
                          styles.categoryCircle,
                          active && styles.categoryCircleActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryLetter,
                            active && styles.categoryLetterActive,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          active && styles.categoryLabelActive,
                        ]}
                        // Removed numberOfLines={1} here too
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.productsGrid}>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <View style={styles.emptyBlock}>
                    <Ionicons name="cube-outline" size={36} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No products found</Text>
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? "Try a different search term"
                        : "This shop has no products yet"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Filter Modal */}
          <Modal
            visible={showFilterModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowFilterModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color="#111" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                >
                  {/* Price Range */}
                  <Text style={styles.sectionHeader}>Price Range</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      value={minPrice}
                      onChangeText={setMinPrice}
                      placeholder="Min (₱)"
                      keyboardType="numeric"
                      style={[styles.priceInput, { flex: 1 }]}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      placeholder="Max (₱)"
                      keyboardType="numeric"
                      style={[styles.priceInput, { flex: 1 }]}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Listing Type / Gift */}
                  <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
                    Listing Type
                  </Text>
                  <View style={styles.choiceRow}>
                    {(["All", "Gift"] as const).map((t) => {
                      const active = filterType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setFilterType(t)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {t === "All" ? "All Items" : "Gifts"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Condition */}
                  <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
                    Condition
                  </Text>
                  <View style={styles.choiceWrap}>
                    <TouchableOpacity
                      onPress={() => setSelectedCondition("")}
                      style={[
                        styles.chip,
                        selectedCondition === "" && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedCondition === "" && styles.chipTextActive,
                        ]}
                      >
                        Any
                      </Text>
                    </TouchableOpacity>
                    {conditionOptions.map((cond) => {
                      const active = selectedCondition === cond;
                      return (
                        <TouchableOpacity
                          key={cond}
                          onPress={() =>
                            setSelectedCondition(active ? "" : cond)
                          }
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {cond}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalApplyButton}
                    onPress={() => setShowFilterModal(false)}
                  >
                    <Text style={styles.modalApplyButtonText}>
                      Show Results
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {activeTab === "details" && shopInfo ? (
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>About this shop</Text>
              <Text style={styles.sectionText}>
                {shopInfo.description || "No description provided."}
              </Text>

              {!!shopInfo.address && (
                <Text style={styles.rowText}>Address: {shopInfo.address}</Text>
              )}
              {!!shopInfo.contact_number && (
                <Text style={styles.rowText}>
                  Contact: {shopInfo.contact_number}
                </Text>
              )}

              <View style={styles.detailsStatsRow}>
                <View>
                  <Text style={styles.miniLabel}>Followers</Text>
                  <Text style={styles.miniValue}>
                    {formatNumber(followersCount)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.miniLabel}>Rating</Text>
                  <Text style={styles.miniValue}>
                    {shopInfo.rating ? `${shopInfo.rating} / 5` : "0 / 5"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.miniLabel}>Products</Text>
                  <Text style={styles.miniValue}>
                    {formatNumber(shopInfo.total_products)}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === "reviews" ? (
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <Text style={styles.sectionSubTitle}>
                {shopInfo?.rating
                  ? `${shopInfo.rating} average • ${shopInfo.rating_count || 0} reviews`
                  : "No ratings yet"}
              </Text>

              {reviewsLoading ? (
                <ActivityIndicator color="#EA580C" />
              ) : reviewsError ? (
                <Text style={styles.errorText}>{reviewsError}</Text>
              ) : reviews.length === 0 ? (
                <Text style={styles.sectionText}>No reviews available.</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewName}>
                        {r.customer_name || r.customer || "Anonymous"}
                      </Text>
                      <Text style={styles.reviewRating}>
                        {Number(r.rating || 0).toFixed(1)} / 5
                      </Text>
                    </View>
                    <Text style={styles.reviewComment}>
                      {r.comment || "No comment."}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </ScrollView>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: "#F8F9FA",
  },
  centeredBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    backgroundColor: "#F8F9FA",
  },
  mutedText: {
    color: "#6B7280",
    fontSize: 14,
  },
  errorTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  suspendedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#FEF3C7",
  },
  suspendedText: {
    color: "#92400E",
    fontSize: 12,
    flex: 1,
  },
  shopTopRow: {
    flexDirection: "row",
    gap: 10,
  },
  shopAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E5E7EB",
  },
  shopMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  followBtnText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  shopDescription: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 12,
  },
  inlineRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addressText: {
    color: "#6B7280",
    fontSize: 12,
    flex: 1,
  },
  smallMeta: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  metaIconGap: {
    marginLeft: 8,
  },

  tabBar: {
    marginTop: 12,
    marginBottom: 10,
    marginHorizontal: 12,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#EA580C",
  },
  tabBtnText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#111827",
    fontSize: 14,
  },
  filterRow: {
    gap: 8,
  },
  priceInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    color: "#111827",
  },
  conditionScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 12,
  },
  categoriesRow: {
    marginTop: 0,
    marginBottom: 10,
    gap: 12,
    paddingRight: 20,
    paddingLeft: 12,
  },
  categoryItem: {
    alignItems: "center",
    width: 64,
  },
  customHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    height: "100%",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  categoryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryCircleActive: {
    backgroundColor: "#FFF7ED",
  },
  categoryLetter: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryLetterActive: {
    color: "#EA580C",
  },
  categoryLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  categoryLabelActive: {
    color: "#EA580C",
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 0,
    marginBottom: 10,
    marginHorizontal: 12,
  },
  filterBtn: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnText: {
    display: "none",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalApplyButton: {
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalApplyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
  },
  productCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
  },
  swapBadge: {
    position: "absolute",
    zIndex: 2,
    top: 8,
    left: 8,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swapBadgeText: {
    color: "#EA580C",
    fontSize: 10,
    fontWeight: "700",
  },
  productImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#F3F4F6",
  },
  productBody: {
    padding: 10,
  },
  productName: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
    minHeight: 30,
    marginBottom: 3,
    lineHeight: 15,
  },
  productShop: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 10,
    marginBottom: 8,
  },
  priceRow: {
    marginTop: "auto",
  },
  oldPrice: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontSize: 11,
  },
  price: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyBlock: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyText: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 12,
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionSubTitle: {
    color: "#6B7280",
    fontSize: 12,
  },
  sectionText: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
  },
  rowText: {
    color: "#4B5563",
    fontSize: 13,
  },
  detailsStatsRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  miniLabel: {
    color: "#6B7280",
    fontSize: 12,
  },
  miniValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewName: {
    color: "#111827",
    fontWeight: "600",
    flex: 1,
  },
  reviewRating: {
    color: "#6B7280",
    fontSize: 12,
  },
  reviewComment: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 13,
  },
});
