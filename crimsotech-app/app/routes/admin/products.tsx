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
  Eye, 
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Zap,
  ArrowUpDown,
  RefreshCw,
  Tag,
  CheckCircle,
  Clock,
  Archive,
  Ban,
  XCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  AlertOctagon
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
  id: string;
  name: string;
  category: string;
  shop: string;
  price: string;
  quantity: number;
  condition: string;
  status: string;
  upload_status: string;
  is_removed: boolean;
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

interface Category {
  id: string;
  name: string;
  shop_id: string | null;
  shop_name: string | null;
  user_id: string | null;
  username: string | null;
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
  categories: Category[];
  filterOptions?: FilterOptions;
  dateRange?: {
    start: string;
    end: string;
    rangeType: string;
  };
}

// Helper function to normalize status
const normalizeStatus = (status: string): string => {
  if (!status) return 'Unknown';
  const lowerStatus = status.toLowerCase();
  
  switch (lowerStatus) {
    case 'active':
    case 'published':
      return 'Active';
    case 'delivered':
      return 'Delivered';
    case 'suspended':
      return 'Suspended';
    case 'draft':
      return 'Draft';
    case 'archived':
      return 'Archived';
    case 'removed':
    case 'is_removed':
      return 'Removed';
    case 'pending':
    case 'processing':
      return 'Pending';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'out of stock':
    case 'out_of_stock':
      return 'Out of Stock';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to get status badge variant and styling
const getStatusConfig = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  
  switch (normalizedStatus) {
    case 'Active':
    case 'Published':
      return {
        variant: 'default' as const,
        className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
        icon: CheckCircle,
        iconClassName: 'text-green-600'
      };
    case 'Delivered':
    case 'Completed':
      return {
        variant: 'default' as const,
        className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        icon: CheckCircle,
        iconClassName: 'text-blue-600'
      };
    case 'Suspended':
    case 'Banned':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        icon: Ban,
        iconClassName: 'text-red-600'
      };
    case 'Draft':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Clock,
        iconClassName: 'text-gray-600'
      };
    case 'Archived':
      return {
        variant: 'outline' as const,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        icon: Archive,
        iconClassName: 'text-purple-600'
      };
    case 'Removed':
    case 'Cancelled':
      return {
        variant: 'destructive' as const,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        icon: XCircle,
        iconClassName: 'text-rose-600'
      };
    case 'Pending':
    case 'Processing':
      return {
        variant: 'secondary' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        icon: Clock,
        iconClassName: 'text-amber-600'
      };
    case 'Out of Stock':
      return {
        variant: 'secondary' as const,
        className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
        icon: AlertTriangle,
        iconClassName: 'text-orange-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Circle,
        iconClassName: 'text-gray-600'
      };
  }
};

// Helper function to get upload status badge styling
const getUploadStatusConfig = (uploadStatus: string) => {
  if (!uploadStatus) return {
    variant: 'secondary' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    icon: Circle,
    iconClassName: 'text-gray-600'
  };
  
  const lowerStatus = uploadStatus.toLowerCase();
  
  switch (lowerStatus) {
    case 'published':
      return {
        variant: 'default' as const,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        icon: PlayCircle,
        iconClassName: 'text-emerald-600'
      };
    case 'draft':
      return {
        variant: 'secondary' as const,
        className: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
        icon: PauseCircle,
        iconClassName: 'text-slate-600'
      };
    case 'archived':
      return {
        variant: 'outline' as const,
        className: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
        icon: Archive,
        iconClassName: 'text-violet-600'
      };
    case 'scheduled':
      return {
        variant: 'secondary' as const,
        className: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
        icon: Clock,
        iconClassName: 'text-cyan-600'
      };
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        icon: Circle,
        iconClassName: 'text-gray-600'
      };
  }
};

// Helper function to get removed status styling
const getRemovedStatusConfig = () => {
  return {
    variant: 'destructive' as const,
    className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    icon: AlertOctagon,
    iconClassName: 'text-rose-600'
  };
};

