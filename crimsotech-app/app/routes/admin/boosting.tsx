// app/routes/admin/boosts.tsx
import { toast } from 'sonner';
import type { Route } from './+types/boosting'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { 
  Zap,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Store,
  User,
  Package,
  Calendar,
  Plus,
  Edit,
  Archive,
  MoreVertical,
  DollarSign,
  Eye,
  EyeOff,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Ban,
  AlertTriangle
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { useState, useEffect } from 'react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Boosts | Admin",
    },
  ];
}

interface Boost {
  id: string;
  shopName: string;
  shopOwner: string;
  shop_id?: string;
  productName: string;
  product_id?: string;
  boostType: string;
  boost_plan_id?: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled' | 'suspended' | 'completed';
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  clicks: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customer_id?: string;
  is_removed?: boolean;
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  timeUnit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived' | 'draft' | 'removed';
  description: string;
  features: string[];
  usageCount: number;
  revenue: number;
  createdBy: string;
  createdBy_id?: string;
  createdAt: string;
  updatedAt: string;
  is_removed?: boolean;
}

interface BoostMetrics {
  total_boosts: number;
  active_boosts: number;
  total_revenue: number;
  most_popular_boost: string;
  growth_metrics?: {
    boost_growth?: number;
    revenue_growth?: number;
    previous_period_total?: number;
    previous_period_revenue?: number;
    period_days?: number;
  };
}

interface PlansSummary {
  total_plans: number;
  active_plans: number;
  inactive_plans: number;
  archived_plans: number;
}

interface LoaderData {
  user: any;
}

// Helper function to normalize status
const normalizeBoostStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'suspended':
      return 'Suspended';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to normalize boost plan status
const normalizePlanStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'archived':
      return 'Archived';
    case 'draft':
      return 'Draft';
    case 'removed':
    case 'is_removed':
      return 'Removed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to get boost status badge styling
const getBoostStatusConfig = (status: string) => {
  const normalizedStatus = normalizeBoostStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: PlayCircle,
        iconClassName: 'text-green-600'
      };
    case 'Pending':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        icon: Clock,
        iconClassName: 'text-yellow-600'
      };
    case 'Expired':
      return {
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Calendar,
        iconClassName: 'text-gray-600'
      };
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        icon: XCircle,
        iconClassName: 'text-red-600'
      };
    case 'Suspended':
      return {
        variant: 'destructive' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        icon: PauseCircle,
        iconClassName: 'text-amber-600'
      };
    case 'Completed':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        icon: CheckCircle,
        iconClassName: 'text-blue-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Clock,
        iconClassName: 'text-gray-600'
      };
  }
};

// Helper function to get plan status badge styling
const getPlanStatusConfig = (status: string) => {
  const normalizedStatus = normalizePlanStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: PlayCircle,
        iconClassName: 'text-green-600'
      };
    case 'Inactive':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: PauseCircle,
        iconClassName: 'text-gray-600'
      };
    case 'Archived':
      return {
        variant: 'outline' as const,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        icon: Archive,
        iconClassName: 'text-purple-600'
      };
    case 'Removed':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: Trash2,
        iconClassName: 'text-rose-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Clock,
        iconClassName: 'text-gray-600'
      };
  }
};

// Boost Status Badge Component
function BoostStatusBadge({ status }: { status: string }) {
  const config = getBoostStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizeBoostStatus(status)}
    </Badge>
  );
}

// Plan Status Badge Component
function PlanStatusBadge({ status }: { status: string }) {
  const config = getPlanStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizePlanStatus(status)}
    </Badge>
  );
}

