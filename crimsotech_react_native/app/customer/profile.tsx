import { useAuth } from "../../contexts/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import CustomerLayout from "./CustomerLayout";
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  TextInput,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AxiosInstance from "../../contexts/axios";
import { getUserShops } from "../../utils/api";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  contact_number: string;
  date_of_birth: string | null;
  age: number | null;
  sex: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  state: string;
  zip_code: string;
  country: string;
  is_admin: boolean;
  is_customer: boolean;
  is_moderator: boolean;
  is_rider: boolean;
  registration_stage: number | null;
  created_at: string;
  updated_at: string;
  has_profile_picture?: boolean;
  profile_picture_url?: string | null;
  is_complete_profile?: boolean;
  registration_complete?: boolean;
}

interface CustomerData {
  customer: string | null;
  product_limit: number;
  current_product_count: number;
  is_customer: boolean;
  can_add_product: boolean;
  products_remaining: number;
  has_max_products?: boolean;
  customer_since?: string;
  product_limit_info?: string;
  can_manage_shop?: boolean;
}

interface ShopData {
  id: string;
  name: string;
  description: string;
  shop_picture: string | null;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: string;
  created_at: string;
  is_suspended: boolean;
  suspended_until: string | null;
  follower_count: number;
  is_following: boolean;
  is_active: boolean;
  location: string;
}

interface ProfileResponse {
  success: boolean;
  profile: {
    user: UserProfile;
    customer: CustomerData;
    shop: ShopData | null;
  };
}

interface WalletData {
  wallet_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
  lifetime_earnings: number;
  lifetime_withdrawals: number;
  pending_withdrawals: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  status: "completed" | "pending" | "failed";
  source_type: string;
  shop_id?: string;
  shop_name?: string;
  order_id?: string;
}

interface WithdrawalRequest {
  withdrawal_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "processing" | "completed";
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  admin_proof?: string;
  admin_proof_url?: string;
  rejection_reason?: string;
}

