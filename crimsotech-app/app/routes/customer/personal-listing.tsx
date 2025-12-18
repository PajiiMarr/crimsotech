import type { Route } from './+types/personal-listing';
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from "~/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";

import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Tag,
  MoreHorizontal,
  Package,
  Upload,
  InfoIcon,
  RefreshCw,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ================================
// Meta function - page title
// ================================
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Personal Listings",
    },
  ];
}

// ================================
// Interfaces
// ================================
interface ProductMedia {
  id: string;
  url: string | null;
  type: string;
}

interface ProductSKU {
  id: string;
  option_ids: string[];
  option_map: Record<string, string>;
  sku_code: string | null;
  price: string | null;
  compare_price: string | null;
  quantity: number;
  allow_swap: boolean;
  swap_type: string;
  is_active: boolean;
  critical_trigger: number | null;
  stock_status: string;
  image: string | null;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface ProductDimensions {
  length: string | null;
  width: string | null;
  height: string | null;
  weight: string | null;
  weight_unit: string;
}

interface StatusBadge {
  type: string;
  label: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  quantity: number;
  total_sku_quantity: number;
  price: string;
  compare_price: string | null;
  upload_status: string;
  status: string;
  condition: string;
  status_badge: StatusBadge[];
  stock_status: string;
  
  category_admin: ProductCategory | null;
  category: ProductCategory | null;
  
  main_image: ProductMedia | null;
  media_count: number;
  all_media: ProductMedia[];
  
  has_variants: boolean;
  sku_count: number;
  skus: ProductSKU[];
  
  allow_swap: boolean;
  has_swap: boolean;
  swap_type: string | null;
  
  dimensions: ProductDimensions | null;
  
  critical_stock: number | null;
  is_low_stock: boolean;
  
  active_report_count: number;
  has_active_reports: boolean;
  
  created_at: string;
  updated_at: string;
  created_date: string;
  updated_date: string;
  
  is_published: boolean;
  is_draft: boolean;
  is_archived: boolean;
  is_active: boolean;
}

interface CustomerInfo {
  customer_id: string;
  product_limit: number;
  current_product_count: number;
  remaining_products: number;
}

interface SummaryStats {
  total_products: number;
  by_upload_status: {
    published: number;
    draft: number;
    archived: number;
  };
  by_product_status: {
    active: number;
    inactive: number;
  };
  swap_products: number;
  recent_products: number;
  product_limit: {
    limit: number;
    used: number;
    remaining: number;
    percentage_used: number;
  };
}

interface APIResponse {
  success: boolean;
  products: Product[];
  total_count: number;
  summary: SummaryStats;
  customer_info: CustomerInfo;
  message: string;
  filters_applied?: {
    status?: string;
    upload_status?: string;
    search?: string;
  };
}

// ================================
// Loader function - REAL DATA
// ================================
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  try {
    // Get session for authentication
    const { getSession, commitSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    
    // Import AxiosInstance for server-side request
    const { default: AxiosInstance } = await import('~/components/axios/Axios');
    
    // Fetch customer products from API
    const response = await AxiosInstance.get<APIResponse>('/customer-product-list/products_list/', {
      headers: {
        'X-User-Id': user?.user_id || ''
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch products');
    }

    return {
      user: {
        id: user?.user_id || '',
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
      },
      initialProducts: response.data.products || [],
      customerInfo: response.data.customer_info,
      summary: response.data.summary,
      totalCount: response.data.total_count,
      message: response.data.message
    };

  } catch (error: any) {
    console.error('Error fetching customer products:', error);

    // Return user data with empty products on error
    return {
      user: {
        id: user?.user_id || '',
        
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
      },
      initialProducts: [],
      customerInfo: {
        customer_id: user?.user_id || '',
        product_limit: 500,
        current_product_count: 0,
        remaining_products: 500
      },
      summary: {
        total_products: 0,
        by_upload_status: { published: 0, draft: 0, archived: 0 },
        by_product_status: { active: 0, inactive: 0 },
        swap_products: 0,
        recent_products: 0,
        product_limit: { limit: 500, used: 0, remaining: 500, percentage_used: 0 }
      },
      totalCount: 0,
      message: error.response?.data?.message || 'Failed to load products. Please try again.',
      error: error.message
    };
  }
}

// ================================
// PersonalListingsContent Component - REAL DATA
// ================================
function PersonalListingsContent({ 
  loaderData 
}: { 
  loaderData: { 
    initialProducts: Product[];
    customerInfo: CustomerInfo;
    summary: SummaryStats;
    totalCount: number;
    message: string;
    error?: string;
  } 
}) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(loaderData.initialProducts);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(loaderData.error || null);
  
  const listingLimitInfo = loaderData.customerInfo;
  const hasShop = false; // This would need to be fetched from a different endpoint

  // Helper functions
  const formatPrice = (price: string) => {
    try {
      const priceNumber = parseFloat(price);
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }).format(priceNumber);
    } catch {
      return '₱0.00';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getCategoryName = (product: Product) => {
    return product.category_admin?.name || product.category?.name || 'No Category';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "secondary", label: "Inactive" },
      draft: { variant: "outline", label: "Draft" },
      sold: { variant: "secondary", label: "Sold" }
    };

    const config = statusConfig[status.toLowerCase()] || { variant: "outline" as const, label: status };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getStockStatusBadge = (product: Product) => {
    const stockStatus = product.stock_status;
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "warning", label: string }> = {
      in_stock: { variant: "default", label: "In Stock" },
      low_stock: { variant: "warning", label: "Low Stock" },
      out_of_stock: { variant: "destructive", label: "Out of Stock" }
    };

    const config = statusConfig[stockStatus] || { variant: "secondary" as const, label: stockStatus };

    return (
      <Badge>
        {config.label}
      </Badge>
    );
  };

