import type { Route } from './+types/riders';
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
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { 
  Users,
  TrendingUp,
  Clock,
  ArrowUpDown,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Star,
  Package,
  MapPin,
  Phone,
  Mail,
  Car,
  FileText,
  Shield,
  Download,
  Eye,
  Edit,
  Filter,
  Search,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Riders | Moderator",
    },
  ];
}

// Interface that matches EXACT Django Rider model structure
interface Rider {
  rider: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number: string;
    created_at: string;
    is_rider: boolean;
  };
  vehicle_type: string;
  plate_number: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_image: string | null;
  license_number: string;
  license_image: string | null;
  verified: boolean;
  approved_by: {
    id: string;
    username: string;
  } | null;
  approval_date: string | null;
  // Computed fields for frontend display
  total_deliveries?: number;
  completed_deliveries?: number;
  average_rating?: number;
  total_earnings?: number;
  rider_status?: 'pending' | 'approved' | 'rejected' | 'suspended';
}

interface LoaderData {
  user: any;
  riderMetrics: {
    total_riders: number;
    pending_riders: number;
    approved_riders: number;
    active_riders: number;
    total_deliveries: number;
    completed_deliveries: number;
    success_rate: number;
    average_rating: number;
    total_earnings: number;
  };
  riders: Rider[];
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
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

  await requireRole(request, context, ["isModerator"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  // Parse URL search params for date range
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const rangeTypeParam = url.searchParams.get('rangeType');

  // Set default date range (last 7 days)
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();
  
  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || 'weekly';

  // Validate dates
  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  // Initialize empty data structures - NO FALLBACK DATA
  let riderMetrics = {
    total_riders: 0,
    pending_riders: 0,
    approved_riders: 0,
    active_riders: 0,
    total_deliveries: 0,
    completed_deliveries: 0,
    success_rate: 0,
    average_rating: 0,
    total_earnings: 0,
  };

  let ridersList: Rider[] = [];

  try {
    // Fetch real data from API with date range parameters
    const response = await AxiosInstance.get('/moderator-riders/get_metrics/', {
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString()
      },
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (response.data.success) {
      riderMetrics = response.data.metrics || riderMetrics;
      ridersList = response.data.riders || [];
    }
  } catch (error) {
    console.log('API fetch failed - no data available');
    // NO FALLBACK DATA - everything remains empty
  }

  return { 
    user, 
    riderMetrics,
    riders: ridersList,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType
    }
  };
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const VEHICLE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

// Empty state components
const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center text-muted-foreground">
      <p>{message}</p>
    </div>
  </div>
);

const EmptyTable = () => (
  <div className="flex items-center justify-center h-32">
    <div className="text-center text-muted-foreground">
      <p>No riders found</p>
    </div>
  </div>
);

// MetricCardSkeleton for loading state
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

// Helper function to compute rider status based on model fields
const getRiderStatus = (rider: Rider): 'pending' | 'approved' | 'rejected' | 'suspended' => {
  if (rider.verified && rider.approval_date) {
    return 'approved';
  } else if (!rider.verified && !rider.approval_date) {
    return 'pending';
  } else if (!rider.verified && rider.approval_date) {
    return 'rejected';
  }
  return 'pending';
};

export default function Riders() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, riderMetrics, riders, dateRange } = loaderData;

  // State management for date range
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Handle date range change - update URL search params
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setIsLoading(true);
    
    // Update URL search params
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('start', range.start.toISOString());
    newSearchParams.set('end', range.end.toISOString());
    newSearchParams.set('rangeType', range.rangeType);
    
