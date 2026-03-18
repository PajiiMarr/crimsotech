import type { Route } from './+types/seller-product-list'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { Link, useLoaderData, useNavigate } from "react-router";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Plus, Eye, Store, AlertCircle, Loader2 } from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import AxiosInstance from '~/components/axios/Axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useToast } from "~/hooks/use-toast";
import { EditProductDialog } from "~/components/seller/edit-product";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Seller | Product List" }];
}

// Define the types that match the edit-product component exactly
interface Variant {
  id: string;
  title: string;
  option_title?: string | null;
  option_ids?: any;
  option_map?: any;
  sku_code?: string | null;
  price?: number | null;
  compare_price?: number | null;
  quantity: number;
  weight?: number | null;
  weight_unit: string;
  critical_trigger?: number | null;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price?: number | null;
  usage_period?: number | null;
  usage_unit?: string | null;
  depreciation_rate?: number | null;
  minimum_additional_payment: number;
  maximum_additional_payment: number;
  swap_description?: string | null;
  image?: string | null;
  critical_stock?: number | null;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  condition: number; // Changed from string to number (1-5)
  upload_status: string;
  status: string;
  is_refundable: boolean;
  refund_days: number;
  category_admin: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  total_stock: number;
  starting_price: string | null;
  variants?: Variant[];
  media?: Array<{
    id: string;
    file_data: string | null;
    file_type: string;
  }>;
  shop?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  is_removed?: boolean;
  removal_reason?: string | null;
}

interface ProductListResponse {
  success: boolean;
  products: Product[];
  message: string;
  data_source: string;
  product_limit_info?: {
    current_count: number;
    limit: number;
    remaining: number;
  };
}

