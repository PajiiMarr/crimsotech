import type { Route } from "./+types/history"
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

import { Link } from 'react-router';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  MapPin,
  User,
  Calendar,
  Truck,
  ArrowUpDown,
  Phone,
  Navigation,
  CreditCard,
  Star,
  History,
  BarChart3,
  Award,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "History | Rider",
        }
    ]
}

// Interface definitions matching Django models
interface OrderHistoryData {
  id: string;  // Delivery.id
  order_id: string;  // Order.order
  order_number: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  
  // Shipping address info
  pickup_location: string;
  delivery_location: string;
  recipient_name: string;
  recipient_phone: string;
  
  // Delivery details
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'cancelled';
  distance_km?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  delivery_rating?: number;
  notes?: string;
  
  // Order financials
  order_amount: number;
  delivery_fee?: number;
  payment_method: string;
  payment_status: 'success' | 'failed';
  
  // Shop information
  shop_name?: string;
  shop_contact?: string;
  
  // Timestamps
  order_created_at: string;
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
  
  // Additional metadata
  items_count?: number;
  items_summary?: string;
  is_late?: boolean;
  time_elapsed?: string;
}

interface HistoryMetrics {
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
  growth_metrics?: {
    deliveries_growth?: number;
    earnings_growth?: number;
    rating_growth?: number;
  };
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
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

export default function OrderHistory({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;
    
    // State for data
    const [historyData, setHistoryData] = useState<OrderHistoryData[]>([]);
    const [metrics, setMetrics] = useState<HistoryMetrics>({
      total_deliveries: 0,
      delivered_count: 0,
      cancelled_count: 0,
      total_earnings: 0,
      avg_delivery_time: 0,
      avg_rating: 0,
      on_time_percentage: 0,
      today_deliveries: 0,
      week_earnings: 0,
      has_data: false
    });

    // Tabs: make UI match Rider Active Orders (Active / Completed / Cancelled)
    const STATUS_TABS = [
      { id: 'active', label: 'Active', icon: Truck },
      { id: 'completed', label: 'Completed', icon: CheckCircle },
      { id: 'cancelled', label: 'Cancelled', icon: AlertCircle },
    ];

    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

    
    // State for loading and date range
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
      rangeType: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });

