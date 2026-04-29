// app/seller/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface DashboardSummary {
  total_sales?: number;
  total_earnings?: number;
  total_orders?: number;
  low_stock_count?: number;
  refund_requests?: number;
  draft_count?: number;
  pending_sales?: number;
  available_balance?: number;
}

interface ShopPerformance {
  shop_name?: string;
  average_rating?: number;
  total_reviews?: number;
  total_followers?: number;
  total_products?: number;
  active_products?: number;
  draft_products?: number;
  total_vat_collected?: number;
}

interface StoreManagementCounts {
  product_list?: number;
  orders?: number;
  gifts?: number;
  address?: number;
  shop_voucher?: number;
  product_voucher?: number;
}

interface DashboardData {
  summary: DashboardSummary;
  shop_performance: ShopPerformance;
  latest_orders?: any[];
  low_stock?: any[];
  refunds?: any;
  reports?: any;
  store_management_counts?: StoreManagementCounts;
}

interface BreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

function BreakdownModal({ visible, onClose, title, data }: BreakdownModalProps) {
  const renderBreakdownItem = (label: string, value: any, icon: string) => (
    <View style={modalStyles.breakdownItem} key={label}>
      <View style={modalStyles.breakdownLeft}>
        <Ionicons name={icon as any} size={20} color="#6B7280" />
        <Text style={modalStyles.breakdownLabel}>{label}</Text>
      </View>
      <Text style={modalStyles.breakdownValue}>{value}</Text>
    </View>
  );

  const getBreakdownContent = () => {
    if (!data) return null;

    switch (title) {
      case 'Total Sales':
        return (
          <>
            {renderBreakdownItem('Total Sales (Lifetime)', `₱${(data.total_sales || 0).toLocaleString('en-PH')}`, 'cash-outline')}
            {renderBreakdownItem('Total Earnings', `₱${(data.total_earnings || 0).toLocaleString('en-PH')}`, 'trending-up-outline')}
            {renderBreakdownItem('Total Orders', data.total_orders || 0, 'cart-outline')}
            {renderBreakdownItem('Refund Requests', data.refund_requests || 0, 'refresh-outline')}
            {renderBreakdownItem('Draft Count', data.draft_count || 0, 'create-outline')}
          </>
        );
      
      case 'Available Balance':
        return (
          <>
            {renderBreakdownItem('Available Balance', `₱${(data.available_balance || 0).toLocaleString('en-PH')}`, 'wallet-outline')}
            {renderBreakdownItem('Ready to withdraw', 'Funds that have passed the hold period', 'checkmark-circle-outline')}
          </>
        );

      case 'Pending Sales':
        return (
          <>
            {renderBreakdownItem('Pending Balance', `₱${(data.pending_sales || 0).toLocaleString('en-PH')}`, 'hourglass-outline')}
            {renderBreakdownItem('Awaiting Release', 'Hold period for refund eligibility', 'calendar-outline')}
          </>
        );

      case 'Deductions':
        return (
          <>
            {renderBreakdownItem('Total Deductions', `₱${(data.deductions || 0).toLocaleString('en-PH')}`, 'trending-down')}
            {renderBreakdownItem('Withdrawals', 'Funds that have been withdrawn', 'arrow-upward-outline')}
            {renderBreakdownItem('Refunds', 'Amount refunded to customers', 'refresh-outline')}
          </>
        );
      
      case 'Low Stock':
        const lowStockItems = data.low_stock || [];
        return (
          <>
            {renderBreakdownItem('Low Stock Items', lowStockItems.length, 'cube-outline')}
            {lowStockItems.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Products:</Text>
                {lowStockItems.map((item: any, idx: number) => (
                  <View key={idx} style={modalStyles.productItem}>
                    <Text style={modalStyles.productName}>{item.product_name}</Text>
                    <Text style={modalStyles.productStock}>Stock: {item.quantity} (Critical: {item.critical_stock})</Text>
                    <Text style={modalStyles.productPrice}>₱{item.price_with_vat?.toLocaleString('en-PH')}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        );
      
      case 'Refunds':
        return (
          <>
            {renderBreakdownItem('Pending Refunds', data.pending_count || 0, 'time-outline')}
            {renderBreakdownItem('Disputes', data.disputes_count || 0, 'alert-circle-outline')}
            {renderBreakdownItem('Total Refunds', data.total_count || 0, 'refresh-outline')}
            {data.latest && data.latest.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Latest Refunds:</Text>
                {data.latest.map((refund: any, idx: number) => (
                  <View key={idx} style={modalStyles.refundItem}>
                    <Text style={modalStyles.refundReason}>{refund.reason}</Text>
                    <Text style={modalStyles.refundAmount}>₱{refund.requested_amount?.toLocaleString('en-PH')}</Text>
                    <Text style={modalStyles.refundStatus}>Status: {refund.status}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        );
      
      case 'Rating':
        return (
          <>
            {renderBreakdownItem('Average Rating', `${(data.average_rating || 0).toFixed(1)} / 5.0`, 'star-outline')}
            {renderBreakdownItem('Total Reviews', data.total_reviews || 0, 'chatbubble-outline')}
          </>
        );
      
      case 'Followers':
        return (
          <>
            {renderBreakdownItem('Total Followers', data.total_followers || 0, 'people-outline')}
          </>
        );
      
      case 'Products':
        return (
          <>
            {renderBreakdownItem('Total Products', data.total_products || 0, 'grid-outline')}
            {renderBreakdownItem('Active Products', data.active_products || 0, 'checkmark-circle-outline')}
            {renderBreakdownItem('Draft Products', data.draft_products || 0, 'create-outline')}
            {renderBreakdownItem('Total VAT Collected', `₱${(data.total_vat_collected || 0).toLocaleString('en-PH')}`, 'calculator-outline')}
          </>
        );
      
      case 'Store Management':
        return (
          <>
            {renderBreakdownItem('Product List Items', data.product_list || 0, 'cube-outline')}
            {renderBreakdownItem('Orders', data.orders || 0, 'cart-outline')}
            {renderBreakdownItem('Gifts', data.gifts || 0, 'gift-outline')}
            {renderBreakdownItem('Addresses', data.address || 0, 'location-outline')}
            {renderBreakdownItem('Shop Vouchers', data.shop_voucher || 0, 'pricetag-outline')}
            {renderBreakdownItem('Product Vouchers', data.product_voucher || 0, 'pricetags-outline')}
          </>
        );
      
      case 'Reports & Notifications':
        return (
          <>
            {renderBreakdownItem('Active Reports', data.active_count || 0, 'alert-circle-outline')}
            {renderBreakdownItem('Total Reports', data.total_count || 0, 'document-text-outline')}
            {data.latest_notifications && data.latest_notifications.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Latest Notifications:</Text>
                {data.latest_notifications.map((notification: any, idx: number) => (
                  <View key={idx} style={modalStyles.notificationItem}>
                    <Text style={modalStyles.notificationTitle}>{notification.title}</Text>
                    <Text style={modalStyles.notificationMessage}>{notification.message}</Text>
                    <Text style={modalStyles.notificationTime}>{notification.time}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        );
      
      default:
        return <Text style={modalStyles.noData}>No breakdown data available</Text>;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getBreakdownContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchDashboardData();
    }
  }, [shopId]);

  const fetchDashboardData = async () => {
    if (!shopId) return;
  
    try {
      setLoading(true);
  
      const response = await AxiosInstance.get(`/seller-dashboard/get_dashboard/?shop_id=${shopId}`, {
        headers: { 'X-User-Id': userId || '' }
      });
  
      if (response.data.success) {
        let availableBalance = 0;
        let pendingBalance = 0;
        let totalSales = 0;
        let deductions = 0;
        
        try {
          const walletRes = await AxiosInstance.get('/wallet/balance/', {
            headers: { 'X-User-Id': userId || '' }
          });
          if (walletRes.data.success) {
            availableBalance = walletRes.data.available_balance || 0;
            pendingBalance = walletRes.data.pending_balance || 0;
            totalSales = (walletRes.data.lifetime_earnings || 0);
            deductions = (walletRes.data.lifetime_withdrawals || 0);
          }
        } catch (walletError) {
          console.error('Error fetching wallet balance:', walletError);
        }
  
        setData({
          summary: {
            ...response.data.summary,
            pending_sales: pendingBalance,
            available_balance: availableBalance,
            total_sales: totalSales,
            deductions: deductions,
          },
          shop_performance: response.data.shop_performance || {},
          latest_orders: response.data.latest_orders || [],
          low_stock: response.data.low_stock || [],
          refunds: response.data.refunds || {},
          reports: response.data.reports || {},
          store_management_counts: response.data.store_management_counts || {},
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₱0';
    return `₱${amount.toLocaleString('en-PH')}`;
  };

  const showBreakdown = (title: string, dataKey: string) => {
    let modalDataToShow = null;
    
    if (dataKey === 'summary') {
      modalDataToShow = { ...data?.summary, low_stock: data?.low_stock };
    } else if (dataKey === 'refunds') {
      modalDataToShow = data?.refunds;
    } else if (dataKey === 'shop_performance') {
      modalDataToShow = data?.shop_performance;
    } else if (dataKey === 'wallet') {
      modalDataToShow = data?.summary;
    } else if (dataKey === 'store_management') {
      modalDataToShow = data?.store_management_counts;
    } else if (dataKey === 'reports') {
      modalDataToShow = data?.reports;
    }
    
    setModalTitle(title);
    setModalData(modalDataToShow);
    setModalVisible(true);
  };

  const generatePDFReport = async () => {
    if (!data || !shopId) return;
    
    setGeneratingPDF(true);
    
    const shopName = data.shop_performance?.shop_name || 'My Shop';
    const generatedDate = new Date().toLocaleString();
    
    const summary = data.summary || {};
    const performance = data.shop_performance || {};
    const refunds = data.refunds || {};
    const reports = data.reports || {};
    const storeManagement = data.store_management_counts || {};
    const lowStockItems = data.low_stock || [];
    
    const lowStockHtml = lowStockItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.variant_title || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.critical_stock || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₱${(item.price_with_vat || 0).toLocaleString('en-PH')}</td>
      </tr>
    `).join('');
    
    const latestOrdersHtml = (data.latest_orders || []).map(order => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.order_id.slice(-8)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.customer_name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${order.status}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₱${(order.total_amount || 0).toLocaleString('en-PH')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${new Date(order.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Seller Dashboard Report</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 20px;
          }
          .shop-name {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
          }
          .report-date {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1F2937;
            border-left: 4px solid #4F46E5;
            padding-left: 12px;
            margin-bottom: 15px;
          }
          .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            flex: 1;
            min-width: 200px;
            background: #F9FAFB;
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #E5E7EB;
          }
          .stat-label {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background: #F3F4F6;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #374151;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 10px;
            color: #9CA3AF;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div class="report-date">Generated on: ${generatedDate}</div>
          <div class="report-date">Shop ID: ${shopId}</div>
        </div>

        <div class="section">
          <div class="section-title">Financial Overview</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Sales (Lifetime)</div>
              <div class="stat-value">${formatCurrency(summary.total_sales)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Earnings</div>
              <div class="stat-value">${formatCurrency(summary.total_earnings)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Orders</div>
              <div class="stat-value">${summary.total_orders || 0}</div>
            </div>
          </div>
          <div class="stats-grid">

          

            <div class="stat-card">
              <div class="stat-label">Refund Requests</div>
              <div class="stat-value">${summary.refund_requests || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Draft Count</div>
              <div class="stat-value">${summary.draft_count || 0}</div>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Available Balance</div>
              <div class="stat-value">${formatCurrency(summary.available_balance)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Pending Sales</div>
              <div class="stat-value">${formatCurrency(summary.pending_sales)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Shop Performance</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Average Rating</div>
              <div class="stat-value">${(performance.average_rating || 0).toFixed(1)} / 5.0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Reviews</div>
              <div class="stat-value">${performance.total_reviews || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Followers</div>
              <div class="stat-value">${performance.total_followers || 0}</div>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Products</div>
              <div class="stat-value">${performance.total_products || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active Products</div>
              <div class="stat-value">${performance.active_products || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Draft Products</div>
              <div class="stat-value">${performance.draft_products || 0}</div>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total VAT Collected</div>
              <div class="stat-value">${formatCurrency(performance.total_vat_collected)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Store Management</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Product List</div>
              <div class="stat-value">${storeManagement.product_list || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Orders</div>
              <div class="stat-value">${storeManagement.orders || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Gifts</div>
              <div class="stat-value">${storeManagement.gifts || 0}</div>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Addresses</div>
              <div class="stat-value">${storeManagement.address || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Shop Vouchers</div>
              <div class="stat-value">${storeManagement.shop_voucher || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Product Vouchers</div>
              <div class="stat-value">${storeManagement.product_voucher || 0}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Refunds Summary</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Pending Refunds</div>
              <div class="stat-value">${refunds.pending_count || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Disputes</div>
              <div class="stat-value">${refunds.disputes_count || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Refunds</div>
              <div class="stat-value">${refunds.total_count || 0}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Reports</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Active Reports</div>
              <div class="stat-value">${reports.active_count || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Reports</div>
              <div class="stat-value">${reports.total_count || 0}</div>
            </div>
          </div>
        </div>

        ${lowStockItems.length > 0 ? `
        <div class="section">
          <div class="section-title">Low Stock Alert</div>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Variant</th>
                <th class="text-center">Current Stock</th>
                <th class="text-center">Critical Level</th>
                <th class="text-right">Price (with VAT)</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockHtml}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.latest_orders && data.latest_orders.length > 0 ? `
        <div class="section">
          <div class="section-title">Latest Orders</div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th class="text-center">Status</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              ${latestOrdersHtml}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          This report is auto-generated by the Seller Dashboard system.<br/>
          For any discrepancies, please contact support.
        </div>
      </body>
      </html>
    `;
    
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (Platform.OS === 'ios') {
        await Print.printAsync({ uri });
      } else if (Platform.OS === 'android') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Dashboard Report',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const summary = data?.summary || {};
  const performance = data?.shop_performance || {};
  const storeManagement = data?.store_management_counts || {};
  const reports = data?.reports || {};

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color="#E5E7EB" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view dashboard</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#6B7280"
            colors={['#6B7280']}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.pdfButton}
                onPress={generatePDFReport}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={16} color="#4F46E5" />
                    <Text style={styles.pdfButtonText}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B7280" />
            </View>
          ) : (
            <>
              {/* Quick Stats */}
              <Text style={styles.sectionLabel}>Financial Overview</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Total Sales', 'summary')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="trending-up" size={20} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(summary.total_sales || 0)}</Text>
                  <Text style={styles.statLabel}>Total Sales</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Total Sales', 'summary')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="cart-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{summary.total_orders || 0}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Available Balance', 'wallet')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="wallet-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(summary.available_balance || 0)}</Text>
                  <Text style={styles.statLabel}>Available Balance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Pending Sales', 'wallet')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="hourglass-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(summary.pending_sales || 0)}</Text>
                  <Text style={styles.statLabel}>Pending Sales</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Low Stock', 'summary')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.statValue}>{summary.low_stock_count || 0}</Text>
                  <Text style={styles.statLabel}>Low Stock Items</Text>
                </TouchableOpacity>
              {/* Additional Financial Stats merged here */}
                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Refunds', 'refunds')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="refresh-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{summary.refund_requests || 0}</Text>
                  <Text style={styles.statLabel}>Refund Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Total Sales', 'summary')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="create-outline" size={20} color="#9333EA" />
                  </View>
                  <Text style={styles.statValue}>{summary.draft_count || 0}</Text>
                  <Text style={styles.statLabel}>Draft Products</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Products', 'shop_performance')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="calculator-outline" size={20} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(performance.total_vat_collected || 0)}</Text>
                  <Text style={styles.statLabel}>VAT Collected</Text>
                </TouchableOpacity>
              </View>

              {/* Refunds Section */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Refunds</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Refunds', 'refunds')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="time-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{data?.refunds?.pending_count || 0}</Text>
                  <Text style={styles.statLabel}>Pending Refunds</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Refunds', 'refunds')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.statValue}>{data?.refunds?.disputes_count || 0}</Text>
                  <Text style={styles.statLabel}>Disputes</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Refunds', 'refunds')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="refresh-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{data?.refunds?.total_count || 0}</Text>
                  <Text style={styles.statLabel}>Total Refunds</Text>
                </TouchableOpacity>
              </View>

              {/* Store Management */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Store Management</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Store Management', 'store_management')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="cube-outline" size={20} color="#059669" />
                  </View>
                  <Text style={styles.statValue}>{storeManagement.product_list || 0}</Text>
                  <Text style={styles.statLabel}>Products</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Store Management', 'store_management')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="cart-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{storeManagement.orders || 0}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Store Management', 'store_management')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="gift-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{storeManagement.gifts || 0}</Text>
                  <Text style={styles.statLabel}>Gifts</Text>
                </TouchableOpacity>

              </View>

              {/* Reports & Notifications */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Reports & Notifications</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Reports & Notifications', 'reports')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.statValue}>{reports.active_count || 0}</Text>
                  <Text style={styles.statLabel}>Active Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Reports & Notifications', 'reports')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{reports.total_count || 0}</Text>
                  <Text style={styles.statLabel}>Total Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard} 
                  onPress={() => showBreakdown('Reports & Notifications', 'reports')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="notifications-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{reports.latest_notifications?.length || 0}</Text>
                  <Text style={styles.statLabel}>Notifications</Text>
                </TouchableOpacity>
              </View>

              {/* Shop Performance */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Shop Performance</Text>
              <View style={styles.performanceCard}>
                <View style={styles.performanceRow}>
                  <TouchableOpacity 
                    style={styles.performanceItem} 
                    onPress={() => showBreakdown('Rating', 'shop_performance')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.performanceValue}>
                      {performance.average_rating?.toFixed(1) || '0.0'}
                    </Text>
                    <View style={styles.performanceRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name="star"
                          size={12}
                          color={star <= Math.round(performance.average_rating || 0) ? '#FBBF24' : '#E5E7EB'}
                        />
                      ))}
                    </View>
                    <Text style={styles.performanceLabel}>Rating</Text>
                    <Text style={styles.performanceMeta}>{performance.total_reviews || 0} reviews</Text>
                  </TouchableOpacity>

                  <View style={styles.performanceDivider} />

                  <TouchableOpacity 
                    style={styles.performanceItem} 
                    onPress={() => router.push(`/seller/view-followers?shopId=${shopId}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.performanceValue}>{performance.total_followers || 0}</Text>
                    <Ionicons name="people-outline" size={16} color="#6B7280" />
                    <Text style={styles.performanceLabel}>Followers</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.performanceDividerHorizontal} />

                <TouchableOpacity 
                  style={styles.productsSection}
                  onPress={() => showBreakdown('Products', 'shop_performance')}
                  activeOpacity={0.7}
                >
                  <View style={styles.productsHeader}>
                    <Ionicons name="grid-outline" size={16} color="#6B7280" />
                    <Text style={styles.productsTitle}>Products</Text>
                  </View>
                  <View style={styles.productsGrid}>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.total_products || 0}</Text>
                      <Text style={styles.productLabel}>Total</Text>
                    </View>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.active_products || 0}</Text>
                      <Text style={styles.productLabel}>Active</Text>
                    </View>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.draft_products || 0}</Text>
                      <Text style={styles.productLabel}>Draft</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <BreakdownModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalTitle}
        data={modalData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pdfButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4F46E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  sectionMargin: {
    marginTop: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  performanceRating: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  performanceMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  performanceDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  performanceDividerHorizontal: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  productsSection: {
    gap: 12,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  productsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  productStat: {
    alignItems: 'center',
  },
  productNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  productLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  noShopTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'column',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  productStock: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  refundItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  refundReason: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  refundAmount: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  refundStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  noData: {
    textAlign: 'center',
    padding: 40,
    color: '#9CA3AF',
  },
});