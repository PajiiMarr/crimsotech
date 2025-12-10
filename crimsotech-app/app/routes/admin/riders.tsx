// app/routes/admin/riders.tsx
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

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Riders | Admin",
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
    // Fetch real data from API - NO FALLBACK
    const response = await AxiosInstance.get('/admin-riders/get_metrics/', {
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

export default function Riders({ loaderData }: { loaderData: LoaderData }) {
  const { user, riderMetrics, riders } = loaderData;

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
    rider_status: getRiderStatus(rider)
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

          {/* Key Metrics - Will show zeros if no data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Status Overview Cards - Will show zeros if no data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          </div>

          {/* Riders Table - Will show empty state if no data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Riders</CardTitle>
              <CardDescription>Manage and view all delivery riders</CardDescription>
            </CardHeader>
            <CardContent>
              {hasRiders ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={ridersWithComputedStatus}
                    filterConfig={riderFilterConfig}
                    searchConfig={{
                      column: "riderName",
                      placeholder: "Search by rider name..."
                    }}
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
    header: "Rider",
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
    header: "Verified",
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
    header: "Status",
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