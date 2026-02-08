import SellerSidebarLayout from "~/components/layouts/seller-sidebar";
import type { Route } from "./+types/seller-boosts";
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  Eye, 
  Store, 
  Tag, 
  MoreHorizontal, 
  MoreVertical,
  AlertCircle, 
  Zap, 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Calendar, 
  CreditCard, 
  Shield, 
  Target, 
  Users, 
  Award, 
  Crown,
  DollarSign,
  User,
  Package,
  ArrowUpDown,
  EyeOff,
  Edit
} from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from "~/components/ui/date-range-filter";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller Boosts",
    }
  ]
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  status: string;
  condition: string;
  upload_status: string;
  shop: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  is_removed?: boolean;
  removal_reason?: string;
}

interface BoostPlanFeature {
  id: string;
  feature_id: string;
  feature_name: string;
  description: string;
  value: string;
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  time_unit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived';
  features: BoostPlanFeature[];
  created_at: string;
  description: string;
  usage_count: number;
  revenue: number;
  created_by: string;
  updated_at: string;
  position: number;
  color: string;
  icon: string;
  popular: boolean;
}

interface ActiveBoost {
  id: string;
  product_id: string;
  boost_plan_id: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  start_date: string;
  end_date: string;
  plan_name: string;
  plan_price: number;
  product?: Product;
  shop_name: string;
  shop_owner: string;
  duration: number;
  cost: number;
  created_at: string;
}

interface BoostMetrics {
  total_boosts: number;
  active_boosts: number;
  total_spent: number;
  most_used_plan: string;
  average_boost_duration: number;
  boosts_by_month: Array<{
    month: string;
    count: number;
  }>;
}

interface PlansSummary {
  total_plans: number;
  active_plans: number;
  inactive_plans: number;
  archived_plans: number;
}

interface BoostPlansResponse {
  success: boolean;
  plans: BoostPlan[];
  message: string;
}

interface ActiveBoostsResponse {
  success: boolean;
  boosts: ActiveBoost[];
  message: string;
}

interface BoostMetricsResponse {
  success: boolean;
  metrics: BoostMetrics;
  message: string;
}

interface BoostCreateResponse {
  success: boolean;
  boost: {
    id: string;
    product_id: string;
    boost_plan_id: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  message: string;
}

interface LoaderData {
  user: any;
  userId: string | undefined;
  shopId: string | undefined;
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
  
