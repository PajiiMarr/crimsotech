"use client";

import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Search, X, Gift, Zap, Clock, MapPin, CheckCircle, MoreHorizontal, Plus, RefreshCw, Loader2, AlertCircle, InfoIcon, ShoppingBag, Edit, Trash2, Upload } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription } from '~/components/ui/alert' 
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Eye } from 'lucide-react'
import AxiosInstance from '~/components/axios/Axios'
import { useState, useEffect } from "react"
import { useNavigate, Link } from 'react-router'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "My Gifts",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}

// Gift Product type
interface GiftProduct {
  id: string
  name: string
  description: string
  price?: string | number
  category: string
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'
  seller: {
    id: string
    name: string
    rating: number
    location: string
  }
  image: string
  claimed: boolean
  claimExpiry?: string // When claim expires
  pickupLocation: string
  postedTime: string // e.g., "2 hours ago"
  views: number
  claims: number

  // Additional optional fields returned by various APIs / mapped in loadGifts
  total_sku_quantity?: number
  stock?: number
  stock_status?: string
  status?: string
  is_draft?: boolean
  created_at?: string
  is_shop_visible?: boolean
  raw?: any
}

// ----------------------------
// Compact Search Bar Component
// ----------------------------
const CompactSearchBar = ({ 
  searchTerm, 
  setSearchTerm 
}: { 
  searchTerm: string
  setSearchTerm: (term: string) => void 
}) => {
  return (
    <div className="mb-4">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search free electronics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 h-8 text-sm border-gray-300 rounded-md"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ----------------------------
// Compact Gift Card
// ----------------------------
const CompactGiftCard = ({ gift }: { gift: GiftProduct }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/gift/${gift.id}`);
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Claim gift:", gift.id);
    // API call to claim gift
  };

  // Condition badge color
  const getConditionColor = (condition: string) => {
    switch(condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Like New': return 'bg-blue-100 text-blue-800';
      case 'Good': return 'bg-yellow-100 text-yellow-800';
      case 'Fair': return 'bg-orange-100 text-orange-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative group"
    >
      {/* FREE badge */}
      <div className="absolute top-1 left-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10 flex items-center gap-0.5">
        <Gift className="h-2.5 w-2.5" />
        FREE
      </div>
      
      {/* Condition badge */}
      <div className={`absolute top-1 right-1 ${getConditionColor(gift.condition)} text-[10px] font-medium px-1.5 py-0.5 rounded z-10`}>
        {gift.condition}
      </div>
      
      {/* Image */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={gift.image}
          alt={gift.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Overlay if claimed */}
        {gift.claimed && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-white mx-auto mb-2" />
              <span className="text-white text-sm font-semibold">Claimed</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {gift.name}
        </h3>
        
        {/* Description snippet */}
        <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">
          {gift.description.substring(0, 50)}...
        </p>
        
        {/* Seller info */}
        <div className="flex items-center gap-1 mb-2">
          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-[8px] font-medium">{gift.seller.name.charAt(0)}</span>
          </div>
          <span className="text-[10px] text-gray-600">{gift.seller.name}</span>
          <span className="text-[8px] text-gray-400">• {gift.seller.rating}⭐</span>
        </div>
        
        {/* Location & Time */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
          <div className="flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            <span>{gift.pickupLocation.split(',')[0]}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span>{gift.postedTime}</span>
          </div>
        </div>
        
        {/* Stats & Claim Button */}
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">
                👁 {gift.views} views
              </span>
              <span className="text-[10px] text-gray-500">
                ✋ {gift.claims} claims
              </span>
            </div>
            
            <Button
              onClick={handleClaim}
              disabled={gift.claimed}
              size="sm"
              className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              {gift.claimed ? 'Claimed' : 'Claim'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};



// ----------------------------
// Comgift Component
// ----------------------------
export default function Comgift({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [gifts, setGifts] = useState<GiftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: convert ISO date to simple relative string
    const timeAgo = (iso?: string) => {
      if (!iso) return ''
      const diff = Date.now() - new Date(iso).getTime()
      const mins = Math.floor(diff / (1000 * 60))
      if (mins < 1) return 'Just now'
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      const days = Math.floor(hrs / 24)
      return `${days}d ago`
    }
  
    // Render a badge for stock status
    const getStockStatusBadge = (stock_status?: string) => {
      if (!stock_status) return <Badge variant="outline">Unknown</Badge>
      const s = String(stock_status).toLowerCase()
      switch (s) {
        case 'in_stock':
        case 'instock':
        case 'available':
          return <Badge variant="secondary">In Stock</Badge>
        case 'out_of_stock':
        case 'outofstock':
        case 'out-of-stock':
          return <Badge variant="destructive">Out of Stock</Badge>
        case 'low_stock':
        case 'lowstock':
          return <Badge variant="outline" className="text-orange-600">Low Stock</Badge>
        default:
          return <Badge variant="outline" className="capitalize">{stock_status}</Badge>
      }
    }
  
    // Render a badge for listing status
    const getStatusBadge = (status?: string) => {
      if (!status) return <Badge variant="outline">Unknown</Badge>
      const s = status.toLowerCase()
      if (s === 'active') return <Badge variant="secondary">Active</Badge>
      if (s === 'inactive' || s === 'archived') return <Badge variant="outline">Inactive</Badge>
      if (s === 'draft') return <Badge variant="outline">Draft</Badge>
      return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  
    // Format date or fall back to relative time
    const formatDate = (iso?: string) => {
      if (!iso) return ''
      try {
        const d = new Date(iso)
        if (isNaN(d.getTime())) return timeAgo(iso)
        return d.toLocaleDateString()
      } catch {
        return timeAgo(iso)
      }
    }

    // Format price as PHP currency (shows ₱0.00 for zero)
    const formatPrice = (price?: string | number) => {
      try {
        const n = parseFloat(String(price ?? '0')) || 0
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
      } catch (e) {
        return '₱0.00'
      }
    }

  // Fetch customer-owned gifts (zero-priced customer products)
  const loadGifts = async () => {
    setLoading(true)
    setRefreshing(true)
    setError(null)
    try {
      const headers: any = {}
      const userId = user && (user as any).user_id
      if (userId) headers['X-User-Id'] = userId

      const endpoints = [
        '/customer-product-list/products_list/',
      ];

      let res: any = null;
      for (const ep of endpoints) {
        try {
          const r = await AxiosInstance.get(ep, { headers });
          if (r && r.status === 200 && r.data) {
            res = r;
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (!res || !res.data) {
        setGifts([])
        setError('Failed to fetch gifts')
        return
      }

      const body = res.data
      const items: any[] = Array.isArray(body.products) ? body.products : (Array.isArray(body) ? body : (body.results || []))

      const zeroPriced = items.filter((p: any) => {
        // Price may be number or string; default to 0
        const price = parseFloat(String(p.price ?? '0'));
        // Some APIs mark gifts explicitly
        const isGiftFlag = p.is_gift === true || p.is_gift === 'true' || p.price === 0 || p.price === '0'
        // Show any item that's explicitly marked as gift or whose price equals 0
        return (isGiftFlag || (!isNaN(price) && price === 0))
      }).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        description: p.description || p.short_description || '',
        category: (p.category && p.category.name) || (p.category_admin && p.category_admin.name) || '',
        price: p.price ?? '0',
        total_sku_quantity: p.total_sku_quantity ?? p.quantity ?? p.stock ?? 0,
        stock: p.quantity ?? p.total_sku_quantity ?? p.stock ?? 0,
        stock_status: p.stock_status || (Number(p.quantity ?? p.total_sku_quantity ?? p.stock ?? 0) === 0 ? 'out_of_stock' : 'in_stock'),
        status: p.status || p.upload_status || 'unknown',
        is_draft: (p.is_draft === true) || (p.upload_status === 'draft') || (p.status === 'draft'),
        created_at: p.created_at || p.created_date || p.created_at_iso || '',
        condition: (p.condition || 'Good').charAt(0).toUpperCase() + (p.condition || 'Good').slice(1),
        seller: {
          id: (p.customer && (p.customer.id || p.customer)) || (p.user && p.user.id) || (p.user_id) || '',
          name: (p.shop && p.shop.name) || (p.customer && (p.customer.username || p.customer.name)) || 'Seller',
          rating: 0,
          location: ''
        },
        image: (
          p.primary_image && (typeof p.primary_image === 'string' ? p.primary_image : (p.primary_image.url || p.primary_image.file_url))
        ) || (p.media_files && p.media_files[0] && (p.media_files[0].file_url || p.media_files[0].file)) || p.image || '/api/placeholder/300/300',
        claimed: !!p.claimed || false,
        pickupLocation: p.pickup_location || (p.shop && (p.shop.city || p.shop.address)) || '',
        postedTime: timeAgo(p.created_at || p.created_at_iso || p.created_date),
        views: p.views || 0,
        claims: p.claims || 0,
        raw: p
      }))

      setGifts(zeroPriced)
    } catch (err: any) {
      console.error('Failed to fetch customer gifts', err)
      setGifts([])
      setError(err.response?.data?.message || err.message || 'Failed to fetch gifts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadGifts()
  }, [user])

  // Filter gifts based on search
  const filteredGifts = gifts.filter(gift =>
    searchTerm === "" ||
    gift.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableGifts = gifts.filter(gift => !gift.claimed).length;

  // Handlers for actions
  const navigate = useNavigate();
  const handleView = (giftId: string) => navigate(`/listings/${giftId}`);
  const handleEditListing = (productId: string) => {
    navigate(`/personal-listings/edit/${productId}`);
  };

  const handleDeleteListing = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    try {
      await AxiosInstance.delete(`/customer-products/${productId}/`);
      setGifts(prev => prev.filter(p => p.id !== productId));
      alert('Listing deleted');
    } catch (err: any) {
      console.error('Failed to delete listing:', err);
      alert(err.response?.data?.message || 'Failed to delete listing');
    }
  };

  const handleAddToShop = async (productId: string) => {
    try {
      await AxiosInstance.post(`/customer-products/${productId}/add-to-shop/`);
      setGifts(prev => prev.map(p => p.id === productId ? { ...p, is_shop_visible: true } : p));
      alert('Listing added to your shop successfully');
    } catch (err: any) {
      console.error('Failed to add to shop:', err);
      alert(err.response?.data?.message || 'Failed to add to shop');
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await AxiosInstance.patch(`/customer-products/${productId}/`, { status: newStatus });
      setGifts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
      alert(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleClaim = (giftId: string) => {
    setGifts(prev => prev.map(g => g.id === giftId ? { ...g, claimed: true } : g));
  }

  const handleRefresh = () => {
    // Re-run fetch effect by toggling user or simply calling fetch logic - call fetch via setting refreshing
    // We'll reuse fetch by calling the effect's function via a small trick: invoke the fetch inside here
    (async () => {
      setRefreshing(true)
      setError(null)
      try {
        const headers: any = {}
        const userId = user && (user as any).user_id
        if (userId) headers['X-User-Id'] = userId

        const res = await AxiosInstance.get('/customer-product-list/products_list/', { headers })
        if (res.status === 200 && res.data) {
          const body = res.data
          const items: any[] = Array.isArray(body.products) ? body.products : (Array.isArray(body) ? body : (body.results || []))

          const zeroPriced = items.filter((p: any) => {
            const price = parseFloat(String(p.price ?? '0'));
            const isGiftFlag = p.is_gift === true || p.is_gift === 'true' || price === 0;
            return (isGiftFlag || (!isNaN(price) && price === 0));
          }).map((p: any) => ({
            id: String(p.id),
            name: p.name,
            description: p.description || p.short_description || '',
            category: (p.category && p.category.name) || (p.category_admin && p.category_admin.name) || '',
            condition: (p.condition || 'Good').charAt(0).toUpperCase() + (p.condition || 'Good').slice(1),
            seller: {
              id: userId || '',
              name: (p.shop && p.shop.name) || (p.customer && (p.customer.username || p.customer.name)) || 'Seller',
              rating: 0,
              location: ''
            },
            image: (
              p.primary_image && (typeof p.primary_image === 'string' ? p.primary_image : (p.primary_image.url || p.primary_image.file_url))
            ) || (p.media_files && p.media_files[0] && (p.media_files[0].file_url || p.media_files[0].file)) || p.image || '/api/placeholder/300/300',
            claimed: !!p.claimed || false,
            pickupLocation: p.pickup_location || (p.shop && (p.shop.city || p.shop.address)) || '',
            postedTime: timeAgo(p.created_at || p.created_at_iso || p.created_date),
            views: p.views || 0,
            claims: p.claims || 0
          }))

          setGifts(zeroPriced)
        } else {
          setGifts([])
          setError(res.data?.message || 'Failed to fetch gifts')
        }
      } catch (err: any) {
        console.error('Failed to fetch customer gifts', err)
        setGifts([])
        setError(err.response?.data?.message || err.message || 'Failed to fetch gifts')
      } finally {
        setRefreshing(false)
      }
    })()
  }

  // Table layout similar to Personal Listings
  const renderTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Gifts</CardTitle>
        <CardDescription>
          {gifts.length} gift{gifts.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gift</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGifts.map(gift => (
              <TableRow key={gift.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      <img src={gift.image} alt={gift.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{gift.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{gift.description}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{gift.category || 'No Category'}</Badge></TableCell>
                <TableCell>{gift.seller.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{gift.condition}</Badge></TableCell>
                <TableCell><Badge variant={gift.claimed ? 'secondary' : 'default'}>{gift.claimed ? 'Claimed' : 'Available'}</Badge></TableCell>
                <TableCell>{gift.postedTime}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleView(gift.id)}>
                        <Eye className="h-4 w-4 mr-2 inline" />
                        View Gift
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClaim(gift.id)}>
                        Claim
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user as any}>
      <SidebarLayout>
        <section className="w-full p-3">
          {/* Compact Search bar */}
          <div className="mb-4">
            <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Gifts</h1>
              <p className="text-gray-600 mt-1">Manage your gifted items</p>
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
              >
                <Link to="/customer-create-gift">
                  <Plus className="w-4 h-4" />
                  Gift Item
                </Link>
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              You have {gifts.length} gifted item{gifts.length !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 mb-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{gifts.length}</div>
                <div className="text-sm text-muted-foreground">Total Gifts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{availableGifts}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{gifts.length - availableGifts}</div>
                <div className="text-sm text-muted-foreground">Claimed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{gifts.length}</div>
                <div className="text-sm text-muted-foreground">Recent Gifts</div>
              </CardContent>
            </Card>
          </div>
          {/* Gifts Data Table */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">{searchTerm ? `Search results for "${searchTerm}"` : "Available Electronics"}</h2>
            <span className="text-xs text-gray-500">{filteredGifts.length} items</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Gifts</CardTitle>
              <CardDescription>
                {filteredGifts.length} gift{filteredGifts.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {gifts.length === 0 ? (
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="p-3 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No gifts yet</h3>
                        <p className="text-muted-foreground text-sm mb-6">Create your first gift to share with others.</p>
                      </div>
                      <Button 
                        asChild 
                        className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                        size="lg"
                      >
                        <Link to="/customer-create-gift">
                          <Plus className="w-4 h-4" />
                          Create Your First Gift
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    'No gifts match your search.'
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
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead> --

                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGifts.map(gift => (
                        <TableRow key={gift.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                <img src={gift.image} alt={gift.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{gift.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-xs">{gift.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{gift.category || 'No Category'}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{formatPrice(gift.price)}</TableCell>
                          <TableCell className="text-right"><span className={gift.total_sku_quantity === 0 ? 'text-red-600 font-medium' : ''}>{gift.total_sku_quantity}</span></TableCell>
                          <TableCell>{getStockStatusBadge(gift.stock_status)}</TableCell>
                          <TableCell>{getStatusBadge(gift.status)}{gift.is_draft && <Badge variant="outline" className="ml-1">Draft</Badge>}</TableCell>
                          <TableCell>{formatDate(gift.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleView(gift.id)}>
                                  <Eye className="h-4 w-4 mr-2 inline" />
                                  View Listing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditListing(gift.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Listing
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddToShop(gift.id)}>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Add to Shop
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(gift.id, gift.status)}>
                                  {gift.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteListing(gift.id)} className="text-red-600 focus:text-red-600">
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
        </section>
      </SidebarLayout>
    </UserProvider>
  );
}