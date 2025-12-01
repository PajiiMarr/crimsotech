// app/routes/admin/boosts.tsx
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
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
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
  CheckCircle,
  XCircle,
  MoreVertical,
  DollarSign,
  Users,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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
  productName: string;
  boostType: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  timeUnit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived';
  description: string;
  features: string[];
  usageCount: number;
  revenue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BoostPlansResponse {
  success: boolean;
  message: string;
  boost_plans: Array<{
    boost_plan_id: string;
    name: string;
    price: number;
    duration: number;
    time_unit: string;
    status: string;
    user_id: string;
    user_name: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
  }>;
}

interface LoaderData {
  user: any;
  boostMetrics: {
    total_boosts: number;
    active_boosts: number;
    total_revenue: number;
    avg_conversion_rate: number;
    most_popular_boost: string;
  };
  boosts: Boost[];
  boostPlans: BoostPlan[];
  plansSummary: {
    total_plans: number;
    active_plans: number;
    inactive_plans: number;
    archived_plans: number;
  };
  analytics: {
    top_plans_by_usage: Array<{
      name: string;
      usage: number;
      duration: string;
      price: number;
    }>;
    plan_revenue_data: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
    boost_trend_data: Array<{
      month: string;
      newBoosts: number;
      expired: number;
      full_month: string;
    }>;
  };
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let boostMetrics = null;
  let boostsList = [];
  let boostPlansList: BoostPlan[] = [];
  let plansSummary = {
    total_plans: 0,
    active_plans: 0,
    inactive_plans: 0,
    archived_plans: 0
  };
  let analyticsData = null;

  try {
    // Fetch boost metrics from the backend
    const metricsResponse = await AxiosInstance.get('/admin-boosting/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      boostMetrics = metricsResponse.data.metrics;
    }

    // Fetch analytics data for charts
    const analyticsResponse = await AxiosInstance.get('/admin-boosting/get_analytics_data/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (analyticsResponse.data.success) {
      analyticsData = analyticsResponse.data.analytics;
    }

    // Fetch boosts list
    const boostsResponse = await AxiosInstance.get('/admin-boosting/get_active_boosts/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (boostsResponse.data.success) {
      // Transform the API data to match our frontend interface
      boostsList = boostsResponse.data.boosts.map((boost: any) => {
        // Calculate duration in days
        const startDate = new Date(boost.start_date);
        const endDate = new Date(boost.end_date);
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: boost.boost_id,
          shopName: boost.shop_name,
          shopOwner: boost.customer_name, // Using customer_name as shop owner
          productName: boost.product_name,
          boostType: boost.boost_plan_name,
          status: boost.status,
          startDate: boost.start_date,
          endDate: boost.end_date,
          duration: duration,
          cost: boost.amount,
          impressions: Math.floor(Math.random() * 10000) + 1000, // Mock data since not in API
          clicks: Math.floor(Math.random() * 500) + 50, // Mock data since not in API
          conversionRate: parseFloat((Math.random() * 10).toFixed(1)), // Mock data
          createdAt: boost.created_at,
          customerName: boost.customer_name,
          customerEmail: boost.customer_email
        };
      });
    }