interface PaymentMethod {
  payment_id: string;
  payment_method: string;
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

interface MonthlyData {
  month: string;
  credits: number;
  debits: number;
  net: number;
}

interface ShopFilter {
  id: string;
  name: string;
  shop_picture?: string | null;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type ActiveTab = "profile" | "addresses" | "payments" | "finance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
  const num = isNaN(amount) ? 0 : amount;
  return `₱${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name?: string, email?: string, username?: string) => {
  if (name && name.trim()) {
    const names = name.trim().split(" ");
    if (names.length > 1)
      return (
        names[0].charAt(0) + names[names.length - 1].charAt(0)
      ).toUpperCase();
    return names[0].charAt(0).toUpperCase();
  }
  if (email) return email.charAt(0).toUpperCase();
  if (username) return username.charAt(0).toUpperCase();
  return "U";
};

// Helper to get full image URL (handles relative paths)
const getFullImageUrl = (url: string | null | undefined) => {
  if (!url) return null;
  // If it's already a full URL, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise, prepend the base URL
  const baseUrl = AxiosInstance.defaults.baseURL || 'http://127.0.0.1:8000';
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

// ─── Simple Bar Graph ─────────────────────────────────────────────────────────

function BarGraph({ data }: { data: MonthlyData[] }) {
  if (!data.length)
    return (
      <View style={styles.barGraphEmpty}>
        <Text style={styles.barGraphEmptyText}>No data available</Text>
      </View>
    );

  const maxVal = Math.max(...data.map((d) => d.credits), 0.01);

  return (
    <View style={styles.barGraphContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.barCol}>
          <View style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                { height: Math.max(4, (item.credits / maxVal) * 80) },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{item.month}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#FEF9C3", text: "#A16207", label: "Pending" },
    processing: { bg: "#DBEAFE", text: "#1D4ED8", label: "Processing" },
    approved: { bg: "#EDE9FE", text: "#7C3AED", label: "Approved" },
    completed: { bg: "#D1FAE5", text: "#065F46", label: "Completed" },
    rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
    failed: { bg: "#FEE2E2", text: "#991B1B", label: "Failed" },
  };
  const cfg = map[status] || { bg: "#F3F4F6", text: "#374151", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const {
    userId,
    shopId,
    userRole,
    username,
    email,
    loading: authLoading,
    clearAuthData,
  } = useAuth();

  // ── Profile state
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(
    null,
  );

  // ─── Fetch shipping addresses ────────────────────────────────────────────────

  const fetchShippingAddresses = async () => {
    if (!userId) return;
    try {
      setLoadingAddresses(true);
      const response = await AxiosInstance.get(
        `/shipping-address/get_shipping_addresses/?user_id=${userId}`,
        {
          headers: { "X-User-Id": userId, "Content-Type": "application/json" },
        }
      );
      if (response.data.success) {
        setAddresses(response.data.shipping_addresses || []);
      }
    } catch (error: any) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // ─── Address actions ─────────────────────────────────────────────────────────

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!userId) return;
    
    try {
      const response = await AxiosInstance.post(
        "/shipping-address/set_default_address/",
        {
          address_id: addressId,
          user_id: userId,
        },
        {
          headers: { "X-User-Id": userId, "Content-Type": "application/json" },
        }
      );
      
      if (response.data.success) {
        showSuccess("Default address updated!");
        fetchShippingAddresses(); // Refresh the list
      }
    } catch (error: any) {
      console.error("Error setting default address:", error);
      showError(error.response?.data?.error || "Failed to set default address");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            
            try {
              const response = await AxiosInstance.delete(
                "/shipping-address/delete_shipping_address/",
                {
                  data: {
                    address_id: addressId,
                    user_id: userId,
                  },
                  headers: { "X-User-Id": userId, "Content-Type": "application/json" },
                }
              );
              
              if (response.data.success) {
                showSuccess("Address deleted successfully!");
                fetchShippingAddresses(); // Refresh the list
              }
            } catch (error: any) {
              console.error("Error deleting address:", error);
              showError(error.response?.data?.error || "Failed to delete address");
            }
          },
        },
      ]
    );
  };
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // ── Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");

  // ── Wallet state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [shopFilters, setShopFilters] = useState<ShopFilter[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");

  // ── Withdrawal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  
  // ── Withdrawal detail modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showWithdrawalDetailModal, setShowWithdrawalDetailModal] = useState(false);

  // ── Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // ── Success / error
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const pushRoute = (path: string) => router.push(path as any);

  // ─── Profile helpers ─────────────────────────────────────────────────────

  const getUserDisplayName = () => {
    if (profile?.user?.full_name) return profile.user.full_name;
    if (profile?.user?.first_name && profile?.user?.last_name)
      return `${profile.user.first_name} ${profile.user.last_name}`;
    if (profile?.user?.first_name) return profile.user.first_name;
    if (profile?.user?.username) return profile.user.username;
    if (username) return username;
    return "User";
  };

  const getUserEmail = () => {
    if (profile?.user?.email) return profile.user.email;
    if (email) return email;
    return "user@example.com";
  };

  const effectiveHasShop = !!(profile?.shop || hasShop);

  // ─── Fetch profile ────────────────────────────────────────────────────────

  const fetchProfile = async () => {
    if (!userId) {
      setLoadingProfile(false);
      return;
    }
    try {
      setLoadingProfile(true);
      const response = await AxiosInstance.get("/profile/", {
        headers: { "X-User-Id": userId, "Content-Type": "application/json" },
      });
      if (response.data.success) {
        setProfile(response.data.profile);
        const methods = response.data.profile?.payment_methods || [];
        setPaymentMethods(methods);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoadingProfile(false);
      setRefreshing(false);
    }
  };

  // ─── Fetch wallet ─────────────────────────────────────────────────────────

  const fetchWalletData = async () => {
    if (!userId) return;
    try {
      setLoadingWallet(true);

      const [balRes, txRes, summaryRes] = await Promise.allSettled([
        AxiosInstance.get("/wallet/balance/", {
          headers: { "X-User-Id": userId },
        }),
        AxiosInstance.get("/wallet/transactions/?limit=100", {
          headers: { "X-User-Id": userId },
        }),
        AxiosInstance.get("/wallet/transaction_summary/", {
          headers: { "X-User-Id": userId },
        }),
      ]);

      if (balRes.status === "fulfilled" && balRes.value.data.success) {
        const d = balRes.value.data;
        setWallet({
          wallet_id: d.wallet_id || "",
          available_balance: d.available_balance || 0,
          pending_balance: d.pending_balance || 0,
          total_balance: d.total_balance || 0,
          lifetime_earnings: d.lifetime_earnings || 0,
          lifetime_withdrawals: d.lifetime_withdrawals || 0,
          pending_withdrawals: d.pending_withdrawals || 0,
        });
      }

      if (txRes.status === "fulfilled" && txRes.value.data.success) {
        const raw: any[] = txRes.value.data.transactions || [];
        const formatted: Transaction[] = raw.map((tx) => {
          let description = "";
          if (tx.source_type === "personal_sale")
            description = "Personal Listing Sale";
          else if (tx.source_type === "shop_sale")
            description = tx.shop_name
              ? `Sale from ${tx.shop_name}`
              : "Shop Sale";
          else if (tx.source_type === "withdrawal") description = "Withdrawal";
          else if (tx.source_type === "refund") description = "Refund";
          else if (tx.source_type === "release")
            description = "Released from Pending";
          else description = tx.source_type || "Transaction";

          return {
            id: tx.transaction_id,
            date: tx.created_at,
            description,
            amount: parseFloat(tx.amount),
            type: tx.transaction_type,
            status: tx.status || "completed",
            source_type: tx.source_type,
            shop_id: tx.shop_id,
            shop_name: tx.shop_name,
            order_id: tx.order_id,
          };
        });
        setTransactions(formatted);
        setFilteredTransactions(formatted);

        // Build shop filters from transactions
        const shopMap = new Map<string, ShopFilter>();
        formatted.forEach((t) => {
          if (t.shop_id && t.shop_name)
            shopMap.set(t.shop_id, { id: t.shop_id, name: t.shop_name });
        });
        setShopFilters(Array.from(shopMap.values()));
      }

      if (summaryRes.status === "fulfilled" && summaryRes.value.data.success) {
        const monthly = summaryRes.value.data.summary?.monthly_data || [];
        setMonthlyData(monthly);
      }
    } catch (err) {
      console.error("Error fetching wallet:", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // ─── Fetch withdrawals ────────────────────────────────────────────────────

  const fetchWithdrawals = async () => {
    if (!userId) return;
    try {
      const res = await AxiosInstance.get("/wallet/withdrawal_history/", {
        headers: { "X-User-Id": userId },
      });
      if (res.data.success) {
        // The API already provides admin_proof_url (public URL)
        // Just use it directly
        const withdrawals = (res.data.withdrawals || []).map((w: any) => ({
          ...w,
          // Use admin_proof_url if available, otherwise fallback to converted admin_proof
          admin_proof_url: w.admin_proof_url || (w.admin_proof ? getFullImageUrl(w.admin_proof) : null)
        }));
        setWithdrawalRequests(withdrawals);
      }
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
    }
  };

  // ─── Submit withdrawal ────────────────────────────────────────────────────

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Enter a valid amount");
      return;
    }
    if (amount < 100) {
      showError("Minimum withdrawal is ₱100.00");
      return;
    }
    if (amount > (wallet?.available_balance || 0)) {
      showError(
        `Exceeds available balance (${formatCurrency(wallet?.available_balance || 0)})`,
      );
      return;
    }
    if (!selectedPaymentMethod) {
      showError("Select a payment method");
      return;
    }

    try {
      setSubmittingWithdraw(true);
      const res = await AxiosInstance.post(
        "/wallet/request_withdrawal/",
        { amount, payment_method_id: selectedPaymentMethod },
        { headers: { "X-User-Id": userId } },
      );
      if (res.data.success) {
        showSuccess("Withdrawal request submitted!");
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        setSelectedPaymentMethod("");
        await Promise.all([fetchWalletData(), fetchWithdrawals()]);
      } else {
        showError(res.data.error || "Failed to submit withdrawal");
      }
    } catch (error: any) {
      showError(error.response?.data?.error || "Failed to submit withdrawal");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // ─── Filter transactions ──────────────────────────────────────────────────

  useEffect(() => {
    if (!transactions.length) return;
    if (selectedFilter === "all") {
      setFilteredTransactions(transactions);
      return;
    }
    if (selectedFilter === "personal") {
      setFilteredTransactions(
        transactions.filter((t) => t.source_type === "personal_sale"),
      );
      return;
    }
    if (selectedFilter.startsWith("shop_")) {
      const shopId = selectedFilter.replace("shop_", "");
      setFilteredTransactions(transactions.filter((t) => t.shop_id === shopId));
    }
  }, [selectedFilter, transactions]);

  // ─── Profile picture helpers ──────────────────────────────────────────────

  const uploadProfilePicture = async (asset: any) => {
    if (!userId) return;
    try {
      setUploadingImage(true);
      const uriParts = asset.uri.split(".");
      const fileType = uriParts[uriParts.length - 1];
      const formData = new FormData();
      formData.append("profile_picture", {
        uri: asset.uri,
        type: `image/${fileType}`,
        name: `profile_${Date.now()}.${fileType}`,
      } as any);
      formData.append("action", "update_profile_picture");
      const response = await AxiosInstance.post("/profile/", formData, {
        headers: { "X-User-Id": userId, "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        showSuccess("Profile picture updated!");
        fetchProfile();
      } else {
        showError(response.data.error || "Failed to upload picture");
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to upload picture");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      await uploadProfilePicture(result.assets[0]);
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      await uploadProfilePicture(result.assets[0]);
  };

  const showProfilePictureOptions = () => {
    Alert.alert("Profile Picture", "Choose an option", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickImage },
      ...(profile?.user?.has_profile_picture
        ? [
            {
              text: "Remove Photo",
              style: "destructive" as const,
              onPress: handleRemoveProfilePicture,
            },
          ]
        : []),
    ]);
  };

  const handleRemoveProfilePicture = async () => {
    if (!userId) return;
    Alert.alert("Remove Profile Picture", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setUploadingImage(true);
            const res = await AxiosInstance.post(
              "/profile/",
              { action: "remove_profile_picture" },
              {
                headers: {
                  "X-User-Id": userId,
                  "Content-Type": "application/json",
                },
              },
            );
            if (res.data.success) {
              showSuccess("Photo removed");
              fetchProfile();
            } else showError(res.data.error || "Failed to remove");
          } catch (err: any) {
            showError(err.response?.data?.error || "Failed to remove");
          } finally {
            setUploadingImage(false);
          }
        },
      },
    ]);
  };

  // ─── Shop fallback ────────────────────────────────────────────────────────

  const checkUserShops = async () => {
    if (!userId) {
      setHasShop(false);
      return;
    }
    try {
      setLoadingShop(true);
      const response = await getUserShops(userId);
      if (
        response?.success &&
        Array.isArray(response.shops) &&
        response.shops.length > 0
      ) {
        setHasShop(true);
        const rawShop = response.shops[0];
        const normalized = {
          ...rawShop,
          is_active:
            (rawShop.status === "Active" || rawShop.status === "active") &&
            !rawShop.is_suspended,
          verified: Boolean(rawShop.verified),
          follower_count: Number(rawShop.follower_count || 0),
          total_sales:
            typeof rawShop.total_sales === "number"
              ? rawShop.total_sales.toFixed(2)
              : String(rawShop.total_sales ?? "0.00"),
        } as any;
        setProfile((prev) =>
          prev
            ? { ...prev, shop: normalized }
            : { user: null as any, customer: null as any, shop: normalized },
        );
      } else {
        setHasShop(false);
      }
    } catch (err) {
      setHasShop(false);
    } finally {
      setLoadingShop(false);
    }
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && userId) {
      fetchProfile();
      fetchWalletData();
      fetchWithdrawals();
      fetchShippingAddresses();
    }
  }, [authLoading, userId]);

  useEffect(() => {
    if (
      profile &&
      profile.customer?.is_customer &&
      !profile.shop &&
      hasShop === null
    ) {
      checkUserShops();
    }
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchWalletData();
    fetchWithdrawals();
    fetchShippingAddresses(); 
  };

  // ─── Shop navigation ──────────────────────────────────────────────────────

  const handleSwitchToShop = () => {
    const shopIdToOpen = profile?.shop?.id;
    if (shopIdToOpen) pushRoute(`/customer/shops?shopId=${shopIdToOpen}`);
    else pushRoute("/customer/shops");
  };

  // ─── Loading / not logged in ──────────────────────────────────────────────

  if (authLoading || (loadingProfile && !refreshing)) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <MaterialIcons name="person-off" size={64} color="#DC2626" />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please login to view your profile
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <CustomerLayout disableScroll>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
        >
          {/* ── Profile Header ── */}
          <View style={styles.gradientHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={showProfilePictureOptions}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <View style={[styles.avatar, { backgroundColor: "#F3F4F6" }]}>
                    <ActivityIndicator size="small" color="#DC2626" />
                  </View>
                ) : profile?.user?.profile_picture_url ? (
                  <Image
                    source={{ uri: getFullImageUrl(profile.user.profile_picture_url) ?? undefined }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(
                        profile?.user?.full_name,
                        profile?.user?.email,
                        profile?.user?.username,
                      )}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={styles.userName}>{getUserDisplayName()}</Text>
                <Text style={styles.userEmail}>{getUserEmail()}</Text>
                <View style={styles.shopBadgeContainer}>
                  <View
                    style={[
                      styles.modernShopBadge,
                      { backgroundColor: "#F97316" },
                    ]}
                  >
                    <MaterialIcons name="store" size={12} color="#fff" />
                    <Text style={styles.modernShopBadgeText}>
                      {profile?.shop ? "Shop Owner" : "No Shop Yet"}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => pushRoute("/customer/account-profile")}
              >
                <MaterialIcons name="edit" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Success / Error banners ── */}
          {successMsg && (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={16} color="#065F46" />
              <Text style={styles.successBannerText}>{successMsg}</Text>
            </View>
          )}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={16} color="#991B1B" />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          {/* ── Tab Bar ── */}
          <View style={styles.tabBar}>
            {(
              ["profile", "addresses", "payments", "finance"] as ActiveTab[]
            ).map((tab) => {
              const icons: Record<ActiveTab, any> = {
                profile: "person",
                addresses: "location-on",
                payments: "credit-card",
                finance: "account-balance-wallet",
              };
              const labels: Record<ActiveTab, string> = {
                profile: "Profile",
                addresses: "Addresses",
                payments: "Payments",
                finance: "Finance",
              };
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <MaterialIcons
                    name={icons[tab]}
                    size={18}
                    color={isActive ? "#F97316" : "#9CA3AF"}
                  />
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  >
                    {labels[tab]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ══════════════════════════════════════════
              PROFILE TAB
          ══════════════════════════════════════════ */}
          {activeTab === "profile" && (
  <View style={styles.tabContent}>
    {/* Shop Management Card */}
    {profile?.customer?.is_customer && (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={handleSwitchToShop}
        activeOpacity={0.7}
      >
        <View style={styles.shopIconCircle}>
          <MaterialIcons name="store" size={26} color="#374151" />
        </View>
        <View style={styles.shopCardText}>
          <Text style={styles.shopCardTitle}>
            {loadingShop
              ? "Checking..."
              : effectiveHasShop
                ? "Manage Your Shop"
                : "You Don't Have a Shop"}
          </Text>
          <Text style={styles.shopCardSubtitle}>
            {effectiveHasShop
              ? "View and manage your products"
              : "Create your shop to start selling"}
          </Text>
        </View>
        <MaterialIcons name="arrow-forward" size={22} color="#9CA3AF" />
      </TouchableOpacity>
    )}

    {/* My Account grid */}
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="account-circle" size={18} color="#F97316" />
        <Text style={styles.cardTitle}>My Account</Text>
      </View>
      <View style={styles.accountGrid}>
        {[
          {
            label: "Profile",
            icon: "person",
            route: "/customer/account-profile",
          },
          {
            label: "Vouchers",
            icon: "local-offer",
            route: "/customer/my-vouchers",
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.accountGridItem}
            onPress={() => pushRoute(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.accountIconBg}>
              <MaterialIcons
                name={item.icon as any}
                size={22}
                color="#374151"
              />
            </View>
            <Text style={styles.accountGridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Address Card */}
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="location-on" size={18} color="#F97316" />
        <Text style={styles.cardTitle}>Default Address</Text>
      </View>
      
      {profile?.user?.street || profile?.user?.barangay ? (
        <View style={styles.addressContainer}>
          <View style={styles.addressRow}>
            <MaterialIcons name="home" size={16} color="#6B7280" />
            <Text style={styles.addressText}>
              {[
                profile?.user?.street,
                profile?.user?.barangay,
                profile?.user?.city,
                profile?.user?.province,
                profile?.user?.zip_code,
                profile?.user?.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editAddressButton}
            onPress={() => pushRoute("/customer/components/shipping-address")}
          >
            <MaterialIcons name="edit" size={14} color="#F97316" />
            <Text style={styles.editAddressButtonText}>Manage Addresses</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyAddressContainer}>
          <MaterialIcons name="location-off" size={32} color="#D1D5DB" />
          <Text style={styles.emptyAddressText}>No address added yet</Text>
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => pushRoute("/customer/create/add-address")}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addAddressButtonText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
)}

          {/* ══════════════════════════════════════════
              ADDRESSES TAB
          ══════════════════════════════════════════ */}
          {activeTab === "addresses" && (
  <View style={styles.tabContent}>
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Shipping Addresses</Text>
          <Text style={styles.cardSubtitle}>
            Manage your delivery addresses
          </Text>
        </View>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => pushRoute("/customer/create/add-address")}
        >
          <MaterialIcons name="add" size={16} color="#374151" />
          <Text style={styles.smallButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loadingAddresses ? (
        <ActivityIndicator size="small" color="#F97316" style={{ marginVertical: 20 }} />
      ) : addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="location-on" size={40} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            No saved addresses yet
          </Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => pushRoute("/customer/create/add-address")}
          >
            <Text style={styles.linkBtnText}>Add your first address →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.addressList}>
          {addresses.map((address) => (
            <View key={address.id} style={styles.addressItem}>
              <View style={styles.addressItemHeader}>
                <View style={styles.addressTypeBadge}>
                  <MaterialIcons 
                    name={
                      address.address_type === 'home' ? 'home' : 
                      address.address_type === 'work' ? 'work' : 'place'
                    } 
                    size={14} 
                    color="#F97316" 
                  />
                  <Text style={styles.addressTypeText}>
                    {address.address_type?.charAt(0).toUpperCase() + address.address_type?.slice(1) || 'Home'}
                  </Text>
                </View>
                {address.is_default && (
                  <View style={styles.defaultAddressBadge}>
                    <Text style={styles.defaultAddressBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.addressRecipient}>
                {address.recipient_name}
              </Text>
              <Text style={styles.addressPhone}>
                {address.recipient_phone}
              </Text>
              <Text style={styles.addressFullText}>
                {address.full_address || [
                  address.building_name,
                  address.street,
                  address.barangay,
                  address.city,
                  address.province,
                  address.zip_code,
                  address.country
                ].filter(Boolean).join(', ')}
              </Text>
              
              <View style={styles.addressActions}>
                <TouchableOpacity 
                  style={styles.addressActionBtn}
                  onPress={() => pushRoute(`/customer/create/add-address?mode=edit&address=${JSON.stringify(address)}`)}
                >
                  <MaterialIcons name="edit" size={18} color="#6B7280" />
                  <Text style={styles.addressActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addressActionBtn}
                  onPress={() => handleSetDefaultAddress(address.id)}
                >
                  <MaterialIcons name="check-circle" size={18} color="#6B7280" />
                  <Text style={styles.addressActionText}>Set Default</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addressActionBtn, styles.deleteAction]}
                  onPress={() => handleDeleteAddress(address.id)}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  <Text style={[styles.addressActionText, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
)}
          {/* ══════════════════════════════════════════
              PAYMENTS TAB
          ══════════════════════════════════════════ */}
         {activeTab === "payments" && (
  <View style={styles.tabContent}>
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Payment Methods</Text>
          <Text style={styles.cardSubtitle}>
            Manage your payout options
          </Text>
        </View>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => pushRoute("/customer/wallet")}
        >
          <MaterialIcons name="add" size={16} color="#374151" />
          <Text style={styles.smallButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="credit-card" size={40} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            No payment methods added yet
          </Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => pushRoute("/customer/wallet")}
          >
            <Text style={styles.linkBtnText}>Add your first payment method →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.paymentMethodList}>
          {paymentMethods.map((method) => (
            <View key={method.payment_id} style={styles.paymentMethodItem}>
              <View style={styles.paymentMethodHeader}>
                <View style={styles.paymentMethodTypeBadge}>
                  <MaterialIcons
                    name={
                      method.payment_method === "bank"
                        ? "account-balance"
                        : "smartphone"
                    }
                    size={16}
                    color="#F97316"
                  />
                  <Text style={styles.paymentMethodTypeText}>
                    {method.payment_method === "bank" ? "Bank Account" : 
                     method.payment_method === "gcash" ? "GCash" : 
                     method.payment_method === "paymaya" ? "PayMaya" : 
                     method.payment_method}
                  </Text>
                </View>
                {method.is_default && (
                  <View style={styles.defaultPaymentBadge}>
                    <Text style={styles.defaultPaymentBadgeText}>Default</Text>
                  </View>
                )}
              </View>

              <Text style={styles.paymentAccountName}>
                {method.account_name}
              </Text>
              
              {method.bank_name && (
                <Text style={styles.paymentBankName}>
                  {method.bank_name}
                </Text>
              )}
              
              <Text style={styles.paymentAccountNumber}>
                {method.account_number}
              </Text>

              <View style={styles.paymentActions}>
                <TouchableOpacity 
                  style={styles.paymentActionBtn}
                  onPress={() => {
                    router.push({
                      pathname: '/customer/create/add-payment-method',
                      params: { mode: 'edit', payment: JSON.stringify(method) }
                    });
                  }}
                >
                  <MaterialIcons name="edit" size={18} color="#6B7280" />
                  <Text style={styles.paymentActionText}>Edit</Text>
                </TouchableOpacity>
                
                {!method.is_default && (
                  <TouchableOpacity 
                    style={styles.paymentActionBtn}
                    onPress={async () => {
                      try {
                        const response = await AxiosInstance.post(
                          `/user-payment-details/${method.payment_id}/set_default/`,
                          {},
                          { headers: { 'X-User-Id': userId } }
                        );
                        if (response.data.message) {
                          showSuccess("Default payment method updated");
                          fetchProfile(); // Refresh to get updated payment methods
                        }
                      } catch (error: any) {
                        console.error('Set default error:', error);
                        showError(error.response?.data?.error || 'Failed to set as default');
                      }
                    }}
                  >
                    <MaterialIcons name="check-circle" size={18} color="#6B7280" />
                    <Text style={styles.paymentActionText}>Set Default</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.paymentActionBtn, styles.paymentDeleteAction]}
                  onPress={() => {
                    Alert.alert(
                      'Delete Payment Method',
                      `Are you sure you want to delete "${method.account_name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const response = await AxiosInstance.delete(
                                `/user-payment-details/${method.payment_id}/delete_payment_method/`,
                                { headers: { 'X-User-Id': userId } }
                              );
                              if (response.data.message) {
                                showSuccess('Payment method deleted');
                                fetchProfile(); // Refresh to get updated payment methods
                              }
                            } catch (error: any) {
                              console.error('Delete error:', error);
                              showError(error.response?.data?.error || 'Failed to delete');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  <Text style={[styles.paymentActionText, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
)}

          {/* ══════════════════════════════════════════
              FINANCE TAB
          ══════════════════════════════════════════ */}
          {activeTab === "finance" && (
  <View style={styles.tabContent}>
    {/* ── Filter chips ── REMOVED ── */}

    {/* ── Balance cards with shadow and border ── */}
    <View style={[styles.balanceGrid, { marginBottom: 10 }]}>
      {/* Pending - NOW FIRST */}
      <View style={[styles.balanceCard, { flex: 1 }]}>
    <View style={styles.balanceCardHeader}>
      <MaterialIcons name="hourglass-empty" size={16} color="#D97706" />
      <Text style={styles.balanceCardLabel}>Pending</Text>
      <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
        <MaterialIcons
          name={showBalance ? "visibility-off" : "visibility"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>
    </View>
    <Text style={[styles.balanceAmount, { color: "#D97706" }]}>
      {showBalance
        ? formatCurrency(wallet?.pending_balance || 0)
        : "••••••"}
    </Text>
    <Text style={styles.balanceCardSub}>Awaiting release</Text>
  </View>

      {/* Available - NOW SECOND */}
      <View style={[styles.balanceCard, { flex: 1 }]}>
    <View style={styles.balanceCardHeader}>
      <MaterialIcons name="account-balance-wallet" size={16} color="#2563EB" />
      <Text style={styles.balanceCardLabel}>Available</Text>
    </View>
    <Text style={[styles.balanceAmount, { color: "#059669" }]}>
      {showBalance
        ? formatCurrency(wallet?.available_balance || 0)
        : "••••••"}
    </Text>
    <Text style={styles.balanceCardSub}>Ready to withdraw</Text>
  </View>
</View>

    <View style={styles.balanceGrid}>
      {/* Total Sales */}
      <View style={[styles.balanceCard, { flex: 1 }]}>
        <View style={styles.balanceCardHeader}>
          <MaterialIcons
            name="trending-up"
            size={16}
            color="#059669"
          />
          <Text style={styles.balanceCardLabel}>Total Sales</Text>
        </View>
        <Text style={styles.balanceAmount}>
          {showBalance
            ? formatCurrency(wallet?.lifetime_earnings || 0)
            : "••••••"}
        </Text>
        <Text style={styles.balanceCardSub}>
          Lifetime earnings
        </Text>
      </View>

      {/* Withdrawals */}
      <View style={[styles.balanceCard, { flex: 1 }]}>
        <View style={styles.balanceCardHeader}>
          <MaterialIcons
            name="trending-down"
            size={16}
            color="#DC2626"
          />
          <Text style={styles.balanceCardLabel}>Withdrawn</Text>
        </View>
        <Text style={[styles.balanceAmount, { color: "#DC2626" }]}>
          {showBalance
            ? formatCurrency(wallet?.lifetime_withdrawals || 0)
            : "••••••"}
        </Text>
        <Text style={styles.balanceCardSub}>
          {(wallet?.pending_withdrawals ?? 0) > 0 
            ? `+ ${formatCurrency(wallet!.pending_withdrawals)} pending` 
            : "All time"}
        </Text>
      </View>
    </View>

    {/* ── Withdraw button ── */}
    <View style={styles.financeCard}>
      <Text style={styles.cardTitle}>Withdraw Funds</Text>
      <Text style={[styles.cardSubtitle, { marginBottom: 12 }]}>
        Request a payout to your payment method
      </Text>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          (!wallet?.available_balance ||
            wallet.available_balance < 100) &&
            styles.primaryButtonDisabled,
        ]}
        onPress={() => {
          setShowWithdrawModal(true);
          if (paymentMethods.length > 0 && !selectedPaymentMethod) {
            const defaultMethod = paymentMethods.find((m) => m.is_default) || paymentMethods[0];
            setSelectedPaymentMethod(defaultMethod.payment_id);
          }
        }}
        disabled={
          !wallet?.available_balance || wallet.available_balance < 100
        }
      >
        <MaterialIcons name="upload" size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>
          Request Withdrawal
        </Text>
      </TouchableOpacity>
      {(!wallet?.available_balance ||
        wallet.available_balance < 100) && (
        <Text style={styles.hintText}>
          Minimum withdrawal is ₱100.00
        </Text>
      )}
    </View>

    {/* ── Withdrawal history (clickable) ── */}
    {withdrawalRequests.length > 0 && (
      <View style={styles.financeCard}>
        <Text style={styles.cardTitle}>Withdrawal History</Text>
        <Text style={[styles.cardSubtitle, { marginBottom: 12 }]}>
          Recent requests - tap to view details
        </Text>
        <View style={styles.txList}>
          {withdrawalRequests.slice(0, 5).map((req) => (
            <TouchableOpacity
              key={req.withdrawal_id}
              style={styles.withdrawalItem}
              onPress={() => {
                setSelectedWithdrawal(req);
                setShowWithdrawalDetailModal(true);
              }}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.txAmount}>
                  {formatCurrency(req.amount)}
                </Text>
                <Text style={styles.txDate}>
                  {formatDateTime(req.requested_at)}
                </Text>
              </View>
              <StatusBadge status={req.status} />
              <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}

    {/* ── Monthly graph + stats ── */}
    <View style={styles.financeCard}>
      <Text style={styles.cardTitle}>Money Flow</Text>
      <Text style={[styles.cardSubtitle, { marginBottom: 8 }]}>
        Last 6 months
      </Text>
      <BarGraph data={monthlyData} />
      {monthlyData.length > 0 && (
        <View style={styles.graphStats}>
          <View style={styles.graphStatItem}>
            <Text style={styles.graphStatLabel}>Average</Text>
            <Text style={styles.graphStatValue}>
              {formatCurrency(
                monthlyData.reduce((s, m) => s + m.credits, 0) /
                  monthlyData.length,
              )}
            </Text>
          </View>
          <View style={styles.graphStatItem}>
            <Text style={styles.graphStatLabel}>Highest</Text>
            <Text
              style={[styles.graphStatValue, { color: "#059669" }]}
            >
              {formatCurrency(
                Math.max(...monthlyData.map((m) => m.credits)),
              )}
            </Text>
          </View>
          <View style={styles.graphStatItem}>
            <Text style={styles.graphStatLabel}>Lowest</Text>
            <Text
              style={[styles.graphStatValue, { color: "#DC2626" }]}
            >
              {formatCurrency(
                Math.min(...monthlyData.map((m) => m.credits)),
              )}
            </Text>
          </View>
        </View>
      )}
    </View>

    {/* ── Transaction history ── */}
    <View style={styles.financeCard}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Transaction History</Text>
          <Text style={styles.cardSubtitle}>
            {selectedFilter === "all"
              ? "All transactions"
              : selectedFilter === "personal"
                ? "Personal listings"
                : shopFilters.find(
                    (s) => `shop_${s.id}` === selectedFilter,
                  )?.name || "Shop"}
          </Text>
        </View>
      </View>

      {loadingWallet ? (
        <ActivityIndicator
          size="small"
          color="#F97316"
          style={{ marginVertical: 20 }}
        />
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt" size={40} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            No transactions found
          </Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {filteredTransactions.map((tx) => (
            <View key={tx.id} style={styles.txRowStyled}>
              <View
                style={[
                  styles.txIcon,
                  {
                    backgroundColor:
                      tx.type === "credit" ? "#D1FAE5" : "#FEE2E2",
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    tx.type === "credit"
                      ? "arrow-downward"
                      : "arrow-upward"
                  }
                  size={16}
                  color={tx.type === "credit" ? "#059669" : "#DC2626"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDescription}>
                  {tx.description}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <Text style={styles.txDate}>
                    {formatDateTime(tx.date)}
                  </Text>
                  {tx.shop_name && (
                    <View style={styles.shopTag}>
                      <Text style={styles.shopTagText}>
                        {tx.shop_name}
                      </Text>
                    </View>
                  )}
                  <StatusBadge status={tx.status} />
                </View>
                {tx.order_id && (
                  <Text style={styles.orderIdText}>
                    Order: {tx.order_id.slice(0, 8)}…
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.txAmountBig,
                  {
                    color:
                      tx.type === "credit" ? "#059669" : "#DC2626",
                  },
                ]}
              >
                {tx.type === "credit" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
)}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ══════════════════════════════════════════
            WITHDRAW MODAL
        ══════════════════════════════════════════ */}
        <Modal
          visible={showWithdrawModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowWithdrawModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <Text style={styles.modalSubtitle}>
                Available: {formatCurrency(wallet?.available_balance || 0)}
              </Text>

              <Text style={styles.fieldLabel}>Amount (₱)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <Text style={styles.hintText}>Minimum withdrawal: ₱100.00</Text>

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Payment Method
              </Text>
              {paymentMethods.length === 0 ? (
                <View style={styles.noPaymentHint}>
                  <MaterialIcons
                    name="info-outline"
                    size={16}
                    color="#D97706"
                  />
                  <Text style={styles.noPaymentHintText}>
                    Add a payment method in the Payments tab first.
                  </Text>
                </View>
              ) : (
                <View style={styles.paymentPickerList}>
                  {paymentMethods.map((m) => (
                    <TouchableOpacity
                      key={m.payment_id}
                      style={[
                        styles.paymentPickerItem,
                        selectedPaymentMethod === m.payment_id &&
                          styles.paymentPickerItemSelected,
                      ]}
                      onPress={() => setSelectedPaymentMethod(m.payment_id)}
                    >
                      <MaterialIcons
                        name={
                          m.payment_method === "bank"
                            ? "account-balance"
                            : "smartphone"
                        }
                        size={18}
                        color="#374151"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.paymentPickerName}>
                          {m.payment_method}
                          {m.bank_name ? ` – ${m.bank_name}` : ""}
                          {m.is_default ? "  (Default)" : ""}
                        </Text>
                        <Text style={styles.paymentPickerDetail}>
                          {m.account_name} • {m.account_number}
                        </Text>
                      </View>
                      {selectedPaymentMethod === m.payment_id && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="#F97316"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton, 
                    { flex: 1 },
                    (submittingWithdraw || !selectedPaymentMethod || !withdrawAmount) && styles.primaryButtonDisabled
                  ]}
                  onPress={handleWithdraw}
                  disabled={
                    submittingWithdraw ||
                    !selectedPaymentMethod ||
                    !withdrawAmount
                  }
                >
                  {submittingWithdraw ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="upload" size={18} color="#fff" />
                      <Text style={styles.primaryButtonText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outlineButton, { flex: 1 }]}
                  onPress={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                    setSelectedPaymentMethod("");
                  }}
                >
                  <Text style={styles.outlineButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════
            WITHDRAWAL DETAIL MODAL (with image preview)
        ══════════════════════════════════════════ */}
        <Modal
          visible={showWithdrawalDetailModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowWithdrawalDetailModal(false);
            setSelectedWithdrawal(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              
              <View style={styles.detailHeader}>
                <Text style={styles.modalTitle}>Withdrawal Details</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowWithdrawalDetailModal(false);
                    setSelectedWithdrawal(null);
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedWithdrawal && (
                <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                  {/* Amount */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailAmount}>
                      {formatCurrency(selectedWithdrawal.amount)}
                    </Text>
                  </View>

                  {/* Status */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedWithdrawal.status} />
                  </View>

                  {/* Requested Date */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Requested</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedWithdrawal.requested_at)}
                    </Text>
                  </View>

                  {/* Approved Date (if approved) */}
                  {selectedWithdrawal.approved_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Approved</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(selectedWithdrawal.approved_at)}
                      </Text>
                    </View>
                  )}

                  {/* Completed Date (if completed) */}
                  {selectedWithdrawal.completed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(selectedWithdrawal.completed_at)}
                      </Text>
                    </View>
                  )}

                  {/* Rejection Reason (if rejected) */}
                  {selectedWithdrawal.status === "rejected" && selectedWithdrawal.rejection_reason && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rejection Reason</Text>
                      <Text style={[styles.detailValue, { color: "#DC2626", flex: 1, textAlign: "right" }]}>
                        {selectedWithdrawal.rejection_reason}
                      </Text>
                    </View>
                  )}

                  {/* Admin Proof Image - Now using admin_proof_url directly from API */}
                  {(selectedWithdrawal.status === "approved" || selectedWithdrawal.status === "completed") && selectedWithdrawal.admin_proof_url && (
                    <View style={styles.proofSection}>
                      <Text style={styles.detailLabel}>Payment Proof</Text>
                      <View style={styles.proofImageContainer}>
                        <Image 
                          source={{ uri: selectedWithdrawal.admin_proof_url }}
                          style={styles.proofImage}
                          resizeMode="contain"
                          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                        />
                        <Text style={styles.proofNote}>
                          Official payment receipt from admin
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Status Timeline */}
                  <View style={styles.timelineSection}>
                    <Text style={styles.timelineTitle}>Status Timeline</Text>
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: "#059669" }]} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStatus}>Request Submitted</Text>
                        <Text style={styles.timelineDate}>
                          {formatDateTime(selectedWithdrawal.requested_at)}
                        </Text>
                      </View>
                    </View>

                    {selectedWithdrawal.status !== "pending" && (
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: selectedWithdrawal.status === "rejected" ? "#DC2626" : "#F97316" }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineStatus}>
                            {selectedWithdrawal.status === "approved" ? "Approved" :
                             selectedWithdrawal.status === "rejected" ? "Rejected" :
                             selectedWithdrawal.status === "processing" ? "Processing" :
                             selectedWithdrawal.status === "completed" ? "Completed" : "Updated"}
                          </Text>
                          <Text style={styles.timelineDate}>
                            {formatDateTime(selectedWithdrawal.approved_at || selectedWithdrawal.completed_at || "")}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedWithdrawal.status === "completed" && (
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: "#059669" }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineStatus}>Funds Transferred</Text>
                          <Text style={styles.timelineDate}>
                            {formatDateTime(selectedWithdrawal.completed_at || "")}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </CustomerLayout>
    </SafeAreaView>
  );
}

// ─── Styles (same as before, keep all styles) ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContainer: { flex: 1 },

  // Loading / not logged in
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  // Header
  gradientHeader: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerContent: { flexDirection: "row", alignItems: "center" },
  avatarWrapper: { position: "relative", marginRight: 14 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarText: { fontSize: 26, color: "#374151", fontWeight: "700" },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#F97316",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerTextContainer: { flex: 1 },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  userEmail: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  shopBadgeContainer: { flexDirection: "row" },
  modernShopBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  modernShopBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  editProfileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
  },

  // Banners
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
  },
  successBannerText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  errorBannerText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#F97316" },
  tabLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },
  tabLabelActive: { color: "#F97316", fontWeight: "600" },

  // Tab content
  tabContent: { 
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12 
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  cardSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Shop card
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  shopIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
  },
  shopCardText: { flex: 1 },
  shopCardTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  shopCardSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Account grid
  accountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  accountGridItem: {
    width: 90,
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  accountIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  accountGridLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    textAlign: "center",
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  smallButtonText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    maxWidth: 220,
  },
  linkBtn: { marginTop: 4 },
  linkBtnText: { fontSize: 13, color: "#F97316", fontWeight: "600" },

  paymentList: { gap: 10 },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  paymentIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F5F5F4",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textTransform: "capitalize",
  },
  paymentDetail: { fontSize: 11, color: "#6B7280" },
  defaultBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: { fontSize: 10, color: "#065F46", fontWeight: "600" },

  // Finance: filter scroll
  filterScroll: { marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  filterChipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },

  // Finance: balance grid
  balanceGrid: { flexDirection: "row", gap: 10 },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  balanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  balanceCardLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  balanceCardSub: { fontSize: 10, color: "#9CA3AF" },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F97316",
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonDisabled: { backgroundColor: "#D1D5DB" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 10,
  },
  outlineButtonText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  hintText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
  },

  // Transactions
  txList: { gap: 10, marginTop: 4 },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  txAmount: { fontSize: 14, fontWeight: "600", color: "#374151" },
  txDate: { fontSize: 11, color: "#9CA3AF" },
  txRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  txDescription: { fontSize: 13, fontWeight: "600", color: "#374151" },
  txAmountBig: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  shopTag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shopTagText: { fontSize: 9, color: "#1D4ED8", fontWeight: "600" },
  orderIdText: { fontSize: 10, color: "#D1D5DB", marginTop: 2 },

  // Bar graph
  barGraphContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    gap: 4,
    paddingBottom: 4,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    height: 90,
  },
  bar: {
    width: "80%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  barGraphEmpty: {
    height: 110,
    justifyContent: "center",
    alignItems: "center",
  },
  barGraphEmptyText: { fontSize: 12, color: "#D1D5DB" },

  // Graph stats
  graphStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  graphStatItem: { alignItems: "center", flex: 1 },
  graphStatLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 4 },
  graphStatValue: { fontSize: 13, fontWeight: "600", color: "#374151" },

  // Badge
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: "600" },

  // Withdraw Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#374151",
    backgroundColor: "#F9FAFB",
  },
  noPaymentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF9C3",
    padding: 12,
    borderRadius: 10,
  },
  noPaymentHintText: { fontSize: 12, color: "#A16207", flex: 1 },
  paymentPickerList: { gap: 8, marginBottom: 8 },
  paymentPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  paymentPickerItemSelected: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  // Address Card Styles
