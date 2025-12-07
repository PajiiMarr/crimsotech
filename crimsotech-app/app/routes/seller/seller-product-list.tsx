import type { Route } from './+types/seller-product-list'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import AxiosInstance from '~/components/axios/Axios';
import { Link, useLoaderData } from "react-router";
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Search, Plus, Edit, Trash2, Eye, Store, Tag, MoreHorizontal, Package } from "lucide-react";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller | Product List",
    },
  ];
}

interface VariantOption {
  id: string;
  title: string;
  quantity: number;
  price: string;
}

interface Variant {
  id: string;
  title: string;
  options: VariantOption[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  used_for?: string;
  status: string;
  condition: string;
  upload_status: string; 
  shop: {
    id: string;
    name: string;
  } | null;
  category_admin: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  variants?: Variant[];
  created_at: string;
  updated_at: string;
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

// Add loader function to get session data
export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  
  return { userId, shopId };
}

export default function SellerProductList() {
  const { userId, shopId } = useLoaderData<typeof loader>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productLimitInfo, setProductLimitInfo] = useState<{
    current_count: number;
    limit: number;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) {
        console.error('No user ID found in session');
        setLoading(false);
        return;
      }

      try {
        const response = await AxiosInstance.get<ProductListResponse>('/seller-products/', {
          params: {
            customer_id: userId
          }
        });
        
        if (response.data.success) {
          setProducts(response.data.products || []);
          setProductLimitInfo(response.data.product_limit_info || null);
        } else {
          console.error('Failed to fetch products:', response.data.message);
          setProducts([]);
        }
      } catch (error: any) {
        console.error('Error fetching products:', error);
        console.error('Error response:', error.response?.data);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [userId]);

  const handleEditProduct = (productId: string) => {
    console.log('Edit product:', productId);
    // Navigate to edit page or open edit modal
  };

  const handleViewProduct = (productId: string) => {
    console.log('View product:', productId);
    // Navigate to product detail page
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      // Add your delete API call here
      console.log('Delete product:', productId);
      // await AxiosInstance.delete(`/seller-products/${productId}/`);
      
      // Remove product from local state
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      // Add your status update API call here
      console.log('Toggle status:', productId, newStatus);
      // await AxiosInstance.patch(`/seller-products/${productId}/`, { status: newStatus });
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const formatPrice = (price: string) => {
    const priceNumber = parseFloat(price);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(priceNumber);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (product: Product) => {
    return product.category_admin?.name || product.category?.name || 'No Category';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      inactive: { variant: "secondary" as const, label: "Inactive" },
      draft: { variant: "outline" as const, label: "Draft" },
      sold: { variant: "secondary" as const, label: "Sold" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: "outline" as const, label: status };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const hasVariants = (product: Product) => {
    return product.variants && product.variants.length > 0;
  };

  const getVariantSummary = (product: Product) => {
    if (!hasVariants(product)) return null;

    const totalOptions = product.variants?.reduce((sum, variant) => 
      sum + (variant.options?.length || 0), 0) || 0;
    
    const variantTypes = product.variants?.map(v => v.title).join(', ') || '';

    return (
      <div className="text-xs text-muted-foreground mt-1">
        <Package className="h-3 w-3 inline mr-1" />
        Variants: {variantTypes} ({totalOptions} options)
      </div>
    );
  };

  if (loading) {
    return (
      <SellerSidebarLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading products...</div>
            </CardContent>
          </Card>
        </div>
      </SellerSidebarLayout>
    );
  }

  return (
    <SellerSidebarLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product List</h1>
            <p className="text-muted-foreground">
              Manage your products and inventory
            </p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/seller/seller-create-product">
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Link>
          </Button>
        </div>

        {/* Product Limit Info */}
        {productLimitInfo && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">Product Limit</h3>
                  <p className="text-blue-700 text-sm">
                    {productLimitInfo.current_count} / {productLimitInfo.limit} products used 
                    ({productLimitInfo.remaining} remaining)
                  </p>
                </div>
                <div className="w-48 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((productLimitInfo.current_count / productLimitInfo.limit) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats and Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{products.length}</div>
              <div className="text-sm text-muted-foreground">Total Products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {products.filter(p => p.quantity === 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              {productLimitInfo && ` • ${productLimitInfo.remaining} products remaining`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!userId ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">User authentication required</div>
                <Button asChild>
                  <Link to="/login">Please log in</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Upload Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Upload Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {products.length === 0 ? 'No products found. Start by adding your first product.' : 'No products match your search.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                              <Tag className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{product.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </div>
                              {product.used_for && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Used for: {product.used_for}
                                </div>
                              )}
                              {getVariantSummary(product)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.shop ? (
                            <div className="flex items-center gap-2">
                              <Store className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{product.shop.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline">No Shop</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCategoryName(product)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(product.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={product.quantity === 0 ? 'text-red-600 font-medium' : ''}>
                            {product.quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {product.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(product.upload_status)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(product.status)}
                        </TableCell>

                        <TableCell>
                          <Badge variant={
                            product.upload_status === 'published' ? 'default' :
                            product.upload_status === 'draft' ? 'secondary' :
                            'outline'
                          }>
                            {product.upload_status.charAt(0).toUpperCase() + product.upload_status.slice(1)}
                          </Badge>
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
                              <DropdownMenuItem onClick={() => handleViewProduct(product.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Product
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditProduct(product.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(product.id, product.status)}
                              >
                                {product.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerSidebarLayout>
  );
}