// app/routes/admin/remittance.tsx
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';

import { 
  Card, 
  CardHeader, 
  CardTitle,  
  CardContent,
  CardDescription,
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
  CartesianGrid,
} from 'recharts';
import {
  RefreshCw,
  Clock,
  ArrowUpDown,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Truck,
  Download,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import { Link, useNavigate, useLoaderData, useNavigation } from 'react-router';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/hooks/use-toast';

export function meta() {
  return [
    {
      title: "Remittances | Admin",
    },
  ];
}

interface Remittance {
  id: string;
  reference_number: string;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
  total_amount: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  proof_url?: string;
  created_at: string;
  processed_at?: string | null;
  processed_by?: {
    id: number;
    username: string;
  } | null;
}

interface LoaderData {
  user: any;
  userId: string | null;
  remittanceMetrics: {
    total_pending: number;
    total_completed: number;
    total_failed: number;
    total_amount_pending: number;
    total_amount_completed: number;
    total_amount_failed: number;
  };
  remittances: Remittance[];
  total_count: number;
}

export async function loader({ request, context }: any): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") || null;
  const url = new URL(request.url);
  
  const status = url.searchParams.get('status');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const limit = url.searchParams.get('limit');

  let remittancesList: Remittance[] = [];
  let metrics = {
    total_pending: 0,
    total_completed: 0,
    total_failed: 0,
    total_amount_pending: 0,
    total_amount_completed: 0,
    total_amount_failed: 0,
  };
  let totalCount = 0;

  try {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (limit) queryParams.append('limit', limit);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const response = await AxiosInstance.get(`/admin-remittances/${queryString}`, {
      headers: { "X-User-Id": userId }
    });

    if (response.data?.success) {
      remittancesList = response.data.data || [];
      totalCount = response.data.total_count || remittancesList.length || 0;
      
      if (response.data.stats) {
        metrics = {
          total_pending: Number(response.data.stats.total_pending) || 0,
          total_completed: Number(response.data.stats.total_completed) || 0,
          total_failed: Number(response.data.stats.total_failed) || 0,
          total_amount_pending: Number(response.data.stats.total_amount_pending) || 0,
          total_amount_completed: Number(response.data.stats.total_amount_completed) || 0,
          total_amount_failed: Number(response.data.stats.total_amount_failed) || 0,
        };
      }
    }
  } catch (error) {
    console.error('Error fetching remittance data:', error);
  }

  return { 
    user, 
    userId,
    remittanceMetrics: metrics,
    remittances: remittancesList,
    total_count: totalCount
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (s: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string; bgColor: string }> = {
      pending: { color: '#f59e0b', icon: Clock, label: 'Pending', bgColor: 'bg-yellow-50' },
      completed: { color: '#10b981', icon: CheckCircle, label: 'Completed', bgColor: 'bg-green-50' },
      failed: { color: '#ef4444', icon: XCircle, label: 'Failed', bgColor: 'bg-red-50' },
      cancelled: { color: '#6b7280', icon: XCircle, label: 'Cancelled', bgColor: 'bg-gray-50' }
    };
    return statusMap[s.toLowerCase()] || statusMap.pending;
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="secondary"
      className={`flex items-center gap-1.5 text-xs ${config.bgColor}`}
      style={{ color: config.color }}
    >
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

const MetricCardSkeleton = () => (
  <Card>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

function ActionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  actionType,
  referenceNumber,
  amount,
  proofUrl
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: (reason?: string) => Promise<void>;
  title: string;
  description: string;
  actionType: string;
  referenceNumber: string;
  amount: number;
  proofUrl?: string;
}) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (actionType === 'reject') {
        await onConfirm(reason);
      } else {
        await onConfirm();
      }
      onOpenChange(false);
      setReason('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Ref No: {referenceNumber}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Amount: ₱{amount.toLocaleString()}
              </Badge>
            </div>
          </div>

          {proofUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Proof of Receipt</p>
              <img src={proofUrl} alt="Proof" className="max-h-64 rounded-md border w-full object-contain" />
            </div>
          )}

          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejecting this remittance..."
                rows={3}
                required
              />
            </div>
          )}

          {actionType === 'reject' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Warning: This action cannot be undone
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
            className="mt-0 sm:w-auto w-full order-2 sm:order-1"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (actionType === 'reject' && !reason.trim())}
            className={`sm:w-auto w-full order-1 sm:order-2 ${
              actionType === 'reject' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
            }`}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Remittances() {
  const loaderData = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const { user, userId, remittanceMetrics, remittances } = loaderData;
  
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    remittanceId: string;
    referenceNumber: string;
    amount: number;
    actionType: string;
    proofUrl?: string;
  }>({
    open: false,
    remittanceId: '',
    referenceNumber: '',
    amount: 0,
    actionType: ''
  });

  useEffect(() => {
    if (loaderData) {
      setIsLoading(false);
    }
  }, [loaderData]);

  const handleAction = async (id: string, actionType: string, reason?: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      let response;
      if (actionType === 'approve') {
        response = await AxiosInstance.post(`/admin-remittances/${id}/approve/`, {}, { headers });
      } else if (actionType === 'reject') {
        response = await AxiosInstance.post(`/admin-remittances/${id}/reject/`, { reason }, { headers });
      }

      if (response?.data?.success) {
        toast({
          title: "Success",
          description: `Remittance ${actionType}d successfully`,
        });
        navigate('.', { replace: true });
      } else {
        toast({
          title: "Error",
          description: response?.data?.error || `Failed to ${actionType} remittance`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || `Failed to ${actionType} remittance`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const safeMetrics = {
    total_pending: Number(remittanceMetrics?.total_pending) || 0,
    total_completed: Number(remittanceMetrics?.total_completed) || 0,
    total_failed: Number(remittanceMetrics?.total_failed) || 0,
    total_amount_pending: Number(remittanceMetrics?.total_amount_pending) || 0,
    total_amount_completed: Number(remittanceMetrics?.total_amount_completed) || 0,
    total_amount_failed: Number(remittanceMetrics?.total_amount_failed) || 0,
  };

  const statusDistribution = [
    { name: 'Pending', value: safeMetrics.total_pending, color: '#f59e0b' },
    { name: 'Completed', value: safeMetrics.total_completed, color: '#10b981' },
    { name: 'Failed', value: safeMetrics.total_failed, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const amountData = [
    { name: 'Pending', amount: safeMetrics.total_amount_pending, color: '#f59e0b' },
    { name: 'Completed', amount: safeMetrics.total_amount_completed, color: '#10b981' },
    { name: 'Failed', amount: safeMetrics.total_amount_failed, color: '#ef4444' },
  ].filter(item => item.amount > 0);

  const renderPieLabel = (entry: any) => {
    const { name, percent } = entry;
    const percentage = percent ? (percent * 100).toFixed(0) : '0';
    return `${name} ${percentage}%`;
  };

  const columns: ColumnDef<Remittance>[] = [
    {
      accessorKey: "reference_number",
      header: "Reference No",
      cell: ({ row }) => (
        <div className="font-medium text-xs sm:text-sm font-mono">
          {row.getValue("reference_number")}
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "Rider",
      cell: ({ row }) => {
        const userData = row.original.user;
        return (
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-gray-600" />
            </div>
            <div>
              <div className="font-medium">{userData?.username || 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{userData?.email || 'N/A'}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_amount") as string) || 0;
        return (
          <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            ₱{amount.toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.getValue("payment_method") as string | undefined;
        return (
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <Truck className="w-3 h-3 text-muted-foreground" />
            {method || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "created_at",
      header: "Requested",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return (
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const status = item.status?.toLowerCase() || '';
        const amount = parseFloat(item.total_amount) || 0;

        const actions = [];
        if (status === 'pending') {
          actions.push({ label: 'Approve', id: 'approve', destructive: false });
          actions.push({ label: 'Reject', id: 'reject', destructive: true });
        }

        return (
          <div className="flex items-center gap-1">
            {actions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/admin-view-remittance-details/${item.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {item.proof_url && (
                    <DropdownMenuItem
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = item.proof_url;
                        a.download = true;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Proof
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.reference_number)}>
                    Copy Reference No
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {actions.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => setActionDialog({
                        open: true,
                        remittanceId: item.id,
                        referenceNumber: item.reference_number,
                        amount: amount,
                        actionType: a.id,
                        proofUrl: item.proof_url
                      })}
                      className={a.destructive ? "text-destructive focus:text-destructive cursor-pointer" : "cursor-pointer"}
                    >
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               <div className="flex items-center gap-1">
                 <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/admin-view-remittance-details/${item.id}`)}>
                   <Eye className="w-4 h-4" />
                 </Button>
                 {item.proof_url && (
                   <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                     const a = document.createElement('a');
                     a.href = item.proof_url;
                     a.download = true;
                     a.target = '_blank';
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                   }}>
                     <Download className="w-4 h-4" />
                   </Button>
                 )}
               </div>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
            </div>
            <Card>
              <CardContent className="p-0">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Remittances</h1>
              <p className="text-muted-foreground mt-1">Manage rider cash remittances and proof of receipts.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('.', { replace: true })}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_pending}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{safeMetrics.total_amount_pending.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_completed}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{safeMetrics.total_amount_completed.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed/Rejected</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_failed}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{safeMetrics.total_amount_failed.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                    <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={renderPieLabel}
                        labelLine={true}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, 'Count']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">Amount by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {amountData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={amountData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis 
                        tickFormatter={(val) => `₱${val}`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Amount']}
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {amountData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Remittance Requests</CardTitle>
              <CardDescription>
                Total: {loaderData.total_count} requests | Review and process rider remittances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                {remittances.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={remittances}
                    searchKey="reference_number"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No remittance requests found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <ActionDialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
          onConfirm={(reason) => handleAction(actionDialog.remittanceId, actionDialog.actionType, reason)}
          title={actionDialog.actionType === 'approve' ? 'Approve Remittance' : 'Reject Remittance'}
          description={
            actionDialog.actionType === 'approve' 
              ? 'Are you sure you want to approve this remittance? This will mark it as completed.'
              : 'Are you sure you want to reject this remittance? Please provide a reason.'
          }
          actionType={actionDialog.actionType}
          referenceNumber={actionDialog.referenceNumber}
          amount={actionDialog.amount}
          proofUrl={actionDialog.proofUrl}
        />
      </SidebarLayout>
    </UserProvider>
  );
}
