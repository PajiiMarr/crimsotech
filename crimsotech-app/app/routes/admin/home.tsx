// app/routes/home.tsx
"use client"
import { useState } from 'react';
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
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Dashboard | Admin",
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
      headers: {
        "X-User-Id": session.get("userId")
      }
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
        total_revenue: 0,
        total_orders: 0,
        active_customers: 0,
        active_shops: 0,
        current_period_orders: 0,
        current_period_revenue: 0,
        order_growth: 0,
        revenue_growth: 0,
        date_range_days: 0
      },
      operational: {
        active_boosts: 0,
        pending_refunds: 0,
        low_stock_products: 0,
        avg_rating: 0,
        pending_reports: 0,
        active_riders: 0,
        active_vouchers: 0
      },
      sales_analytics: {
        sales_data: [],
        status_distribution: [],
        grouping: 'daily'
      },
      user_analytics: {
        user_growth: [],
      },
      product_analytics: {
        product_performance: [],
      },
      shop_analytics: {
        shop_performance: [],
      }
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

// Modal Component for breakdown
const BreakdownModal = ({ isOpen, onClose, title, data, type }: any) => {
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
                  <p className="text-sm text-gray-600">Current Period Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{data.currentPeriodRevenue}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Previous Period Revenue</p>
                  <p className="text-2xl font-bold text-gray-600">{data.previousPeriodRevenue}</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Growth</p>
                <p className={`text-2xl font-bold ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.growth}%
                </p>
              </div>
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
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Growth</p>
                <p className={`text-2xl font-bold ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.growth}%
                </p>
              </div>
            </div>
          )}

          {type === 'customers' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Active Customers</p>
                <p className="text-2xl font-bold text-blue-600">{data.total}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">New Customers (Period)</p>
                <p className="text-2xl font-bold text-purple-600">{data.newCustomers}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Returning Customers</p>
                <p className="text-2xl font-bold text-green-600">{data.returningCustomers}</p>
              </div>
            </div>
          )}

          {type === 'shops' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Active Shops</p>
                <p className="text-2xl font-bold text-blue-600">{data.total}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Verified Shops</p>
                  <p className="text-2xl font-bold text-green-600">{data.verified}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Suspended Shops</p>
                <p className="text-2xl font-bold text-red-600">{data.suspended}</p>
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
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Payment</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Expired Boosts</p>
                <p className="text-2xl font-bold text-gray-600">{data.expired}</p>
              </div>
            </div>
          )}

          {type === 'refunds' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-blue-600">{data.approved}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{data.rejected}</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">In Dispute</p>
                <p className="text-2xl font-bold text-purple-600">{data.dispute}</p>
              </div>
            </div>
          )}

          {type === 'lowstock' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Products with Low Stock</p>
                <p className="text-2xl font-bold text-red-600">{data.total}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Critical Stock (Below 3)</p>
                <p className="text-2xl font-bold text-orange-600">{data.critical}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Warning Stock (Below 10)</p>
                <p className="text-2xl font-bold text-yellow-600">{data.warning}</p>
              </div>
            </div>
          )}

          {type === 'rating' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-blue-600">{data.average} ★</p>
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
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-red-600">{data.pending}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Under Review</p>
                  <p className="text-2xl font-bold text-blue-600">{data.underReview}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{data.resolved}</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">By Type</p>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span>Account Reports:</span>
                    <span className="font-bold">{data.byType?.account || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Product Reports:</span>
                    <span className="font-bold">{data.byType?.product || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shop Reports:</span>
                    <span className="font-bold">{data.byType?.shop || 0}</span>
                  </div>
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
                  <p className="text-sm text-gray-600">Online Now</p>
                  <p className="text-2xl font-bold text-blue-600">{data.online}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">On Delivery</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.onDelivery}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Offline</p>
                  <p className="text-2xl font-bold text-gray-600">{data.offline}</p>
                </div>
              </div>
            </div>
          )}

          {type === 'vouchers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active Vouchers</p>
                  <p className="text-2xl font-bold text-green-600">{data.active}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Shop Vouchers</p>
                  <p className="text-2xl font-bold text-blue-600">{data.shopVouchers}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Product Vouchers</p>
                  <p className="text-2xl font-bold text-purple-600">{data.productVouchers}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.expiringSoon}</p>
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

const StatCard = ({ title, value, change, icon: Icon, trend, description, loading = false, onClick }: any) => (
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

const MetricGrid = ({ title, children }: any) => (
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user, dashboardData: initialDashboardData } = loaderData;
  
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', data: {}, type: '' });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const overview = dashboardData?.overview || {};
  const operational = dashboardData?.operational || {};
  const salesAnalytics = dashboardData?.sales_analytics || {};
  const userAnalytics = dashboardData?.user_analytics || {};
  const productAnalytics = dashboardData?.product_analytics || {};
  const shopAnalytics = dashboardData?.shop_analytics || {};
  const dateRangeInfo = dashboardData?.date_range || {};

  const fetchDashboardData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      const response = await AxiosInstance.get(`/admin-dashboard/get_comprehensive_dashboard/?${params.toString()}`);
      
      if (response.data.success) {
        setDashboardData(response.data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchDashboardData(range.start, range.end, range.rangeType);
  };

  const handleCardClick = (type: string, title: string) => {
    let breakdownData = {};
    
    switch(type) {
      case 'revenue':
        breakdownData = {
          currentPeriodRevenue: formatCurrency(overview.current_period_revenue || 0),
          previousPeriodRevenue: formatCurrency(overview.previous_period_revenue || 0),
          growth: overview.revenue_growth || 0,
        };
        break;
      case 'orders':
        breakdownData = {
          currentPeriodOrders: overview.current_period_orders || 0,
          previousPeriodOrders: overview.previous_period_orders || 0,
          growth: overview.order_growth || 0,
        };
        break;
      case 'customers':
        breakdownData = {
          total: overview.active_customers || 0,
          newCustomers: userAnalytics.user_growth?.reduce((sum: number, week: any) => sum + (week.new || 0), 0) || 0,
          returningCustomers: userAnalytics.user_growth?.reduce((sum: number, week: any) => sum + (week.returning || 0), 0) || 0,
        };
        break;
      case 'shops':
        breakdownData = {
          total: overview.active_shops || 0,
          verified: shopAnalytics.shop_performance?.length || 0,
          pending: 0,
          suspended: 0,
        };
        break;
      case 'boosts':
        breakdownData = {
          active: operational.active_boosts || 0,
          pending: 0,
          expired: 0,
        };
        break;
      case 'refunds':
        breakdownData = {
          pending: operational.pending_refunds || 0,
          approved: 0,
          rejected: 0,
          dispute: 0,
        };
        break;
      case 'lowstock':
        breakdownData = {
          total: operational.low_stock_products || 0,
          critical: Math.floor((operational.low_stock_products || 0) * 0.6),
          warning: Math.floor((operational.low_stock_products || 0) * 0.4),
        };
        break;
      case 'rating':
        breakdownData = {
          average: operational.avg_rating || 0,
          byRating: { 5: 45, 4: 30, 3: 15, 2: 7, 1: 3 },
        };
        break;
      case 'reports':
        breakdownData = {
          pending: operational.pending_reports || 0,
          underReview: 0,
          resolved: 0,
          byType: { account: 0, product: 0, shop: 0 },
        };
        break;
      case 'riders':
        breakdownData = {
          active: operational.active_riders || 0,
          online: Math.floor((operational.active_riders || 0) * 0.7),
          onDelivery: Math.floor((operational.active_riders || 0) * 0.3),
          offline: Math.floor((operational.active_riders || 0) * 0.1),
        };
        break;
      case 'vouchers':
        breakdownData = {
          active: operational.active_vouchers || 0,
          shopVouchers: Math.floor((operational.active_vouchers || 0) * 0.6),
          productVouchers: Math.floor((operational.active_vouchers || 0) * 0.4),
          expiringSoon: Math.floor((operational.active_vouchers || 0) * 0.2),
        };
        break;
      case 'system':
        breakdownData = {
          status: '99.9% Operational',
          uptime: '99.9%',
          responseTime: '234ms',
        };
        break;
    }
    
    setModalData({ title, data: breakdownData, type });
    setModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          <MetricGrid title="Core Business Metrics">
            <StatCard 
              title="Period Revenue" 
              value={isLoading ? "..." : formatCurrency(overview.current_period_revenue || 0)} 
              change={isLoading ? "" : `${(overview.revenue_growth || 0) >= 0 ? '+' : ''}${overview.revenue_growth || 0}%`} 
              trend={(overview.revenue_growth || 0) >= 0 ? "up" : "down"} 
              icon={PhilippinePeso}
              description={`Last ${overview.date_range_days || 7} days`}
              loading={isLoading}
              onClick={() => handleCardClick('revenue', 'Revenue Breakdown')}
            />
            <StatCard 
              title="Period Orders" 
              value={isLoading ? "..." : formatCompactNumber(overview.current_period_orders || 0)} 
              change={isLoading ? "" : `${(overview.order_growth || 0) >= 0 ? '+' : ''}${overview.order_growth || 0}%`} 
              trend={(overview.order_growth || 0) >= 0 ? "up" : "down"} 
              icon={ShoppingCart}
              description={`Last ${overview.date_range_days || 7} days`}
              loading={isLoading}
              onClick={() => handleCardClick('orders', 'Orders Breakdown')}
            />
            <StatCard 
              title="Active Customers" 
              value={isLoading ? "..." : formatCompactNumber(overview.active_customers || 0)} 
              change="+15.2%" 
              trend="up" 
              icon={Users}
              description="Total registered"
              loading={isLoading}
              onClick={() => handleCardClick('customers', 'Customer Breakdown')}
            />
            <StatCard 
              title="Active Shops" 
              value={isLoading ? "..." : formatCompactNumber(overview.active_shops || 0)} 
              change="+3.5%" 
              trend="up" 
              icon={Store}
              description="Total verified"
              loading={isLoading}
              onClick={() => handleCardClick('shops', 'Shop Breakdown')}
            />
          </MetricGrid>

          <MetricGrid title="Operational Metrics">
            <StatCard 
              title="Active Boosts" 
              value={isLoading ? "..." : (operational.active_boosts || 0).toString()} 
              change="+2 this week" 
              trend="up" 
              icon={Zap}
              description="Running promotions"
              loading={isLoading}
              onClick={() => handleCardClick('boosts', 'Boosts Breakdown')}
            />
            <StatCard 
              title="Pending Refunds" 
              value={isLoading ? "..." : (operational.pending_refunds || 0).toString()} 
              change="Needs attention" 
              trend="down" 
              icon={RefreshCw}
              description="Require review"
              loading={isLoading}
              onClick={() => handleCardClick('refunds', 'Refunds Breakdown')}
            />
            <StatCard 
              title="Low Stock Alerts" 
              value={isLoading ? "..." : (operational.low_stock_products || 0).toString()} 
              change="Critical" 
              trend="down" 
              icon={AlertTriangle}
              description="Need restocking"
              loading={isLoading}
              onClick={() => handleCardClick('lowstock', 'Low Stock Breakdown')}
            />
            <StatCard 
              title="Average Rating" 
              value={isLoading ? "..." : `${operational.avg_rating || 0}★`} 
              change="+0.2" 
              trend="up" 
              icon={Star}
              description="Customer feedback"
              loading={isLoading}
              onClick={() => handleCardClick('rating', 'Rating Breakdown')}
            />
          </MetricGrid>

          <MetricGrid title="Platform Health">
            <StatCard 
              title="Pending Reports" 
              value={isLoading ? "..." : (operational.pending_reports || 0).toString()} 
              change="5 new today" 
              trend="up" 
              icon={FileText}
              description="Moderation queue"
              loading={isLoading}
              onClick={() => handleCardClick('reports', 'Reports Breakdown')}
            />
            <StatCard 
              title="Active Riders" 
              value={isLoading ? "..." : (operational.active_riders || 0).toString()} 
              change="92% online" 
              trend="up" 
              icon={Truck}
              description="Delivery partners"
              loading={isLoading}
              onClick={() => handleCardClick('riders', 'Riders Breakdown')}
            />
            <StatCard 
              title="System Status" 
              value="99.9%" 
              change="All systems normal" 
              trend="up" 
              icon={Shield}
              description="Platform status"
              loading={isLoading}
              onClick={() => handleCardClick('system', 'System Status Breakdown')}
            />
            <StatCard 
              title="Active Vouchers" 
              value={isLoading ? "..." : (operational.active_vouchers || 0).toString()} 
              change="Active campaigns" 
              trend="up" 
              icon={CreditCard}
              description="Discount campaigns"
              loading={isLoading}
              onClick={() => handleCardClick('vouchers', 'Vouchers Breakdown')}
            />
          </MetricGrid>

          {/* Rest of your existing JSX for charts remains the same */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sales & Revenue Trend
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({salesAnalytics.grouping === 'daily' ? 'Daily' : 'Monthly'} view)
                  </span>
                </CardTitle>
                <CardDescription>
                  {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                    <>
                      {new Date(dateRangeInfo.start_date).toLocaleDateString()} - {new Date(dateRangeInfo.end_date).toLocaleDateString()}
                    </>
                  ) : (
                    'Last 7 days performance across all shops'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton className="h-80" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesAnalytics.sales_data || []}>
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'Revenue (₱)' ? formatCurrency(value) : value,
                          name
                        ]}
                        labelFormatter={(label, items) => {
                          const item = items?.[0]?.payload;
                          return item?.date ? new Date(item.date).toLocaleDateString() : label;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₱)" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" name="Orders" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Order Status
                </CardTitle>
                <CardDescription>
                  {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                    <>
                      Distribution from {new Date(dateRangeInfo.start_date).toLocaleDateString()}
                    </>
                  ) : (
                    'Current order distribution'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton className="h-80" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={salesAnalytics.status_distribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent = 0 }: any) => `${status} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        {(salesAnalytics.status_distribution || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [value, 'Orders']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Customer Growth
                </CardTitle>
                <CardDescription>
                  {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                    <>
                      User growth from {new Date(dateRangeInfo.start_date).toLocaleDateString()}
                    </>
                  ) : (
                    'New vs returning customers'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton className="h-80" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={userAnalytics.user_growth || []}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [value, 'Users']} />
                      <Legend />
                      <Area type="monotone" dataKey="new" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="New Customers" />
                      <Area type="monotone" dataKey="returning" stackId="1" stroke="#10b981" fill="#10b981" name="Returning" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Top Products
                </CardTitle>
                <CardDescription>
                  {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                    <>
                      Top sellers from {new Date(dateRangeInfo.start_date).toLocaleDateString()}
                    </>
                  ) : (
                    'Best performing products by orders'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton className="h-80" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={productAnalytics.product_performance || []} 
                      layout="vertical"
                      margin={{ left: 100 }}
                    >
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'Revenue' ? formatCurrency(value) : value,
                          name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="orders" fill="#10b981" name="Orders" radius={[0, 4, 4, 0]} />
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
                <CardDescription>
                  {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                    <>
                      Top shops from {new Date(dateRangeInfo.start_date).toLocaleDateString()}
                    </>
                  ) : (
                    'By sales volume and ratings'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(shopAnalytics.shop_performance || []).slice(0, 5).map((shop: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {shop.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{shop.name}</p>
                            <p className="text-sm text-muted-foreground">{shop.followers || 0} followers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(shop.sales || 0)}</p>
                          <p className="text-sm text-muted-foreground">{shop.rating || 0}★</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Overview
                </CardTitle>
                <CardDescription>Key platform statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCompactNumber(overview.current_period_orders || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Period Orders</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCompactNumber(overview.active_shops || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Shops</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCompactNumber(overview.active_customers || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Customers</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {operational.active_boosts || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Boosts</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {operational.pending_refunds || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Pending Refunds</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">
                        {operational.active_riders || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Riders</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used admin functions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <FileText className="w-6 h-6 mb-2 text-blue-600" />
                  <p className="font-medium">View Reports</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? '...' : operational.pending_reports || 0} pending
                  </p>
                </button>
                <button 
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-6 h-6 mb-2 text-green-600" />
                  <p className="font-medium">Process Refunds</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? '...' : operational.pending_refunds || 0} waiting
                  </p>
                </button>
                <button 
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <UserCheck className="w-6 h-6 mb-2 text-purple-600" />
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? '...' : formatCompactNumber(overview.active_customers || 0)} total
                  </p>
                </button>
                <button 
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <BarChart3 className="w-6 h-6 mb-2 text-orange-600" />
                  <p className="font-medium">Analytics</p>
                  <p className="text-sm text-muted-foreground">View insights</p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
              <CardDescription>Current filter settings and data coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Date Range</p>
                  <p className="font-medium">
                    {dateRangeInfo.start_date ? new Date(dateRangeInfo.start_date).toLocaleDateString() : 'N/A'} 
                    {' → '} 
                    {dateRangeInfo.end_date ? new Date(dateRangeInfo.end_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">View Type</p>
                  <p className="font-medium capitalize">{dateRangeInfo.range_type || 'weekly'} view</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Data Points</p>
                  <p className="font-medium">
                    {salesAnalytics.sales_data?.length || 0} periods analyzed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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