addressContainer: {
  gap: 12,
},
addressRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  paddingVertical: 4,
},
addressText: {
  flex: 1,
  fontSize: 13,
  color: "#374151",
  lineHeight: 18,
},
editAddressButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  paddingVertical: 10,
  paddingHorizontal: 16,
  backgroundColor: "#FFF7ED",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#FED7AA",
  marginTop: 4,
},
editAddressButtonText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#F97316",
},
emptyAddressContainer: {
  alignItems: "center",
  paddingVertical: 20,
  gap: 10,
},
emptyAddressText: {
  fontSize: 13,
  color: "#9CA3AF",
  textAlign: "center",
},
addAddressButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  backgroundColor: "#F97316",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 10,
  marginTop: 4,
},
addAddressButtonText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#FFFFFF",
},
// Address List Styles
addressList: {
  gap: 12,
  marginTop: 4,
},
addressItem: {
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 12,
  padding: 14,
  backgroundColor: "#FFFFFF",
},
addressItemHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
},
addressTypeBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "#FFF7ED",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
addressTypeText: {
  fontSize: 11,
  fontWeight: "600",
  color: "#F97316",
},
defaultAddressBadge: {
  backgroundColor: "#D1FAE5",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
defaultAddressBadgeText: {
  fontSize: 10,
  fontWeight: "600",
  color: "#065F46",
},
addressRecipient: {
  fontSize: 14,
  fontWeight: "600",
  color: "#374151",
  marginBottom: 2,
},
addressPhone: {
  fontSize: 12,
  color: "#6B7280",
  marginBottom: 8,
},
addressFullText: {
  fontSize: 12,
  color: "#4B5563",
  lineHeight: 16,
  marginBottom: 12,
},
addressActions: {
  flexDirection: "row",
  gap: 16,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: "#F3F4F6",
},
addressActionBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
addressActionText: {
  fontSize: 12,
  color: "#6B7280",
},
deleteAction: {
  marginLeft: "auto",
},
// Payment Method List Styles
paymentMethodList: {
  gap: 12,
  marginTop: 4,
},
paymentMethodItem: {
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 12,
  padding: 14,
  backgroundColor: "#FFFFFF",
  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
},
paymentMethodHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
},
paymentMethodTypeBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "#FFF7ED",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
},
paymentMethodTypeText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#F97316",
},
defaultPaymentBadge: {
  backgroundColor: "#D1FAE5",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
defaultPaymentBadgeText: {
  fontSize: 10,
  fontWeight: "600",
  color: "#065F46",
},
paymentAccountName: {
  fontSize: 14,
  fontWeight: "600",
  color: "#374151",
  marginBottom: 2,
},
paymentBankName: {
  fontSize: 12,
  color: "#6B7280",
  marginBottom: 2,
},
paymentAccountNumber: {
  fontSize: 12,
  color: "#4B5563",
  marginBottom: 12,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
},
paymentActions: {
  flexDirection: "row",
  gap: 16,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: "#F3F4F6",
},
paymentActionBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
paymentActionText: {
  fontSize: 12,
  color: "#6B7280",
},
paymentDeleteAction: {
  marginLeft: "auto",
},
// Add this to styles
paymentsCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 0,
  paddingVertical: 0,
  paddingHorizontal: 0,
  gap: 0,
},
// Finance Card
financeCard: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 12,
  padding: 16,
  gap: 0,
  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
},

// Styled balance card
balanceCardStyled: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 12,
  padding: 14,
  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
},

// Styled transaction item
txItemStyled: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#F3F4F6",
},

// Styled transaction row
txRowStyled: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#F3F4F6",
},
  paymentPickerName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  paymentPickerDetail: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  
  // Withdrawal history item (clickable)
  withdrawalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  
  // Withdrawal Detail Modal Styles
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailContent: {
    maxHeight: "80%",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  proofSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  proofImageContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  proofImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proofNote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  timelineSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});