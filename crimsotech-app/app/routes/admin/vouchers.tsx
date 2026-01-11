// app/routes/admin/vouchers.tsx
import type { Route } from './+types/vouchers';
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
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Tag,
  User,
  Percent,
  Copy,
  Store,
  PhilippinePeso
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
      title: "Vouchers | Admin",
    },
  ];
}

// Interface to match Django Voucher model - removed unnecessary attributes
interface Voucher {
  id: string;
  name: string;
  code: string;
  shop: {
    id: string;
    name: string;
  } | null;
  discount_type: string;
  value: number;
  valid_until: string;
  added_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  is_active: boolean;
  status?: string;
  shopName?: string;
}

interface LoaderData {
  user: any;
  voucherMetrics: {
    total_vouchers: number;
    active_vouchers: number;
    expired_vouchers: number;
    total_usage: number;
    total_discount: number;
  };
  vouchers: Voucher[];
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

  await requireRole(request, context, ["isAdmin"]);

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

  // Initialize empty data structures
  let voucherMetrics = {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  let vouchersList: Voucher[] = [];

  try {
    // Fetch real data from API with date range parameters
    const metricsResponse = await AxiosInstance.get('/admin-vouchers/get_metrics/', {
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString()
      },
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      voucherMetrics = metricsResponse.data.metrics || voucherMetrics;
    }

    // Fetch vouchers list from API with date range parameters
    const vouchersResponse = await AxiosInstance.get('/admin-vouchers/vouchers_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        start_date: validStart.toISOString(),
        end_date: validEnd.toISOString(),
        page: 1,
        page_size: 50 // Get first 50 vouchers for initial load
      }
    });

    if (vouchersResponse.data.success) {
      vouchersList = vouchersResponse.data.vouchers || [];
    }
  } catch (error) {
    console.log('API fetch failed - no data available');
    // NO FALLBACK DATA - everything remains empty
  }

  return { 
    user, 
    voucherMetrics,
    vouchers: vouchersList,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType
    }
  };
}

// Empty state components
const EmptyTable = () => (
  <div className="flex flex-col items-center justify-center h-64 py-8">
    <div className="text-center text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">No vouchers found</h3>
      <p className="text-sm mb-4">Get started by creating your first voucher code.</p>
      <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4" />
        Create Voucher
      </Button>
    </div>
  </div>
);

export default function Vouchers() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, voucherMetrics, vouchers, dateRange } = loaderData;

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
        <div>Loading vouchers...</div>
      </div>
    );
  }

  const safeVouchers = vouchers || [];
  const safeMetrics = voucherMetrics || {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  const hasVouchers = safeVouchers.length > 0;

  // Calculate status based on is_active and valid_until date
  const getVoucherStatus = (voucher: Voucher) => {
    const now = new Date();
    const validUntil = new Date(voucher.valid_until);
    
    if (!voucher.is_active) {
      if (validUntil > now) return 'scheduled';
      return 'expired';
    }
    
    if (validUntil < now) return 'expired';
    return 'active';
  };

  // Add status field to vouchers for filtering
  const vouchersWithStatus = safeVouchers.map(voucher => ({
    ...voucher,
    status: voucher.status || getVoucherStatus(voucher),
    shopName: voucher.shopName || voucher.shop?.name || 'Global'
  }));

  // Get unique filter options from actual data
  const discountTypes = [...new Set(safeVouchers.map(voucher => voucher.discount_type).filter(Boolean))] as string[];
  const shopNames = [...new Set(vouchersWithStatus.map(voucher => voucher.shopName).filter(Boolean))];

  const voucherFilterConfig = {
    status: {
      accessorKey: "status",
      options: ['active', 'scheduled', 'expired'],
      placeholder: 'Status'
    },
    discount_type: {
      accessorKey: "discount_type",
      options: discountTypes.length > 0 ? discountTypes : ['percentage', 'fixed'],
      placeholder: 'Discount Type'
    },
    shop: {
      accessorKey: "shopName",
      options: shopNames.length > 0 ? shopNames : ['Global'],
      placeholder: 'Shop'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Vouchers</h1>
            </div>            
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vouchers</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_vouchers}</p>
                    <p className="text-xs text-muted-foreground mt-2">{safeMetrics.active_vouchers} active</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Tag className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Usage</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.total_usage}</p>
                    <p className="text-xs text-muted-foreground mt-2">Times used</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Discount</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">₱{safeMetrics.total_discount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Amount saved</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expired</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{safeMetrics.expired_vouchers}</p>
                    <p className="text-xs text-muted-foreground mt-2">No longer valid</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Vouchers</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading vouchers...' : `Showing ${vouchersWithStatus.length} vouchers`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : hasVouchers ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={vouchersWithStatus}
                    filterConfig={voucherFilterConfig}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by voucher name..."
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }: { row: any}) => (
      <div className="font-medium text-xs sm:text-sm">
        <div>{row.getValue("name")}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {row.original.shop ? `Shop: ${row.original.shop.name}` : 'Global Voucher'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }: { row: any}) => {
      const code = row.getValue("code") as string;
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {code}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: "created_by",
    header: "Added By",
    cell: ({ row }: { row: any}) => {
      const createdBy = row.original.created_by;
      if (!createdBy) return <div className="text-muted-foreground text-xs">System</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <User className="w-3 h-3 text-muted-foreground" />
          <span>{createdBy.first_name} {createdBy.last_name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "shopName",
    header: "Shop",
    cell: ({ row }: { row: any}) => {
      const shop = row.original.shop;
      if (!shop) return <div className="text-muted-foreground text-xs">Global</div>;
      
      return (
        <div className="flex items-center gap-1 text-xs sm:text-sm">
          <Store className="w-3 h-3 text-muted-foreground" />
          <span>{shop.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "value",
    header: "Amount",
    cell: ({ row }: { row: any}) => {
      const type = row.original.discount_type;
      const value = row.getValue("value");
      
      if (type === 'percentage') {
        return <span className="text-xs sm:text-sm font-medium">{value}%</span>;
      }
      return <span className="text-xs sm:text-sm font-medium">₱{value}</span>;
    },
  },
  {
    accessorKey: "valid_until",
    header: "Valid Until",
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("valid_until"));
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const isExpired = new Date() > date;
      
      return (
        <div className={`flex items-center gap-1 text-xs sm:text-sm ${isExpired ? 'text-red-600' : ''}`}>
          <Calendar className="w-3 h-3" />
          {formattedDate}
          {isExpired && <span className="text-xs">(Expired)</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "added_at",
    header: "Added At",
    cell: ({ row }: { row: any}) => {
      const date = new Date(row.getValue("added_at"));
      if (isNaN(date.getTime())) return <div className="text-muted-foreground">N/A</div>;
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      return (
        <div className="text-xs sm:text-sm">
          {formattedDate}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => {
      const status = row.getValue("status") as string;
      const getColor = (status: string) => {
        switch(status?.toLowerCase()) {
          case 'active': return '#10b981';
          case 'scheduled': return '#3b82f6';
          case 'expired': return '#ef4444';
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
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: any}) => {
      const voucher = row.original;
      
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      );
    },
  },
];