    // Navigate to update the URL, which will trigger a new loader call
    navigate(`?${newSearchParams.toString()}`, { replace: true });
    
    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  // Reset loading state when loader data changes
  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading riders...</div>
      </div>
    );
  }

  // Use only the fetched data - no fallbacks
  const safeRiders = riders || [];
  const safeMetrics = riderMetrics || {
    total_riders: 0,
    pending_riders: 0,
    approved_riders: 0,
    active_riders: 0,
    total_deliveries: 0,
    completed_deliveries: 0,
    success_rate: 0,
    average_rating: 0,
    total_earnings: 0,
  };

  const hasRiders = safeRiders.length > 0;

  // Add computed status to riders for filtering
  const ridersWithComputedStatus = safeRiders.map(rider => ({
    ...rider,
    rider_status: getRiderStatus(rider),
    // Add a computed field for full name for search
    riderName: `${rider.rider.first_name} ${rider.rider.last_name}`.trim()
  }));

  const riderFilterConfig = {
    rider_status: {
      options: [...new Set(ridersWithComputedStatus.map(rider => rider.rider_status))],
      placeholder: 'Status'
    },
    vehicle_type: {
      options: [...new Set(ridersWithComputedStatus.map(rider => rider.vehicle_type))].filter(Boolean),
      placeholder: 'Vehicle Type'
    },
    verified: {
      options: ['Verified', 'Not Verified'],
      placeholder: 'Verification'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Riders Management</h1>
            </div>            
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics - Will show zeros if no data */}
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
                        <p className="text-sm text-muted-foreground">Total Riders</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_riders}</p>
                        <p className="text-xs text-muted-foreground mt-2">{safeMetrics.active_riders} active</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Deliveries</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_deliveries.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-2">{safeMetrics.completed_deliveries} completed</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <Package className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.success_rate}%</p>
                        <p className="text-xs text-muted-foreground mt-2">Delivery completion</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Rating</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.average_rating}</p>
                        <p className="text-xs text-muted-foreground mt-2">From all deliveries</p>
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

          {/* Status Overview Cards - Will show zeros if no data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Approved</p>
                        <p className="text-lg font-bold mt-1 text-green-600">{safeMetrics.approved_riders}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold mt-1 text-yellow-600">{safeMetrics.pending_riders}</p>
                      </div>
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-lg font-bold mt-1 text-blue-600">{safeMetrics.active_riders}</p>
                      </div>
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                        <p className="text-lg font-bold mt-1 text-purple-600">₱{safeMetrics.total_earnings.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Riders Table - Will show empty state if no data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Riders</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading riders...' : `Showing ${ridersWithComputedStatus.length} riders`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : hasRiders ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={ridersWithComputedStatus}
                    filterConfig={riderFilterConfig}
                    searchConfig={{
                      column: "riderName",
                      placeholder: "Search by rider name..."
                    }}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                <EmptyTable />
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<any>[] = [
  {
    accessorKey: "riderName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Rider
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const rider = row.original.rider;
      if (!rider) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">{rider.first_name} {rider.last_name}</div>
            <div className="text-xs text-muted-foreground">@{rider.username}</div>
            <div className="text-xs text-muted-foreground">
              Joined: {new Date(rider.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }: { row: any}) => {
      const rider = row.original.rider;
      if (!rider) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-muted-foreground" />
            {rider.contact_number || 'N/A'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{rider.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "vehicle",
    header: "Vehicle",
    cell: ({ row }: { row: any}) => {
      const vehicle = row.original;
      if (!vehicle.vehicle_type) return <div className="text-muted-foreground">N/A</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Car className="w-3 h-3 text-muted-foreground" />
          <div>
            <div className="font-medium">{vehicle.vehicle_type}</div>
            <div className="text-xs text-muted-foreground">
              {vehicle.vehicle_brand} {vehicle.vehicle_model}
            </div>
            <div className="text-xs text-muted-foreground">{vehicle.plate_number}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "license",
    header: "License",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <FileText className="w-3 h-3 text-muted-foreground" />
        <span>{row.original.license_number || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "verified",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Verified
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const verified = row.original.verified;
      
      return (
        <Badge 
          variant="secondary"
          className={`text-xs capitalize flex items-center gap-1 ${
            verified 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          <Shield className="w-3 h-3" />
          {verified ? 'Verified' : 'Pending'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "rider_status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Status
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("rider_status") as string;
      const getColor = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'approved': return '#10b981';
          case 'pending': return '#f59e0b';
          case 'rejected': return '#ef4444';
          case 'suspended': return '#6b7280';
          default: return '#6b7280';
        }
      };
      const getIcon = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'approved': return <CheckCircle className="w-3 h-3" />;
          case 'pending': return <Clock className="w-3 h-3" />;
          case 'rejected': return <XCircle className="w-3 h-3" />;
          case 'suspended': return <AlertCircle className="w-3 h-3" />;
          default: return <AlertCircle className="w-3 h-3" />;
        }
      };
      const color = getColor(status);
      const icon = getIcon(status);
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
          {status || 'Unknown'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "approval_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Approved Date
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = row.original.approval_date;
      if (!date) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
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
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: any}) => {
      const rider = row.original;
      const isPending = rider.rider_status === 'pending';
      
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="w-4 h-4" />
          </Button>
          {isPending && (
            <>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600">
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600">
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      );
    },
  },
];