    // Fetch data function
    const fetchHistoryData = async () => {
      try {
        setIsLoading(true);
        
        const params = new URLSearchParams({
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0],
        });

        // Fetch history data
        const response = await AxiosInstance.get(`/rider-history/order_history/?${params}`, {
          headers: {
            'X-User-Id': user.user_id || user.id
          }
        });

        if (response.data) {
          setHistoryData(response.data.deliveries || []);
          setMetrics(response.data.metrics || {
            total_deliveries: 0,
            delivered_count: 0,
            cancelled_count: 0,
            total_earnings: 0,
            avg_delivery_time: 0,
            avg_rating: 0,
            on_time_percentage: 0,
            today_deliveries: 0,
            week_earnings: 0,
            has_data: false
          });
        }

      } catch (error) {
        console.error('Error fetching order history:', error);
        setHistoryData([]);
        setMetrics({
          total_deliveries: 0,
          delivered_count: 0,
          cancelled_count: 0,
          total_earnings: 0,
          avg_delivery_time: 0,
          avg_rating: 0,
          on_time_percentage: 0,
          today_deliveries: 0,
          week_earnings: 0,
          has_data: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial data fetch
    useEffect(() => {
      fetchHistoryData();
    }, []);



    // Prepare transformed data for the table
    const tableData = useMemo(() => {
      return historyData.map(delivery => ({
        id: delivery.id,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        customer_name: delivery.customer_name,
        customer_phone: delivery.customer_contact,
        pickup_location: delivery.pickup_location,
        delivery_location: delivery.delivery_location,
        recipient_name: delivery.recipient_name,
        recipient_phone: delivery.recipient_phone,
        amount: delivery.order_amount,
        delivery_fee: delivery.delivery_fee,
        payment_method: delivery.payment_method,
        payment_status: delivery.payment_status,
        status: delivery.status,
        distance_km: delivery.distance_km,
        estimated_minutes: delivery.estimated_minutes,
        actual_minutes: delivery.actual_minutes,
        delivery_rating: delivery.delivery_rating,
        order_created_at: delivery.order_created_at,
        picked_at: delivery.picked_at,
        delivered_at: delivery.delivered_at,
        created_at: delivery.created_at,
        items_count: delivery.items_count,
        items_summary: delivery.items_summary,
        is_late: delivery.is_late,
        time_elapsed: delivery.time_elapsed,
        shop_name: delivery.shop_name,
        // Keep original for actions
        original: delivery
      }));
    }, [historyData]);

    // Filter table data by selected tab (Active / Completed / Cancelled)
    const filteredTableData = useMemo(() => {
      const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
      const completedStatuses = ['delivered'];
      const cancelledStatuses = ['cancelled'];

      switch (activeTab) {
        case 'active':
          return tableData.filter(d => activeStatuses.includes(d.status));
        case 'completed':
          return tableData.filter(d => completedStatuses.includes(d.status));
        case 'cancelled':
          return tableData.filter(d => cancelledStatuses.includes(d.status));
        default:
          return tableData;
      }
    }, [tableData, activeTab]);

    const counts = {
      active: tableData.filter(d => ['pending', 'accepted', 'picked_up', 'in_progress'].includes(d.status)).length,
      completed: tableData.filter(d => d.status === 'delivered').length,
      cancelled: tableData.filter(d => d.status === 'cancelled').length,
    };

    // Small helper to render compact status badges (used by cards)
    const STATUS_BADGE_MAP: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      picked_up: { label: 'Picked Up', color: 'bg-blue-100 text-blue-800', icon: Package },
      in_progress: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      default: { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };

    const renderStatusBadge = (status?: string) => {
      const key = String(status || '').toLowerCase();
      const cfg = STATUS_BADGE_MAP[key] || STATUS_BADGE_MAP.default;
      const Icon = cfg.icon;
      return (
        <Badge className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${cfg.color}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </Badge>
      );
    };

    // Loading skeleton for metrics
    const MetricCardSkeleton = () => (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mt-1" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // Format time
    const formatTime = (minutes?: number) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };




    // Refresh data when date range changes
    useEffect(() => {
      fetchHistoryData();
    }, [dateRange]);

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Order History</h1>
                            <p className="text-muted-foreground mt-1">Track your past deliveries and performance</p>
                        </div>
                    </div>



                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {isLoading ? (
                        <>
                          <MetricCardSkeleton />
                          <MetricCardSkeleton />
                          <MetricCardSkeleton />
                          <MetricCardSkeleton />
                        </>
                      ) : (
                        <>
                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Total Deliveries</p>
                                  <p className="text-lg font-bold mt-1">{metrics.total_deliveries}</p>
                                  <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {metrics.delivered_count} delivered</span>
                                    <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {metrics.cancelled_count} cancelled</span>
                                  </div>
                                </div>
                                <div className="p-1.5 bg-blue-100 rounded-full">
                                  <History className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                                  <p className="text-lg font-bold mt-1">{formatCurrency(metrics.total_earnings)}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(metrics.week_earnings)} this week</p>
                                </div>
                                <div className="p-1.5 bg-green-100 rounded-full">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                                  <p className="text-lg font-bold mt-1">{metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}★` : 'No ratings'}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{metrics.on_time_percentage}% on-time</p>
                                </div>
                                <div className="p-1.5 bg-yellow-100 rounded-full">
                                  <Star className="w-4 h-4 text-yellow-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Performance</p>
                                  <p className="text-lg font-bold mt-1">{formatTime(metrics.avg_delivery_time)}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{metrics.today_deliveries} today</p>
                                </div>
                                <div className="p-1.5 bg-purple-100 rounded-full">
                                  <BarChart3 className="w-4 h-4 text-purple-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>

                    {/* Delivery History Table */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <CardTitle className="text-xl">Delivery History</CardTitle>
                            <CardDescription>
                              {isLoading ? 'Loading history...' : `Showing ${historyData.length} deliveries`}
                            </CardDescription>
                          </div>

                          {/* Tabs (Active / Completed / Cancelled) */}
                          <div className="flex items-center gap-2">
                            {STATUS_TABS.map(tab => {
                              const Icon = tab.icon;
                              const isActive = activeTab === tab.id;
                              const count = counts[tab.id as keyof typeof counts] || 0;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveTab(tab.id as 'active' | 'completed' | 'cancelled')}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs whitespace-nowrap ${isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span>{tab.label}</span>
                                  {count > 0 && (
                                    <span className={`text-[10px] px-1 py-0.5 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md">
                          {/* Compact list view (minimalist) */}
                          {isLoading ? (
                            <div className="space-y-3">
                              {[1,2,3,4].map(i => (
                                <Card key={i} className="p-3">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <Skeleton className="h-4 w-40 mb-2" />
                                      <Skeleton className="h-3 w-32" />
                                    </div>
                                    <Skeleton className="h-6 w-20" />
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : filteredTableData.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">No deliveries found for the selected range.</div>
                          ) : (
                            <div className="space-y-3">
                              {filteredTableData.map(d => (
                                <Card key={d.id} className="p-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-semibold truncate">{d.order_number}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(d.order_created_at).toLocaleDateString()}</div>
                                      </div>
                                      <div className="text-sm text-muted-foreground truncate mt-1">{d.recipient_name} • {d.delivery_location}</div>
                                      <div className="text-xs text-muted-foreground mt-2 truncate">{d.items_summary || `${d.items_count || 0} items`} • {d.payment_method || 'N/A'}</div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                      <div>{renderStatusBadge(d.status)}</div>
                                      <div className="text-sm font-bold">{formatCurrency(d.amount || 0)}</div>
                                      <div className="text-xs text-muted-foreground">{d.time_elapsed || ''}{d.distance_km ? ` • ${d.distance_km} km` : ''}</div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Button size="sm" variant="ghost" className="text-xs" asChild>
                                          <Link to={`/rider/deliveries/${d.id}`}>
                                            <Eye className="w-3 h-3 mr-1" />View
                                          </Link>
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs" asChild>
                                          <Link to={`/rider/orders/${d.order_id}`}>
                                            <Navigation className="w-3 h-3 mr-1" />Details
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}