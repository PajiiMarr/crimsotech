// app/routes/rider/earnings.tsx
import type { Route } from "./+types/earnings"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Badge } from '~/components/ui/badge';
import { useToast } from '~/hooks/use-toast';
import { 
  DollarSign,
  Clock,
  RefreshCw,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Truck,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Send,
  ShieldCheck
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [{ title: "Earnings | Rider" }];
}

// ================================
// Interfaces
// ================================
interface EarningsMetrics {
  total_deliveries: number;
  delivered_count: number;
  cancelled_count: number;
  total_earnings: number;
  total_to_remit: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  today_deliveries: number;
  week_earnings: number;
  week_to_remit: number;
  has_data: boolean;
  sandbox_mode: boolean;
  date_range?: {
    start_date: string | null;
    end_date: string | null;
  };
}

interface Delivery {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  status: string;
  order_amount: number;
  delivery_fee: number;
  amount_to_remit: number;
  rider_earnings: number;
  payment_method: string;
  payment_status: string;
  is_cod: boolean;
  is_remitted: boolean;
  created_at: string;
  delivered_at: string | null;
  is_late: boolean;
  time_elapsed: string | null;
  pickup_location?: string;
  delivery_location?: string;
  sandbox_mode: boolean;
}

interface UnremittedSummary {
  total_unremitted_amount: number;
  total_delivery_fees: number;
  total_cod_order_amount: number;
  cod_orders_count: number;
  online_orders_count: number;
  total_deliveries: number;
}