  await requireRole(request, context, ["isCustomer"]);
  
  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  
  return { user, userId, shopId };
}

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

function getStatusColor(status: string) {
  switch(status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getTimeUnitDisplay(unit: string, duration: number) {
  const plural = duration > 1 ? 's' : '';
  switch(unit) {
    case 'hours': return `Hour${plural}`;
    case 'days': return `Day${plural}`;
    case 'weeks': return `Week${plural}`;
    case 'months': return `Month${plural}`;
    default: return unit;
  }
}

export default function SellerBoosts({ loaderData }: { loaderData: LoaderData }) {
  const { user, userId, shopId } = loaderData;
  
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  const [boostMetrics, setBoostMetrics] = useState<BoostMetrics>({
    total_boosts: 0,
    active_boosts: 0,
    total_spent: 0,
    most_used_plan: "No boosts",
    average_boost_duration: 0,
    boosts_by_month: []
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
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [applyingBoost, setApplyingBoost] = useState(false);

  const fetchBoostData = async (start: Date, end: Date) => {
    if (!userId || !shopId) {
      console.error('User ID or Shop ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const params = {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        customer_id: userId,
        shop_id: shopId
      };

      const [metricsResponse, boostsResponse, plansResponse] = await Promise.all([
        AxiosInstance.get('/seller-boosts/stats/', { params }),
        AxiosInstance.get('/seller-boosts/active/', { params }),
        AxiosInstance.get('/seller-boosts/plans/', { params: { status: 'active' } })
      ]);

      if (metricsResponse.data.success) {
        setBoostMetrics(metricsResponse.data.stats || {
          total_boosts: 0,
          active_boosts: 0,
          total_spent: 0,
          most_used_plan: "No boosts",
          average_boost_duration: 0,
          boosts_by_month: []
        });
      }

      if (boostsResponse.data.success) {
        const transformedBoosts = boostsResponse.data.boosts.map((boost: any) => {
          const startDate = new Date(boost.start_date);
          const endDate = new Date(boost.end_date);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: boost.id,
            product_id: boost.product_id,
            boost_plan_id: boost.boost_plan_id,
            status: boost.status,
            start_date: boost.start_date,
            end_date: boost.end_date,
            plan_name: boost.plan_name,
            plan_price: boost.plan_price,
            shop_name: boost.shop_name || 'My Shop',
            shop_owner: boost.shop_owner || 'Me',
            duration: duration,
            cost: boost.plan_price,
            created_at: boost.created_at || boost.start_date
          };
        });
        setActiveBoosts(transformedBoosts);
      }

      if (plansResponse.data.success && plansResponse.data.plans) {
        const transformedPlans = plansResponse.data.plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
          duration: plan.duration,
          time_unit: (plan.time_unit as 'hours' | 'days' | 'weeks' | 'months') || 'days',
          status: (plan.status as 'active' | 'inactive' | 'archived') || 'active',
          description: generateDescriptionForPlan(plan.name, plan.price, plan.duration, plan.time_unit),
          features: generateFeaturesForPlan(plan.name, plan.duration, plan.time_unit),
          usage_count: plan.usage_count || 0,
          revenue: plan.revenue || 0,
          created_by: plan.created_by || 'Admin',
          created_at: plan.created_at,
          updated_at: plan.updated_at,
          position: plan.position || 1,
          color: plan.color || 'blue',
          icon: plan.icon || 'sparkles',
          popular: plan.popular || false,
          featuresList: plan.features || []
        }));
        setBoostPlans(transformedPlans);

        const activePlans = transformedPlans.filter((p: { status: string; }) => p.status === 'active').length;
        const inactivePlans = transformedPlans.filter((p: { status: string; }) => p.status === 'inactive').length;
        const archivedPlans = transformedPlans.filter((p: { status: string; }) => p.status === 'archived').length;
        
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
        total_spent: 0,
        most_used_plan: "No boosts",
        average_boost_duration: 0,
        boosts_by_month: []
      });
      setActiveBoosts([]);
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

  useEffect(() => {
    if (userId && shopId) {
      fetchBoostData(dateRange.start, dateRange.end);
    }
  }, [userId, shopId]);

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchBoostData(range.start, range.end);
  };

  const handleSelectBoostPlan = async (planId: string) => {
    if (!selectedProduct || !userId || !shopId) return;
    
    try {
      setApplyingBoost(true);
      
      const response = await AxiosInstance.post<BoostCreateResponse>('/seller-boosts/create/', {
        product_id: selectedProduct.id,
        boost_plan_id: planId,
        customer_id: userId,
        shop_id: shopId
      });
      
      if (response.data.success) {
        await fetchBoostData(dateRange.start, dateRange.end);
        alert(`Boost successfully applied to ${selectedProduct.name}!`);
        setBoostModalOpen(false);
        setSelectedProduct(null);
      } else {
        alert(`Failed to apply boost: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Error applying boost:', error);
      alert(`Failed to apply boost: ${error.response?.data?.message || 'Network error'}`);
    } finally {
      setApplyingBoost(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active", color: '#10b981' },
      expired: { variant: "secondary" as const, label: "Expired", color: '#6b7280' },
      pending: { variant: "outline" as const, label: "Pending", color: '#f59e0b' },
      cancelled: { variant: "destructive" as const, label: "Cancelled", color: '#ef4444' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status, color: '#6b7280' };
    
    return (
      <Badge 
        variant={config.variant}
        className="text-xs px-2 capitalize"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </Badge>
    );
  };

  const getBoostTypeColor = (type: string) => {
    switch(type) {
      case 'Starter Boost': return '#10b981';
      case 'Basic Boost': return '#3b82f6';
      case 'Premium Boost': return '#8b5cf6';
      case 'Ultimate Boost': return '#f59e0b';
      case 'Pro Boost': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const boostFilterConfig = {
    status: {
      options: [...new Set(activeBoosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    plan_name: {
      options: [...new Set(activeBoosts.map(boost => boost.plan_name))],
      placeholder: 'Boost Type'
    }
  };

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

  const PlanCardSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );

  const columns: ColumnDef<ActiveBoost>[] = [
    {
      accessorKey: "shop_name",
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
          <div className="font-medium text-xs sm:text-sm truncate">{row.getValue("shop_name")}</div>
        </div>
      ),
    },
    {
      accessorKey: "shop_owner",
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
          <span className="truncate">{row.getValue("shop_owner")}</span>
        </div>
      ),
    },
    {
      accessorKey: "plan_name",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("plan_name") as string;
        const color = getBoostTypeColor(type);
        
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
        return getStatusBadge(row.getValue("status") as string);
      },
    },
    {
      accessorKey: "start_date",
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
        const date = new Date(row.getValue("start_date"));
        const formattedDate = date.toLocaleDateString('en-PH', {
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
      accessorKey: "end_date",
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
        const date = new Date(row.getValue("end_date"));
        const formattedDate = date.toLocaleDateString('en-PH', {
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
  ];

  return (
    <UserProvider user={user}>
      <SellerSidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Boost Management</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                className="gap-2"
                onClick={() => setBoostModalOpen(true)}
              >
                <Zap className="h-4 w-4" />
                Boost Product
              </Button>
            </div>
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
                        <p className="text-sm text-muted-foreground">Active Boosts</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{boostMetrics.active_boosts}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {boostMetrics.total_boosts} total
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          ₱{boostMetrics.total_spent.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Lifetime spending
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Duration</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {boostMetrics.average_boost_duration || 0}d
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Average boost duration
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Popular Plan</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {boostMetrics.most_used_plan || "None"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Most used boost plan
                        </p>
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
                <h2 className="text-xl font-semibold">Available Boost Plans</h2>
                <Badge variant="secondary" className="text-xs">
                  {boostPlans.length} total
                </Badge>
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <PlanCardSkeleton key={i} />
                ))}
              </div>
            ) : boostPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-gray-100 p-4 mb-4">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Boost Plans Available</h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                    There are currently no boost plans available. Please check back later or contact support.
                  </p>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boostPlans.map((plan) => (
                  <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(plan.status)} px-2 py-0.5`}
                            >
                              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                            </Badge>
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
                            <DropdownMenuItem asChild>
                              <Link to={`/seller/seller-boosts/${plan.id}`}>
                                <Zap className="mr-2 h-3.5 w-3.5" />
                                Select Plan   
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              View Details
                            </DropdownMenuItem>
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
                            {plan.duration} {getTimeUnitDisplay(plan.time_unit, plan.duration)}
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
                              {plan.features.slice(0, 3).map((feature: any, index: number) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700"
                                >
                                  {typeof feature === 'string' ? feature.split(' ')[0] : feature.value?.split(' ')[0] || 'Feature'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Usage</p>
                            <p className="text-sm font-semibold">{plan.usage_count || 0}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-semibold">₱{(plan.revenue || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-2 border-t">
                      <Button asChild className="w-full">
                        <Link to={`/seller/seller-boosts/${plan.id}`}>
                          {plan.status === 'active' ? (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Select Plan
                            </>
                          ) : (
                            'Unavailable'
                          )}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">My Boosts</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading boosts...' : `Showing ${activeBoosts.length} boosts`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p>Loading boosts...</p>
                </div>
              ) : activeBoosts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="rounded-full bg-gray-100 p-4 mb-4 inline-flex">
                    <Zap className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Boosts Found</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't boosted any products yet. Boost your products to increase visibility and sales.
                  </p>
                  <Button 
                    className="gap-2"
                    onClick={() => setBoostModalOpen(true)}
                  >
                    <Zap className="h-4 w-4" />
                    Boost Your First Product
                  </Button>
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={activeBoosts}
                  filterConfig={boostFilterConfig}
                  searchConfig={{
                    column: "shop_name",
                    placeholder: "Search boosts..."
                  }}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SellerSidebarLayout>
    </UserProvider>
  );
}