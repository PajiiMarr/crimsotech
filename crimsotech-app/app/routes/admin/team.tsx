import type { Route } from "./+types/team"
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
  Settings,
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Team | Admin",
        }
    ]
}

// Interface matching Django User model structure for team members
interface TeamUserData {
  // Core User model fields
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
  
  // Related model data
  moderator_data?: {
    approval_status: string;
  };
  admin_data?: any;
}

interface TeamMetrics {
  total_team_members: number;
  total_admins: number;
  total_moderators: number;
  new_team_members_today: number;
  active_team_members: number;
  inactive_team_members: number;
  avg_registration_stage: number;
  pending_moderator_approvals: number;
}

interface TeamAnalytics {
  role_distribution: Array<{
    role: string;
    count: number;
    percentage: number;
  }>;
  registration_trend: Array<{
    month: string;
    new_members: number;
    full_month: string;
  }>;
  approval_status_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  activity_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

interface LoaderData {
    user: any;
    teamMetrics: TeamMetrics | null;
    teamMembers: TeamUserData[];
    analytics: TeamAnalytics | null;
}

// Helper functions for team members
const getTeamMemberRole = (user: TeamUserData): string => {
  if (user.is_admin) return 'Admin';
  if (user.is_moderator) return 'Moderator';
  return 'Unknown';
};

const getTeamMemberStatus = (user: TeamUserData): string => {
  const isRecentlyActive = new Date(user.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return user.registration_stage && user.registration_stage >= 3 && isRecentlyActive ? 'active' : 'inactive';
};

const getFullName = (user: TeamUserData): string => {
  return `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`.trim();
};

const getApprovalStatus = (user: TeamUserData): string => {
  if (user.is_moderator && user.moderator_data) {
    return user.moderator_data.approval_status || 'pending';
  }
  return user.is_admin ? 'approved' : 'N/A';
};

const getApprovalStatusBadge = (status: string) => {
  const statusConfig = {
    'approved': { color: 'bg-green-100 text-green-800', label: 'Approved' },
    'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    'rejected': { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    'N/A': { color: 'bg-gray-100 text-gray-800', label: 'N/A' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['N/A'];
  
  return (
    <Badge variant="secondary" className={`text-xs capitalize ${config.color}`}>
      {config.label}
    </Badge>
  );
};

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isAdmin"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    let teamMetrics = null;
    let teamMembers: TeamUserData[] = [];
    let analyticsData = null;

    try {
        // Fetch team data from backend endpoints
        const [metricsResponse, analyticsResponse, teamResponse] = await Promise.all([
            AxiosInstance.get('/admin-team/get_team_metrics/', {
            }),
            AxiosInstance.get('/admin-team/get_team_analytics/', {
            }),
            AxiosInstance.get('/admin-team/team_list/', {
            }),
        ]);

        // Use actual data from API responses
        if (metricsResponse?.data) {
            teamMetrics = metricsResponse.data;
        }

        if (analyticsResponse?.data) {
            analyticsData = analyticsResponse.data;
        }

        // Use actual team members data if available
        if (teamResponse?.data && teamResponse.data.results && Array.isArray(teamResponse.data.results)) {
            teamMembers = teamResponse.data.results;
        }

    } catch (error) {
        console.error('Error fetching team data:', error);
        // Return empty data when API fails
        teamMetrics = null;
        analyticsData = null;
        teamMembers = [];
    }

    return { 
        user, 
        teamMetrics,
        teamMembers,
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

// Safe filter options generator
const getFilterOptions = (teamMembers: TeamUserData[]) => {
  const roleOptions = Array.from(new Set(teamMembers.map(member => getTeamMemberRole(member))))
    .filter(role => role && role.trim() !== '')
    .map(role => role);

  const statusOptions = Array.from(new Set(teamMembers.map(member => getTeamMemberStatus(member))))
    .filter(status => status && status.trim() !== '')
    .map(status => status.charAt(0).toUpperCase() + status.slice(1));

  const approvalOptions = Array.from(new Set(teamMembers.map(member => getApprovalStatus(member))))
    .filter(status => status && status.trim() !== '')
    .map(status => status.charAt(0).toUpperCase() + status.slice(1));

  const cityOptions = Array.from(new Set(teamMembers.map(member => member.city).filter((v): v is string => !!v && v.trim() !== '')))
    .map(city => city);

  return {
    role: {
      options: roleOptions.length > 0 ? roleOptions : ['No roles available'],
      placeholder: 'Role'
    },
    status: {
      options: statusOptions.length > 0 ? statusOptions : ['No status available'],
      placeholder: 'Status'
    },
    approval_status: {
      options: approvalOptions.length > 0 ? approvalOptions : ['No approvals available'],
      placeholder: 'Approval Status'
    },
    city: {
      options: cityOptions.length > 0 ? cityOptions : ['No cities available'],
      placeholder: 'City'
    }
  };
};

export default function Team({ loaderData}: { loaderData: LoaderData }){
    const { user, teamMetrics, teamMembers, analytics } = loaderData;

    const safeTeamMembers = teamMembers || [];
    const hasMetrics = teamMetrics !== null;
    const hasAnalytics = analytics !== null;

    // Use safe filter configuration
    const teamFilterConfig = getFilterOptions(safeTeamMembers);

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {hasMetrics ? (
                            <>
                                <Card>
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Team</p>
                                                <p className="text-xl sm:text-2xl font-bold mt-1">{teamMetrics.total_team_members}</p>
                                                <p className="text-xs text-muted-foreground mt-2">{teamMetrics.new_team_members_today} new today</p>
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
                                                <p className="text-sm text-muted-foreground">Admins</p>
                                                <p className="text-xl sm:text-2xl font-bold mt-1">{teamMetrics.total_admins}</p>
                                                <p className="text-xs text-muted-foreground mt-2">System administrators</p>
                                            </div>
                                            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                                                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Moderators</p>
                                                <p className="text-xl sm:text-2xl font-bold mt-1">{teamMetrics.total_moderators}</p>
                                                <p className="text-xs text-muted-foreground mt-2">{teamMetrics.pending_moderator_approvals} pending</p>
                                            </div>
                                            <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                                                <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Active Members</p>
                                                <p className="text-xl sm:text-2xl font-bold mt-1">{teamMetrics.active_team_members}</p>
                                                <p className="text-xs text-muted-foreground mt-2">{teamMetrics.inactive_team_members} inactive</p>
                                            </div>
                                            <div className="p-2 sm:p-3 bg-indigo-100 rounded-full">
                                                <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            // Show empty metrics when no data
                            Array.from({ length: 4 }).map((_, index) => (
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
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                    <CardTitle className="text-lg sm:text-xl">Team Role Distribution</CardTitle>
                                    <CardDescription>Breakdown of team members by role</CardDescription>
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
                                description="Breakdown of team members by role"
                            />
                        )}

                        {/* Registration Trend */}
                        {hasAnalytics && analytics.registration_trend.length > 0 ? (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg sm:text-xl">Team Growth</CardTitle>
                                    <CardDescription>Monthly team member registration</CardDescription>
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
                                                dataKey="new_members" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2}
                                                name="New Members"
                                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        ) : (
                            <EmptyChart 
                                title="Team Growth"
                                description="Monthly team member registration"
                            />
                        )}
                    </div>

                    {/* Additional Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Approval Status Distribution */}
                        {hasAnalytics && analytics.approval_status_distribution.length > 0 ? (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg sm:text-xl">Approval Status</CardTitle>
                                    <CardDescription>Moderator approval status distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart 
                                            data={analytics.approval_status_distribution} 
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="status" 
                                                fontSize={12}
                                            />
                                            <YAxis fontSize={12} />
                                            <Tooltip />
                                            <Bar 
                                                dataKey="count" 
                                                name="Moderators"
                                                fill="#8b5cf6" 
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        ) : (
                            <EmptyChart 
                                title="Approval Status"
                                description="Moderator approval status distribution"
                            />
                        )}

                        {/* Activity Distribution */}
                        {hasAnalytics && analytics.activity_distribution.length > 0 ? (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg sm:text-xl">Team Activity</CardTitle>
                                    <CardDescription>Active vs inactive team members</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart 
                                            data={analytics.activity_distribution} 
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="status" 
                                                fontSize={12}
                                            />
                                            <YAxis fontSize={12} />
                                            <Tooltip />
                                            <Bar 
                                                dataKey="count" 
                                                name="Members"
                                                fill="#f59e0b" 
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        ) : (
                            <EmptyChart 
                                title="Team Activity"
                                description="Active vs inactive team members"
                            />
                        )}
                    </div>

                    {/* Team Members Table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg sm:text-xl">Team Members</CardTitle>
                            <CardDescription>Manage admin and moderator accounts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {safeTeamMembers.length > 0 ? (
                                <div className="rounded-md">
                                    <DataTable 
                                        columns={columns} 
                                        data={safeTeamMembers}
                                        filterConfig={teamFilterConfig}
                                        searchConfig={{
                                            column: "username",
                                            placeholder: "Search by username, email, or name..."
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                                    <p className="text-lg font-medium mb-2">No team members found</p>
                                    <p className="text-center max-w-md">
                                        No team data is currently available. This could be because the API is not returning data or there are no team members in the system.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}

const columns: ColumnDef<TeamUserData>[] = [
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
    id: "role",
    header: "Role",
    cell: ({ row }: { row: any}) => {
      const role = getTeamMemberRole(row.original);
      const getRoleConfig = (role: string) => {
        const configs = {
          'Admin': { color: '#ef4444', icon: Shield },
          'Moderator': { color: '#3b82f6', icon: Settings },
          'Unknown': { color: '#6b7280', icon: AlertCircle }
        };
        return configs[role as keyof typeof configs] || configs.Unknown;
      };
      
      const config = getRoleConfig(role);
      const IconComponent = config.icon;
      
      return (
        <Badge 
          variant="secondary"
          className="text-xs capitalize flex items-center gap-1"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          <IconComponent className="w-3 h-3" />
          {role}
        </Badge>
      );
    },
  },
    {
    id: "approval_status",
    header: "Approval Status",
    cell: ({ row }: { row: any}) => {
        const user = row.original;
        // Only show approval status for moderators
        if (user.is_moderator) {
        const approvalStatus = getApprovalStatus(user);
        return getApprovalStatusBadge(approvalStatus);
        }
        // For admins and other roles, show N/A or nothing
        return (
        <span className="text-xs text-muted-foreground italic">N/A</span>
        );
    },
    },
  {
    id: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = getTeamMemberStatus(row.original);
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
          Joined
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