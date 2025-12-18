// app/routes/process-return.tsx
import type { Route } from './+types/process-return'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Calendar, Package, Truck, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import AxiosInstance from '~/components/axios/Axios'

// Shadcn Components
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'

// ----------------------------
// Meta
// ----------------------------
export function meta(): Route.MetaDescriptors {
  return [{ title: "Process Return" }]
}

// ----------------------------
// Loader
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession } = await import('~/sessions.server')
  const session = await getSession(request.headers.get("Cookie"))
  const userId = session.get('userId')
  const url = new URL(request.url)
  const refundId = url.searchParams.get('refundId')

  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (!refundId) {
    throw new Error('Refund ID is required')
  }

  try {
    // Fetch refund details
    const refundResponse = await AxiosInstance.get(`/return-refund/${refundId}/get_my_refund/`, {
      headers: {
        'X-User-Id': userId,
      }
    })

    if (refundResponse.status !== 200) {
      throw new Error('Failed to fetch refund details')
    }

    const refundData = refundResponse.data

    // Calculate days left until deadline
    let daysLeft = 0
    const returnDeadline = refundData.return_deadline || refundData.buyer_return_deadline
    if (returnDeadline) {
      const deadlineDate = new Date(returnDeadline)
      const now = new Date()
      const timeDiff = deadlineDate.getTime() - now.getTime()
      daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
    }

    return {
      userId,
      refundId,
      refundData,
      daysLeft,
      returnDeadline
    }
  } catch (error: any) {
    console.error('Error in loader:', error)
    throw new Error(error.message || 'Failed to load return details')
  }
}

// ----------------------------
// ProcessReturn Component
// ----------------------------
export default function ProcessReturn({ loaderData }: any) {
  const navigate = useNavigate()
  const { userId, refundId, refundData, daysLeft, returnDeadline } = loaderData
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    logistic_service: '',
    tracking_number: ''
  })
  const [error, setError] = useState('')

  // Get items from refund data
  const getItems = () => {
    if (refundData.order_items && Array.isArray(refundData.order_items)) {
      return refundData.order_items.map((item: any) => ({
        id: item.id || item.checkout_id,
        name: item.product?.name || 'Unknown Product',
        quantity: item.checkout_quantity || 1,
        reason: refundData.reason || 'Return request'
      }))
    }
    return []
  }

  const items = getItems()
  const isExpired = daysLeft <= 0

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!formData.logistic_service.trim() || !formData.tracking_number.trim()) {
    setError('Please fill in all required fields')
    return
  }

  setIsSubmitting(true)
  setError('')

  try {
    console.log('Submitting tracking data:', {
      logistic_service: formData.logistic_service,
      tracking_number: formData.tracking_number,
    });
    console.log('User ID:', userId);
    console.log('Refund ID:', refundId);

    const response = await AxiosInstance.post(
      `/return-refund/${refundId}/update_tracking/`,
      {
        logistic_service: formData.logistic_service,
        tracking_number: formData.tracking_number,
      },
      {
        headers: {
          'X-User-Id': userId,
        }
      }
    );
    
    console.log('Response:', response.data);
    
    if (response.status === 200) {
      alert('Return logistics submitted successfully!');
      navigate('/orders');
    } else {
      throw new Error(response.data?.error || 'Failed to submit return logistics');
    }
    
  } catch (error: any) {
    console.error('Error submitting logistics:', error);
    
    // Log detailed error information
    console.error('Error response data:', error.response?.data);
    console.error('Error response status:', error.response?.status);
    console.error('Error response headers:', error.response?.headers);
    
    // Extract the actual error message from backend
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.detail || 
                        error.message || 
                        'Failed to submit return logistics';
    
    setError(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/orders')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Process Return</h1>
            <p className="text-muted-foreground mt-1">
              Refund ID: <span className="font-medium">{refundId}</span>
            </p>
          </div>
          
          {returnDeadline && (
            <Badge variant={isExpired ? "destructive" : "default"} className="text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              {isExpired ? 'EXPIRED' : `${daysLeft} days left`}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Instructions & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Return Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-medium">
                    {returnDeadline ? formatDate(returnDeadline) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="font-medium">{items.length} item(s)</p>
                </div>
              </div>
              
              {isExpired && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The return deadline has passed. Contact seller for assistance.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Return Instructions</CardTitle>
              <CardDescription>Follow these steps to complete your return</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Pack Items Securely</h4>
                    <p className="text-sm text-muted-foreground">
                      Use original packaging with all accessories included
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Ship to Seller</h4>
                    <p className="text-sm text-muted-foreground">
                      Send to seller's return address using your preferred courier
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Submit Tracking Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter logistic service and tracking number below
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Card */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items to Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <Badge variant="outline">{item.reason}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Form */}
        <div className="space-y-6">
          {/* Policy Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Return Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Return within {daysLeft} days for full refund</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Items must be in original condition</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Original packaging required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">All accessories must be included</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Refund processed after verification</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Logistics Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Details
              </CardTitle>
              <CardDescription>
                Enter your shipping information before the deadline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logistic_service">
                    Logistic Service <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="logistic_service"
                    name="logistic_service"
                    value={formData.logistic_service}
                    onChange={handleInputChange}
                    placeholder="e.g., LBC, J&T, FedEx"
                    disabled={isExpired}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking_number">
                    Tracking Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tracking_number"
                    name="tracking_number"
                    value={formData.tracking_number}
                    onChange={handleInputChange}
                    placeholder="Enter tracking number"
                    disabled={isExpired}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isExpired}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Return Details'
                  )}
                </Button>

                {isExpired && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cannot submit return details after the deadline has passed.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground text-center mt-2">
                  By submitting, you confirm that you have shipped the return package
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Deadline Alert */}
          {!isExpired && returnDeadline && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Make sure to ship your return before{' '}
                <span className="font-semibold">{formatDate(returnDeadline)}</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}