// app/routes/admin/analytics.tsx
import { useState } from 'react';
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
  DollarSign,
  Store,
  X,
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
                  {(data.revenueByPeriod as Array<{period: string; revenue: string}>).map((item, idx) => (
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
                  {Object.entries(data.roleDistribution || {}).map(([role, count]) => (
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
                  {Object.entries(data.statusDistribution || {}).map(([status, count]) => (
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
                  {(data.topShops as Array<{name: string; sales: string}>).map((shop, idx) => (
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
  
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', data: {}, type: '' });
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
  
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₱${(amount / 1000).toFixed(1)}K`;
    }
    return `₱${amount.toLocaleString()}`;
  };
  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
            </div>
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
              icon={DollarSign}
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

          {/* The rest of your JSX for charts remains exactly the same as before */}
          {/* I'm omitting the chart sections for brevity, but they should remain unchanged */}
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