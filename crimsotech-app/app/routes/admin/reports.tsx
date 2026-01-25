import type { Route } from "./+types/reports";
import SidebarLayout from '~/components/layouts/sidebar';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
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
  AlertTriangle,
  Users,
  Package,
  Store,
  TrendingUp,
  TrendingDown,
  Eye,
  MoreHorizontal,
  Calendar,
  Flag,
  User,
  ShoppingBag,
  Building,
  BarChart3,
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Reports | Admin",
    }
  ];
}

interface ReportedAccount {
  id: string;
  username: string;
  email: string;
  reportCount: number;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'action_taken';
  reportedBy: string;
  reportedAt: string;
  lastActivity: string;
  userType: 'customer' | 'rider' | 'shop_owner';
  first_name?: string;
  last_name?: string;
  is_suspended?: boolean;
  warning_count?: number;
}

interface ReportedProduct {
  id: string;
  name: string;
  shopName: string;
  price: number;
  reportCount: number;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'action_taken';
  reportedBy: string;
  reportedAt: string;
  category: string;
  violations: string[];
  is_removed?: boolean;
  removal_reason?: string;
  description?: string;
}

interface ReportedShop {
  id: string;
  name: string;
  owner: string;
  reportCount: number;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'action_taken';
  reportedBy: string;
  reportedAt: string;
  totalProducts: number;
  rating: number;
  violations: string[];
  is_suspended?: boolean;
  suspension_reason?: string;
  verified?: boolean;
}

interface LoaderData {
  user: any;
  reportMetrics: {
    total_reports: number;
    pending_reports: number;
    resolved_this_week: number;
    accounts_reported: number;
    products_reported: number;
    shops_reported: number;
    resolution_rate: number;
    avg_resolution_time: number;
  };
  analytics: {
    reports_by_type: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    reports_trend: Array<{
      date: string;
      new_reports: number;
      resolved: number;
      pending: number;
    }>;
    top_reasons: Array<{
      reason: string;
      count: number;
      type: string;
    }>;
  };
  reportedAccounts: ReportedAccount[];
  reportedProducts: ReportedProduct[];
  reportedShops: ReportedShop[];
}

// Helper functions for data transformation
function mapUserType(userType: string): 'customer' | 'rider' | 'shop_owner' {
  switch (userType) {
    case 'rider':
      return 'rider';
    case 'shop_owner':
      return 'shop_owner';
    default:
      return 'customer';
  }
}

