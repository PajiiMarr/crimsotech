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
  Eye,
  Scale,
  Edit,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import { Link } from 'react-router';
import RefundActions from '~/components/admin/refund-actions';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Refunds | Admin",
    },
  ];
}

// Updated interface to match your flattened data structure
interface Refund {
  refund: string;          // refund ID (from backend's refund_id)
  order_id: string;
  order_total_amount: number;
  refund_amount?: number | null;
  requested_by_username: string;
  requested_by_email: string;
  processed_by_username?: string;
  processed_by_email?: string;
  reason: string;
  requested_refund_amount?: number;
  refund_fee?: number;
  total_refund_amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting' | 'to_process' | 'completed';
  requested_at: string;
  logistic_service?: string;
  tracking_number?: string;
  preferred_refund_method?: string;
  final_refund_method?: string;
  processed_at?: string;
  has_media?: boolean;
  media_count?: number;
  final_refund_type?: string | null;
  refund_type?: string | null;
  refund_payment_status?: string | null;
  has_return_request?: boolean;
  return_request_status?: string | null;
  approved_refund_amount?: number | null;
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
    const rawRefunds = (refundsResponse.data && Array.isArray(refundsResponse.data))
      ? refundsResponse.data
      : (refundsResponse.data && Array.isArray(refundsResponse.data.refunds) ? refundsResponse.data.refunds : []);

      if (rawRefunds.length) {
        refundsList = rawRefunds.map((refund: any) => {
          // Extract customer info from either flat fields or nested object
          let customerUsername = refund.requested_by_username;
          let customerEmail = refund.requested_by_email;
          
          // If flat fields are missing, try to get from nested requested_by object
          if (!customerUsername && refund.requested_by) {
            customerUsername = refund.requested_by.username || 
                               (refund.requested_by.email ? refund.requested_by.email.split('@')[0] : null) ||
                               'Unknown';
            customerEmail = refund.requested_by.email || '';
          }
          
          // Derive displayed status: prefer under_review when dispute is under review
          const baseStatus = (refund.status || 'pending').toString().toLowerCase();
          const disputeStatus = (
            refund.dispute?.status ||
            (Array.isArray(refund.disputes) && refund.disputes[0]?.status) ||
            refund.dispute_details?.status ||
            refund.dispute_request?.status ||
            ''
          ).toString().toLowerCase();
          const disputeUnderReviewStates = ['under_review', 'investigating', 'in_review'];
          const shouldForceUnderReview = disputeUnderReviewStates.includes(disputeStatus) && baseStatus === 'dispute' && String(refund.refund_payment_status || '').toLowerCase() === 'pending';
          const displayedStatus = shouldForceUnderReview ? 'under_review' : baseStatus;
      
          return {
            // ✅ Use refund_id directly
            refund: refund.refund_id,
            order_id: refund.order_id || 'N/A',
            order_total_amount: refund.order_total_amount || 0,
            refund_amount: refund.refund_amount != null ? refund.refund_amount : 0,  // ADD THIS LINE
            requested_by_username: customerUsername || 'Unknown',
            requested_by_email: customerEmail || 'N/A',
            processed_by_username: refund.processed_by_username,
            processed_by_email: refund.processed_by_email,
            reason: refund.reason || 'No reason provided',
            requested_refund_amount: refund.requested_refund_amount != null ? refund.requested_refund_amount : null,
            refund_fee: refund.refund_fee != null ? refund.refund_fee : null,
            total_refund_amount: refund.total_refund_amount != null ? refund.total_refund_amount : null,
            approved_refund_amount: refund.approved_refund_amount != null ? refund.approved_refund_amount : null,
            status: displayedStatus || (refund.status || 'pending'),
            requested_at: refund.requested_at,
            logistic_service: refund.logistic_service,
            tracking_number: refund.tracking_number,
            final_refund_type: refund.final_refund_type || null,
            refund_type: refund.refund_type || null,
            refund_payment_status: refund.refund_payment_status || null,
            has_return_request: refund.has_return_request || false,
            return_request_status: refund.return_request_status || null,
            preferred_refund_method: refund.preferred_refund_method,
            final_refund_method: refund.final_refund_method,
            processed_at: refund.processed_at,
            has_media: refund.has_media || false,
            media_count: refund.media_count || 0
          };
        });
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

  // Build filter config with default value for status
  const refundFilterConfig = {
    status: {
      options: Array.from(new Set(safeRefunds.map(refund => refund.status))),
      placeholder: 'Status',
      defaultValue: 'approved'
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

// Actions are provided by `components/admin/refund-actions` which uses client-side navigation with `useNavigate`.

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
    cell: ({ row }: { row: any}) => {
      const refundId = row.getValue("refund");
      return (
        <div className="font-medium text-xs sm:text-sm font-mono">
          {refundId ? String(refundId).slice(0, 8) : '...'}...
        </div>
      );
    },
  },
  {
    accessorKey: "order_id",
    header: "Order ID",
    cell: ({ row }: { row: any}) => {
      const orderId = row.getValue("order_id");
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm font-mono">
          <Package className="w-3 h-3 text-muted-foreground" />
          {orderId ? String(orderId).slice(0, 8) : 'N/A'}...
        </div>
      );
    },
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
      const rawStatus = row.original?.status ?? row.getValue("status");
      const status = String(rawStatus || 'pending').toLowerCase().replace(/[_-]/g, ' ').trim();

      const getStatusConfig = (s: string) => {
        const configs = {
          pending: { color: '#f59e0b', icon: Clock, label: 'Pending' },
          approved: { color: '#10b981', icon: CheckCircle, label: 'Approved' },
          rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
          waiting: { color: '#3b82f6', icon: Clock, label: 'Waiting' },
          'to process': { color: '#8b5cf6', icon: RefreshCw, label: 'To Process' },
          completed: { color: '#06b6d4', icon: CheckCircle, label: 'Completed' },
          dispute: { color: '#dc2626', icon: AlertTriangle, label: 'Dispute' },
          'under review': { color: '#7c3aed', icon: Scale, label: 'Under Review' }
        };
        return configs[s as keyof typeof configs] || configs.pending;
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
    accessorKey: "refund_amount",
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
    cell: ({ row }: { row: any}) => {
      const refundAmount = row.original.refund_amount;
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          ₱{refundAmount ? refundAmount.toLocaleString() : '0.00'}
        </div>
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
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: { row: any}) => {
      const refund = row.original;
      return (
        <div className="flex items-center gap-1">
          <Link to={`/admin/view-refund-details/${refund.refund}`} className="text-blue-600 text-xs">
            View details
          </Link>
        </div>
      );
    },
  }
];