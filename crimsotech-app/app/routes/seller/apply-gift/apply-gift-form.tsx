// seller/gift/index.tsx
import { useState, useEffect } from "react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { format } from "date-fns"
import { toast } from "sonner"
import { Edit, Trash2, Gift, ShoppingCart, Package } from "lucide-react"
import AxiosInstance from '~/components/axios/Axios'

interface AppliedGift {
  id: string
  shop_id: string
  gift_product_id: string
  gift_product_name: string
  start_time: string
  end_time: string
  is_active: boolean
  eligible_product_count: number
  eligible_product_ids?: string[]
}

const getUserIdFromStorage = (): string => {
  try {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      return user.id || user.userId || ''
    }
    
    const userId = localStorage.getItem('userId') || 
                   sessionStorage.getItem('userId') || 
                   localStorage.getItem('X-User-Id') ||
                   ''
    return userId
  } catch (error) {
    console.error('Error getting user ID from storage:', error)
    return ''
  }
}

export default function GiftPromotions() {
  const [loading, setLoading] = useState(true)
  const [appliedGifts, setAppliedGifts] = useState<AppliedGift[]>([])
  const [shopId, setShopId] = useState<string>("")
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    fetchUserShop()
  }, [])

  useEffect(() => {
    if (shopId && userId) {
      fetchAppliedGifts()
    }
  }, [shopId, userId])

  const fetchUserShop = async () => {
    try {
      const storedUserId = getUserIdFromStorage()
      if (storedUserId) {
        setUserId(storedUserId)
      }

      const response = await AxiosInstance.get('/seller-shops/', {
        params: { customer_id: storedUserId }
      })
      if (response.data && response.data.success && response.data.shops.length > 0) {
        const shop = response.data.shops[0]
        setShopId(shop.id)
        localStorage.setItem('selectedShopId', shop.id)
      } else {
        const storedShopId = localStorage.getItem('selectedShopId') || 
                            localStorage.getItem('shopId') ||
                            ''
        if (storedShopId) {
          setShopId(storedShopId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch shop:", error)
      const storedShopId = localStorage.getItem('selectedShopId') || 
                          localStorage.getItem('shopId') ||
                          ''
      if (storedShopId) {
        setShopId(storedShopId)
      }
    }
  }

  const fetchAppliedGifts = async () => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get('/seller-gift/by-shop/', {
        params: { shop_id: shopId }
      })
      
      if (response.data && response.data.success) {
        setAppliedGifts(response.data.applied_gifts || [])
      } else {
        setAppliedGifts([])
      }
    } catch (error: any) {
      console.error("Failed to load gift promotions:", error)
      toast.error(error.response?.data?.error || "Failed to load gift promotions")
      setAppliedGifts([])
    } finally {
      setLoading(false)
    }
  }

  const deleteGift = async (giftId: string) => {
    if (!confirm("Are you sure you want to delete this gift promotion?")) return
    
    try {
      const response = await AxiosInstance.delete(`/seller-gift/${giftId}/`, {
        data: { customer_id: userId }
      })
      
      if (response.data.success) {
        toast.success("Gift promotion deleted successfully")
        fetchAppliedGifts()
      } else {
        throw new Error(response.data.error || "Failed to delete")
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete gift promotion")
    }
  }

  const getStatus = (gift: AppliedGift) => {
    const now = new Date()
    const start = new Date(gift.start_time)
    const end = new Date(gift.end_time)
    
    if (!gift.is_active) return { label: "Inactive", variant: "secondary" as const }
    if (now < start) return { label: "Scheduled", variant: "outline" as const }
    if (now > end) return { label: "Expired", variant: "destructive" as const }
    return { label: "Active", variant: "default" as const }
  }

  // Apply gift to cart
  const applyToCart = async (giftId: string) => {
    try {
      const cartResponse = await AxiosInstance.get('/cart/items/', {
        headers: { 'X-User-Id': userId }
      })
      
      if (cartResponse.data && cartResponse.data.items && cartResponse.data.items.length > 0) {
        const cartItemIds = cartResponse.data.items.map((item: any) => item.id)
        
        const applyResponse = await AxiosInstance.post('/seller-gift/apply-gift/', {
          applied_gift_id: giftId,
          user_id: userId,
          cart_item_ids: cartItemIds
        }, {
          headers: { 'X-User-Id': userId }
        })
        
        if (applyResponse.data) {
          toast.success("Gift applied to cart successfully!")
        }
      } else {
        toast.error("No items in cart to apply gift to")
      }
    } catch (error: any) {
      console.error("Failed to apply gift:", error)
      toast.error(error.response?.data?.error || "Failed to apply gift")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Gift Promotions</h1>
          <p className="text-muted-foreground">
            Manage gift promotions for your shop
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/seller/products?price=0">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Create Gift Product
            </Button>
          </Link>
          <Link to="/seller/products/new?price=0">
            <Button>
              <Gift className="mr-2 h-4 w-4" />
              New Gift Promotion
            </Button>
          </Link>
        </div>
      </div>

      {appliedGifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No gift promotions yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first gift promotion to offer free gifts to customers
            </p>
            <div className="flex gap-2">
              <Link to="/seller/products?price=0">
                <Button variant="outline">Create Gift Product</Button>
              </Link>
              <Link to="/seller/products/new?price=0">
                <Button>New Gift Promotion</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appliedGifts.map((gift) => {
            const status = getStatus(gift)
            return (
              <Card key={gift.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {gift.gift_product_name}
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-2">
                        <span>Eligible products: {gift.eligible_product_count}</span>
                        {gift.eligible_product_ids && gift.eligible_product_ids.length > 0 && (
                          <Badge variant="outline">
                            {gift.eligible_product_ids.length} products
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyToCart(gift.id)}
                        title="Apply to current cart"
                        disabled={status.label !== "Active"}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>

                      <Link to={`/seller/gift/apply?applyGiftId=${gift.id}&applyGiftProductId=${gift.gift_product_id}${gift.eligible_product_ids ? `&applyEligible=${encodeURIComponent((gift.eligible_product_ids || []).join(','))}` : ''}`}>
                        <Button variant="default" size="sm">
                          Apply to Products
                        </Button>
                      </Link>

                      <Link to={`/seller/gift/apply?giftId=${gift.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteGift(gift.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p>{format(new Date(gift.start_time), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p>{format(new Date(gift.end_time), "PPP")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}