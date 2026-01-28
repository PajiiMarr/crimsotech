import type { Route } from "./+types/seller-view-order"
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Download,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  Phone,
  Printer,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  XCircle,
  AlertCircle,
  Store,
  ChevronRight,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { toast } from 'sonner';

export function meta(): Route.MetaDescriptors {
    return [
        { title: "View Order" }
    ]
}

interface LoaderData {
    user: any;
    order: Order | null;
    error: string | null;
}

interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
}

interface OrderItem {
  id: string;
  cart_item: {
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      variant: string;
      shop: {
        id: string;
        name: string;
      };
    };
    quantity: number;
  };
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  is_shipped?: boolean;
  shipping_method?: string | null;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  is_processed?: boolean;
  shipping_status?: string;
  waybill_url?: string;
}

interface Order {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_method?: string | null;
  shipping_method?: string | null;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  delivery_info?: DeliveryInfo;
}

export async function loader({ request, context, params}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isCustomer"]);

    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const shopId = session.get("shopId");
    const orderId = params.orderId;

    let order: Order | null = null;
    let error: string | null = null;

    if (orderId && shopId) {
        try {
            const AxiosInstance = (await import('~/components/axios/Axios')).default;
            const response = await AxiosInstance.get(`/seller-order-list/seller_view_order/`, {
                params: { order_id: orderId, shop_id: shopId }
            });
            
            if (response.data.success) {
                order = response.data.data;
            } else {
                error = response.data.message || "Failed to load order";
            }
        } catch (err: any) {
            error = err.response?.data?.message || "Failed to load order details";
        }
    } else {
        error = "Missing order ID or shop ID";
    }

    return { user, order, error };
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  alertTitle: string;
  alertDescription: string;
  alertClassName: string;
}> = {
  pending_shipment: {
    label: "Pending Shipment",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
    alertTitle: "Order Received",
    alertDescription: "Order has been received and is being processed.",
    alertClassName: "bg-amber-50 border-amber-200",
  },
  to_ship: {
    label: "To Ship",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: Package,
    alertTitle: "Ready to Ship",
    alertDescription: "Order is packed and ready for shipping.",
    alertClassName: "bg-orange-50 border-orange-200",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Store,
    alertTitle: "Ready for Pickup",
    alertDescription: "Order is ready for customer pickup.",
    alertClassName: "bg-blue-50 border-blue-200",
  },
  awaiting_pickup: {
    label: "Awaiting Pickup",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: Clock,
    alertTitle: "Awaiting Customer Pickup",
    alertDescription: "Order is waiting for customer to pickup.",
    alertClassName: "bg-indigo-50 border-indigo-200",
  },
  picked_up: {
    label: "Picked Up",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle,
    alertTitle: "Order Picked Up",
    alertDescription: "Customer has picked up the order.",
    alertClassName: "bg-green-50 border-green-200",
  },
  shipped: {
    label: "Shipped",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Truck,
    alertTitle: "Order Shipped",
    alertDescription: "Order has been shipped to customer.",
    alertClassName: "bg-blue-50 border-blue-200",
  },
  in_transit: {
    label: "In Transit",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Truck,
    alertTitle: "In Transit",
    alertDescription: "Order is on its way to customer.",
    alertClassName: "bg-blue-50 border-blue-200",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Truck,
    alertTitle: "Out for Delivery",
    alertDescription: "Order is out for delivery today.",
    alertClassName: "bg-purple-50 border-purple-200",
  },
  completed: {
    label: "Completed",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle,
    alertTitle: "Order Completed",
    alertDescription: "Order has been successfully delivered.",
    alertClassName: "bg-green-50 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    alertTitle: "Order Cancelled",
    alertDescription: "This order has been cancelled.",
    alertClassName: "bg-red-50 border-red-200",
  },
  arrange_shipment: {
    label: "Arrange Shipment",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Truck,
    alertTitle: "Arrange Shipment",
    alertDescription: "Need to arrange shipping for this order.",
    alertClassName: "bg-amber-50 border-amber-200",
  },
};

