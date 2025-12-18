import type { Route } from "./+types/active-orders-details"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import AxiosInstance from '~/components/axios/Axios';
import { useNavigate } from "react-router";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Active Order Details",
        }
    ]
}

interface LoaderData {
    user: any;
    orderDetails?: any;
    error?: string;
}

export async function loader({ request, context, params}: Route.LoaderArgs): Promise<LoaderData> {
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

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    // Extract the order ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const orderId = pathSegments[pathSegments.length - 1]; // Get the last segment which should be the order ID
    
    // Validate the order ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(orderId)) {
        return { 
            user, 
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
                    'Cookie': session.get('session') || ''
                }
            }
        );
        orderDetails = response.data;
    } catch (error: any) {
        console.error("Error fetching order details:", error);
        
        if (error.response) {
            // Server responded with error status
            switch (error.response.status) {
                case 404:
                    error = "Order not found";
                    break;
                case 400:
                    error = error.response.data?.error || "Invalid order ID";
                    break;
                case 401:
                    error = "Authentication required";
                    break;
                case 403:
                    error = "Access denied";
                    break;
                default:
                    error = `Server error: ${error.response.status}`;
            }
        } else if (error.request) {
            // Request was made but no response
            error = "No response from server. Please check your connection.";
        } else {
            // Something else happened
            error = "Failed to fetch order details";
        }
    }

    return { 
        user, 
        orderDetails, 
        error: error as string | null 
    };
}

export default function ActiveOrderDetails({ loaderData}: { loaderData: LoaderData }){
    const { user, orderDetails, error } = loaderData;
    const navigate = useNavigate();

    // If there's an error in the loader, show it
    if (error) {
        return (
            <UserProvider user={user}>
                <div className="min-h-screen bg-gray-50 p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto mt-10">
                        <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Order</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </UserProvider>
        );
    }

    return (
        <UserProvider user={user}>
            <div className="min-h-screen bg-gray-50">
                {/* Simple UI showing order details */}
                <div className="bg-orange-600 text-white p-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-orange-700 transition-colors"
                        >
                            ← Back
                        </button>
                        <h1 className="text-2xl font-bold">Order Details</h1>
                    </div>
                </div>
                
                <div className="max-w-6xl mx-auto p-4">
                    {orderDetails ? (
                        <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
                            <h2 className="text-xl font-bold mb-4 text-orange-600">
                                Order #{orderDetails.order_id}
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Status</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            orderDetails.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                                            orderDetails.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            orderDetails.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {orderDetails.order_status.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Total Amount</h3>
                                        <p className="text-2xl font-bold text-orange-600">
                                            ₱{parseFloat(orderDetails.total_amount).toLocaleString('en-PH')}
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Payment Method</h3>
                                        <p>{orderDetails.payment_method}</p>
                                    </div>
                                </div>
                                
                                {/* Customer Info */}
                                <div className="space-y-4">
                                    {orderDetails.customer && (
                                        <div>
                                            <h3 className="font-semibold text-gray-700">Customer</h3>
                                            <p>{orderDetails.customer.name}</p>
                                            <p className="text-sm text-gray-600">{orderDetails.customer.contact_number}</p>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <h3 className="font-semibold text-gray-700">Order Date</h3>
                                        <p>{new Date(orderDetails.created_at).toLocaleDateString('en-PH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Shipping Address */}
                            {orderDetails.shipping_address && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="font-medium">{orderDetails.shipping_address.recipient_name}</p>
                                        <p>{orderDetails.shipping_address.full_address}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {orderDetails.shipping_address.recipient_phone}
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Items List */}
                            {orderDetails.items && orderDetails.items.length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-semibold text-gray-700 mb-4">Order Items</h3>
                                    <div className="space-y-3">
                                        {orderDetails.items.map((item: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">₱{parseFloat(item.price).toLocaleString('en-PH')}</p>
                                                    <p className="text-sm text-gray-600">Total: ₱{parseFloat(item.total).toLocaleString('en-PH')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-center items-center py-20">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading order details...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </UserProvider>
    );
}