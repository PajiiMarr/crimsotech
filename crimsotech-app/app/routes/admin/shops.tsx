// app/routes/admin/shops.tsx
import { toast } from 'sonner';
import type { Route } from './+types/shops'
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
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
import { 
  Store,
  Users,
  Star,
  MapPin,
  TrendingUp,
  Package,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
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
} from 'recharts';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shops | Admin",
    },
  ];
}

interface Shop {
  id: string;
  name: string;
  owner: string;
  owner_id?: string;
  location: string;
  followers: number;
  products: number;
  rating: number;
  totalRatings: number;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending' | 'Banned' | 'Deleted';
  joinedDate: string;
  totalSales: number;
  activeBoosts: number;
  verified: boolean;
  email?: string;
  phone?: string;
  description?: string;
  is_removed?: boolean;
  suspension_reason?: string;
  suspension_end_date?: string;
}

interface ShopMetrics {
  total_shops: number;
  total_followers: number;
  avg_rating: number;
  verified_shops: number;
  top_shop_name: string;
  active_shops: number;
  suspended_shops: number;
  pending_shops: number;
  growth_metrics?: {
    shop_growth?: number;
    previous_period_total?: number;
    period_days?: number;
  };
}

interface AnalyticsData {
  top_shops_by_rating: Array<{
    name: string;
    rating: number;
    followers: number;
  }>;
  top_shops_by_followers: Array<{
    name: string;
    followers: number;
    rating: number;
  }>;
  shops_by_location: Array<{
    name: string;
    value: number;
  }>;
}

interface LoaderData {
  user: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Helper function to normalize status
const normalizeShopStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    case 'pending':
    case 'pending_verification':
      return 'Pending';
    case 'banned':
      return 'Banned';
    case 'deleted':
    case 'removed':
      return 'Deleted';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to get status badge variant and styling
const getShopStatusConfig = (status: string) => {
  const normalizedStatus = normalizeShopStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: CheckCircle,
        iconClassName: 'text-green-600'
      };
    case 'Verified':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        icon: ShieldCheck,
        iconClassName: 'text-blue-600'
      };
    case 'Inactive':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Activity,
        iconClassName: 'text-gray-600'
      };
    case 'Suspended':
      return {
        variant: 'destructive' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        icon: AlertTriangle,
        iconClassName: 'text-amber-600'
      };
    case 'Pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        icon: Activity,
        iconClassName: 'text-yellow-600'
      };
    case 'Banned':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        icon: Ban,
        iconClassName: 'text-red-600'
      };
    case 'Deleted':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: XCircle,
        iconClassName: 'text-rose-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Activity,
        iconClassName: 'text-gray-600'
      };
  }
};