interface LoaderData {
  user: any;
}

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

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string }> = {
    delivered:   { label: 'Delivered',   className: 'bg-green-100 text-green-700 border-green-200' },
    pending:     { label: 'Pending',     className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    picked_up:   { label: 'Picked Up',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    cancelled:   { label: 'Cancelled',   className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return <Badge className={s.className}>{s.label}</Badge>;
};

// ================================
// Sub-components
// ================================
const SkeletonCard = () => (
  <Card>
    <CardContent className="p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

const DeliveryRow = ({
  delivery,
  showBalance,
}: {
  delivery: Delivery;
  showBalance: boolean;
}) => {
  const isDelivered = delivery.status === 'delivered';
  const isCancelled = delivery.status === 'cancelled';

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
      delivery.is_remitted ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'
    }`}>
      {/* Left: icon + info */}
      <div className="flex items-start gap-3 min-w-0">
        <div className={`p-2 rounded-full shrink-0 ${
          isDelivered  ? 'bg-green-50' :
          isCancelled  ? 'bg-red-50'   : 'bg-yellow-50'
        }`}>
          {isDelivered  ? <CheckCircle className="w-4 h-4 text-green-600" /> :
           isCancelled  ? <AlertCircle  className="w-4 h-4 text-red-600"   /> :
                          <Clock        className="w-4 h-4 text-yellow-600" />}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-sm">Order #{delivery.order_number}</span>
            {getStatusBadge(delivery.status)}
            {delivery.is_late && !isDelivered && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Late</Badge>
            )}
            {/* Remittance badge */}
            {isDelivered && (
              delivery.is_remitted ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Remitted
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                  Pending Remittance
                </Badge>
              )
            )}
          </div>

          <p className="text-xs text-gray-600 mb-1">{delivery.customer_name}</p>

          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            <span>{delivery.payment_method}</span>
            {delivery.is_cod && <span className="text-orange-500 font-medium">COD</span>}
            {delivery.delivery_location && (
              <span className="truncate max-w-[200px]">
                {delivery.delivery_location.substring(0, 45)}{delivery.delivery_location.length > 45 ? '…' : ''}
              </span>
            )}
          </div>

          {delivery.time_elapsed && !isDelivered && (
            <p className="text-xs text-gray-400 mt-1">{delivery.time_elapsed} elapsed</p>
          )}
        </div>
      </div>

      {/* Right: amounts */}
      <div className="text-right shrink-0 ml-4">
        {/* Order amount */}
        <p className="font-medium text-sm text-gray-800">
          {showBalance ? formatCurrency(delivery.order_amount) : '₱••••'}
        </p>

        {/* Delivery fee (rider earnings) */}
        <p className="text-xs text-green-600">
          +{showBalance ? formatCurrency(delivery.delivery_fee) : '₱••'}
        </p>

        {/* Amount to remit — only show if delivered and NOT yet remitted */}
        {isDelivered && !delivery.is_remitted && (
          <p className="text-xs text-orange-600 font-medium mt-0.5">
            Remit: {showBalance ? formatCurrency(delivery.amount_to_remit) : '₱••••'}
          </p>
        )}

        {/* Timestamp */}
        {delivery.delivered_at && (
          <p className="text-xs text-gray-400 mt-1">
            {new Date(delivery.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};

// ================================
// Main Component
// ================================
export default function Earnings({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<EarningsMetrics | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<Delivery[]>([]);
  const [unremittedSummary, setUnremittedSummary] = useState<UnremittedSummary | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  // ---- Derived values ----
  const deliveredToday = todayDeliveries.filter(d => d.status === 'delivered');

  // Earnings = sum of delivery fees for all delivered today
  const todayDeliveryFees = deliveredToday.reduce((sum, d) => sum + d.delivery_fee, 0);

  // Total collected = sum of order amounts for delivered today
  const todayTotalCollected = deliveredToday.reduce((sum, d) => sum + d.order_amount, 0);

  // Still pending remittance (from unremittedSummary, which excludes already-remitted)
  const pendingRemitAmount = unremittedSummary?.total_unremitted_amount ?? 0;

  // Remitted today = deliveries that ARE remitted
  const remittedCount = deliveredToday.filter(d => d.is_remitted).length;
  const pendingRemitCount = deliveredToday.filter(d => !d.is_remitted && d.status === 'delivered').length;

  // ---- Data fetching ----
  const fetchTodayData = async () => {
    try {
      setIsLoading(true);

      const [historyRes, unremittedRes] = await Promise.all([
        AxiosInstance.get('/rider-history/order_history/', {
          headers: { 'X-User-Id': user.user_id || user.id }
        }),
        AxiosInstance.get('/rider-history/unremitted_amounts/', {
          headers: { 'X-User-Id': user.user_id || user.id }
        }),
      ]);

      if (historyRes.data?.success) {
        setMetrics(historyRes.data.metrics);
        setTodayDeliveries(historyRes.data.deliveries || []);
        setIsSandbox(historyRes.data.metrics?.sandbox_mode || false);
      }

      if (unremittedRes.data?.success) {
        setUnremittedSummary(unremittedRes.data.summary);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const response = await AxiosInstance.get(
        `/rider-history/export_history/?format=csv&start_date=${dateStr}&end_date=${dateStr}`,
        { headers: { 'X-User-Id': user.user_id || user.id }, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `earnings-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Success", description: "Earnings report downloaded" });
    } catch {
      toast({ title: "Error", description: "Failed to export earnings data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => { fetchTodayData(); }, []);

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-4 md:p-6">

          {/* ---- Header ---- */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Today's Earnings
                {isSandbox && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full border border-yellow-200">
                    <ShieldCheck className="w-3 h-3" /> Sandbox
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchTodayData} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={handleExport}
                disabled={isExporting || todayDeliveries.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting…' : 'Export'}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/rider/remit-amount')}
                disabled={pendingRemitAmount <= 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Remit Now
              </Button>
            </div>
          </div>

          {/* ---- Main metric cards ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                {/* Total Collected */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-blue-700">Total Collected</span>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 hover:bg-blue-200"
                        onClick={() => setShowBalance(!showBalance)}
                      >
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-3xl font-bold text-blue-800">
                      {showBalance ? formatCurrency(todayTotalCollected) : '₱••••••'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      From {deliveredToday.length} completed {deliveredToday.length === 1 ? 'delivery' : 'deliveries'}
                    </p>
                  </CardContent>
                </Card>

                {/* Your Earnings */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-green-700">Your Earnings</span>
                    </div>
                    <p className="text-3xl font-bold text-green-800">
                      {showBalance ? formatCurrency(todayDeliveryFees) : '₱••••••'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Delivery fees earned today</p>
                  </CardContent>
                </Card>

                {/* Pending Remittance */}
                <Card className={`bg-gradient-to-br border ${
                  pendingRemitAmount > 0
                    ? 'from-orange-50 to-orange-100 border-orange-200'
                    : 'from-emerald-50 to-emerald-100 border-emerald-200'
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-lg ${pendingRemitAmount > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                        {pendingRemitAmount > 0
                          ? <ArrowUpRight className="w-4 h-4 text-white" />
                          : <ShieldCheck   className="w-4 h-4 text-white" />
                        }
                      </div>
                      <span className={`text-sm font-medium ${pendingRemitAmount > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                        {pendingRemitAmount > 0 ? 'Pending Remittance' : 'All Remitted'}
                      </span>
                    </div>
                    <p className={`text-3xl font-bold ${pendingRemitAmount > 0 ? 'text-orange-800' : 'text-emerald-800'}`}>
                      {showBalance ? formatCurrency(pendingRemitAmount) : '₱••••••'}
                    </p>
                    <p className={`text-xs mt-1 ${pendingRemitAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {pendingRemitAmount > 0
                        ? `${pendingRemitCount} delivery${pendingRemitCount !== 1 ? 's' : ''} pending · ${remittedCount} remitted`
                        : 'All deliveries have been remitted'
                      }
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* ---- Quick stats ---- */}
          {metrics && !isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Total Deliveries</p>
                <p className="text-lg font-semibold">{metrics.delivered_count ?? 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Remitted</p>
                <p className="text-lg font-semibold text-emerald-600">{remittedCount}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Avg Rating</p>
                <p className="text-lg font-semibold">{metrics.avg_rating?.toFixed(1) ?? '0.0'} ⭐</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">On Time</p>
                <p className="text-lg font-semibold">{metrics.on_time_percentage ?? 0}%</p>
              </div>
            </div>
          )}

          {/* ---- Deliveries list ---- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Today's Deliveries
              </CardTitle>
              <CardDescription>
                {todayDeliveries.length} delivery{todayDeliveries.length !== 1 ? 's' : ''} ·{' '}
                {remittedCount} remitted · {pendingRemitCount} pending remittance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : todayDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No deliveries today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Pending remittance first, then remitted */}
                  {[
                    ...todayDeliveries.filter(d => d.status === 'delivered' && !d.is_remitted),
                    ...todayDeliveries.filter(d => d.status === 'delivered' && d.is_remitted),
                    ...todayDeliveries.filter(d => d.status !== 'delivered'),
                  ].map(delivery => (
                    <DeliveryRow key={delivery.id} delivery={delivery} showBalance={showBalance} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Summary footer ---- */}
          {todayDeliveries.length > 0 && !isLoading && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-500">Total Collected</span>
                    <span className="sm:float-right font-medium text-blue-600">
                      {showBalance ? formatCurrency(todayTotalCollected) : '₱••••'}
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-500">Your Earnings</span>
                    <span className="sm:float-right font-medium text-green-600">
                      {showBalance ? formatCurrency(todayDeliveryFees) : '₱••••'}
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-gray-500">Still to Remit</span>
                    <span className={`sm:float-right font-medium ${pendingRemitAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {showBalance ? formatCurrency(pendingRemitAmount) : '₱••••'}
                    </span>
                  </div>
                </div>

                {/* COD breakdown if relevant */}
                {unremittedSummary && unremittedSummary.cod_orders_count > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>COD Orders ({unremittedSummary.cod_orders_count})</span>
                      <span className="font-medium">{showBalance ? formatCurrency(unremittedSummary.total_cod_order_amount) : '₱••••'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Online Orders ({unremittedSummary.online_orders_count})</span>
                      <span className="font-medium">{showBalance ? formatCurrency(unremittedSummary.total_unremitted_amount - unremittedSummary.total_cod_order_amount) : '₱••••'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </SidebarLayout>
    </UserProvider>
  );
}