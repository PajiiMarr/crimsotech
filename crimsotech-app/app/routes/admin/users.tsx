import type { Route } from "./+types/users"
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
  Users as UsersIcon,
  UserPlus,
  UserCheck,
  UserX,
  ArrowUpDown,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ShoppingBag,
  Truck,
  Settings,
  AlertCircle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Users | Admin",
    },
  ];
}

// Interface matching Django User model structure EXACTLY
interface UserData {
  // Core User model fields - all fields from your Django model
  id: string;
  username: string | null;
  email: string | null;
  password: string | null;
  first_name: string;
  last_name: string;
  middle_name: string;
  contact_number: string;
  date_of_birth: string | null;
  age: number | null;
  sex: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  state: string;
  zip_code: string;
  country: string;
  is_admin: boolean;
  is_customer: boolean;
  is_moderator: boolean;
  is_rider: boolean;
  registration_stage: number | null;
  created_at: string;
  updated_at: string;
  
  // Related model data (should come from joined queries in backend)
  customer_data?: {
    product_limit: number;
    current_product_count: number;
  };
  rider_data?: {
    vehicle_type: string;
    plate_number: string;
    vehicle_brand: string;
    vehicle_model: string;
    license_number: string;
    verified: boolean;
  };
  moderator_data?: any;
  admin_data?: any;
}

interface LoaderData {
  user: any;
  userMetrics: {
    total_users: number;
    total_customers: number;
    total_riders: number;
    total_moderators: number;
    total_admins: number;
    new_users_today: number;
    users_with_complete_profile: number;
    users_with_incomplete_profile: number;
    avg_registration_stage: number;
    most_common_city: string;
  } | null;
  users: UserData[];
  analytics: {
    role_distribution: Array<{
      role: string;
      count: number;
      percentage: number;
    }>;
    registration_trend: Array<{
      month: string;
      new_users: number;
      full_month: string;
    }>;
    location_distribution: Array<{
      city: string;
      count: number;
      percentage: number;
    }>;
    registration_stage_distribution: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
  } | null;
}

// Helper functions for computed fields (not stored in database)
const getUserPrimaryType = (user: UserData): string => {
  // Priority: Admin > Moderator > Rider > Customer > Incomplete
  if (user.is_admin) return 'Admin';
  if (user.is_moderator) return 'Moderator';
  if (user.is_rider) return 'Rider';
  if (user.is_customer) return 'Customer';
  return 'Incomplete';
};

