// app/routes/analytics.tsx
import type { Route } from './+types/analytics'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
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
  Star, 
  Ticket, 
  Zap, 
  Activity,
  DollarSign,
  Store,
  Truck,
  CreditCard,
  FileText,
  MessageCircle,
  BarChart3,
  UserCheck,
  RefreshCw,
  Eye,
  Heart,
  Shield,
  Settings
} from 'lucide-react';

// Import your Axios instance
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Analytics | Admin",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");
  
  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let analyticsData = null;

  try {
    // Fetch comprehensive analytics data from the backend
    const analyticsResponse = await AxiosInstance.get('/admin-analytics/get_comprehensive_analytics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (analyticsResponse.data.success) {
      analyticsData = analyticsResponse.data;
    } else {
      // If API returns success: false but no error, use empty data
      analyticsData = {
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

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    // Use empty data structure when API fails
    analyticsData = {
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

const StatCard = ({ title, value, change, icon: Icon, trend, description }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {change && (
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

// Helper function to calculate total revenue from order metrics
const calculateTotalRevenue = (orderMetrics: any[]) => {
  if (!orderMetrics || orderMetrics.length === 0) return 0;
  return orderMetrics.reduce((total, month) => total + (month.revenue || 0), 0);
};

// Helper function to calculate total users from user growth data
const calculateTotalUsers = (userGrowthData: any[]) => {
  if (!userGrowthData || userGrowthData.length === 0) return 0;
  const lastMonth = userGrowthData[userGrowthData.length - 1];
  return lastMonth.total || 0;
};

// Helper function to calculate total orders from order metrics
const calculateTotalOrders = (orderMetrics: any[]) => {
  if (!orderMetrics || orderMetrics.length === 0) return 0;
  return orderMetrics.reduce((total, month) => total + (month.orders || 0), 0);
};

// Helper function to count active shops from shop performance data
const calculateActiveShops = (shopPerformanceData: any[]) => {
  return shopPerformanceData?.length || 0;
};

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const { user, analytics } = loaderData;
  
  // Extract data from analytics response
  const {
    order_sales_analytics,
    user_customer_analytics,
    product_inventory_analytics,
    shop_merchant_analytics
  } = analytics;

  // Use actual data from API or empty arrays if not available
  const orderMetricsData = order_sales_analytics?.order_metrics_data || [];
  const orderStatusDistribution = order_sales_analytics?.order_status_distribution || [];
  const paymentMethodData = order_sales_analytics?.payment_method_data || [];
  
  const userGrowthData = user_customer_analytics?.user_growth_data || [];
  const userRoleDistribution = user_customer_analytics?.user_role_distribution || [];
  const registrationStageData = user_customer_analytics?.registration_stage_data || [];
  
  const productPerformanceData = product_inventory_analytics?.product_performance_data || [];
  const categoryPerformanceData = product_inventory_analytics?.category_performance_data || [];
  const inventoryStatusData = product_inventory_analytics?.inventory_status_data || [];
  const productEngagementData = product_inventory_analytics?.product_engagement_data || [];
  
  const shopPerformanceData = shop_merchant_analytics?.shop_performance_data || [];
  const shopGrowthData = shop_merchant_analytics?.shop_growth_data || [];
  const shopLocationData = shop_merchant_analytics?.shop_location_data || [];

  // Calculate KPIs from actual data
  const totalRevenue = calculateTotalRevenue(orderMetricsData);
  const totalUsers = calculateTotalUsers(userGrowthData);
  const totalOrders = calculateTotalOrders(orderMetricsData);
  const activeShops = calculateActiveShops(shopPerformanceData);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₱${(amount / 1000).toFixed(1)}K`;
    }
    return `₱${amount}`;
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

          {/* Key Performance Indicators */}
          <MetricGrid title="Platform Overview">
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(totalRevenue)}
              description="Lifetime sales"
              icon={DollarSign}
            />
            <StatCard 
              title="Active Users" 
              value={totalUsers.toLocaleString()}
              description="Registered customers"
              icon={Users}
            />
            <StatCard 
              title="Total Orders" 
              value={totalOrders.toLocaleString()}
              description="Completed orders"
              icon={ShoppingCart}
            />
            <StatCard 
              title="Active Shops" 
              value={activeShops.toLocaleString()}
              description="Verified merchants"
              icon={Store}
            />
          </MetricGrid>

          {/* 📊 ORDER & SALES ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Order & Sales Analytics
            </h2>

            {orderMetricsData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No order data available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Order Metrics Over Time */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Order Performance Trends</CardTitle>
                    <CardDescription>Revenue, orders, and AOV over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={orderMetricsData}>
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₱)" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
                        <Line yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="#f59e0b" strokeWidth={2} name="AOV (₱)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Distribution</CardTitle>
                    <CardDescription>Current order status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={orderStatusDistribution}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ percent = 0 }) => `${(percent * 100).toFixed(1)}%`}
                        >
                          {orderStatusDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Usage</CardTitle>
                    <CardDescription>Customer payment preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={paymentMethodData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="method" width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* 👥 USER & CUSTOMER ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              User & Customer Analytics
            </h2>

            {userGrowthData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No user data available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* User Growth */}
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
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="new" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="New Users" />
                        <Area type="monotone" dataKey="returning" stackId="1" stroke="#10b981" fill="#10b981" name="Returning" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* User Role Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Role Distribution</CardTitle>
                    <CardDescription>Platform user types breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={userRoleDistribution}
                          dataKey="count"
                          nameKey="role"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {userRoleDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Registration Progress */}
                {registrationStageData.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Registration Stage Progress</CardTitle>
                      <CardDescription>User onboarding completion rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={registrationStageData}>
                          <XAxis dataKey="stage" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6">
                            {registrationStageData.map((entry: any, index: number) => (
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

          {/* 📦 PRODUCT & INVENTORY ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Product & Inventory Analytics
            </h2>

            {productPerformanceData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No product data available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Product Performance */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Performing Products</CardTitle>
                    <CardDescription>By orders, revenue, and engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productPerformanceData}>
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" />
                        <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₱)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Revenue by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={categoryPerformanceData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Inventory Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Status</CardTitle>
                    <CardDescription>Stock level distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={inventoryStatusData}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {inventoryStatusData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* 🏪 SHOP & MERCHANT ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Store className="w-6 h-6" />
              Shop & Merchant Analytics
            </h2>

            {shopPerformanceData.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No shop data available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Shop Growth */}
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
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="totalShops" stroke="#3b82f6" strokeWidth={2} name="Total Shops" />
                        <Line yAxisId="right" type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={2} name="Followers" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Shop Locations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Distribution by Location</CardTitle>
                    <CardDescription>Geographic shop concentration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shopLocationData}>
                        <XAxis dataKey="location" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="shops" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Performing Shops */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Performing Shops</CardTitle>
                    <CardDescription>By sales and customer ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shopPerformanceData.map((shop: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {shop.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{shop.name}</p>
                              <p className="text-sm text-muted-foreground">{shop.followers} followers • {shop.products} products</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₱{(shop.sales / 1000).toFixed(0)}K</p>
                            <p className="text-sm text-muted-foreground">{shop.rating}★ • {shop.orders} orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Additional sections for Boost, Rider, Voucher, Refund, and Report analytics can be added similarly */}

        </div>
      </SidebarLayout>
    </UserProvider>
  );
}