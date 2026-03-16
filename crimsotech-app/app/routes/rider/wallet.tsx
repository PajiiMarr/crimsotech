// app/routes/rider/wallet.tsx
import type { Route } from "./+types/earnings"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useEffect, useState } from 'react';
import { useNavigate, Form, useLoaderData, useActionData, useNavigation } from 'react-router';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';
import { 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  MinusCircle,
  Wallet as WalletIcon,
  Hourglass
} from 'lucide-react';

import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Wallet | Rider",
        }
    ]
}

// ================================
// Interfaces
// ================================
interface WalletData {
  wallet_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
  formatted_available: string;
  formatted_pending: string;
  formatted_total: string;
  created_at: string;
}

interface WalletTransaction {
  transaction_id: string;
  amount: number;
  formatted_amount: string;
  transaction_type: 'credit' | 'debit';
  source_type: string;
  status: string;
  created_at: string;
  formatted_created_at: string;
  order: string | null;
  order_number: string | null;
}

interface PaginationInfo {
  total: number;
  offset: number;
  limit: number;
  next_offset: number | null;
  prev_offset: number | null;
}

interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at: string;
}

interface LoaderData {
    user: any;
    wallet: WalletData | null;
    transactions: WalletTransaction[];
    pagination: PaginationInfo | null;
    paymentMethods: PaymentMethod[];
}

// Action data interface
interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
  type?: 'withdrawal';
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isRider"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");

    let wallet: WalletData | null = null;
    let transactions: WalletTransaction[] = [];
    let pagination: PaginationInfo | null = null;
    let paymentMethods: PaymentMethod[] = [];

    try {
        // Get query parameters
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit') || '20';
        const offset = url.searchParams.get('offset') || '0';
        const type = url.searchParams.get('type');
        const source = url.searchParams.get('source');

        // Build query params
        const params = new URLSearchParams();
        params.append('limit', limit);
        params.append('offset', offset);
        if (type && type !== 'all') params.append('type', type);
        if (source && source !== 'all') params.append('source', source);

        // Fetch wallet data
        const response = await AxiosInstance.get(`/rider-wallet/?${params.toString()}`, {
            headers: { "X-User-Id": userId }
        });

        if (response.data?.success) {
            wallet = response.data.wallet;
            transactions = response.data.transactions;
            pagination = response.data.pagination;
        }

        // Fetch payment methods (still needed for withdrawals)
        const profileResponse = await AxiosInstance.get(`/profile/`, {
            headers: { "X-User-Id": userId }
        });

        if (profileResponse.data?.success && profileResponse.data.profile?.payment_methods) {
            paymentMethods = profileResponse.data.profile.payment_methods;
        }

    } catch (error) {
        console.error('Error fetching wallet data:', error);
    }

    return { user, wallet, transactions, pagination, paymentMethods };
}

export async function action({ request, context }: Route.ActionArgs): Promise<ActionData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "withdraw") {
      const amount = formData.get("amount");
      const paymentMethodId = formData.get("payment_method_id");

      if (!amount) {
        return { error: "Amount is required", type: 'withdrawal' };
      }

      if (!paymentMethodId) {
        return { error: "Payment method is required", type: 'withdrawal' };
      }

      const response = await AxiosInstance.post('/withdrawal-requests/', {
        amount: parseFloat(amount as string),
        payment_method_id: paymentMethodId
      }, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.success) {
        return { success: true, message: "Withdrawal request submitted successfully", type: 'withdrawal' };
      } else {
        return { error: response.data?.error || "Failed to submit withdrawal request", type: 'withdrawal' };
      }
    }

    return { error: "Invalid action" };
  } catch (error: any) {
    console.error('Error in action:', error);
    return { error: error.response?.data?.error || "An unexpected error occurred" };
  }
}

// ================================
// Helper Functions
// ================================
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { 
    style: 'currency', 
    currency: 'PHP', 
    minimumFractionDigits: 2 
  }).format(amount || 0);
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

const getStatusBadge = (status: string) => {
  switch(status) {
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{status}</Badge>;
  }
};

