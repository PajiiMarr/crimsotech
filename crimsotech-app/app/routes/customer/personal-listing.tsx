import type { Route } from './+types/personal-listing'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Link, useLoaderData } from "react-router"
import { useEffect, useState } from 'react'
import { data } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Progress } from "~/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Search, Plus, Edit, Trash2, Eye, Gift, Tag, MoreHorizontal, Package, Award, AlertCircle, Info } from "lucide-react"
import { DataTable } from "~/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Personal Listings",
    },
  ]
}

const PRODUCT_LIMIT = 20 // Set the limit to 20 products

interface Product {
  id: string
  name: string
  description: string
  total_stock: number
  status: 'active' | 'inactive' | 'draft'
  upload_status: 'draft' | 'published' | 'archived'
  condition: string
  category: {
    id: string
    name: string
  } | null
  category_admin: {
    id: string
    name: string
  } | null
  variants: Array<{
    id: string
    title: string
    quantity: number
    sku_code?: string
    critical_trigger?: number
    is_active: boolean
    image?: string | null
  }>
  // ADD THIS LINE
  primary_image?: string | null
  created_at: string
  updated_at: string
  is_removed?: boolean
  removal_reason?: string
}

interface ProductLimitInfo {
  current_count: number
  limit: number
  remaining: number
}

// Loader function to get session data
export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server")
  const { fetchUserRole } = await import("~/middleware/role.server")

  let user = (context as any).user
  if (!user) {
      user = await fetchUserRole({ request, context })
  }

  await requireRole(request, context, ["isCustomer"])

  const { getSession } = await import('~/sessions.server')
  const session = await getSession(request.headers.get("Cookie"))
  
  const userId = session.get("userId")

  return { userId }
}