// Helper function to normalize upload status display
const normalizeUploadStatus = (uploadStatus: string): string => {
  if (!uploadStatus) return 'Unknown';
  const lowerStatus = uploadStatus.toLowerCase();
  
  switch (lowerStatus) {
    case 'published':
      return 'Published';
    case 'draft':
      return 'Draft';
    case 'archived':
      return 'Archived';
    case 'scheduled':
      return 'Scheduled';
    default:
      return uploadStatus.charAt(0).toUpperCase() + uploadStatus.slice(1).toLowerCase();
  }
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
  let productsList: Product[] = [];
  let categoriesList: Category[] = [];
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

    // Fetch categories separately using the new endpoint
    const categoriesResponse = await AxiosInstance.get(`/admin-products/get_categories/`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (categoriesResponse.data.success) {
      categoriesList = categoriesResponse.data.categories;
      console.log('Loaded categories:', categoriesList.length);
    }

    // Fetch products list with date range
    const productsParams = new URLSearchParams();
    if (startDate) productsParams.append('start_date', startDate);
    else productsParams.append('start_date', defaultStartDate.toISOString().split('T')[0]);
    
    if (endDate) productsParams.append('end_date', endDate);
    else productsParams.append('end_date', defaultEndDate.toISOString().split('T')[0]);
    
    if (rangeType) productsParams.append('range_type', rangeType);
    
    const productsResponse = await AxiosInstance.get(`/admin-products/get_products_list/?${productsParams.toString()}`, {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if (productsResponse.data.success) {
      productsList = productsResponse.data.products;
      
      // Normalize product statuses for consistency
      productsList = productsList.map(product => ({
        ...product,
        status: normalizeStatus(product.status),
        upload_status: normalizeUploadStatus(product.upload_status)
      }));
      
      // Extract unique filter values from products data
      if (productsList.length > 0) {
        const uniqueCategories: string[] = [...new Set(productsList.map((product: Product) => product.category))].filter(Boolean) as string[];
        const uniqueStatuses: string[] = [...new Set(productsList.map((product: Product) => product.status))].filter(Boolean) as string[];
        const uniqueShops: string[] = [...new Set(productsList.map((product: Product) => product.shop))].filter(Boolean) as string[];
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
    categories: categoriesList,
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

// Status Badge Component
function StatusBadge({ status, type = 'status' }: { status: string; type?: 'status' | 'upload' | 'removed' }) {
  let config;
  
  if (type === 'removed') {
    config = getRemovedStatusConfig();
  } else if (type === 'upload') {
    config = getUploadStatusConfig(status);
  } else {
    config = getStatusConfig(status);
  }
  
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {status}
    </Badge>
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
    categories: initialCategories,
    filterOptions: initialFilterOptions,
    dateRange: initialDateRange 
  } = loaderData;
  
  // Debug logging
  console.log('User object:', user);
  console.log('User ID:', user?.id);
  console.log('Initial categories:', initialCategories.length);
  
  // State for managing data
  const [productMetrics, setProductMetrics] = useState(initialMetrics);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: initialDateRange?.start ? new Date(initialDateRange.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: initialDateRange?.end ? new Date(initialDateRange.end) : new Date(),
    rangeType: (initialDateRange?.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') || 'weekly'
  });

  // Calculate category stats from all categories
  useEffect(() => {
    if (categories.length > 0) {
      const categoryProductCount: Record<string, number> = {};
      
      categories.forEach(category => {
        categoryProductCount[category.name] = 0;
      });
      
      products.forEach(product => {
        const categoryName = product.category || 'Uncategorized';
        if (categoryProductCount[categoryName] !== undefined) {
          categoryProductCount[categoryName] += 1;
        } else {
          categoryProductCount[categoryName] = 1;
        }
      });
      
      const totalProducts = products.length;
      const stats = Object.entries(categoryProductCount).map(([name, count]) => ({
        name,
        count,
        percentage: totalProducts > 0 ? (count / totalProducts) * 100 : 0
      })).sort((a, b) => b.count - a.count);
      
      setCategoryStats(stats);
    } else if (products.length > 0) {
      const categoryCounts: Record<string, number> = {};
      
      products.forEach(product => {
        const category = product.category || 'Uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      const totalProducts = products.length;
      const stats = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalProducts) * 100
      })).sort((a, b) => b.count - a.count);
      
      setCategoryStats(stats);
    } else {
      setCategoryStats([]);
    }
  }, [categories, products]);

  // Fetch data function with date range
  const fetchProductData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', start.toISOString().split('T')[0]);
      params.append('end_date', end.toISOString().split('T')[0]);
      params.append('range_type', rangeType);

      const metricsResponse = await AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`);
      
      if (metricsResponse.data.success) {
        setProductMetrics(metricsResponse.data.metrics);
      }

      const categoriesResponse = await AxiosInstance.get(`/admin-products/get_categories/`);
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.categories);
      }

      const productsParams = new URLSearchParams(params);
      const productsResponse = await AxiosInstance.get(`/admin-products/get_products_list/?${productsParams.toString()}`);

      if (productsResponse.data.success) {
        const normalizedProducts = productsResponse.data.products.map((product: Product) => ({
          ...product,
          status: normalizeStatus(product.status),
          upload_status: normalizeUploadStatus(product.upload_status)
        }));
        
        setProducts(normalizedProducts);
        
        if (normalizedProducts.length > 0) {
          const uniqueCategories: string[] = [...new Set(normalizedProducts.map((product: Product) => product.category))].filter(Boolean) as string[];
          const uniqueStatuses: string[] = [...new Set(normalizedProducts.map((product: Product) => product.status))].filter(Boolean) as string[];
          const uniqueShops: string[] = [...new Set(normalizedProducts.map((product: Product) => product.shop))].filter(Boolean) as string[];
          const uniqueConditions: string[] = [...new Set(normalizedProducts.map((product: Product) => product.condition))].filter(Boolean) as string[];

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

  // Function to refresh categories
  const refreshCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesResponse = await AxiosInstance.get(`/admin-products/get_categories/`);
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.categories);
        console.log('Categories refreshed:', categoriesResponse.data.categories.length);
        toast.success('Categories refreshed successfully');
      }
      
      await fetchProductData(dateRange.start, dateRange.end, dateRange.rangeType);
    } catch (error) {
      console.error('Error refreshing categories:', error);
      toast.error('Failed to refresh categories');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update product status
  const updateProductStatus = async (productId: string, actionType: string, reason?: string, suspensionDays?: number) => {
    setIsLoading(true);
    try {
      const payload = {
        product_id: productId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason }),
        ...(suspensionDays && { suspension_days: suspensionDays })
      };

      const response = await AxiosInstance.put('/admin-products/update_product_status/', payload, {
        headers: {
          "X-User-Id": user?.id || ''
        }
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || 'Product status updated successfully');
        await fetchProductData(dateRange.start, dateRange.end, dateRange.rangeType);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update product status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating product status:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update product status');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
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
                  <CardDescription>
                    Total categories: {categories.length} | Total products: {products.length}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshCategories}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <AddCategoryModalDrawer 
                    onCategoryAdded={refreshCategories} 
                    userId={user?.id || ''}
                  />
                </div>
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
                        
                        <div className="text-xs mt-1 opacity-75">
                          {category.percentage.toFixed(1)}% of total
                        </div>
                        
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
      const priceStr = row.getValue("price") as string;
      
      // Check if it's a range (contains " - ")
      if (priceStr.includes(' - ')) {
        return <div className="font-medium">{priceStr}</div>;
      }
      
      // Try to parse as number for single price
      const priceNum = parseFloat(priceStr);
      if (!isNaN(priceNum)) {
        const formatted = new Intl.NumberFormat('en-PH', {
          style: 'currency',
          currency: 'PHP',
        }).format(priceNum);
        return <div className="font-medium">{formatted}</div>;
      }
      
      // Return as is if not a number (e.g., "No price")
      return <div className="font-medium text-gray-500">{priceStr}</div>;
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
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const product = row.original;
      
      return (
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={status} type="status" />
          <StatusBadge status={product.upload_status} type="upload" />
          {product.is_removed && (
            <StatusBadge status="Removed" type="removed" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => {
      const rating = row.getValue("rating");
      const numericRating = typeof rating === 'number' ? rating : parseFloat(rating as string) || 0;
      
      return (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span>{numericRating.toFixed(1)}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      
      const handleAction = async (actionType: string) => {
        let reason = '';
        let suspensionDays = 7;

        if (actionType === 'remove' || actionType === 'suspend') {
          reason = prompt(`Enter reason for ${actionType === 'remove' ? 'removal' : 'suspension'}:`) || '';
          if (!reason) {
            toast.error('Reason is required');
            return;
          }
          
          if (actionType === 'suspend') {
            const daysInput = prompt('Enter suspension days (default: 7):', '7');
            suspensionDays = parseInt(daysInput || '7', 10);
            if (isNaN(suspensionDays) || suspensionDays <= 0) {
              suspensionDays = 7;
            }
          }
        }

        try {
          const payload = {
            product_id: product.id,
            action_type: actionType,
            user_id: (window as any).user?.id || '',
            ...(reason && { reason }),
            ...(suspensionDays && { suspension_days: suspensionDays })
          };

          const response = await AxiosInstance.put('/admin-products/update_product_status/', payload);
          
          if (response.data.success || response.data.message) {
            toast.success(response.data.message || 'Product status updated successfully');
            window.location.reload();
          } else {
            toast.error(response.data.error || 'Failed to update product status');
          }
        } catch (error: any) {
          console.error('Error updating product status:', error);
          toast.error(error.response?.data?.error || 'Failed to update product status');
        }
      };

      const getAvailableActions = () => {
        const actions = [];
        
        const normalizedStatus = normalizeStatus(product.status);
        const normalizedUploadStatus = normalizeUploadStatus(product.upload_status);
        
        if (normalizedUploadStatus === 'Draft' && !product.is_removed) {
          actions.push({ label: 'Publish', action: 'publish', variant: 'default' as const });
          actions.push({ label: 'Delete', action: 'deleteDraft', variant: 'destructive' as const });
        }
        
        if (normalizedUploadStatus === 'Published' && !product.is_removed) {
          if (normalizedStatus === 'Active') {
            actions.push({ label: 'Unpublish', action: 'unpublish', variant: 'secondary' as const });
            actions.push({ label: 'Archive', action: 'archive', variant: 'outline' as const });
            actions.push({ label: 'Suspend', action: 'suspend', variant: 'destructive' as const });
            actions.push({ label: 'Remove', action: 'remove', variant: 'destructive' as const });
          } else if (normalizedStatus === 'Suspended') {
            actions.push({ label: 'Unsuspend', action: 'unsuspend', variant: 'default' as const });
            actions.push({ label: 'Remove', action: 'remove', variant: 'destructive' as const });
          }
        }
        
        if (normalizedUploadStatus === 'Archived' && !product.is_removed) {
          actions.push({ label: 'Restore', action: 'restore', variant: 'default' as const });
          actions.push({ label: 'Remove', action: 'remove', variant: 'destructive' as const });
        }
        
        if (product.is_removed) {
          actions.push({ label: 'Restore', action: 'restoreRemoved', variant: 'default' as const });
        }
        
        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2">
          <Link 
            to={`/admin/products/${product.id}`}
            className="text-primary hover:underline"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          
          {actions.length > 0 && (
            <Select onValueChange={(value) => handleAction(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.action} value={action.action}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    },
  },
];