const getUserStatus = (user: UserData): string => {
  // Status based on registration stage and recent activity
  const isRecentlyActive = new Date(user.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const registrationStage = getRegistrationStageLabel(user);
  return registrationStage === 'Completed' && isRecentlyActive ? 'active' : 'inactive';
};

const getFullName = (user: UserData): string => {
  return `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`.trim();
};

// Custom registration stage mapping based on user role
const getRegistrationStageLabel = (user: UserData): string => {
  const stage = user.registration_stage;
  
  if (user.is_rider) {
    // Rider registration stages
    switch (stage) {
      case null:
        return 'Vehicle Applying';
      case 1:
        return 'Signing Up';
      case 2:
        return 'Profiling';
      case 3:
        return 'OTP';
      case 4:
        return 'Completed';
      default:
        return 'Unknown Stage';
    }
  } else if (user.is_customer) {
    // Customer registration stages
    switch (stage) {
      case null:
        return 'Signing Up';
      case 1:
        return 'Profiling';
      case 2:
        return 'OTP';
      case 4:
        return 'Completed';
      default:
        return 'Unknown Stage';
    }
  } else {
    // For admins, moderators, and incomplete users
    switch (stage) {
      case null:
        return 'Not Started';
      case 1:
        return 'Started';
      case 2:
        return 'Basic Info';
      case 3:
        return 'Address';
      case 4:
        return 'Verification';
      case 5:
        return 'Completed';
      default:
        return stage ? `Stage ${stage}` : 'Not Started';
    }
  }
};

// Helper to get registration stage for analytics (simplified view)
const getSimplifiedRegistrationStage = (user: UserData): string => {
  const stage = user.registration_stage;
  
  if (user.is_rider || user.is_customer) {
    // For riders and customers, map to simplified stages
    if (stage === 4) return 'Completed';
    if (stage === 3 && user.is_rider) return 'OTP';
    if (stage === 2) return 'Profiling';
    if (stage === 1 || stage === null) return 'Signing Up';
    return 'In Progress';
  }
  
  // For other users
  if (stage === 5) return 'Completed';
  if (stage && stage >= 3) return 'Verification';
  if (stage && stage >= 2) return 'Basic Info';
  return 'Not Started';
};

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

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let userMetrics = null;
  let usersList: UserData[] = [];
  let analyticsData = null;

  try {
    // Fetch from backend endpoints
    const [metricsResponse, analyticsResponse, usersResponse] = await Promise.all([
      AxiosInstance.get('/admin-users/get_metrics/', {
        headers: { "X-User-Id": session.get("userId") }
      }),
      AxiosInstance.get('/admin-users/get_analytics/', {
        headers: { "X-User-Id": session.get("userId") }
      }),
      AxiosInstance.get('/admin-users/users_list/', {
        headers: { "X-User-Id": session.get("userId") }
      })
    ]);

    // Use actual data from API responses
    if (metricsResponse?.data) {
      userMetrics = metricsResponse.data;
    }

    if (analyticsResponse?.data) {
      analyticsData = analyticsResponse.data;
    }

    // Use actual users data if available
    if (usersResponse?.data && usersResponse.data.results && Array.isArray(usersResponse.data.results)) {
      usersList = usersResponse.data.results;
    }

  } catch (error) {
    console.error('Error fetching user data:', error);
    // Return empty data when API fails
    userMetrics = null;
    analyticsData = null;
    usersList = [];
  }

  return { 
    user, 
    userMetrics,
    users: usersList,
    analytics: analyticsData
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Empty state components
const EmptyMetricsCard = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">-</p>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
        <div className="p-2 sm:p-3 bg-gray-100 rounded-full">
          <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyChart = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-center">No data available</p>
        <p className="text-sm text-center mt-1">Data will appear when API returns results</p>
      </div>
    </CardContent>
  </Card>
);

// Safe filter options generator - returns string arrays for DataTable compatibility
const getFilterOptions = (users: UserData[]) => {
  const userTypeOptions = Array.from(new Set(users.map(user => getUserPrimaryType(user))))
    .filter(type => type && type.trim() !== '')
    .map(type => type);

  const statusOptions = Array.from(new Set(users.map(user => getUserStatus(user))))
    .filter(status => status && status.trim() !== '')
    .map(status => status.charAt(0).toUpperCase() + status.slice(1));

  const cityOptions = Array.from(new Set(users.map(user => user.city).filter((v): v is string => !!v && v.trim() !== '')))
    .map(city => city);

  // Registration stage options based on actual stages in data
  const stageOptions = Array.from(new Set(users.map(user => getRegistrationStageLabel(user))))
    .filter(stage => stage && stage.trim() !== '')
    .map(stage => stage);

  return {
    user_type: {
      options: userTypeOptions.length > 0 ? userTypeOptions : ['No types available'],
      placeholder: 'User Type'
    },
    status: {
      options: statusOptions.length > 0 ? statusOptions : ['No status available'],
      placeholder: 'Status'
    },
    city: {
      options: cityOptions.length > 0 ? cityOptions : ['No cities available'],
      placeholder: 'City'
    },
    registration_stage: {
      options: stageOptions.length > 0 ? stageOptions : ['No stages available'],
      placeholder: 'Registration Stage'
    }
  };
};

export default function Users({ loaderData }: { loaderData: LoaderData }) {
  const { user, userMetrics, users, analytics } = loaderData;

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading users...</div>
      </div>
    );
  }

  const safeUsers = users || [];
  const hasMetrics = userMetrics !== null;
  const hasAnalytics = analytics !== null;

  // Use safe filter configuration that prevents empty string values
  const userFilterConfig = getFilterOptions(safeUsers);

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Users</h1>
              <p className="text-muted-foreground mt-1">Manage and monitor user accounts</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {hasMetrics ? (
              <>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{userMetrics.total_users}</p>
                        <p className="text-xs text-muted-foreground mt-2">{userMetrics.new_users_today} new today</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <UsersIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Customers</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{userMetrics.total_customers}</p>
                        <p className="text-xs text-muted-foreground mt-2">Online shoppers</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Riders</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{userMetrics.total_riders}</p>
                        <p className="text-xs text-muted-foreground mt-2">Delivery partners</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <Truck className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Profiles</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{userMetrics.users_with_complete_profile}</p>
                        <p className="text-xs text-muted-foreground mt-2">{userMetrics.users_with_incomplete_profile} incomplete</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Reg Stage</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{userMetrics.avg_registration_stage}/5</p>
                        <p className="text-xs text-muted-foreground mt-2">Completion progress</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-indigo-100 rounded-full">
                        <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Show empty metrics when no data
              Array.from({ length: 5 }).map((_, index) => (
                <EmptyMetricsCard
                  key={index}
                  title="No Data"
                  description="API not returning data"
                />
              ))
            )}
          </div>

          {/* Role Breakdown */}
          {hasAnalytics && analytics.role_distribution.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {analytics.role_distribution.map((item) => (
                <Card key={item.role} className="text-center">
                  <CardContent className="p-3">
                    <p className="text-lg font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-center">No role distribution data available</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Role Distribution */}
            {hasAnalytics && analytics.role_distribution.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl">Role Distribution</CardTitle>
                  <CardDescription>Breakdown of users by role and type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics.role_distribution.filter(item => item.count > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ role, percentage }: any) => `${role} (${Math.round(percentage)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.role_distribution.filter(item => item.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <EmptyChart 
                title="Role Distribution"
                description="Breakdown of users by role and type"
              />
            )}

            {/* Registration Trend */}
            {hasAnalytics && analytics.registration_trend.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl">Registration Trend</CardTitle>
                  <CardDescription>Monthly user registration growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={analytics.registration_trend}
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
                        dataKey="new_users" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="New Users"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <EmptyChart 
                title="Registration Trend"
                description="Monthly user registration growth"
              />
            )}
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Location Distribution */}
            {hasAnalytics && analytics.location_distribution.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl">Location Distribution</CardTitle>
                  <CardDescription>User distribution across major cities</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={analytics.location_distribution.slice(0, 6)} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="city" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar 
                        dataKey="count" 
                        name="Users"
                        fill="#8b5cf6" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <EmptyChart 
                title="Location Distribution"
                description="User distribution across major cities"
              />
            )}

            {/* Registration Stage Distribution */}
            {hasAnalytics && analytics.registration_stage_distribution.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl">Registration Progress</CardTitle>
                  <CardDescription>User distribution by registration stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={analytics.registration_stage_distribution} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="stage" 
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar 
                        dataKey="count" 
                        name="Users"
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <EmptyChart 
                title="Registration Progress"
                description="User distribution by registration stage"
              />
            )}
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {safeUsers.length > 0 ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={safeUsers}
                    filterConfig={userFilterConfig}
                    searchConfig={{
                      column: "username",
                      placeholder: "Search by username, email, or name..."
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No users found</p>
                  <p className="text-center max-w-md">
                    No user data is currently available. This could be because the API is not returning data or there are no users in the system.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<UserData>[] = [
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Username
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <div className="font-medium text-xs sm:text-sm">
          {row.original.username || (
            <span className="text-muted-foreground italic">No username</span>
          )}
        </div>
      </div>
    ),
  },
  {
    id: "full_name",
    header: "Full Name",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        {getFullName(row.original) || (
          <span className="text-muted-foreground italic">No name</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Mail className="w-3 h-3 text-muted-foreground" />
        {row.original.email || (
          <span className="text-muted-foreground italic">No email</span>
        )}
      </div>
    ),
  },
  {
    id: "user_type",
    header: "Primary Role",
    cell: ({ row }: { row: any}) => {
      const userType = getUserPrimaryType(row.original);
      const getTypeConfig = (type: string) => {
        const configs = {
          'Customer': { color: '#10b981', icon: ShoppingBag },
          'Rider': { color: '#f59e0b', icon: Truck },
          'Moderator': { color: '#3b82f6', icon: Settings },
          'Admin': { color: '#ef4444', icon: Shield },
          'Incomplete': { color: '#6b7280', icon: AlertCircle }
        };
        return configs[type as keyof typeof configs] || configs.Incomplete;
      };
      
      const config = getTypeConfig(userType);
      const IconComponent = config.icon;
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          <IconComponent className="w-3 h-3" />
          {userType}
        </Badge>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = getUserStatus(row.original);
      return (
        <Badge 
          variant="secondary"
          className={`text-xs capitalize ${
            status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
          {status}
        </Badge>
      );
    },
  },
  {
    id: "registration_stage",
    header: "Reg Stage",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm text-center">
        <Badge variant="outline" className="text-xs">
          {getRegistrationStageLabel(row.original)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "city",
    header: "Location",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <MapPin className="w-3 h-3 text-muted-foreground" />
        {row.original.city || (
          <span className="text-muted-foreground italic">No location</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "contact_number",
    header: "Contact",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Phone className="w-3 h-3 text-muted-foreground" />
        {row.original.contact_number || (
          <span className="text-muted-foreground italic">No contact</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Registered
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("created_at"));
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
  }
];