// app/routes/rider/remit-amount.tsx
import type { Route } from "./+types/remit-amount"
import { UserProvider } from '~/components/providers/user-role-provider';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "~/components/ui/dialog";
import {
  ArrowLeft, CheckCircle, Send, Loader2, Calendar,
  Clock, CreditCard, Smartphone, AlertCircle,
  RefreshCw, XCircle
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [{ title: "Remit Amount | Rider" }];
}

// ================================
// Interfaces
// ================================
interface DeliveryItem {
  delivery_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  order_amount: number;
  delivery_fee: number;
  total_to_remit: number;
  payment_method: string;
  is_cod: boolean;
  amount_to_remit: number;
  rider_earnings: number;
  status: string;
  delivered_at?: string;
}

interface UnremittedSummary {
  total_unremitted_amount: number;
  total_delivery_fees: number;
  total_cod_order_amount: number;
  cod_orders_count: number;
  online_orders_count: number;
  total_orders: number;
  total_deliveries: number;
  currency: string;
}

interface LoaderData { user: any; }

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  let user = (context as any).user;
  if (!user) user = await fetchUserRole({ request, context });
  await requireRole(request, context, ["isRider"]);
  return { user };
}

// ================================
// Helpers
// ================================
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2
  }).format(amount || 0);

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  } catch { return dateString; }
};

// ================================
// Sub-components
// ================================

/** Success dialog */
const SuccessDialog = ({
  open, onOpenChange, reference, amount
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reference: string;
  amount: number;
}) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Remittance Successful
          </DialogTitle>
          <DialogDescription>
            Your remittance has been processed successfully.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Amount Remitted</p>
            <p className="text-2xl font-bold text-green-700 mb-3">{formatCurrency(amount)}</p>
            <p className="text-xs text-gray-500 mb-1">Reference Number</p>
            <p className="font-mono text-sm bg-white p-2 rounded border break-all">{reference}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => { onOpenChange(false); navigate('/rider/earnings'); }}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Failed / cancelled dialog */