// ================================
// Withdrawal Dialog
// ================================
const WithdrawalDialog = ({ 
  open, 
  onOpenChange,
  availableBalance,
  paymentMethods
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  paymentMethods: PaymentMethod[];
}) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    if (!open) {
      setAmount('');
      setSelectedMethod('');
    }
  }, [open]);

  const selectedPaymentMethod = paymentMethods.find(m => m.payment_id === selectedMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Withdraw funds to your selected payment method
          </DialogDescription>
        </DialogHeader>

        <Form method="post" className="space-y-5 py-4">
          <input type="hidden" name="intent" value="withdraw" />
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Available Balance</p>
            <p className="text-2xl font-semibold">{formatCurrency(availableBalance)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₱</span>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                min="0.01"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
            {parseFloat(amount) > availableBalance && (
              <p className="text-xs text-red-500 mt-1">
                Amount exceeds available balance
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method_id" className="text-sm font-medium">Payment Method</Label>
            <Select 
              name="payment_method_id" 
              value={selectedMethod} 
              onValueChange={setSelectedMethod}
              required
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.payment_id} value={method.payment_id}>
                    <div className="flex items-center gap-2">
                      <span>{method.payment_method === 'bank' ? method.bank_name : method.payment_method}</span>
                      <span className="text-xs text-gray-400">({method.account_name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPaymentMethod && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Account Details:</p>
              <p>{selectedPaymentMethod.account_name}</p>
              <p className="font-mono text-xs">{selectedPaymentMethod.account_number}</p>
            </div>
          )}

          {paymentMethods.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              No payment methods found. Please add one in your profile.
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || paymentMethods.length === 0 || parseFloat(amount) > availableBalance || !amount || parseFloat(amount) <= 0}
            >
              {isSubmitting ? "Processing..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ================================
// Main Component
// ================================
export default function Wallet() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, wallet, transactions, pagination, paymentMethods } = loaderData;

  // State
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Calculate deductions (total earned - (available + pending))
  const totalEarned = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalWithdrawn = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const deductions = totalEarned - (wallet?.total_balance || 0) - totalWithdrawn;

  useEffect(() => {
    if (actionData?.success) {
      toast({
        title: "Success",
        description: actionData.message || "Operation completed successfully",
      });
      navigate('.', { replace: true });
    } else if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
    }
  }, [actionData, toast, navigate]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.append('offset', '0');
    if (filterType !== 'all') params.append('type', filterType);
    if (filterSource !== 'all') params.append('source', filterSource);
    navigate(`?${params.toString()}`, { replace: true });
  }, [filterType, filterSource, navigate]);

  const handleNextPage = () => {
    if (pagination?.next_offset !== null) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', pagination!.next_offset!.toString());
      navigate(`?${params.toString()}`, { replace: true });
    }
  };

  const handlePrevPage = () => {
    if (pagination?.prev_offset !== null) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', pagination!.prev_offset!.toString());
      navigate(`?${params.toString()}`, { replace: true });
    }
  };

  const handleRefresh = () => {
    navigate('.', { replace: true });
  };

  const isSubmitting = navigation.state === "submitting";
  const isLoading = !wallet;

  const SkeletonCard = () => (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <WalletIcon className="w-6 h-6" />
                Wallet
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track your earnings and withdrawals
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isSubmitting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowWithdrawalDialog(true)}
                disabled={!wallet || wallet.available_balance <= 0}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>

          {/* Four Stats Cards - Only these four */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : wallet ? (
              <>
                {/* Available */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">Available</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => setShowBalance(!showBalance)}
                      >
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-2xl font-semibold">
                      {showBalance ? wallet.formatted_available : '₱••••••'}
                    </p>
                  </CardContent>
                </Card>

                {/* Pending */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Hourglass className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Pending</span>
                    </div>
                    <p className="text-2xl font-semibold">
                      {showBalance ? wallet.formatted_pending : '₱••••••'}
                    </p>
                  </CardContent>
                </Card>

                {/* Total */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Total</span>
                    </div>
                    <p className="text-2xl font-semibold">
                      {showBalance ? wallet.formatted_total : '₱••••••'}
                    </p>
                  </CardContent>
                </Card>

                {/* Deductions */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MinusCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Deductions</span>
                    </div>
                    <p className="text-2xl font-semibold text-red-500">
                      {showBalance ? formatCurrency(deductions) : '₱••••••'}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="col-span-4">
                <CardContent className="p-8 text-center text-gray-500">
                  Failed to load wallet data
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transaction History - Below the cards */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    {pagination?.total || 0} total transactions
                  </CardDescription>
                </div>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <Filter className="w-3 h-3 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="credit">Credits</SelectItem>
                      <SelectItem value="debit">Debits</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger className="w-[120px] h-8 text-sm">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="delivery_fee">Delivery</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.transaction_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          tx.transaction_type === 'credit' 
                            ? tx.status === 'pending' ? 'bg-yellow-50' : 'bg-green-50'
                            : 'bg-red-50'
                        }`}>
                          {tx.transaction_type === 'credit' ? (
                            tx.status === 'pending' ? (
                              <Hourglass className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-green-600" />
                            )
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {tx.source_type === 'delivery_fee' ? 'Delivery Fee' : 'Withdrawal'}
                            </span>
                            {getStatusBadge(tx.status)}
                          </div>
                          
                          <div className="text-xs text-gray-400">
                            {tx.formatted_created_at}
                            {tx.order_number && ` • Order #${tx.order_number.slice(0,8)}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-medium ${
                          tx.transaction_type === 'credit' 
                            ? tx.status === 'pending' ? 'text-yellow-600' : 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}{tx.formatted_amount}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {pagination && pagination.total > (pagination.limit || 20) && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-xs text-gray-400">
                        Showing {pagination.offset + 1} to {Math.min(pagination.offset + (pagination.limit || 20), pagination.total)} of {pagination.total}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={pagination.prev_offset === null}
                          className="h-8 text-xs"
                        >
                          <ChevronLeft className="w-3 h-3 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={pagination.next_offset === null}
                          className="h-8 text-xs"
                        >
                          Next
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Dialog */}
        <WithdrawalDialog
          open={showWithdrawalDialog}
          onOpenChange={setShowWithdrawalDialog}
          availableBalance={wallet?.available_balance || 0}
          paymentMethods={paymentMethods}
        />
      </SidebarLayout>
    </UserProvider>
  );
}