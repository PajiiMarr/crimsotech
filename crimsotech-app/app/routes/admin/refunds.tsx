import type { Route } from "./+types/refunds"
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
  RefreshCw,
  Clock,
  ArrowUpDown,
  User,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Truck,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Refunds | Admin",
    },
  ];
}

// Updated interface to match your flattened data structure
interface Refund {
  refund: string;
  order_id: string;
  order_total_amount: number;
  requested_by_username: string;
  requested_by_email: string;
  processed_by_username?: string;
  processed_by_email?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'waiting' | 'to process' | 'completed';
  requested_at: string;
  logistic_service?: string;
  tracking_number?: string;
  preferred_refund_method?: string;
  final_refund_method?: string;
  processed_at?: string;
  has_media?: boolean;
  media_count?: number;
}

interface LoaderData {
  user: any;
  refundMetrics: {
    total_refunds: number;
    pending_refunds: number;
    approved_refunds: number;
    rejected_refunds: number;
    waiting_refunds: number;
    to_process_refunds: number;
    completed_refunds: number;
    total_refund_amount: number;
    avg_processing_time_hours: number;
    most_common_reason: string;
    refunds_this_month: number;
    avg_refund_amount: number;
  };
  refunds: Refund[];
  analytics: {
    status_distribution: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    monthly_trend_data: Array<{
      month: string;
      requested: number;
      processed: number;
      full_month: string;
    }>;
    refund_reasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    refund_methods: Array<{
      method: string;
      count: number;
      percentage: number;
    }>;
  };
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

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let refundMetrics = null;
  let refundsList: Refund[] = [];
  let analyticsData = null;

  try {
    const [metricsResponse, analyticsResponse, refundsResponse] = await Promise.all([
      AxiosInstance.get('/admin-refunds/get_metrics/', {
        headers: { "X-User-Id": session.get("userId") }
      }),
      AxiosInstance.get('/admin-refunds/get_analytics/', {
        headers: { "X-User-Id": session.get("userId") }
      }),
      AxiosInstance.get('/admin-refunds/refund_list/', {
        headers: { "X-User-Id": session.get("userId") }
      })
    ]);

    if (metricsResponse.data) {
      refundMetrics = metricsResponse.data;
    }

    if (analyticsResponse.data) {
      analyticsData = analyticsResponse.data;
    }

    // Handle the flattened data structure directly
    if (refundsResponse.data && Array.isArray(refundsResponse.data)) {
      refundsList = refundsResponse.data.map((refund: any) => ({
        refund: refund.refund,
        order_id: refund.order_id || 'N/A',
        order_total_amount: refund.order_total_amount || 0,
        requested_by_username: refund.requested_by_username || 'Unknown',
        requested_by_email: refund.requested_by_email || 'N/A',
        processed_by_username: refund.processed_by_username,
        processed_by_email: refund.processed_by_email,
        reason: refund.reason || 'No reason provided',
        status: refund.status || 'pending',
        requested_at: refund.requested_at,
        logistic_service: refund.logistic_service,
        tracking_number: refund.tracking_number,
        preferred_refund_method: refund.preferred_refund_method,
        final_refund_method: refund.final_refund_method,
        processed_at: refund.processed_at,
        has_media: refund.has_media || false,
        media_count: refund.media_count || 0
      }));
    }

  } catch (error) {
    console.error('Error fetching refund data:', error);
    refundMetrics = {
      total_refunds: 0,
      pending_refunds: 0,
      approved_refunds: 0,
      rejected_refunds: 0,
      waiting_refunds: 0,
      to_process_refunds: 0,
      completed_refunds: 0,
      total_refund_amount: 0,
      avg_processing_time_hours: 0,
      most_common_reason: "No refunds available",
      refunds_this_month: 0,
      avg_refund_amount: 0
    };
    
    analyticsData = {
      status_distribution: [
        { status: 'pending', count: 0, percentage: 0 },
        { status: 'approved', count: 0, percentage: 0 },
        { status: 'rejected', count: 0, percentage: 0 },
        { status: 'waiting', count: 0, percentage: 0 },
        { status: 'to process', count: 0, percentage: 0 },
        { status: 'completed', count: 0, percentage: 0 }
      ],
      monthly_trend_data: [],
      refund_reasons: [],
      refund_methods: []
    };
    
    refundsList = [];
  }

  return { 
    user, 
    refundMetrics,
    refunds: refundsList,
    analytics: analyticsData
  };
}

const COLORS = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

