// app/routes/admin/withdrawals.tsx
import type { Route } from "./+types/withdrawals"
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
  Eye,
  Download,
  Upload,
  FileText,
  Wallet,
  MoreHorizontal,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import { Link, useNavigate, useLoaderData, useNavigation } from 'react-router';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/hooks/use-toast';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Withdrawals | Admin",
    },
  ];
}

// Interface to match your Django serializer
interface Withdrawal {
  id: string;
  withdrawal_id: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  wallet: {
    id: string;
    balance?: number;
  } | null;
  amount: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  payment_method?: string;
  account_details?: string;
  requested_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  approved_by?: {
    id: number;
    username: string;
  } | null;
  admin_proof?: string | null;
  notes?: string;
  rejection_reason?: string;
}

interface LoaderData {
  user: any;
  userId: string | null;
  withdrawalMetrics: {
    total_pending: number;
    total_processing: number;
    total_approved: number;
    total_completed: number;
    total_rejected: number;
    total_amount_pending: number;
    total_amount_processing: number;
    total_amount_approved: number;
    total_amount_completed: number;
    total_amount_rejected: number;
  };
  withdrawals: Withdrawal[];
  total_count: number;
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
  const userId = session.get("userId") || null;
  const url = new URL(request.url);
  
  const status = url.searchParams.get('status');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const limit = url.searchParams.get('limit');

  let withdrawalsList: Withdrawal[] = [];
  let metrics = {
    total_pending: 0,
    total_processing: 0,
    total_approved: 0,
    total_completed: 0,
    total_rejected: 0,
    total_amount_pending: 0,
    total_amount_processing: 0,
    total_amount_approved: 0,
    total_amount_completed: 0,
    total_amount_rejected: 0,
  };
  let totalCount = 0;

  try {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (limit) queryParams.append('limit', limit);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const withdrawalsResponse = await AxiosInstance.get(`/admin-withdrawals/${queryString}`, {
      headers: { "X-User-Id": userId }
    });

    if (withdrawalsResponse.data?.success) {
      withdrawalsList = withdrawalsResponse.data.data || [];
      totalCount = withdrawalsResponse.data.total_count || withdrawalsList.length || 0;
      
      if (withdrawalsResponse.data.stats) {
        metrics = {
          total_pending: Number(withdrawalsResponse.data.stats.total_pending) || 0,
          total_processing: Number(withdrawalsResponse.data.stats.total_processing) || 0,
          total_approved: Number(withdrawalsResponse.data.stats.total_approved) || 0,
          total_completed: Number(withdrawalsResponse.data.stats.total_completed) || 0,
          total_rejected: Number(withdrawalsResponse.data.stats.total_rejected) || 0,
          total_amount_pending: Number(withdrawalsResponse.data.stats.total_amount_pending) || 0,
          total_amount_processing: Number(withdrawalsResponse.data.stats.total_amount_processing) || 0,
          total_amount_approved: Number(withdrawalsResponse.data.stats.total_amount_approved) || 0,
          total_amount_completed: Number(withdrawalsResponse.data.stats.total_amount_completed) || 0,
          total_amount_rejected: Number(withdrawalsResponse.data.stats.total_amount_rejected) || 0,
        };
      }
    }
  } catch (error) {
    console.error('Error fetching withdrawal data:', error);
  }

  return { 
    user, 
    userId,
    withdrawalMetrics: metrics,
    withdrawals: withdrawalsList,
    total_count: totalCount
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (s: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string; bgColor: string }> = {
      pending: { color: '#f59e0b', icon: Clock, label: 'Pending', bgColor: 'bg-yellow-50' },
      approved: { color: '#3b82f6', icon: CheckCircle, label: 'Approved', bgColor: 'bg-blue-50' },
      processing: { color: '#8b5cf6', icon: RefreshCw, label: 'Processing', bgColor: 'bg-purple-50' },
      completed: { color: '#10b981', icon: CheckCircle, label: 'Completed', bgColor: 'bg-green-50' },
      rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected', bgColor: 'bg-red-50' },
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

// Action Dialog Component
function ActionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  actionType,
  withdrawalId,
  withdrawalAmount,
  withdrawalCode
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: (reason?: string, proofFile?: File) => Promise<void>;
  title: string;
  description: string;
  actionType: string;
  withdrawalId: string;
  withdrawalAmount: number;
  withdrawalCode: string;
}) {
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (actionType === 'reject') {
        await onConfirm(reason);
      } else if (actionType === 'complete') {
        await onConfirm(undefined, proofFile || undefined);
      } else {
        await onConfirm();
      }
      onOpenChange(false);
      setReason('');
      setProofFile(null);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleCancel = () => {
    setReason('');
    setProofFile(null);
    setPreview(null);
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
            <p className="text-sm font-medium">Withdrawal: {withdrawalCode}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Amount: ₱{withdrawalAmount.toLocaleString()}
              </Badge>
            </div>
          </div>

          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejecting this withdrawal..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shared with the user.
              </p>
            </div>
          )}

