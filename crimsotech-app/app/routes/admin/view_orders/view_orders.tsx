import type { Route } from "./+types/view_orders"
import { UserProvider } from '~/components/providers/user-role-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { 
  ShoppingCart, 
  User, 
  Package, 
  AlertCircle,
  MapPin,
  CreditCard,
  Calendar,
  ChevronLeft,
  Menu,
  Store,
  Tag,
  Receipt,
  Clock,
  Truck,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Image,
  MoreVertical,
  Undo,
  Ban,
  RefreshCw,
  TrendingUp,
  Percent,
  PhilippinePeso,
  DollarSign
} from 'lucide-react';
import AxiosInstance from "~/components/axios/Axios";
import { useState } from 'react';
import { useIsMobile } from "~/hooks/use-mobile";
import { useToast } from "~/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Link } from "react-router";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "View Order",
        }
    ]
}

interface MediaItem {
    id: string;
    url: string;
    file_type: string;
}

interface ShopInfo {
    id: string;
    name: string;
    contact_number?: string;
    verified?: boolean;
}

interface CategoryInfo {
    id: string;
    name: string;
}

interface ProductInfo {
    id: string;
    name: string;
    description: string;
    price: number;
    condition: string;
    is_refundable: boolean | null;
    refund_days: number;
    upload_status: string;
    created_at: string | null;
    updated_at: string | null;
    shop: ShopInfo | null;
    category: CategoryInfo | null;
    media: MediaItem[];
    primary_image: MediaItem | null;
}

interface VariantInfo {
    id: string;
    title: string;
    sku_code: string;
    price: number | null;
    compare_price: number | null;
    quantity: number;
    weight: number | null;
    weight_unit: string;
    is_active: boolean;
    is_refundable: boolean;
    refund_days: number;
    allow_swap: boolean;
    swap_type: string | null;
    swap_description: string | null;
    original_price: number | null;
    usage_period: number | null;
    usage_unit: string | null;
    depreciation_rate: number | null;
    minimum_additional_payment: number;
    maximum_additional_payment: number;
    image_url: string | null;
    critical_stock: number | null;
    value_added_tax: number | null;
    value_added_tax_amount: number | null;
    created_at: string | null;
    updated_at: string | null;
}

interface UserInfo {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    contact_number: string;
}

interface CartItemInfo {
    id: string;
    product: ProductInfo;
    variant: VariantInfo | null;
    quantity: number;
    is_ordered: boolean;
    added_at: string | null;
    user: UserInfo | null;
}

interface OrderItem {
    id: string;
    cart_item: CartItemInfo;
    voucher: {
        id: string;
        name: string;
        code: string;
        discount_type: string;
        value: number;
        minimum_spend: number;
        valid_until: string | null;
        is_active: boolean;
    } | null;
    quantity: number;
    price: number;
    subtotal: number;
    shipping_fee: number;
    transaction_fee: number;
    vat_amount: number;
    discount_applied: number;
    total_amount: number;
    status: string;
    remarks: string;
    created_at: string | null;
}

interface ShippingAddressInfo {
    id: string;
    recipient_name: string;
    recipient_phone: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    state: string;
    zip_code: string;
    country: string;
    full_address: string;
    address_type: string;
    is_default: boolean;
    building_name: string;
    floor_number: string;
    unit_number: string;
    landmark: string;
    instructions: string;
    created_at: string | null;
    updated_at: string | null;
}

interface DeliveryInfo {
    id: string;
    status: string;
    delivery_fee: number | null;
    failed_reason: string | null;
    created_at: string;
    picked_at: string | null;
    delivered_at: string | null;
}

interface Order {
    order_id: string;
    user: UserInfo;
    approval: string;
    status: string;
    total_amount: number;
    order_subtotal: number;
    order_shipping_fees: number;
    order_transaction_fees: number;
    order_vat_total: number;
    order_discount_total: number;
    order_checkout_total: number;
    payment_method: string;
    delivery_method: string;
    delivery_address: string;
    shipping_address: ShippingAddressInfo | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    refund_expire_date: string | null;
    items: OrderItem[];
    delivery?: DeliveryInfo;
}

