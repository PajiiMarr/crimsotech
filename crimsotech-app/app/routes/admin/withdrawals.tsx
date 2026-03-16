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
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import { Link, useNavigate, Form, useLoaderData, useNavigation, useActionData } from 'react-router';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
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

interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
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
  const userId = session.get("userId");
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

    try {
      const statsParams = new URLSearchParams();
      if (startDate) statsParams.append('start_date', startDate);
      if (endDate) statsParams.append('end_date', endDate);
      
      const statsQueryString = statsParams.toString() ? `?${statsParams.toString()}` : '';
      
      const statsResponse = await AxiosInstance.get(`/admin-withdrawals/stats/${statsQueryString}`, {
        headers: { "X-User-Id": userId }
      });

      if (statsResponse.data?.success && statsResponse.data.stats) {
        metrics = {
          total_pending: Number(statsResponse.data.stats.total_pending) || 0,
          total_processing: Number(statsResponse.data.stats.total_processing) || 0,
          total_approved: Number(statsResponse.data.stats.total_approved) || 0,
          total_completed: Number(statsResponse.data.stats.total_completed) || 0,
          total_rejected: Number(statsResponse.data.stats.total_rejected) || 0,
          total_amount_pending: Number(statsResponse.data.stats.total_amount_pending) || 0,
          total_amount_processing: Number(statsResponse.data.stats.total_amount_processing) || 0,
          total_amount_approved: Number(statsResponse.data.stats.total_amount_approved) || 0,
          total_amount_completed: Number(statsResponse.data.stats.total_amount_completed) || 0,
          total_amount_rejected: Number(statsResponse.data.stats.total_amount_rejected) || 0,
        };
      }
    } catch (statsError) {
      console.error('Error fetching withdrawal stats:', statsError);
    }

  } catch (error) {
    console.error('Error fetching withdrawal data:', error);
  }

  return { 
    user, 
    withdrawalMetrics: metrics,
    withdrawals: withdrawalsList,
    total_count: totalCount
  };
}