    // Fetch boost plans from the backend
    try {
      const plansResponse = await AxiosInstance.get<BoostPlansResponse>('/admin-boosting/get_boost_plans/', {
        headers: {
          "X-User-Id": session.get("userId")
        }
      });

      console.log('Boost plans response:', plansResponse.data);

      if (plansResponse.data.success && plansResponse.data.boost_plans) {
        // Transform the API data to match our frontend interface
        boostPlansList = plansResponse.data.boost_plans.map((plan: any) => {
          // Generate features based on plan type and duration
          const features = generateFeaturesForPlan(plan.name, plan.duration, plan.time_unit);
          const revenue = calculateRevenueForPlan(plan.price, plan.usage_count);
          
          return {
            id: plan.boost_plan_id,
            name: plan.name,
            price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
            duration: plan.duration,
            timeUnit: (plan.time_unit as 'hours' | 'days' | 'weeks' | 'months') || 'days',
            status: (plan.status as 'active' | 'inactive' | 'archived') || 'active',
            description: generateDescriptionForPlan(plan.name, plan.price, plan.duration, plan.time_unit),
            features: features,
            usageCount: plan.usage_count || 0,
            revenue: revenue,
            createdBy: plan.user_name || 'Admin',
            createdAt: plan.created_at,
            updatedAt: plan.updated_at
          };
        });

        console.log('Transformed boost plans:', boostPlansList);

        // Calculate summary statistics from plans
        const activePlans = boostPlansList.filter(p => p.status === 'active').length;
        const inactivePlans = boostPlansList.filter(p => p.status === 'inactive').length;
        const archivedPlans = boostPlansList.filter(p => p.status === 'archived').length;
        
        plansSummary = {
          total_plans: boostPlansList.length,
          active_plans: activePlans,
          inactive_plans: inactivePlans,
          archived_plans: archivedPlans
        };

        // Update analytics data with real plan usage
        if (!analyticsData) {
          analyticsData = {
            top_plans_by_usage: [],
            plan_revenue_data: [],
            boost_trend_data: []
          };
        }
        
        // Generate top plans by usage data
        analyticsData.top_plans_by_usage = boostPlansList
          .map(plan => ({
            name: plan.name,
            usage: plan.usageCount,
            duration: `${plan.duration} ${plan.timeUnit}`,
            price: plan.price
          }))
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 5);

        // Generate plan revenue data
        analyticsData.plan_revenue_data = boostPlansList
          .filter(plan => plan.usageCount > 0)
          .map(plan => ({
            name: plan.name,
            value: plan.revenue,
            percentage: 0
          }));
        
        // Calculate percentages
        const totalRevenue = analyticsData.plan_revenue_data.reduce((sum: any, item: { value: any; }) => sum + item.value, 0);
        if (totalRevenue > 0) {
          analyticsData.plan_revenue_data = analyticsData.plan_revenue_data.map((item: { value: number; }) => ({
            ...item,
            percentage: (item.value / totalRevenue) * 100
          }));
        }
      }
    } catch (planError) {
      console.error('Error fetching boost plans from API:', planError);
      boostPlansList = [];
    }

  } catch (error) {
    console.error('Error fetching boost data:', error);
    // Use fallback data structure
    boostMetrics = {
      total_boosts: 0,
      active_boosts: 0,
      total_revenue: 0,
      avg_conversion_rate: 0,
      most_popular_boost: "No boosts"
    };
    
    analyticsData = {
      top_plans_by_usage: [],
      plan_revenue_data: [],
      boost_trend_data: []
    };
    
    boostsList = [];
    boostPlansList = [];
  }

  return { 
    user, 
    boostMetrics,
    boosts: boostsList,
    boostPlans: boostPlansList,
    plansSummary,
    analytics: analyticsData
  };
}

// Helper function to generate features based on plan type
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
    return [
      ...baseFeatures,
      `${timeDisplay} duration`,
      'Perfect for new products'
    ];
  } else if (name.toLowerCase().includes('premium')) {
    return [
      ...baseFeatures,
      ...premiumFeatures.slice(0, 2),
      `${timeDisplay} duration`,
      'Increased visibility'
    ];
  } else if (name.toLowerCase().includes('ultimate') || name.toLowerCase().includes('pro')) {
    return [
      ...baseFeatures,
      ...premiumFeatures,
      ...ultimateFeatures.slice(0, 2),
      `${timeDisplay} duration`,
      'Maximum exposure'
    ];
  }
  
  return [
    ...baseFeatures,
    `${timeDisplay} duration`,
    'Boost product visibility'
  ];
}

// Helper function to generate description for plan
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

