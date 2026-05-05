// app/routes/admin/analytics.tsx
import { useState, useRef } from 'react';
import type { Route } from './+types/analytics'
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
  Users, 
  ShoppingCart, 
  Package, 
  Store,
  X,
  Printer,
  PhilippinePeso,
} from 'lucide-react';

import AxiosInstance from '~/components/axios/Axios';

// Type definitions
interface OrderMetric {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  refunds: number;
}

interface UserGrowth {
  month: string;
  new: number;
  returning: number;
  total: number;
}

interface UserRole {
  role: string;
  count: number;
  percentage: number;
}

interface OrderStatus {
  status: string;
  count: number;
  color: string;
}

interface ShopPerformance {
  name: string;
  sales: number;
  orders: number;
  rating: number;
  followers: number;
  products: number;
}

interface ShopGrowth {
  month: string;
  newShops: number;
  totalShops: number;
  followers: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  percentage: number;
}

interface RegistrationStage {
  stage: string;
  count: number;
}

interface ProductPerformance {
  name: string;
  orders: number;
  revenue: number;
  views: number;
  favorites: number;
  stock: number;
}

interface CategoryPerformance {
  category: string;
  revenue: number;
  products: number;
  avgRating: number;
}

interface InventoryStatus {
  status: string;
  count: number;
  color: string;
}