export default function Refunds({ loaderData }: { loaderData: LoaderData }) {
  const { user, refundMetrics, refunds, analytics } = loaderData;

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading refunds...</div>
      </div>
    );
  }

  const safeRefunds = refunds || [];
  const safeAnalytics = analytics || {
    status_distribution: [],
    monthly_trend_data: [],
    refund_reasons: [],
    refund_methods: []
  };
  const safeMetrics = refundMetrics || {
    total_refunds: 0,
    pending_refunds: 0,
    approved_refunds: 0,
    rejected_refunds: 0,
    waiting_refunds: 0,
    to_process_refunds: 0,
    completed_refunds: 0,
    total_refund_amount: 0,
    avg_processing_time_hours: 0,
    most_common_reason: "No refunds",
    refunds_this_month: 0,
    avg_refund_amount: 0
  };

  const refundFilterConfig = {
    status: {
      options: Array.from(new Set(safeRefunds.map(refund => refund.status))),
      placeholder: 'Status'
    },
    preferred_refund_method: {
      options: Array.from(new Set(safeRefunds
        .map(refund => refund.preferred_refund_method)
        .filter((v): v is string => !!v)
      )),
      placeholder: 'Refund Method'
    },
    logistic_service: {
      options: Array.from(new Set(safeRefunds
        .map(refund => refund.logistic_service)
        .filter((v): v is string => !!v)
      )),
      placeholder: 'Logistic Service'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Refunds</h1>
              <p className="text-muted-foreground mt-1">Manage and track refund requests</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Refunds</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_refunds}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.pending_refunds} pending</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <RefreshCw className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_refund_amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Avg: ₱{safeMetrics.avg_refund_amount.toLocaleString()}</p>
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
                    <p className="text-sm text-muted-foreground">Avg Processing</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.avg_processing_time_hours}h</p>
                    <p className="text-xs text-muted-foreground mt-2">Time to complete</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.refunds_this_month}</p>
                    <p className="text-xs text-muted-foreground mt-2">New requests</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {safeAnalytics.status_distribution.map((item) => (
              <Card key={item.status} className="text-center">
                <CardContent className="p-3">
                  <p className="text-lg font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Status Distribution</CardTitle>
                <CardDescription>Current status of all refund requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={safeAnalytics.status_distribution.filter(item => item.count > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ payload, percent }: any) => `${payload?.status ?? ''} (${Math.round((percent || 0) * 100)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {safeAnalytics.status_distribution.filter(item => item.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Refund Reasons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Top Refund Reasons</CardTitle>
                <CardDescription>Most common reasons for refund requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={safeAnalytics.refund_reasons.slice(0, 8)} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="reason" 
                      type="category" 
                      width={95} 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      name="Count"
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Refunds Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Refund Requests</CardTitle>
              <CardDescription>Manage and process refund requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={safeRefunds}
                  filterConfig={refundFilterConfig}
                  searchConfig={{
                    column: "order_id",
                    placeholder: "Search by order ID..."
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

const columns: ColumnDef<Refund>[] = [
  {
    accessorKey: "refund",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Refund ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="font-medium text-xs sm:text-sm font-mono">
        {row.getValue("refund").slice(0, 8)}...
      </div>
    ),
  },
  {
    accessorKey: "order_id",
    header: "Order ID",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm font-mono">
        <Package className="w-3 h-3 text-muted-foreground" />
        {row.getValue("order_id").slice(0, 8)}...
      </div>
    ),
  },
  {
    accessorKey: "requested_by_username",
    header: "Customer",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground" />
        <div>
          <div>{row.getValue("requested_by_username")}</div>
          <div className="text-xs text-muted-foreground">{row.original.requested_by_email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      const getStatusConfig = (status: string) => {
        const configs = {
          pending: { color: '#f59e0b', icon: Clock, label: 'Pending' },
          approved: { color: '#10b981', icon: CheckCircle, label: 'Approved' },
          rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
          waiting: { color: '#3b82f6', icon: Clock, label: 'Waiting' },
          'to process': { color: '#8b5cf6', icon: RefreshCw, label: 'To Process' },
          completed: { color: '#06b6d4', icon: CheckCircle, label: 'Completed' }
        };
        return configs[status as keyof typeof configs] || configs.pending;
      };
      
      const config = getStatusConfig(status);
      const IconComponent = config.icon;
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          <IconComponent className="w-3 h-3" />
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "requested_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Requested
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("requested_at"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
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
    accessorKey: "order_total_amount",
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
      <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
        <DollarSign className="w-3 h-3 text-muted-foreground" />
        ₱{parseFloat(row.getValue("order_total_amount")).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm max-w-[150px] truncate" title={row.getValue("reason")}>
        {row.getValue("reason")}
      </div>
    ),
  },
  {
    accessorKey: "preferred_refund_method",
    header: "Method",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        {row.getValue("preferred_refund_method") || 'Not specified'}
      </div>
    ),
  },
  {
    accessorKey: "logistic_service",
    header: "Logistics",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        {row.getValue("logistic_service") && (
          <>
            <Truck className="w-3 h-3 text-muted-foreground" />
            {row.getValue("logistic_service")}
          </>
        )}
      </div>
    ),
  }
];