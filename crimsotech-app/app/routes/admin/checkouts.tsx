// app/routes/admin/checkouts.tsx
import type { Route } from './+types/checkouts';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { 
  ShoppingCart,
  TrendingUp,
  Clock,
  ArrowUpDown,
  User,
  Package,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Checkouts | Admin",
    },
  ];
}

interface Checkout {
  id: string;
  customerName: string;
  customerEmail: string;
  items: string[];
  amount: number;
  paymentMethod: 'gcash' | 'card' | 'cash' | 'bank_transfer';
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  createdAt: string;
  updatedAt: string;
  referenceNumber: string;
  organization: string;
}

interface LoaderData {
  user: any;
  checkoutMetrics: {
    total_checkouts: number;
    pending_checkouts: number;
    completed_checkouts: number;
    cancelled_checkouts: number;
    total_revenue: number;
    today_checkouts: number;
    monthly_checkouts: number;
    avg_checkout_value: number;
    success_rate: number;
  };
  checkouts: Checkout[];
  analytics: {
    daily_checkouts: Array<{
      date: string;
      count: number;
      revenue: number;
    }>;
    status_distribution: Array<{
      name: string;
      value: number;
    }>;
    payment_method_distribution: Array<{
      name: string;
      value: number;
    }>;
  };
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
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

  // Mock data for placeholders - replace with actual API calls
  const checkoutMetrics = {
    total_checkouts: 1247,
    pending_checkouts: 23,
    completed_checkouts: 985,
    cancelled_checkouts: 45,
    total_revenue: 254780,
    today_checkouts: 18,
    monthly_checkouts: 347,
    avg_checkout_value: 204.5,
    success_rate: 78.9,
  };

  const checkoutsList: Checkout[] = [
    {
      id: 'CHK-001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: ['iPhone 15 Pro', 'AirPods Pro'],
      amount: 1499.99,
      paymentMethod: 'gcash',
      status: 'completed',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T11:45:00Z',
      referenceNumber: 'REF-001234',
      organization: 'Tech Store'
    },
    {
      id: 'CHK-002',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      items: ['MacBook Pro'],
      amount: 2299.99,
      paymentMethod: 'card',
      status: 'pending',
      createdAt: '2024-01-15T14:20:00Z',
      updatedAt: '2024-01-15T14:20:00Z',
      referenceNumber: 'REF-001235',
      organization: 'Apple Store'
    },
    {
      id: 'CHK-003',
      customerName: 'Mike Johnson',
      customerEmail: 'mike@example.com',
      items: ['Samsung TV', 'Soundbar'],
      amount: 899.99,
      paymentMethod: 'bank_transfer',
      status: 'paid',
      createdAt: '2024-01-14T09:15:00Z',
      updatedAt: '2024-01-14T16:30:00Z',
      referenceNumber: 'REF-001236',
      organization: 'Electronics Hub'
    },
    {
      id: 'CHK-004',
      customerName: 'Sarah Wilson',
      customerEmail: 'sarah@example.com',
      items: ['Nike Shoes', 'Sports Bag'],
      amount: 199.99,
      paymentMethod: 'cash',
      status: 'cancelled',
      createdAt: '2024-01-14T11:45:00Z',
      updatedAt: '2024-01-14T12:30:00Z',
      referenceNumber: 'REF-001237',
      organization: 'Sports Gear'
    },
    {
      id: 'CHK-005',
      customerName: 'David Brown',
      customerEmail: 'david@example.com',
      items: ['Gaming Laptop', 'Mouse'],
      amount: 1599.99,
      paymentMethod: 'gcash',
      status: 'failed',
      createdAt: '2024-01-13T16:20:00Z',
      updatedAt: '2024-01-13T16:25:00Z',
      referenceNumber: 'REF-001238',
      organization: 'Game World'
    }
  ];

  const analyticsData = {
    daily_checkouts: [
      { date: 'Jan 10', count: 42, revenue: 8450 },
      { date: 'Jan 11', count: 38, revenue: 7210 },
      { date: 'Jan 12', count: 45, revenue: 8920 },
      { date: 'Jan 13', count: 51, revenue: 10250 },
      { date: 'Jan 14', count: 47, revenue: 9340 },
      { date: 'Jan 15', count: 18, revenue: 3610 },
    ],
    status_distribution: [
      { name: 'Completed', value: 985 },
      { name: 'Pending', value: 23 },
      { name: 'Paid', value: 194 },
      { name: 'Cancelled', value: 45 },
      { name: 'Failed', value: 12 },
    ],
    payment_method_distribution: [
      { name: 'GCash', value: 567 },
      { name: 'Credit Card', value: 432 },
      { name: 'Bank Transfer', value: 198 },
      { name: 'Cash', value: 50 },
    ],
  };

