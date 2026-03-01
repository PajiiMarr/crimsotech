import type { Route } from './+types/seller-gift'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Link, useLoaderData } from "react-router"
import { useEffect, useState } from 'react'
import { data } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Search, Plus, Edit, Trash2, Eye, Gift, Tag, MoreHorizontal, Package, Award } from "lucide-react"
import { DataTable } from "~/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller | Gifts",
    },
  ]
}

interface Gift {
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
  created_at: string
  updated_at: string
  is_removed?: boolean
  removal_reason?: string
}

// Add loader function to get session data
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server")
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)
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
  const shopId = session.get("shopId")

  return { userId, shopId }
}

export default function SellerGiftList() {
  const { userId, shopId } = useLoaderData<typeof loader>()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [giftLimitInfo, setGiftLimitInfo] = useState<{
    current_count: number
    limit: number
    remaining: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const handleEditGift = (giftId: string) => {
    console.log('Edit gift:', giftId)
    // Navigate to edit page or open edit modal
  }

  const handleViewGift = (giftId: string) => {
    console.log('View gift:', giftId)
    // Navigate to gift detail page
  }

  const handleDeleteGift = async (giftId: string) => {
    if (!confirm('Are you sure you want to delete this gift?')) {
      return
    }

    try {
      // Add your delete API call here
      console.log('Delete gift:', giftId)
      // await AxiosInstance.delete(`/seller-products/${giftId}/`)
      
      // Remove gift from local state
      setGifts(prev => prev.filter(g => g.id !== giftId))
      
      // Update gift limit info
      if (giftLimitInfo) {
        setGiftLimitInfo({
          ...giftLimitInfo,
          current_count: giftLimitInfo.current_count - 1,
          remaining: giftLimitInfo.remaining + 1
        })
      }
    } catch (error) {
      console.error('Error deleting gift:', error)
      alert('Failed to delete gift')
    }
  }

  // Fetch zero-priced products (gifts) from seller products endpoint
  useEffect(() => {
    const fetchGifts = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        console.log('Fetching gifts for user:', userId)
        const response = await AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId }
        })

        console.log('API Full Response:', response.data)

        if (response.data && response.data.success) {
          console.log('Products received:', response.data.products)
          
          // Filter products with price = 0 (gifts)
          const zeroPriced = (response.data.products || []).filter((p: any) => {
            // Check different possible price fields
            const price = parseFloat(p.price || p.starting_price || '0')
            console.log(`Product ${p.name}: price=${price}, starting_price=${p.starting_price}`)
            return !isNaN(price) && price === 0
          }).map((p: any) => {
            console.log('Processing gift:', p)
            
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
              created_at: p.created_at,
              updated_at: p.updated_at,
              is_removed: p.is_removed,
              removal_reason: p.removal_reason
            }
          })

          console.log('Final filtered gifts:', zeroPriced)
          setGifts(zeroPriced)
          
          // Set gift limit info if available
          if (response.data.product_limit_info) {
            setGiftLimitInfo(response.data.product_limit_info)
          }
        } else {
          console.log('API returned success false or no products')
          setGifts([])
        }
      } catch (error) {
        console.error('Error fetching gifts:', error)
        setGifts([])
      } finally {
        setLoading(false)
      }
    }

    fetchGifts()
  }, [userId])

  const handleToggleStatus = async (giftId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      // Add your status update API call here
      console.log('Toggle status:', giftId, newStatus)
      // await AxiosInstance.patch(`/seller-products/${giftId}/`, { status: newStatus })
      
      // Update local state
      setGifts(prev => prev.map(g => 
        g.id === giftId ? { ...g, status: newStatus as Gift['status'] } : g
      ))
    } catch (error) {
      console.error('Error updating gift status:', error)
      alert('Failed to update gift status')
    }
  }

  const handleToggleUploadStatus = async (giftId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published'
      // Add your status update API call here
      console.log('Toggle upload status:', giftId, newStatus)
      // await AxiosInstance.patch(`/seller-products/${giftId}/`, { upload_status: newStatus })
      
      // Update local state
      setGifts(prev => prev.map(g => 
        g.id === giftId ? { ...g, upload_status: newStatus as Gift['upload_status'] } : g
      ))
    } catch (error) {
      console.error('Error updating gift upload status:', error)
      alert('Failed to update gift upload status')
    }
  }

  const getStockStatusBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>
    if (stock < 10) return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Low Stock ({stock})</Badge>
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

  const getCategoryName = (gift: Gift) => {
    return gift.category?.name || gift.category_admin?.name || 'No Category'
  }

  // Define columns for the data table
  const columns: ColumnDef<Gift>[] = [
    {
      accessorKey: "name",
      header: "Gift",
      cell: ({ row }) => {
        const gift = row.original
        // Get first variant image if available
        const variantImage = gift.variants?.find(v => v.image)?.image
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {variantImage ? (
                <img 
                  src={variantImage} 
                  alt={gift.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Gift className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{gift.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-xs">
                {gift.description?.substring(0, 60)}{gift.description?.length > 60 ? '...' : ''}
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
        const gift = row.original
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {getCategoryName(gift)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "total_stock",
      header: "Total Stock",
      cell: ({ row }) => {
        const stock = row.original.total_stock
        console.log('Rendering stock for', row.original.name, ':', stock)
        return (
          <div className={`text-center font-medium ${stock === 0 ? 'text-red-600' : ''}`}>
            {stock}
          </div>
        )
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
      accessorKey: "upload_status",
      header: "Upload Status",
      cell: ({ row }) => {
        console.log('Rendering upload status for', row.original.name, ':', row.original.upload_status)
        return getUploadStatusBadge(row.original.upload_status)
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
        const gift = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewGift(gift.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Gift
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = `/seller/apply-gift?giftId=${gift.id}`}>
                <Award className="h-4 w-4 mr-2" />
                Apply Gift
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditGift(gift.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Gift
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleToggleUploadStatus(gift.id, gift.upload_status)}
              >
                {gift.upload_status === 'published' ? 'Unpublish' : 'Publish'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleToggleStatus(gift.id, gift.status)}
              >
                {gift.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteGift(gift.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Gift
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
    }
  }

  if (loading) {
    return (
      <SellerSidebarLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading gifts...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SellerSidebarLayout>
    )
  }

  return (
    <SellerSidebarLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gift Management</h1>
            <p className="text-muted-foreground">
              Manage your loyalty program gifts and rewards
            </p>
          </div>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link to="/seller/seller-create-gift">
              <Plus className="h-4 w-4 mr-2" />
              Add Gift
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{gifts.length}</div>
                  <div className="text-sm text-muted-foreground">Total Gifts</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {gifts.filter(g => g.status === 'active').length}
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
                    {gifts.filter(g => g.upload_status === 'published').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Published</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {gifts.filter(g => g.total_stock === 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Out of Stock</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

       

        {/* Gifts Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gifts</CardTitle>
            <CardDescription>
              {gifts.length} gift{gifts.length !== 1 ? 's' : ''} found
              {giftLimitInfo && ` • ${giftLimitInfo.remaining} slots remaining`}
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
            ) : !shopId ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">No shop selected</div>
                <Button asChild>
                  <Link to="/seller/shops">Select a Shop</Link>
                </Button>
              </div>
            ) : gifts.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No gifts found</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any gifts yet. Gifts are products with price set to 0.
                </p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link to="/seller/seller-create-gift">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Gift
                  </Link>
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={gifts}
                searchConfig={{
                  column: "name",
                  placeholder: "Search gifts by name..."
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
    </SellerSidebarLayout>
  )
}