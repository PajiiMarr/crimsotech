import type { Route } from "./+types/active-orders-details"
import { useState } from "react";
import { useNavigate } from "react-router";
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Toaster } from "~/components/ui/sonner";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck, 
  Calendar, 
  Clock, 
  Phone, 
  Mail,
  ShoppingBag,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Active Order Details",
        }
    ]
}

interface OrderItem {
    checkout_id: string;
    product_id: string;
    product_name: string;
    shop_name: string;
    shop_id: string;
    seller_name: string;
    quantity: number;
    unit_price: string;
    total: string;
    remarks?: string;
}

interface OrderDelivery {
    id: string;
    status: string;
    rider_id: string | null;
    rider_name: string | null;
    rider_contact: string | null;
    picked_at: string | null;
    delivered_at: string | null;
    created_at: string;
}

interface OrderPayment {
    id: string;
    status: string;
    amount: string;
    method: string;
    transaction_date: string;
}

interface OrderCustomer {
    id: string;
    name: string;
    contact_number: string;
    email: string;
}

interface OrderShippingAddress {
    recipient_name: string;
    recipient_phone: string;
    full_address: string;
    city: string;
    province: string;
    barangay: string;
    zip_code: string;
}

interface OrderDetails {
    order_id: string;
    order_status: string;
    total_amount: string;
    payment_method: string;
    delivery_method: string;
    created_at: string;
    updated_at: string;
    customer: OrderCustomer | null;
    shipping_address: OrderShippingAddress | null;
    delivery: OrderDelivery | null;
    payment: OrderPayment | null;
    items: OrderItem[];
}

interface LoaderData {
    user: any;
    orderDetails: OrderDetails | null;
    error?: string;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { userContext } = await import("~/contexts/user-role");

    let user = (context as any).get(userContext);
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isRider"]);

    // Extract the order ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const orderId = pathSegments[pathSegments.length - 1];
    
    // Validate the order ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(orderId)) {
        return { 
            user, 
            orderDetails: null,
            error: "Invalid order ID format. Must be a valid UUID." 
        };
    }

    let orderDetails = null;
    let error = null;

    try {
        // Make the API call to your Django endpoint
        const response = await AxiosInstance.get(
            `/rider-orders-active/order-details/${orderId}/`,
            {
                headers: {
                    'Cookie': request.headers.get('Cookie') || ''
                }
            }
        );
        orderDetails = response.data;
    } catch (err: any) {
        console.error("Error fetching order details:", err);
        
        if (err.response) {
            switch (err.response.status) {
                case 404:
                    error = "Order not found";
                    break;
                case 400:
                    error = err.response.data?.error || "Invalid order ID";
                    break;
                case 401:
                    error = "Authentication required";
                    break;
                case 403:
                    error = "Access denied";
                    break;
                default:
                    error = `Server error: ${err.response.status}`;
            }
        } else if (err.request) {
            error = "No response from server. Please check your connection.";
        } else {
            error = "Failed to fetch order details";
        }
    }

    return { 
        user, 
        orderDetails, 
        error
    };
}