export default function PersonalListings() {
  const { userId } = useLoaderData<typeof loader>()
  const [products, setProducts] = useState<Product[]>([])
  const [productLimitInfo, setProductLimitInfo] = useState<ProductLimitInfo>({
    current_count: 0,
    limit: PRODUCT_LIMIT,
    remaining: PRODUCT_LIMIT
  })
  const [loading, setLoading] = useState(true)

  const handleEditProduct = (productId: string) => {
    console.log('Edit product:', productId)
    // Navigate to edit page
  }

  const handleViewProduct = (productId: string) => {
    console.log('View product:', productId)
    // Navigate to product detail page
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      // Add your delete API call here
      console.log('Delete product:', productId)
      // await AxiosInstance.delete(`/customer-products-viewset/${productId}/`)
      
      // Remove product from local state
      setProducts(prev => prev.filter(p => p.id !== productId))
      
      // Update product limit info
      setProductLimitInfo(prev => ({
        ...prev,
        current_count: prev.current_count - 1,
        remaining: prev.remaining + 1
      }))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  // Fetch personal listings from customer products endpoint
  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        console.log('Fetching products for user:', userId)
        const response = await AxiosInstance.get('/customer-products/', {
          params: { customer_id: userId }
        })

        console.log('API Full Response:', response.data)

        if (response.data && response.data.success) {
          console.log('Products received:', response.data.products)
          
          const mappedProducts = (response.data.products || []).map((p: any) => {
  console.log('Processing product:', p)
  
  // Calculate total stock from variants
  let totalStock = 0
  if (p.variants && Array.isArray(p.variants)) {
    totalStock = p.variants.reduce((sum: number, v: any) => {
      return sum + (parseInt(v.quantity) || 0)
    }, 0)
  } else if (p.total_stock) {
    totalStock = parseInt(p.total_stock) || 0
  } else if (p.quantity) {
    totalStock = parseInt(p.quantity) || 0
  }
  
  // ADD THIS BLOCK - Get primary image
  let primaryImage = null
  if (p.primary_image?.url) {
    primaryImage = p.primary_image.url
  } else if (p.media_files && Array.isArray(p.media_files) && p.media_files.length > 0) {
    const firstMedia = p.media_files[0]
    primaryImage = firstMedia.file_url || firstMedia.file_data || null
  } else if (p.variants && Array.isArray(p.variants)) {
    const variantWithImage = p.variants.find((v: any) => v.image)
    if (variantWithImage) {
      primaryImage = variantWithImage.image
    }
  }
  
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    total_stock: totalStock,
    status: p.status || 'active',
    upload_status: p.upload_status || 'draft',
    condition: p.condition || 'New',
    category: p.category || null,
    category_admin: p.category_admin || null,
    variants: p.variants || [],
    // ADD THIS LINE
    primary_image: primaryImage,
    created_at: p.created_at,
    updated_at: p.updated_at,
    is_removed: p.is_removed,
    removal_reason: p.removal_reason
  }
})

          console.log('Final mapped products:', mappedProducts)
          setProducts(mappedProducts)
          
          // Set product limit info
          const currentCount = mappedProducts.length
          setProductLimitInfo({
            current_count: currentCount,
            limit: PRODUCT_LIMIT,
            remaining: Math.max(0, PRODUCT_LIMIT - currentCount)
          })
        } else {
          console.log('API returned success false or no products')
          setProducts([])
          setProductLimitInfo({
            current_count: 0,
            limit: PRODUCT_LIMIT,
            remaining: PRODUCT_LIMIT
          })
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
        setProductLimitInfo({
          current_count: 0,
          limit: PRODUCT_LIMIT,
          remaining: PRODUCT_LIMIT
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [userId])

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      // Add your status update API call here
      console.log('Toggle status:', productId, newStatus)
      // await AxiosInstance.patch(`/customer-products-viewset/${productId}/`, { status: newStatus })
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, status: newStatus as Product['status'] } : p
      ))
    } catch (error) {
      console.error('Error updating product status:', error)
      alert('Failed to update product status')
    }
  }

  const handleToggleUploadStatus = async (productId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published'
      // Add your status update API call here
      console.log('Toggle upload status:', productId, newStatus)
      // await AxiosInstance.patch(`/customer-products-viewset/${productId}/`, { upload_status: newStatus })
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, upload_status: newStatus as Product['upload_status'] } : p
      ))
    } catch (error) {
      console.error('Error updating product upload status:', error)
      alert('Failed to update product upload status')
    }
  }

  const getStockStatusBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (stock < 10) return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Low Stock ({stock})</Badge>
    return <Badge variant="default" className="bg-green-600">In Stock ({stock})</Badge>
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "secondary", label: "Inactive" },
      draft: { variant: "outline", label: "Draft" }
    }

    const config = statusConfig[status] || { variant: "outline", label: status }

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const getUploadStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      archived: { variant: "outline", label: "Archived" }
    }

    const config = statusConfig[status] || { variant: "outline", label: status }

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const getCategoryName = (product: Product) => {
    return product.category?.name || product.category_admin?.name || 'No Category'
  }

  const getVariantSummary = (variants: any[]) => {
    if (!variants || variants.length === 0) return 'No variants'
    const activeVariants = variants.filter(v => v.is_active !== false).length
    return `${activeVariants} variant${activeVariants !== 1 ? 's' : ''}`
  }

  // Calculate usage percentage for progress bar
  const usagePercentage = (productLimitInfo.current_count / productLimitInfo.limit) * 100
  const isLimitReached = productLimitInfo.remaining === 0
  const isNearLimit = productLimitInfo.remaining <= 5 && !isLimitReached

  // Define columns for the data table
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original
        // Get first variant image if available
        const productImage = product.primary_image || product.variants?.find(v => v.image)?.image
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {productImage ? (
                <img 
                  src={productImage} 
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Tag className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-xs">
                {product.description?.substring(0, 60)}{product.description?.length > 60 ? '...' : ''}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => {
        const product = row.original
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {getCategoryName(product)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "variants",
      header: "Variants",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="text-sm">
            {getVariantSummary(product.variants)}
          </div>
        )
      },
    },
    {
      accessorKey: "total_stock",
      header: "Total Stock",
      cell: ({ row }) => {
        const stock = row.original.total_stock
        return (
          <div className={`text-right font-medium ${stock === 0 ? 'text-red-600' : ''}`}>
            {stock}
          </div>
        )
      },
    },
    {
      accessorKey: "stock_status",
      header: "Stock Status",
      cell: ({ row }) => {
        return getStockStatusBadge(row.original.total_stock)
      },
    },
    {
      accessorKey: "upload_status",
      header: "Upload Status",
      cell: ({ row }) => {
        return getUploadStatusBadge(row.original.upload_status)
      },
    },
    {
      accessorKey: "status",
      header: "List Status",
      cell: ({ row }) => {
        return getStatusBadge(row.original.status)
      },
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.original.condition
        return (
          <Badge variant="outline" className="capitalize">
            {condition}
          </Badge>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Date Added",
      cell: ({ row }) => {
        return formatDate(row.original.created_at)
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original
        return (
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
                onClick={() => handleToggleUploadStatus(product.id, product.upload_status)}
              >
                {product.upload_status === 'published' ? 'Unpublish' : 'Publish'}
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
        )
      },
    },
  ]

  // Configuration for filters
  const filterConfig = {
    upload_status: {
      options: ["published", "draft", "archived"],
      placeholder: "Upload Status"
    },
    status: {
      options: ["active", "inactive", "draft"],
      placeholder: "List Status"
    },
    condition: {
      options: ["New", "Like New", "Refurbished", "Used - Excellent", "Used - Good"],
      placeholder: "Condition"
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your listings...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Personal Listings</h1>
            <p className="text-muted-foreground">
              Manage your personal product listings (max {PRODUCT_LIMIT} products)
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    asChild 
                    className={`${
                      isLimitReached 
                        ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={isLimitReached}
                  >
                    <Link to={isLimitReached ? '#' : "/customer-create-product"} onClick={(e) => isLimitReached && e.preventDefault()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Link>
                  </Button>
                </div>
              </TooltipTrigger>
              {isLimitReached && (
                <TooltipContent>
                  <p>You have reached the maximum limit of {PRODUCT_LIMIT} products. Delete some products to add more.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Limit Alert */}
        {isLimitReached ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              You have reached the maximum limit of {PRODUCT_LIMIT} products. 
              You cannot add more products until you delete some existing ones.
            </AlertDescription>
          </Alert>
        ) : isNearLimit ? (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              You only have {productLimitInfo.remaining} slot{productLimitInfo.remaining !== 1 ? 's' : ''} remaining out of {PRODUCT_LIMIT}. 
              Consider managing your listings.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Stats with Progress Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Product Limit Usage</span>
                  <span className={`text-sm font-bold ${
                    isLimitReached ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {productLimitInfo.current_count}/{productLimitInfo.limit}
                  </span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className={`h-2 ${
                    isLimitReached 
                      ? 'bg-red-100 [&>div]:bg-red-600' 
                      : isNearLimit 
                        ? 'bg-amber-100 [&>div]:bg-amber-600' 
                        : 'bg-green-100 [&>div]:bg-green-600'
                  }`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Used: {productLimitInfo.current_count}</span>
                  <span>Remaining: {productLimitInfo.remaining}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {products.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {products.filter(p => p.upload_status === 'published').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Published</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Products</CardTitle>
            <CardDescription>
              {products.length} product{products.length !== 1 ? 's' : ''} found
              {` • ${productLimitInfo.remaining} slot${productLimitInfo.remaining !== 1 ? 's' : ''} remaining out of ${PRODUCT_LIMIT}`}
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
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any personal listings yet.
                </p>
                <Button 
                  asChild 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isLimitReached}
                >
                  <Link to={isLimitReached ? '#' : "/customer-create-product"} onClick={(e) => isLimitReached && e.preventDefault()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Product
                  </Link>
                </Button>
                {isLimitReached && (
                  <p className="text-sm text-red-600 mt-2">
                    You've reached the maximum limit of {PRODUCT_LIMIT} products. Delete some to create new ones.
                  </p>
                )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={products}
                searchConfig={{
                  column: "name",
                  placeholder: "Search products by name..."
                }}
                filterConfig={filterConfig}
                defaultSorting={[
                  {
                    id: "created_at",
                    desc: true,
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  )
}