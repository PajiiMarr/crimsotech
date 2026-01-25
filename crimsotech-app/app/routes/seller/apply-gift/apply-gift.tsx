// app/routes/seller.apply-gift.tsx
import type { Route } from './+types/apply-gift'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { Link, useLoaderData, useSearchParams, useNavigate } from "react-router"
import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Calendar } from "~/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { cn } from "~/lib/utils"
import { CalendarIcon, Search, Gift } from "lucide-react"
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

interface Product {
  id: string
  name: string
  price: number
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

export default function ApplyGift() {
  const { userId: sessionUserId, shopId: sessionShopId } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const giftId = searchParams.get('giftId')
  const applyGiftId = searchParams.get('applyGiftId')
  const applyGiftProductId = searchParams.get('applyGiftProductId')
  const applyEligible = searchParams.get('applyEligible')
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [giftProducts, setGiftProducts] = useState<Product[]>([])
  const [giftProductInfo, setGiftProductInfo] = useState<Product | null>(null)
  const [giftProductTried, setGiftProductTried] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState(sessionUserId)
  const [shopId, setShopId] = useState(sessionShopId)
  const [formData, setFormData] = useState({
    shop_id: sessionShopId || "",
    gift_product_id: "",
    start_time: new Date(),
    end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    eligible_product_ids: [] as string[]
  })

  // Get user ID from storage if not in session
  useEffect(() => {
    if (!sessionUserId) {
      const storedUserId = getUserIdFromStorage()
      if (storedUserId) {
        setUserId(storedUserId)
      }
    }
  }, [sessionUserId])

  // Get shop ID from localStorage if not in session
  useEffect(() => {
    if (!sessionShopId) {
      const storedShopId = localStorage.getItem('selectedShopId') || 
                          localStorage.getItem('shopId') ||
                          ''
      if (storedShopId) {
        setShopId(storedShopId)
        setFormData(prev => ({ ...prev, shop_id: storedShopId }))
      }
    }
  }, [sessionShopId])

  // Fetch data when we have userId and shopId
  useEffect(() => {
    if (userId && shopId) {
      setFormData(prev => ({ ...prev, shop_id: shopId }))
      fetchProducts()
      fetchGiftProducts()
    }
  }, [userId, shopId])

  // Fetch gift promotion details when giftId changes and we have seller context (userId or shopId)
  useEffect(() => {
    if (giftId && (userId || shopId)) {
      // Wait until we have either userId or shopId so per-product lookups have context
      fetchGiftPromotionDetails(giftId)
    } else if (!giftId && !applyGiftId) {
      // If no giftId and not coming from an apply preset, reset the form for new promotion
      setFormData({
        shop_id: shopId || "",
        gift_product_id: "",
        start_time: new Date(),
        end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        eligible_product_ids: []
      })
      setGiftProductInfo(null)
    }
  }, [giftId, applyGiftId, shopId, userId])

  // If we're arriving from an Apply button, pre-fill the gift product and eligible products
  useEffect(() => {
    if (applyGiftProductId) {
      setFormData(prev => ({
        ...prev,
        gift_product_id: applyGiftProductId,
        eligible_product_ids: applyEligible ? applyEligible.split(',') : []
      }))
      fetchGiftProductDetails(applyGiftProductId)
      return
    }

    if (applyGiftId) {
      fetchGiftPromotionDetails(applyGiftId, true)
    }
  }, [applyGiftId, applyGiftProductId, applyEligible, shopId, userId])

  // Fetch gift promotion details
  const fetchGiftPromotionDetails = async (id: string, applyMode = false) => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/seller-gift/${id}/`, {
        params: { customer_id: userId }
      })

      if (response.data && response.data.success) {
        const data = response.data.applied_gift || response.data

        if (applyMode) {
          // Pre-fill only the gift product and eligible products
          setFormData(prev => ({
            ...prev,
            gift_product_id: data.gift_product_id,
            eligible_product_ids: data.eligible_product_ids || []
          }))

          // Fetch and show gift product info
          if (data.gift_product_id) {
            await fetchGiftProductDetails(data.gift_product_id)
          }
        } else {
          // Update form data for edit mode (with dates)
          setFormData({
            shop_id: data.shop_id || shopId || "",
            gift_product_id: data.gift_product_id,
            start_time: new Date(data.start_time),
            end_time: new Date(data.end_time),
            eligible_product_ids: data.eligible_product_ids || []
          })

          // Fetch and display gift product details
          if (data.gift_product_id) {
            await fetchGiftProductDetails(data.gift_product_id)
          }
        }
      }
    } catch (error: any) {
      // If 404, it might be a product ID, not an applied gift
      if (error.response?.status === 404) {
        // Treat the id as a product ID
        setFormData(prev => ({ ...prev, gift_product_id: id }))
        await fetchGiftProductDetails(id)
      } else {
        const msg = error?.response?.data?.error || error?.message || 'Failed to load gift promotion details'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch gift product details by ID
  const fetchGiftProductDetails = async (productId: string) => {
    setGiftProductTried(false)
    setGiftProductInfo(null)

    if (!productId) {
      setGiftProductTried(true)
      return
    }

    try {
      let product: any = null

      const normalize = (data: any) => {
        if (!data) return null
        if (data.product) return data.product
        if (data.products && Array.isArray(data.products) && data.products.length > 0) return data.products[0]
        if (data.id || data.name) return data
        return null
      }

      // 0) First, ask the seller-gift endpoint if this pk corresponds to an applied gift or a gift product fallback
      try {
        const agResp = await AxiosInstance.get(`/seller-gift/${productId}/`, { params: { customer_id: userId, shop_id: shopId }, headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
        if (agResp.data && agResp.data.success && agResp.data.applied_gift) {
          const ag = agResp.data.applied_gift
          // If this is an applied_gift record, it may contain gift_product_id/name directly
          product = {
            id: ag.gift_product_id || ag.id || productId,
            name: ag.gift_product_name || ag.name,
            price: ag.price ?? 0,
          }
        }
      } catch (err: any) {
        // If 404, it's not an applied_gift — no need to log; we'll fall back to product lookups below
        if (err.response?.status && err.response.status !== 404) console.error('Seller gift fallback error:', err.response?.data || err.message)
      }

      // 1) Try seller product retrieve (per-product endpoint) with customer_id and shop_id
      if (!product) {
        try {
          const resp = await AxiosInstance.get(`/seller-products/${productId}/`, { params: { customer_id: userId, shop_id: shopId }, headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
          product = normalize(resp.data) || product
        } catch (err: any) {
          if (err.response?.status && err.response.status !== 404) console.error('Seller product (customer) error:', err.response?.data || err.message)
        }
      }

      // 2) Try seller product retrieve with shop context only
      if (!product && shopId) {
        try {
          const resp2 = await AxiosInstance.get(`/seller-products/${productId}/`, { params: { shop_id: shopId }, headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
          product = normalize(resp2.data) || product
        } catch (err: any) {
          if (err.response?.status && err.response.status !== 404) console.error('Seller product (shop) error:', err.response?.data || err.message)
        }
      }

      // 3) Try seller product retrieve without any context (last attempt)
      if (!product) {
        try {
          const resp3 = await AxiosInstance.get(`/seller-products/${productId}/`, { headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
          product = normalize(resp3.data) || product
        } catch (err: any) {
          if (err.response?.status && err.response.status !== 404) console.error('Seller product (no context) error:', err.response?.data || err.message)
        }
      }

      // 3) Try listing seller-products and find by id
      if (!product && userId) {
        try {
          const listResp = await AxiosInstance.get('/seller-products/', { params: { customer_id: userId, shop_id: shopId }, headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
          product = normalize(listResp.data)
          if (!product) {
            const productsData = listResp.data.products || []
            const found = productsData.find((p: any) => String(p.id) === String(productId))
            if (found) product = found
          }
        } catch (err: any) {
          console.error('Failed to list seller products fallback:', err.response?.data || err.message)
        }
      }

      // 4) Public products as last resort
      if (!product) {
        try {
          const pub = await AxiosInstance.get(`/public-products/${productId}/`)
          product = normalize(pub.data) || product
        } catch (err: any) {
          if (err.response?.status && err.response.status !== 404) console.error('Public product retrieve error:', err.response?.data || err.message)
        }
      }

      // 5) As a last effort, check applied gifts for this shop to see if any applied gift references this product (gives us name)
      if (!product && formData.shop_id) {
        try {
          const agResp = await AxiosInstance.get('/seller-gift/by-shop/', { params: { shop_id: formData.shop_id } })
          if (agResp.data && agResp.data.success && Array.isArray(agResp.data.applied_gifts)) {
            const matched = agResp.data.applied_gifts.find((g: any) => String(g.gift_product_id) === String(productId))
            if (matched) {
              product = {
                id: productId,
                name: matched.gift_product_name || 'Unknown Gift',
                price: 0
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to lookup applied gifts for shop fallback:', err.response?.data || err.message)
        }
      }

      if (product) {
        setGiftProductInfo({ id: product.id, name: product.name || 'Unknown Gift', price: parseFloat(product.price || '0') })
      } else {
        setGiftProductInfo(null)
        setGiftProductTried(true)
        console.warn('fetchGiftProductDetails: product not found', productId)
      }
    } catch (error: any) {
      console.error('Failed to fetch gift product:', error.response?.data || error.message)
      const msg = error?.response?.data?.error || error?.response?.data?.detail || error?.message || 'Failed to fetch gift product details'
      toast.error(msg)
      setGiftProductInfo(null)
      setGiftProductTried(true)
    }
  }

  // Fetch all products (non-gift products)
  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/seller-products/', {
        params: { customer_id: userId, shop_id: shopId }
      })
      
      if (response.data && response.data.success) {
        const productsData = response.data.products || []
        const nonGiftProducts = productsData
          .filter((p: any) => parseFloat(p.price || '0') > 0)
          .map((p: any) => ({
            id: p.id,
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

  // Fetch gift products (zero-priced products)
  const fetchGiftProducts = async () => {
    try {
      const response = await AxiosInstance.get('/seller-gift/', {
        params: { customer_id: userId, shop_id: shopId }
      })
      
      if (response.data && response.data.success) {
        const productsData = response.data.products || []
        const zeroPricedProducts = productsData
          .filter((p: any) => parseFloat(p.price || '0') === 0)
          .map((p: any) => ({
            id: p.id,
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
      // Validate gift product selection
      if (!formData.gift_product_id) {
        toast.error("Please select a gift product")
        setSubmitting(false)
        return
      }

      // Ensure dates are in proper ISO format
      const start_time = new Date(formData.start_time).toISOString()
      const end_time = new Date(formData.end_time).toISOString()
      
      const payload = {
        shop_id: formData.shop_id,
        gift_product_id: formData.gift_product_id,
        start_time: start_time,
        end_time: end_time,
        eligible_product_ids: formData.eligible_product_ids,
        customer_id: userId
      }
      
      if (giftId) {
        // Update existing gift promotion
        await AxiosInstance.put(`/seller-gift/${giftId}/`, payload, { headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
        toast.success("Gift promotion updated successfully")
      } else {
        // Create new gift promotion
        await AxiosInstance.post('/seller-gift/', payload, { headers: { 'X-User-Id': userId, 'X-Shop-Id': shopId } })
        toast.success("Gift promotion created successfully")
      }
      
      // Navigate back to gift list
      navigate('/seller/gift')
      
    } catch (error: any) {
      console.error("Error saving gift promotion:", error)
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
      setFormData(prev => ({
        ...prev,
        eligible_product_ids: []
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        eligible_product_ids: filteredProducts.map(p => p.id)
      }))
    }
  }

  // Handle gift product selection when creating new promotion
  const handleGiftProductChange = (productId: string) => {
    setFormData(prev => ({ ...prev, gift_product_id: productId }))
    
    const selectedProduct = giftProducts.find(p => p.id === productId)
    if (selectedProduct) {
      setGiftProductInfo(selectedProduct)
    } else {
      setGiftProductInfo(null)
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
            {giftId ? "Edit Gift Promotion" : "Create Gift Promotion"}
          </h1>
          <p className="text-muted-foreground">
            {giftId ? "Update your gift promotion details" : "Set up a new gift promotion for your shop"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Gift Product Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    <Gift className="mr-2 h-5 w-5" />
                    Gift Product
                  </div>
                </CardTitle>
                <CardDescription>
                  {giftId 
                    ? "This is the product that will be given as a gift" 
                    : "Select the product to give as a gift"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(giftId || applyGiftId || applyGiftProductId) ? (
                    // Display selected gift product details when editing OR when arriving from Apply
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">Selected Gift Product</h3>
                          <p className="text-sm font-medium mt-1">
                            {giftProductInfo ? (
                              giftProductInfo.name
                            ) : giftProductTried ? (
                              <>
                                <span>Product not found (ID: {formData.gift_product_id})</span>
                                <button type="button" onClick={() => fetchGiftProductDetails(formData.gift_product_id)} className="ml-3 text-sm text-blue-600 underline">Retry</button>
                              </>
                            ) : (
                              'Loading product...'
                            )}
                          </p>
                          {giftProductInfo && (
                            <p className="text-sm text-muted-foreground mt-1">Product ID: {formData.gift_product_id}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">FREE</div>
                          <div className="text-xs text-muted-foreground">Price: ${giftProductInfo?.price.toFixed(2) || "0.00"}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Select gift product when creating new
                    <div className="space-y-2">
                      <Label htmlFor="gift_product">Select Gift Product *</Label>
                      <select
                        id="gift_product"
                        className="w-full p-3 border rounded-md"
                        value={formData.gift_product_id}
                        onChange={(e) => handleGiftProductChange(e.target.value)}
                        required
                      >
                        <option value="">Choose a product to give as gift</option>
                        {giftProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      
                      {/* Display selected gift product */}
                      {giftProductInfo && (
                        <div className="p-3 border rounded-md mt-2 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">Selected Gift Product</div>
                              <div className="font-semibold">{giftProductInfo.name}</div>
                              <div className="text-sm text-muted-foreground">Product ID: {formData.gift_product_id}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold rounded-full bg-green-100 text-green-800 px-2 py-1">FREE</div>
                              <div className="text-xs text-muted-foreground mt-1">Price: ${giftProductInfo?.price.toFixed(2) || "0.00"}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground mt-2">
                        Note: Only products with price $0.00 can be used as gifts
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Eligible Products Section */}
            <Card>
              <CardHeader>
                <CardTitle>Eligible Products</CardTitle>
                <CardDescription>
                  Select which products qualify for this gift promotion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Selection Summary */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {formData.eligible_product_ids.length} of {filteredProducts.length} products selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, eligible_product_ids: [] }))}
                        disabled={formData.eligible_product_ids.length === 0}
                      >
                        Clear All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllProducts}
                      >
                        {formData.eligible_product_ids.length === filteredProducts.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>

                  {/* Product List */}
                  <div className="border rounded-md max-h-96 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="flex items-center p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={`product-${product.id}`}
                            checked={formData.eligible_product_ids.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="h-5 w-5 mr-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`product-${product.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">${product.price.toFixed(2)}</div>
                          </label>
                          <div className="text-sm font-medium">
                            ${product.price.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No products found</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? 'Try a different search term' : 'Add products to your shop first'}
                        </p>
                      </div>
                    )}
                  </div>

                  {products.length === 0 && (
                    <div className="text-center p-4 border rounded-md bg-yellow-50">
                      <p className="text-sm text-yellow-800">
                        You don't have any products yet. Add products to your shop before creating gift promotions.
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link to="/seller/products">Add Products</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Promotion Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Promotion Schedule</CardTitle>
                <CardDescription>
                  Set when this gift promotion should be active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
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
                            <span>Pick a start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_time}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, start_time: date }))}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Promotion will start at 12:00 AM on this date
                    </p>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label>End Date *</Label>
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
                            <span>Pick an end date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_time}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, end_time: date }))}
                          initialFocus
                          disabled={(date) => date < formData.start_time}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Promotion will end at 11:59 PM on this date
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={submitting}
              >
                {submitting ? "Saving..." : giftId ? "Update Gift Promotion" : "Create Gift Promotion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/seller/gift")}
                disabled={submitting}
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