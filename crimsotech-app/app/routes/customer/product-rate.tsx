// app/routes/customer.product-rate.tsx
import type { Route } from './+types/product-rate'
import { useLoaderData, Link, useSearchParams } from "react-router"
import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Textarea } from "~/components/ui/textarea"
import { Label } from "~/components/ui/label"
import { Badge } from "~/components/ui/badge"
import { toast } from "sonner"
import { Star, CheckCircle, Package, ArrowLeft, ShoppingBag, Clock } from "lucide-react"
import { format } from "date-fns"
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
  return [{ title: "Rate" }]
}

// Loader function for customer
export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server")
  // Include unstable_pattern to satisfy react-router's ActionFunctionArgs/LoaderFunctionArgs type
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: "" })
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
  
  // Get product ID from query params if available
  const url = new URL(request.url)
  const productId = url.searchParams.get('productId')
  const orderId = url.searchParams.get('orderId')
  
  return { userId, productId, orderId }
}

interface Product {
  id: string
  name: string
  description: string
  price: string
  image?: string
  shop: {
    id: string
    name: string
  }
}

interface Order {
  id: string
  order_number: string
  status: string
  created_at: string
  total_amount: string
  items?: OrderItem[]
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_image?: string
  quantity: number
  price: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
}

export default function RateProduct() {
  const { userId, productId: paramProductId, orderId: paramOrderId } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('productId') || paramProductId
  const orderId = searchParams.get('orderId') || paramOrderId
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const [userCompletedOrders, setUserCompletedOrders] = useState<Order[]>([])
  
  // Helper function to get user ID from storage
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
  
  const effectiveUserId = userId || getUserIdFromStorage()
  
  useEffect(() => {
    if (effectiveUserId) {
      if (productId) {
        fetchProductDetails()
        checkExistingReview()
      } else {
        fetchUserCompletedOrders()
      }
    }
  }, [effectiveUserId, productId])
  
  useEffect(() => {
    if (orderId && effectiveUserId) {
      fetchOrderDetails()
    }
  }, [orderId, effectiveUserId])
  
  const fetchProductDetails = async () => {
    if (!productId) return
    
    setLoading(true)
    try {
      // Try multiple endpoints to get product details
      let productData: any = null

      // 1) Try public products endpoint first (canonical buyer view)
      try {
        const response = await AxiosInstance.get(`/public-products/${productId}/`)
        if (response.data?.success) {
          productData = response.data.product || response.data
        }
      } catch (error) {
        console.log('Public products endpoint failed, trying other endpoints')
      }

      // 2) Try seller-products endpoint (seller-owned or draft products)
      if (!productData) {
        try {
          const response = await AxiosInstance.get(`/seller-products/${productId}/`, {
            params: { customer_id: effectiveUserId }
          })
          if (response.data?.success) {
            productData = response.data.product
          }
        } catch (error) {
          console.log('Seller-products endpoint failed')
        }
      }

      // 3) As a last resort, ask seller-gift endpoint which may return an applied_gift or minimal product info
      if (!productData) {
        try {
          const response = await AxiosInstance.get(`/seller-gift/${productId}/`, {
            params: { customer_id: effectiveUserId }
          })
          if (response.data?.success) {
            // Handle AppliedGift responses
            const ag = response.data.applied_gift || response.data
            if (ag && ag.gift_product) {
              productData = ag.gift_product
            } else if (ag && (ag.gift_product_name || ag.gift_product_id)) {
              productData = {
                id: ag.gift_product_id || ag.id,
                name: ag.gift_product_name || 'Gift Item',
                description: ag.description || '',
                price: ag.price || '0',
                image: null,
                shop: null
              }
            }
          }
        } catch (error) {
          console.log('Seller-gift endpoint failed')
        }
      }
      
      if (productData) {
        setProduct({
          id: productData.id,
          name: productData.name || 'Unknown Product',
          description: productData.description || '',
          price: productData.price || '0',
          image: productData.image || productData.media_files?.[0]?.file_data,
          shop: productData.shop || { id: '', name: '' }
        })
      } else {
        toast.error("Product not found")
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error("Failed to load product details")
    } finally {
      setLoading(false)
    }
  }
  
  const fetchOrderDetails = async () => {
    if (!orderId || !effectiveUserId) return
    
    try {
      const response = await AxiosInstance.get(`/orders/${orderId}/`, {
        headers: { 'X-User-Id': effectiveUserId }
      })
      
      if (response.data?.success) {
        setOrder(response.data.order)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    }
  }
  
  const fetchUserCompletedOrders = async () => {
    if (!effectiveUserId) return
    
    setLoading(true)
    try {
      const response = await AxiosInstance.get('/orders/', {
        headers: { 'X-User-Id': effectiveUserId },
        params: { status: 'completed' }
      })
      
      if (response.data?.success) {
        setUserCompletedOrders(response.data.orders || [])
      } else {
        setUserCompletedOrders([])
      }
    } catch (error: any) {
      console.error('Error fetching completed orders:', error)
      if (error.response?.status === 404) {
        toast.error("No completed orders found")
      } else {
        toast.error("Failed to load your completed orders")
      }
    } finally {
      setLoading(false)
    }
  }
  
  const checkExistingReview = async () => {
    if (!productId || !effectiveUserId) return
    
    try {
      const response = await AxiosInstance.get('/reviews/', {
        params: {
          product_id: productId,
          customer_id: effectiveUserId
        }
      })
      
      if (response.data?.success && response.data.reviews?.length > 0) {
        const review = response.data.reviews[0]
        setExistingReview(review)
        setRating(review.rating)
        setComment(review.comment || "")
      }
    } catch (error) {
      console.error('Error checking existing review:', error)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productId) {
      toast.error("Please select a product to rate")
      return
    }
    
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }
    
    setSubmitting(true)
    
    try {
      const payload = {
        product: productId,
        product_id: productId,
        rating: rating,
        comment: comment,
        customer_id: effectiveUserId
      }
      
      if (existingReview) {
        // Update existing review
        await AxiosInstance.put(`/reviews/${existingReview.id}/`, payload, { headers: { 'X-User-Id': effectiveUserId } })
        toast.success("Review updated successfully!")
      } else {
        // Create new review
        await AxiosInstance.post('/reviews/', payload, { headers: { 'X-User-Id': effectiveUserId } })
        toast.success("Thank you for your review!")
      }
      
      // Navigate back or show success
      setTimeout(() => {
        window.location.href = '/purchases'
      }, 1500)
      
    } catch (error: any) {
      console.error("Error submitting review:", error)
      let errorMessage = "Failed to submit review"
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }
  
  const StarRating = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={submitting}
          >
            <Star
              className={`h-10 w-10 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    )
  }
  
  const RatingDescription = () => {
    const descriptions = [
      "Very Poor",
      "Poor",
      "Average",
      "Good",
      "Excellent"
    ]
    
    const messages = [
      "We're sorry to hear about your poor experience",
      "Thank you for your feedback",
      "We appreciate your feedback",
      "Thank you for your positive feedback!",
      "We're thrilled you loved your purchase!"
    ]
    
    return (
      <div className="mt-2">
        <p className="text-lg font-medium">
          {rating > 0 ? descriptions[rating - 1] : "Select your rating"}
        </p>
        {rating > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {messages[rating - 1]}
          </p>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!effectiveUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-muted-foreground text-center mb-4">
              Please log in to rate your products
            </p>
            <Button asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!productId && userCompletedOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Completed Orders</h3>
            <p className="text-muted-foreground text-center mb-4">
              You don't have any completed orders to rate yet
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/customer/orders">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  View Orders
                </Link>
              </Button>
              <Button asChild>
                <Link to="/">Browse Products</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!productId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/purchases">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Rate Your Purchases</h1>
            <p className="text-muted-foreground mt-2">
              Select a product from your completed orders to leave a review
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Completed Orders</CardTitle>
              <CardDescription>
                Products you've received and can now rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userCompletedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userCompletedOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Order #{order.order_number}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "PPP")}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          ${parseFloat(order.total_amount || '0').toFixed(2)}
                        </Badge>
                      </div>
                      
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-3">
                          {order.items.map((item: OrderItem) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                              <div className="flex items-center gap-3">
                                {item.product_image && (
                                  <img
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="h-12 w-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{item.product_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Qty: {item.quantity} × ${parseFloat(item.price || '0').toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                size="sm"
                                asChild
                              >
                                <Link to={`/product-rate?productId=${item.product_id}&orderId=${order.id}`}>
                                  Rate Product
                                </Link>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No items found in this order
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to={orderId ? `/customer/orders/${orderId}` : "/customer/orders"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {orderId ? "Order" : "Orders"}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Rate Your Purchase</h1>
          <p className="text-muted-foreground mt-2">
            Share your experience with this product
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            {product ? (
              <div className="flex items-start gap-4">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-20 w-20 object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  {product.shop?.name && (
                    <div className="text-sm text-muted-foreground">Sold by <Link to={`/shop/${product.shop.id}`} className="underline">{product.shop.name}</Link></div>
                  )}
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      ${parseFloat(product.price || '0').toFixed(2)}
                    </Badge>
                    {product.shop && product.shop.name && (
                      <Badge variant="secondary">
                        <Link to={`/shop/${product.shop.id}`} className="text-xs">
                          {product.shop.name}
                        </Link>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded bg-gray-50">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Product Information</p>
                  <p className="text-sm text-muted-foreground">Loading product details...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>
                {existingReview ? "Update Your Review" : "Write a Review"}
              </CardTitle>
              <CardDescription>
                Your feedback helps other customers make better decisions
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Rating Selection */}
              <div>
                <Label htmlFor="rating" className="text-base">Overall Rating</Label>
                <div className="mt-3">
                  <StarRating />
                  <RatingDescription />
                </div>
              </div>
              
              {/* Comment */}
              <div>
                <Label htmlFor="comment" className="text-base">
                  Share Your Experience
                </Label>
                <Textarea
                  id="comment"
                  placeholder="What did you like or dislike about this product? How was the quality, packaging, and delivery?"
                  className="mt-2 min-h-[120px]"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={submitting}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Your detailed review helps other shoppers
                </p>
              </div>
              
              {/* Review Guidelines */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-2">Review Guidelines</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Be honest and fair in your assessment</li>
                  <li>✓ Focus on the product quality and your experience</li>
                  <li>✓ Avoid personal information or offensive language</li>
                  <li>✓ Your review will be visible to other customers</li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <div>
                {existingReview && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Last updated: {format(new Date(existingReview.created_at), "PPP")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={rating === 0 || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : existingReview ? (
                    "Update Review"
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
        
        {/* Success Message for Existing Review */}
        {existingReview && (
          <div className="mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">You've already reviewed this product</p>
                <p className="text-sm text-green-700">
                  You can update your existing review or leave it as is
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}