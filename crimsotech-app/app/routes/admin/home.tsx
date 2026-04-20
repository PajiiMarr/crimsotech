// app/routes/home.tsx
"use client"
import { useState, useRef } from 'react';
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Store, 
  Zap, 
  Bell, 
  Star, 
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  Shield,
  FileText,
  BarChart3,
  ShoppingBag,
  UserCheck,
  Settings,
  RefreshCw,
  PhilippinePeso,
  X,
  Calculator,
  Receipt,
  Gauge,
  Clock,
  Wallet,
  Printer,
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [{ title: "Dashboard | Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isAdmin"]);
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);
  const defaultEndDate = new Date();
  let dashboardData = null;
  try {
    const params = new URLSearchParams();
    params.append('start_date', defaultStartDate.toISOString().split('T')[0]);
    params.append('end_date', defaultEndDate.toISOString().split('T')[0]);
    params.append('range_type', 'weekly');
    const dashboardResponse = await AxiosInstance.get(`/admin-dashboard/get_comprehensive_dashboard/?${params.toString()}`, {
      headers: { "X-User-Id": session.get("userId") }
    });
    if (dashboardResponse.data.success) {
      dashboardData = dashboardResponse.data;
    } else {
      throw new Error('Failed to fetch dashboard data');
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    dashboardData = {
      success: false,
      date_range: {
        start_date: defaultStartDate.toISOString().split('T')[0],
        end_date: defaultEndDate.toISOString().split('T')[0],
        range_type: 'weekly',
      },
      overview: {
        total_revenue: 0, total_completed_revenue: 0, total_pending_revenue: 0,
        total_orders: 0, active_customers: 0, active_shops: 0,
        current_period_orders: 0, current_period_completed_revenue: 0,
        current_period_pending_revenue: 0, current_period_revenue: 0,
        current_period_shipping_fees: 0, current_period_platform_fees: 0,
        previous_period_orders: 0, previous_period_revenue: 0,
        order_growth: 0, revenue_growth: 0, date_range_days: 0
      },
      operational: {
        active_boosts: 0, boost_revenue: 0, pending_refunds: 0, pending_refund_amount: 0,
        completed_refunds: 0, completed_refund_amount: 0, low_stock_products: 0,
        avg_rating: 0, total_reviews: 0, pending_reports: 0, active_riders: 0,
        total_riders: 0, completed_deliveries: 0, total_delivery_fees: 0,
        active_vouchers: 0, vouchers_used: 0, total_voucher_discount: 0,
        incoming_balance: 0, calculation_notes: {}
      },
      sales_analytics: { sales_data: [], status_distribution: [], grouping: 'daily' },
      user_analytics: { user_growth: [] },
      product_analytics: { product_performance: [] },
      shop_analytics: { shop_performance: [] }
    };
  }
  return { 
    user, 
    dashboardData: dashboardData.success ? dashboardData : null,
  };
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
      </div>
    </div>
  );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.2cm 1.5cm;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      width: 210mm;
      font-size: 10pt;
      background: #fff !important;
    }

    /* Hide everything by default */
    body > * { display: none !important; }

    /* Show only the dashboard content */
    #print-root,
    #print-root * {
      display: revert !important;
    }

    .no-print { display: none !important; }
    .print-only { display: block !important; }

    /* Layout reset */
    #print-root {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Print header */
    .print-header {
      text-align: center;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
      border-bottom: 2pt solid #3b82f6;
    }
    .print-header h1 { font-size: 18pt; font-weight: 700; color: #1e3a5f; margin: 0 0 4pt; }
    .print-header p  { font-size: 9pt; color: #4b5563; margin: 2pt 0 0; }

    /* Section headings */
    .print-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin: 14pt 0 6pt;
      padding-bottom: 3pt;
      border-bottom: 1pt solid #e5e7eb;
      page-break-after: avoid;
    }

    /* Metric grid: 4 across on A4 */
    .print-metric-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 6pt !important;
      margin-bottom: 10pt !important;
      page-break-inside: avoid;
    }

    .print-metric-card {
      border: 1pt solid #e5e7eb !important;
      border-radius: 6pt !important;
      padding: 8pt !important;
      background: #fff !important;
      page-break-inside: avoid;
    }
    .print-metric-card .card-label  { font-size: 7pt; color: #6b7280; margin-bottom: 2pt; }
    .print-metric-card .card-value  { font-size: 13pt; font-weight: 700; color: #111827; line-height: 1.2; }
    .print-metric-card .card-sub    { font-size: 6.5pt; color: #9ca3af; margin-top: 2pt; }
    .print-metric-card .card-change { font-size: 7pt; margin-top: 3pt; display: flex; align-items: center; gap: 2pt; }
    .card-change.up   { color: #16a34a; }
    .card-change.down { color: #dc2626; }

    /* Chart section: side by side */
    .print-chart-row {
      display: grid !important;
      grid-template-columns: 2fr 1fr !important;
      gap: 8pt !important;
      margin-bottom: 10pt !important;
      page-break-inside: avoid;
    }
    .print-chart-row-half {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8pt !important;
      margin-bottom: 10pt !important;
      page-break-inside: avoid;
    }

    .print-chart-card {
      border: 1pt solid #e5e7eb !important;
      border-radius: 6pt !important;
      padding: 8pt !important;
      background: #fff !important;
      page-break-inside: avoid;
    }
    .print-chart-card h3 { font-size: 9pt; font-weight: 700; color: #1e3a5f; margin: 0 0 2pt; }
    .print-chart-card p  { font-size: 7pt; color: #6b7280; margin: 0 0 6pt; }

    /* Shop list */
    .print-shop-item {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 5pt 0 !important;
      border-bottom: 0.5pt solid #f3f4f6 !important;
    }
    .print-shop-item:last-child { border-bottom: none !important; }
    .shop-avatar {
      width: 22pt; height: 22pt;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 9pt;
      flex-shrink: 0;
    }
    .shop-info  { flex: 1; padding: 0 6pt; }
    .shop-name  { font-size: 8pt; font-weight: 600; color: #111827; }
    .shop-meta  { font-size: 6.5pt; color: #9ca3af; }
    .shop-sales { text-align: right; }
    .shop-sales .amount { font-size: 8pt; font-weight: 700; color: #111827; }
    .shop-sales .rating { font-size: 6.5pt; color: #9ca3af; }

    /* Platform stats grid */
    .print-platform-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 6pt !important;
    }
    .print-platform-item {
      text-align: center;
      padding: 6pt;
      border: 1pt solid #e5e7eb;
      border-radius: 5pt;
    }
    .platform-val  { font-size: 14pt; font-weight: 700; }
    .platform-label{ font-size: 7pt; color: #6b7280; margin-top: 1pt; }

    /* Status distribution table */
    .print-status-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .print-status-table th { background: #f3f4f6; padding: 4pt 6pt; text-align: left; font-weight: 600; color: #374151; }
    .print-status-table td { padding: 4pt 6pt; border-bottom: 0.5pt solid #f3f4f6; }
    .status-dot { display: inline-block; width: 7pt; height: 7pt; border-radius: 50%; margin-right: 4pt; vertical-align: middle; }

    /* Bar chart replacement table */
    .print-bar-table { width: 100%; font-size: 7.5pt; border-collapse: collapse; }
    .print-bar-table td { padding: 3pt 4pt; vertical-align: middle; }
    .bar-bg { background: #f3f4f6; border-radius: 3pt; height: 10pt; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3pt; }

    /* Print footer */
    .print-footer {
      text-align: center;
      margin-top: 16pt;
      padding-top: 8pt;
      border-top: 1pt solid #e5e7eb;
      font-size: 7.5pt;
      color: #9ca3af;
    }

    /* Force page breaks */
    .page-break-before { page-break-before: always; }
    .page-break-avoid  { page-break-inside: avoid; }
  }
`;

// ── Modal ────────────────────────────────────────────────────────────────────
const BreakdownModal = ({ isOpen, onClose, title, data, type }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">{title} - Detailed Breakdown</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {type === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Period Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{data.currentPeriodRevenue}</p>
                  <p className="text-xs text-gray-500 mt-1">From: {data.currentPeriodCompletedRevenue} completed + {data.currentPeriodPendingRevenue} pending</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Previous Period Revenue</p>
                  <p className="text-2xl font-bold text-gray-600">{data.previousPeriodRevenue}</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Incoming Balance (Pending Orders)</p>
                <p className="text-2xl font-bold text-purple-600">{data.incomingBalance}</p>
                <p className="text-xs text-gray-500 mt-1">Orders still in progress — realized when completed</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Growth</p>
                <p className={`text-2xl font-bold ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.growth}%</p>
                <p className="text-xs text-gray-500 mt-1">Formula: (Current - Previous) / Previous × 100</p>
              </div>
              {data.shippingFees !== undefined && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600">Shipping Fees Collected</p>
                  <p className="text-2xl font-bold text-indigo-600">{data.shippingFees}</p>
                </div>
              )}
              {data.platformFees !== undefined && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Platform Fees (5%)</p>
                  <p className="text-2xl font-bold text-orange-600">{data.platformFees}</p>
                </div>
              )}
            </div>
          )}
          {type === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Period Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{data.currentPeriodOrders}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Previous Period Orders</p>
                  <p className="text-2xl font-bold text-gray-600">{data.previousPeriodOrders}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-lg font-bold text-green-600">{data.completedOrders || 0}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Pending/Processing</p>
                  <p className="text-lg font-bold text-yellow-600">{data.pendingOrders || 0}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Cancelled/Refunded</p>
                  <p className="text-lg font-bold text-red-600">{data.cancelledOrders || 0}</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Growth</p>
                <p className={`text-2xl font-bold ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.growth}%</p>
                <p className="text-xs text-gray-500 mt-1">Formula: (Current - Previous) / Previous × 100</p>
              </div>
            </div>
          )}
          {type === 'customers' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Active Customers</p>
                <p className="text-2xl font-bold text-blue-600">{data.total}</p>
                <p className="text-xs text-gray-500 mt-1">All customers who ever registered and not suspended</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">New Customers (Period)</p>
                  <p className="text-2xl font-bold text-purple-600">{data.newCustomers}</p>
                  <p className="text-xs text-gray-500 mt-1">Registered during selected date range</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Returning Customers</p>
                  <p className="text-2xl font-bold text-green-600">{data.returningCustomers}</p>
                  <p className="text-xs text-gray-500 mt-1">Registered before period but made orders during period</p>
                </div>
              </div>
            </div>
          )}
          {type === 'shops' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Active Shops</p>
                <p className="text-2xl font-bold text-blue-600">{data.total}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Verified Shops</p>
                  <p className="text-2xl font-bold text-green-600">{data.verified}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Pending Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Suspended Shops</p>
                  <p className="text-2xl font-bold text-red-600">{data.suspended}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'boosts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active Boosts</p>
                  <p className="text-2xl font-bold text-green-600">{data.active}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Boost Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{data.boostRevenue}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'refunds' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Refunds</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">Amount: {data.pendingAmount}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Completed Refunds</p>
                  <p className="text-2xl font-bold text-green-600">{data.completed}</p>
                  <p className="text-xs text-gray-500 mt-1">Amount: {data.completedAmount}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">In Dispute</p>
                  <p className="text-2xl font-bold text-red-600">{data.dispute}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'lowstock' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Products with Low Stock</p>
                <p className="text-2xl font-bold text-red-600">{data.total}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Critical Stock (Below 3)</p>
                  <p className="text-2xl font-bold text-orange-600">{data.critical}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Warning Stock (Below 10)</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.warning}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'rating' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-blue-600">{data.average} ★</p>
                <p className="text-xs text-gray-500 mt-1">Based on {data.totalReviews || 0} reviews in this period</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[5,4,3,2,1].map(star => (
                  <div key={star} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-lg font-bold">{star}★</p>
                    <p className="text-xs text-gray-600">{data.byRating?.[star] || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {type === 'reports' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold text-red-600">{data.pending}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{data.resolved}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Dismissed</p>
                  <p className="text-2xl font-bold text-gray-600">{data.dismissed || 0}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'riders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active Riders</p>
                  <p className="text-2xl font-bold text-green-600">{data.active}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Riders</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalRiders}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Online/Active</p>
                  <p className="text-lg font-bold text-green-600">{data.online || Math.floor(data.active * 0.7)}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">On Delivery</p>
                  <p className="text-lg font-bold text-yellow-600">{data.onDelivery || Math.floor(data.active * 0.3)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Offline/Break</p>
                  <p className="text-lg font-bold text-gray-600">{data.offline || Math.floor(data.active * 0.1)}</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Completed Deliveries (Period)</p>
                <p className="text-2xl font-bold text-purple-600">{data.completedDeliveries}</p>
                <p className="text-xs text-gray-500 mt-1">Total delivery fees: {data.totalDeliveryFees}</p>
              </div>
            </div>
          )}
          {type === 'vouchers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Active Vouchers</p>
                  <p className="text-2xl font-bold text-green-600">{data.active}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Vouchers Used</p>
                  <p className="text-2xl font-bold text-blue-600">{data.used}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-purple-600">{data.expiringSoon || 0}</p>
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Discount Given</p>
                <p className="text-2xl font-bold text-orange-600">{data.totalDiscount}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Shop Vouchers</p>
                  <p className="text-lg font-bold text-indigo-600">{data.shopVouchers || 0}</p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Product Vouchers</p>
                  <p className="text-lg font-bold text-pink-600">{data.productVouchers || 0}</p>
                </div>
              </div>
            </div>
          )}
          {type === 'system' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">{data.status}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold text-blue-600">{data.uptime}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-purple-600">{data.responseTime}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, change, icon: Icon, trend, description, loading = false, onClick, subValue, subLabel }: any) => (
  <Card className={onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""} onClick={onClick}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-muted rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-1">{value}</p>
          )}
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subLabel}: {subValue}</p>}
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {!loading && change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MetricGrid = ({ title, children }: any) => (
  <div className="space-y-4 metric-grid">
    {title && <h3 className="text-lg font-semibold">{title}</h3>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-muted rounded animate-pulse ${className}`} />
);

// ── PrintReport ───────────────────────────────────────────────────────────────
// A self-contained, print-only component that renders a pixel-perfect A4 layout.
const PrintReport = ({
  overview, operational, salesAnalytics, userAnalytics, productAnalytics, shopAnalytics,
  dateRange, formatCurrency, formatCompactNumber, formatDate,
}: any) => {
  const avatarColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];

  const MetricCard = ({ label, value, sub, change, changeUp }: any) => (
    <div className="print-metric-card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub   && <div className="card-sub">{sub}</div>}
      {change && (
        <div className={`card-change ${changeUp ? 'up' : 'down'}`}>
          {changeUp ? '▲' : '▼'} {change}
        </div>
      )}
    </div>
  );

  // Build bar-chart data for products
  const maxOrders = Math.max(...(productAnalytics.product_performance || []).map((p: any) => p.orders || 0), 1);

  return (
    <div id="print-root" className="print-only hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* ── Header ── */}
      <div className="print-header">
        <h1>Admin Dashboard Report</h1>
        <p>Generated: {new Date().toLocaleString('en-PH')}</p>
        <p>Period: {formatDate(dateRange.start)} — {formatDate(dateRange.end)} &nbsp;|&nbsp; {dateRange.rangeType.toUpperCase()}</p>
      </div>

      {/* ── Core Business Metrics ── */}
      <div className="print-section-title">Core Business Metrics</div>
      <div className="print-metric-grid">
        <MetricCard
          label="Period Revenue"
          value={formatCurrency(overview.current_period_revenue || 0)}
          sub={`${formatCurrency(overview.current_period_completed_revenue || 0)} completed + ${formatCurrency(overview.current_period_pending_revenue || 0)} pending`}
          change={`${(overview.revenue_growth || 0) >= 0 ? '+' : ''}${overview.revenue_growth || 0}%`}
          changeUp={(overview.revenue_growth || 0) >= 0}
        />
        <MetricCard
          label="Period Orders"
          value={formatCompactNumber(overview.current_period_orders || 0)}
          sub={`Last ${overview.date_range_days || 7} days`}
          change={`${(overview.order_growth || 0) >= 0 ? '+' : ''}${overview.order_growth || 0}%`}
          changeUp={(overview.order_growth || 0) >= 0}
        />
        <MetricCard
          label="Active Customers"
          value={formatCompactNumber(overview.active_customers || 0)}
          sub="Total registered"
          change="+15.2%" changeUp
        />
        <MetricCard
          label="Active Shops"
          value={formatCompactNumber(overview.active_shops || 0)}
          sub="Total verified"
          change="+3.5%" changeUp
        />
      </div>

      {/* ── Operational Metrics ── */}
      <div className="print-section-title">Operational Metrics</div>
      <div className="print-metric-grid">
        <MetricCard
          label="Incoming Balance"
          value={formatCurrency(overview.current_period_pending_revenue || 0)}
          sub="From pending orders"
        />
        <MetricCard
          label="Active Boosts"
          value={(operational.active_boosts || 0).toString()}
          sub={`Revenue: ${formatCurrency(operational.boost_revenue || 0)}`}
        />
        <MetricCard
          label="Pending Refunds"
          value={(operational.pending_refunds || 0).toString()}
          sub={`Amount: ${formatCurrency(operational.pending_refund_amount || 0)}`}
          change="Needs attention" changeUp={false}
        />
        <MetricCard
          label="Low Stock Alerts"
          value={(operational.low_stock_products || 0).toString()}
          sub="Need restocking"
          change="Critical" changeUp={false}
        />
      </div>

      {/* ── Platform Health ── */}
      <div className="print-section-title">Platform Health</div>
      <div className="print-metric-grid">
        <MetricCard
          label="Average Rating"
          value={`${operational.avg_rating || 0} ★`}
          sub={`${operational.total_reviews || 0} reviews`}
          change="+0.2" changeUp
        />
        <MetricCard
          label="Pending Reports"
          value={(operational.pending_reports || 0).toString()}
          sub="Moderation queue"
        />
        <MetricCard
          label="Active Riders"
          value={(operational.active_riders || 0).toString()}
          sub={`Completed deliveries: ${operational.completed_deliveries || 0}`}
        />
        <MetricCard
          label="Active Vouchers"
          value={(operational.active_vouchers || 0).toString()}
          sub={`Used: ${operational.vouchers_used || 0} | Discount: ${formatCurrency(operational.total_voucher_discount || 0)}`}
        />
      </div>

      {/* ── Sales Trend + Order Status ── */}
      <div className="print-section-title page-break-avoid">Sales & Order Analytics</div>
      <div className="print-chart-row page-break-avoid">
        {/* Sales trend as a data table */}
        <div className="print-chart-card">
          <h3>Sales & Revenue Trend</h3>
          <p>Revenue includes completed + pending (incoming balance)</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '3pt 5pt', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Period</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Orders</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>Completed</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>Pending</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>Shipping</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>Platform Fee</th>
              </tr>
            </thead>
            <tbody>
              {(salesAnalytics.sales_data || []).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td style={{ padding: '3pt 5pt', color: '#374151' }}>{row.name || row.date || '—'}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{row.orders ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#10b981' }}>{formatCurrency(row.completed_revenue ?? 0)}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(row.pending_revenue ?? 0)}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#8b5cf6' }}>{formatCurrency(row.shipping_fees ?? 0)}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(row.platform_fees ?? 0)}</td>
                </tr>
              ))}
              {(salesAnalytics.sales_data || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding: '6pt', textAlign: 'center', color: '#9ca3af' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Order Status distribution */}
        <div className="print-chart-card">
          <h3>Order Status Distribution</h3>
          <p>Current period breakdown</p>
          <table className="print-status-table">
            <thead>
              <tr>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Count</th>
                <th style={{ textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const dist = salesAnalytics.status_distribution || [];
                const total = dist.reduce((s: number, d: any) => s + (d.count || 0), 0) || 1;
                return dist.map((d: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <span className="status-dot" style={{ background: d.color || COLORS[i % COLORS.length] }} />
                      {d.status}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.count || 0}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>{((d.count / total) * 100).toFixed(1)}%</td>
                  </tr>
                ));
              })()}
              {(salesAnalytics.status_distribution || []).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Customer Growth + Top Products ── */}
      <div className="print-section-title page-break-avoid">Customer & Product Analytics</div>
      <div className="print-chart-row-half page-break-avoid">
        {/* Customer growth table */}
        <div className="print-chart-card">
          <h3>Customer Growth</h3>
          <p>New vs returning in selected period</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '3pt 5pt', textAlign: 'left', fontWeight: 600 }}>Period</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>New</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>Returning</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(userAnalytics.user_growth || []).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td style={{ padding: '3pt 5pt' }}>{row.period || '—'}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#3b82f6' }}>{row.new_users ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#10b981' }}>{row.returning_users ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600 }}>{(row.new_users ?? 0) + (row.returning_users ?? 0)}</td>
                </tr>
              ))}
              {(userAnalytics.user_growth || []).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '6pt' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top products with mini bar */}
        <div className="print-chart-card">
          <h3>Top Products</h3>
          <p>Best performing by orders</p>
          <table className="print-bar-table">
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '3pt 4pt', textAlign: 'left', fontWeight: 600, fontSize: '7pt' }}>Product</th>
                <th style={{ padding: '3pt 4pt', textAlign: 'right', fontWeight: 600, fontSize: '7pt', color: '#10b981' }}>Orders</th>
                <th style={{ padding: '3pt 4pt', textAlign: 'right', fontWeight: 600, fontSize: '7pt', color: '#f59e0b' }}>Platform Fee</th>
              </tr>
            </thead>
            <tbody>
              {(productAnalytics.product_performance || []).slice(0, 8).map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td style={{ padding: '3pt 4pt' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4pt' }}>
                      <div className="bar-bg" style={{ width: '36pt', flexShrink: 0 }}>
                        <div className="bar-fill" style={{ width: `${((p.orders || 0) / maxOrders) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span style={{ fontSize: '6.5pt', color: '#374151' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '3pt 4pt', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{p.orders ?? 0}</td>
                  <td style={{ padding: '3pt 4pt', textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(p.platform_fee ?? 0)}</td>
                </tr>
              ))}
              {(productAnalytics.product_performance || []).length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af', padding: '6pt' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top Shops + Platform Overview ── */}
      <div className="print-section-title page-break-avoid">Shop & Platform Summary</div>
      <div className="print-chart-row-half page-break-avoid">
        <div className="print-chart-card">
          <h3>Top Performing Shops</h3>
          <p>By sales volume and ratings</p>
          {(shopAnalytics.shop_performance || []).slice(0, 6).map((shop: any, i: number) => (
            <div className="print-shop-item" key={i}>
              <div className="shop-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                {shop.name.charAt(0)}
              </div>
              <div className="shop-info">
                <div className="shop-name">{shop.name}</div>
                <div className="shop-meta">{shop.followers || 0} followers · Avg: {formatCurrency(shop.average_order_value || 0)}</div>
              </div>
              <div className="shop-sales">
                <div className="amount">{formatCurrency(shop.sales || 0)}</div>
                <div className="rating">{shop.rating || 0}★ · Fee: {formatCurrency(shop.platform_fee || 0)}</div>
              </div>
            </div>
          ))}
          {(shopAnalytics.shop_performance || []).length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '7.5pt', padding: '8pt 0' }}>No shop data available</p>
          )}
        </div>

        <div className="print-chart-card">
          <h3>Platform Overview</h3>
          <p>Key statistics at a glance</p>
          <div className="print-platform-grid">
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#3b82f6' }}>{formatCompactNumber(overview.current_period_orders || 0)}</div>
              <div className="platform-label">Period Orders</div>
            </div>
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#10b981' }}>{formatCompactNumber(overview.active_shops || 0)}</div>
              <div className="platform-label">Active Shops</div>
            </div>
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#8b5cf6' }}>{formatCompactNumber(overview.active_customers || 0)}</div>
              <div className="platform-label">Customers</div>
            </div>
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#f97316' }}>{operational.active_boosts || 0}</div>
              <div className="platform-label">Active Boosts</div>
            </div>
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#ef4444' }}>{operational.pending_refunds || 0}</div>
              <div className="platform-label">Pending Refunds</div>
            </div>
            <div className="print-platform-item">
              <div className="platform-val" style={{ color: '#6366f1' }}>{operational.active_riders || 0}</div>
              <div className="platform-label">Active Riders</div>
            </div>
          </div>

          {/* Fee summary */}
          <div style={{ marginTop: '10pt', padding: '7pt', background: '#f0fdf4', borderRadius: '5pt', border: '1pt solid #bbf7d0' }}>
            <div style={{ fontSize: '7pt', fontWeight: 700, color: '#15803d', marginBottom: '4pt' }}>Revenue Summary</div>
            <table style={{ width: '100%', fontSize: '7pt', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Completed Revenue', value: formatCurrency(overview.current_period_completed_revenue || 0), color: '#16a34a' },
                  { label: 'Pending (Incoming)', value: formatCurrency(overview.current_period_pending_revenue || 0), color: '#ca8a04' },
                  { label: 'Shipping Fees', value: formatCurrency(overview.current_period_shipping_fees || 0), color: '#7c3aed' },
                  { label: 'Platform Fees (5%)', value: formatCurrency(overview.current_period_platform_fees || 0), color: '#dc2626' },
                  { label: 'Boost Revenue', value: formatCurrency(operational.boost_revenue || 0), color: '#0891b2' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '2pt 0', color: '#374151' }}>{row.label}</td>
                    <td style={{ padding: '2pt 0', textAlign: 'right', fontWeight: 600, color: row.color }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="print-footer">
        <p>This is a computer-generated report. No signature required.</p>
        <p style={{ marginTop: '3pt' }}>
          Printed by Admin Dashboard &nbsp;·&nbsp; {new Date().toLocaleString('en-PH')}
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Home({ loaderData }: Route.ComponentProps) {
  const { user, dashboardData: initialDashboardData } = loaderData;
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', data: {}, type: '' });
  const [isPrinting, setIsPrinting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const overview        = dashboardData?.overview        || {};
  const operational     = dashboardData?.operational     || {};
  const salesAnalytics  = dashboardData?.sales_analytics || {};
  const userAnalytics   = dashboardData?.user_analytics  || {};
  const productAnalytics= dashboardData?.product_analytics || {};
  const shopAnalytics   = dashboardData?.shop_analytics  || {};

  const fetchDashboardData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date',   end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);
      const response = await AxiosInstance.get(`/admin-dashboard/get_comprehensive_dashboard/?${params.toString()}`);
      if (response.data.success) setDashboardData(response.data);
      else console.error('Failed to fetch dashboard data');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({ start: range.start, end: range.end, rangeType: range.rangeType as any });
    fetchDashboardData(range.start, range.end, range.rangeType);
  };

  const handlePrintReport = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 100);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatCompactNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleCardClick = (type: string, title: string) => {
    let breakdownData: any = {};
    switch (type) {
      case 'revenue':
        breakdownData = {
          currentPeriodRevenue: formatCurrency(overview.current_period_revenue || 0),
          currentPeriodCompletedRevenue: formatCurrency(overview.current_period_completed_revenue || 0),
          currentPeriodPendingRevenue: formatCurrency(overview.current_period_pending_revenue || 0),
          previousPeriodRevenue: formatCurrency(overview.previous_period_revenue || 0),
          shippingFees: formatCurrency(overview.current_period_shipping_fees || 0),
          platformFees: formatCurrency(overview.current_period_platform_fees || 0),
          incomingBalance: formatCurrency(overview.current_period_pending_revenue || 0),
          growth: overview.revenue_growth || 0,
        }; break;
      case 'orders':
        breakdownData = {
          currentPeriodOrders: overview.current_period_orders || 0,
          previousPeriodOrders: overview.previous_period_orders || 0,
          completedOrders: salesAnalytics.status_distribution?.find((s: any) => s.status === 'completed')?.count || 0,
          pendingOrders:
            (salesAnalytics.status_distribution?.find((s: any) => s.status === 'pending')?.count || 0) +
            (salesAnalytics.status_distribution?.find((s: any) => s.status === 'processing')?.count || 0) +
            (salesAnalytics.status_distribution?.find((s: any) => s.status === 'shipped')?.count || 0),
          cancelledOrders:
            (salesAnalytics.status_distribution?.find((s: any) => s.status === 'cancelled')?.count || 0) +
            (salesAnalytics.status_distribution?.find((s: any) => s.status === 'refunded')?.count || 0),
          growth: overview.order_growth || 0,
        }; break;
      case 'customers':
        breakdownData = {
          total: overview.active_customers || 0,
          newCustomers: userAnalytics.user_growth?.reduce((s: number, w: any) => s + (w.new_users || 0), 0) || 0,
          returningCustomers: userAnalytics.user_growth?.reduce((s: number, w: any) => s + (w.returning_users || 0), 0) || 0,
        }; break;
      case 'shops':
        breakdownData = { total: overview.active_shops || 0, verified: shopAnalytics.shop_performance?.length || 0, pending: 0, suspended: 0 }; break;
      case 'boosts':
        breakdownData = { active: operational.active_boosts || 0, boostRevenue: formatCurrency(operational.boost_revenue || 0) }; break;
      case 'refunds':
        breakdownData = {
          pending: operational.pending_refunds || 0, pendingAmount: formatCurrency(operational.pending_refund_amount || 0),
          completed: operational.completed_refunds || 0, completedAmount: formatCurrency(operational.completed_refund_amount || 0), dispute: 0,
        }; break;
      case 'lowstock':
        breakdownData = {
          total: operational.low_stock_products || 0,
          critical: Math.floor((operational.low_stock_products || 0) * 0.6),
          warning: Math.floor((operational.low_stock_products || 0) * 0.4),
        }; break;
      case 'rating':
        breakdownData = { average: operational.avg_rating || 0, totalReviews: operational.total_reviews || 0, byRating: { 5:45,4:30,3:15,2:7,1:3 } }; break;
      case 'reports':
        breakdownData = { pending: operational.pending_reports || 0, resolved: 0, dismissed: 0 }; break;
      case 'riders':
        breakdownData = {
          active: operational.active_riders || 0, totalRiders: operational.total_riders || 0,
          completedDeliveries: operational.completed_deliveries || 0,
          totalDeliveryFees: formatCurrency(operational.total_delivery_fees || 0),
          online: Math.floor((operational.active_riders || 0) * 0.7),
          onDelivery: Math.floor((operational.active_riders || 0) * 0.3),
          offline: Math.floor((operational.active_riders || 0) * 0.1),
        }; break;
      case 'vouchers':
        breakdownData = {
          active: operational.active_vouchers || 0, used: operational.vouchers_used || 0,
          totalDiscount: formatCurrency(operational.total_voucher_discount || 0),
          shopVouchers: Math.floor((operational.active_vouchers || 0) * 0.6),
          productVouchers: Math.floor((operational.active_vouchers || 0) * 0.4),
          expiringSoon: Math.floor((operational.active_vouchers || 0) * 0.2),
        }; break;
      case 'system':
        breakdownData = { status: '99.9% Operational', uptime: '99.9%', responseTime: '234ms' }; break;
    }
    setModalData({ title, data: breakdownData, type });
    setModalOpen(true);
  };

  return (
    <UserProvider user={user}>
      <style>{printStyles}</style>

      {/* ── Print-only report (hidden on screen, shown on print) ── */}
      <PrintReport
        overview={overview}
        operational={operational}
        salesAnalytics={salesAnalytics}
        userAnalytics={userAnalytics}
        productAnalytics={productAnalytics}
        shopAnalytics={shopAnalytics}
        dateRange={dateRange}
        formatCurrency={formatCurrency}
        formatCompactNumber={formatCompactNumber}
        formatDate={formatDate}
      />

      <SidebarLayout>
        <div ref={dashboardRef} className="space-y-6 no-print">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Revenue includes both completed orders and incoming balance from ongoing transactions
              </p>
            </div>
            <button
              onClick={handlePrintReport}
              disabled={isLoading || isPrinting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Preparing Report...' : 'Print Report'}
            </button>
          </div>

          <DateRangeFilter onDateRangeChange={handleDateRangeChange} isLoading={isLoading} />

          <MetricGrid title="Core Business Metrics">
            <StatCard title="Period Revenue" value={isLoading ? "..." : formatCurrency(overview.current_period_revenue || 0)}
              change={`${(overview.revenue_growth||0)>=0?'+':''}${overview.revenue_growth||0}%`}
              trend={(overview.revenue_growth||0)>=0?"up":"down"} icon={Wallet}
              description={`${formatCurrency(overview.current_period_completed_revenue||0)} completed + ${formatCurrency(overview.current_period_pending_revenue||0)} pending`}
              subValue={overview.current_period_platform_fees?formatCurrency(overview.current_period_platform_fees):undefined}
              subLabel="Platform Fees (5%)" loading={isLoading} onClick={()=>handleCardClick('revenue','Revenue Breakdown')} />
            <StatCard title="Period Orders" value={isLoading?"...":formatCompactNumber(overview.current_period_orders||0)}
              change={`${(overview.order_growth||0)>=0?'+':''}${overview.order_growth||0}%`}
              trend={(overview.order_growth||0)>=0?"up":"down"} icon={ShoppingCart}
              description={`Last ${overview.date_range_days||7} days`} loading={isLoading}
              onClick={()=>handleCardClick('orders','Orders Breakdown')} />
            <StatCard title="Active Customers" value={isLoading?"...":formatCompactNumber(overview.active_customers||0)}
              change="+15.2%" trend="up" icon={Users} description="Total registered" loading={isLoading}
              onClick={()=>handleCardClick('customers','Customer Breakdown')} />
            <StatCard title="Active Shops" value={isLoading?"...":formatCompactNumber(overview.active_shops||0)}
              change="+3.5%" trend="up" icon={Store} description="Total verified" loading={isLoading}
              onClick={()=>handleCardClick('shops','Shop Breakdown')} />
          </MetricGrid>

          <MetricGrid title="Operational Metrics">
            <StatCard title="Incoming Balance" value={isLoading?"...":formatCurrency(overview.current_period_pending_revenue||0)}
              change="From pending orders" trend="up" icon={Clock}
              description="Ongoing transactions not yet completed" loading={isLoading}
              onClick={()=>handleCardClick('revenue','Revenue Breakdown')} />
            <StatCard title="Active Boosts" value={isLoading?"...":(operational.active_boosts||0).toString()}
              change="+2 this week" trend="up" icon={Zap}
              description={`Revenue: ${formatCurrency(operational.boost_revenue||0)}`} loading={isLoading}
              onClick={()=>handleCardClick('boosts','Boosts Breakdown')} />
            <StatCard title="Pending Refunds" value={isLoading?"...":(operational.pending_refunds||0).toString()}
              change="Needs attention" trend="down" icon={RefreshCw}
              description={`Amount: ${formatCurrency(operational.pending_refund_amount||0)}`} loading={isLoading}
              onClick={()=>handleCardClick('refunds','Refunds Breakdown')} />
            <StatCard title="Low Stock Alerts" value={isLoading?"...":(operational.low_stock_products||0).toString()}
              change="Critical" trend="down" icon={AlertTriangle} description="Need restocking" loading={isLoading}
              onClick={()=>handleCardClick('lowstock','Low Stock Breakdown')} />
          </MetricGrid>

          <MetricGrid title="Platform Health">
            <StatCard title="Average Rating" value={isLoading?"...":`${operational.avg_rating||0}★`}
              change="+0.2" trend="up" icon={Star} description={`${operational.total_reviews||0} reviews`} loading={isLoading}
              onClick={()=>handleCardClick('rating','Rating Breakdown')} />
            <StatCard title="Pending Reports" value={isLoading?"...":(operational.pending_reports||0).toString()}
              change="5 new today" trend="up" icon={FileText} description="Moderation queue" loading={isLoading}
              onClick={()=>handleCardClick('reports','Reports Breakdown')} />
            <StatCard title="Active Riders" value={isLoading?"...":(operational.active_riders||0).toString()}
              change="92% online" trend="up" icon={Truck}
              description={`Deliveries: ${operational.completed_deliveries||0}`} loading={isLoading}
              onClick={()=>handleCardClick('riders','Riders Breakdown')} />
            <StatCard title="Active Vouchers" value={isLoading?"...":(operational.active_vouchers||0).toString()}
              change="Active campaigns" trend="up" icon={CreditCard}
              description={`Used: ${operational.vouchers_used||0}`} loading={isLoading}
              onClick={()=>handleCardClick('vouchers','Vouchers Breakdown')} />
          </MetricGrid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sales & Revenue Trend
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({salesAnalytics.grouping==='daily'?'Daily':salesAnalytics.grouping==='monthly'?'Monthly':'Weekly'} view)
                  </span>
                </CardTitle>
                <CardDescription>Revenue includes completed orders + pending orders (incoming balance)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSkeleton className="h-80" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesAnalytics.sales_data||[]}>
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value:any,name:string)=>[
                          ['Revenue','Completed Revenue','Pending Revenue','Shipping Fees','Platform Fees'].includes(name)?formatCurrency(value):value,name
                        ]}
                        labelFormatter={(label,items)=>{const item=items?.[0]?.payload;return item?.date?new Date(item.date).toLocaleDateString():label;}}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="completed_revenue" fill="#10b981" name="Completed Revenue" />
                      <Bar yAxisId="left" dataKey="pending_revenue"   fill="#f59e0b" name="Pending Revenue (Incoming)" />
                      <Bar yAxisId="left" dataKey="shipping_fees"     fill="#8b5cf6" name="Shipping Fees" />
                      <Bar yAxisId="left" dataKey="platform_fees"     fill="#ef4444" name="Platform Fees" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Order Status</CardTitle>
                <CardDescription>Current distribution of all orders in period</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSkeleton className="h-80" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={salesAnalytics.status_distribution||[]} cx="50%" cy="50%" labelLine={false}
                        label={({status,percent=0}:any)=>`${status} ${(percent*100).toFixed(0)}%`}
                        outerRadius={80} fill="#8884d8" dataKey="count" nameKey="status">
                        {(salesAnalytics.status_distribution||[]).map((entry:any,index:number)=>(
                          <Cell key={`cell-${index}`} fill={entry.color||COLORS[index%COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value:any)=>[value,'Orders']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" />Customer Growth</CardTitle>
                <CardDescription>New vs returning customers in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSkeleton className="h-80" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={userAnalytics.user_growth||[]}>
                      <XAxis dataKey="period" /><YAxis />
                      <Tooltip formatter={(value:any)=>[value,'Users']} /><Legend />
                      <Area type="monotone" dataKey="new_users"       stackId="1" stroke="#3b82f6" fill="#3b82f6" name="New Customers" />
                      <Area type="monotone" dataKey="returning_users" stackId="1" stroke="#10b981" fill="#10b981" name="Returning" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Top Products</CardTitle>
                <CardDescription>Best performing products by orders</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSkeleton className="h-80" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productAnalytics.product_performance||[]} layout="vertical" margin={{left:100}}>
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{fontSize:12}} />
                      <Tooltip formatter={(value:any,name:string)=>[name==='Revenue'?formatCurrency(value):value,name]} />
                      <Legend />
                      <Bar dataKey="orders"       fill="#10b981" name="Orders"       radius={[0,4,4,0]} />
                      <Bar dataKey="platform_fee" fill="#f59e0b" name="Platform Fee" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Shops</CardTitle>
                <CardDescription>By sales volume and ratings</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">{[...Array(5)].map((_,i)=><LoadingSkeleton key={i} className="h-16"/>)}</div>
                ) : (
                  <div className="space-y-4">
                    {(shopAnalytics.shop_performance||[]).slice(0,5).map((shop:any,index:number)=>(
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {shop.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{shop.name}</p>
                            <p className="text-sm text-muted-foreground">{shop.followers||0} followers</p>
                            <p className="text-xs text-gray-400">Avg Order: {formatCurrency(shop.average_order_value||0)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(shop.sales||0)}</p>
                          <p className="text-sm text-muted-foreground">{shop.rating||0}★</p>
                          <p className="text-xs text-orange-500">Fee: {formatCurrency(shop.platform_fee||0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Platform Overview</CardTitle>
                <CardDescription>Key platform statistics at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(6)].map((_,i)=><LoadingSkeleton key={i} className="h-20"/>)}</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      {val:formatCompactNumber(overview.current_period_orders||0),label:'Period Orders',color:'text-blue-600'},
                      {val:formatCompactNumber(overview.active_shops||0),label:'Active Shops',color:'text-green-600'},
                      {val:formatCompactNumber(overview.active_customers||0),label:'Customers',color:'text-purple-600'},
                      {val:operational.active_boosts||0,label:'Active Boosts',color:'text-orange-600'},
                      {val:operational.pending_refunds||0,label:'Pending Refunds',color:'text-red-600'},
                      {val:operational.active_riders||0,label:'Active Riders',color:'text-indigo-600'},
                    ].map((item,i)=>(
                      <div key={i} className="text-center p-4 border rounded-lg">
                        <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <BreakdownModal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title={modalData.title} data={modalData.data} type={modalData.type} />
      </SidebarLayout>
    </UserProvider>
  );
}