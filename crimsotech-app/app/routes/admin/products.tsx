// app/routes/admin/products.tsx
import type { Route } from './+types/products'
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
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Package,
  TrendingUp,
  AlertTriangle,
  Star,
  Zap,
  Image,
  Download,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { useState } from 'react';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Products | Admin",
    },
  ];
}

// Define proper types for our data
interface Product {
  id: number;
  name: string;
  category: string;
  shop: string;
  price: number;
  quantity: number;
  condition: string;
  status: string;
  views: number;
  purchases: number;
  favorites: number;
  rating: number;
  // boostPlan: string;
  variants: number;
  issues: number;
  lowStock: boolean;
  created_at?: string;
  updated_at?: string;
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Update your interfaces
interface ProductMetrics {
  total_products: number;
  low_stock_alert: number;
  active_boosts: number;
  avg_rating: number;
  top_products: Array<{
    name: string;
    views: number;
    purchases: number;
    favorites: number;
    total_engagement: number;
  }>;
  rating_distribution: Array<{
    name: string;
    value: number;
  }>;
  has_data: boolean;
}

interface LoaderData {
  user: any;
  productMetrics: ProductMetrics;
  products: Product[];
}

// app/routes/admin/products.tsx
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

  let productMetrics = null;
  let productsList = [];

  try {
    // Fetch product metrics from the backend
    const metricsResponse = await AxiosInstance.get('/admin-products/get_metrics/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      productMetrics = metricsResponse.data.metrics;
      console.log(productMetrics)
    }

    // Fetch products list
    const productsResponse = await AxiosInstance.get('/admin-products/get_products_list/', {
      headers: {
        "X-User-Id": session.get("userId")
      },
      params: {
        page: 1,
        page_size: 50 // Get all products for now, implement pagination later
      }
    });

    if (productsResponse.data.success) {
      productsList = productsResponse.data.products;
    }

  } catch (error) {
    console.error('Error fetching product data:', error);
    // Use fallback data from API or provide empty structure
    productMetrics = {
      total_products: 0,
      low_stock_alert: 0,
      active_boosts: 0,
      avg_rating: 0,
      top_products: [],
      rating_distribution: [
        { name: '5 Stars', value: 0 },
        { name: '4 Stars', value: 0 },
        { name: '3 Stars', value: 0 },
        { name: '2 Stars', value: 0 },
        { name: '1 Star', value: 0 }
      ],
      has_data: false
    };
  }

  return { 
    user, 
    productMetrics,
    products: productsList 
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Products({ loaderData }: { loaderData: LoaderData }) {
if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading products...</div>
      </div>
    );
  }

  const { user, productMetrics, products: initialProducts } = loaderData;
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Use real data from backend or fallback to mock data
  const metrics = productMetrics || {
    total_products: 0,
    low_stock_alert: 0,
    active_boosts: 0,
    avg_rating: 0,
    top_products: [],
    rating_distribution: [],
    has_data: false
  };

  const topProductsData = metrics.top_products.length > 0 
    ? metrics.top_products 
    : [
        { name: 'No Data', views: 0, purchases: 0, favorites: 0, total_engagement: 0 },
        { name: 'No Data', views: 0, purchases: 0, favorites: 0, total_engagement: 0 },
        { name: 'No Data', views: 0, purchases: 0, favorites: 0, total_engagement: 0 }
      ];

  const ratingDistributionData = metrics.rating_distribution.length > 0 
    ? metrics.rating_distribution 
    : [
        { name: '5 Stars', value: 0 },
        { name: '4 Stars', value: 0 },
        { name: '3 Stars', value: 0 },
        { name: '2 Stars', value: 0 },
        { name: '1 Star', value: 0 }
      ];

  const handleUpdateProduct = (productData: Partial<Product>) => {
    if (!editingProduct) return;
    
    setProducts(products.map(product => 
      product.id === editingProduct.id 
        ? { 
            ...product, 
            ...productData, 
            lowStock: (productData.quantity ?? product.quantity) < 5 
          }
        : product
    ));
    setEditingProduct(null);
  };

  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Products</h1>
            </div>
            
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold mt-1">{metrics.total_products}</p>
                    <p className="text-xs text-muted-foreground mt-2">Across all categories</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock Alert</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{metrics.low_stock_alert}</p>
                    <p className="text-xs text-muted-foreground mt-2">Need restocking</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Boosts</p>
                    <p className="text-2xl font-bold mt-1">{metrics.active_boosts}</p>
                    <p className="text-xs text-muted-foreground mt-2">Running now</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Zap className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}★` : 'No ratings'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Overall quality</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Engagement</CardTitle>
                <CardDescription>
                  {metrics.has_data ? 'Most viewed, purchased, and favorited' : 'No engagement data available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.has_data ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProductsData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#3b82f6" name="Views" />
                      <Bar dataKey="purchases" fill="#10b981" name="Purchases" />
                      <Bar dataKey="favorites" fill="#f59e0b" name="Favorites" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No engagement data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>
                  {metrics.has_data ? 'Customer feedback overview' : 'No rating data available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.has_data ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ratingDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ratingDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No rating data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Boost Performance */}
          

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns} 
                data={products} 
                filterConfig={productFilterConfig}
                searchConfig={{
                  column: "name",
                  placeholder: "Search products..."
                }}
                />
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}


const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("category")}</Badge>
    ),
  },
  {
    accessorKey: "shop",
    header: "Shop",
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(price)
      
      return (
        <div className="flex items-center gap-2">
          <span>
            {formatted}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const quantity: number = row.getValue("quantity")
      const product = row.original
      
      return (
        <div className="flex items-center gap-2">
          <span className={product.lowStock ? "text-red-600 font-medium" : ""}>
            {quantity}
          </span>
          {product.lowStock && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      if (value === "all") return true
      const quantity: number = row.getValue(id)
      const isLowStock = quantity < 5
      
      if (value === "low") return isLowStock
      if (value === "in-stock") return !isLowStock
      return true
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("status") === 'Active' ? 'default' : 'secondary'}>
        {row.getValue("status")}
      </Badge>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-yellow-500 fill-current" />
        <span>{row.getValue("rating")}</span>
      </div>
    ),
  },
  {
    id: "actions",
  },
]

const productFilterConfig = {
  category: {
    options: ['Electronics', 'Accessories', 'Fashion', 'Home & Living', 'Sports'],
    placeholder: 'Category'
  },
  status: {
    options: ['Active', 'Inactive'],
    placeholder: 'Status'
  },
  shop: {
    options: [], // Will be populated from data
    placeholder: 'Shop'
  },
  boostPlan: {
    options: ['Basic', 'Premium', 'Ultimate', 'None'],
    placeholder: 'Boost Plan'
  }
}