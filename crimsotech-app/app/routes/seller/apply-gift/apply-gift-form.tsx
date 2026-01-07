// seller/gift/index.tsx
import { useState, useEffect } from "react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { format } from "date-fns"
import { toast } from "sonner"
import { Edit, Trash2, Gift } from "lucide-react"

interface AppliedGift {
  id: string
  shop_id: string
  gift_product_id: string
  gift_product_name: string
  minimum_spend: number
  start_time: string
  end_time: string
  is_active: boolean
  eligible_product_count: number
}

export default function GiftPromotions() {
  const [loading, setLoading] = useState(true)
  const [appliedGifts, setAppliedGifts] = useState<AppliedGift[]>([])
  const [shopId, setShopId] = useState<string>("")

  useEffect(() => {
    fetchUserShop()
  }, [])

  useEffect(() => {
    if (shopId) {
      fetchAppliedGifts()
    }
  }, [shopId])

  const fetchUserShop = async () => {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        toast.error("Please login first")
        return
      }
      
      const user = JSON.parse(userData)
      const response = await fetch(`/api/shops/?customer_id=${user.id}`)
      if (response.ok) {
        const shops = await response.json()
        if (shops.length > 0) {
          setShopId(shops[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch shop:", error)
    }
  }

  const fetchAppliedGifts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/applied-gifts/by-shop/${shopId}/`)
      if (response.ok) {
        const data = await response.json()
        setAppliedGifts(data.applied_gifts || [])
      }
    } catch (error) {
      toast.error("Failed to load gift promotions")
    } finally {
      setLoading(false)
    }
  }

  const deleteGift = async (giftId: string) => {
    if (!confirm("Are you sure you want to delete this gift promotion?")) return
    
    try {
      const response = await fetch(`/api/applied-gifts/${giftId}/`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success("Gift promotion deleted successfully")
        fetchAppliedGifts()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast.error("Failed to delete gift promotion")
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
        <Link to="/seller/gift/apply">
          <Button>
            <Gift className="mr-2 h-4 w-4" />
            Apply New Gift
          </Button>
        </Link>
      </div>

      {appliedGifts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No gift promotions yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first gift promotion to offer free gifts to customers
            </p>
            <Link to="/seller/gift/apply">
              <Button>
                Create Gift Promotion
              </Button>
            </Link>
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
                      <CardDescription>
                        Minimum spend: ${gift.minimum_spend.toFixed(2)} | 
                        Eligible products: {gift.eligible_product_count}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
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