function extractViolations(description: string): string[] {
  if (!description) return ['Policy Violation'];
  
  const violations: string[] = [];
  
  if (description.toLowerCase().includes('counterfeit')) {
    violations.push('Counterfeit Goods');
  }
  if (description.toLowerCase().includes('fake') || description.toLowerCase().includes('false')) {
    violations.push('False Advertising');
  }
  if (description.toLowerCase().includes('misleading')) {
    violations.push('Misleading Description');
  }
  if (description.toLowerCase().includes('fraud')) {
    violations.push('Fraudulent Activity');
  }
  if (description.toLowerCase().includes('inappropriate')) {
    violations.push('Inappropriate Content');
  }
  if (description.toLowerCase().includes('harassment')) {
    violations.push('Harassment');
  }
  if (description.toLowerCase().includes('spam')) {
    violations.push('Spam');
  }
  
  return violations.length > 0 ? violations : ['Policy Violation'];
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let reportMetrics = null;
  let analyticsData = null;
  let reportedAccounts: ReportedAccount[] = [];
  let reportedProducts: ReportedProduct[] = [];
  let reportedShops: ReportedShop[] = [];

  try {
    // Fetch report metrics from the backend
    const metricsResponse = await AxiosInstance.get('/admin-reports/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data) {
      reportMetrics = {
        total_reports: metricsResponse.data.total_reports || 0,
        pending_reports: metricsResponse.data.pending_reports || 0,
        resolved_this_week: metricsResponse.data.resolved_this_week || 0,
        accounts_reported: metricsResponse.data.accounts_reported || 0,
        products_reported: metricsResponse.data.products_reported || 0,
        shops_reported: metricsResponse.data.shops_reported || 0,
        resolution_rate: metricsResponse.data.resolution_rate || 0,
        avg_resolution_time: metricsResponse.data.avg_resolution_time || 0,
      };
    }

    // Fetch analytics data for charts
    const analyticsResponse = await AxiosInstance.get('/admin-reports/get_analytics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (analyticsResponse.data) {
      analyticsData = {
        reports_by_type: analyticsResponse.data.reports_by_type || [],
        reports_trend: analyticsResponse.data.reports_trend || [],
        top_reasons: analyticsResponse.data.top_reasons || [],
      };
    }

    // Fetch account reports
    const accountsResponse = await AxiosInstance.get('/admin-reports/reports_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        type: 'account',
        page_size: 50
      }
    });

    if (accountsResponse.data && accountsResponse.data.reports) {
      reportedAccounts = accountsResponse.data.reports
        .filter((report: any) => report.report_type === 'account' && report.reported_object)
        .map((report: any) => ({
          id: report.id,
          username: report.reported_object.username || 'Unknown',
          email: report.reported_object.email || 'No email',
          reportCount: report.reported_object.active_report_count || 1,
          reason: report.reason?.replace(/_/g, ' ') || 'Other',
          status: report.status,
          reportedBy: report.reporter_username || 'Anonymous',
          reportedAt: report.created_at,
          lastActivity: report.updated_at,
          userType: mapUserType(report.reported_object.user_type),
          first_name: report.reported_object.first_name,
          last_name: report.reported_object.last_name,
          is_suspended: report.reported_object.is_suspended,
          warning_count: report.reported_object.warning_count,
        }));
    }

    // Fetch product reports
    const productsResponse = await AxiosInstance.get('/admin-reports/reports_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        type: 'product',
        page_size: 50
      }
    });

    if (productsResponse.data && productsResponse.data.reports) {
      reportedProducts = productsResponse.data.reports
        .filter((report: any) => report.report_type === 'product' && report.reported_object)
        .map((report: any) => ({
          id: report.id,
          name: report.reported_object.name || 'Unknown Product',
          shopName: report.reported_object.shop_name || 'No Shop',
          price: report.reported_object.price || 0,
          reportCount: report.reported_object.active_report_count || 1,
          reason: report.reason?.replace(/_/g, ' ') || 'Other',
          status: report.status,
          reportedBy: report.reporter_username || 'Anonymous',
          reportedAt: report.created_at,
          category: report.reported_object.category || 'Uncategorized',
          violations: extractViolations(report.description),
          is_removed: report.reported_object.is_removed,
          removal_reason: report.reported_object.removal_reason,
          description: report.reported_object.description,
        }));
    }

    // Fetch shop reports
    const shopsResponse = await AxiosInstance.get('/admin-reports/reports_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        type: 'shop',
        page_size: 50
      }
    });

    if (shopsResponse.data && shopsResponse.data.reports) {
      reportedShops = shopsResponse.data.reports
        .filter((report: any) => report.report_type === 'shop' && report.reported_object)
        .map((report: any) => ({
          id: report.id,
          name: report.reported_object.name || 'Unknown Shop',
          owner: report.reported_object.owner || 'Unknown Owner',
          reportCount: report.reported_object.active_report_count || 1,
          reason: report.reason?.replace(/_/g, ' ') || 'Other',
          status: report.status,
          reportedBy: report.reporter_username || 'Anonymous',
          reportedAt: report.created_at,
          totalProducts: report.reported_object.total_products || 0,
          rating: report.reported_object.rating || 0,
          violations: extractViolations(report.description),
          is_suspended: report.reported_object.is_suspended,
          suspension_reason: report.reported_object.suspension_reason,
          verified: report.reported_object.verified,
        }));
    }

  } catch (error) {
    console.error('Error fetching report data:', error);
    
    // Use fallback data structure on error
    reportMetrics = {
      total_reports: 0,
      pending_reports: 0,
      resolved_this_week: 0,
      accounts_reported: 0,
      products_reported: 0,
      shops_reported: 0,
      resolution_rate: 0,
      avg_resolution_time: 0,
    };
    
    analyticsData = {
      reports_by_type: [],
      reports_trend: [],
      top_reasons: [],
    };
    
    reportedAccounts = [];
    reportedProducts = [];
    reportedShops = [];
  }

  return {
    user,
    reportMetrics: reportMetrics!,
    analytics: analyticsData!,
    reportedAccounts,
    reportedProducts,
    reportedShops,
  };
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function Reports({ loaderData }: { loaderData: LoaderData }) {
  const { user, reportMetrics, analytics, reportedAccounts, reportedProducts, reportedShops } = loaderData;

  // Show loading/error state if no data
  if (!reportMetrics || !analytics) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-lg text-muted-foreground">Loading report data...</div>
              <div className="text-sm text-muted-foreground mt-2">
                If this takes too long, there might be an issue with the server.
              </div>
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Reports & Moderation</h1>
              <p className="text-muted-foreground mt-1">
                Manage reported content and user accounts
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold mt-1">{reportMetrics.total_reports}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <p className="text-xs text-muted-foreground">
                        {reportMetrics.pending_reports} pending
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <Flag className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    <p className="text-2xl font-bold mt-1">{reportMetrics.resolution_rate}%</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <p className="text-xs text-muted-foreground">
                        {reportMetrics.resolved_this_week} resolved this week
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
                    <p className="text-2xl font-bold mt-1">{reportMetrics.avg_resolution_time}d</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Average time to resolve
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Report Distribution</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {reportMetrics.accounts_reported} Accounts
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {reportMetrics.products_reported} Products
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {reportMetrics.shops_reported} shops reported
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reports by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Reports by Type</CardTitle>
                <CardDescription>Distribution of reports across different categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.reports_by_type}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => {
                        const total = analytics.reports_by_type.reduce((sum, item) => sum + item.count, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${name} (${percentage}%)`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.reports_by_type.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Reports Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Reports Trend</CardTitle>
                <CardDescription>Monthly report activity and resolution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.reports_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="new_reports" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="New Reports"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Resolved"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Pending"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>Top Reporting Reasons</CardTitle>
              <CardDescription>Most common reasons for reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={analytics.top_reasons} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="reason" 
                    type="category" 
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Report Count"
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reported Instances Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Reported Instances</CardTitle>
              <CardDescription>Manage and review all reported content</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="accounts" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Accounts ({reportedAccounts.length})
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Products ({reportedProducts.length})
                  </TabsTrigger>
                  <TabsTrigger value="shops" className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Shops ({reportedShops.length})
                  </TabsTrigger>
                </TabsList>

                {/* Accounts Tab */}
                <TabsContent value="accounts">
                  <DataTable 
                    columns={accountColumns} 
                    data={reportedAccounts}
                    searchConfig={{
                      column: "username",
                      placeholder: "Search by username..."
                    }}
                  />
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products">
                  <DataTable 
                    columns={productColumns} 
                    data={reportedProducts}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by product name..."
                    }}
                  />
                </TabsContent>

                {/* Shops Tab */}
                <TabsContent value="shops">
                  <DataTable 
                    columns={shopColumns} 
                    data={reportedShops}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by shop name..."
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

// Column definitions for each table
const accountColumns: ColumnDef<ReportedAccount>[] = [
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{row.getValue("username")}</div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "userType",
    header: "Type",
    cell: ({ row }: { row: any }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("userType")}
      </Badge>
    ),
  },
  {
    accessorKey: "reportCount",
    header: "Reports",
    cell: ({ row }: { row: any }) => (
      <Badge variant={row.getValue("reportCount") > 3 ? "destructive" : "secondary"}>
        {row.getValue("reportCount")}
      </Badge>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }: { row: any }) => (
      <div className="max-w-[200px] truncate" title={row.getValue("reason")}>
        {row.getValue("reason")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any }) => {
      const status = row.getValue("status") as string;
      const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        under_review: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
        dismissed: "bg-gray-100 text-gray-800",
        action_taken: "bg-purple-100 text-purple-800",
      };
      
      return (
        <Badge className={`capitalize ${statusColors[status as keyof typeof statusColors]}`}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reportedAt",
    header: "Reported",
    cell: ({ row }: { row: any }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.getValue("reportedAt")).toLocaleDateString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }: { row: any }) => (
      <Button variant="ghost" size="sm">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    ),
  },
];

const productColumns: ColumnDef<ReportedProduct>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground">{row.original.shopName}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }: { row: any }) => (
      <div>₱{row.getValue("price")}</div>
    ),
  },
  {
    accessorKey: "reportCount",
    header: "Reports",
    cell: ({ row }: { row: any }) => (
      <Badge variant={row.getValue("reportCount") > 2 ? "destructive" : "secondary"}>
        {row.getValue("reportCount")}
      </Badge>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }: { row: any }) => (
      <div className="max-w-[150px] truncate" title={row.getValue("reason")}>
        {row.getValue("reason")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any }) => {
      const status = row.getValue("status") as string;
      const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        under_review: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
        dismissed: "bg-gray-100 text-gray-800",
        action_taken: "bg-purple-100 text-purple-800",
      };
      
      return (
        <Badge className={`capitalize ${statusColors[status as keyof typeof statusColors]}`}>
          {status}
        </Badge>
      );
    },
  },
];

const shopColumns: ColumnDef<ReportedShop>[] = [
  {
    accessorKey: "name",
    header: "Shop",
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground">{row.original.owner}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "reportCount",
    header: "Reports",
    cell: ({ row }: { row: any }) => (
      <Badge variant={row.getValue("reportCount") > 3 ? "destructive" : "secondary"}>
        {row.getValue("reportCount")}
      </Badge>
    ),
  },
  {
    accessorKey: "totalProducts",
    header: "Products",
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center gap-1">
        <div className="text-sm">{row.getValue("rating")}</div>
        {row.getValue("rating") < 3 ? (
          <TrendingDown className="w-4 h-4 text-red-500" />
        ) : (
          <TrendingUp className="w-4 h-4 text-green-500" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }: { row: any }) => (
      <div className="max-w-[150px] truncate" title={row.getValue("reason")}>
        {row.getValue("reason")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any }) => {
      const status = row.getValue("status") as string;
      const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        under_review: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
        dismissed: "bg-gray-100 text-gray-800",
        action_taken: "bg-purple-100 text-purple-800",
      };
      
      return (
        <Badge className={`capitalize ${statusColors[status as keyof typeof statusColors]}`}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
];