export async function action({ request, context }: Route.ActionArgs): Promise<ActionData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  const formData = await request.formData();
  const intent = formData.get("intent");
  const withdrawalId = formData.get("withdrawalId");

  try {
    if (intent === "approve") {
      const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/approve/`, {}, {
        headers: { "X-User-Id": userId }
      });
      
      if (response.data?.success) {
        return { success: true, message: "Withdrawal approved successfully" };
      } else {
        return { error: response.data?.error || "Failed to approve withdrawal" };
      }
    }

    if (intent === "reject") {
      const reason = formData.get("reason");
      
      if (!reason) {
        return { error: "Rejection reason is required" };
      }
      
      const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/reject/`, 
        { reason },
        { headers: { "X-User-Id": userId } }
      );
      
      if (response.data?.success) {
        return { success: true, message: "Withdrawal rejected successfully" };
      } else {
        return { error: response.data?.error || "Failed to reject withdrawal" };
      }
    }

    if (intent === "process") {
      const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/process/`, {}, {
        headers: { "X-User-Id": userId }
      });
      
      if (response.data?.success) {
        return { success: true, message: "Withdrawal marked as processing" };
      } else {
        return { error: response.data?.error || "Failed to process withdrawal" };
      }
    }

    if (intent === "complete") {
      const proofFile = formData.get("admin_proof") as File;
      
      if (!proofFile) {
        return { error: "Proof of payment is required" };
      }
      
      const uploadFormData = new FormData();
      uploadFormData.append('admin_proof', proofFile);
      
      const response = await AxiosInstance.post(`/admin-withdrawals/${withdrawalId}/complete/`, uploadFormData, {
        headers: { 
          "X-User-Id": userId,
          "Content-Type": "multipart/form-data"
        }
      });
      
      if (response.data?.success) {
        return { success: true, message: "Withdrawal completed successfully" };
      } else {
        return { error: response.data?.error || "Failed to complete withdrawal" };
      }
    }

    return { error: "Invalid action" };
  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    return { error: error.response?.data?.error || "An unexpected error occurred" };
  }
}

const COLORS = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (s: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: '#f59e0b', icon: Clock, label: 'Pending' },
      approved: { color: '#3b82f6', icon: CheckCircle, label: 'Approved' },
      processing: { color: '#8b5cf6', icon: RefreshCw, label: 'Processing' },
      completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
      rejected: { color: '#ef4444', icon: XCircle, label: 'Rejected' },
      cancelled: { color: '#6b7280', icon: XCircle, label: 'Cancelled' }
    };
    return statusMap[s.toLowerCase()] || statusMap.pending;
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="secondary"
      className="text-xs capitalize flex items-center gap-1 w-fit"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
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

interface ActionDialogProps {
  withdrawal: Withdrawal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: string;
}

const ApproveDialog = ({ withdrawal, open, onOpenChange, intent }: ActionDialogProps) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Withdrawal</DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this withdrawal request?
          </DialogDescription>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="withdrawalId" value={withdrawal.id} />
          
          <div className="py-4">
            <div className="space-y-2">
              <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
              <p><strong>User:</strong> {withdrawal.user?.username || 'Unknown'} ({withdrawal.user?.email || 'N/A'})</p>
              <p><strong>Amount:</strong> ₱{parseFloat(withdrawal.amount).toLocaleString() || 0}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const RejectDialog = ({ withdrawal, open, onOpenChange, intent }: ActionDialogProps) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Withdrawal</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this withdrawal request.
          </DialogDescription>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="withdrawalId" value={withdrawal.id} />
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
              <p><strong>Amount:</strong> ₱{parseFloat(withdrawal.amount).toLocaleString() || 0}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Enter reason for rejection..."
                rows={3}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} type="button">
              Cancel
            </Button>
            <Button variant="destructive" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const ProcessDialog = ({ withdrawal, open, onOpenChange, intent }: ActionDialogProps) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Withdrawal</DialogTitle>
          <DialogDescription>
            Mark this withdrawal request as processing.
          </DialogDescription>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="withdrawalId" value={withdrawal.id} />
          
          <div className="py-4">
            <p>Are you sure you want to mark this withdrawal as processing?</p>
            <div className="mt-4 space-y-2">
              <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
              <p><strong>Amount:</strong> ₱{parseFloat(withdrawal.amount).toLocaleString() || 0}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Mark as Processing"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const CompleteDialog = ({ withdrawal, open, onOpenChange, intent }: ActionDialogProps) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Withdrawal</DialogTitle>
          <DialogDescription>
            Upload proof of payment to complete this withdrawal.
          </DialogDescription>
        </DialogHeader>
        <Form method="post" encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="withdrawalId" value={withdrawal.id} />
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p><strong>Withdrawal ID:</strong> {withdrawal.withdrawal_id}</p>
              <p><strong>Amount:</strong> ₱{parseFloat(withdrawal.amount).toLocaleString() || 0}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin_proof">Proof of Payment</Label>
              <Input
                id="admin_proof"
                name="admin_proof"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                onChange={handleFileChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Allowed: JPEG, PNG, GIF, PDF (Max 5MB)
              </p>
            </div>

            {preview && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <img src={preview} alt="Preview" className="max-h-40 rounded-md border" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Completing..." : "Complete Withdrawal"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default function Withdrawals() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const { user, withdrawalMetrics, withdrawals, total_count } = loaderData;
  
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'process' | 'complete' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (loaderData) {
      setIsLoading(false);
    }
  }, [loaderData]);

  useEffect(() => {
    if (actionData?.success) {
      toast({
        title: "Success",
        description: actionData.message || "Operation completed successfully",
      });
      setDialogOpen(false);
      navigate('.', { replace: true });
    } else if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
    }
  }, [actionData, toast, navigate]);

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

  const handleAction = (withdrawal: Withdrawal, action: string) => {
    setSelectedWithdrawal(withdrawal);
    setDialogType(action as any);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedWithdrawal(null);
    setDialogType(null);
  };

  const withdrawalFilterConfig = {
    status: {
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

  const isSubmitting = navigation.state === "submitting";

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
              disabled={isSubmitting}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
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
                    columns={columns(handleAction)} 
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

        {selectedWithdrawal && dialogType === 'approve' && (
          <ApproveDialog
            withdrawal={selectedWithdrawal}
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            intent="approve"
          />
        )}

        {selectedWithdrawal && dialogType === 'reject' && (
          <RejectDialog
            withdrawal={selectedWithdrawal}
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            intent="reject"
          />
        )}

        {selectedWithdrawal && dialogType === 'process' && (
          <ProcessDialog
            withdrawal={selectedWithdrawal}
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            intent="process"
          />
        )}

        {selectedWithdrawal && dialogType === 'complete' && (
          <CompleteDialog
            withdrawal={selectedWithdrawal}
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            intent="complete"
          />
        )}
      </SidebarLayout>
    </UserProvider>
  );
}

const columns = (handleAction: (withdrawal: Withdrawal, action: string) => void): ColumnDef<Withdrawal>[] => [
  {
    accessorKey: "withdrawal_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Withdrawal ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
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
      const user = row.original.user;
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <User className="w-3 h-3 text-muted-foreground" />
          <div>
            <div>{user?.username || 'Unknown'}</div>
            <div className="text-xs text-muted-foreground">{user?.email || 'N/A'}</div>
          </div>
        </div>
      );
    },
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
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const withdrawal = row.original;
      const status = withdrawal.status?.toLowerCase() || '';

      return (
        <div className="flex items-center gap-1">
          <Link to={`/admin/admin-view-withdrawal-details/${withdrawal.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          {status === 'pending' && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-green-600"
                onClick={() => handleAction(withdrawal, 'approve')}
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-600"
                onClick={() => handleAction(withdrawal, 'reject')}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}

          {status === 'approved' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-purple-600"
              onClick={() => handleAction(withdrawal, 'process')}
              title="Mark as Processing"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {status === 'processing' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-green-600"
              onClick={() => handleAction(withdrawal, 'complete')}
              title="Complete with Proof"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}

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
        </div>
      );
    },
  },
];