import type { Route } from "./+types/order-successful"
import { Link, useLoaderData, useParams } from "react-router"
import { CheckCircle, Package, ShoppingBag, Home, ArrowRight, Truck, Clock, CreditCard, AlertCircle } from 'lucide-react'
import { useState, useEffect } from "react"
import { UserProvider } from '~/components/providers/user-role-provider'
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
    return [{ title: "Order Successful" }]
}

interface LoaderData {
    user: any;
    orderData: any;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server")
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)
    const { requireRole } = await import("~/middleware/role-require.server")
    const { fetchUserRole } = await import("~/middleware/role.server")

    let user = (context as any).user
    if (!user) {
        user = await fetchUserRole({ request, context })
    }

    await requireRole(request, context, ["isCustomer"])

    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const sessionData = session.data;
    const userId = sessionData.userId || user?.userId || user?.id;

    // Get order_id from URL params
    const url = new URL(request.url);
    const orderId = params.orderId;

    let orderData = null;
    
    if (orderId && userId) {
        try {
            // Fix the URL: order-successful (correct spelling)
            const response = await AxiosInstance.get(`/order-successful/${orderId}/get_order_successful/`, {
                headers: {
                    'X-User-Id': userId,
                }
            });
            
            if (response.data) {
                orderData = response.data;
            }
        } catch (error: any) {
            console.error('Error fetching order data:', error);
            
            // Fallback to orders endpoint if the specific endpoint fails
            try {
                const fallbackResponse = await AxiosInstance.get(`/orders/${orderId}/`, {
                    headers: {
                        'X-User-Id': userId,
                    }
                });
                
                if (fallbackResponse.data) {
                    orderData = fallbackResponse.data;
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    }

    return { 
        user: { 
            ...user, 
            userId: userId 
        }, 
        orderData 
    }
}

export default function OrderSuccessful({ loaderData}: { loaderData: LoaderData }){
    const { user, orderData } = loaderData
    const { orderId } = useParams()  // Changed from order_id to orderId to match route param
    const [loading, setLoading] = useState(!orderData)
    const [order, setOrder] = useState(orderData)

    // Fetch order if not in loader data
    useEffect(() => {
        if (!orderData && orderId && user?.userId) {
            setLoading(true)
            // Try the correct endpoint first
            AxiosInstance.get(`/order-successful/${orderId}/get_order_successful/`, {
                headers: {
                    'X-User-Id': user.userId,
                }
            })
            .then(response => {
                setOrder(response.data)
                setLoading(false)
            })
            .catch(() => {
                // Fallback to orders endpoint
                AxiosInstance.get(`/orders/${orderId}/`, {
                    headers: {
                        'X-User-Id': user.userId,
                    }
                })
                .then(response => {
                    setOrder(response.data)
                    setLoading(false)
                })
                .catch(error => {
                    console.error('Error fetching order:', error)
                    setLoading(false)
                })
            })
        }
    }, [orderData, orderId, user?.userId])

    if (loading) {
        return (
            <UserProvider user={user}>
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Order...</h2>
                        <p className="text-gray-600">Please wait while we load your order details</p>
                    </div>
                </div>
            </UserProvider>
        )
    }

    if (!order) {
        return (
            <UserProvider user={user}>
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
                        <p className="text-gray-600 mb-4">
                            The order you're looking for doesn't exist or you don't have permission to view it.
                        </p>
                        <Link 
                            to="/orders" 
                            className="inline-flex items-center gap-2 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            View All Orders
                        </Link>
                    </div>
                </div>
            </UserProvider>
        )
    }

    // Format order data based on your model structure
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getOrderStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            'pending': 'Order Confirmed',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        }
        return statusMap[status] || status
    }

    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            'pending': 'text-orange-600',
            'processing': 'text-blue-600',
            'shipped': 'text-purple-600',
            'delivered': 'text-green-600',
            'cancelled': 'text-red-600',
            'refunded': 'text-gray-600'
        }
        return colorMap[status] || 'text-gray-600'
    }

    const getNextStatus = (currentStatus: string) => {
        const statusFlow = ['pending', 'processing', 'shipped', 'delivered']
        const currentIndex = statusFlow.indexOf(currentStatus)
        return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null
    }

    const nextStatus = getNextStatus(order.status)

    return (
        <UserProvider user={user}>
            <div className="min-h-screen bg-white">
                <div className="max-w-3xl mx-auto px-4 py-12">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4">
                            <CheckCircle className="h-10 w-10 text-orange-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Order Confirmed!
                        </h1>
                        <p className="text-gray-600">
                            Thank you for your purchase. Your order has been received.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Order ID: {order.order || orderId}
                        </p>
                    </div>

                    {/* Order Details Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Package className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Order Details</h2>
                                <p className="text-sm text-gray-500">
                                    Placed on {formatDate(order.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Status Timeline */}
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {getOrderStatusText(order.status)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Your order has been received and confirmed
                                    </p>
                                </div>
                            </div>

                            {nextStatus && (
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-orange-300 flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className={`font-medium ${getStatusColor(nextStatus)}`}>
                                            {getOrderStatusText(nextStatus)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {nextStatus === 'processing' && 'Preparing your items'}
                                            {nextStatus === 'shipped' && 'Items will be shipped soon'}
                                            {nextStatus === 'delivered' && 'Estimated delivery in 2-3 days'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Payment Method</p>
                                    <p className="font-medium">{order.payment_method || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Total Amount</p>
                                    <p className="font-bold text-lg">₱{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                                </div>
                                {order.delivery_method && (
                                    <div className="col-span-2">
                                        <p className="text-gray-600">Delivery Method</p>
                                        <p className="font-medium">{order.delivery_method}</p>
                                    </div>
                                )}
                                {order.delivery_address_text && (
                                    <div className="col-span-2">
                                        <p className="text-gray-600">Delivery Address</p>
                                        <p className="font-medium">{order.delivery_address_text}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Summary */}
                        {order.items && order.items.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h3 className="font-medium text-gray-900 mb-3">Items Ordered</h3>
                                <div className="space-y-3">
                                    {order.items.map((item: any, index: number) => (
                                        <div key={index} className="flex items-start justify-between text-sm">
                                            <div className="flex-1">
                                                <span className="text-gray-600">
                                                    {item.quantity} x {item.name}
                                                </span>
                                                {item.variant && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Variant: {item.variant.title}
                                                        {item.variant.sku_code && ` (SKU: ${item.variant.sku_code})`}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="font-medium ml-4">
                                                ₱{parseFloat(item.subtotal || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment Status */}
                        {order.payment && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Payment Status</span>
                                    <span className={`font-medium ${
                                        order.payment.status === 'success' ? 'text-green-600' : 'text-orange-600'
                                    }`}>
                                        {order.payment.status === 'success' ? 'Paid' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <Link 
                            to="/purchases" 
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            View My Orders
                            <ArrowRight className="h-4 w-4 ml-auto" />
                        </Link>

                        <Link 
                            to="/home" 
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border border-orange-200 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors"
                        >
                            <Home className="h-5 w-5" />
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </UserProvider>
    )
}