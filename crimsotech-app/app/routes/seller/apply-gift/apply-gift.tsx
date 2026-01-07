// app/routes/seller.apply-gift.tsx
import type { Route } from './+types/apply-gift'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Link, useLoaderData, useSearchParams, useNavigate } from "react-router"
import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Calendar } from "~/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { cn } from "~/lib/utils"
import { CalendarIcon, Search } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller | Apply Gift",
    },
  ]
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

interface Product {
  id: string
  name: string
  price: number
}

interface AppliedGift {
  id: string
  shop_id: string
  gift_product_id: string
  minimum_spend: number
  start_time: string
  end_time: string
  is_active: boolean
  eligible_product_ids: string[]
}

export default function ApplyGift() {
  const { userId, shopId } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const giftId = searchParams.get('giftId')
  const productId = searchParams.get('productId')
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [giftProductInfo, setGiftProductInfo] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    shop_id: shopId || "",
    gift_product_id: "",
    minimum_spend: "",
    start_time: new Date(),
    end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    eligible_product_ids: [] as string[]
  })

  // searchParams and navigate are initialized via react-router hooks above

  // Fetch data on component mount
  useEffect(() => {
    if (userId && shopId) {
      setFormData(prev => ({ ...prev, shop_id: shopId }))
      fetchProducts()
      fetchGiftProducts()
    }
    
    if (giftId) {
      fetchGiftDetails(giftId)
    } else if (productId) {
      // Prefill form with product when no applied gift exists yet
      setFormData(prev => ({ ...prev, gift_product_id: productId }))

      // async fetch in effect
      const loadProductInfo = async () => {
        try {
          const resp = await AxiosInstance.get(`/seller-products/${productId}/`)
          const p = resp.data
          if (p) setGiftProductInfo({ id: p.id || String(p.id), name: p.name || 'Unknown', price: p.price !== undefined && p.price !== null ? parseFloat(p.price) : 0 })
          else {
            const found = giftProducts.find(p => String(p.id) === String(productId))
            if (found) setGiftProductInfo(found)
          }
        } catch (err) {
          // fallback to local giftProducts list
          const found = giftProducts.find(p => String(p.id) === String(productId))
          if (found) setGiftProductInfo(found)
        }
      }

      loadProductInfo()
    }
  }, [userId, shopId, giftId])

  // If giftProducts load after gift details, populate giftProductInfo from the list
  useEffect(() => {
    if (giftId && formData.gift_product_id && !giftProductInfo && giftProducts.length > 0) {
      const found = giftProducts.find(p => String(p.id) === String(formData.gift_product_id))
      if (found) setGiftProductInfo(found)
    }
  }, [giftProducts, giftId, formData.gift_product_id, giftProductInfo])

  const fetchGiftDetails = async (id: string) => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/applied-gifts/${id}/`)
      if (response.data) {
        const data: AppliedGift = response.data
        
        setFormData({
          shop_id: data.shop_id,
          gift_product_id: data.gift_product_id,
          minimum_spend: data.minimum_spend.toString(),
          start_time: new Date(data.start_time),
          end_time: new Date(data.end_time),
          eligible_product_ids: data.eligible_product_ids || []
        })

        // Fetch gift product details for read-only display (try several endpoints)
        setGiftProductInfo(null)
        if (data.gift_product_id) {
          // Try endpoints with and without '/api' prefix, both seller/public/customer
          const candidates = [
            `/api/seller-products/${data.gift_product_id}/`,
            `/seller-products/${data.gift_product_id}/`,
            `/api/public-products/${data.gift_product_id}/`,
            `/public-products/${data.gift_product_id}/`,
            `/api/customer-products/${data.gift_product_id}/`,
            `/customer-products/${data.gift_product_id}/`,
            `/api/products/${data.gift_product_id}/`,
            `/products/${data.gift_product_id}/`
          ]

          let got = false
          for (const ep of candidates) {
            try {
              const pResp = await AxiosInstance.get(ep)
              const p = pResp.data
              if (p) {
                setGiftProductInfo({ id: p.id || String(p.id), name: p.name || 'Unknown', price: p.price !== undefined && p.price !== null ? parseFloat(p.price) : 0 })
                got = true
                break
              }
            } catch (err: any) {
              // If server returned a helpful message, capture it for debugging
              if (err?.response?.data) {
                console.warn(`Failed to fetch product from ${ep}:`, err.response.status, err.response.data)
              } else {
                console.warn(`Failed to fetch product from ${ep}:`, err?.message || err)
              }
              // try next endpoint
            }
          }

          // Fallback: try to find in locally loaded giftProducts list
          if (!got) {
            const found = giftProducts.find(p => String(p.id) === String(data.gift_product_id))
            if (found) {
              setGiftProductInfo(found)
              got = true
            }
          }

          // If still not found, show a helpful message with id for debugging
          if (!got) {
            console.error(`Could not load gift product details for id ${data.gift_product_id}`)
            toast.error(`Gift product details not available (id: ${data.gift_product_id})`)
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to load gift details:", error)
      const msg = error?.response?.data?.error || error?.message || 'Failed to load gift details'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId }
      })
      
      if (response.data && response.data.success) {
        const productsData = response.data.products || []
        // Filter out zero-priced products (these are gift products)
        const nonGiftProducts = productsData.filter((p: any) => {
          const price = parseFloat(p.price || '0')
          return price > 0
        }).map((p: any) => ({
          id: p.id || String(p.id),
          name: p.name,
          price: parseFloat(p.price || '0')
        }))
        
        setProducts(nonGiftProducts)
      }
    } catch (error) {
      console.error("Failed to load products:", error)
      toast.error("Failed to load products")
    }
  }

  const fetchGiftProducts = async () => {
    try {
      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId }
      })
      
      if (response.data && response.data.success) {
        const productsData = response.data.products || []
        // Filter for zero-priced products (gift products)
        const zeroPricedProducts = productsData.filter((p: any) => {
          const price = parseFloat(p.price || '0')
          return price === 0
        }).map((p: any) => ({
          id: p.id || String(p.id),
          name: p.name,
          price: 0
        }))
        
        setGiftProducts(zeroPricedProducts)
      }
    } catch (error) {
      console.error("Failed to load gift products:", error)
      toast.error("Failed to load gift products")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const payload = {
        shop_id: formData.shop_id,
        gift_product_id: formData.gift_product_id,
        minimum_spend: parseFloat(formData.minimum_spend),
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString(),
        eligible_product_ids: formData.eligible_product_ids,
        customer_id: userId
      }
      
      if (giftId) {
        // Update existing gift
        await AxiosInstance.put(`/applied-gifts/${giftId}/`, payload)
        toast.success("Gift promotion updated successfully")
      } else {
        // Create new gift
        await AxiosInstance.post('/applied-gifts/create-with-products/', payload)
        toast.success("Gift promotion created successfully")
      }
      
      // Navigate back to gift list
      navigate('/seller/gift')
      
    } catch (error: any) {
      console.error("Error saving gift:", error)
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details || 
                          "Failed to save gift promotion"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      eligible_product_ids: prev.eligible_product_ids.includes(productId)
        ? prev.eligible_product_ids.filter(id => id !== productId)
        : [...prev.eligible_product_ids, productId]
    }))
  }

  const selectAllProducts = () => {
    if (formData.eligible_product_ids.length === filteredProducts.length) {
      // If all are selected, deselect all
      setFormData(prev => ({
        ...prev,
        eligible_product_ids: []
      }))
    } else {
      // Select all filtered products
      setFormData(prev => ({
        ...prev,
        eligible_product_ids: filteredProducts.map(p => p.id)
      }))
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <SellerSidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading...</div>
        </div>
      </SellerSidebarLayout>
    )
  }

  if (!userId || !shopId) {
    return (
      <SellerSidebarLayout>
        <div className="p-6 text-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                User authentication or shop selection required
              </p>
              <Button asChild>
                <Link to="/seller/gift">Back to Gifts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SellerSidebarLayout>
    )
  }

  return (
    <SellerSidebarLayout>
      <div className="p-6">
        {/* BACK BUTTON */}
        <div className="mb-6">
          <Link to="/seller/gift">
            <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-300">
              <span className="mr-2">←</span> Back to Gift Promotions
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {giftId ? "Edit Gift Promotion" : "Apply New Gift"}
          </h1>
          <p className="text-muted-foreground">
            {giftId ? "Update your gift promotion details" : "Set up a new gift promotion for your shop"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Minimum Spend Section */}
            <Card>
              <CardHeader>
                <CardTitle>Minimum Spend</CardTitle>
                <CardDescription>Set the minimum purchase amount to qualify for the gift</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="minimum_spend">Amount ($)</Label>
                  <div className="relative max-w-sm">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="minimum_spend"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      placeholder="0.00"
                      value={formData.minimum_spend}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_spend: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gift Product Section */}
            <Card>
              <CardHeader>
                <CardTitle>Gift Product</CardTitle>
                <CardDescription>Select the product to give as a gift when minimum spend is met</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {giftId ? (
                    <div>
                      <Label>Gift Product</Label>
                      <div className="p-3 border rounded-md">
                        {giftProductInfo ? (
                          <div className="font-medium">{giftProductInfo.name} {giftProductInfo.price !== null ? `- $${giftProductInfo.price.toFixed(2)}` : ''}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Gift product details not available</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="gift_product">Select Gift Product</Label>
                      <select
                        id="gift_product"
                        className="w-full p-3 border rounded-md"
                        value={formData.gift_product_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, gift_product_id: e.target.value }))}
                        required={!giftId}
                      >
                        <option value="">Choose a product to give as gift</option>
                        {giftProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-muted-foreground mt-2">Note: Only products with price $0.00 can be used as gifts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Apply To Section */}
            <Card>
              <CardHeader>
                <CardTitle>Apply To</CardTitle>
                <CardDescription>Select products that qualify for this gift promotion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Select All */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {formData.eligible_product_ids.length} of {filteredProducts.length} products selected
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllProducts}
                    >
                      {formData.eligible_product_ids.length === filteredProducts.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  {/* Product List */}
                  <div className="border rounded-md h-96 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center p-4 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={formData.eligible_product_ids.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="h-5 w-5 mr-4"
                        />
                        <label
                          htmlFor={`product-${product.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">${product.price.toFixed(2)}</div>
                        </label>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Section */}
            <Card>
              <CardHeader>
                <CardTitle>Promotion Period</CardTitle>
                <CardDescription>Set when this gift promotion should be active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start_time && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_time ? (
                            format(formData.start_time, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_time}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, start_time: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.end_time && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_time ? (
                            format(formData.end_time, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_time}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, end_time: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={submitting}
              >
                {submitting ? "Saving..." : giftId ? "Update Gift Promotion" : "Apply Gift Promotion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/seller/gift")}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SellerSidebarLayout>
  )
}