interface LoaderData {
    user: any;
    order: Order | null;
    error?: string;
}

// Action configurations
const actionConfigs = {
    markAsShipped: {
        title: "Mark as Shipped",
        description: "Mark this order as shipped",
        confirmText: "Mark as Shipped",
        variant: "default" as const,
        icon: Truck,
        needsReason: false,
    },
    markAsDelivered: {
        title: "Mark as Delivered",
        description: "Mark this order as delivered",
        confirmText: "Mark as Delivered",
        variant: "default" as const,
        icon: CheckCircle,
        needsReason: false,
    },
    issueRefund: {
        title: "Issue Refund",
        description: "Process a refund for this order",
        confirmText: "Issue Refund",
        variant: "destructive" as const,
        icon: Undo,
        needsReason: true,
    },
    compensateRider: {
        title: "Compensate Rider",
        description: "Compensate the rider for failed delivery (return to seller)",
        confirmText: "Compensate Rider",
        variant: "default" as const,
        icon: RefreshCw,
        needsReason: false,
    },
};

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { order_id } = params;
    
    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }
    await requireRole(request, context, ["isAdmin"]);
    
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    
    if (!order_id) {
        return { user, order: null, error: "Order ID is required" };
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(order_id)) {
        return { user, order: null, error: "Invalid order ID format" };
    }
    
    try {
        const response = await AxiosInstance.get(`/admin-orders/get_order/?order_id=${order_id}`);
        if (response.data.success) {
            return { user, order: response.data.order };
        } else {
            return { user, order: null, error: response.data.error || "Failed to load order" };
        }
    } catch (error: any) {
        console.error('Error fetching order:', error);
        if (error.response?.status === 404) {
            return { user, order: null, error: "Order not found" };
        }
        return { 
            user, 
            order: null, 
            error: error.response?.data?.error || "Failed to load order data" 
        };
    }
}

