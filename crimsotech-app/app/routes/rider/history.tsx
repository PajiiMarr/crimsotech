import type { Route } from "./+types/history"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardContent
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { Input } from '~/components/ui/input';
import { Link } from 'react-router';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MapPin,
  User,
  Calendar,
  Truck,
  Phone,
  Navigation,
  CreditCard,
  Star,
  History,
  BarChart3,
  Award,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';

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
  proofs_count?: number; // number of proof records attached
  
  // refund/dispute metadata (added for rider notifications)
  refund_status?: string;
  refund_reason?: string;
  refund_reject_code?: string;
  refund_reject_details?: string;
  dispute_reason?: string;
  dispute_status?: string;
  
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

// Status badges configuration (matching active orders)
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  pending_offer: { 
    label: 'Pending Offer', 
    color: 'bg-amber-100 text-amber-800',
    icon: Clock
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-indigo-100 text-indigo-800',
    icon: CheckCircle
  },
  picked_up: { 
    label: 'In Transit', 
    color: 'bg-blue-100 text-blue-800',
    icon: Truck
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-indigo-100 text-indigo-800',
    icon: Truck
  },
  delivered: { 
    label: 'Delivered', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle
  },
  default: { 
    label: 'Unknown', 
    color: 'bg-gray-100 text-gray-800',
    icon: AlertCircle
  }
};

