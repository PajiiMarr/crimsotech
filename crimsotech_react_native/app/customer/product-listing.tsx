import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import RoleGuard from "../guards/RoleGuard";
import CustomerLayout from "./CustomerLayout";
import AxiosInstance from "../../contexts/axios";
import { router } from "expo-router";

const PRODUCT_LIMIT = 20;

interface Variant {
  id: string;
  title: string;
  quantity: number;
  sku_code?: string;
  critical_trigger?: number;
  is_active: boolean;
  image?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  total_stock: number;
  status: "active" | "inactive" | "draft";
  upload_status: "draft" | "published" | "archived";
  condition: string;
  category: { id: string; name: string } | null;
  category_admin: { id: string; name: string } | null;
  variants: Variant[];
  primary_image?: string | null;
  created_at: string;
  updated_at: string;
  is_removed?: boolean;
  removal_reason?: string;
}

interface ProductLimitInfo {
  current_count: number;
  limit: number;
  remaining: number;
}

interface BadgeColors {
  bg: string;
  text: string;
}

// Helper function to format image URL
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

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

export default function ProductListing() {
  const { userId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [productLimitInfo, setProductLimitInfo] = useState<ProductLimitInfo>({
    current_count: 0,
    limit: PRODUCT_LIMIT,
    remaining: PRODUCT_LIMIT,
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [removalModalVisible, setRemovalModalVisible] = useState(false);
  const [selectedRemovalReason, setSelectedRemovalReason] = useState("");

  const fetchProducts = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await AxiosInstance.get("/customer-products/", {
        params: { customer_id: userId },
      });

      if (response.data && response.data.success) {
        const mappedProducts = (response.data.products || []).map((p: any) => {
          let totalStock = 0;
          if (p.variants && Array.isArray(p.variants)) {
            totalStock = p.variants.reduce((sum: number, v: any) => {
              return sum + (parseInt(v.quantity) || 0);
            }, 0);
          } else if (p.total_stock) {
            totalStock = parseInt(p.total_stock) || 0;
          } else if (p.quantity) {
            totalStock = parseInt(p.quantity) || 0;
          }

          let primaryImage = null;
          if (p.primary_image?.url) {
            primaryImage = formatImageUrl(p.primary_image.url);
          } else if (
            p.media_files &&
            Array.isArray(p.media_files) &&
            p.media_files.length > 0
          ) {
            const firstMedia = p.media_files[0];
            primaryImage = formatImageUrl(
              firstMedia.file_url || firstMedia.file_data,
            );
          } else if (p.variants && Array.isArray(p.variants)) {
            const variantWithImage = p.variants.find((v: any) => v.image);
            if (variantWithImage) {
              primaryImage = formatImageUrl(variantWithImage.image);
            }
          }

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            total_stock: totalStock,
            status: p.status || "active",
            upload_status: p.upload_status || "draft",
            condition: p.condition || "New",
            category: p.category || null,
            category_admin: p.category_admin || null,
            variants: p.variants || [],
            primary_image: primaryImage,
            created_at: p.created_at,
            updated_at: p.updated_at,
            is_removed: p.is_removed,
            removal_reason: p.removal_reason,
          };
        });

        setProducts(mappedProducts);

        const currentCount = mappedProducts.filter((p) => !p.is_removed).length;
        setProductLimitInfo({
          current_count: currentCount,
          limit: PRODUCT_LIMIT,
          remaining: Math.max(0, PRODUCT_LIMIT - currentCount),
        });
      } else {
        setProducts([]);
        setProductLimitInfo({
          current_count: 0,
          limit: PRODUCT_LIMIT,
          remaining: PRODUCT_LIMIT,
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/customer/view-product?productId=${productId}`);
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/customer/edit-product/${productId}` as any);
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      "Delete Product",
      "Delete this product permanently? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(productId);
            try {
              await AxiosInstance.delete(
                `/customer-products-viewset/${productId}/delete_product/`,
                {
                  params: { user_id: userId },
                },
              );
              setProducts((prev) => prev.filter((p) => p.id !== productId));
              setProductLimitInfo((prev) => ({
                ...prev,
                current_count: prev.current_count - 1,
                remaining: prev.remaining + 1,
              }));
              Alert.alert("Success", "Product deleted successfully");
            } catch (error: any) {
              console.error("Error deleting product:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete product",
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleArchive = async (productId: string) => {
    setActionLoading(productId);
    try {
      await AxiosInstance.put("/customer-products/update_product_status/", {
        product_id: productId,
        action_type: "archive",
        user_id: userId,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, upload_status: "archived" } : p,
        ),
      );
      Alert.alert("Archived", "Product has been archived");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to archive");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (productId: string) => {
    setActionLoading(productId);
    try {
      await AxiosInstance.put("/customer-products/update_product_status/", {
        product_id: productId,
        action_type: "restore",
        user_id: userId,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, upload_status: "published" } : p,
        ),
      );
      Alert.alert("Restored", "Product has been restored");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to restore");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUploadStatus = (product: Product) => {
    if (product.upload_status === "published") {
      handleArchive(product.id);
    } else if (product.upload_status === "archived") {
      handleRestore(product.id);
    } else if (product.upload_status === "draft") {
      Alert.alert(
        "Publish Product",
        "Are you sure you want to publish this product?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Publish",
            onPress: async () => {
              setActionLoading(product.id);
              try {
                await AxiosInstance.put(
                  "/customer-products/update_product_status/",
                  {
                    product_id: product.id,
                    action_type: "publish",
                    user_id: userId,
                  },
                );
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === product.id
                      ? { ...p, upload_status: "published" }
                      : p,
                  ),
                );
                Alert.alert("Published", "Product has been published");
              } catch (error: any) {
                Alert.alert(
                  "Error",
                  error.response?.data?.error || "Failed to publish",
                );
              } finally {
                setActionLoading(null);
              }
            },
          },
        ],
      );
    }
  };

  const handleViewRemovalReason = (reason?: string) => {
    setSelectedRemovalReason(reason || "No removal reason provided.");
    setRemovalModalVisible(true);
  };

  const openActionModal = (product: Product) => {
    setSelectedProduct(product);
    setActionModalVisible(true);
  };

  const getStockStatusColor = (stock: number): string => {
    if (stock === 0) return "#EF4444";
    if (stock < 10) return "#F59E0B";
    return "#10B981";
  };

  const getStockStatusText = (stock: number): string => {
    if (stock === 0) return "Out of Stock";
    if (stock < 10) return `Low Stock (${stock})`;
    return `In Stock (${stock})`;
  };

  const getStatusBadgeColor = (status: string): BadgeColors => {
    switch (status) {
      case "active":
        return { bg: "#D1FAE5", text: "#10B981" };
      case "inactive":
        return { bg: "#F3F4F6", text: "#6B7280" };
      case "draft":
        return { bg: "#FEF3C7", text: "#F59E0B" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getUploadStatusBadgeColor = (status: string): BadgeColors => {
    switch (status) {
      case "published":
        return { bg: "#D1FAE5", text: "#10B981" };
      case "draft":
        return { bg: "#FEF3C7", text: "#F59E0B" };
      case "archived":
        return { bg: "#F3F4F6", text: "#6B7280" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getCategoryName = (product: Product): string => {
    return (
      product.category?.name || product.category_admin?.name || "No Category"
    );
  };

  const getVariantSummary = (variants: Variant[]): string => {
    if (!variants || variants.length === 0) return "No variants";
    const activeVariants = variants.filter((v) => v.is_active !== false).length;
    return `${activeVariants} variant${activeVariants !== 1 ? "s" : ""}`;
  };

  const usagePercentage =
    (productLimitInfo.current_count / productLimitInfo.limit) * 100;
  const isLimitReached = productLimitInfo.remaining === 0;
  const isNearLimit = productLimitInfo.remaining <= 5 && !isLimitReached;

  const activeCount = products.filter(
    (p) => p.status === "active" && !p.is_removed,
  ).length;
  const removedCount = products.filter((p) => p.is_removed).length;
  const outOfStockCount = products.filter(
    (p) => p.total_stock === 0 && !p.is_removed,
  ).length;
  const publishedCount = products.filter(
    (p) => p.upload_status === "published" && !p.is_removed,
  ).length;

  if (loading && !refreshing) {
    return (
      <RoleGuard allowedRoles={["customer"]}>
        <CustomerLayout>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading your listings...</Text>
          </View>
        </CustomerLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["customer"]}>
      <CustomerLayout>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#F97316"]}
              tintColor="#F97316"
            />
          }
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Personal Listings</Text>
              <Text style={styles.subtitle}>
                Manage your personal products (max {PRODUCT_LIMIT} products)
              </Text>
            </View>

            {/* Product Limit Alert */}
            {isLimitReached ? (
              <View style={[styles.alertCard, styles.alertError]}>
                <MaterialIcons name="warning" size={20} color="#EF4444" />
                <Text style={styles.alertErrorText}>
                  You have reached the maximum limit of {PRODUCT_LIMIT}{" "}
                  products.
                </Text>
              </View>
            ) : isNearLimit ? (
              <View style={[styles.alertCard, styles.alertWarning]}>
                <MaterialIcons name="info" size={20} color="#F59E0B" />
                <Text style={styles.alertWarningText}>
                  Only {productLimitInfo.remaining} slot
                  {productLimitInfo.remaining !== 1 ? "s" : ""} remaining out of{" "}
                  {PRODUCT_LIMIT}.
                </Text>
              </View>
            ) : null}

            {/* Product Limit Progress Card */}
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Text style={styles.limitTitle}>Product Limit Usage</Text>
                <Text
                  style={[
                    styles.limitCount,
                    isLimitReached && styles.limitCountDanger,
                    isNearLimit && !isLimitReached && styles.limitCountWarning,
                  ]}
                >
                  {productLimitInfo.current_count}/{productLimitInfo.limit}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(usagePercentage, 100)}%` },
                    isLimitReached && styles.progressFillDanger,
                    isNearLimit &&
                      !isLimitReached &&
                      styles.progressFillWarning,
                  ]}
                />
              </View>
              <Text style={styles.limitRemaining}>
                {productLimitInfo.remaining} slots remaining
              </Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {products.filter((p) => !p.is_removed).length}
                </Text>
                <Text style={styles.statLabel}>Total Products</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#10B981" }]}>
                  {activeCount}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#EF4444" }]}>
                  {removedCount}
                </Text>
                <Text style={styles.statLabel}>Removed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                  {outOfStockCount}
                </Text>
                <Text style={styles.statLabel}>Out of Stock</Text>
              </View>
            </View>

            {/* Add Product Button */}
            <TouchableOpacity
              style={[
                styles.addButton,
                isLimitReached && styles.addButtonDisabled,
              ]}
              onPress={() =>
                !isLimitReached &&
                router.push("/customer/components/listing-create-product")
              }
              disabled={isLimitReached}
            >
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>

            {/* Products List */}
            {products.filter((p) => !p.is_removed).length === 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="inventory" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                  You haven't created any personal listings yet.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.emptyButton,
                    isLimitReached && styles.addButtonDisabled,
                  ]}
                  onPress={() =>
                    !isLimitReached &&
                    router.push("/customer/components/listing-create-product")
                  }
                  disabled={isLimitReached}
                >
                  <MaterialIcons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>
                    Create Your First Product
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listContent}>
                {products
                  .filter((p) => !p.is_removed)
                  .map((product) => {
                    const statusColors = getStatusBadgeColor(product.status);
                    const uploadStatusColors = getUploadStatusBadgeColor(
                      product.upload_status,
                    );

                    return (
                      <View key={product.id} style={styles.productCard}>
                        <View style={styles.productHeader}>
                          <TouchableOpacity
                            style={styles.productImageContainer}
                            onPress={() => handleViewProduct(product.id)}
                          >
                            {product.primary_image ? (
                              <Image
                                source={{ uri: product.primary_image }}
                                style={styles.productImage}
                              />
                            ) : (
                              <View style={styles.productImagePlaceholder}>
                                <MaterialIcons
                                  name="image"
                                  size={24}
                                  color="#9CA3AF"
                                />
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={styles.productInfo}>
                            <TouchableOpacity
                              onPress={() => handleViewProduct(product.id)}
                            >
                              <Text style={styles.productName}>
                                {product.name}
                              </Text>
                              <Text
                                style={styles.productDescription}
                                numberOfLines={2}
                              >
                                {product.description?.substring(0, 80)}
                              </Text>
                            </TouchableOpacity>

                            <View style={styles.badgeContainer}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  { backgroundColor: statusColors.bg },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusText,
                                    { color: statusColors.text },
                                  ]}
                                >
                                  {product.status}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.statusBadge,
                                  { backgroundColor: uploadStatusColors.bg },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusText,
                                    { color: uploadStatusColors.text },
                                  ]}
                                >
                                  {product.upload_status}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.moreButton}
                            onPress={() => openActionModal(product)}
                          >
                            <MaterialIcons
                              name="more-vert"
                              size={20}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.productDetails}>
                          <View style={styles.detailRow}>
                            <MaterialIcons
                              name="category"
                              size={14}
                              color="#9CA3AF"
                            />
                            <Text style={styles.detailLabel}>Category:</Text>
                            <Text style={styles.detailValue}>
                              {getCategoryName(product)}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <MaterialIcons
                              name="layers"
                              size={14}
                              color="#9CA3AF"
                            />
                            <Text style={styles.detailLabel}>Variants:</Text>
                            <Text style={styles.detailValue}>
                              {getVariantSummary(product.variants)}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <MaterialIcons
                              name="event"
                              size={14}
                              color="#9CA3AF"
                            />
                            <Text style={styles.detailLabel}>Added:</Text>
                            <Text style={styles.detailValue}>
                              {formatDate(product.created_at)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.productFooter}>
                          <View
                            style={[
                              styles.stockBadge,
                              {
                                backgroundColor:
                                  getStockStatusColor(product.total_stock) +
                                  "20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stockText,
                                {
                                  color: getStockStatusColor(
                                    product.total_stock,
                                  ),
                                },
                              ]}
                            >
                              {getStockStatusText(product.total_stock)}
                            </Text>
                          </View>
                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={() => handleViewProduct(product.id)}
                            >
                              <MaterialIcons
                                name="visibility"
                                size={20}
                                color="#3B82F6"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={() => handleEditProduct(product.id)}
                            >
                              <MaterialIcons
                                name="edit"
                                size={20}
                                color="#F97316"
                              />
                            </TouchableOpacity>
                            {actionLoading === product.id ? (
                              <ActivityIndicator size="small" color="#9CA3AF" />
                            ) : (
                              <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => handleDeleteProduct(product.id)}
                              >
                                <MaterialIcons
                                  name="delete"
                                  size={20}
                                  color="#EF4444"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                <View style={{ height: 40 }} />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Modal */}
        <Modal
          visible={actionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActionModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Product Actions</Text>
                <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                  <MaterialIcons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <>
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setActionModalVisible(false);
                      handleViewProduct(selectedProduct.id);
                    }}
                  >
                    <MaterialIcons
                      name="visibility"
                      size={20}
                      color="#3B82F6"
                    />
                    <Text style={styles.modalItemText}>View Product</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setActionModalVisible(false);
                      handleEditProduct(selectedProduct.id);
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color="#F97316" />
                    <Text style={styles.modalItemText}>Edit Product</Text>
                  </TouchableOpacity>

                  {selectedProduct.upload_status === "published" && (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleArchive(selectedProduct.id);
                      }}
                    >
                      <MaterialIcons name="archive" size={20} color="#6B7280" />
                      <Text style={styles.modalItemText}>Archive</Text>
                    </TouchableOpacity>
                  )}

                  {selectedProduct.upload_status === "archived" && (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleRestore(selectedProduct.id);
                      }}
                    >
                      <MaterialIcons name="restore" size={20} color="#10B981" />
                      <Text style={styles.modalItemText}>Restore</Text>
                    </TouchableOpacity>
                  )}

                  {selectedProduct.upload_status === "draft" && (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        handleToggleUploadStatus(selectedProduct);
                      }}
                    >
                      <MaterialIcons name="publish" size={20} color="#8B5CF6" />
                      <Text style={styles.modalItemText}>Publish</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.modalDivider} />

                  <TouchableOpacity
                    style={[styles.modalItem, styles.modalItemDelete]}
                    onPress={() => {
                      setActionModalVisible(false);
                      handleDeleteProduct(selectedProduct.id);
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                    <Text style={styles.modalItemDeleteText}>
                      Delete Product
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Removal Reason Modal */}
        <Modal
          visible={removalModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRemovalModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setRemovalModalVisible(false)}
          >
            <View style={styles.removalModalContent}>
              <View style={styles.modalHeader}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <MaterialIcons name="warning" size={20} color="#EF4444" />
                  <Text style={[styles.modalTitle, { color: "#EF4444" }]}>
                    Product Removal Reason
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRemovalModalVisible(false)}>
                  <MaterialIcons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.removalReasonContainer}>
                <Text style={styles.removalReasonText}>
                  {selectedRemovalReason}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removalCloseButton}
                onPress={() => setRemovalModalVisible(false)}
              >
                <Text style={styles.removalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </CustomerLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  alertCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    alignItems: "center",
  },
  alertError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  alertWarning: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  alertWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#D97706",
  },
  limitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  limitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  limitTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  limitCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  limitCountWarning: {
    color: "#D97706",
  },
  limitCountDanger: {
    color: "#DC2626",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  progressFillWarning: {
    backgroundColor: "#D97706",
  },
  progressFillDanger: {
    backgroundColor: "#DC2626",
  },
  limitRemaining: {
    fontSize: 11,
    color: "#6B7280",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  addButton: {
    backgroundColor: "#F97316",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginRight: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  moreButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  productDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: 55,
  },
  detailValue: {
    fontSize: 12,
    color: "#111827",
    flex: 1,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "80%",
    maxWidth: 300,
    padding: 16,
  },
  removalModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "85%",
    maxWidth: 350,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  modalItemText: {
    fontSize: 14,
    color: "#374151",
  },
  modalItemDelete: {
    marginTop: 4,
  },
  modalItemDeleteText: {
    fontSize: 14,
    color: "#EF4444",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  removalReasonContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  removalReasonText: {
    fontSize: 14,
    color: "#DC2626",
    lineHeight: 20,
  },
  removalCloseButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  removalCloseButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
});