const StatusDialog = ({
  open, onOpenChange, type, reference
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: 'failed' | 'cancelled';
  reference?: string;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {type === 'failed'
            ? <XCircle className="h-5 w-5 text-red-500" />
            : <AlertCircle className="h-5 w-5 text-yellow-500" />}
          {type === 'failed' ? 'Remittance Failed' : 'Remittance Cancelled'}
        </DialogTitle>
        <DialogDescription>
          {type === 'failed'
            ? 'Your payment could not be processed. Please try again.'
            : 'You cancelled the payment. Your remittance was not processed.'}
        </DialogDescription>
      </DialogHeader>
      {reference && (
        <div className="py-2">
          <p className="text-xs text-gray-500 mb-1">Reference</p>
          <p className="font-mono text-sm bg-gray-50 p-2 rounded border break-all">{reference}</p>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Try Again
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/** Single delivery row */
const DeliveryRow = ({ delivery }: { delivery: DeliveryItem }) => {
  const Icon = delivery.is_cod ? Smartphone : CreditCard;
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 mb-2">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-900">Order #{delivery.order_number}</p>
          <p className="text-xs text-gray-500">{delivery.customer_name}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Icon className="w-3 h-3" />
          <span>{delivery.payment_method}</span>
          {delivery.is_cod && (
            <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-medium">
              COD
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <p className="text-gray-400">Order Amount</p>
          <p className="font-medium">{formatCurrency(delivery.order_amount)}</p>
        </div>
        <div>
          <p className="text-gray-400">Delivery Fee</p>
          <p className="font-medium text-green-600">+{formatCurrency(delivery.delivery_fee)}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {delivery.is_cod ? 'You remit (order + fee)' : 'You remit (fee only)'}
        </span>
        <span className={`text-sm font-bold ${delivery.is_cod ? 'text-orange-600' : 'text-blue-600'}`}>
          {formatCurrency(delivery.total_to_remit)}
        </span>
      </div>
    </div>
  );
};

// ================================
// Main Component
// ================================
export default function RemitAmount({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const callbackStatus = searchParams.get('status');
  const callbackRef    = searchParams.get('reference');

  // ---- State ----
  const [isLoading,     setIsLoading]     = useState(true);
  const [summary,       setSummary]       = useState<UnremittedSummary | null>(null);
  const [deliveries,    setDeliveries]    = useState<DeliveryItem[]>([]);
  const [sandboxMode,   setSandboxMode]   = useState(false);
  const [processing,    setProcessing]    = useState(false);

  // Dialogs
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [showFailed,    setShowFailed]    = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [successRef,    setSuccessRef]    = useState('');
  const [successAmount, setSuccessAmount] = useState(0);

  // ---- Handle Maya callback on mount ----
  useEffect(() => {
    if (!callbackStatus) return;

    if (callbackStatus === 'success' && callbackRef) {
      // Look up the remittance total from history
      AxiosInstance.get('/rider-history/remittance-history/', {
        headers: { 'X-User-Id': user.user_id || user.id }
      }).then(res => {
        if (res.data?.success) {
          const match = res.data.remittance_history?.find(
            (r: any) => r.reference_number === callbackRef
          );
          setSuccessAmount(match?.total_amount ?? 0);
        }
      }).catch(() => {});

      setSuccessRef(callbackRef);
      setShowSuccess(true);

    } else if (callbackStatus === 'failed') {
      setShowFailed(true);
    } else if (callbackStatus === 'cancelled') {
      setShowCancelled(true);
    }
  }, [callbackStatus, callbackRef]);

  // ---- Fetch unremitted deliveries ----
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await AxiosInstance.get('/rider-history/unremitted_amounts/', {
        headers: { 'X-User-Id': user.user_id || user.id }
      });
      if (res.data?.success) {
        setSummary(res.data.summary);
        setDeliveries(res.data.unremitted_deliveries || []);
        setSandboxMode(res.data.sandbox_mode || false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load remittance data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Remit via Maya (both sandbox and production use same flow) ----
const handleRemit = async () => {
  if (!deliveries.length) return;

  const deliveryIds = deliveries.map(d => d.delivery_id).filter(Boolean);
  if (!deliveryIds.length) {
    toast({ title: "Error", description: "No valid deliveries found", variant: "destructive" });
    return;
  }

  try {
    setProcessing(true);

    const res = await AxiosInstance.post(
      '/rider-history/initiate_remittance/',
      { user_id: user.user_id || user.id, delivery_ids: deliveryIds },
      { headers: { 'X-User-Id': user.user_id || user.id } }
    );

    if (res.data?.success && res.data.redirect_url) {
      window.location.href = res.data.redirect_url;
    } else {
      toast({
        title: "Error",
        description: res.data?.error || "Failed to initiate remittance",
        variant: "destructive"
      });
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.response?.data?.error || "Failed to initiate remittance",
      variant: "destructive"
    });
  } finally {
    setProcessing(false);
  }
};

  const hasRemittable = (summary?.total_unremitted_amount ?? 0) > 0;

  // ================================
  // Render
  // ================================
  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 relative">
          <div className="absolute left-4 top-4">
            <Button
              variant="ghost" size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-w-md mx-auto px-4 py-4">
            <h1 className="text-center text-lg font-semibold text-white">Remit Amount</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">

          {/* Loading skeleton */}
          {isLoading ? (
            <Card className="border-0 shadow-lg rounded-xl">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-10 w-48 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-11 w-full mt-4" />
              </CardContent>
            </Card>

          ) : hasRemittable ? (
            <>
              {/* Main card */}
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">

                  {/* Date */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span>{formatDate(new Date().toISOString())}</span>
                  </div>

                  {/* Amount */}
                  <div className="text-center mb-5">
                    <p className="text-sm text-gray-500 mb-1">Total Amount to Remit</p>
                    <p className="text-4xl font-bold text-orange-600">
                      {formatCurrency(summary?.total_unremitted_amount ?? 0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {summary?.total_deliveries} delivery{summary?.total_deliveries !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-orange-50/50 rounded-lg p-3 mb-5 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">COD Orders ({summary?.cod_orders_count ?? 0})</span>
                      <span className="font-medium">{formatCurrency(summary?.total_cod_order_amount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Online Orders ({summary?.online_orders_count ?? 0})</span>
                      <span className="font-medium">
                        {formatCurrency(
                          (summary?.total_unremitted_amount ?? 0) - (summary?.total_cod_order_amount ?? 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-orange-200 mt-1">
                      <span className="text-gray-500">Delivery Fees</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(summary?.total_delivery_fees ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Count info */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-5">
                    <Clock className="w-3 h-3 text-orange-400" />
                    <span>
                      {summary?.cod_orders_count} COD · {summary?.online_orders_count} online
                    </span>
                  </div>

                  {/* Single remit button — sandbox routes internally, no label difference */}
                  <Button
                    onClick={handleRemit}
                    disabled={processing}
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md"
                  >
                    {processing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Remit Now</>
                    )}
                  </Button>

                </CardContent>
              </Card>

              {/* Delivery list */}
              {deliveries.length > 0 && (
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Pending Remittance</h3>
                      <Button
                        variant="ghost" size="sm"
                        onClick={fetchData}
                        className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {deliveries.map(d => (
                        <DeliveryRow key={d.delivery_id} delivery={d} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>

          ) : (
            /* Empty state */
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-gray-700 font-semibold mb-1">All Caught Up!</p>
                <p className="text-sm text-gray-400 mb-6">
                  You have no pending remittances.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/rider/earnings')}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  View Earnings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        <SuccessDialog
          open={showSuccess}
          onOpenChange={v => { setShowSuccess(v); if (!v) fetchData(); }}
          reference={successRef}
          amount={successAmount || (summary?.total_unremitted_amount ?? 0)}
        />
        <StatusDialog
          open={showFailed}
          onOpenChange={setShowFailed}
          type="failed"
          reference={callbackRef ?? undefined}
        />
        <StatusDialog
          open={showCancelled}
          onOpenChange={setShowCancelled}
          type="cancelled"
          reference={callbackRef ?? undefined}
        />

      </div>
    </UserProvider>
  );
}