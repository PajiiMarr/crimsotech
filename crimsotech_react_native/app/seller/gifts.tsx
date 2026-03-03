import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";
import { router, Stack } from "expo-router";

const Comgift = () => {
  const { userId, shopId } = useAuth();
  const [gifts, setGifts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGifts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);

      const response = await AxiosInstance.get("/customer-products/", {
        params: { customer_id: userId },
        headers: {
          "X-User-Id": userId || "",
        },
      });

      if (response.data && response.data.success) {
        // Filter products with price = 0 (gifts)
        const zeroPriced = (response.data.products || [])
          .filter((p: any) => {
            const price = parseFloat(p.price || p.starting_price || "0");
            return !isNaN(price) && price === 0;
          })
          .map((p: any) => {
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

            return {
              ...p,
              total_stock: totalStock,
              condition: p.condition || "New",
              status: p.status || "active",
              upload_status: p.upload_status || "draft",
            };
          });
        setGifts(zeroPriced);
      } else {
        setGifts([]);
      }
    } catch (error) {
      console.error("Error fetching gifts:", error);
      setGifts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGifts(); // This will trigger the effect due to dependency or we can call logic directly
  };

  const handleDeleteGift = async (giftId: string) => {
    Alert.alert("Delete Gift", "Are you sure you want to delete this gift?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await AxiosInstance.delete(`/customer-products/${giftId}/`, {
              headers: { "X-User-Id": userId },
            });
            setGifts((prev) => prev.filter((g) => g.id !== giftId));
            setActionModalVisible(false);
          } catch (err) {
            Alert.alert("Error", "Failed to delete gift");
          }
        },
      },
    ]);
  };

  const giftLimitInfo = {
    current_count: gifts.length,
    limit: 500,
    remaining: Math.max(0, 500 - gifts.length),
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryName = (gift: any) => {
    return gift.category?.name || gift.category_admin?.name || "No Category";
  };

  const getVariantSummary = (variants: any[]) => {
    if (!variants || variants.length === 0) return "No variants";
    const activeVariants = variants.filter((v) => v.is_active !== false).length;
    return `${activeVariants} variant${activeVariants !== 1 ? "s" : ""}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#111827";
      case "inactive":
        return "#6b7280";
      default:
        return "#9ca3af";
    }
  };

  const getUploadStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "#111827";
      case "draft":
        return "#6b7280";
      case "archived":
        return "#9ca3af";
      default:
        return "#6b7280";
    }
  };

  // Preserve Overview colors as requested
  const renderStatCard = (
    title: string,
    value: number,
    icon: string,
    color: string,
    bgColor: string,
  ) => (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 10,
        padding: 10,
        width: "48%", // Adjusted for 2 per row
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        borderWidth: 1,
        borderColor: "#f3f4f6",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: color,
              marginBottom: 2,
            }}
          >
            {value}
          </Text>
          <Text style={{ fontSize: 10, color: "#6b7280" }}>{title}</Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon name={icon} size={16} color={color} />
        </View>
      </View>
    </View>
  );

  const renderGiftItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedGift(item);
          setActionModalVisible(true);
        }}
        activeOpacity={0.7}
        style={{
          backgroundColor: "white",
          borderRadius: 10, // Smaller radius
          padding: 10, // Smaller padding
          marginBottom: 8,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {/* Image placeholder */}
          <View
            style={{
              width: 50, // Smaller image
              height: 50,
              borderRadius: 8,
              backgroundColor: "#f9fafb",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Icon name="gift" size={20} color="#9ca3af" />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#111827",
                  flex: 1,
                  marginRight: 8,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Icon name="more-vertical" size={14} color="#9ca3af" />
            </View>

            {/* Status indicators and date */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: getStatusColor(item.status),
                      marginRight: 4,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#6b7280",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.status}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: getUploadStatusColor(item.upload_status),
                      marginRight: 4,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#6b7280",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.upload_status}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 9, color: "#9ca3af" }}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredGifts = gifts.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Stack.Screen
        options={{
          title: "My Gifts",
          headerTitleAlign: "center",
          headerTitleStyle: { color: "#111827" },
          headerTintColor: "#111827",
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#111827"]}
            tintColor="#111827"
          />
        }
      >
        <View style={{ padding: 12 }}>
          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={onRefresh}
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: "white",
                paddingVertical: 8, // Smaller padding
                paddingHorizontal: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <Icon
                name="refresh-cw"
                size={14}
                color="#6b7280"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ fontSize: 12, fontWeight: "500", color: "#374151" }}
              >
                Refresh
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push("/customer/create/add-selling-product-form")
              }
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: "#111827",
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#111827",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Icon
                name="plus"
                size={14}
                color="white"
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "white" }}>
                Add Gift
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards - Grid Layout */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 8,
                marginLeft: 2,
              }}
            >
              Overview
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {renderStatCard(
                "Total Gifts",
                gifts.length,
                "gift",
                "#7c3aed",
                "#f3e8ff",
              )}
              {renderStatCard(
                "Active",
                gifts.filter((g) => g.status === "active").length,
                "award",
                "#10b981",
                "#d1fae5",
              )}
              {renderStatCard(
                "Published",
                gifts.filter((g) => g.upload_status === "published").length,
                "eye",
                "#2563eb",
                "#dbeafe",
              )}
              {renderStatCard(
                "Out of Stock",
                gifts.filter((g) => g.total_stock === 0).length,
                "package",
                "#f97316",
                "#ffedd5",
              )}
            </View>
          </View>

          {/* Search and Filter */}
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                alignItems: "center",
                paddingHorizontal: 10,
                height: 38, // Smaller height
              }}
            >
              <Icon name="search" size={14} color="#9ca3af" />
              <TextInput
                placeholder="Search gifts..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  paddingVertical: 0,
                  paddingHorizontal: 8,
                  fontSize: 12,
                  color: "#111827",
                }}
              />
              <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
                <Icon name="filter" size={14} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gifts List Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              paddingHorizontal: 2,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
              Your Gifts
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}
              >
                {filteredGifts.length} items
              </Text>
            </View>
          </View>

          {/* Gifts List */}
          {loading && !refreshing ? (
            <ActivityIndicator
              size="small"
              color="#111827"
              style={{ marginTop: 20 }}
            />
          ) : filteredGifts.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 30,
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                marginTop: 10,
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#f3f4f6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Icon name="gift" size={20} color="#9ca3af" />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 2,
                }}
              >
                No gifts found
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  textAlign: "center",
                  marginBottom: 12,
                  paddingHorizontal: 40,
                  lineHeight: 16,
                }}
              >
                Create your first gift listing.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/customer/create/add-selling-product-form")
                }
                style={{
                  flexDirection: "row",
                  backgroundColor: "#111827",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  alignItems: "center",
                }}
              >
                <Icon
                  name="plus"
                  size={12}
                  color="white"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: "white" }}
                >
                  Create Gift
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredGifts}
              renderItem={renderGiftItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPressOut={() => setActionModalVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            {selectedGift && (
              <>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    {selectedGift.name}
                  </Text>
                </View>

                {/* Actions list simplified */}
                <TouchableOpacity
                  onPress={() => handleDeleteGift(selectedGift.id)}
                  style={{
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: "#fee2e2",
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#ef4444",
                      fontWeight: "600",
                    }}
                  >
                    Delete Gift
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActionModalVisible(false)}
                  style={{
                    marginTop: 8,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: "#f3f4f6",
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default Comgift;