// Helper functions
function generateFeaturesForPlan(name: string, duration: number, timeUnit: string): string[] {
  const baseFeatures = [
    'Featured placement in category',
    'Priority in search results',
    'Basic performance analytics'
  ];
  
  const premiumFeatures = [
    'Homepage featured section',
    'Advanced analytics dashboard',
    'Email campaign inclusion',
    'Social media promotion'
  ];
  
  const ultimateFeatures = [
    'Top homepage banner',
    'Personalized recommendations',
    'Dedicated support',
    'Competitor analysis',
    'Custom reporting'
  ];
  
  const timeDisplay = `${duration} ${timeUnit}`;
  
  if (name.toLowerCase().includes('starter') || name.toLowerCase().includes('basic')) {
    return [...baseFeatures, `${timeDisplay} duration`, 'Perfect for new products'];
  } else if (name.toLowerCase().includes('premium')) {
    return [...baseFeatures, ...premiumFeatures.slice(0, 2), `${timeDisplay} duration`, 'Increased visibility'];
  } else if (name.toLowerCase().includes('ultimate') || name.toLowerCase().includes('pro')) {
    return [...baseFeatures, ...premiumFeatures, ...ultimateFeatures.slice(0, 2), `${timeDisplay} duration`, 'Maximum exposure'];
  }
  
  return [...baseFeatures, `${timeDisplay} duration`, 'Boost product visibility'];
}

function generateDescriptionForPlan(name: string, price: number, duration: number, timeUnit: string): string {
  const timeDisplay = `${duration} ${timeUnit}`;
  
  if (name.toLowerCase().includes('starter')) {
    return `Affordable ${timeDisplay} boost perfect for testing new products.`;
  } else if (name.toLowerCase().includes('basic')) {
    return `Essential ${timeDisplay} boost to get your products noticed.`;
  } else if (name.toLowerCase().includes('premium')) {
    return `Enhanced ${timeDisplay} boost with better positioning and analytics.`;
  } else if (name.toLowerCase().includes('ultimate')) {
    return `Maximum ${timeDisplay} exposure with premium features and support.`;
  } else if (name.toLowerCase().includes('pro')) {
    return `Professional ${timeDisplay} boost for serious sellers.`;
  }
  
  return `Boost your product visibility for ${timeDisplay}.`;
}

