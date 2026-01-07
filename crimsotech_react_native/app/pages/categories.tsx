import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

const categories = [
  { id: '1', name: 'Smartphones', icon: 'smartphone', iconType: 'material', color: '#4CAF50' },
  { id: '2', name: 'Laptops', icon: 'laptop', iconType: 'material', color: '#2196F3' },
  { id: '3', name: 'Tablets', icon: 'tablet-android', iconType: 'material', color: '#FF9800' },
  { id: '4', name: 'Gaming', icon: 'gamepad-variant', iconType: 'material', color: '#E91E63' },
  { id: '5', name: 'Audio', icon: 'headphones', iconType: 'material', color: '#9C27B0' },
  { id: '6', name: 'Cameras', icon: 'camera', iconType: 'material', color: '#795548' },
  { id: '7', name: 'Smart Watches', icon: 'watch', iconType: 'material', color: '#607D8B' },
  { id: '8', name: 'Accessories', icon: 'cable', iconType: 'material', color: '#00BCD4' },
];

export default function CategoriesScreen() {
  const renderCategoryIcon = (item: any) => {
    const iconSize = isSmallDevice ? 28 : isLargeDevice ? 36 : 32;
    if (item.iconType === 'material') {
      return <MaterialIcons name={item.icon} size={iconSize} color={item.color} />;
    }
    if (item.iconType === 'fontawesome5') {
      return <FontAwesome5 name={item.icon} size={iconSize} color={item.color} />;
    }
    return null;
  };

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push(`/pages/category/${item.id}?name=${encodeURIComponent(item.name)}`)}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: `${item.color}15` }]}>
        {renderCategoryIcon(item)}
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.title}>All Categories</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'System',
  },
  spacer: {
    width: 40,
  },
  listContent: {
    padding: isSmallDevice ? 12 : 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - (isSmallDevice ? 48 : 64)) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 20 : 24,
    alignItems: 'center',
    marginBottom: isSmallDevice ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryIconContainer: {
    width: isSmallDevice ? 70 : 90,
    height: isSmallDevice ? 70 : 90,
    borderRadius: isSmallDevice ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  categoryName: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

