import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';

export default function BankAccountsPage() {
  const { userRole } = useAuth();

  if (userRole && userRole !== 'customer') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  const handleLinkMariBank = () => {
    console.log('Link MariBank Account');
    // TODO: Navigate to MariBank linking flow
  };

  const handleAddCard = () => {
    console.log('Add New Card');
    // TODO: Navigate to add card screen
  };

  const handleAddBankAccount = () => {
    console.log('Add Bank Account');
    // TODO: Navigate to add bank account screen
  };

  const handleManageBPIAccount = () => {
    console.log('Manage BPI Account');
    // TODO: Navigate to BPI account details
  };

  const handleAutoPaymentService = () => {
    console.log('Auto Payment Service');
    // TODO: Navigate to auto payment settings
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Accounts / Cards</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MariBank Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, styles.mariButtonBg]} 
            onPress={handleLinkMariBank}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="bank" size={24} color="#6366F1" />
              </View>
              <Text style={styles.buttonText}>Link MariBank Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Credit / Debit Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit / Debit Card</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleAddCard}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.addIconCircle}>
                <Ionicons name="add" size={22} color="#6366F1" />
              </View>
              <Text style={styles.addButtonText}>Add New Card</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Bank Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Account</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleAddBankAccount}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.addIconCircle}>
                <Ionicons name="add" size={22} color="#6366F1" />
              </View>
              <Text style={styles.addButtonText}>Add Bank Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Linked Bank Accounts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Bank Accounts</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleManageBPIAccount}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.linkedIconCircle}>
                <MaterialCommunityIcons name="bank-check" size={22} color="#10B981" />
              </View>
              <View style={styles.linkedTextContainer}>
                <Text style={styles.linkedButtonText}>Link BPI Account</Text>
                <Text style={styles.linkedSubtext}>****1234</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Auto Payment Service Section */}
        <View style={[styles.section, styles.lastSection]}>
          <TouchableOpacity 
            style={styles.footerButton} 
            onPress={handleAutoPaymentService}
            activeOpacity={0.7}
          >
            <View style={styles.footerContent}>
              <View style={styles.footerIconCircle}>
                <MaterialIcons name="payment" size={22} color="#6366F1" />
              </View>
              <View style={styles.footerTextContainer}>
                <Text style={styles.footerTitle}>Auto Payment Service</Text>
                <Text style={styles.footerSubtitle}>Manage automatic payments</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mariButtonBg: {
    backgroundColor: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
  },
  linkedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  linkedTextContainer: {
    flex: 1,
  },
  linkedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  linkedSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  footerTextContainer: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  footerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});