function calculateRevenueForPlan(price: number, usageCount: number): number {
  return price * usageCount;
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

export default function Boosts({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;

  // State management
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  const [boostMetrics, setBoostMetrics] = useState<BoostMetrics>({
    total_boosts: 0,
    active_boosts: 0,
    total_revenue: 0,
    most_popular_boost: "No boosts"
  });
  const [plansSummary, setPlansSummary] = useState<PlansSummary>({
    total_plans: 0,
    active_plans: 0,
    inactive_plans: 0,
    archived_plans: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  // Fetch data function
  const fetchBoostData = async (start: Date, end: Date, rangeType: string = 'weekly') => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      const [metricsResponse, boostsResponse, plansResponse] = await Promise.all([
        AxiosInstance.get(`/admin-boosting/get_metrics/?${params.toString()}`),
        AxiosInstance.get(`/admin-boosting/get_active_boosts/?${params.toString()}`),
        AxiosInstance.get(`/admin-boosting/get_boost_plans/?${params.toString()}`)
      ]);

      if (metricsResponse.data.success) {
        setBoostMetrics(metricsResponse.data.metrics);
      }

      if (boostsResponse.data.success) {
        const transformedBoosts = boostsResponse.data.boosts.map((boost: any) => {
          const startDate = new Date(boost.start_date);
          const endDate = new Date(boost.end_date);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: boost.boost_id,
            shopName: boost.shop_name,
            shopOwner: boost.customer_name,
            shop_id: boost.shop_id,
            productName: boost.product_name,
            product_id: boost.product_id,
            boostType: boost.boost_plan_name,
            boost_plan_id: boost.boost_plan_id,
            status: boost.status,
            startDate: boost.start_date,
            endDate: boost.end_date,
            duration: duration,
            cost: boost.amount,
            clicks: Math.floor(Math.random() * 500) + 50,
            createdAt: boost.created_at,
            customerName: boost.customer_name,
            customerEmail: boost.customer_email,
            customer_id: boost.customer_id,
            is_removed: boost.is_removed || false
          };
        });
        setBoosts(transformedBoosts);
      }

      if (plansResponse.data.success && plansResponse.data.boost_plans) {
        const transformedPlans = plansResponse.data.boost_plans.map((plan: any) => ({
          id: plan.boost_plan_id,
          name: plan.name,
          price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
          duration: plan.duration,
          timeUnit: (plan.time_unit as 'hours' | 'days' | 'weeks' | 'months') || 'days',
          status: plan.status,
          description: generateDescriptionForPlan(plan.name, plan.price, plan.duration, plan.time_unit),
          features: generateFeaturesForPlan(plan.name, plan.duration, plan.time_unit),
          usageCount: plan.usage_count || 0,
          revenue: calculateRevenueForPlan(plan.price, plan.usage_count),
          createdBy: plan.user_name || 'Admin',
          createdBy_id: plan.user_id,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
          is_removed: plan.is_removed || false
        }));
        setBoostPlans(transformedPlans);

        // Fix: Compare normalized statuses for consistency
        const normalizedPlans = transformedPlans.map((plan: BoostPlan) => ({
          ...plan,
          normalizedStatus: normalizePlanStatus(plan.status)
        }));
        
        const activePlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Active').length;
        const inactivePlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Inactive').length;
        const archivedPlans = normalizedPlans.filter((p: any) => p.normalizedStatus === 'Archived').length;
        
        setPlansSummary({
          total_plans: transformedPlans.length,
          active_plans: activePlans,
          inactive_plans: inactivePlans,
          archived_plans: archivedPlans
        });
      }
    } catch (error) {
      console.error('Error fetching boost data:', error);
      setBoostMetrics({
        total_boosts: 0,
        active_boosts: 0,
        total_revenue: 0,
        most_popular_boost: "No boosts"
      });
      setBoosts([]);
      setBoostPlans([]);
      setPlansSummary({
        total_plans: 0,
        active_plans: 0,
        inactive_plans: 0,
        archived_plans: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchBoostData(range.start, range.end, range.rangeType);
  };

  // Function to update boost status
  const updateBoostStatus = async (boostId: string, actionType: string, reason?: string) => {
    setIsLoading(true);
    try {
      const payload = {
        boost_id: boostId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason })
      };

      const response = await AxiosInstance.put('/admin-boosting/update_boost_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Boost status updated successfully');
        
        // Refresh the boosts data
        await fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update boost status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating boost status:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update boost status');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update boost plan status
  const updateBoostPlanStatus = async (planId: string, actionType: string) => {
    setIsLoading(true);
    try {
      const payload = {
        boost_plan_id: planId,
        action_type: actionType,
        user_id: user?.id
      };

      const response = await AxiosInstance.put('/admin-boosting/update_boost_plan_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Boost plan status updated successfully');
        
        // Refresh the boost plans data
        await fetchBoostData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update boost plan status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating boost plan status:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update boost plan status');
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
  const growthMetrics = boostMetrics.growth_metrics || {};

  const boostFilterConfig = {
    status: {
      options: [...new Set(boosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    boostType: {
      options: [...new Set(boosts.map(boost => boost.boostType))],
      placeholder: 'Boost Type'
    },
    shopOwner: {
      options: [...new Set(boosts.map(boost => boost.shopOwner))],
      placeholder: 'Shop Owner'
    }
  };

  const getTimeUnitDisplay = (unit: string, duration: number) => {
    const plural = duration > 1 ? 's' : '';
    switch(unit) {
      case 'hours': return `Hour${plural}`;
      case 'days': return `Day${plural}`;
      case 'weeks': return `Week${plural}`;
      case 'months': return `Month${plural}`;
      default: return unit;
    }
  };

  const totalPlansRevenue = boostPlans.reduce((sum, plan) => sum + plan.revenue, 0);

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

  if (!isLoading && boostPlans.length === 0) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Create First Boost Plan
              </Button>
            </div>

            <DateRangeFilter 
              onDateRangeChange={handleDateRangeChange}
              isLoading={isLoading}
            />

            <Card>
              <CardContent className="flex flex-col items-center justify-center ">
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Boost Plans Found</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                  You haven't created any boost plans yet. Boost plans help sellers increase their product visibility.
                </p>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Boost Plan
                </Button>
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
            <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

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
                        <p className="text-sm text-muted-foreground">Total Boosts</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{boostMetrics.total_boosts}</p>
                        {!isLoading && growthMetrics.boost_growth !== undefined && (
                          <div className={`flex items-center gap-1 mt-2 text-sm ${
                            growthMetrics.boost_growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{formatPercentage(growthMetrics.boost_growth)}</span>
                            <span className="text-xs text-muted-foreground">
                              vs previous {growthMetrics.period_days || 7} days
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{boostMetrics.active_boosts} active</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">₱{boostMetrics.total_revenue.toLocaleString()}</p>
                        {!isLoading && growthMetrics.revenue_growth !== undefined && (
                          <div className={`flex items-center gap-1 mt-2 text-sm ${
                            growthMetrics.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>{formatPercentage(growthMetrics.revenue_growth)}</span>
                            <span className="text-xs text-muted-foreground">
                              vs previous {growthMetrics.period_days || 7} days
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">From all boosts</p>
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
                        <p className="text-sm text-muted-foreground">Active Plans</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{plansSummary.active_plans}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {plansSummary.inactive_plans} inactive, {plansSummary.archived_plans} archived
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <Package className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan Revenue</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">₱{totalPlansRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-2">Total from all plans</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className='flex gap-3'>
                <h2 className="text-xl font-semibold">Boost Plans</h2>
                <Badge variant="secondary" className="text-xs">
                  {boostPlans.length} total
                </Badge>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boostPlans.map((plan) => {
                  // Get normalized status for display and comparison
                  const normalizedStatus = normalizePlanStatus(plan.status);
                  
                  return (
                  <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            <PlanStatusBadge status={plan.status} />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {plan.description}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => console.log('Edit plan:', plan.id)}>
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                const actionType = normalizedStatus === 'Active' ? 'deactivate' : 'activate';
                                await updateBoostPlanStatus(plan.id, actionType);
                              }}
                            >
                              {normalizedStatus === 'Active' ? (
                                <>
                                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-3.5 w-3.5" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {normalizedStatus !== 'Archived' && (
                              <DropdownMenuItem 
                                onClick={async () => await updateBoostPlanStatus(plan.id, 'archive')}
                              >
                                <Archive className="mr-2 h-3.5 w-3.5" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            {normalizedStatus === 'Archived' && (
                              <DropdownMenuItem 
                                onClick={async () => await updateBoostPlanStatus(plan.id, 'restore')}
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                Restore
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold">₱{plan.price.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">/plan</span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                            {plan.duration} {getTimeUnitDisplay(plan.timeUnit, plan.duration)}
                          </div>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Includes:</span>
                              <span className="text-xs text-blue-600">
                                {plan.features.length} features
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {plan.features.slice(0, 3).map((feature, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700"
                                >
                                  {feature.split(' ')[0]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Usage</p>
                            <p className="text-sm font-semibold">{plan.usageCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-semibold">₱{plan.revenue.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-xs font-medium truncate">
                              {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-2 border-t">
                      <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">By: {plan.createdBy}</span>
                        <span className="whitespace-nowrap">
                          Updated: {new Date(plan.updatedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Boosts</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading boosts...' : `Showing ${boosts.length} boosts`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                columns={columns} 
                data={boosts}
                filterConfig={boostFilterConfig}
                searchConfig={{
                  column: "shopName",
                  placeholder: "Search by shop name..."
                }}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<Boost>[] = [
  {
    accessorKey: "shopName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Shop
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
        <Store className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <div className="font-medium text-xs sm:text-sm truncate">
          <Link 
            to={`/admin/shops/${row.original.shop_id}`}
            className="hover:underline"
          >
            {row.getValue("shopName")}
          </Link>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "shopOwner",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Owner
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{row.getValue("shopOwner")}</span>
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm truncate">
        <Link 
          to={`/admin/products/${row.original.product_id}`}
          className="hover:underline flex items-center gap-1"
        >
          <Package className="w-3 h-3 text-muted-foreground" />
          {row.getValue("productName")}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "boostType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("boostType") as string;
      const getColor = (boostType: string) => {
        switch(boostType) {
          case 'Starter Boost': return '#10b981';
          case 'Basic Boost': return '#3b82f6';
          case 'Premium Boost': return '#8b5cf6';
          case 'Ultimate Boost': return '#f59e0b';
          case 'Pro Boost': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(type);
      
      return (
        <Badge 
          variant="secondary" 
          className="text-xs px-2"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <BoostStatusBadge status={status} />;
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Start Date
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined
      });
      
      return (
        <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        End Date
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("endDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined
      });
      
      return (
        <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Duration
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <span>{row.getValue("duration")}d</span>
      </div>
    ),
  },
  {
    accessorKey: "cost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-xs sm:text-sm px-2 sm:px-4"
      >
        Cost
        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
        ₱{parseFloat(row.getValue("cost")).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const boost = row.original;
      
      const handleAction = async (actionType: string) => {
        let reason = '';

        if (actionType === 'suspend' || actionType === 'cancel') {
          reason = prompt(`Enter reason for ${actionType}:`) || '';
          if (!reason) {
            toast.error('Reason is required');
            return;
          }
        }

        try {
          // Get user ID from localStorage or global context
          const sessionUserId = localStorage.getItem('userId') || 
                               (window as any).user?.id || 
                               '';
          
          const payload = {
            boost_id: boost.id,
            action_type: actionType,
            user_id: sessionUserId,
            ...(reason && { reason })
          };

          const response = await AxiosInstance.put('/admin-boosting/update_boost_status/', payload);
          
          if (response.data.success || response.data.message) {
            toast.success(response.data.message || 'Boost status updated successfully');
            // Trigger a page refresh or data reload
            window.location.reload();
          } else {
            toast.error(response.data.error || 'Failed to update boost status');
          }
        } catch (error: any) {
          console.error('Error updating boost status:', error);
          toast.error(error.response?.data?.error || 'Failed to update boost status');
        }
      };

      // Function to determine available actions based on boost state
      const getAvailableActions = () => {
        const actions = [];
        const normalizedStatus = normalizeBoostStatus(boost.status);
        
        // Active boosts
        if (normalizedStatus === 'Active') {
          actions.push({ label: 'Suspend Boost', action: 'suspend', variant: 'destructive' as const });
          actions.push({ label: 'Cancel Boost', action: 'cancel', variant: 'destructive' as const });
        }
        
        // Pending boosts
        if (normalizedStatus === 'Pending') {
          actions.push({ label: 'Approve Boost', action: 'approve', variant: 'default' as const });
          actions.push({ label: 'Reject Boost', action: 'reject', variant: 'destructive' as const });
        }
        
        // Suspended boosts
        if (normalizedStatus === 'Suspended') {
          actions.push({ label: 'Resume Boost', action: 'resume', variant: 'default' as const });
          actions.push({ label: 'Cancel Boost', action: 'cancel', variant: 'destructive' as const });
        }
        
        // Expired boosts
        if (normalizedStatus === 'Expired') {
          actions.push({ label: 'Renew Boost', action: 'renew', variant: 'default' as const });
        }
        
        // Cancelled boosts
        if (normalizedStatus === 'Cancelled') {
          actions.push({ label: 'Restore Boost', action: 'restore', variant: 'default' as const });
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
          <Link 
            to={`/admin/boosts/${boost.id}`}
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