// Helper function to calculate revenue for plan
function calculateRevenueForPlan(price: number, usageCount: number): number {
  return price * usageCount;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7'];

export default function Boosts({ loaderData }: { loaderData: LoaderData }) {
  const { user, boostMetrics, boosts, boostPlans, plansSummary, analytics } = loaderData;

  // Add proper loading and error states
  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading boosts...</div>
      </div>
    );
  }

  // Ensure boosts is always an array
  const safeBoosts = boosts || [];

  // Create filter config with safe data
  const boostFilterConfig = {
    status: {
      options: [...new Set(safeBoosts.map(boost => boost.status))],
      placeholder: 'Status'
    },
    boostType: {
      options: [...new Set(safeBoosts.map(boost => boost.boostType))],
      placeholder: 'Boost Type'
    },
    shopOwner: {
      options: [...new Set(safeBoosts.map(boost => boost.shopOwner))],
      placeholder: 'Shop Owner'
    }
  };

  // Ensure analytics data is always available
  const safeAnalytics = analytics || {
    top_plans_by_usage: [],
    plan_revenue_data: [],
    boost_trend_data: []
  };

  // Ensure metrics data is always available
  const safeMetrics = boostMetrics || {
    total_boosts: 0,
    active_boosts: 0,
    total_revenue: 0,
    avg_conversion_rate: 0,
    most_popular_boost: "No boosts"
  };

  // Ensure boost plans data is always available
  const safeBoostPlans = boostPlans || [];
  const safePlansSummary = plansSummary || {
    total_plans: 0,
    active_plans: 0,
    inactive_plans: 0,
    archived_plans: 0
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return <Eye className="h-4 w-4" />;
      case 'inactive': return <EyeOff className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <EyeOff className="h-4 w-4" />;
    }
  };

  // Helper function to get time unit display
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

  // Calculate plan statistics
  const totalActivePlans = safePlansSummary.active_plans;
  const totalPlansRevenue = safeBoostPlans.reduce((sum, plan) => sum + plan.revenue, 0);
  const totalPlanUsage = safeBoostPlans.reduce((sum, plan) => sum + plan.usageCount, 0);
  const mostUsedPlan = safeBoostPlans.length > 0 
    ? safeBoostPlans.reduce((prev, current) => (prev.usageCount > current.usageCount) ? prev : current)
    : null;

  // Handle empty state for boost plans
  if (safeBoostPlans.length === 0) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage boost plans and monitor active boosts</p>
              </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Boost Plan
              </Button>
            </div>

            {/* Empty State */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Boosts Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage boost plans and monitor active boosts</p>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Boost Plan
              </Button>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Manage Plans
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Boosts</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_boosts}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.active_boosts} active</p>
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
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_revenue.toLocaleString()}</p>
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
                    <p className="text-xl sm:text-2xl font-bold mt-1">{totalActivePlans}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {safePlansSummary.inactive_plans} inactive, {safePlansSummary.archived_plans} archived
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
          </div>

          {/* BOOSTING PLANS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Boost Plans</h2>
                <p className="text-sm text-muted-foreground">Manage and customize boosting packages</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                  {safePlansSummary.active_plans} Active
                </Badge>
                <Badge variant="outline" className="text-sm bg-yellow-50 text-yellow-700 border-yellow-200">
                  {safePlansSummary.inactive_plans} Inactive
                </Badge>
                <Badge variant="outline" className="text-sm bg-gray-50 text-gray-700 border-gray-200">
                  {safePlansSummary.archived_plans} Archived
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeBoostPlans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {plan.name}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(plan.status)} flex items-center gap-1`}
                          >
                            {getStatusIcon(plan.status)}
                            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {plan.description || `Boost visibility for ${plan.duration} ${getTimeUnitDisplay(plan.timeUnit, plan.duration).toLowerCase()}`}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {plan.status === 'active' ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : plan.status === 'inactive' ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Restore
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="mr-2 h-4 w-4" />
                            {plan.status === 'archived' ? 'Delete' : 'Archive'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-3">
                    <div className="space-y-4">
                      {/* Price and Duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-2xl font-bold">₱{plan.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{plan.duration} {getTimeUnitDisplay(plan.timeUnit, plan.duration)}</span>
                        </div>
                      </div>

                      {/* Features */}
                      {plan.features && plan.features.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Features:</p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-xs text-blue-600">
                                +{plan.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="h-3 w-3 text-blue-600" />
                            <p className="text-xs text-muted-foreground">Usage</p>
                          </div>
                          <p className="text-lg font-semibold">{plan.usageCount}</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                          <p className="text-lg font-semibold">₱{plan.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-gray-50 pt-3 border-t">
                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Created by: {plan.createdBy || 'Admin'}</span>
                      </div>
                      <div className="text-right">
                        <div>
                          Updated: {new Date(plan.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Plan Statistics Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Most Used Plan</p>
                      <p className="text-lg font-semibold mt-1 truncate">
                        {mostUsedPlan ? mostUsedPlan.name : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mostUsedPlan ? `${mostUsedPlan.usageCount} purchases` : 'No data'}
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Price</p>
                      <p className="text-lg font-semibold mt-1">
                        ₱{(safeBoostPlans.reduce((sum, plan) => sum + plan.price, 0) / safeBoostPlans.length || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across {safeBoostPlans.length} plans
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <p className="text-lg font-semibold mt-1">
                        {totalPlanUsage}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across all boost plans
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* END BOOSTING PLANS SECTION */}

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Plans by Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Top Plans by Usage</CardTitle>
                <CardDescription>Most used boost packages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={safeAnalytics.top_plans_by_usage} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={80} 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        value, 
                        name === 'usage' ? 'Usage Count' : name
                      ]}
                    />
                    <Bar 
                      dataKey="usage" 
                      name="Usage Count"
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Plan Revenue Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Plan Revenue Distribution</CardTitle>
                <CardDescription>Revenue contribution by plan type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={safeAnalytics.plan_revenue_data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${Math.round((percent ?? 0) * 100)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {safeAnalytics.plan_revenue_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        `₱${value}`, 
                        name === 'value' ? 'Revenue' : name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Boost Trend Over Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Boost Trend Over Time</CardTitle>
              <CardDescription>Monthly boost activity and expirations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={safeAnalytics.boost_trend_data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.full_month || label;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="newBoosts" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="New Boosts"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expired" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Expired Boosts"
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Boosts Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Boosts</CardTitle>
              <CardDescription>Manage and view all boost campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={safeBoosts}
                  filterConfig={boostFilterConfig}
                  searchConfig={{
                    column: "shopName",
                    placeholder: "Search by shop name..."
                  }}
                />
              </div>
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
        <Store className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        <div className="font-medium text-xs sm:text-sm">{row.getValue("shopName")}</div>
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Package className="w-3 h-3 text-muted-foreground" />
        {row.getValue("productName")}
      </div>
    ),
  },
  {
    accessorKey: "shopOwner",
    header: "Owner",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <User className="w-3 h-3 text-muted-foreground" />
        {row.getValue("shopOwner")}
      </div>
    ),
  },
  {
    accessorKey: "boostType",
    header: "Boost Type",
    cell: ({ row }: { row: any}) => {
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
          className="text-xs"
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
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      const getColor = (status: string) => {
        switch(status) {
          case 'active': return '#10b981';
          case 'expired': return '#6b7280';
          case 'pending': return '#f59e0b';
          case 'cancelled': return '#ef4444';
          default: return '#6b7280';
        }
      };
      const color = getColor(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Start Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("startDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formattedDate}
        </div>
      );
    },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          End Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("endDate"));
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formattedDate}
        </div>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Duration
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("duration")} days
      </div>
    ),
  },
  {
    accessorKey: "cost",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Cost
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        ₱{row.getValue("cost")}
      </div>
    ),
  },
  {
    accessorKey: "impressions",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Impressions
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        {row.getValue("impressions")?.toLocaleString() || '0'}
      </div>
    ),
  },
  {
    accessorKey: "conversionRate",
    header: "Conversion",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("conversionRate")}%
      </div>
    ),
  },
];