// Condition mapping for display
const CONDITION_MAP: Record<number, { label: string; icon: string; color: string }> = {
  1: {
    label: "Poor",
    icon: "★",
    color: "bg-red-100 text-red-800 border-red-300",
  },
  2: {
    label: "Fair",
    icon: "★★",
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  3: {
    label: "Good",
    icon: "★★★",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  4: {
    label: "Very Good",
    icon: "★★★★",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  5: {
    label: "Like New",
    icon: "★★★★★",
    color: "bg-green-100 text-green-800 border-green-300",
  },
};

function convertS3ToPublicUrl(s3Url: string | null | undefined): string | null {
  if (!s3Url) return null;
  try {
    const match = s3Url.match(/https:\/\/([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3\/([^/]+)\/(.+)/);
    if (match) {
      const [, projectRef, bucketName, filePath] = match;
      return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
    }
    if (s3Url.includes('/s3/')) {
      return s3Url.replace('/s3/', '/object/public/').replace('.storage.supabase.co', '.supabase.co');
    }
  } catch { /* fall through */ }
  return s3Url;
}

function getProductImage(product: Product): string | null {
  if (product.variants && product.variants.length > 0) {
    for (const variant of product.variants) {
      if (variant.image) return convertS3ToPublicUrl(variant.image);
    }
  }
  return null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  let user = (context as any).user;
  if (!user) user = await fetchUserRole({ request, context });
  await requireRole(request, context, ["isCustomer"]);
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  return { userId: session.get("userId"), shopId: session.get("shopId") };
}

export default function SellerProductList() {
  const { userId, shopId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [productLimitInfo, setProductLimitInfo] = useState<{
    current_count: number; limit: number; remaining: number;
  } | null>(null);

  // Removal reason modal
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [selectedRemovalReason, setSelectedRemovalReason] = useState('');

  // Edit dialog
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  const fetchProducts = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const response = await AxiosInstance.get<ProductListResponse>('/seller-products/', {
        params: { customer_id: userId, shop_id: shopId }
      });
      if (response.data.success) {
        setProducts(response.data.products || []);
        setProductLimitInfo(response.data.product_limit_info || null);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Optimistically update the product list after a successful edit
  const handleProductUpdated = (updated: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
    );
  };

  const handleArchive = async (productId: string) => {
    setActionLoading(productId);
    try {
      const response = await AxiosInstance.put('/seller-products/update_product_status/', {
        product_id: productId,
        action_type: 'archive',
        user_id: userId
      });
      toast({ title: "Archived", description: response.data.message, variant: "success" });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, upload_status: 'archived' } : p
      ));
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || "Failed to archive", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (productId: string) => {
    setActionLoading(productId);
    try {
      const response = await AxiosInstance.put('/seller-products/update_product_status/', {
        product_id: productId,
        action_type: 'restore',
        user_id: userId
      });
      toast({ title: "Restored", description: response.data.message, variant: "success" });
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, upload_status: 'published' } : p
      ));
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || "Failed to restore", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (productId: string) => {
    if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
    setActionLoading(productId);
    try {
      await AxiosInstance.delete(`/seller-products/${productId}/delete_product/`, {
        params: { user_id: userId }
      });
      toast({ title: "Deleted", description: "Draft deleted successfully", variant: "success" });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || "Failed to delete", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewRemovalReason = (reason?: string | null) => {
    setSelectedRemovalReason(reason || 'No removal reason provided.');
    setRemovalModalOpen(true);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

  const getCategoryName = (product: Product) =>
    product.category_admin?.name || product.category?.name || 'No Category';

  // Helper function to get condition display
  const getConditionDisplay = (condition: number): { label: string; icon: string; color: string } => {
    return CONDITION_MAP[condition] || {
      label: `Unknown (${condition})`,
      icon: "★",
      color: "bg-gray-100 text-gray-800 border-gray-300",
    };
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    const map: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      active:    { variant: "default",   label: "Active" },
      inactive:  { variant: "secondary", label: "Inactive" },
      draft:     { variant: "outline",   label: "Draft" },
      sold:      { variant: "secondary", label: "Sold" },
      published: { variant: "default",   label: "Published" },
      archived:  { variant: "outline",   label: "Archived" },
    };
    const config = map[s] || { variant: "outline" as const, label: status || '—' };
    return <Badge variant={config.variant} className="capitalize">{config.label}</Badge>;
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original;
        const isRemoved = product.is_removed;
        const imageUrl = getProductImage(product);
        return (
          <div className={`flex items-center gap-3 ${isRemoved ? 'bg-red-50 p-2 rounded' : ''}`}>
            <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 border border-border">
              <img
                src={imageUrl || '/Crimsotech.png'}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/Crimsotech.png'; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`font-medium truncate ${isRemoved ? 'text-red-800' : ''}`}>
                {product.name}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                {product.description}
              </div>
              {isRemoved && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="destructive" className="text-xs">Removed</Badge>
                  <Button variant="ghost" size="sm" className="h-6 px-2"
                    onClick={(e) => { e.stopPropagation(); handleViewRemovalReason(product.removal_reason); }}>
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "shop.name",
      header: "Shop",
      cell: ({ row }) => {
        const product = row.original;
        return product.shop ? (
          <div className={`flex items-center gap-2 ${product.is_removed ? 'text-red-700' : ''}`}>
            <Store className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{product.shop.name}</span>
          </div>
        ) : <Badge variant="outline">No Shop</Badge>;
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant={row.original.is_removed ? "destructive" : "outline"}>
          {getCategoryName(row.original)}
        </Badge>
      ),
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.original.condition;
        const conditionDisplay = getConditionDisplay(condition);
        return (
          <Badge 
            variant={row.original.is_removed ? "destructive" : "outline"} 
            className={`${!row.original.is_removed ? conditionDisplay.color : ''} flex items-center gap-1`}
          >
            <span className="text-yellow-500">{conditionDisplay.icon}</span>
            <span>{conditionDisplay.label} ({condition}/5)</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "upload_status",
      header: "Upload Status",
      cell: ({ row }) => {
        if (row.original.is_removed) return <Badge variant="destructive">Removed</Badge>;
        return getStatusBadge(row.original.upload_status);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        if (row.original.is_removed) return <Badge variant="destructive">Removed</Badge>;
        return getStatusBadge(row.original.status);
      },
    },
    {
      accessorKey: "created_at",
      header: "Date Added",
      cell: ({ row }) => (
        <span className={row.original.is_removed ? 'text-red-700' : ''}>
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        const isLoading = actionLoading === product.id;

        if (product.is_removed) {
          return (
            <Button variant="ghost" size="sm"
              onClick={() => handleViewRemovalReason(product.removal_reason)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <AlertCircle className="h-4 w-4 mr-1" />
              View Reason
            </Button>
          );
        }

        const isDraft = product.upload_status === 'draft';
        const isPublished = product.upload_status === 'published';
        const isArchived = product.upload_status === 'archived';

        const handleAction = (value: string) => {
          switch (value) {
            case 'view':
              navigate(`/seller/seller-product/${product.id}`);
              break;
            case 'edit':
              setEditProduct(product);
              break;
            case 'archive':
              handleArchive(product.id);
              break;
            case 'restore':
              handleRestore(product.id);
              break;
            case 'delete-draft':
              handleDeleteDraft(product.id);
              break;
          }
        };

        return (
          <div className="flex items-center gap-2">
            <Link
              to={`/seller/seller-product/${product.id}`}
              className="text-primary hover:text-primary/80 transition-colors"
              title="View Details"
            >
              <Eye className="w-5 h-5" />
            </Link>
            <Select onValueChange={handleAction} disabled={isLoading}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={isLoading ? "Loading…" : "Actions"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                {isPublished && <SelectItem value="archive">Archive</SelectItem>}
                {isArchived && <SelectItem value="restore">Restore</SelectItem>}
                {isDraft && (
                  <SelectItem value="delete-draft" className="text-red-600 focus:text-red-600">
                    Delete Draft
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
  ];

  const filterConfig = {
    upload_status: { options: ["published", "draft", "archived"], placeholder: "Upload Status" },
    condition: { 
      options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Like New"], 
      placeholder: "Condition" 
    }
  };

  if (loading) {
    return (
      <SellerSidebarLayout>
        <Card>
          <CardContent className="p-6">
            <div className="text-center flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div>Loading products...</div>
            </div>
          </CardContent>
        </Card>
      </SellerSidebarLayout>
    );
  }

  const outOfStockCount = products.filter(p => (p.total_stock ?? 0) === 0).length;
  const removedCount = products.filter(p => p.is_removed).length;
  const activeCount = products.filter(p => (p.status || '').toLowerCase() === 'active' && !p.is_removed).length;

  return (
    <SellerSidebarLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product List</h1>
            <p className="text-muted-foreground">Manage your products and inventory</p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/seller/seller-create-product">
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Link>
          </Button>
        </div>

        {/* Product Limit */}
        {productLimitInfo && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">Product Limit</h3>
                  <p className="text-blue-700 text-sm">
                    {productLimitInfo.current_count} / {productLimitInfo.limit} used ({productLimitInfo.remaining} remaining)
                  </p>
                </div>
                <div className="w-48 bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((productLimitInfo.current_count / productLimitInfo.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{removedCount}</div>
            <div className="text-sm text-muted-foreground">Removed</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{outOfStockCount}</div>
            <div className="text-sm text-muted-foreground">Out of Stock</div>
          </CardContent></Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              {products.length} product{products.length !== 1 ? 's' : ''} found
              {productLimitInfo && ` • ${productLimitInfo.remaining} remaining`}
              {removedCount > 0 && (
                <span className="text-red-600 ml-2">• {removedCount} removed</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!userId ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">User authentication required</div>
                <Button asChild><Link to="/login">Please log in</Link></Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={products}
                searchConfig={{ column: "name", placeholder: "Search products..." }}
                filterConfig={filterConfig}
                defaultSorting={[{ id: "created_at", desc: true }]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit product — modal on desktop, drawer on mobile */}
      <EditProductDialog
        open={!!editProduct}
        onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        product={editProduct}
        userId={userId ?? ''}
        onSuccess={handleProductUpdated}
      />

      {/* Removal reason modal */}
      <Dialog open={removalModalOpen} onOpenChange={setRemovalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Product Removal Reason
            </DialogTitle>
            <DialogDescription>
              This product has been removed from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
            <p className="text-red-800 whitespace-pre-wrap">{selectedRemovalReason}</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setRemovalModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </SellerSidebarLayout>
  );
}