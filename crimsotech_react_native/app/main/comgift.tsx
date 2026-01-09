import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

type StatItem = {
  id: string;
  title: string;
  value: string;
  color: string;
};

type HowItWorksItem = {
  id: string;
  title: string;
  number: string;
  color: string;
};

type GiftItem = {
  id: string;
  name: string;
  condition: string;
  seller: string;
  rating: number;
  location: string;
  timeAgo: string;
  views: number;
  claims: number;
  badge: string;
  badgeColor: string;
};

// Updated mock data to match the image
const availableGifts: GiftItem[] = [
  {
    id: "1",
    name: "Samsung Galaxy S10",
    condition: "Good condition, minor scratches on back",
    seller: "TechRecycler",
    rating: 4.5,
    location: "Quezon City",
    timeAgo: "2 hours ago",
    views: 124,
    claims: 8,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "2",
    name: "Dell Latitude Laptop",
    condition: "2019 model, i5 processor, 8GB RAM",
    seller: "OfficeClearance",
    rating: 4.5,
    location: "Makati Central",
    timeAgo: "1 day ago",
    views: 89,
    claims: 12,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "3",
    name: "iPhone 12 Pro",
    condition: "Excellent condition, battery health 92%",
    seller: "PhoneHub",
    rating: 4.8,
    location: "Taguig",
    timeAgo: "3 hours ago",
    views: 256,
    claims: 15,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "4",
    name: "Sony WH-1000XM4",
    condition: "Like new, all accessories included",
    seller: "AudioShop",
    rating: 4.6,
    location: "Mandaluyong",
    timeAgo: "5 hours ago",
    views: 187,
    claims: 6,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "5",
    name: "iPad Air 4th Gen",
    condition: "Good condition, includes case",
    seller: "GadgetExchange",
    rating: 4.4,
    location: "Pasig City",
    timeAgo: "1 day ago",
    views: 312,
    claims: 21,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "6",
    name: "MacBook Pro 2020",
    condition: "M1 chip, 256GB SSD, excellent condition",
    seller: "AppleReseller",
    rating: 4.9,
    location: "BGC",
    timeAgo: "4 hours ago",
    views: 432,
    claims: 32,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
  {
    id: "7",
    name: "Samsung Odyssey Monitor",
    condition: "27 inch, 144Hz, perfect condition",
    seller: "GamingHub",
    rating: 4.7,
    location: "Manila",
    timeAgo: "2 days ago",
    views: 156,
    claims: 9,
    badge: "FREE",
    badgeColor: "#4CAF50",
  },
];

const tabs = ["All Gifts", "Available", "Nearby", "New Items", "Popular", "Ending Soon"];

const statsData = [
  { id: "1", title: "Total Gifts", value: "8", color: "#3897e6ff" },
  { id: "2", title: "Available", value: "7", color: "#4CAF50" },
  { id: "3", title: "Claimed", value: "1", color: "#FF9800" },
];

const howItWorksData = [
  {
    id: "1",
    title: "Sellers gift unused electronics",
    number: "1",
    color: "#2196F3",
  },
  {
    id: "2",
    title: "Browse and claim free items",
    number: "2",
    color: "#4CAF50",
  },
  {
    id: "3",
    title: "Pick up from seller's location",
    number: "3",
    color: "#FF9800",
  },
];

export default function ComgiftScreen() {
  const [activeTab, setActiveTab] = useState("Available");
  const [selectedItem, setSelectedItem] = useState<GiftItem | null>(null);

  const renderStatsCard = (item: StatItem) => (
    <View key={item.id} style={[styles.statCard, { backgroundColor: item.color }]}>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statTitle}>{item.title}</Text>
    </View>
  );

  const renderHowItWorks = (item: HowItWorksItem) => (
    <View key={item.id} style={styles.stepCard}>
      <View style={[styles.stepNumber, { backgroundColor: `${item.color}15` }]}>
        <Text style={[styles.stepNumberText, { color: item.color }]}>
          {item.number}
        </Text>
      </View>
      <Text style={styles.stepTitle}>{item.title}</Text>
    </View>
  );

  const renderGiftItem = ({ item }: { item: GiftItem }) => (
    <TouchableOpacity style={styles.giftItem} onPress={() => setSelectedItem(item)}>
      <View style={styles.giftHeader}>
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.giftName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      
      <Text style={styles.giftCondition} numberOfLines={2}>
        {item.condition}
      </Text>
      
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerName}>{item.seller}</Text>
        <View style={styles.rating}>
          <MaterialIcons name="star" size={14} color="#FFC107" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      
      <View style={styles.locationInfo}>
        <MaterialIcons name="location-on" size={14} color="#666" />
        <Text style={styles.locationText}>{item.location}</Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <MaterialIcons name="visibility" size={14} color="#666" />
          <Text style={styles.statText}>{item.views} views</Text>
        </View>
        <View style={styles.stat}>
          <MaterialIcons name="shopping-cart" size={14} color="#666" />
          <Text style={styles.statText}>{item.claims} claims</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.claimButton}>
        <Text style={styles.claimButtonText}>Claim</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderTabItem = (tab: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {tab}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>ComGift</Text>
          <TouchableOpacity style={styles.searchButton}>
            <MaterialIcons name="search" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Claim free electronics from sellers • {availableGifts.length} items available
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          {statsData.map(renderStatsCard)}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.howItWorks}>
            {howItWorksData.map(renderHowItWorks)}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map(renderTabItem)}
          </ScrollView>
        </View>

        {/* Gifts Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Electronics</Text>
          <FlatList<GiftItem>
            data={availableGifts}
            renderItem={renderGiftItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.giftsRow}
            contentContainerStyle={styles.giftsGrid}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Gift Floating Button */}
      <TouchableOpacity style={styles.addButton}>
        <MaterialIcons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#FFF",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#06aa06ff",
  },
  searchButton: {
    padding: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFF",
    marginTop: 1,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#FFF",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  howItWorks: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  activeTabItem: {
    backgroundColor: "#01a70eff",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FFF",
  },
  giftsGrid: {
    paddingBottom: 16,
  },
  giftsRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  giftItem: {
    width: (width - 40) / 2,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  giftHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "700",
  },
  giftName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  giftCondition: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    marginRight: 8,
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    color: "#999",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 4,
  },
  claimButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  claimButtonText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1d9b03ff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomSpacing: {
    height: 80,
  },
});