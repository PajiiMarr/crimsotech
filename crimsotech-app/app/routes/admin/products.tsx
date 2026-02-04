// app/routes/admin/products.tsx
import { toast } from 'sonner';
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
import { Link } from 'react-router'
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Zap,
  Image,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  Tag,
  Grid,
  List,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

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
  variants: number;
  issues: number;
  lowStock: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FilterOptions {
  categories: string[];
  statuses: string[];
  shops: string[];
  boostPlans: string[];
  conditions: string[];
}

interface ProductMetrics {
  total_products: number;
  low_stock_alert: number;
  active_boosts: number;
  avg_rating: number;
  has_data: boolean;
  top_products?: any[];
  rating_distribution?: any[];
  growth_metrics?: {
    product_growth?: number;
    low_stock_growth?: number;
    previous_period_total?: number;
    previous_period_low_stock?: number;
    period_days?: number;
  };
  date_range?: {
    start_date: string;
    end_date: string;
    range_type: string;
  };
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

interface LoaderData {
  user: any;
  productMetrics: ProductMetrics;
  products: Product[];
  filterOptions?: FilterOptions;
  dateRange?: {
    start: string;
    end: string;
    rangeType: string;
  };
}

// app/routes/admin/products.tsx
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

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  // Parse URL for date range parameters
  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const rangeType = url.searchParams.get('range_type') || 'weekly';

  // Default date range (last 7 days)
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);
  const defaultEndDate = new Date();

  let productMetrics = null;
  let productsList = [];
  let filterOptions: FilterOptions = {
    categories: [],
    statuses: [],
    shops: [],
    boostPlans: [],
    conditions: []
  };

  try {
    // Build query parameters with date range
    const params = new URLSearchParams();
    
    // Add date range parameters if provided, otherwise use defaults
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

    // Fetch product metrics from the backend with date range
    const metricsResponse = await AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (metricsResponse.data.success) {
      productMetrics = metricsResponse.data.metrics;
    }

    // Fetch products list with date range
    const productsParams = new URLSearchParams();
    if (startDate) productsParams.append('start_date', startDate);
    else productsParams.append('start_date', defaultStartDate.toISOString().split('T')[0]);
    
    if (endDate) productsParams.append('end_date', endDate);
    else productsParams.append('end_date', defaultEndDate.toISOString().split('T')[0]);
    
    if (rangeType) productsParams.append('range_type', rangeType);
    
    // Add pagination parameters
    productsParams.append('page', '1');
    productsParams.append('page_size', '50');

    const productsResponse = await AxiosInstance.get(`/admin-products/get_products_list/?${productsParams.toString()}`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (productsResponse.data.success) {
      productsList = productsResponse.data.products;
      
      // Extract unique filter values from products data
      if (productsList.length > 0) {
        // Extract unique categories
        const uniqueCategories: string[] = [...new Set(productsList.map((product: Product) => product.category))].filter(Boolean) as string[];
        
        // Extract unique statuses
        const uniqueStatuses: string[] = [...new Set(productsList.map((product: Product) => product.status))].filter(Boolean) as string[];
        
        // Extract unique shops
        const uniqueShops: string[] = [...new Set(productsList.map((product: Product) => product.shop))].filter(Boolean) as string[];
        
        // Extract unique conditions (if available)
        const uniqueConditions: string[] = [...new Set(productsList.map((product: Product) => product.condition))].filter(Boolean) as string[];
        
        filterOptions = {
          categories: uniqueCategories,
          statuses: uniqueStatuses,
          shops: uniqueShops,
          boostPlans: ['Basic', 'Premium', 'Ultimate', 'None'],
          conditions: uniqueConditions
        };
      }
    }

  } catch (error) {
    console.error('Error fetching product data:', error);
    // Use fallback data
    productMetrics = {
      total_products: 0,
      low_stock_alert: 0,
      active_boosts: 0,
      avg_rating: 0,
      has_data: false,
      growth_metrics: {}
    };
  }

  return { 
    user, 
    productMetrics,
    products: productsList,
    filterOptions,
    dateRange: {
      start: startDate || defaultStartDate.toISOString().split('T')[0],
      end: endDate || defaultEndDate.toISOString().split('T')[0],
      rangeType
    }
  };
}