export default function ViewOrder({ loaderData }: { loaderData: LoaderData }) {
    const { user, order: initialOrder, error } = loaderData;
    const [order, setOrder] = useState<Order | null>(initialOrder);
    const [loading, setLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const isMobile = useIsMobile();
    const { toast } = useToast();

    const refreshOrder = async () => {
        if (!order?.order_id) return;
        setLoading(true);
        try {
            const response = await AxiosInstance.get(`/admin-orders/get_order/?order_id=${order.order_id}`);
            if (response.data.success) {
                setOrder(response.data.order);
            }
        } catch (error: any) {
            console.error('Error refreshing order:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
            pending: { variant: "secondary", label: "Pending" },
            processing: { variant: "default", label: "Processing" },
            shipped: { variant: "default", label: "Shipped" },
            delivered: { variant: "default", label: "Delivered" },
            cancelled: { variant: "destructive", label: "Cancelled" },
            completed: { variant: "default", label: "Completed" },
            refunded: { variant: "destructive", label: "Refunded" },
            failed: { variant: "destructive", label: "Failed" }
        };
        const config = statusConfig[status?.toLowerCase() || 'pending'] || statusConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getAvailableActions = () => {
        if (!order) return [];
        const actions = [];
        const status = order.status?.toLowerCase();
        const deliveryStatus = order.delivery?.status?.toLowerCase();
        
        if (status === 'processing') {
            actions.push({
                id: "markAsShipped",
                label: "Mark as Shipped",
                icon: Truck,
                variant: "outline" as const,
            });
        }
        if (status === 'shipped') {
            actions.push({
                id: "markAsDelivered",
                label: "Mark as Delivered",
                icon: CheckCircle,
                variant: "outline" as const,
            });
        }
        if (status === 'delivered' || status === 'completed') {
            actions.push({
                id: "issueRefund",
                label: "Issue Refund",
                icon: Undo,
                variant: "destructive" as const,
            });
        }
        if (deliveryStatus === 'failed' && order.delivery?.failed_reason === 'return_to_seller') {
            actions.push({
                id: "compensateRider",
                label: "Compensate Rider",
                icon: RefreshCw,
                variant: "outline" as const,
            });
        }
        return actions;
    };

    const availableActions = getAvailableActions();
    const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null;

    const handleActionClick = (actionId: string) => {
        setActiveAction(actionId);
        setReason("");
        setShowDialog(true);
    };

    const handleConfirm = async () => {
        if (!activeAction || !order) return;
        if (currentAction?.needsReason && !reason.trim()) {
            toast({
                title: "Validation Error",
                description: "Please provide a reason for this action",
                variant: "destructive",
            });
            return;
        }
        setLoading(true);
        try {
            let response;
            switch (activeAction) {
                case 'markAsShipped':
                    response = await AxiosInstance.post('/admin-orders/mark_as_shipped/', {
                        order_id: order.order_id,
                    });
                    break;
                case 'markAsDelivered':
                    response = await AxiosInstance.post('/admin-orders/mark_as_delivered/', {
                        order_id: order.order_id,
                    });
                    break;
                case 'issueRefund':
                    response = await AxiosInstance.post('/admin-orders/issue_refund/', {
                        order_id: order.order_id,
                        reason: reason,
                    });
                    break;
                case 'compensateRider':
                    response = await AxiosInstance.post('/admin-orders/compensate_rider/', {
                        order_id: order.order_id,
                    });
                    break;
                default:
                    return;
            }
            if (response?.data.success) {
                toast({
                    title: "Success",
                    description: response.data.message || "Action completed successfully",
                });
                await refreshOrder();
            }
        } catch (error: any) {
            console.error('Error executing action:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to complete action",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setShowDialog(false);
            setActiveAction(null);
            setReason("");
        }
    };

    const handleCancel = () => {
        if (loading) return;
        setShowDialog(false);
        setActiveAction(null);
        setReason("");
    };

    const renderDialogContent = () => {
        if (!currentAction || !order) return null;
        return (
            <>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">{currentAction.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {currentAction.description}
                        </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">Order ID: {order.order_id.slice(0, 16)}...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Customer: {order.user.first_name} {order.user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total: {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Current Status: {order.status}
                        </p>
                        {activeAction === 'compensateRider' && order.delivery && (
                            <>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Delivery Status: {order.delivery.status}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Failed Reason: {order.delivery.failed_reason === 'return_to_seller' ? 'Return to Seller' : order.delivery.failed_reason}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Delivery Fee: {formatCurrency(order.delivery.delivery_fee || 0)}
                                </p>
                            </>
                        )}
                    </div>
                    {currentAction.needsReason && (
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-medium">
                                Reason <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please provide a reason..."
                                className="h-10"
                                required
                            />
                        </div>
                    )}
                    {currentAction.variant === "destructive" && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                            <p className="text-sm font-medium text-destructive flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Warning: This action may have consequences
                            </p>
                        </div>
                    )}
                    {activeAction === 'compensateRider' && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                            <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                                <RefreshCw className="w-4 h-4" />
                                Compensation Information
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                The rider will receive compensation for the delivery attempt and returning the order to seller.
                            </p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderDesktopDialog = () => {
        if (!currentAction || !order) return null;
        return (
            <AlertDialog open={showDialog} onOpenChange={!loading ? setShowDialog : undefined}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    {renderDialogContent()}
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel onClick={handleCancel} disabled={loading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirm}
                            disabled={loading || (currentAction.needsReason && !reason.trim())}
                            className={currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                currentAction.confirmText
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const renderMobileDialog = () => {
        if (!currentAction || !order) return null;
        return (
            <Drawer open={showDialog} onOpenChange={!loading ? setShowDialog : undefined}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>{currentAction.title}</DrawerTitle>
                        <DrawerDescription>{currentAction.description}</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4">
                        {renderDialogContent()}
                    </div>
                    <DrawerFooter className="pt-2">
                        <Button 
                            onClick={handleConfirm}
                            disabled={loading || (currentAction.needsReason && !reason.trim())}
                            className={currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                currentAction.confirmText
                            )}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleCancel} disabled={loading}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    };

    if (error) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-2">Error Loading Order</h2>
                            <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    if (!order) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <ShoppingCart className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-2">Order Not Found</h2>
                            <p className="text-muted-foreground text-sm sm:text-base">The requested order could not be found.</p>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    return (
        <UserProvider user={user}>
            <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {loading && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-xs sm:text-sm text-muted-foreground">Processing...</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <nav className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                        <a href="/admin" className="hover:text-primary hover:underline flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Admin</span>
                        </a>
                        <span>&gt;</span>
                        <Link to="/admin/orders" className="hover:text-primary hover:underline">
                            Orders
                        </Link>
                        <span>&gt;</span>
                        <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
                            Order #{order.order_id.slice(0, 8)}...
                        </span>
                    </nav>
                    {availableActions.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto">
                                    <MoreVertical className="w-4 h-4 mr-2" />
                                    Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {availableActions.map((action, index) => {
                                    const isDestructive = action.variant === "destructive";
                                    const prevAction = availableActions[index - 1];
                                    const needsSeparator = isDestructive && prevAction && prevAction.variant !== "destructive";
                                    return (
                                        <div key={action.id}>
                                            {needsSeparator && <DropdownMenuSeparator />}
                                            <DropdownMenuItem
                                                onClick={() => handleActionClick(action.id)}
                                                className={`flex items-center gap-2 cursor-pointer ${
                                                    isDestructive 
                                                        ? "text-destructive focus:text-destructive" 
                                                        : ""
                                                }`}
                                            >
                                                <action.icon className="w-4 h-4" />
                                                {action.label}
                                            </DropdownMenuItem>
                                        </div>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg sm:text-xl">Order #{order.order_id.slice(0, 8)}...</CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-1">
                                    {new Date(order.created_at).toLocaleString()}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(order.status)}
                                {order.delivery && (
                                    <Badge variant="outline" className="text-xs">
                                        <Truck className="w-3 h-3 mr-1" />
                                        Delivery: {order.delivery.status}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-6">
                        {/* Order Summary - Enhanced with financial breakdown */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Receipt className="w-4 h-4" />
                                Order Financial Summary
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                                    <p className="text-base font-semibold">{formatCurrency(order.order_subtotal)}</p>
                                    <p className="text-xs text-muted-foreground">Before fees & discounts</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Shipping Fee</p>
                                    <p className="text-base font-semibold">{formatCurrency(order.order_shipping_fees)}</p>
                                    <p className="text-xs text-muted-foreground">Delivery charge</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Discount Applied</p>
                                    <p className="text-base font-semibold text-green-600">-{formatCurrency(order.order_discount_total)}</p>
                                    <p className="text-xs text-muted-foreground">Voucher discount</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Transaction Fee</p>
                                    <p className="text-base font-semibold text-orange-600">{formatCurrency(order.order_transaction_fees)}</p>
                                    <p className="text-xs text-muted-foreground">5% capped at ₱50</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">VAT Collected</p>
                                    <p className="text-base font-semibold">{formatCurrency(order.order_vat_total)}</p>
                                    <p className="text-xs text-muted-foreground">12% Value Added Tax</p>
                                </div>
                                <div className="bg-primary/10 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                                    <p className="text-xs text-muted-foreground">Final payment</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Customer & Delivery */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Customer Information
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Name: </span>
                                        <span className="font-medium">{order.user.first_name} {order.user.last_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email: </span>
                                        <span className="font-medium">{order.user.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Username: </span>
                                        <span className="font-medium">@{order.user.username}</span>
                                    </div>
                                    {order.user.contact_number && (
                                        <div>
                                            <span className="text-muted-foreground">Contact: </span>
                                            <span className="font-medium">{order.user.contact_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Delivery Address
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.delivery_address}</p>
                                {order.shipping_address && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <p>Recipient: {order.shipping_address.recipient_name}</p>
                                        <p>Phone: {order.shipping_address.recipient_phone}</p>
                                        {order.shipping_address.instructions && (
                                            <p className="mt-1 italic">Note: {order.shipping_address.instructions}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Delivery Information (if failed) */}
                        {order.delivery && order.delivery.status === 'failed' && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        Delivery Failed Information
                                    </h3>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Failed Reason: </span>
                                                <span className="font-medium text-red-700">
                                                    {order.delivery.failed_reason === 'return_to_seller' 
                                                        ? 'Return to Seller' 
                                                        : order.delivery.failed_reason || 'Unknown'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Delivery Fee: </span>
                                                <span className="font-medium">{formatCurrency(order.delivery.delivery_fee || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Requested Date: </span>
                                                <span className="font-medium">{new Date(order.delivery.created_at).toLocaleString()}</span>
                                            </div>
                                            {order.delivery.picked_at && (
                                                <div>
                                                    <span className="text-muted-foreground">Picked Up: </span>
                                                    <span className="font-medium">{new Date(order.delivery.picked_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <p className="text-sm text-red-700">
                                                The rider has returned the order to the seller. The rider is eligible for delivery fee compensation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Order Items with Financial Breakdown */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Order Items ({order.items.length})
                            </h3>
                            <div className="space-y-3">
                                {order.items.map((item) => {
                                    const variant = item.cart_item.variant;
                                    const product = item.cart_item.product;
                                    const productImage = product.primary_image?.url || variant?.image_url;
                                    return (
                                        <div key={item.id} className="border rounded-lg p-3 sm:p-4">
                                            <div className="flex gap-3">
                                                {productImage && (
                                                    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md border bg-muted overflow-hidden">
                                                        <img
                                                            src={productImage}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = '/Crimsotech.png';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-sm sm:text-base break-words">{product.name}</h4>
                                                            {variant && variant.title !== product.name && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">{variant.title}</p>
                                                            )}
                                                            {variant?.sku_code && (
                                                                <p className="text-xs text-muted-foreground">SKU: {variant.sku_code}</p>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-xs">
                                                                    <Store className="w-3 h-3 mr-1" />
                                                                    {product.shop?.name || 'Unknown Shop'}
                                                                </Badge>
                                                                {getStatusBadge(item.status)}
                                                                {variant && variant.quantity <= 0 && (
                                                                    <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <div className="text-base sm:text-lg font-bold text-primary">
                                                                {formatCurrency(item.total_amount)}
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-muted-foreground">
                                                                Unit: {formatCurrency(item.price)} x {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Item Financial Breakdown */}
                                                    <div className="mt-3 pt-2 border-t border-dashed">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                            <div>
                                                                <p className="text-muted-foreground">Subtotal</p>
                                                                <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Shipping</p>
                                                                <p className="font-medium">{formatCurrency(item.shipping_fee)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Transaction Fee</p>
                                                                <p className="font-medium">{formatCurrency(item.transaction_fee)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">VAT</p>
                                                                <p className="font-medium">{formatCurrency(item.vat_amount)}</p>
                                                            </div>
                                                            {item.discount_applied > 0 && (
                                                                <div className="col-span-2 sm:col-span-4">
                                                                    <p className="text-muted-foreground">Discount Applied</p>
                                                                    <p className="font-medium text-green-600">-{formatCurrency(item.discount_applied)}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.voucher && (
                                                        <div className="bg-muted/50 rounded-lg p-2 sm:p-3 mt-2">
                                                            <div className="flex items-center gap-2">
                                                                <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                                <div>
                                                                    <p className="text-xs sm:text-sm font-medium">{item.voucher.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Code: {item.voucher.code} • Discount: {formatCurrency(item.voucher.value)} {item.voucher.discount_type === 'percentage' ? '%' : 'OFF'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isMobile ? renderMobileDialog() : renderDesktopDialog()}
            </div>
        </UserProvider>
    );
}