import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router, useNavigation } from "expo-router";
import RiderHeader from "./includes/riderHeader";
import AxiosInstance from "../../contexts/axios";

// --- Theme Colors ---
const COLORS = {
  primary: "#1F2937",
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1F2937",
  subText: "#6B7280",
  border: "#F3F4F6",
  danger: "#EF4444",
  iconBg: "#F3F4F6",
};

// Mock data for development
const MOCK_PROFILE_DATA = {
  user: {
    id: "1",
    username: "rider1",
    email: "rider@example.com",
    first_name: "John",
    last_name: "Doe",
    contact_number: "+1234567890",
    date_of_birth: null,
    gender: "",
    bio: "",
    country: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
    zip_code: "",
  },
  rider: {
    id: "1",
    vehicle_type: "Motorcycle",
    plate_number: "ABC123",
    vehicle_brand: "Honda",
    vehicle_model: "Click",
    vehicle_image: null,
    license_number: "LIC123",
    verified: true,
    availability_status: "available",
    is_accepting_deliveries: true,
  },
};

export default function SettingsPage() {
  const { userId, userRole, clearAuthData } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [apiError, setApiError] = useState(false);

  // Fetch profile data using Axios
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setApiError(false);
      
      const response = await AxiosInstance.get('/rider-profile/profile/', {
        headers: {
          'X-User-Id': userId
        }
      });
      
      if (response.data) {
        setProfileData(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      setApiError(true);
      // Use mock data as fallback
      setProfileData(MOCK_PROFILE_DATA);
    } finally {
      setLoading(false);
    }
  };

  // Extract user data from profile with fallbacks
  const userData = profileData
    ? {
        name: `${profileData.user?.first_name || ""} ${profileData.user?.last_name || ""}`.trim() || "Rider",
        id: profileData.rider?.id || "N/A",
        email: profileData.user?.email || "No email",
        avatar: null, // No profile picture field
        phone: profileData.user?.contact_number || "No phone",
        verified: profileData.rider?.verified || false,
      }
    : {
        name: "Rider",
        id: "N/A",
        email: "No email",
        avatar: null,
        phone: "No phone",
        verified: false,
      };

  useEffect(() => {
    if (navigation && (navigation as any).setOptions) {
      (navigation as any).setOptions({ headerShown: false });
    }
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await clearAuthData();
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Logout error:", err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.message}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  // --- Reusable Setting Item Component ---
  const SettingItem = ({
    icon,
    iconColor = COLORS.primary,
    title,
    subtitle,
    onPress,
    isDestructive = false,
    showChevron = true,
  }: {
    icon: any;
    iconColor?: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    isDestructive?: boolean;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isDestructive ? "#FEF2F2" : COLORS.iconBg },
          ]}
        >
          <Feather
            name={icon}
            size={16}
            color={isDestructive ? COLORS.danger : iconColor}
          />
        </View>
        <View>
          <Text
            style={[styles.itemText, isDestructive && styles.destructiveText]}
          >
            {title}
          </Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <RiderHeader
        title="Settings"
        showBackButton={true}
        showNotifications={false}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* API Error Banner */}
        {apiError && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>
              Using offline data. Server connection issue.
            </Text>
          </View>
        )}

        {/* --- Profile Card --- */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={[styles.avatarContainer, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.avatarText}>
                {userData.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.name}</Text>
              <Text style={styles.profileId}>ID: {userData.id}</Text>
              {userData.verified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons
                    name="verified"
                    size={12}
                    color={COLORS.primary}
                  />
                  <Text style={styles.verifiedText}>Verified Rider</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push("/rider/edit-profile")}
            >
              <Feather name="edit-2" size={16} color={COLORS.subText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Account Section --- */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionGroup}>
          <SettingItem
            icon="user"
            title="Personal Information"
            subtitle={`${userData.email} • ${userData.phone}`}
            onPress={() => router.push("/rider/edit-profile")}
          />
          <View style={styles.separator} />
          <SettingItem
            icon="credit-card"
            title="Bank Accounts & Cards"
            onPress={() => router.push("/rider/payment-methods")}
          />
        </View>

        {/* --- Vehicle Information (if available) --- */}
        {profileData && profileData.rider?.vehicle_type && (
          <>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <View style={styles.sectionGroup}>
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: COLORS.iconBg }]}>
                    <Feather name="truck" size={16} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.itemText}>Vehicle Details</Text>
                    <Text style={styles.itemSubtitle}>
                      {profileData.rider.vehicle_brand} {profileData.rider.vehicle_model}
                    </Text>
                    <Text style={[styles.itemSubtitle, { marginTop: 2 }]}>
                      Plate: {profileData.rider.plate_number || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* --- Support --- */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionGroup}>
          <SettingItem
            icon="help-circle"
            title="Help Center"
            onPress={() => {
              Alert.alert("Help Center", "Visit our help center for assistance");
            }}
          />
          <View style={styles.separator} />
          <SettingItem
            icon="file-text"
            title="Terms & Policies"
            onPress={() => {
              Alert.alert("Terms & Policies", "View our terms of service and privacy policy");
            }}
          />
        </View>

        {/* --- Logout --- */}
        <View style={[styles.sectionGroup, styles.logoutGroup]}>
          <SettingItem
            icon="log-out"
            title="Log Out"
            isDestructive={true}
            showChevron={false}
            onPress={handleLogout}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        {/* Extra spacing for bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: COLORS.subText,
    marginTop: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },

  // Profile Card
  profileSection: {
    padding: 12,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  profileId: {
    fontSize: 10,
    color: COLORS.subText,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 3,
  },
  editProfileBtn: {
    padding: 4,
  },

  // Sections
  sectionTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.subText,
    marginLeft: 12,
    marginBottom: 6,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionGroup: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginHorizontal: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutGroup: {
    marginTop: 12,
    borderColor: "#FEE2E2",
  },

  // Setting Item
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.text,
  },
  itemSubtitle: {
    fontSize: 10,
    color: COLORS.subText,
    marginTop: 1,
  },
  destructiveText: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 48,
  },

  // Version
  versionContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  versionText: {
    fontSize: 10,
    color: COLORS.subText,
  },
});