  const getVariantSummary = (product: Product) => {
    if (!product.has_variants) return null;

    return (
      <div className="text-xs text-muted-foreground mt-1">
        <Package className="h-3 w-3 inline mr-1" />
        {product.sku_count} variant{product.sku_count !== 1 ? 's' : ''}
      </div>
    );
  };

  // Fetch real listings
  const fetchListings = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Import AxiosInstance for client-side request
      const { default: AxiosInstance } = await import('~/components/axios/Axios');
      
      const response = await AxiosInstance.get<APIResponse>('/customer-products-list/products_list/', {
        headers: {
          'X-User-Id': loaderData.customerInfo.customer_id
        }
      });

      if (response.data.success) {
        setProducts(response.data.products || []);
      } else {
        setError(response.data.message || 'Failed to fetch products');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to refresh listings');
      console.error('Error refreshing listings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchListings();
  };

  const handleEditListing = (productId: string) => {
    navigate(`/personal-listings/edit/${productId}`);
  };

  const handleViewListing = (productId: string) => {
    navigate(`/listings/${productId}`);
  };

  const handleDeleteListing = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { default: AxiosInstance } = await import('~/components/axios/Axios');
      
      // This endpoint would need to be created
      await AxiosInstance.delete(`/customer-products/${productId}/`);
      
      // Remove from local state
      setProducts(prev => prev.filter(p => p.id !== productId));
      
      // Refresh summary info
      fetchListings();
      
    } catch (error: any) {
      alert('Failed to delete listing: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShop = async (productId: string) => {
    try {
      const { default: AxiosInstance } = await import('~/components/axios/Axios');
      
      // This endpoint would need to be created
      await AxiosInstance.post(`/customer-products/${productId}/add-to-shop/`);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_shop_visible: true } : p
      ));
      
      alert('Listing added to your shop successfully');
    } catch (error: any) {
      alert('Failed to add to shop: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { default: AxiosInstance } = await import('~/components/axios/Axios');
      
      // This endpoint would need to be created
      await AxiosInstance.patch(`/customer-products/${productId}/`, {
        status: newStatus
      });
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
      
      alert(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <div className="text-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading your listings...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personal Listings</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal item listings
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={refreshing}
            className="flex items-center gap-2"
            size="default"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            asChild 
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            size="default"
            disabled={listingLimitInfo.remaining_products === 0}
          >
            <Link to="/customer-create-product">
              <Plus className="w-4 h-4" />
              Add New Listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          You can list up to {listingLimitInfo.product_limit} items. Current: {listingLimitInfo.current_product_count}/{listingLimitInfo.product_limit} ({listingLimitInfo.remaining_products} remaining)
        </AlertDescription>
      </Alert>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{loaderData.summary.total_products}</div>
            <div className="text-sm text-muted-foreground">Total Listings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{loaderData.summary.by_upload_status.published}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{loaderData.summary.by_upload_status.draft}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{loaderData.summary.swap_products}</div>
            <div className="text-sm text-muted-foreground">Swap Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="max-w-md">
          <div className="flex items-center gap-2 border rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Listings</CardTitle>
          <CardDescription>
            {filteredProducts.length} listing{filteredProducts.length !== 1 ? 's' : ''} found
            {listingLimitInfo && ` • ${listingLimitInfo.remaining_products} listings remaining`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {products.length === 0 ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="p-3 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No listings yet
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      Create your first personal listing to start selling items.
                    </p>
                  </div>
                  <Button 
                    asChild 
                    className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                    size="lg"
                    disabled={listingLimitInfo.remaining_products === 0}
                  >
                    <Link to="/customer-create-product">
                      <Plus className="w-4 h-4" />
                      Create Your First Listing
                    </Link>
                  </Button>
                </div>
              ) : (
                'No listings match your search.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>List Status</TableHead>
                    <TableHead>Swap</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {product.main_image?.url ? (
                              <img 
                                src={product.main_image.url} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Tag className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {product.short_description}
                            </div>
                            {product.media_count > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {product.media_count} image{product.media_count !== 1 ? 's' : ''}
                              </div>
                            )}
                            {getVariantSummary(product)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryName(product)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.price)}
                        {product.compare_price && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compare_price)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={product.total_sku_quantity === 0 ? 'text-red-600 font-medium' : ''}>
                          {product.total_sku_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStockStatusBadge(product)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(product.status)}
                        {product.is_draft && (
                          <Badge variant="outline" className="ml-1">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.has_swap ? (
                          <Badge variant="default" className="bg-green-600">
                            Swap Available
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Swap</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(product.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewListing(product.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Listing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditListing(product.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Listing
                            </DropdownMenuItem>
                            {hasShop && product.is_active && (
                              <DropdownMenuItem 
                                onClick={() => handleAddToShop(product.id)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Add to Shop
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(product.id, product.status)}
                            >
                              {product.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteListing(product.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Listing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ================================
// Default component
// ================================
export default function PersonalListings({ loaderData }: Route.ComponentProps) {
  return (
    <UserProvider user={loaderData.user}>
      <SidebarLayout>
        <PersonalListingsContent loaderData={loaderData} />
      </SidebarLayout>
    </UserProvider>
  );
}