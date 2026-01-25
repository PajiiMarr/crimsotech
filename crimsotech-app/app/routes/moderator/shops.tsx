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
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
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
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
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

interface ShopMetrics {
  total_shops: number;
  total_followers: number;
  avg_rating: number;
  verified_shops: number;
  top_shop_name: string;
}

interface AnalyticsData {
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
}

interface LoaderData {
  user: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isModerator"]);

  return { user };
}

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  
  // State for data
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopMetrics, setShopMetrics] = useState<ShopMetrics>({
    total_shops: 0,
    total_followers: 0,
    avg_rating: 0,
    verified_shops: 0,
    top_shop_name: "No shops"
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    top_shops_by_rating: [],
    top_shops_by_followers: [],
    shops_by_location: []
  });
  
  // State for loading and date range
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  // Fetch data function
  const fetchShopData = async (start: Date, end: Date) => {
    try {
      setIsLoading(true);
      
      const params: any = {};
      params.start_date = start.toISOString();
      params.end_date = end.toISOString();

      // Fetch all data in parallel
      const [metricsResponse, shopsResponse] = await Promise.all([
        AxiosInstance.get('/moderator-shops/get_metrics/', { params }),
        AxiosInstance.get('/moderator-shops/get_shops_list/', { params })
      ]);

      if (metricsResponse.data.success) {
        setShopMetrics(metricsResponse.data.metrics);
      }

      if (shopsResponse.data.success) {
        setShops(shopsResponse.data.shops);
      }

    } catch (error) {
      console.error('Error fetching shop data:', error);
      // Use fallback empty data
      setShopMetrics({
        total_shops: 0,
        total_followers: 0,
        avg_rating: 0,
        verified_shops: 0,
        top_shop_name: "No shops"
      });
      setAnalytics({
        top_shops_by_rating: [],
        top_shops_by_followers: [],
        shops_by_location: []
      });
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchShopData(dateRange.start, dateRange.end);
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
    fetchShopData(range.start, range.end);
  };

  const shopFilterConfig = {
    status: {
      options: [...new Set(shops.map(shop => shop.status))],
      placeholder: 'Status'
    },
    owner: {
      options: [...new Set(shops.map(shop => shop.owner))],
      placeholder: 'Owner'
    },
    location: {
      options: [...new Set(shops.map(shop => shop.location))],
      placeholder: 'Location'
    },
    verification: {
      options: ['Verified', 'Unverified'],
      placeholder: 'Verification Status'
    }
  };

  // Loading skeleton for metrics
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

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Shops</h1>
            </div>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
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
              </>
            )}
          </div>

          {/* Analytics Charts */}
          {!isLoading && analytics.top_shops_by_rating.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Shops by Rating */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Shops by Rating</CardTitle>
                  <CardDescription>
                    Top 10 shops based on customer ratings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.top_shops_by_rating}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value}★`, 'Rating']}
                        labelFormatter={(label) => `Shop: ${label}`}
                      />
                      <Bar dataKey="rating" fill="#3b82f6" name="Rating (★)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Shops by Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shops by Location</CardTitle>
                  <CardDescription>
                    Distribution of shops across locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.shops_by_location}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.shops_by_location.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [value, 'Shops']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Shops by Followers */}
          {!isLoading && analytics.top_shops_by_followers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Shops by Followers</CardTitle>
                <CardDescription>
                  Most followed shops in the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {analytics.top_shops_by_followers.slice(0, 5).map((shop, index) => (
                    <Card key={index} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
                            {shop.name.charAt(0)}
                          </div>
                          <p className="font-medium text-sm truncate w-full">{shop.name}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{shop.followers.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{shop.rating.toFixed(1)}★</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shops Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Shops</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading shops...' : `Showing ${shops.length} shops`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={shops}
                  filterConfig={shopFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search shop..."
                  }}
                  isLoading={isLoading}
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
        variant={row.getValue("status") === 'Active' ? 'default' : 
                row.getValue("status") === 'Inactive' ? 'secondary' : 'destructive'}
        className="text-xs"
      >
        {row.getValue("status")}
      </Badge>
    ),
  },
  {
    accessorKey: "totalSales",
    header: "Total Sales",
    cell: ({ row }: { row: any}) => (
      <div className="text-xs sm:text-sm">
        ₱{parseFloat(row.getValue("totalSales")).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const shop = row.original
      return (
        <div className="flex items-center gap-2">
          <Link 
            to={`/moderator/shops/${shop.id}`}
            className="text-primary hover:underline text-xs sm:text-sm"
          >
            View Details
          </Link>
        </div>
      )
    },
  },
];