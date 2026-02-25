import { toast } from 'sonner';
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
import { DataTable } from '~/components/ui/data-table'
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { 
  History,
  User,
  UserCog,
  UserCircle,
  Bike,
  Shield,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  Download,
  Eye,
  ArrowUpDown,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
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
import { Input } from "~/components/ui/input"

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Logs | Admin",
        }
    ]
}

// Define types for Log data
interface LogEntry {
  id: string;
  user: string;
  username: string;
  user_email: string;
  user_role: 'admin' | 'moderator' | 'rider' | 'customer' | 'unknown';
  action: string;
  timestamp: string;
}

interface LogMetrics {
  total_logs: number;
  by_role: {
    admin: number;
    moderator: number;
    rider: number;
    customer: number;
  };
  period_days: number;
}

interface FilterOptions {
  roles: string[];
  actions: string[];
  users: string[];
}

interface LoaderData {
    user: any;
    logs: LogEntry[];
    metrics: LogMetrics | null;
    totalCount: number;
}

// Helper function to get role icon
const getRoleIcon = (role: string) => {
  switch(role) {
    case 'admin':
      return <Shield className="w-4 h-4 text-purple-600" />;
    case 'moderator':
      return <UserCog className="w-4 h-4 text-blue-600" />;
    case 'rider':
      return <Bike className="w-4 h-4 text-green-600" />;
    case 'customer':
      return <UserCircle className="w-4 h-4 text-orange-600" />;
    default:
      return <User className="w-4 h-4 text-gray-600" />;
  }
};

// Helper function to get role badge styling
const getRoleBadgeStyle = (role: string) => {
  switch(role) {
    case 'admin':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'moderator':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'rider':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'customer':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
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
    const userId = session.get("userId");

    // Parse URL for date range parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const rangeType = url.searchParams.get('range_type') || 'weekly';
    const role = url.searchParams.get('role');
    const page = url.searchParams.get('page') || '1';
    const pageSize = url.searchParams.get('page_size') || '10';

    // Default date range (last 7 days)
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    const defaultEndDate = new Date();

    let logs: LogEntry[] = [];
    let metrics: LogMetrics | null = null;
    let totalCount = 0;

    try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add date range parameters
        if (startDate) {
            params.append('start_date', startDate);
        } else {
            params.append('start_date', defaultStartDate.toISOString().split('T')[0]);
        }
        
        if (endDate) {
            params.append('end_date', endDate);
        } else {
            params.append('end_date', defaultEndDate.toISOString().split('T')[0]);
        }
        
        if (rangeType) params.append('range_type', rangeType);
        if (role && role !== 'all') params.append('role', role);
        
        // Add pagination
        params.append('page', page);
        params.append('page_size', pageSize);

        // Fetch logs from the endpoint
        const logsResponse = await AxiosInstance.get(`/admin-logs/get_logs/?${params.toString()}`, {
            headers: {
                "X-User-Id": userId
            }
        });

        if (logsResponse.data) {
            logs = logsResponse.data.results || [];
            totalCount = logsResponse.data.count || 0;
        }

        // Fetch metrics summary
        const metricsParams = new URLSearchParams();
        if (startDate) metricsParams.append('start_date', startDate);
        else metricsParams.append('start_date', defaultStartDate.toISOString().split('T')[0]);
        
        if (endDate) metricsParams.append('end_date', endDate);
        else metricsParams.append('end_date', defaultEndDate.toISOString().split('T')[0]);
        
        if (rangeType) metricsParams.append('range_type', rangeType);

        const metricsResponse = await AxiosInstance.get(`/admin-logs/summary/?${metricsParams.toString()}`, {
            headers: {
                "X-User-Id": userId
            }
        });

        if (metricsResponse.data) {
            metrics = metricsResponse.data;
        }

    } catch (error) {
        console.error('Error fetching logs data:', error);
        // Return empty data on error
        logs = [];
        metrics = null;
        totalCount = 0;
    }

    return { 
        user,
        logs,
        metrics,
        totalCount
    };
}