          {actionType === 'complete' && (
            <div className="space-y-2">
              <Label htmlFor="proof" className="text-sm font-medium">
                Proof of Payment <span className="text-red-500">*</span>
              </Label>
              <Input
                id="proof"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                onChange={handleFileChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Allowed: JPEG, PNG, GIF, PDF (Max 5MB)
              </p>
              {preview && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Preview:</p>
                  <img src={preview} alt="Preview" className="max-h-32 rounded-md border" />
                </div>
              )}
            </div>
          )}

          {actionType === 'reject' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Warning: This action cannot be undone
              </p>
              <p className="text-xs text-destructive mt-1">
                The user will be notified of the rejection.
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
            disabled={
              isLoading || 
              (actionType === 'reject' && !reason.trim()) ||
              (actionType === 'complete' && !proofFile)
            }
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

const COLORS = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];

export default function Withdrawals() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const { user, userId, withdrawalMetrics, withdrawals, total_count } = loaderData;
  
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    withdrawalId: string;
    withdrawalCode: string;
    withdrawalAmount: number;
    actionType: string;
  }>({
    open: false,
    withdrawalId: '',
    withdrawalCode: '',
    withdrawalAmount: 0,
    actionType: ''
  });

  useEffect(() => {
    if (loaderData) {
      setIsLoading(false);
    }
  }, [loaderData]);

  const handleWithdrawalAction = async (withdrawalId: string, actionType: string, reason?: string, proofFile?: File) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      let response;
      
      if (actionType === 'approve') {
        response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/approve/`, {}, { headers });
      } else if (actionType === 'reject') {
        response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/reject/`, { reason }, { headers });
      } else if (actionType === 'process') {
        response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/process/`, {}, { headers });
      } else if (actionType === 'complete') {
        const formData = new FormData();
        if (proofFile) {
          formData.append('admin_proof', proofFile);
        }
        response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/complete/`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
      }

      if (response?.data?.success) {
        toast({
          title: "Success",
          description: `Withdrawal ${actionType}d successfully`,
        });
        navigate('.', { replace: true });
      } else {
        toast({
          title: "Error",
          description: response?.data?.error || `Failed to ${actionType} withdrawal`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || `Failed to ${actionType} withdrawal`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const safeWithdrawals = withdrawals || [];
  
  const safeMetrics = {
    total_pending: Number(withdrawalMetrics?.total_pending) || 0,
    total_processing: Number(withdrawalMetrics?.total_processing) || 0,
    total_approved: Number(withdrawalMetrics?.total_approved) || 0,
    total_completed: Number(withdrawalMetrics?.total_completed) || 0,
    total_rejected: Number(withdrawalMetrics?.total_rejected) || 0,
    total_amount_pending: Number(withdrawalMetrics?.total_amount_pending) || 0,
    total_amount_processing: Number(withdrawalMetrics?.total_amount_processing) || 0,
    total_amount_approved: Number(withdrawalMetrics?.total_amount_approved) || 0,
    total_amount_completed: Number(withdrawalMetrics?.total_amount_completed) || 0,
    total_amount_rejected: Number(withdrawalMetrics?.total_amount_rejected) || 0,
  };

  const withdrawalFilterConfig = {
    status: {
      accessorKey: "status",
      options: ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
      placeholder: 'Status'
    }
  };

  const statusDistribution = [
    { name: 'Pending', value: safeMetrics.total_pending, color: '#f59e0b' },
    { name: 'Processing', value: safeMetrics.total_processing, color: '#8b5cf6' },
    { name: 'Approved', value: safeMetrics.total_approved, color: '#3b82f6' },
    { name: 'Completed', value: safeMetrics.total_completed, color: '#10b981' },
    { name: 'Rejected', value: safeMetrics.total_rejected, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const amountData = [
    { name: 'Pending', amount: safeMetrics.total_amount_pending, color: '#f59e0b' },
    { name: 'Processing', amount: safeMetrics.total_amount_processing, color: '#8b5cf6' },
    { name: 'Approved', amount: safeMetrics.total_amount_approved, color: '#3b82f6' },
    { name: 'Completed', amount: safeMetrics.total_amount_completed, color: '#10b981' },
    { name: 'Rejected', amount: safeMetrics.total_amount_rejected, color: '#ef4444' },
  ].filter(item => item.amount > 0);

  const renderPieLabel = (entry: any) => {
    const { name, percent } = entry;
    const percentage = percent ? (percent * 100).toFixed(0) : '0';
    return `${name} ${percentage}%`;
  };

  // Build columns with actions dropdown
  const columns: ColumnDef<Withdrawal>[] = [
    {
      accessorKey: "withdrawal_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Withdrawal ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-xs sm:text-sm font-mono">
          {row.getValue("withdrawal_id")}
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
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
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount") as string) || 0;
        return (
          <div className="flex items-center gap-1 text-xs sm:text-sm font-medium">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            ₱{amount.toLocaleString()}
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
      accessorKey: "requested_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Requested
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }) => {
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const withdrawal = row.original;
        const status = withdrawal.status?.toLowerCase() || '';
        const amount = parseFloat(withdrawal.amount) || 0;

        const getAvailableActions = () => {
          const actions: { label: string; id: string; destructive: boolean }[] = [];
          
          if (status === 'pending') {
            actions.push({ label: 'Approve', id: 'approve', destructive: false });
            actions.push({ label: 'Reject', id: 'reject', destructive: true });
          } else if (status === 'approved') {
            actions.push({ label: 'Mark as Processing', id: 'process', destructive: false });
          } else if (status === 'processing') {
            actions.push({ label: 'Complete with Proof', id: 'complete', destructive: false });
          }
          
          return actions;
        };

        const actions = getAvailableActions();
        const safeActions = actions.filter((a) => !a.destructive);
        const dangerActions = actions.filter((a) => a.destructive);

        return (
          <div className="flex items-center gap-1">
            <Link to={`/admin/admin-view-withdrawal-details/${withdrawal.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>

            {status === 'completed' && withdrawal.admin_proof && (
              <a 
                href={withdrawal.admin_proof} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
            )}

            {actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(withdrawal.withdrawal_id)}
                  >
                    Copy Withdrawal ID
                  </DropdownMenuItem>

                  {safeActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {safeActions.map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          onClick={() => setActionDialog({
                            open: true,
                            withdrawalId: withdrawal.id,
                            withdrawalCode: withdrawal.withdrawal_id,
                            withdrawalAmount: amount,
                            actionType: a.id
                          })}
                          className="cursor-pointer"
                        >
                          {a.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {dangerActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {dangerActions.map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          onClick={() => setActionDialog({
                            open: true,
                            withdrawalId: withdrawal.id,
                            withdrawalCode: withdrawal.withdrawal_id,
                            withdrawalAmount: amount,
                            actionType: a.id
                          })}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          {a.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
              <Skeleton className="h-10 w-24" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <MetricCardSkeleton key={i} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
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
              <h1 className="text-2xl sm:text-3xl font-bold">Withdrawals</h1>
              <p className="text-muted-foreground mt-1">Manage and process withdrawal requests</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_pending}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{Number(safeMetrics.total_amount_pending).toLocaleString()}
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
                    <p className="text-sm text-muted-foreground">Processing</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_processing}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{Number(safeMetrics.total_amount_processing).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <RefreshCw className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_approved}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{Number(safeMetrics.total_amount_approved).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
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
                      ₱{Number(safeMetrics.total_amount_completed).toLocaleString()}
                    </p>
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
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_rejected}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₱{Number(safeMetrics.total_amount_rejected).toLocaleString()}
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
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Number of withdrawals by status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderPieLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amount by Status</CardTitle>
                <CardDescription>Total withdrawal amount by status</CardDescription>
              </CardHeader>
              <CardContent>
                {amountData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={amountData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Amount']}
                        />
                        <Bar dataKey="amount">
                          {amountData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Withdrawal Requests</CardTitle>
              <CardDescription>
                Total: {total_count} requests | Manage and process withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                {safeWithdrawals.length > 0 ? (
                  <DataTable 
                    columns={columns} 
                    data={safeWithdrawals}
                    filterConfig={withdrawalFilterConfig}
                    searchConfig={{
                      column: "withdrawal_id",
                      placeholder: "Search by withdrawal ID..."
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No withdrawal requests found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Dialog */}
        <ActionDialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
          onConfirm={(reason, proofFile) => handleWithdrawalAction(
            actionDialog.withdrawalId, 
            actionDialog.actionType, 
            reason, 
            proofFile
          )}
          title={`${actionDialog.actionType?.charAt(0).toUpperCase() + actionDialog.actionType?.slice(1)} Withdrawal`}
          description={`Are you sure you want to ${actionDialog.actionType} this withdrawal request?`}
          actionType={actionDialog.actionType}
          withdrawalId={actionDialog.withdrawalId}
          withdrawalAmount={actionDialog.withdrawalAmount}
          withdrawalCode={actionDialog.withdrawalCode}
        />
      </SidebarLayout>
    </UserProvider>
  );
}