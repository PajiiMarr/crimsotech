// app/routes/admin/shops.tsx
import type { Route } from './+types/shops'
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
} from 'recharts';
import { 
  Store,
  Users,
  Star,
  MapPin,
  TrendingUp,
  Package,
  ArrowUpDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shops | Admin",
    },
  ];
}

interface Shop {
  id: string;
  name: string;
  owner: string;
  location: string;
  followers: number;
  products: number;
  rating: number;
  totalRatings: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  joinedDate: string;
  totalSales: number;
  activeBoosts: number;
  verified: boolean;
}

interface LoaderData {
  user: any;
  shopMetrics: {
    total_shops: number;
    total_followers: number;
    avg_rating: number;
    verified_shops: number;
    top_shop_name: string;
  };
  shops: Shop[];
  analytics: {
    top_shops_by_rating: Array<{
      name: string;
      rating: number;
      followers: number;
    }>;
    top_shops_by_followers: Array<{
      name: string;
      followers: number;
      rating: number;
    }>;
    shops_by_location: Array<{
      name: string;
      value: number;
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

  let shopMetrics = null;
  let shopsList = [];
  let analyticsData = null;

  try {
    // Fetch shop metrics from the backend
    const metricsResponse = await AxiosInstance.get('/admin-shops/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      shopMetrics = metricsResponse.data.metrics;
    }

    // Fetch analytics data for charts
    const analyticsResponse = await AxiosInstance.get('/admin-shops/get_analytics_data/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (analyticsResponse.data.success) {
      analyticsData = analyticsResponse.data.analytics;
    }

    // Fetch shops list
    const shopsResponse = await AxiosInstance.get('/admin-shops/get_shops_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (shopsResponse.data.success) {
      shopsList = shopsResponse.data.shops;
    }

    

  } catch (error) {
    console.error('Error fetching shop data:', error);
    // Use fallback data structure
    shopMetrics = {
      total_shops: 0,
      total_followers: 0,
      avg_rating: 0,
      verified_shops: 0,
      top_shop_name: "No shops"
    };
    
    analyticsData = {
      top_shops_by_rating: [],
      top_shops_by_followers: [],
      shops_by_location: []
    };
  }

  return { 
    user, 
    shopMetrics,
    shops: shopsList,
    analytics: analyticsData
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user, shopMetrics, shops, analytics } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading shops...</div>
      </div>
    );
  }

  const shopFilterConfig = {
    status: {
      options: [...new Set(loaderData.shops.map(shop => shop.status))],
      placeholder: 'Status'
    },
    owner: {
      options: [...new Set(loaderData.shops.map(shop => shop.owner))],
      placeholder: 'Owner'
    },
    location: {
      options: [...new Set(loaderData.shops.map(shop => shop.location))],
      placeholder: 'Location'
    },
    verification: {
      options: ['Verified', 'Unverified'],
      placeholder: 'Verification Status'
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Shops</h1>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Shops</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.total_shops}</p>
                    <p className="text-xs text-muted-foreground mt-2">{shopMetrics.verified_shops} verified</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Store className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Followers</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.total_followers.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Across all shops</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{shopMetrics.avg_rating.toFixed(1)}★</p>
                    <p className="text-xs text-muted-foreground mt-2">Overall quality</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Shop</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{shopMetrics.top_shop_name}</p>
                    <p className="text-xs text-muted-foreground mt-2">Highest rated</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Shops by Rating */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Top 5 Shops by Rating</CardTitle>
                <CardDescription>Highest rated shops on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.top_shops_by_rating} layout="vertical">
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="rating" fill="#10b981" name="Rating" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Shops by Followers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Top 5 Shops by Followers</CardTitle>
                <CardDescription>Most followed shops on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.top_shops_by_followers}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="followers" fill="#3b82f6" name="Followers" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Shops by Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Shops by Location</CardTitle>
              <CardDescription>Geographic distribution of shops</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.shops_by_location}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.shops_by_location.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Shops Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Shops</CardTitle>
              <CardDescription>Manage and view all shop details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <DataTable 
                  columns={columns} 
                  data={loaderData.shops}
                  filterConfig={shopFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search shop..."
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

const columns: ColumnDef<Shop>[] = [
  {
    accessorKey: "name",
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
        <div className="font-medium text-xs sm:text-sm">{row.getValue("name")}</div>
        {row.original.verified && (
          <Badge variant="secondary" className="text-xs">Verified</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">{row.getValue("owner")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <MapPin className="w-3 h-3 text-muted-foreground" />
        {row.getValue("location")}
      </div>
    ),
  },
  {
    accessorKey: "followers",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Followers
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("followers").toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "products",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Products
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Package className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        {row.getValue("products")}
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }: { row: any}) => (
      <div className="flex items-center gap-1 text-xs sm:text-sm">
        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
        <span>{row.getValue("rating")}</span>
        <span className="text-xs text-muted-foreground">({row.original.totalRatings})</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any}) => (
      <Badge 
        variant={row.getValue("status") === 'Active' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {row.getValue("status")}
      </Badge>
    ),
  },
];

