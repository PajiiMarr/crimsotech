// app/routes/admin/boosts.tsx
import type { Route } from './+types/boosting'
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
  Zap,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Store,
  User,
  Package,
  Calendar,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Boosts | Admin",
    },
  ];
}

interface Boost {
  id: string;
  shopName: string;
  shopOwner: string;
  productName: string;
  boostType: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

interface LoaderData {
  user: any;
  boostMetrics: {
    total_boosts: number;
    active_boosts: number;
    total_revenue: number;
    avg_conversion_rate: number;
    most_popular_boost: string;
  };
  boosts: Boost[];
  analytics: {
    top_plans_by_usage: Array<{
      name: string;
      usage: number;
      duration: string;
      price: number;
    }>;
    plan_revenue_data: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
    boost_trend_data: Array<{
      month: string;
      newBoosts: number;
      expired: number;
      full_month: string;
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

  let boostMetrics = null;
  let boostsList = [];
  let analyticsData = null;

  try {
    // Fetch boost metrics from the backend
    const metricsResponse = await AxiosInstance.get('/admin-boosting/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      boostMetrics = metricsResponse.data.metrics;
    }

    // Fetch analytics data for charts
    const analyticsResponse = await AxiosInstance.get('/admin-boosting/get_analytics_data/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (analyticsResponse.data.success) {
      analyticsData = analyticsResponse.data.analytics;
    }

    // Fetch boosts list
    const boostsResponse = await AxiosInstance.get('/admin-boosting/get_active_boosts/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (boostsResponse.data.success) {
      // Transform the API data to match our frontend interface
      boostsList = boostsResponse.data.boosts.map((boost: any) => {
        // Calculate duration in days
        const startDate = new Date(boost.start_date);
        const endDate = new Date(boost.end_date);
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: boost.boost_id,
          shopName: boost.shop_name,
          shopOwner: boost.customer_name, // Using customer_name as shop owner
          productName: boost.product_name,
          boostType: boost.boost_plan_name,
          status: boost.status,
          startDate: boost.start_date,
          endDate: boost.end_date,
          duration: duration,
          cost: boost.amount,
          impressions: Math.floor(Math.random() * 10000) + 1000, // Mock data since not in API
          clicks: Math.floor(Math.random() * 500) + 50, // Mock data since not in API
          conversionRate: parseFloat((Math.random() * 10).toFixed(1)), // Mock data
          createdAt: boost.created_at,
          customerName: boost.customer_name,
          customerEmail: boost.customer_email
        };
      });
    }

  } catch (error) {
    console.error('Error fetching boost data:', error);
    // Use fallback data structure
    boostMetrics = {
      total_boosts: 0,
      active_boosts: 0,
      total_revenue: 0,
      avg_conversion_rate: 0,
      most_popular_boost: "No boosts"
    };
    
    analyticsData = {
      top_plans_by_usage: [],
      plan_revenue_data: [],
      boost_trend_data: []
    };
    
    boostsList = [];
  }

  // console.log('Transformed Boosts Data:', boostsList);

  return { 
    user, 
    boostMetrics,
    boosts: boostsList,
    analytics: analyticsData
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7'];

export default function Boosts({ loaderData }: { loaderData: LoaderData }) {
  const { user, boostMetrics, boosts, analytics } = loaderData;

  // Add proper loading and error states
  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading boosts...</div>
      </div>
    );
  }

  // Ensure boosts is always an array
  const safeBoosts = boosts || [];

  // Create filter config with safe data
  const boostFilterConfig = {
    status: {
      options: [...new Set(safeBoosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    boostType: {
      options: [...new Set(safeBoosts.map(boost => boost.boostType))],
      placeholder: 'Boost Type'
    },
    shopOwner: {
      options: [...new Set(safeBoosts.map(boost => boost.shopOwner))],
      placeholder: 'Shop Owner'
    }
  };

  // Ensure analytics data is always available
  const safeAnalytics = analytics || {
    top_plans_by_usage: [],
    plan_revenue_data: [],
    boost_trend_data: []
  };

  // Ensure metrics data is always available
  const safeMetrics = boostMetrics || {
    total_boosts: 0,
    active_boosts: 0,
    total_revenue: 0,
    avg_conversion_rate: 0,
    most_popular_boost: "No boosts"
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Boosts</h1>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Boosts</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_boosts}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.active_boosts} active</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
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
                    <p className="text-xs text-muted-foreground mt-2">From all boosts</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Conversion</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.avg_conversion_rate}%</p>
                    <p className="text-xs text-muted-foreground mt-2">Overall performance</p>
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
                    <p className="text-sm text-muted-foreground">Most Popular</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{safeMetrics.most_popular_boost}</p>
                    <p className="text-xs text-muted-foreground mt-2">Boost type</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Plans by Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Top Plans by Usage</CardTitle>
                <CardDescription>Most used boost packages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={safeAnalytics.top_plans_by_usage} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={80} 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        value, 
                        name === 'usage' ? 'Usage Count' : name
                      ]}
                    />
                    <Bar 
                      dataKey="usage" 
                      name="Usage Count"
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Plan Revenue Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Plan Revenue Distribution</CardTitle>
                <CardDescription>Revenue contribution by plan type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={safeAnalytics.plan_revenue_data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${Math.round((percent ?? 0) * 100)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {safeAnalytics.plan_revenue_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        `₱${value}`, 
                        name === 'value' ? 'Revenue' : name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Boost Trend Over Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Boost Trend Over Time</CardTitle>
              <CardDescription>Monthly boost activity and expirations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={safeAnalytics.boost_trend_data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.full_month || label;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="newBoosts" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="New Boosts"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expired" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Expired Boosts"
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Boosts Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Boosts</CardTitle>
              <CardDescription>Manage and view all boost campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={safeBoosts}
                  filterConfig={boostFilterConfig}
                  searchConfig={{
                    column: "shopName",
                    placeholder: "Search by shop name..."
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

const columns: ColumnDef<Boost>[] = [
  {
    accessorKey: "shopName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Shop
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-2">
        <Store className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        <div className="font-medium text-xs sm:text-sm">{row.getValue("shopName")}</div>
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Package className="w-3 h-3 text-muted-foreground" />
        {row.getValue("productName")}
      </div>
    ),
  },
  {
    accessorKey: "shopOwner",
    header: "Owner",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground" />
        {row.getValue("shopOwner")}
      </div>
    ),
  },
  {
    accessorKey: "boostType",
    header: "Boost Type",
    cell: ({ row }: { row: any}) => {
      const type = row.getValue("boostType") as string;
      const getColor = (boostType: string) => {
        switch(boostType) {
          case 'Starter Boost': return '#10b981';
          case 'Basic Boost': return '#3b82f6';
          case 'Premium Boost': return '#8b5cf6';
          case 'Ultimate Boost': return '#f59e0b';
          case 'Pro Boost': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(type);
      
      return (
        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {type}
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
          case 'active': return '#10b981';
          case 'expired': return '#6b7280';
          case 'pending': return '#f59e0b';
          case 'cancelled': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Start Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("startDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
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
    accessorKey: "endDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          End Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("endDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
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
    accessorKey: "duration",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Duration
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("duration")} days
      </div>
    ),
  },
  {
    accessorKey: "cost",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Cost
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        ₱{row.getValue("cost")}
      </div>
    ),
  },
  {
    accessorKey: "impressions",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Impressions
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        {row.getValue("impressions")?.toLocaleString() || '0'}
      </div>
    ),
  },
  {
    accessorKey: "conversionRate",
    header: "Conversion",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("conversionRate")}%
      </div>
    ),
  },
];