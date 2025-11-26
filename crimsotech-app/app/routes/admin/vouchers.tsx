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
  DollarSign,
  Percent,
  Copy,
  Store
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Vouchers | Admin",
    },
  ];
}

// Interface to match Django Voucher model
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
  minimum_spend: number;
  maximum_usage: number;
  valid_until: string;
  added_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  is_active: boolean;
  usage_count?: number;
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
    // Fetch metrics from API
    const metricsResponse = await AxiosInstance.get('/admin-vouchers/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      voucherMetrics = metricsResponse.data.metrics || voucherMetrics;
    }

    // Fetch vouchers list from API
    const vouchersResponse = await AxiosInstance.get('/admin-vouchers/vouchers_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        page: 1,
        page_size: 50 // Get first 50 vouchers for initial load
      }
    });

    if (vouchersResponse.data.success) {
      vouchersList = vouchersResponse.data.vouchers || [];
    }
  } catch (error) {
    console.log('API fetch failed, using empty data fallback');
    // Empty fallback - no mock data
  }

  return { 
    user, 
    voucherMetrics,
    vouchers: vouchersList
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

const EmptyMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((item) => (
      <Card key={item}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="p-2 sm:p-3 bg-gray-100 rounded-full">
              <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gray-300 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function Vouchers({ loaderData }: { loaderData: LoaderData }) {
  const { user, voucherMetrics, vouchers } = loaderData;

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
  const hasMetrics = safeMetrics.total_vouchers > 0 || safeMetrics.total_usage > 0;

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // You can add a toast notification here
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Vouchers</h1>
              <p className="text-muted-foreground mt-1">Manage and track all voucher codes</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Create Voucher
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          {hasMetrics ? (
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
                      <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
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
          ) : (
            <EmptyMetrics />
          )}

          {/* Vouchers Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Vouchers</CardTitle>
              <CardDescription>
                {hasVouchers 
                  ? `Manage and view all ${safeVouchers.length} voucher codes` 
                  : 'No vouchers available. Create your first voucher to get started.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasVouchers ? (
                <div className="rounded-md">
                  <DataTable 
                    columns={columns} 
                    data={vouchersWithStatus}
                    filterConfig={voucherFilterConfig}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by voucher name..."
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
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="w-4 h-4"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="w-4 h-4"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    accessorKey: "discount_type",
    header: "Discount Type",
    cell: ({ row }: { row: any}) => {
      const type = row.getValue("discount_type") as string;
      const getIcon = (type: string) => {
        switch(type) {
          case 'percentage': return <Percent className="w-3 h-3" />;
          case 'fixed': return <DollarSign className="w-3 h-3" />;
          default: return <Tag className="w-3 h-3" />;
        }
      };
      const getLabel = (type: string) => {
        switch(type) {
          case 'percentage': return 'Percentage';
          case 'fixed': return 'Fixed Amount';
          default: return type;
        }
      };
      
      return (
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {getIcon(type)}
          <span>{getLabel(type)}</span>
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
    accessorKey: "minimum_spend",
    header: "Minimum Spend",
    cell: ({ row }: { row: any}) => {
      const minSpend = row.getValue("minimum_spend");
      return (
        <div className="text-xs sm:text-sm">
          {minSpend ? `₱${minSpend}` : 'No minimum'}
        </div>
      );
    },
  },
  {
    accessorKey: "maximum_usage",
    header: "Max Usage",
    cell: ({ row }: { row: any}) => {
      const maxUsage = row.getValue("maximum_usage");
      return (
        <div className="text-xs sm:text-sm text-center">
          {maxUsage || 'Unlimited'}
        </div>
      );
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
    accessorKey: "usage_count",
    header: "Usage",
    cell: ({ row }: { row: any}) => {
      const usage = row.original.usage_count || 0;
      const maxUsage = row.original.maximum_usage;
      
      return (
        <div className="text-xs sm:text-sm">
          <div className="text-center">{usage}{maxUsage ? `/${maxUsage}` : ''}</div>
          {maxUsage && (
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className="bg-blue-600 h-1 rounded-full" 
                style={{ width: `${Math.min((usage / maxUsage) * 100, 100)}%` }}
              />
            </div>
          )}
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