// Tabs configuration (matching active orders style)
const STATUS_TABS = [
  { id: 'active', label: 'Active', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'cancelled', label: 'Cancelled', icon: AlertCircle },
];

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
    const [isDesktop, setIsDesktop] = useState(false);
    
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

    // State for loading and date range
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());
    const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
      rangeType: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });

    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

    // Check if desktop on mount and resize
    useEffect(() => {
      const checkIfDesktop = () => {
        setIsDesktop(window.innerWidth >= 768);
      };
      
      checkIfDesktop();
      window.addEventListener('resize', checkIfDesktop);
      
      return () => window.removeEventListener('resize', checkIfDesktop);
    }, []);

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

    // Get status badge (matching active orders)
    const getStatusBadge = (status: string) => {
      const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
      const Icon = config.icon;
      
      return (
        <Badge 
          className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
        >
          <Icon className="w-2.5 h-2.5" />
          {config.label}
        </Badge>
      );
    };

    // Format date (matching active orders)
    const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return '';
      }
    };

    // Format currency (matching active orders)
    const formatCurrency = (amount: number) => {
      return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    // Format time
    const formatTime = (minutes?: number) => {
      if (!minutes) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const toggleDeliveryExpansion = (deliveryId: string) => {
      const newExpanded = new Set(expandedDeliveries);
      if (newExpanded.has(deliveryId)) {
        newExpanded.delete(deliveryId);
      } else {
        newExpanded.add(deliveryId);
      }
      setExpandedDeliveries(newExpanded);
    };

    // Filter table data by selected tab
    const filteredTableData = useMemo(() => {
      const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
      const completedStatuses = ['delivered'];
      const cancelledStatuses = ['cancelled'];

      let filtered = historyData;
      
      switch (activeTab) {
        case 'active':
          filtered = historyData.filter(d => activeStatuses.includes(d.status));
          break;
        case 'completed':
          filtered = historyData.filter(d => completedStatuses.includes(d.status));
          break;
        case 'cancelled':
          filtered = historyData.filter(d => cancelledStatuses.includes(d.status));
          break;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(d => 
          d.order_number?.toLowerCase().includes(searchLower) ||
          d.customer_name?.toLowerCase().includes(searchLower) ||
          d.recipient_name?.toLowerCase().includes(searchLower) ||
          d.delivery_location?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    }, [historyData, activeTab, searchTerm]);

    // Get tab count
    const getTabCount = (tabId: string) => {
      const activeStatuses = ['pending', 'accepted', 'picked_up', 'in_progress'];
      const completedStatuses = ['delivered'];
      const cancelledStatuses = ['cancelled'];

      switch (tabId) {
        case 'active':
          return historyData.filter(d => activeStatuses.includes(d.status)).length;
        case 'completed':
          return historyData.filter(d => completedStatuses.includes(d.status)).length;
        case 'cancelled':
          return historyData.filter(d => cancelledStatuses.includes(d.status)).length;
        default:
          return 0;
      }
    };

    // Handle date range change
    const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
      setDateRange({
        start: range.start,
        end: range.end,
        rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
      });
    };

    // Loading skeleton for metrics (matching active orders)
    const MetricCardSkeleton = () => (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-2 w-20 mt-2" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );

    // Initial data fetch
    useEffect(() => {
      fetchHistoryData();
    }, [dateRange]);

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-3 p-3">
                    {/* Header */}
                    <div className="mb-2">
                        <h1 className="text-lg font-bold">Order History</h1>
                        <p className="text-gray-500 text-xs">Track your past deliveries and performance</p>
                    </div>

                    <DateRangeFilter 
                      onDateRangeChange={handleDateRangeChange}
                      isLoading={isLoading}
                    />

                    {/* Key Metrics - MINIMALIST (matching active orders) */}
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
                                  <div className="flex gap-1 text-[10px] text-muted-foreground mt-1">
                                    <span className="flex items-center gap-0.5">
                                      <CheckCircle className="w-2 h-2 text-green-500" /> {metrics.delivered_count}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <AlertCircle className="w-2 h-2 text-red-500" /> {metrics.cancelled_count}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-1.5 bg-blue-100 rounded-full">
                                  <History className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
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
                                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                                  <p className="text-lg font-bold mt-1">{metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}` : '0'}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{metrics.on_time_percentage}% on-time</p>
                                </div>
                                <div className="p-1.5 bg-yellow-100 rounded-full">
                                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Delivery Time</p>
                                  <p className="text-lg font-bold mt-1">{formatTime(metrics.avg_delivery_time)}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{metrics.today_deliveries} today</p>
                                </div>
                                <div className="p-1.5 bg-purple-100 rounded-full">
                                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>

                    {/* Delivery History Cards */}
                    <Card>
                        <CardContent className="p-3">
                            <div className="space-y-3">
                                {/* Search Bar */}
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                  <Input
                                    placeholder="Search deliveries by ID, customer, or address..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 text-sm h-8"
                                  />
                                </div>

                                {/* Tabs (matching active orders style) */}
                                <div className="flex items-center space-x-1 overflow-x-auto">
                                  {STATUS_TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const count = getTabCount(tab.id);
                                    const isActive = activeTab === tab.id;
                                    
                                    return (
                                      <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as 'active' | 'completed' | 'cancelled')}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                                          isActive 
                                            ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        <Icon className="w-3 h-3" />
                                        <span>{tab.label}</span>
                                        {count > 0 && (
                                          <span className={`text-[10px] px-1 py-0.5 rounded ${
                                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            {count}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Deliveries List - CARD-BASED (matching active orders) */}
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                  {isLoading ? (
                                    // Loading skeletons
                                    Array.from({ length: 3 }).map((_, i) => (
                                      <Card key={i} className="overflow-hidden border">
                                        <CardContent className="p-3">
                                          <div className="space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                            <Skeleton className="h-3 w-2/3" />
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  ) : filteredTableData.length === 0 ? (
                                    <div className="text-center py-4">
                                      <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                                      <p className="text-gray-500 text-xs">
                                        No deliveries found
                                      </p>
                                    </div>
                                  ) : (
                                    filteredTableData.map((delivery) => {
                                      const isExpanded = expandedDeliveries.has(delivery.id);
                                      
                                      return (
                                        <Card key={delivery.id} className="overflow-hidden border">
                                          <CardContent className="p-3">
                                            {/* Top Section - Header */}
                                            <div className="flex items-start justify-between mb-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                                  <span className="text-xs font-medium truncate">
                                                    Order #{delivery.order_number?.slice(-8) || delivery.id.slice(-8)}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                  <span className="truncate">{delivery.customer_name || delivery.recipient_name}</span>
                                                  <span>•</span>
                                                  <span>{formatDate(delivery.order_created_at)}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                {getStatusBadge(delivery.status)}
                                                {delivery.is_late && (
                                                  <Badge variant="destructive" className="text-[8px] h-4 px-1">
                                                    Late
                                                  </Badge>
                                                )}
                                                <button 
                                                  onClick={() => toggleDeliveryExpansion(delivery.id)}
                                                  className="p-1 hover:bg-gray-100 rounded"
                                                >
                                                  {isExpanded ? (
                                                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                                  ) : (
                                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>

                                            {/* Middle Section - Summary */}
                                            <div className="mb-2">
                                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                                <MapPin className="w-2.5 h-2.5" />
                                                <span className="truncate">{delivery.delivery_location || 'No address'}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                                                <Phone className="w-2.5 h-2.5" />
                                                <span>{delivery.recipient_phone || delivery.customer_contact || 'No contact'}</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                  <CreditCard className="w-2.5 h-2.5" />
                                                  {delivery.payment_method || 'N/A'}
                                                </div>
                                                <div className="font-medium text-xs">
                                                  {formatCurrency(delivery.order_amount)}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Time Elapsed */}
                                            <div className="flex items-center gap-1 mb-2">
                                              <Clock className="w-2.5 h-2.5 text-gray-400" />
                                              <span className="text-[10px] text-gray-500">
                                                {delivery.time_elapsed || `${formatTime(delivery.actual_minutes)}`}
                                              </span>
                                            </div>

                                            {/* Expanded Section - Details */}
                                            {isExpanded && (
                                              <div className="mt-3 pt-3 border-t space-y-2">
                                                {/* Dispute Information (if any) */}
                                                {((delivery.refund_status === 'dispute') || delivery.refund_reject_code === 'good_condition_handed') && (
                                                  <div className="text-[10px] p-2 bg-red-50 rounded border border-red-200">
                                                    <div className="font-medium text-red-700 mb-1 flex items-center gap-1">
                                                      <AlertCircle className="w-3 h-3" /> Dispute Notice
                                                    </div>
                                                    <div className="text-red-600 space-y-0.5">
                                                      {delivery.refund_reason && (
                                                        <div>Reason: {delivery.refund_reason}</div>
                                                      )}
                                                      {delivery.refund_reject_code && (
                                                        <div>Rejected: {delivery.refund_reject_code}{delivery.refund_reject_details ? ` – ${delivery.refund_reject_details}` : ''}</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                <div className="text-[10px]">
                                                  <div className="font-medium text-gray-700 mb-1">Recipient Information</div>
                                                  <div className="text-gray-600 space-y-0.5">
                                                    <div>Name: {delivery.recipient_name}</div>
                                                    <div>Phone: {delivery.recipient_phone || 'N/A'}</div>
                                                  </div>
                                                </div>
                                                
                                                <div className="text-[10px]">
                                                  <div className="font-medium text-gray-700 mb-1">Delivery Details</div>
                                                  <div className="text-gray-600 space-y-0.5">
                                                    {delivery.pickup_location && (
                                                      <div>Pickup: {delivery.pickup_location}</div>
                                                    )}
                                                    {delivery.distance_km && (
                                                      <div>Distance: {delivery.distance_km} km</div>
                                                    )}
                                                    {delivery.delivery_rating && (
                                                      <div>Rating: {delivery.delivery_rating} ★</div>
                                                    )}
                                                    {delivery.picked_at && (
                                                      <div>Picked Up: {formatDate(delivery.picked_at)}</div>
                                                    )}
                                                    {delivery.delivered_at && (
                                                      <div>Delivered: {formatDate(delivery.delivered_at)}</div>
                                                    )}
                                                  </div>
                                                </div>

                                                {delivery.items_summary && (
                                                  <div className="text-[10px]">
                                                    <div className="font-medium text-gray-700 mb-1">Items</div>
                                                    <div className="text-gray-600">
                                                      {delivery.items_summary || `${delivery.items_count || 0} items`}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* Bottom Section - Actions */}
                                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleDeliveryExpansion(delivery.id)}
                                                className="h-6 px-2 text-[10px]"
                                              >
                                                {isExpanded ? 'Show Less' : 'View Details'}
                                              </Button>
                                              
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 px-2 text-[10px]"
                                                  asChild
                                                >
                                                  <Link to={`/rider/deliveries/${delivery.id}`}>
                                                    <Eye className="w-2.5 h-2.5 mr-1" />
                                                    View
                                                  </Link>
                                                </Button>
                                                
                                                {/* Only show Add Proof/Proofs button for delivered orders */}
                                                {delivery.status === 'delivered' && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 px-2 text-[10px]"
                                                    asChild
                                                  >
                                                    <Link to={`/rider/delivery/${delivery.id}/add-proof`}>
                                                      <Package className="w-2.5 h-2.5 mr-1" />
                                                      {(delivery.proofs_count || 0) > 0 ? 'Proofs' : 'Add Proof'}
                                                    </Link>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })
                                  )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}