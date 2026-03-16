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
  Calendar,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Send
} from 'lucide-react';

import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Earnings | Rider",
        }
    ]
}

// ================================
// Interfaces
// ================================
interface EarningsMetrics {
  total_deliveries: number;
  delivered_count: number;
  cancelled_count: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
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
  payment_method: string;
  payment_status: string;
  created_at: string;
  delivered_at: string | null;
  is_late: boolean;
  time_elapsed: string | null;
  pickup_location?: string;
  delivery_location?: string;
}

interface LoaderData {
    user: any;
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

    return { user };
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
    case 'delivered':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Delivered</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'picked_up':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Picked Up</Badge>;
    case 'in_progress':
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">In Progress</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>;
  }
};

// ================================
// Main Component
// ================================
export default function Earnings({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<EarningsMetrics | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<Delivery[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate totals
  const todayTotalCollected = todayDeliveries
    .filter(d => d.status === 'delivered')
    .reduce((sum, d) => sum + d.order_amount, 0);
  
  const todayDeliveryFees = todayDeliveries
    .filter(d => d.status === 'delivered')
    .reduce((sum, d) => sum + d.delivery_fee, 0);
  
  const todayToRemit = todayTotalCollected - todayDeliveryFees;

  // Fetch today's data
  const fetchTodayData = async () => {
    try {
      setIsLoading(true);
      
      // Get today's date range
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Fetch order history for today
      const response = await AxiosInstance.get(
        `/rider-history/order_history/?start_date=${startDate}&end_date=${endDate}`,
        { headers: { "X-User-Id": user.user_id || user.id } }
      );

      if (response.data?.success) {
        setMetrics(response.data.metrics);
        setTodayDeliveries(response.data.deliveries || []);
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

  // Export today's summary
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const response = await AxiosInstance.get(
        `/rider-history/export_history/?format=csv&start_date=${startDate}&end_date=${endDate}`,
        { 
          headers: { "X-User-Id": user.user_id || user.id },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `earnings-${today.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Success",
        description: "Earnings report downloaded",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export earnings data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Navigate to remit amount page
  const handleRemitNow = () => {
    navigate('/rider/remit-amount');
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const SkeletonCard = () => (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="h-4 w-24 mb-3" />
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
                <DollarSign className="w-6 h-6" />
                Today's Earnings
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchTodayData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                disabled={isExporting || todayDeliveries.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button 
                size="sm"
                onClick={handleRemitNow}
                disabled={todayToRemit <= 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Remit Now
              </Button>
            </div>
          </div>

          {/* Main Earnings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {/* Total Collected Card */}
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
                        variant="ghost" 
                        size="sm" 
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
                      From {todayDeliveries.filter(d => d.status === 'delivered').length} deliveries
                    </p>
                  </CardContent>
                </Card>

                {/* Your Earnings Card (Delivery Fees) */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-green-700">Your Earnings</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-800">
                      {showBalance ? formatCurrency(todayDeliveryFees) : '₱••••••'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Delivery fees earned today
                    </p>
                  </CardContent>
                </Card>

                {/* To Remit Card */}
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-orange-700">To Remit</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-800">
                      {showBalance ? formatCurrency(todayToRemit) : '₱••••••'}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Total collected minus your earnings
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Stats */}
          {metrics && !isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Deliveries Today</p>
                <p className="text-lg font-semibold">{metrics.today_deliveries || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-lg font-semibold text-green-600">{metrics.delivered_count || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Avg Rating</p>
                <p className="text-lg font-semibold">{metrics.avg_rating?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">On Time</p>
                <p className="text-lg font-semibold">{metrics.on_time_percentage || 0}%</p>
              </div>
            </div>
          )}

          {/* Today's Deliveries List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Today's Deliveries
              </CardTitle>
              <CardDescription>
                {todayDeliveries.length} delivery{todayDeliveries.length !== 1 ? 's' : ''} today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : todayDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No deliveries today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          delivery.status === 'delivered' ? 'bg-green-50' : 
                          delivery.status === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50'
                        }`}>
                          {delivery.status === 'delivered' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : delivery.status === 'cancelled' ? (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              Order #{delivery.order_number}
                            </span>
                            {getStatusBadge(delivery.status)}
                            {delivery.is_late && delivery.status !== 'delivered' && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                Late
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-1">
                            {delivery.customer_name}
                          </p>
                          
                          <div className="text-xs text-gray-400">
                            {delivery.delivery_location?.substring(0, 50)}...
                          </div>

                          {delivery.time_elapsed && delivery.status !== 'delivered' && (
                            <p className="text-xs text-gray-400 mt-1">
                              {delivery.time_elapsed} elapsed
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatCurrency(delivery.order_amount)}
                        </p>
                        <p className="text-xs text-green-600">
                          +{formatCurrency(delivery.delivery_fee)}
                        </p>
                        {delivery.delivered_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(delivery.delivered_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          {todayDeliveries.length > 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Collected:</span>
                    <span className="float-right font-medium text-blue-600">
                      {formatCurrency(todayTotalCollected)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Your Earnings:</span>
                    <span className="float-right font-medium text-green-600">
                      {formatCurrency(todayDeliveryFees)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">To Remit:</span>
                    <span className="float-right font-medium text-orange-600">
                      {formatCurrency(todayToRemit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}