  return { 
    user, 
    checkoutMetrics,
    checkouts: checkoutsList,
    analytics: analyticsData
  };
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const PAYMENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

export default function Checkouts({ loaderData }: { loaderData: LoaderData }) {
  const { user, checkoutMetrics, checkouts, analytics } = loaderData;

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading checkouts...</div>
      </div>
    );
  }

  const safeCheckouts = checkouts || [];
  const safeAnalytics = analytics || {
    daily_checkouts: [],
    status_distribution: [],
    payment_method_distribution: []
  };
  const safeMetrics = checkoutMetrics || {
    total_checkouts: 0,
    pending_checkouts: 0,
    completed_checkouts: 0,
    cancelled_checkouts: 0,
    total_revenue: 0,
    today_checkouts: 0,
    monthly_checkouts: 0,
    avg_checkout_value: 0,
    success_rate: 0,
  };

  const checkoutFilterConfig = {
    status: {
      options: [...new Set(safeCheckouts.map(checkout => checkout.status))],
      placeholder: 'Status'
    },
    paymentMethod: {
      options: [...new Set(safeCheckouts.map(checkout => checkout.paymentMethod))],
      placeholder: 'Payment Method'
    },
    organization: {
      options: [...new Set(safeCheckouts.map(checkout => checkout.organization))],
      placeholder: 'Organization'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Checkouts</h1>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Checkouts</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_checkouts}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.today_checkouts} today</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <ShoppingCart className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">From all checkouts</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.success_rate}%</p>
                    <p className="text-xs text-muted-foreground mt-2">Checkout completion</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.avg_checkout_value}</p>
                    <p className="text-xs text-muted-foreground mt-2">Per checkout</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-lg font-bold mt-1 text-green-600">{safeMetrics.completed_checkouts}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold mt-1 text-yellow-600">{safeMetrics.pending_checkouts}</p>
                  </div>
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                    <p className="text-lg font-bold mt-1 text-red-600">{safeMetrics.cancelled_checkouts}</p>
                  </div>
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-lg font-bold mt-1 text-blue-600">{safeMetrics.monthly_checkouts}</p>
                  </div>
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Daily Checkouts Trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Daily Checkouts Trend</CardTitle>
                <CardDescription>Checkout activity over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={safeAnalytics.daily_checkouts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Checkouts" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Status Distribution</CardTitle>
                <CardDescription>Breakdown of checkout statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={safeAnalytics.status_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {safeAnalytics.status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Payment Methods</CardTitle>
              <CardDescription>Distribution of payment methods used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={safeAnalytics.payment_method_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {safeAnalytics.payment_method_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Checkouts Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Checkouts</CardTitle>
              <CardDescription>Manage and view all customer checkouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={safeCheckouts}
                  filterConfig={checkoutFilterConfig}
                  searchConfig={{
                    column: "customerName",
                    placeholder: "Search by customer name..."
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<Checkout>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Checkout ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="font-medium text-xs sm:text-sm">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground" />
        <div>
          <div className="font-medium">{row.getValue("customerName")}</div>
          <div className="text-xs text-muted-foreground">{row.original.customerEmail}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        {row.getValue("items").slice(0, 2).join(', ')}
        {row.getValue("items").length > 2 && ` +${row.getValue("items").length - 2} more`}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <DollarSign className="w-3 h-3 text-muted-foreground" />
        ₱{row.getValue("amount")}
      </div>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }: { row: any}) => {
      const method = row.getValue("paymentMethod") as string;
      const getColor = (method: string) => {
        switch(method) {
          case 'gcash': return '#10b981';
          case 'card': return '#3b82f6';
          case 'bank_transfer': return '#8b5cf6';
          case 'cash': return '#f59e0b';
          default: return '#6b7280';
        }
      };
      const color = getColor(method);
      
      return (
        <Badge 
          variant="secondary" 
          className="text-xs capitalize"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {method.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      const getColor = (status: string) => {
        switch(status) {
          case 'completed': return '#10b981';
          case 'paid': return '#3b82f6';
          case 'pending': return '#f59e0b';
          case 'cancelled': return '#ef4444';
          case 'failed': return '#6b7280';
          default: return '#6b7280';
        }
      };
      const getIcon = (status: string) => {
        switch(status) {
          case 'completed': return <CheckCircle className="w-3 h-3" />;
          case 'paid': return <DollarSign className="w-3 h-3" />;
          case 'pending': return <Clock className="w-3 h-3" />;
          case 'cancelled': return <XCircle className="w-3 h-3" />;
          case 'failed': return <AlertCircle className="w-3 h-3" />;
          default: return <AlertCircle className="w-3 h-3" />;
        }
      };
      const color = getColor(status);
      const icon = getIcon(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Created
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("createdAt"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formattedDate}
        </div>
      );
    },
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm font-mono">
        {row.getValue("referenceNumber")}
      </div>
    ),
  },
];