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
  Edit,
  Image as ImageIcon,
  CheckCircle,
  XCircle
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

interface Boost {
  id: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  payment_method?: string;
  payment_verified: boolean;
  has_receipt: boolean;
  receipt_url?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  days_remaining?: number;
  product?: {
    id: string;
    name: string;
    description: string;
    image?: string;
    total_stock: number;
    price_range: {
      min: number;
      max: number;
    };
    condition: string;
    status: string;
    upload_status: string;
  };
  shop?: {
    id: string;
    name: string;
    city: string;
    province: string;
  };
  plan?: {
    id: string;
    name: string;
    price: number;
    duration: number;
    time_unit: string;
  };
  verification?: {
    verified: boolean;
    verified_at?: string;
    verified_by?: string;
  };
}

interface BoostCounts {
  total: number;
  active: number;
  pending: number;
  expired: number;
  cancelled: number;
}

interface UserBoostsResponse {
  success: boolean;
  boosts: Boost[];
  counts: BoostCounts;
  current_filter: string;
  message: string;
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

function getBoostStatusColor(status: string) {
  switch(status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
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
  
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [boostCounts, setBoostCounts] = useState<BoostCounts>({
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    cancelled: 0
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
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
      
      // Fetch boosts by status using the user_boosts endpoint
      const boostsResponse = await AxiosInstance.get(`/seller-boosts/user/${userId}/`, {
        params: { status: activeStatusFilter !== 'all' ? activeStatusFilter : 'all' }
      });

      if (boostsResponse.data.success) {
        setBoosts(boostsResponse.data.boosts || []);
        setBoostCounts(boostsResponse.data.counts || {
          total: 0,
          active: 0,
          pending: 0,
          expired: 0,
          cancelled: 0
        });
      }

      // Fetch plans
      const plansResponse = await AxiosInstance.get('/seller-boosts/plans/', { 
        params: { status: 'active' } 
      });

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

      // Calculate metrics from boosts data
      const activeBoosts = boostsResponse.data.boosts?.filter((b: Boost) => b.status === 'active') || [];
      const totalSpent = boostsResponse.data.boosts?.reduce((sum: number, boost: Boost) => {
        if (boost.status === 'active' || boost.status === 'expired') {
          return sum + (boost.plan?.price || 0);
        }
        return sum;
      }, 0) || 0;

      // Count plan usage
      const planUsage: Record<string, number> = {};
      boostsResponse.data.boosts?.forEach((boost: Boost) => {
        if (boost.plan?.name) {
          planUsage[boost.plan.name] = (planUsage[boost.plan.name] || 0) + 1;
        }
      });

      const mostUsedPlan = Object.entries(planUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || "No boosts";

      // Calculate average duration for active boosts
      const durations = activeBoosts.map((boost: Boost) => boost.days_remaining || 0);
      const avgDuration = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
        : 0;

      setBoostMetrics({
        total_boosts: boostsResponse.data.boosts?.length || 0,
        active_boosts: activeBoosts.length,
        total_spent: totalSpent,
        most_used_plan: mostUsedPlan,
        average_boost_duration: avgDuration,
        boosts_by_month: []
      });

    } catch (error) {
      console.error('Error fetching boost data:', error);
      setBoosts([]);
      setBoostCounts({
        total: 0,
        active: 0,
        pending: 0,
        expired: 0,
        cancelled: 0
      });
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
  }, [userId, shopId, activeStatusFilter]);

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchBoostData(range.start, range.end);
  };

  const handleStatusFilterChange = (status: string) => {
    setActiveStatusFilter(status);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string, paymentVerified?: boolean) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon?: any }> = {
      active: { variant: "default", label: "Active", icon: Zap },
      pending: { variant: "outline", label: "Pending", icon: Clock },
      expired: { variant: "secondary", label: "Expired", icon: XCircle },
      cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
    };
    
    const config = statusConfig[status] || { variant: "outline", label: status };
    const Icon = config.icon;
    
    return (
      <Badge 
        variant={config.variant}
        className="text-xs px-2 py-1 capitalize flex items-center gap-1"
      >
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
        {status === 'pending' && paymentVerified && (
          <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
        )}
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
      options: [...new Set(boosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    plan: {
      options: [...new Set(boosts.map(boost => boost.plan?.name).filter(Boolean))],
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

  const columns: ColumnDef<Boost>[] = [
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original.product;
        return (
          <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
            {product?.image ? (
              <img src={product.image} alt={product.name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className="font-medium text-xs sm:text-sm truncate max-w-[150px]">
              {product?.name || 'Unknown Product'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "shop",
      header: "Shop",
      cell: ({ row }) => {
        const shop = row.original.shop;
        return (
          <div className="flex items-center gap-2 px-2 sm:px-4 py-2">
            <Store className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <div className="font-medium text-xs sm:text-sm truncate">{shop?.name || 'My Shop'}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "plan",
      header: "Boost Plan",
      cell: ({ row }) => {
        const plan = row.original.plan;
        const color = getBoostTypeColor(plan?.name || '');
        
        return (
          <Badge 
            variant="secondary" 
            className="text-xs px-2"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {plan?.name || 'Unknown Plan'}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return getStatusBadge(row.original.status, row.original.payment_verified);
      },
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }) => {
        const date = row.original.start_date;
        if (!date) return <span className="text-xs text-gray-400">N/A</span>;
        
        const formattedDate = new Date(date).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
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
      header: "End Date",
      cell: ({ row }) => {
        const date = row.original.end_date;
        if (!date) return <span className="text-xs text-gray-400">N/A</span>;
        
        const formattedDate = new Date(date).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
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
      accessorKey: "days_remaining",
      header: "Days Left",
      cell: ({ row }) => {
        const days = row.original.days_remaining;
        if (days === undefined || days === null) return <span className="text-xs text-gray-400">-</span>;
        
        return (
          <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm">
            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className={days < 3 ? 'text-orange-600 font-medium' : ''}>{days}d</span>
          </div>
        );
      },
    },
    {
      accessorKey: "plan.price",
      header: "Cost",
      cell: ({ row }) => {
        const price = row.original.plan?.price;
        return (
          <div className="flex items-center gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
            ₱{price?.toLocaleString() || '0'}
          </div>
        );
      },
    },
    {
      id: "receipt",
      header: "Receipt",
      cell: ({ row }) => {
        const boost = row.original;
        if (!boost.has_receipt) return <span className="text-xs text-gray-400">No receipt</span>;
        
        return (
          <div className="flex items-center gap-1">
            {boost.receipt_url ? (
              <a 
                href={boost.receipt_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
              >
                <ImageIcon className="h-3 w-3" />
                View
              </a>
            ) : (
              <Badge variant="outline" className="text-xs">Uploaded</Badge>
            )}
          </div>
        );
      },
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

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 border-b pb-2">
            <Button
              variant={activeStatusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilterChange('all')}
              className="gap-2"
            >
              All
              <Badge variant="secondary" className="ml-1">{boostCounts.total}</Badge>
            </Button>
            <Button
              variant={activeStatusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilterChange('active')}
              className="gap-2"
            >
              <Zap className="h-3 w-3" />
              Active
              <Badge variant="secondary" className="ml-1">{boostCounts.active}</Badge>
            </Button>
            <Button
              variant={activeStatusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilterChange('pending')}
              className="gap-2"
            >
              <Clock className="h-3 w-3" />
              Pending
              <Badge variant="secondary" className="ml-1">{boostCounts.pending}</Badge>
            </Button>
            <Button
              variant={activeStatusFilter === 'expired' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilterChange('expired')}
              className="gap-2"
            >
              <XCircle className="h-3 w-3" />
              Expired
              <Badge variant="secondary" className="ml-1">{boostCounts.expired}</Badge>
            </Button>
            <Button
              variant={activeStatusFilter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilterChange('cancelled')}
              className="gap-2"
            >
              <XCircle className="h-3 w-3" />
              Cancelled
              <Badge variant="secondary" className="ml-1">{boostCounts.cancelled}</Badge>
            </Button>
          </div>

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
                        <p className="text-sm text-muted-foreground">Pending Approval</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{boostCounts.pending}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Awaiting admin review
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
                        <p className="text-sm text-muted-foreground">Popular Plan</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {boostMetrics.most_used_plan || "None"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Most used boost plan
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">My Boosts</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Loading boosts...' : `Showing ${boosts.length} boosts`}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Filter: {activeStatusFilter === 'all' ? 'All' : activeStatusFilter}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p>Loading boosts...</p>
                </div>
              ) : boosts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="rounded-full bg-gray-100 p-4 mb-4 inline-flex">
                    <Zap className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Boosts Found</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    {activeStatusFilter === 'all' 
                      ? "You haven't boosted any products yet. Boost your products to increase visibility and sales."
                      : `You don't have any ${activeStatusFilter} boosts at the moment.`}
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
                  data={boosts}
                  filterConfig={boostFilterConfig}
                  searchConfig={{
                    column: "product.name",
                    placeholder: "Search by product name..."
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