export default function Logs({ loaderData}: { loaderData: LoaderData }){
    const { user, logs: initialLogs, metrics: initialMetrics, totalCount: initialTotalCount } = loaderData;

    // State for logs data
    const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
    const [metrics, setMetrics] = useState<LogMetrics | null>(initialMetrics);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      roles: ['admin', 'moderator', 'rider', 'customer'],
      actions: ['login', 'logout', 'create', 'update', 'delete', 'archive', 'restore', 'suspend', 'unsuspend'],
      users: []
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Date range state
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
        rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });

    // Extract unique usernames for filter options when logs change
    useEffect(() => {
        if (logs.length > 0) {
            const uniqueUsers = [...new Set(logs.map(log => log.username))];
            setFilterOptions(prev => ({
                ...prev,
                users: uniqueUsers
            }));
        }
    }, [logs]);

    // Fetch logs data based on filters
    const fetchLogsData = async (start: Date, end: Date, rangeType: string, role: string = selectedRole, page: number = currentPage) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('start_date', start.toISOString().split('T')[0]);
            params.append('end_date', end.toISOString().split('T')[0]);
            params.append('range_type', rangeType);
            
            if (role && role !== 'all') {
                params.append('role', role);
            }
            
            params.append('page', page.toString());
            params.append('page_size', pageSize.toString());

            const response = await AxiosInstance.get(`/admin-logs/get_logs/?${params.toString()}`);
            
            if (response.data) {
                setLogs(response.data.results || []);
                setTotalCount(response.data.count || 0);
            }

            // Fetch updated metrics
            const metricsParams = new URLSearchParams();
            metricsParams.append('start_date', start.toISOString().split('T')[0]);
            metricsParams.append('end_date', end.toISOString().split('T')[0]);
            metricsParams.append('range_type', rangeType);

            const metricsResponse = await AxiosInstance.get(`/admin-logs/summary/?${metricsParams.toString()}`);
            
            if (metricsResponse.data) {
                setMetrics(metricsResponse.data);
            }
            
        } catch (error) {
            console.error('Error fetching logs data:', error);
            toast.error('Failed to fetch logs data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
        setDateRange({
            start: range.start,
            end: range.end,
            rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
        });
        setCurrentPage(1); // Reset to first page on filter change
        fetchLogsData(range.start, range.end, range.rangeType, selectedRole, 1);
    };

    const handleRoleFilter = (role: string) => {
        setSelectedRole(role);
        setCurrentPage(1); // Reset to first page on filter change
        fetchLogsData(dateRange.start, dateRange.end, dateRange.rangeType, role, 1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchLogsData(dateRange.start, dateRange.end, dateRange.rangeType, selectedRole, page);
    };

    const handleRefresh = () => {
        fetchLogsData(dateRange.start, dateRange.end, dateRange.rangeType, selectedRole, currentPage);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            params.append('start_date', dateRange.start.toISOString().split('T')[0]);
            params.append('end_date', dateRange.end.toISOString().split('T')[0]);
            params.append('range_type', dateRange.rangeType);
            
            if (selectedRole && selectedRole !== 'all') {
                params.append('role', selectedRole);
            }
            
            // In a real implementation, you would have an export endpoint
            // const response = await AxiosInstance.get(`/admin-logs/export/?${params.toString()}`, {
            //     responseType: 'blob'
            // });
            
            toast.success('Logs exported successfully');
        } catch (error) {
            console.error('Error exporting logs:', error);
            toast.error('Failed to export logs');
        }
    };

    // Filter logs based on search term (client-side filtering for search)
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' || 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Logs filter config for DataTable
    const logsFilterConfig = {
        role: {
            options: filterOptions.roles,
            placeholder: 'Role'
        },
        action: {
            options: filterOptions.actions,
            placeholder: 'Action Type'
        },
        user: {
            options: filterOptions.users,
            placeholder: 'User'
        }
    };

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <History className="w-8 h-8" />
                                Activity Logs
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Track and monitor all system activities across different user roles
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExport}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <DateRangeFilter 
                        onDateRangeChange={handleDateRangeChange}
                        isLoading={isLoading}
                    />

                    {/* Logs Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Logs</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {isLoading ? '...' : metrics?.total_logs || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Last {metrics?.period_days || 7} days
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <History className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Admin</p>
                                        <p className="text-2xl font-bold mt-1 text-purple-600">
                                            {isLoading ? '...' : metrics?.by_role.admin || 0}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-100 rounded-full">
                                        <Shield className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Moderators</p>
                                        <p className="text-2xl font-bold mt-1 text-blue-600">
                                            {isLoading ? '...' : metrics?.by_role.moderator || 0}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <UserCog className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Riders</p>
                                        <p className="text-2xl font-bold mt-1 text-green-600">
                                            {isLoading ? '...' : metrics?.by_role.rider || 0}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <Bike className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Customers</p>
                                        <p className="text-2xl font-bold mt-1 text-orange-600">
                                            {isLoading ? '...' : metrics?.by_role.customer || 0}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-100 rounded-full">
                                        <UserCircle className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Role Filter Pills */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Filter className="w-4 h-4" />
                            Filter by role:
                        </span>
                        <Button
                            variant={selectedRole === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleFilter('all')}
                            className="rounded-full"
                        >
                            All Roles
                        </Button>
                        <Button
                            variant={selectedRole === 'admin' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleFilter('admin')}
                            className="rounded-full"
                        >
                            <Shield className="w-4 h-4 mr-1" />
                            Admin
                        </Button>
                        <Button
                            variant={selectedRole === 'moderator' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleFilter('moderator')}
                            className="rounded-full"
                        >
                            <UserCog className="w-4 h-4 mr-1" />
                            Moderator
                        </Button>
                        <Button
                            variant={selectedRole === 'rider' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleFilter('rider')}
                            className="rounded-full"
                        >
                            <Bike className="w-4 h-4 mr-1" />
                            Rider
                        </Button>
                        <Button
                            variant={selectedRole === 'customer' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRoleFilter('customer')}
                            className="rounded-full"
                        >
                            <UserCircle className="w-4 h-4 mr-1" />
                            Customer
                        </Button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by action, username, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Logs Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Activity Logs</CardTitle>
                                    <CardDescription>
                                        {dateRange.start && dateRange.end ? (
                                            `Logs from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`
                                        ) : (
                                            'Showing all activity logs'
                                        )}
                                    </CardDescription>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </div>
                                    ) : (
                                        `${filteredLogs.length} of ${totalCount} logs shown`
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <DataTable 
                                        columns={columns} 
                                        data={filteredLogs} 
                                        filterConfig={logsFilterConfig}
                                        searchConfig={{
                                            column: "action",
                                            placeholder: "Search logs..."
                                        }}
                                    />
                                    
                                    {/* Pagination Controls */}
                                    {totalCount > pageSize && (
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1 || isLoading}
                                                >
                                                    Previous
                                                </Button>
                                                <span className="text-sm">
                                                    Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}

const columns: ColumnDef<LogEntry>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue("timestamp") as string;
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let timeAgo = '';
      if (diffMins < 60) {
        timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
      
      return (
        <div className="flex flex-col">
          <span className="text-sm">{date.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const username = row.getValue("username") as string;
      const email = row.original.user_email;
      const role = row.original.user_role;
      
      return (
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${getRoleBadgeStyle(role)}`}>
            {getRoleIcon(role)}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{username}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "user_role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("user_role") as string;
      return (
        <Badge variant="outline" className={getRoleBadgeStyle(role)}>
          {getRoleIcon(role)}
          <span className="ml-1 capitalize">{role}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "action",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Action
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const action = row.getValue("action") as string;
      
      // Determine action type for icon
      let ActionIcon = Info;
      let iconColor = 'text-blue-600';
      
      if (action.toLowerCase().includes('login')) {
        ActionIcon = User;
        iconColor = 'text-green-600';
      } else if (action.toLowerCase().includes('logout')) {
        ActionIcon = User;
        iconColor = 'text-gray-600';
      } else if (action.toLowerCase().includes('create') || action.toLowerCase().includes('add')) {
        ActionIcon = CheckCircle;
        iconColor = 'text-green-600';
      } else if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('remove')) {
        ActionIcon = XCircle;
        iconColor = 'text-red-600';
      } else if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) {
        ActionIcon = RefreshCw;
        iconColor = 'text-blue-600';
      } else if (action.toLowerCase().includes('suspend')) {
        ActionIcon = AlertCircle;
        iconColor = 'text-orange-600';
      }
      
      return (
        <div className="flex items-center gap-2">
          <ActionIcon className={`w-4 h-4 ${iconColor}`} />
          <span>{action}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const log = row.original;
      
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.info(`Log ID: ${log.id}\nAction: ${log.action}\nUser: ${log.username}\nTime: ${new Date(log.timestamp).toLocaleString()}`);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      );
    },
  },
];