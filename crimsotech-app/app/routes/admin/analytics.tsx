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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, Package, Star, Ticket, Zap, Activity } from 'lucide-react';

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
  return user;
}

// 📊 SALES ANALYTICS DATA
const salesGrowthData = [
  { month: 'Jan', revenue: 45000, orders: 120, aov: 375 },
  { month: 'Feb', revenue: 52000, orders: 145, aov: 358 },
  { month: 'Mar', revenue: 48000, orders: 135, aov: 355 },
  { month: 'Apr', revenue: 61000, orders: 168, aov: 363 },
  { month: 'May', revenue: 70000, orders: 189, aov: 370 },
  { month: 'Jun', revenue: 68000, orders: 180, aov: 377 },
];

const conversionData = [
  { week: 'Week 1', carts: 450, orders: 120, rate: 26.7 },
  { week: 'Week 2', carts: 520, orders: 145, rate: 27.9 },
  { week: 'Week 3', carts: 480, orders: 135, rate: 28.1 },
  { week: 'Week 4', carts: 590, orders: 168, rate: 28.5 },
];

const refundRateData = [
  { status: 'Completed', value: 850, percentage: 94.4 },
  { status: 'Refunded', value: 50, percentage: 5.6 },
];

// 👥 CUSTOMER ANALYTICS DATA
const customerTypeData = [
  { month: 'Jan', new: 45, returning: 75 },
  { month: 'Feb', new: 52, returning: 93 },
  { month: 'Mar', new: 48, returning: 87 },
  { month: 'Apr', new: 61, returning: 107 },
  { month: 'May', new: 70, returning: 119 },
  { month: 'Jun', new: 65, returning: 115 },
];

const demographicsData = [
  { name: 'Male', value: 540 },
  { name: 'Female', value: 680 },
  { name: 'Other', value: 80 },
];

const locationData = [
  { location: 'Metro Manila', customers: 450 },
  { location: 'Cebu', customers: 320 },
  { location: 'Davao', customers: 280 },
  { location: 'Iloilo', customers: 180 },
  { location: 'Others', customers: 370 },
];

const topBuyersData = [
  { name: 'Juan Dela Cruz', spent: 45800, orders: 23 },
  { name: 'Maria Santos', spent: 38500, orders: 19 },
  { name: 'Pedro Reyes', spent: 32100, orders: 16 },
  { name: 'Ana Garcia', spent: 28900, orders: 14 },
  { name: 'Jose Mendoza', spent: 25600, orders: 13 },
];

// 📦 PRODUCT ANALYTICS DATA
const topSellingData = [
  { name: 'Gaming Laptop', quantity: 145, revenue: 2175000 },
  { name: 'Wireless Mouse', quantity: 320, revenue: 160000 },
  { name: 'Mechanical Keyboard', quantity: 280, revenue: 840000 },
  { name: 'Monitor 27"', quantity: 195, revenue: 1365000 },
  { name: 'USB-C Hub', quantity: 410, revenue: 615000 },
];

const mostViewedData = [
  { name: 'Gaming Laptop', views: 4500 },
  { name: 'iPhone 15 Pro', views: 3800 },
  { name: 'PS5 Console', views: 3200 },
  { name: 'AirPods Pro', views: 2900 },
  { name: 'Gaming Chair', views: 2400 },
];

const ratingDistributionData = [
  { rating: '5 Star', count: 680, percentage: 68 },
  { rating: '4 Star', count: 210, percentage: 21 },
  { rating: '3 Star', count: 70, percentage: 7 },
  { rating: '2 Star', count: 25, percentage: 2.5 },
  { rating: '1 Star', count: 15, percentage: 1.5 },
];

const inventoryStatusData = [
  { status: 'In Stock', value: 850 },
  { status: 'Low Stock', value: 120 },
  { status: 'Out of Stock', value: 30 },
];

// 🎯 MARKETING ANALYTICS DATA
const voucherUsageData = [
  { month: 'Jan', issued: 200, used: 145, rate: 72.5 },
  { month: 'Feb', issued: 250, used: 190, rate: 76 },
  { month: 'Mar', issued: 220, used: 165, rate: 75 },
  { month: 'Apr', issued: 280, used: 220, rate: 78.6 },
  { month: 'May', issued: 300, used: 245, rate: 81.7 },
  { month: 'Jun', issued: 270, used: 225, rate: 83.3 },
];

const boostEffectivenessData = [
  { period: 'Before Boost', sales: 15000 },
  { period: 'During Boost', sales: 42000 },
  { period: 'After Boost', sales: 22000 },
];

const followerGrowthData = [
  { month: 'Jan', shop1: 450, shop2: 320, shop3: 280 },
  { month: 'Feb', shop1: 520, shop2: 380, shop3: 340 },
  { month: 'Mar', shop1: 580, shop2: 420, shop3: 390 },
  { month: 'Apr', shop1: 650, shop2: 480, shop3: 450 },
  { month: 'May', shop1: 720, shop2: 550, shop3: 510 },
  { month: 'Jun', shop1: 800, shop2: 620, shop3: 580 },
];

const sentimentData = [
  { type: 'Positive', value: 780, percentage: 78 },
  { type: 'Neutral', value: 150, percentage: 15 },
  { type: 'Negative', value: 70, percentage: 7 },
];

// 🔧 OPERATIONAL ANALYTICS DATA
const shopActivityData = [
  { status: 'Active', count: 145 },
  { status: 'Inactive', count: 35 },
];

