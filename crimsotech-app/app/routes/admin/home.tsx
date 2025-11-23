// app/routes/home.tsx
import type { Route } from './+types/home'
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
  DollarSign, 
  ShoppingCart, 
  Users, 
  Store, 
  Zap, 
  Bell, 
  Star, 
  AlertTriangle,
  Package
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Dashboard | Admin",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");
  
  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isAdmin"]);
  return user;
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}


// Weekly sales trend data
const salesData = [
  { name: 'Mon', sales: 4200, orders: 42 },
  { name: 'Tue', sales: 7100, orders: 65 },
  { name: 'Wed', sales: 5300, orders: 51 },
  { name: 'Thu', sales: 8400, orders: 78 },
  { name: 'Fri', sales: 6800, orders: 63 },
  { name: 'Sat', sales: 9200, orders: 85 },
  { name: 'Sun', sales: 7600, orders: 71 },
];

// Order status distribution
const orderStatusData = [
  { name: 'Pending', value: 30 },
  { name: 'Shipped', value: 50 },
  { name: 'Delivered', value: 100 },
  { name: 'Cancelled', value: 10 },
];

// Top products by orders
const productBarData = [
  { name: 'Gaming Laptop', orders: 120, revenue: 1800000 },
  { name: 'Wireless Mouse', orders: 280, revenue: 140000 },
  { name: 'Keyboard RGB', orders: 195, revenue: 585000 },
  { name: 'Monitor 27"', orders: 145, revenue: 1015000 },
  { name: 'USB-C Hub', orders: 320, revenue: 480000 },
];

// Revenue by category
const categoryRevenueData = [
  { category: 'Electronics', revenue: 154000 },
  { category: 'Fashion', revenue: 98000 },
  { category: 'Home & Living', revenue: 76000 },
  { category: 'Sports', revenue: 54000 },
  { category: 'Books', revenue: 32000 },
];

// Customer growth data
const customerGrowthData = [
  { month: 'Jan', new: 145, returning: 320 },
  { month: 'Feb', new: 168, returning: 385 },
  { month: 'Mar', new: 192, returning: 420 },
  { month: 'Apr', new: 215, returning: 485 },
  { month: 'May', new: 238, returning: 540 },
  { month: 'Jun', new: 265, returning: 615 },
];

// Recent transactions
const recentTransactions = [
  { id: '#ORD-1024', customer: 'John Smith', amount: 287.50, status: 'Completed', date: 'Nov 13, 2025' },
  { id: '#ORD-1023', customer: 'Sarah Johnson', amount: 142.00, status: 'Shipped', date: 'Nov 12, 2025' },
  { id: '#ORD-1022', customer: 'Michael Chen', amount: 425.90, status: 'Completed', date: 'Nov 12, 2025' },
  { id: '#ORD-1021', customer: 'Emma Williams', amount: 89.99, status: 'Pending', date: 'Nov 11, 2025' },
  { id: '#ORD-1020', customer: 'David Brown', amount: 312.40, status: 'Completed', date: 'Nov 11, 2025' },
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Sales" value="₱54,320" change="+12.5%" trend="up" icon={DollarSign} />
            <StatCard title="Total Orders" value="1,204" change="+8.3%" trend="up" icon={ShoppingCart} />
            <StatCard title="Total Customers" value="2,847" change="+15.2%" trend="up" icon={Users} />
            <StatCard title="Active Shops" value="142" change="+3.5%" trend="up" icon={Store} />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Boosts</p>
                    <p className="text-2xl font-bold mt-1">12</p>
                    <p className="text-xs text-muted-foreground mt-2">Running now</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Zap className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Notifications</p>
                    <p className="text-2xl font-bold mt-1">7</p>
                    <p className="text-xs text-muted-foreground mt-2">Unread alerts</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <Bell className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New Reviews</p>
                    <p className="text-2xl font-bold mt-1">15</p>
                    <p className="text-xs text-muted-foreground mt-2">Avg: 4.6★</p>
                  </div>
                  <div className="p-3 bg-pink-100 rounded-full">
                    <Star className="w-6 h-6 text-pink-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">3</p>
                    <p className="text-xs text-muted-foreground mt-2">Need restocking</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sales Trend - Takes 2 columns */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales & Orders Trend</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={salesData}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₱${value}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="sales" 
                      fill="#3b82f6" 
                      name="Sales (₱)"
                      radius={[8, 8, 0, 0]}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Orders"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
                <CardDescription>Distribution overview</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Second Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Products</CardTitle>
                <CardDescription>Best sellers by order count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productBarData} layout="vertical">
                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="orders" 
                      fill="#10b981" 
                      radius={[0, 8, 8, 0]}
                      barSize={25}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Top performing categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryRevenueData}>
                    <XAxis 
                      dataKey="category" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `₱${value / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`₱${value}`, 'Revenue']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                    >
                      {categoryRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Customer Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition & Retention</CardTitle>
              <CardDescription>New vs returning customers over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={customerGrowthData}>
                  <XAxis 
                    dataKey="month" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="new" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    name="New Customers" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="returning" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    name="Returning" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Latest 5 completed orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((transaction, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium">{transaction.id}</td>
                        <td className="py-3 px-2">{transaction.customer}</td>
                        <td className="py-3 px-2 font-semibold">₱{transaction.amount.toFixed(2)}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                            transaction.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{transaction.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}