// Status Badge Component for shops
function ShopStatusBadge({ status }: { status: string }) {
  const config = getShopStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizeShopStatus(status)}
    </Badge>
  );
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  return { user };
}

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  
  // State for data
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopMetrics, setShopMetrics] = useState<ShopMetrics>({
    total_shops: 0,
    total_followers: 0,
    avg_rating: 0,
    verified_shops: 0,
    top_shop_name: "No shops",
    active_shops: 0,
    suspended_shops: 0,
    pending_shops: 0
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    top_shops_by_rating: [],
    top_shops_by_followers: [],
    shops_by_location: []
  });
  
  // State for loading and date range
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  // Fetch data function
  const fetchShopData = async (start: Date, end: Date, rangeType: string = 'weekly') => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      // Fetch all data
      const metricsResponse = await AxiosInstance.get(`/admin-shops/get_metrics/?${params.toString()}`);
      
      if (metricsResponse.data.success) {
        setShopMetrics(metricsResponse.data.metrics);
      }

      // Fetch shops list with date range
      const shopsResponse = await AxiosInstance.get(`/admin-shops/get_shops_list/?${params.toString()}`);

      if (shopsResponse.data.success) {
        // Normalize shop statuses for consistency
        const normalizedShops = shopsResponse.data.shops.map((shop: Shop) => ({
          ...shop,
          status: normalizeShopStatus(shop.status)
        }));
        setShops(normalizedShops);
      }

      // Try to fetch analytics data if endpoint exists
      try {
        const analyticsResponse = await AxiosInstance.get(`/admin-shops/get_analytics/?${params.toString()}`);
        if (analyticsResponse.data.success) {
          setAnalytics(analyticsResponse.data.analytics);
        }
      } catch (analyticsError) {
        console.log('Analytics endpoint not available, using fallback');
        // Generate fallback analytics from shops data
        if (shopsResponse.data.success) {
          const shopsData = shopsResponse.data.shops;
          
          // Top shops by rating (top 10)
          const topByRating = [...shopsData]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10)
            .map(shop => ({
              name: shop.name,
              rating: shop.rating,
              followers: shop.followers
            }));
          
          // Top shops by followers (top 10)
          const topByFollowers = [...shopsData]
            .sort((a, b) => b.followers - a.followers)
            .slice(0, 10)
            .map(shop => ({
              name: shop.name,
              followers: shop.followers,
              rating: shop.rating
            }));
          
          // Shops by location
          const locationCounts: Record<string, number> = {};
          shopsData.forEach((shop: Shop) => {
            const location = shop.location || 'Unknown';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
          });
          
          const shopsByLocation = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
          
          setAnalytics({
            top_shops_by_rating: topByRating,
            top_shops_by_followers: topByFollowers,
            shops_by_location: shopsByLocation
          });
        }
      }

    } catch (error) {
      console.error('Error fetching shop data:', error);
      // Use fallback empty data
      setShopMetrics({
        total_shops: 0,
        total_followers: 0,
        avg_rating: 0,
        verified_shops: 0,
        top_shop_name: "No shops",
        active_shops: 0,
        suspended_shops: 0,
        pending_shops: 0
      });
      setAnalytics({
        top_shops_by_rating: [],
        top_shops_by_followers: [],
        shops_by_location: []
      });
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchShopData(dateRange.start, dateRange.end, dateRange.rangeType);
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchShopData(range.start, range.end, range.rangeType);
  };

  // Function to update shop status
  const updateShopStatus = async (shopId: string, actionType: string, reason?: string, suspensionDays?: number) => {
    setIsLoading(true);
    try {
      const payload = {
        shop_id: shopId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason }),
        ...(suspensionDays && { suspension_days: suspensionDays })
      };

      const response = await AxiosInstance.put('/admin-shops/update_shop_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Shop status updated successfully');
        
        // Refresh the shops data
        await fetchShopData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update shop status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating shop status:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update shop status');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get growth metrics
  const growthMetrics = shopMetrics.growth_metrics || {};

  const shopFilterConfig = {
    status: {
      options: [...new Set(shops.map(shop => shop.status))],
      placeholder: 'Status'
    },
    owner: {
      options: [...new Set(shops.map(shop => shop.owner))],
      placeholder: 'Owner'
    },
    location: {
      options: [...new Set(shops.map(shop => shop.location))],
      placeholder: 'Location'
    },
    verification: {
      options: ['Verified', 'Unverified'],
      placeholder: 'Verification Status'
    }
  };

  // Loading skeleton for metrics
  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mt-1" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Shops</h1>
            </div>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Shops</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.total_shops}</p>
                        {!isLoading && growthMetrics.shop_growth !== undefined && (
                          <div className={`flex items-center gap-1 mt-2 text-sm ${
                            growthMetrics.shop_growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{formatPercentage(growthMetrics.shop_growth)}</span>
                            <span className="text-xs text-muted-foreground">
                              vs previous {growthMetrics.period_days || 7} days
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{shopMetrics.verified_shops} verified</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Store className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Shops</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">{shopMetrics.active_shops}</p>
                        <p className="text-xs text-muted-foreground mt-2">{shopMetrics.suspended_shops} suspended</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Followers</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.total_followers.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-2">Across all shops</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.avg_rating.toFixed(1)}★</p>
                        <p className="text-xs text-muted-foreground mt-2">Overall quality</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Shops Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Shops</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading shops...' : `Showing ${shops.length} shops`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={shops}
                  filterConfig={shopFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search shop..."
                  }}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<Shop>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Shop
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-2">
        <div className="font-medium text-xs sm:text-sm">{row.getValue("name")}</div>
        {row.original.verified && (
          <Badge variant="secondary" className="text-xs">Verified</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">{row.getValue("owner")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <MapPin className="w-3 h-3 text-muted-foreground" />
        {row.getValue("location")}
      </div>
    ),
  },
  {
    accessorKey: "followers",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Followers
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("followers").toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "products",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Products
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("products")}
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
        <span>{row.getValue("rating")}</span>
        <span className="text-xs text-muted-foreground">({row.original.totalRatings})</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      return <ShopStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "totalSales",
    header: "Total Sales",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        ₱{parseFloat(row.getValue("totalSales")).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const shop = row.original;
      
      const handleAction = async (actionType: string) => {
        let reason = '';
        let suspensionDays = 7;

        if (actionType === 'suspend' || actionType === 'ban' || actionType === 'remove') {
          reason = prompt(`Enter reason for ${actionType}:`) || '';
          if (!reason) {
            toast.error('Reason is required');
            return;
          }
          
          if (actionType === 'suspend') {
            const daysInput = prompt('Enter suspension days (default: 7):', '7');
            suspensionDays = parseInt(daysInput || '7', 10);
            if (isNaN(suspensionDays) || suspensionDays <= 0) {
              suspensionDays = 7;
            }
          }
        }

        try {
          // Get user ID from localStorage or global context
          const sessionUserId = localStorage.getItem('userId') || 
                               (window as any).user?.id || 
                               '';
          
          const payload = {
            shop_id: shop.id,
            action_type: actionType,
            user_id: sessionUserId,
            ...(reason && { reason }),
            ...(suspensionDays && { suspension_days: suspensionDays })
          };

          const response = await AxiosInstance.put('/admin-shops/update_shop_status/', payload);
          
          if (response.data.success || response.data.message) {
            toast.success(response.data.message || 'Shop status updated successfully');
            // Trigger a page refresh or data reload
            window.location.reload();
          } else {
            toast.error(response.data.error || 'Failed to update shop status');
          }
        } catch (error: any) {
          console.error('Error updating shop status:', error);
          toast.error(error.response?.data?.error || 'Failed to update shop status');
        }
      };

      // Function to determine available actions based on shop state
      const getAvailableActions = () => {
        const actions = [];
        const normalizedStatus = normalizeShopStatus(shop.status);
        
        // Active shops
        if (normalizedStatus === 'Active') {
          actions.push({ label: 'Suspend Shop', action: 'suspend', variant: 'destructive' as const });
          actions.push({ label: 'Ban Shop', action: 'ban', variant: 'destructive' as const });
          actions.push({ label: 'Verify Shop', action: 'verify', variant: 'default' as const });
          if (!shop.verified) {
            actions.push({ label: 'Unverify Shop', action: 'unverify', variant: 'secondary' as const });
          }
        }
        
        // Suspended shops
        if (normalizedStatus === 'Suspended') {
          actions.push({ label: 'Unsuspend Shop', action: 'unsuspend', variant: 'default' as const });
          actions.push({ label: 'Ban Shop', action: 'ban', variant: 'destructive' as const });
        }
        
        // Banned shops
        if (normalizedStatus === 'Banned') {
          actions.push({ label: 'Unban Shop', action: 'unban', variant: 'default' as const });
        }
        
        // Pending shops
        if (normalizedStatus === 'Pending') {
          actions.push({ label: 'Approve Shop', action: 'approve', variant: 'default' as const });
          actions.push({ label: 'Reject Shop', action: 'reject', variant: 'destructive' as const });
        }
        
        // Inactive shops
        if (normalizedStatus === 'Inactive') {
          actions.push({ label: 'Activate Shop', action: 'activate', variant: 'default' as const });
          actions.push({ label: 'Delete Shop', action: 'delete', variant: 'destructive' as const });
        }
        
        // Deleted shops
        if (normalizedStatus === 'Deleted' || shop.is_removed) {
          actions.push({ label: 'Restore Shop', action: 'restore', variant: 'default' as const });
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2">
          <Link 
            to={`/admin/shops/${shop.id}`}
            className="text-primary hover:underline text-xs sm:text-sm flex items-center gap-1"
            title="View Details"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
          
          {actions.length > 0 && (
            <Select onValueChange={(value) => handleAction(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.action} value={action.action}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    },
  },
];