interface ShopLocation {
  location: string;
  shops: number;
  revenue: number;
}

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Analytics | Admin",
    },
  ];
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

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const rangeType = url.searchParams.get('range_type') || 'weekly';

  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);

  let analyticsData = null;
  
  try {
    const params = new URLSearchParams();
    params.append('start_date', startDate || defaultStartDate.toISOString().split('T')[0]);
    params.append('end_date', endDate || defaultEndDate.toISOString().split('T')[0]);
    params.append('range_type', rangeType);

    const analyticsResponse = await AxiosInstance.get(`/admin-analytics/get_comprehensive_analytics/?${params.toString()}`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });
    
    if (analyticsResponse.data.success) {
      analyticsData = analyticsResponse.data;
    } else {
      throw new Error('Failed to fetch analytics data');
    }
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    analyticsData = {
      success: false,
      date_range: {
        start_date: startDate || defaultStartDate.toISOString().split('T')[0],
        end_date: endDate || defaultEndDate.toISOString().split('T')[0],
        range_type: rangeType,
      },
      order_sales_analytics: {
        order_metrics_data: [],
        order_status_distribution: [],
        payment_method_data: [],
      },
      user_customer_analytics: {
        user_growth_data: [],
        user_role_distribution: [],
        registration_stage_data: [],
      },
      product_inventory_analytics: {
        product_performance_data: [],
        category_performance_data: [],
        inventory_status_data: [],
        product_engagement_data: [],
      },
      shop_merchant_analytics: {
        shop_performance_data: [],
        shop_growth_data: [],
        shop_location_data: [],
      },
      boost_promotion_analytics: {},
      rider_delivery_analytics: {},
      voucher_discount_analytics: {},
      refund_return_analytics: {},
      report_moderation_analytics: {},
    };
  }
  
  return { 
    user, 
    analytics: analyticsData 
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6'];

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

    body > * { display: none !important; }

    #print-root,
    #print-root * {
      display: revert !important;
    }

    .no-print { display: none !important; }
    .print-only { display: block !important; }

    #print-root {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .print-header {
      text-align: center;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
      border-bottom: 2pt solid #3b82f6;
    }
    .print-header h1 { font-size: 18pt; font-weight: 700; color: #1e3a5f; margin: 0 0 4pt; }
    .print-header p  { font-size: 9pt; color: #4b5563; margin: 2pt 0 0; }

    .print-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin: 14pt 0 6pt;
      padding-bottom: 3pt;
      border-bottom: 1pt solid #e5e7eb;
      page-break-after: avoid;
    }

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

    .print-shop-item {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 5pt 0 !important;
      border-bottom: 0.5pt solid #f3f4f6 !important;
    }
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

    .print-status-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .print-status-table th { background: #f3f4f6; padding: 4pt 6pt; text-align: left; font-weight: 600; color: #374151; }
    .print-status-table td { padding: 4pt 6pt; border-bottom: 0.5pt solid #f3f4f6; }

    .print-footer {
      text-align: center;
      margin-top: 16pt;
      padding-top: 8pt;
      border-top: 1pt solid #e5e7eb;
      font-size: 7.5pt;
      color: #9ca3af;
    }

    .page-break-avoid { page-break-inside: avoid; }
  }
`;

// Print Report Component
const PrintReport = ({
  totalRevenue, totalUsers, totalOrders, activeShops,
  orderMetricsData, orderStatusDistribution, paymentMethodData,
  userGrowthData, userRoleDistribution, registrationStageData,
  productPerformanceData, categoryPerformanceData, inventoryStatusData,
  shopPerformanceData, shopGrowthData, shopLocationData,
  dateRange, formatCurrency, formatDate,
}: any) => {
  const avatarColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];

  const MetricCard = ({ label, value, sub }: any) => (
    <div className="print-metric-card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );

  const maxOrders = Math.max(...(productPerformanceData || []).map((p: any) => p.orders || 0), 1);

  return (
    <div id="print-root" className="print-only hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="print-header">
        <h1>Analytics Report</h1>
        <p>Generated: {new Date().toLocaleString('en-PH')}</p>
        <p>Period: {formatDate(dateRange.start)} — {formatDate(dateRange.end)} &nbsp;|&nbsp; {dateRange.rangeType.toUpperCase()}</p>
      </div>

      <div className="print-section-title">Platform Overview</div>
      <div className="print-metric-grid">
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub="Lifetime sales" />
        <MetricCard label="Active Users" value={totalUsers.toLocaleString()} sub="Registered customers" />
        <MetricCard label="Total Orders" value={totalOrders.toLocaleString()} sub="Completed orders" />
        <MetricCard label="Active Shops" value={activeShops.toLocaleString()} sub="Verified merchants" />
      </div>

      <div className="print-section-title page-break-avoid">Order & Sales Analytics</div>
      <div className="print-chart-row page-break-avoid">
        <div className="print-chart-card">
          <h3>Order Performance Trends</h3>
          <p>Revenue, orders, and AOV over time</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '3pt 5pt', textAlign: 'left' }}>Period</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right' }}>Orders</th>
                <th style={{ padding: '3pt 5pt', textAlign: 'right' }}>AOV</th>
              </tr>
            </thead>
            <tbody>
              {(orderMetricsData || []).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td style={{ padding: '3pt 5pt' }}>{row.month || '—'}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#3b82f6' }}>{formatCurrency(row.revenue ?? 0)}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#10b981' }}>{row.orders ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(row.avgOrderValue ?? 0)}</td>
                </tr>
              ))}
              {(orderMetricsData || []).length === 0 && (
                <tr><td colSpan={4} style={{ padding: '6pt', textAlign: 'center', color: '#9ca3af' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="print-chart-card">
          <h3>Order Status Distribution</h3>
          <p>Current order status breakdown</p>
          <table className="print-status-table">
            <thead><tr><th>Status</th><th style={{ textAlign: 'right' }}>Count</th><th style={{ textAlign: 'right' }}>%</th></tr></thead>
            <tbody>
              {(() => {
                const total = (orderStatusDistribution || []).reduce((s: number, d: any) => s + (d.count || 0), 0) || 1;
                return (orderStatusDistribution || []).map((d: any, i: number) => (
                  <tr key={i}>
                    <td><span style={{ display: 'inline-block', width: '7pt', height: '7pt', borderRadius: '50%', background: d.color || COLORS[i % COLORS.length], marginRight: '4pt' }} />{d.status}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.count || 0}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>{((d.count / total) * 100).toFixed(1)}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-section-title page-break-avoid">User & Customer Analytics</div>
      <div className="print-chart-row-half page-break-avoid">
        <div className="print-chart-card">
          <h3>User Growth Trends</h3>
          <p>New vs returning user acquisition</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th>Period</th><th>New</th><th>Returning</th><th>Total</th></tr></thead>
            <tbody>
              {(userGrowthData || []).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td style={{ padding: '3pt 5pt' }}>{row.month || '—'}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#3b82f6' }}>{row.new ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', color: '#10b981' }}>{row.returning ?? 0}</td>
                  <td style={{ padding: '3pt 5pt', textAlign: 'right', fontWeight: 600 }}>{row.total ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-chart-card">
          <h3>User Role Distribution</h3>
          <table className="print-status-table">
            <thead><tr><th>Role</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
            <tbody>
              {(userRoleDistribution || []).map((role: any, i: number) => (
                <tr key={i}><td>{role.role}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{role.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-section-title page-break-avoid">Product & Inventory Analytics</div>
      <div className="print-chart-row-half page-break-avoid">
        <div className="print-chart-card">
          <h3>Top Products</h3>
          <table style={{ width: '100%', fontSize: '7.5pt' }}>
            <thead><tr><th>Product</th><th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
            <tbody>
              {(productPerformanceData || []).slice(0, 6).map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '0.5pt solid #f3f4f6' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4pt' }}>
                      <div style={{ background: '#f3f4f6', borderRadius: '3pt', height: '10pt', width: '36pt', flexShrink: 0 }}>
                        <div style={{ width: `${((p.orders || 0) / maxOrders) * 100}%`, height: '100%', borderRadius: '3pt', background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span style={{ fontSize: '6.5pt' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.orders ?? 0}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(p.revenue ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-chart-card">
          <h3>Category Performance</h3>
          <table className="print-status-table">
            <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
            <tbody>
              {(categoryPerformanceData || []).slice(0, 6).map((cat: any, i: number) => (
                <tr key={i}><td>{cat.category}</td><td style={{ textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(cat.revenue ?? 0)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-section-title page-break-avoid">Shop & Merchant Analytics</div>
      <div className="print-chart-row-half page-break-avoid">
        <div className="print-chart-card">
          <h3>Top Performing Shops</h3>
          {(shopPerformanceData || []).slice(0, 5).map((shop: any, i: number) => (
            <div className="print-shop-item" key={i}>
              <div className="shop-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{shop.name?.charAt(0) || 'S'}</div>
              <div className="shop-info"><div className="shop-name">{shop.name}</div><div className="shop-meta">{shop.followers || 0} followers</div></div>
              <div className="shop-sales"><div className="amount">{formatCurrency(shop.sales || 0)}</div><div className="rating">{shop.rating || 0}★</div></div>
            </div>
          ))}
        </div>

        <div className="print-chart-card">
          <h3>Shop Location Distribution</h3>
          <table className="print-status-table">
            <thead><tr><th>Location</th><th style={{ textAlign: 'right' }}>Shops</th></tr></thead>
            <tbody>
              {(shopLocationData || []).slice(0, 6).map((loc: any, i: number) => (
                <tr key={i}><td>{loc.location}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{loc.shops ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-footer">
        <p>This is a computer-generated report. No signature required.</p>
        <p>Printed by Admin Analytics &nbsp;·&nbsp; {new Date().toLocaleString('en-PH')}</p>
      </div>
    </div>
  );
};

// Modal Component for breakdown
const BreakdownModal = ({ isOpen, onClose, title, data, type }: { isOpen: boolean; onClose: () => void; title: string; data: any; type: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">{title} - Detailed Breakdown</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {type === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalRevenue}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Average Order Value</p>
                  <p className="text-2xl font-bold text-green-600">{data.avgOrderValue}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-600">{data.totalOrders}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Refunds</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.refunds}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Revenue by Period</p>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {(data.revenueByPeriod as Array<{period: string; revenue: string}>).map((item: {period: string; revenue: string}, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 border-b">
                      <span className="font-medium">{item.period}</span>
                      <span className="text-blue-600">{item.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'users' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{data.total}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">New Users (Period)</p>
                  <p className="text-2xl font-bold text-green-600">{data.newUsers}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Returning Users</p>
                  <p className="text-2xl font-bold text-purple-600">{data.returningUsers}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{data.conversionRate}%</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">User Role Distribution</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(data.roleDistribution || {}).map(([role, count]: [string, any]) => (
                    <div key={role} className="flex justify-between p-2 border-b">
                      <span className="font-medium capitalize">{role}</span>
                      <span className="text-gray-600">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{data.total}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Completed Orders</p>
                  <p className="text-2xl font-bold text-green-600">{data.completed}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Cancelled Orders</p>
                  <p className="text-2xl font-bold text-red-600">{data.cancelled}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Order Status Distribution</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(data.statusDistribution || {}).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex justify-between p-2 border-b">
                      <span className="font-medium capitalize">{status}</span>
                      <span className="text-gray-600">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'shops' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active Shops</p>
                  <p className="text-2xl font-bold text-blue-600">{data.active}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">New Shops (Period)</p>
                  <p className="text-2xl font-bold text-green-600">{data.newShops}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Followers</p>
                  <p className="text-2xl font-bold text-purple-600">{data.followers}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Rating</p>
                  <p className="text-2xl font-bold text-orange-600">{data.avgRating}★</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Top Performing Shops</p>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {(data.topShops as Array<{name: string; sales: string}>).map((shop: {name: string; sales: string}, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 border-b">
                      <span className="font-medium">{shop.name}</span>
                      <span className="text-blue-600">{shop.sales}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, icon: Icon, trend, description, onClick, loading = false }: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: any; 
  trend?: string; 
  description?: string; 
  onClick?: () => void; 
  loading?: boolean;
}) => (
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
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
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

const MetricGrid = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    {title && <h3 className="text-lg font-semibold">{title}</h3>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
);

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-muted rounded animate-pulse ${className}`} />
);

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const { user, analytics: initialAnalytics } = loaderData;
  const analyticsRef = useRef<HTMLDivElement>(null);
  
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', data: {}, type: '' });
  const [isPrinting, setIsPrinting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(initialAnalytics.date_range?.start_date || Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(initialAnalytics.date_range?.end_date || Date.now()),
    rangeType: initialAnalytics.date_range?.range_type || 'weekly'
  });

  const {
    order_sales_analytics,
    user_customer_analytics,
    product_inventory_analytics,
    shop_merchant_analytics
  } = analytics;
  
  const orderMetricsData: OrderMetric[] = order_sales_analytics?.order_metrics_data || [];
  const orderStatusDistribution: OrderStatus[] = order_sales_analytics?.order_status_distribution || [];
  const paymentMethodData: PaymentMethod[] = order_sales_analytics?.payment_method_data || [];
  
  const userGrowthData: UserGrowth[] = user_customer_analytics?.user_growth_data || [];
  const userRoleDistribution: UserRole[] = user_customer_analytics?.user_role_distribution || [];
  const registrationStageData: RegistrationStage[] = user_customer_analytics?.registration_stage_data || [];
  
  const productPerformanceData: ProductPerformance[] = product_inventory_analytics?.product_performance_data || [];
  const categoryPerformanceData: CategoryPerformance[] = product_inventory_analytics?.category_performance_data || [];
  const inventoryStatusData: InventoryStatus[] = product_inventory_analytics?.inventory_status_data || [];
  
  const shopPerformanceData: ShopPerformance[] = shop_merchant_analytics?.shop_performance_data || [];
  const shopGrowthData: ShopGrowth[] = shop_merchant_analytics?.shop_growth_data || [];
  const shopLocationData: ShopLocation[] = shop_merchant_analytics?.shop_location_data || [];
  
  const totalRevenue = orderMetricsData.reduce((sum: number, item: OrderMetric) => sum + (item.revenue || 0), 0);
  const totalUsers = userGrowthData.length > 0 ? userGrowthData[userGrowthData.length - 1].total || 0 : 0;
  const totalOrders = orderMetricsData.reduce((sum: number, item: OrderMetric) => sum + (item.orders || 0), 0);
  const activeShops = shopPerformanceData.length;

  const fetchAnalyticsData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      const response = await AxiosInstance.get(`/admin-analytics/get_comprehensive_analytics/?${params.toString()}`);
      
      if (response.data.success) {
        setAnalytics(response.data);
      } else {
        console.error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType
    });
    fetchAnalyticsData(range.start, range.end, range.rangeType);
  };

  const handlePrintReport = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 100);
  };

  const handleCardClick = (type: string, title: string) => {
    let breakdownData = {};
    
    switch(type) {
      case 'revenue':
        const avgOrderValue = orderMetricsData.length > 0 
          ? orderMetricsData.reduce((sum: number, item: OrderMetric) => sum + (item.avgOrderValue || 0), 0) / orderMetricsData.length 
          : 0;
        const totalRefunds = orderMetricsData.reduce((sum: number, item: OrderMetric) => sum + (item.refunds || 0), 0);
        
        breakdownData = {
          totalRevenue: formatCurrency(totalRevenue),
          avgOrderValue: formatCurrency(avgOrderValue),
          totalOrders: totalOrders.toLocaleString(),
          refunds: totalRefunds.toLocaleString(),
          revenueByPeriod: orderMetricsData.map((item: OrderMetric) => ({
            period: item.month,
            revenue: formatCurrency(item.revenue || 0)
          }))
        };
        break;
      case 'users':
        const newUsers = userGrowthData.reduce((sum: number, item: UserGrowth) => sum + (item.new || 0), 0);
        const returningUsers = userGrowthData.reduce((sum: number, item: UserGrowth) => sum + (item.returning || 0), 0);
        const conversionRate = totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) : 0;
        const roleDist: Record<string, number> = {};
        userRoleDistribution.forEach((role: UserRole) => {
          roleDist[role.role] = role.count;
        });
        
        breakdownData = {
          total: totalUsers.toLocaleString(),
          newUsers: newUsers.toLocaleString(),
          returningUsers: returningUsers.toLocaleString(),
          conversionRate: conversionRate,
          roleDistribution: roleDist
        };
        break;
      case 'orders':
        const completedOrders = orderStatusDistribution.find((s: OrderStatus) => s.status === 'completed')?.count || 0;
        const pendingOrders = orderStatusDistribution.find((s: OrderStatus) => s.status === 'pending')?.count || 0;
        const cancelledOrders = orderStatusDistribution.find((s: OrderStatus) => s.status === 'cancelled')?.count || 0;
        const statusDist: Record<string, number> = {};
        orderStatusDistribution.forEach((status: OrderStatus) => {
          statusDist[status.status] = status.count;
        });
        
        breakdownData = {
          total: totalOrders.toLocaleString(),
          completed: completedOrders.toLocaleString(),
          pending: pendingOrders.toLocaleString(),
          cancelled: cancelledOrders.toLocaleString(),
          statusDistribution: statusDist
        };
        break;
      case 'shops':
        const newShops = shopGrowthData.length > 0 
          ? shopGrowthData[shopGrowthData.length - 1].newShops || 0 
          : 0;
        const totalFollowers = shopGrowthData.length > 0 
          ? shopGrowthData[shopGrowthData.length - 1].followers || 0 
          : 0;
        const avgRating = shopPerformanceData.length > 0
          ? (shopPerformanceData.reduce((sum: number, shop: ShopPerformance) => sum + (shop.rating || 0), 0) / shopPerformanceData.length).toFixed(1)
          : 0;
        
        breakdownData = {
          active: activeShops.toLocaleString(),
          newShops: newShops.toLocaleString(),
          followers: totalFollowers.toLocaleString(),
          avgRating: avgRating,
          topShops: shopPerformanceData.slice(0, 5).map((shop: ShopPerformance) => ({
            name: shop.name,
            sales: formatCurrency(shop.sales || 0)
          }))
        };
        break;
    }
    
    setModalData({ title, data: breakdownData, type });
    setModalOpen(true);
  };
  
  // FIXED: Format currency without K/M abbreviations - shows full numbers
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '₱0.00';
    // Format with commas and 2 decimal places, no abbreviations
    return `₱${amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return (
    <UserProvider user={user}>
      <style>{printStyles}</style>

      <PrintReport
        totalRevenue={totalRevenue}
        totalUsers={totalUsers}
        totalOrders={totalOrders}
        activeShops={activeShops}
        orderMetricsData={orderMetricsData}
        orderStatusDistribution={orderStatusDistribution}
        paymentMethodData={paymentMethodData}
        userGrowthData={userGrowthData}
        userRoleDistribution={userRoleDistribution}
        registrationStageData={registrationStageData}
        productPerformanceData={productPerformanceData}
        categoryPerformanceData={categoryPerformanceData}
        inventoryStatusData={inventoryStatusData}
        shopPerformanceData={shopPerformanceData}
        shopGrowthData={shopGrowthData}
        shopLocationData={shopLocationData}
        dateRange={dateRange}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      <SidebarLayout>
        <div ref={analyticsRef} className="space-y-6 no-print">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive platform analytics and insights
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

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          <MetricGrid title="Platform Overview">
            <StatCard 
              title="Total Revenue" 
              value={isLoading ? "..." : formatCurrency(totalRevenue)}
              description="Lifetime sales"
              icon={PhilippinePeso}
              onClick={() => handleCardClick('revenue', 'Revenue Analytics')}
              loading={isLoading}
            />
            <StatCard 
              title="Active Users" 
              value={isLoading ? "..." : totalUsers.toLocaleString()}
              description="Registered customers"
              icon={Users}
              onClick={() => handleCardClick('users', 'User Analytics')}
              loading={isLoading}
            />
            <StatCard 
              title="Total Orders" 
              value={isLoading ? "..." : totalOrders.toLocaleString()}
              description="Completed orders"
              icon={ShoppingCart}
              onClick={() => handleCardClick('orders', 'Order Analytics')}
              loading={isLoading}
            />
            <StatCard 
              title="Active Shops" 
              value={isLoading ? "..." : activeShops.toLocaleString()}
              description="Verified merchants"
              icon={Store}
              onClick={() => handleCardClick('shops', 'Shop Analytics')}
              loading={isLoading}
            />
          </MetricGrid>

          {/* ORDER & SALES ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Order & Sales Analytics
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LoadingSkeleton className="h-96 lg:col-span-2" />
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-80" />
              </div>
            ) : orderMetricsData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No order data available for the selected period</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Order Performance Trends</CardTitle>
                    <CardDescription>Revenue, orders, and AOV over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={orderMetricsData}>
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number, name: string) => {
                          if (name === 'Revenue (₱)' || name === 'AOV (₱)') {
                            return [`₱${value.toLocaleString()}`, name];
                          }
                          return [value.toLocaleString(), name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₱)" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
                        <Line yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="#f59e0b" strokeWidth={2} name="AOV (₱)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Distribution</CardTitle>
                    <CardDescription>Current order status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={orderStatusDistribution as any[]}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ percent = 0 }) => `${(percent * 100).toFixed(1)}%`}
                        >
                          {orderStatusDistribution.map((entry: OrderStatus, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Usage</CardTitle>
                    <CardDescription>Customer payment preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={paymentMethodData as any[]} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="method" width={100} />
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                        <Bar dataKey="count" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* USER & CUSTOMER ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              User & Customer Analytics
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-80 lg:col-span-2" />
              </div>
            ) : userGrowthData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No user data available for the selected period</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth Trends</CardTitle>
                    <CardDescription>New vs returning user acquisition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={userGrowthData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Users']} />
                        <Legend />
                        <Area type="monotone" dataKey="new" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="New Users" />
                        <Area type="monotone" dataKey="returning" stackId="1" stroke="#10b981" fill="#10b981" name="Returning" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>User Role Distribution</CardTitle>
                    <CardDescription>Platform user types breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={userRoleDistribution as any[]}
                          dataKey="count"
                          nameKey="role"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {userRoleDistribution.map((entry: UserRole, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                {registrationStageData.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Registration Stage Progress</CardTitle>
                      <CardDescription>User onboarding completion rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={registrationStageData as any[]}>
                          <XAxis dataKey="stage" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                          <Bar dataKey="count" fill="#3b82f6">
                            {registrationStageData.map((entry: RegistrationStage, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* PRODUCT & INVENTORY ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Product & Inventory Analytics
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LoadingSkeleton className="h-96 lg:col-span-2" />
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-80" />
              </div>
            ) : productPerformanceData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No product data available for the selected period</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Performing Products</CardTitle>
                    <CardDescription>By orders, revenue, and engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productPerformanceData as any[]}>
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number, name: string) => {
                          if (name === 'Revenue (₱)') {
                            return [`₱${value.toLocaleString()}`, name];
                          }
                          return [value.toLocaleString(), name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" />
                        <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₱)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Revenue by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={categoryPerformanceData as any[]} layout="vertical">
                        <XAxis type="number" tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="category" width={100} />
                        <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Status</CardTitle>
                    <CardDescription>Stock level distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={inventoryStatusData as any[]}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {inventoryStatusData.map((entry: InventoryStatus, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Products']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* SHOP & MERCHANT ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Store className="w-6 h-6" />
              Shop & Merchant Analytics
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-80" />
                <LoadingSkeleton className="h-96 lg:col-span-2" />
              </div>
            ) : shopPerformanceData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No shop data available for the selected period</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Growth Trends</CardTitle>
                    <CardDescription>New shops and follower growth</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={shopGrowthData}>
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number, name: string) => {
                          if (name === 'Followers') {
                            return [value.toLocaleString(), name];
                          }
                          return [value.toLocaleString(), name];
                        }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="totalShops" stroke="#3b82f6" strokeWidth={2} name="Total Shops" />
                        <Line yAxisId="right" type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={2} name="Followers" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Distribution by Location</CardTitle>
                    <CardDescription>Geographic shop concentration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopLocationData as any[]}>
                        <XAxis dataKey="location" angle={-45} textAnchor="end" height={80} interval={0} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Shops']} />
                        <Bar dataKey="shops" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Performing Shops</CardTitle>
                    <CardDescription>By sales and customer ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shopPerformanceData.map((shop: ShopPerformance, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {shop.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{shop.name}</p>
                              <p className="text-sm text-muted-foreground">{shop.followers.toLocaleString()} followers • {shop.products} products</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(shop.sales || 0)}</p>
                            <p className="text-sm text-muted-foreground">{shop.rating}★ • {shop.orders.toLocaleString()} orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
        
        <BreakdownModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalData.title}
          data={modalData.data}
          type={modalData.type}
        />
      </SidebarLayout>
    </UserProvider>
  );
}