function AddCategoryModalDrawer({ 
  onCategoryAdded,
  userId 
}: { 
  onCategoryAdded?: () => void;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
  });

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    if (formData.name.length > 50) {
      toast.error('Category name must be 50 characters or less');
      return;
    }
    
    if (!userId) {
      toast.error('User authentication required. Please log in again.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payload = {
        name: formData.name.trim(),
        user_id: userId
      };
      
      console.log('Sending payload to /admin-products/add_category/ :', payload);
      
      // Get the session token or user ID from localStorage if available
      const sessionUserId = localStorage.getItem('userId') || userId;
      
      const response = await AxiosInstance.post('/admin-products/add_category/', payload, {
        headers: {
          "X-User-Id": sessionUserId
        }
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Category added successfully!');
        
        setFormData({
          name: '',
        });
        
        setOpen(false);
        
        if (onCategoryAdded) {
          onCategoryAdded();
        }
      } else {
        toast.error(response.data.message || 'Failed to add category');
      }
    } catch (error: any) {
      console.error('Error adding category:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to add category. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Render only ONE component based on screen size
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Add New Category</DrawerTitle>
            <DrawerDescription>
              Create a new product category. Name is required (max 50 characters).
            </DrawerDescription>
          </DrawerHeader>
          
          <form onSubmit={handleSubmit} className="px-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Electronics, Clothing, Books"
                required
                maxLength={50}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Maximum 50 characters. {50 - formData.name.length} characters remaining.
              </p>
            </div>
          </form>
          
          <DrawerFooter className="pt-2">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Category'
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Create a new product category. Name is required (max 50 characters).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Electronics, Clothing, Books"
              required
              maxLength={50}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Maximum 50 characters. {50 - formData.name.length} characters remaining.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Category'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Products({ loaderData }: { loaderData: LoaderData }) {
  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading products...</div>
      </div>
    );
  }

  const { 
    user, 
    productMetrics: initialMetrics, 
    products: initialProducts, 
    filterOptions: initialFilterOptions,
    dateRange: initialDateRange 
  } = loaderData;
  
  // Debug logging
  console.log('User object:', user);
  console.log('User ID:', user?.id);
  
  // State for managing data
  const [productMetrics, setProductMetrics] = useState(initialMetrics);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(
    initialFilterOptions || {
      categories: [],
      statuses: [],
      shops: [],
      boostPlans: [],
      conditions: []
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: initialDateRange?.start ? new Date(initialDateRange.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: initialDateRange?.end ? new Date(initialDateRange.end) : new Date(),
    rangeType: (initialDateRange?.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') || 'weekly'
  });

  // Calculate category stats from products
  useEffect(() => {
    if (products.length > 0) {
      const categoryCounts: Record<string, number> = {};
      
      // Count products per category
      products.forEach(product => {
        const category = product.category || 'Uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Convert to array and calculate percentages
      const totalProducts = products.length;
      const stats = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalProducts) * 100
      })).sort((a, b) => b.count - a.count); // Sort by count descending
      
      setCategoryStats(stats);
    } else {
      setCategoryStats([]);
    }
  }, [products]);

  // Fetch data function with date range
  const fetchProductData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      // Fetch metrics with date range
      const metricsResponse = await AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`);
      
      if (metricsResponse.data.success) {
        setProductMetrics(metricsResponse.data.metrics);
      }

      // Fetch products list with date range
      const productsParams = new URLSearchParams(params);

      const productsResponse = await AxiosInstance.get(`/admin-products/get_products_list/?${productsParams.toString()}`);

      if (productsResponse.data.success) {
        setProducts(productsResponse.data.products);
        
        // Update filter options from new data
        if (productsResponse.data.products.length > 0) {
          const uniqueCategories: string[] = [...new Set(productsResponse.data.products.map((product: Product) => product.category))].filter(Boolean) as string[];
          const uniqueStatuses: string[] = [...new Set(productsResponse.data.products.map((product: Product) => product.status))].filter(Boolean) as string[];
          const uniqueShops: string[] = [...new Set(productsResponse.data.products.map((product: Product) => product.shop))].filter(Boolean) as string[];
          const uniqueConditions: string[] = [...new Set(productsResponse.data.products.map((product: Product) => product.condition))].filter(Boolean) as string[];

          setFilterOptions({
            categories: uniqueCategories,
            statuses: uniqueStatuses,
            shops: uniqueShops,
            boostPlans: ['Basic', 'Premium', 'Ultimate', 'None'],
            conditions: uniqueConditions
          });
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
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
    fetchProductData(range.start, range.end, range.rangeType);
  };

  // Function to refresh categories (call this after adding a new category)
  const refreshCategories = () => {
    fetchProductData(dateRange.start, dateRange.end, dateRange.rangeType);
  };

  // Use real data from backend or fallback
  const metrics = productMetrics || {
    total_products: 0,
    low_stock_alert: 0,
    active_boosts: 0,
    avg_rating: 0,
    has_data: false,
    growth_metrics: {}
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get growth metrics
  const growthMetrics = metrics.growth_metrics || {};

  // Create dynamic filter config from API data
  const productFilterConfig = {
    category: {
      options: filterOptions.categories,
      placeholder: 'Category'
    },
    status: {
      options: filterOptions.statuses,
      placeholder: 'Status'
    },
    shop: {
      options: filterOptions.shops,
      placeholder: 'Shop'
    },
  };

  // Function to get a random color for category badges
  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    
    // Simple hash function to get consistent color for same category
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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

          {/* Date Range Filter */}
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics with Growth Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? '...' : metrics.total_products}
                    </p>
                    {!isLoading && growthMetrics.product_growth !== undefined && (
                      <div className={`flex items-center gap-1 mt-2 text-sm ${
                        growthMetrics.product_growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {growthMetrics.product_growth >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{formatPercentage(growthMetrics.product_growth)}</span>
                        <span className="text-xs text-muted-foreground">
                          vs previous {growthMetrics.period_days || 7} days
                        </span>
                      </div>
                    )}
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
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {isLoading ? '...' : metrics.low_stock_alert}
                    </p>
                    {!isLoading && growthMetrics.low_stock_growth !== undefined && (
                      <div className={`flex items-center gap-1 mt-2 text-sm ${
                        growthMetrics.low_stock_growth >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {growthMetrics.low_stock_growth >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{formatPercentage(growthMetrics.low_stock_growth)}</span>
                      </div>
                    )}
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
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? '...' : metrics.active_boosts}
                    </p>
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
                      {isLoading ? '...' : 
                        metrics.avg_rating > 0 ? `${metrics.avg_rating.toFixed(1)}★` : 'No ratings'
                      }
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

          {/* Categories Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Product Categories
                  </CardTitle>
                </div>
                {/* Add Category Button */}
                <AddCategoryModalDrawer 
                  onCategoryAdded={refreshCategories} 
                  userId={user?.id || ''}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-full" />
                  ))}
                </div>
              ) : categoryStats.length > 0 ? (
                <div className="space-y-4">
                  {/* Categories Grid */}
                  <div className="flex flex-wrap gap-3">
                    {categoryStats.map((category) => (
                      <div
                        key={category.name}
                        className={`group relative px-4 py-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${getCategoryColor(category.name)}`}
                        onClick={() => setSelectedCategory(category.name === selectedCategory ? 'all' : category.name)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${getCategoryColor(category.name).includes('bg-blue') ? 'bg-blue-200' : 
                              getCategoryColor(category.name).includes('bg-green') ? 'bg-green-200' :
                              getCategoryColor(category.name).includes('bg-purple') ? 'bg-purple-200' :
                              getCategoryColor(category.name).includes('bg-yellow') ? 'bg-yellow-200' :
                              getCategoryColor(category.name).includes('bg-pink') ? 'bg-pink-200' : 'bg-gray-200'
                            }`}>
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <Badge variant="secondary" className="ml-2 bg-white/50">
                            {category.count}
                          </Badge>
                        </div>
                        
                        {/* Progress bar showing percentage */}
                        <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(category.percentage, 100)}%`,
                              backgroundColor: getCategoryColor(category.name).includes('bg-blue') ? '#3b82f6' :
                                getCategoryColor(category.name).includes('bg-green') ? '#10b981' :
                                getCategoryColor(category.name).includes('bg-purple') ? '#8b5cf6' :
                                getCategoryColor(category.name).includes('bg-yellow') ? '#f59e0b' :
                                getCategoryColor(category.name).includes('bg-pink') ? '#ec4899' : '#6b7280'
                            }}
                          />
                        </div>
                        
                        {/* Percentage indicator */}
                        <div className="text-xs mt-1 opacity-75">
                          {category.percentage.toFixed(1)}% of total
                        </div>
                        
                        {/* Hover info */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-gray-300">{category.count} products</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-3 rounded-full bg-gray-100 mb-4">
                    <Tag className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Categories Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    No product categories have been created yet. Add your first category to get started.
                  </p>
                  <AddCategoryModalDrawer 
                    onCategoryAdded={refreshCategories} 
                    userId={user?.id || ''}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Products</CardTitle>
                  <CardDescription>
                    {dateRange.start && dateRange.end ? (
                      `Products from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`
                    ) : (
                      'Showing all products'
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
                    `${products.length} products found`
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
                <DataTable 
                  columns={columns} 
                  data={products} 
                  filterConfig={productFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search products..."
                  }}
                />
              )}
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
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className="flex items-center gap-2">
          <Link 
            to={`/admin/products/${product.id}`}
            className="text-primary hover:underline"
          >
            View
          </Link>
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  },
];