export default function SellerViewOrder({ loaderData }: { loaderData: LoaderData }) {
    const { user, order, error } = loaderData;
    const navigate = useNavigate();

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
    };

    const getStatusConfig = (status: string) => {
        return STATUS_CONFIG[status] || {
            label: status.replace(/_/g, ' '),
            color: "text-gray-600",
            bgColor: "bg-gray-50",
            borderColor: "border-gray-200",
            icon: Clock,
            alertTitle: "Order Status",
            alertDescription: `Order is ${status.replace(/_/g, ' ')}`,
            alertClassName: "bg-gray-50 border-gray-200",
        };
    };

    const handlePrint = () => window.print();

    const handleCopyOrderNumber = () => {
        if (!order) return;
        navigator.clipboard.writeText(order.order_id);
        toast.success("Order ID copied");
    };

    const handleBack = () => navigate(-1);

    if (!order) {
        return (
            <UserProvider user={user}>
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error || "Order not found"}</AlertDescription>
                    </Alert>
                    <Button onClick={handleBack} variant="outline" className="mt-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            </UserProvider>
        );
    }

    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const isPickup = (order.delivery_method || '').toLowerCase().includes('pickup');

    return (
        <UserProvider user={user}>
            <div className="max-w-7xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-6">
                    <Button variant="ghost" onClick={handleBack} className="px-0 mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
                    </Button>
                    
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                                Order #{order.order_id}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>Placed on {formatDate(order.created_at)}</span>
                                <span>•</span>
                                <span>{order.items.length} items</span>
                                <span>•</span>
                                <span>{isPickup ? "Pickup" : "Delivery"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge className={`text-sm px-3 py-1 ${statusConfig.bgColor} ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" /> {statusConfig.label}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleCopyOrderNumber}><Copy className="w-4 h-4 mr-2" /> Copy ID</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled><Download className="w-4 h-4 mr-2" /> Invoice</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left: Order Details */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Status Alert */}
                        <Alert className={statusConfig.alertClassName}>
                            <AlertTitle className="text-sm font-semibold">{statusConfig.alertTitle}</AlertTitle>
                            <AlertDescription className="text-sm">{statusConfig.alertDescription}</AlertDescription>
                        </Alert>

                        {/* Customer & Shipping Info */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <div>
                                        <p className="text-sm font-medium">Customer</p>
                                        <p className="text-sm text-gray-600">{order.user.first_name} {order.user.last_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-gray-500" />
                                    <p className="text-sm text-gray-600">{order.user.phone || "No phone provided"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-3 w-3 text-gray-500" />
                                    <p className="text-sm text-gray-600">Payment: {order.payment_method || "N/A"}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    {isPickup ? <Store className="h-4 w-4 text-gray-500 mt-0.5" /> : <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />}
                                    <div>
                                        <p className="text-sm font-medium">{isPickup ? "Pickup Location" : "Delivery Address"}</p>
                                        <p className="text-sm text-gray-600">{order.delivery_address || "No address provided"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-3 w-3 text-gray-500" />
                                    <p className="text-sm text-gray-600">Method: {order.delivery_method || "Standard"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold">Order Items ({order.items.length})</h2>
                                <span className="text-sm text-gray-500">Total: {formatCurrency(order.total_amount)}</span>
                            </div>
                            <div className="space-y-2">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                            <Package className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{item.cart_item?.product?.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Qty: {item.quantity}</span>
                                                <span>•</span>
                                                <span>Variant: {item.cart_item?.product?.variant || "Standard"}</span>
                                                <span>•</span>
                                                <span className="font-medium">{formatCurrency(item.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary & Actions */}
                    <div className="space-y-4">
                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span>{formatCurrency(order.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shipping:</span>
                                    <span>₱0.00</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold">
                                    <span>Total:</span>
                                    <span>{formatCurrency(order.total_amount)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full justify-between"
                                    onClick={() => navigate(`/arrange-shipment?orderId=${order.order_id}`)}
                                >
                                    <span className="flex items-center">
                                        <Truck className="h-4 w-4 mr-2" /> Arrange Shipping
                                    </span>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full justify-between"
                                >
                                    <span className="flex items-center">
                                        <MessageCircle className="h-4 w-4 mr-2" /> Contact Customer
                                    </span>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </CardContent>
                        </Card>

                        {order.delivery_info && (
                            <Card className="border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Delivery Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {order.delivery_info.rider_name && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Rider:</span>
                                            <span>{order.delivery_info.rider_name}</span>
                                        </div>
                                    )}
                                    {order.delivery_info.tracking_number && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tracking:</span>
                                            <span className="font-mono">{order.delivery_info.tracking_number}</span>
                                        </div>
                                    )}
                                    {order.delivery_info.estimated_delivery && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Estimated:</span>
                                            <span>{new Date(order.delivery_info.estimated_delivery).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </UserProvider>
    );
}