export default function ActiveOrderDetails({ loaderData }: { loaderData: LoaderData }){
    const { user, orderDetails, error } = loaderData;
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'shipped':
                return 'bg-purple-100 text-purple-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDeliveryStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'picked_up':
                return <Truck className="h-5 w-5 text-blue-500" />;
            case 'pending':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            default:
                return <Package className="h-5 w-5 text-gray-500" />;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: string) => {
        return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setIsLoading(true);
        try {
            // TODO: Implement status update API call
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            toast.error("Failed to update order status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleContactCustomer = () => {
        if (orderDetails?.customer?.contact_number) {
            window.location.href = `tel:${orderDetails.customer.contact_number}`;
        }
    };

    // If there's an error in the loader, show it
    if (error) {
        return (
            <UserProvider user={user}>
                <Toaster position="top-right" />
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center gap-4 mb-8">
                            <Button
                                onClick={() => navigate(-1)}
                                variant="outline"
                                size="sm"
                                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                        </div>
                        
                        <Card className="border-red-200">
                            <CardContent className="pt-6 text-center">
                                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Order</h3>
                                <p className="text-red-600 mb-6">{error}</p>
                                <Button
                                    onClick={() => navigate('/rider/orders/active')}
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                    Back to Active Orders
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </UserProvider>
        );
    }

    if (!orderDetails) {
        return (
            <UserProvider user={user}>
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center gap-4 mb-8">
                            <Button
                                onClick={() => navigate(-1)}
                                variant="outline"
                                size="sm"
                                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                        </div>
                        
                        <Card className="animate-pulse">
                            <CardContent className="pt-6 text-center">
                                <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Loading order details...</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </UserProvider>
        );
    }

    return (
        <UserProvider user={user}>
            <Toaster position="top-right" />
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                {/* Header */}
                <div className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={() => navigate(-1)}
                                    variant="outline"
                                    size="sm"
                                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                                    <p className="text-gray-600 text-sm">Track and manage order information</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                                    {orderDetails.items.length} Item{orderDetails.items.length !== 1 ? 's' : ''}
                                </Badge>
                                <Button 
                                    onClick={handleContactCustomer}
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                    disabled={!orderDetails.customer?.contact_number}
                                >
                                    <Phone className="h-4 w-4 mr-2" />
                                    Contact Customer
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Summary Card */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-full">
                                        <Package className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-orange-800">Order #{orderDetails.order_id}</CardTitle>
                                        <CardDescription className="text-orange-600">
                                            Placed on {formatDate(orderDetails.created_at)}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge className={`px-4 py-1.5 font-semibold ${getStatusColor(orderDetails.order_status)}`}>
                                    {orderDetails.order_status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <DollarSign className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium">Total Amount:</span>
                                    </div>
                                    <p className="text-3xl font-bold text-orange-600">
                                        {formatCurrency(orderDetails.total_amount)}
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <CreditCard className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium">Payment Method:</span>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{orderDetails.payment_method}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Truck className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium">Delivery Method:</span>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{orderDetails.delivery_method || 'Standard'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                            <TabsTrigger value="overview" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                                <Package className="h-4 w-4 mr-2" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="items" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Items ({orderDetails.items.length})
                            </TabsTrigger>
                            <TabsTrigger value="delivery" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                                <Truck className="h-4 w-4 mr-2" />
                                Delivery
                            </TabsTrigger>
                            <TabsTrigger value="payment" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Payment
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <User className="h-5 w-5 text-orange-500" />
                                            Customer Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {orderDetails.customer ? (
                                            <>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-orange-100 rounded-full">
                                                            <User className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{orderDetails.customer.name}</p>
                                                            <p className="text-sm text-gray-600">{orderDetails.customer.email}</p>
                                                        </div>
                                                    </div>
                                                    <Separator />
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4 text-gray-500" />
                                                            <span className="font-medium">Contact:</span>
                                                            <span className="text-gray-700">{orderDetails.customer.contact_number}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-gray-500" />
                                                            <span className="font-medium">Customer ID:</span>
                                                            <span className="font-mono text-sm text-gray-700">{orderDetails.customer.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-gray-500 text-center py-4">No customer information available</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Shipping Address */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <MapPin className="h-5 w-5 text-orange-500" />
                                            Shipping Address
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {orderDetails.shipping_address ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-orange-100 rounded-full">
                                                        <MapPin className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{orderDetails.shipping_address.recipient_name}</p>
                                                        <p className="text-sm text-gray-600">{orderDetails.shipping_address.recipient_phone}</p>
                                                    </div>
                                                </div>
                                                <Separator />
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <p className="text-gray-700 leading-relaxed">{orderDetails.shipping_address.full_address}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div>
                                                        <span className="font-medium">City:</span> {orderDetails.shipping_address.city}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Province:</span> {orderDetails.shipping_address.province}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Barangay:</span> {orderDetails.shipping_address.barangay}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">ZIP:</span> {orderDetails.shipping_address.zip_code}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-4">No shipping address available</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Delivery Timeline */}
                            {orderDetails.delivery && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Truck className="h-5 w-5 text-orange-500" />
                                            Delivery Timeline
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                {getDeliveryStatusIcon(orderDetails.delivery.status)}
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {orderDetails.delivery.status.replace('_', ' ').toUpperCase()}
                                                    </p>
                                                    {orderDetails.delivery.rider_name && (
                                                        <p className="text-sm text-gray-600">Assigned to: {orderDetails.delivery.rider_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {orderDetails.delivery.picked_at && (
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-gray-700">Picked Up:</p>
                                                        <p className="text-gray-600">{formatDate(orderDetails.delivery.picked_at)}</p>
                                                    </div>
                                                )}
                                                
                                                {orderDetails.delivery.delivered_at && (
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-gray-700">Delivered:</p>
                                                        <p className="text-gray-600">{formatDate(orderDetails.delivery.delivered_at)}</p>
                                                    </div>
                                                )}
                                                
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-gray-700">Delivery Created:</p>
                                                    <p className="text-gray-600">{formatDate(orderDetails.delivery.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="items" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <ShoppingBag className="h-5 w-5 text-orange-500" />
                                        Order Items
                                    </CardTitle>
                                    <CardDescription>
                                        {orderDetails.items.length} item{orderDetails.items.length !== 1 ? 's' : ''} in this order
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px] pr-4">
                                        <div className="space-y-4">
                                            {orderDetails.items.map((item, index) => (
                                                <Card key={item.checkout_id} className="border-orange-100 hover:border-orange-200 transition-colors">
                                                    <CardContent className="pt-6">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="space-y-2">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 bg-orange-50 rounded-lg">
                                                                        <ShoppingBag className="h-5 w-5 text-orange-500" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                                            {item.shop_name && (
                                                                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                                                    Shop: {item.shop_name}
                                                                                </Badge>
                                                                            )}
                                                                            {item.seller_name && (
                                                                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                                    Seller: {item.seller_name}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {item.remarks && (
                                                                    <div className="ml-11">
                                                                        <p className="text-sm text-gray-600">
                                                                            <span className="font-medium">Remarks:</span> {item.remarks}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="space-y-2 text-right">
                                                                <div className="flex items-center justify-end gap-4">
                                                                    <div className="text-right">
                                                                        <p className="text-sm text-gray-600">Quantity</p>
                                                                        <p className="font-semibold text-gray-900">{item.quantity}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm text-gray-600">Unit Price</p>
                                                                        <p className="font-semibold text-gray-900">{formatCurrency(item.unit_price)}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm text-gray-600">Total</p>
                                                                        <p className="font-semibold text-orange-600">{formatCurrency(item.total)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    
                                    <div className="mt-6 pt-6 border-t">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">Order Total</p>
                                                <p className="text-sm text-gray-600">{orderDetails.items.length} item{orderDetails.items.length !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(orderDetails.total_amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="delivery" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Truck className="h-5 w-5 text-orange-500" />
                                        Delivery Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {orderDetails.delivery ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h3 className="font-semibold text-gray-900">Delivery Status</h3>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-3 rounded-full ${getStatusColor(orderDetails.delivery.status)}`}>
                                                            {getDeliveryStatusIcon(orderDetails.delivery.status)}
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                {orderDetails.delivery.status.replace('_', ' ').toUpperCase()}
                                                            </p>
                                                            <p className="text-sm text-gray-600">Current delivery status</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {orderDetails.delivery.rider_name && (
                                                    <div className="space-y-4">
                                                        <h3 className="font-semibold text-gray-900">Assigned Rider</h3>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-3 bg-orange-100 rounded-full">
                                                                <User className="h-5 w-5 text-orange-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{orderDetails.delivery.rider_name}</p>
                                                                {orderDetails.delivery.rider_contact && (
                                                                    <p className="text-sm text-gray-600">{orderDetails.delivery.rider_contact}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-gray-900">Delivery Timeline</h3>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="h-5 w-5 text-gray-500" />
                                                            <div>
                                                                <p className="font-medium text-gray-900">Delivery Created</p>
                                                                <p className="text-sm text-gray-600">Delivery record was created</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-gray-700">{formatDate(orderDetails.delivery.created_at)}</p>
                                                    </div>
                                                    
                                                    {orderDetails.delivery.picked_at && (
                                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <Truck className="h-5 w-5 text-blue-500" />
                                                                <div>
                                                                    <p className="font-medium text-gray-900">Picked Up</p>
                                                                    <p className="text-sm text-gray-600">Rider picked up the package</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-700">{formatDate(orderDetails.delivery.picked_at)}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {orderDetails.delivery.delivered_at && (
                                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                                                <div>
                                                                    <p className="font-medium text-gray-900">Delivered</p>
                                                                    <p className="text-sm text-gray-600">Package delivered to customer</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-700">{formatDate(orderDetails.delivery.delivered_at)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Delivery Information</h3>
                                            <p className="text-gray-500">Delivery information is not available for this order.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="payment" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CreditCard className="h-5 w-5 text-orange-500" />
                                        Payment Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {orderDetails.payment ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-3 rounded-full ${
                                                            orderDetails.payment.status === 'success' 
                                                                ? 'bg-green-100' 
                                                                : 'bg-red-100'
                                                        }`}>
                                                            <CreditCard className={`h-5 w-5 ${
                                                                orderDetails.payment.status === 'success' 
                                                                    ? 'text-green-600' 
                                                                    : 'text-red-600'
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                {orderDetails.payment.status.toUpperCase()}
                                                            </p>
                                                            <p className="text-sm text-gray-600">Payment status</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 bg-orange-100 rounded-full">
                                                            <DollarSign className="h-5 w-5 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-orange-600">{formatCurrency(orderDetails.payment.amount)}</p>
                                                            <p className="text-sm text-gray-600">Payment amount</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-gray-900">Payment Details</h3>
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-gray-700">Payment Method:</p>
                                                            <p className="text-gray-900 font-semibold">{orderDetails.payment.method}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-gray-700">Transaction Date:</p>
                                                            <p className="text-gray-900">{formatDate(orderDetails.payment.transaction_date)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-gray-700">Transaction ID:</p>
                                                        <p className="font-mono text-gray-900">{orderDetails.payment.id}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payment Information</h3>
                                            <p className="text-gray-500">Payment information is not available for this order.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-4 justify-end">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="border-orange-200 text-orange-600 hover:bg-orange-50"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Orders
                        </Button>
                        
                        {orderDetails.order_status === 'shipped' && (
                            <Button
                                onClick={() => handleUpdateStatus('delivered')}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Mark as Delivered
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </UserProvider>
    );
}