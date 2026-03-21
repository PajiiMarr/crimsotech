import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

interface RiderPageHeaderProps {
  title: string;
  subtitle?: string;
}

const COLORS = {
  primary: '#1F2937',
  secondary: '#111827',
  muted: '#9CA3AF',
  bg: '#FFFFFF',
  cardBg: '#FFFFFF',
  border: '#F3F4F6',
};

export default function RiderPageHeader({ title, subtitle }: RiderPageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
        )}
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/rider/message')}
        >
          <Feather name="message-square" size={22} color={COLORS.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/rider/notification')}
        >
          <Feather name="bell" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerInfo: {
    flex: 1,
    paddingRight: 96,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerActions: {
    position: 'absolute',
    right: 16,
    top: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});
