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
  price?: string | number
  stock: number
  stock_status?: string
  image_url: string
  status: 'active' | 'inactive' | 'draft'
  condition: 'new' | 'used' | 'refurbished'
  category: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

interface GiftListResponse {
  success: boolean
  gifts: Gift[]
  message: string
  data_source: string
  gift_limit_info?: {
    current_count: number
    limit: number
    remaining: number
  }
}

// Add loader function to get session data
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server")
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)
  const { requireRole } = await import("~/middleware/role-require.server")
  const { fetchUserRole } = await import("~/middleware/role.server")
  const { userContext } = await import("~/contexts/user-role")

  let user = (context as any).get(userContext)
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
      // await AxiosInstance.delete(`/seller-gifts/${giftId}/`)
      
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
        const response = await AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId, shop_id: shopId }
        })

        if (response.data && response.data.success) {
          const zeroPriced = (response.data.products || []).filter((p: any) => {
            const price = parseFloat(p.price || '0')
            return !isNaN(price) && price === 0
          }).map((p: any) => ({
            id: p.id || String(p.id),
            name: p.name,
            description: p.description,
            price: p.price ?? p.sku_price ?? '0',
            stock: p.quantity ?? p.total_sku_quantity ?? 0,
            stock_status: p.stock_status || ((Number(p.quantity ?? p.total_sku_quantity ?? 0) === 0) ? 'out_of_stock' : 'in_stock'),
            image_url: null,
            status: p.status,
            condition: p.condition,
            category: p.category || p.category_admin || null,
            created_at: p.created_at,
            updated_at: p.updated_at
          }))

          setGifts(zeroPriced)
        } else {
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
      // await AxiosInstance.patch(`/seller-gifts/${giftId}/`, { status: newStatus })
      
      // Update local state
      setGifts(prev => prev.map(g => 
        g.id === giftId ? { ...g, status: newStatus as Gift['status'] } : g
      ))
    } catch (error) {
      console.error('Error updating gift status:', error)
      alert('Failed to update gift status')
    }
  }

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('en-US').format(points) + ' pts'
  }

  // Format price as PHP currency
  const formatPrice = (price?: string | number) => {
    try {
      const n = parseFloat(String(price ?? '0')) || 0
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
    } catch {
      return '₱0.00'
    }
  }

  const getStockStatusBadge = (stock: number, stock_status?: string) => {
    const s = (stock_status || (stock === 0 ? 'out_of_stock' : 'in_stock')).toLowerCase()
    if (s === 'out_of_stock' || s === 'outofstock' || s === 'out-of-stock') return <Badge variant="destructive">Out of Stock</Badge>
    if (s === 'low_stock' || s === 'lowstock') return <Badge variant="outline" className="text-orange-600">Low Stock</Badge>
    return <Badge variant="default">In Stock</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      inactive: { variant: "secondary" as const, label: "Inactive" },
      draft: { variant: "outline" as const, label: "Draft" }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: "outline" as const, label: status }

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const getConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { variant: "default" as const, label: "New" },
      used: { variant: "secondary" as const, label: "Used" },
      refurbished: { variant: "outline" as const, label: "Refurbished" }
    }

    const config = conditionConfig[condition as keyof typeof conditionConfig] || 
                   { variant: "outline" as const, label: condition }

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const getCategoryName = (gift: Gift) => {
    return gift.category?.name || 'No Category'
  }

  // Define columns for the data table
  const columns: ColumnDef<Gift>[] = [
    {
      accessorKey: "name",
      header: "Gift",
      cell: ({ row }) => {
        const gift = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {gift.image_url ? (
                <img 
                  src={gift.image_url} 
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
                {gift.description}
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
          <Badge variant="outline">
            {getCategoryName(gift)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        return (
          <div className="text-right font-medium">
            {formatPrice(row.original.price)}
          </div>
        )
      },
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stock
        return (
          <div className={`text-right ${stock === 0 ? 'text-red-600 font-medium' : ''}`}>
            {stock}
          </div>
        )
      },
    },
    {
      accessorKey: "stock_status",
      header: "Stock Status",
      cell: ({ row }) => {
        return getStockStatusBadge(row.original.stock, row.original.stock_status)
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
      accessorKey: "created_at",
      header: "Date Added",
      cell: ({ row }) => {
        return formatDate(row.original.created_at)
      },
    },
    // In your seller-gift.tsx, update the actions column cell:
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
          {/* UPDATE THIS PART - Remove the asChild and use onClick */}
          <DropdownMenuItem onClick={() => window.location.href = `/seller/apply-gift?giftId=${gift.id}`}>
            <Award className="h-4 w-4 mr-2" />
            Apply Gift
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEditGift(gift.id)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Gift
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
}
  ]

  // Configuration for filters
  const filterConfig = {
    status: {
      options: ["active", "inactive", "draft"],
      placeholder: "Status"
    },
    condition: {
      options: ["new", "used", "refurbished"],
      placeholder: "Condition"
    }
  }

  if (loading) {
    return (
      <SellerSidebarLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading gifts...</div>
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
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/seller/seller-create-gift">
              <Plus className="h-4 w-4 mr-2" />
              Add Gift
            </Link>
          </Button>
        </div>



        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{gifts.length}</div>
                  <div className="text-sm text-muted-foreground">Total Gifts</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-blue-600" />
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
                  <div className="text-sm text-muted-foreground">Active Gifts</div>
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
                  <div className="text-2xl font-bold text-orange-600">
                    {gifts.filter(g => g.stock === 0).length}
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
              {giftLimitInfo && ` • ${giftLimitInfo.remaining} gifts remaining`}
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
            ) : (
              <DataTable
                columns={columns}
                data={gifts}
                searchConfig={{
                  column: "name",
                  placeholder: "Search gifts by name, description, or category..."
                }}
                filterConfig={filterConfig}
                defaultSorting={[
                  {
                    id: "created_at",
                    desc: true, // Sort by newest first
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