const riderPerformanceData = [
  { name: 'Rider A', delivered: 280, rating: 4.8 },
  { name: 'Rider B', delivered: 245, rating: 4.7 },
  { name: 'Rider C', delivered: 220, rating: 4.6 },
  { name: 'Rider D', delivered: 195, rating: 4.5 },
  { name: 'Rider E', delivered: 180, rating: 4.4 },
];

const systemActivityData = [
  { day: 'Mon', admins: 45, customers: 850, shops: 120 },
  { day: 'Tue', admins: 52, customers: 920, shops: 135 },
  { day: 'Wed', admins: 48, customers: 880, shops: 128 },
  { day: 'Thu', admins: 55, customers: 950, shops: 145 },
  { day: 'Fri', admins: 60, customers: 1020, shops: 160 },
  { day: 'Sat', admins: 42, customers: 1150, shops: 180 },
  { day: 'Sun', admins: 38, customers: 1080, shops: 170 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{change}</span>
          </div>
        </div>
        <div className="p-3 bg-primary/10 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value="₱344,000" change="+12.5%" trend="up" icon={ShoppingCart} />
            <StatCard title="Total Orders" value="937" change="+8.3%" trend="up" icon={Package} />
            <StatCard title="Active Customers" value="1,300" change="+15.2%" trend="up" icon={Users} />
            <StatCard title="Avg Rating" value="4.7" change="+0.2" trend="up" icon={Star} />
          </div>

          {/* 📊 SALES ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Sales Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales Growth Over Time */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Sales Growth & Average Order Value</CardTitle>
                  <CardDescription>Monthly revenue, order count, and AOV trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesGrowthData}>
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₱)" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Orders" />
                      <Line yAxisId="right" type="monotone" dataKey="aov" stroke="#f59e0b" strokeWidth={2} name="AOV (₱)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate</CardTitle>
                  <CardDescription>Cart to order conversion</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={conversionData}>
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} name="Conversion %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Refund Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>Completed vs Refunded orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={refundRateData}
                        dataKey="value"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percent = 0 }) => `${(percent * 100).toFixed(1)}%`}
                      >
                        {refundRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 👥 CUSTOMER ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Customer Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* New vs Returning */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Acquisition & Retention</CardTitle>
                  <CardDescription>New vs returning customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={customerTypeData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="new" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="New" />
                      <Area type="monotone" dataKey="returning" stackId="1" stroke="#10b981" fill="#10b981" name="Returning" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                  <CardDescription>Customer demographics breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={demographicsData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {demographicsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Location Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Customers by Location</CardTitle>
                  <CardDescription>Geographic distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={locationData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="location" width={100} />
                      <Tooltip />
                      <Bar dataKey="customers" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Buyers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Buyers</CardTitle>
                  <CardDescription>Highest spending customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topBuyersData.map((buyer, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{buyer.name}</p>
                          <p className="text-sm text-muted-foreground">{buyer.orders} orders</p>
                        </div>
                        <p className="font-bold text-primary">₱{buyer.spent.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 📦 PRODUCT ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Product Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Selling */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top-Selling Products</CardTitle>
                  <CardDescription>By quantity and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topSellingData}>
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" fill="#3b82f6" name="Quantity" />
                      <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₱)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Most Viewed */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Viewed Products</CardTitle>
                  <CardDescription>Customer interest metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={mostViewedData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip />
                      <Bar dataKey="views" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Rating Distribution</CardTitle>
                  <CardDescription>Customer satisfaction levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ratingDistributionData}>
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981">
                        {ratingDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inventory Status */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Inventory Status</CardTitle>
                  <CardDescription>Stock level distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={inventoryStatusData}
                        dataKey="value"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {inventoryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 🎯 MARKETING ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Ticket className="w-6 h-6" />
              Marketing Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Voucher Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Voucher Usage Rate</CardTitle>
                  <CardDescription>Redemption trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={voucherUsageData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} name="Usage Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Boost Effectiveness */}
              <Card>
                <CardHeader>
                  <CardTitle>Boost Plan Effectiveness</CardTitle>
                  <CardDescription>Sales impact analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={boostEffectivenessData}>
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#ef4444">
                        {boostEffectivenessData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 1 ? '#10b981' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Follower Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>Shop Follower Growth</CardTitle>
                  <CardDescription>Top 3 shops over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={followerGrowthData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="shop1" stroke="#3b82f6" strokeWidth={2} name="Shop 1" />
                      <Line type="monotone" dataKey="shop2" stroke="#10b981" strokeWidth={2} name="Shop 2" />
                      <Line type="monotone" dataKey="shop3" stroke="#f59e0b" strokeWidth={2} name="Shop 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Review Sentiment */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Sentiment Analysis</CardTitle>
                  <CardDescription>Customer feedback breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        dataKey="value"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percent = 0 }) => `${(percent * 100).toFixed(1)}%`}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 🔧 OPERATIONAL ANALYTICS */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Operational Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Shop Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Shop Activity Status</CardTitle>
                  <CardDescription>Active vs inactive shops</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={shopActivityData}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rider Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Rider Performance</CardTitle>
                  <CardDescription>Deliveries and ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={riderPerformanceData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="delivered" fill="#3b82f6" name="Deliveries" />
                      <Line dataKey="rating" stroke="#f59e0b" strokeWidth={2} name="Rating" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* System Activity Trends */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>System Activity Trends</CardTitle>
                  <CardDescription>User activity by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={systemActivityData}>
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="customers" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Customers" />
                      <Area type="monotone" dataKey="shops" stackId="1" stroke="#10b981" fill="#10b981" name="Shops" />
                      <Area type="monotone" dataKey="admins" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Admins" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </SidebarLayout>
    </UserProvider>
  );
}