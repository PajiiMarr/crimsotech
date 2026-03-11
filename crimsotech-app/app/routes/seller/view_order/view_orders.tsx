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
  Handshake,
  MessageCircle,
  UserRoundCheck,
  CheckCheck,
  Loader2,
  Ship,
  Package2,
  MoreHorizontal
} from 'lucide-react';
import AxiosInstance from "~/components/axios/Axios";
import { useState, useEffect } from 'react';
import { useIsMobile } from "~/hooks/use-mobile";
import { toast } from 'sonner';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Link, useNavigate } from "react-router";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "View Order | Seller",
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
    price: string;
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
    variant_image?: string | null;
}

interface VariantInfo {
    id: string;
    title: string;
    sku_code: string;
    price: string | null;
    compare_price: string | null;
    quantity: number;
    weight: string | null;
    weight_unit: string;
    is_active: boolean;
    is_refundable: boolean;
    refund_days: number;
    allow_swap: boolean;
    swap_type: string | null;
    swap_description: string | null;
    original_price: string | null;
    usage_period: number | null;
    usage_unit: string | null;
    depreciation_rate: number | null;
    minimum_additional_payment: string;
    maximum_additional_payment: string;
    image_url: string | null;
    critical_stock: number | null;
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
        value: string;
        minimum_spend: string;
        valid_until: string | null;
        is_active: boolean;
    } | null;
    total_amount: string;
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

interface ReceiptInfo {
    url: string;
    file_name: string;
    file_type: string;
    uploaded_at: string;
}

interface DeliveryInfo {
    delivery_id?: string;
    rider_name?: string;
    status?: string;
    tracking_number?: string;
    estimated_delivery?: string;
    submitted_at?: string;
    is_pending_offer?: boolean;
    delivery_fee?: number;
    distance_km?: number;
    estimated_minutes?: number;
    rider_contact?: string;
}

interface Order {
    order_id: string;
    user: UserInfo;
    approval: string;
    status: string;
    total_amount: string;
    payment_method: string;
    delivery_method: string;
    delivery_address: string;
    shipping_address: ShippingAddressInfo | null;
    receipt: ReceiptInfo | null;
    delivery_info?: DeliveryInfo;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    items: OrderItem[];
}

interface AvailableActionsResponse {
    success: boolean;
    data: {
        order_id: string;
        current_status: string;
        is_pickup: boolean;
        has_pending_offer: boolean;
        is_pending_approval: boolean;
        available_actions: string[];
    };
}

interface LoaderData {
    user: any;
    shopId: string | null;
}

// Status badge configuration
const STATUS_CONFIG = {
    pending_shipment: { 
        label: 'Pending',
        variant: 'secondary' as const,
        icon: Clock
    },
    to_ship: { 
        label: 'Processing',
        variant: 'default' as const,
        icon: Loader2
    },
    processing: {
        label: 'Processing',
        variant: 'default' as const,
        icon: Loader2
    },
    ready_for_pickup: { 
        label: 'Ready for Pickup', 
        variant: 'default' as const,
        icon: Store
    },
    shipped: { 
        label: 'Shipped', 
        variant: 'default' as const,
        icon: Ship
    },
    in_transit: { 
        label: 'In Transit', 
        variant: 'default' as const,
        icon: Truck
    },
    out_for_delivery: { 
        label: 'Out for Delivery', 
        variant: 'default' as const,
        icon: Truck
    },
    completed: { 
        label: 'Completed', 
        variant: 'default' as const,
        icon: CheckCircle
    },
    cancelled: { 
        label: 'Cancelled', 
        variant: 'destructive' as const,
        icon: XCircle
    },
    pending_offer: { 
        label: 'Pending Offer', 
        variant: 'outline' as const,
        icon: MessageCircle
    },
    pending_approval: { 
        label: 'Pending Approval', 
        variant: 'secondary' as const,
        icon: Clock
    },
    approved: { 
        label: 'Approved', 
        variant: 'default' as const,
        icon: CheckCheck
    },
    default: { 
        label: 'Unknown', 
        variant: 'outline' as const,
        icon: Clock
    }
};

// Action configurations
const actionConfigs = {
    confirmOrder: {
        title: "Confirm Order",
        description: "Confirm this order and proceed with processing",
        confirmText: "Confirm",
        variant: "default" as const,
        icon: CheckCircle,
        needsReason: false,
    },
    cancelOrder: {
        title: "Cancel Order",
        description: "Cancel this order and notify the customer",
        confirmText: "Cancel Order",
        variant: "destructive" as const,
        icon: XCircle,
        needsReason: true,
    },
    prepareShipment: {
        title: "Prepare for Shipment",
        description: "Prepare this order for shipping",
        confirmText: "Prepare",
        variant: "default" as const,
        icon: Package,
        needsReason: false,
    },
    markAsPickedUp: {
        title: "Mark as Picked Up",
        description: "Mark this pickup order as picked up by customer",
        confirmText: "Mark as Picked Up",
        variant: "default" as const,
        icon: CheckCircle,
        needsReason: false,
    },
    markAsReady: {
        title: "Mark as Ready for Pickup",
        description: "Mark this order as ready for customer pickup",
        confirmText: "Mark as Ready",
        variant: "default" as const,
        icon: Store,
        needsReason: false,
    },
};

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isCustomer"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    
    const shopId = session.get("shopId") || null;

    return { user, shopId };
}

export default function ViewOrder({ loaderData, params }: Route.ComponentProps) {
    const { user, shopId } = loaderData;
    const { orderId } = params;
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        console.log('ViewOrder mounted with:', { orderId, shopId });
        
        if (!orderId) {
            setError("Order ID is missing");
            setLoading(false);
            return;
        }
        
        if (!shopId) {
            setError("Shop ID is missing. Please make sure you have a shop.");
            setLoading(false);
            return;
        }
        
        fetchOrderDetails();
    }, [orderId, shopId]);

    // Load available actions when order is loaded
    useEffect(() => {
        if (order && shopId) {
            loadAvailableActions();
        }
    }, [order]);

    const fetchOrderDetails = async () => {
        console.log('Fetching order details...');
        setLoading(true);
        setError(null);
        
        try {
            console.log('Making API request to:', '/seller-order-list/seller_view_order/', {
                params: {
                    orderId,
                    shop_id: shopId
                }
            });
            
            const response = await AxiosInstance.get('/seller-order-list/seller_view_order/', {
                params: {
                    order_id: orderId,
                    shop_id: shopId
                }
            });
            
            console.log('API Response:', response.data);
            
            if (response.data.success) {
                setOrder(response.data.data);
                console.log('Order set successfully:', response.data.data);
            } else {
                setError(response.data.message || "Failed to load order details");
            }
        } catch (error: any) {
            console.error('Error fetching order:', error);
            
            if (error.code === 'ERR_NETWORK') {
                setError("Network error. Please check if the server is running.");
            } else if (error.response?.status === 404) {
                setError("Order not found or API endpoint doesn't exist.");
            } else if (error.response?.status === 403) {
                setError("You don't have permission to view this order.");
            } else {
                setError(error.response?.data?.message || error.message || "Failed to load order data");
            }
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableActions = async () => {
        if (!order || !shopId) return;
        
        setLoadingActions(true);
        
        try {
            const response = await AxiosInstance.get<AvailableActionsResponse>(
                `/seller-order-list/${order.order_id}/available_actions/`,
                {
                    params: { shop_id: shopId }
                }
            );
            
            if (response.data.success) {
                const actions = response.data.data.available_actions || [];
                const isPendingApprovalFromBackend = response.data.data.is_pending_approval || false;
                
                setPendingApproval(isPendingApprovalFromBackend);
                setAvailableActions(actions);
            }
        } catch (error: any) {
            console.error('Error loading available actions:', error);
            toast.error("Failed to load actions", {
                description: "Could not load available actions for this order."
            });
        } finally {
            setLoadingActions(false);
        }
    };

    const refreshOrder = async () => {
        await fetchOrderDetails();
        await loadAvailableActions();
    };

    // Helper functions matching seller-order-list
    const isPickupOrder = (order: Order) => {
        const method = order.delivery_method || '';
        return method?.toLowerCase().includes('pickup') || method?.toLowerCase().includes('store');
    };

    const isDeliveryOrder = (order: Order) => {
        return !isPickupOrder(order);
    };

    const isPendingApproval = (order: Order): boolean => {
        return order.approval?.toLowerCase() === 'pending' && order.receipt !== null;
    };

    const isApproved = (order: Order): boolean => {
        return order.approval?.toLowerCase() === 'accepted';
    };

    const isWaitingForRider = (order: Order): boolean => {
        return order.status?.toLowerCase() === 'to_ship' && 
               order.delivery_info?.status === 'pending_offer' &&
               !!order.delivery_info?.rider_name;
    };

    const hasPendingDeliveryOffer = (order: Order): boolean => {
        return order.delivery_info?.status === 'pending_offer';
    };

    const hasActiveDelivery = (order: Order): boolean => {
        return !!(order.delivery_info?.delivery_id && 
                 order.delivery_info?.status !== 'pending_offer');
    };

    const getStatusBadge = (status: string, order: Order) => {
        const isPickup = isPickupOrder(order);
        const hasPendingOffer = hasPendingDeliveryOffer(order);
        const hasActiveDeliveryOrder = order.delivery_info?.status === 'pending';
        const pendingApprovalStatus = pendingApproval || isPendingApproval(order);
        const approved = isApproved(order);

        let statusKey = (status || 'default').toLowerCase();

        // Override for special cases
        if (hasPendingOffer) statusKey = 'pending_offer';
        else if (hasActiveDeliveryOrder && statusKey === 'arrange_shipment') statusKey = 'pending_offer';
        else if (isPickup && statusKey === 'pending_shipment') statusKey = 'ready_for_pickup';
        else if (pendingApprovalStatus) statusKey = 'pending_approval';
        else if (approved) statusKey = 'approved';

        const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    const getApprovalBadge = (approval: string) => {
        const approvalConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
            pending: { variant: "secondary", label: "Pending Approval" },
            accepted: { variant: "default", label: "Approved" },
            rejected: { variant: "destructive", label: "Rejected" }
        };
        
        const config = approvalConfig[approval?.toLowerCase() || 'pending'] || approvalConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Action handlers matching seller-order-list
    const triggerRiderAssignment = async (orderId: string) => {
        try {
            console.log(`Triggering rider assignment for order: ${orderId}`);
            
            const response = await AxiosInstance.post('/seller-order-list/assign_deliveries/', {}, {
                params: { order_id: orderId }
            });
            
            if (response.data.success) {
                console.log('Rider assignment triggered successfully:', response.data);
                
                setTimeout(async () => {
                    try {
                        await AxiosInstance.post('/seller-order-list/check_delivery_responses/', {}, {
                            params: { order_id: orderId }
                        });
                        console.log('Delivery responses check triggered');
                    } catch (error) {
                        console.error('Error checking delivery responses:', error);
                    }
                }, 2000);
            }
        } catch (error: any) {
            console.error('Error triggering rider assignment:', error);
        }
    };

    const handleUpdateStatus = async (actionType: string) => {
        if (!order || !shopId) return;

        setActionLoading(true);
        try {
            const response = await AxiosInstance.patch(
                `/seller-order-list/${order.order_id}/update_status/`,
                { action_type: actionType },
                { params: { shop_id: shopId } }
            );
            
            if (response.data.success) {
                const { updated_order, updated_available_actions } = response.data.data;
                
                // Update order with new data
                if (updated_order) {
                    setOrder(updated_order);
                }
                
                // Update available actions
                if (updated_available_actions) {
                    setAvailableActions(updated_available_actions);
                }

                // If the action was 'confirm' and order is for delivery, trigger rider assignment
                if (actionType === 'confirm' && isDeliveryOrder(order)) {
                    await triggerRiderAssignment(order.order_id);
                    
                    toast.info("Rider assignment initiated", {
                        description: "Looking for available riders for this delivery order."
                    });
                }
                
                toast.success("Success", {
                    description: response.data.message || "Action completed successfully"
                });
                
                // Refresh order data
                await refreshOrder();
            }
        } catch (error: any) {
            console.error('Error executing action:', error);
            toast.error("Error", {
                description: error.response?.data?.message || "Failed to complete action"
            });
        } finally {
            setActionLoading(false);
            setShowDialog(false);
            setActiveAction(null);
            setReason("");
        }
    };

    const handlePrepareShipment = async () => {
        if (!order || !shopId) return;

        setActionLoading(true);
        try {
            const response = await AxiosInstance.post(
                `/seller-order-list/${order.order_id}/prepare_shipment/`,
                {},
                { params: { shop_id: shopId } }
            );
            
            if (response.data.success) {
                const { updated_order, updated_available_actions } = response.data.data;
                
                // Update order with new data
                if (updated_order) {
                    setOrder(updated_order);
                }
                
                // Update available actions
                if (updated_available_actions) {
                    setAvailableActions(updated_available_actions);
                }
                
                toast.success("Order prepared for shipment", {
                    description: response.data.message || "The order is now ready for shipping arrangements."
                });
                
                // Refresh order data
                await refreshOrder();
            }
        } catch (error: any) {
            console.error('Error preparing shipment:', error);
            toast.error("Failed to prepare shipment", {
                description: error.response?.data?.message || "Please try again."
            });
        } finally {
            setActionLoading(false);
            setShowDialog(false);
            setActiveAction(null);
        }
    };

    const handleCancelOrder = async () => {
        if (!order || !shopId) return;

        if (!reason.trim()) {
            toast.error("Validation Error", {
                description: "Please provide a reason for cancellation"
            });
            return;
        }

        setActionLoading(true);
        try {
            const response = await AxiosInstance.patch(
                `/seller-order-list/${order.order_id}/update_status/`,
                { action_type: 'cancel' },
                { params: { shop_id: shopId } }
            );
            
            if (response.data.success) {
                const { updated_order, updated_available_actions } = response.data.data;
                
                // Update order with new data
                if (updated_order) {
                    setOrder(updated_order);
                }
                
                // Update available actions
                if (updated_available_actions) {
                    setAvailableActions(updated_available_actions);
                }
                
                toast.success("Order cancelled", {
                    description: response.data.message || "Order cancelled successfully"
                });
                
                // Refresh order data
                await refreshOrder();
            }
        } catch (error: any) {
            console.error('Error cancelling order:', error);
            toast.error("Failed to cancel order", {
                description: error.response?.data?.message || "Please try again."
            });
        } finally {
            setActionLoading(false);
            setShowDialog(false);
            setActiveAction(null);
            setReason("");
        }
    };

    const handleActionClick = (actionId: string) => {
        setActiveAction(actionId);
        setReason("");
        setShowDialog(true);
    };

    const handleConfirm = async () => {
        if (!activeAction || !order) return;

        switch (activeAction) {
            case 'confirmOrder':
                await handleUpdateStatus('confirm');
                break;
            case 'cancelOrder':
                await handleCancelOrder();
                break;
            case 'prepareShipment':
                await handlePrepareShipment();
                break;
            case 'markAsReady':
                await handleUpdateStatus('ready_for_pickup');
                break;
            case 'markAsPickedUp':
                await handleUpdateStatus('picked_up');
                break;
            case 'arrangeShipment':
                navigate(`/seller/orders/${order.order_id}/arrange-shipment`);
                setShowDialog(false);
                setActiveAction(null);
                break;
            default:
                break;
        }
    };

    const handleCancel = () => {
        if (actionLoading) return;
        setShowDialog(false);
        setActiveAction(null);
        setReason("");
    };

    // Helper functions
    const getFileExtension = (filename: string) => {
        if (!filename) return '';
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const isImageFile = (fileType: string) => {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileType?.toLowerCase() || '');
    };

    const getFileName = (filepath: string) => {
        if (!filepath) return 'receipt';
        return filepath.split('/').pop() || 'receipt';
    };

    const formatCurrency = (amount: string) => {
        return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                    
                    {/* Order info */}
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">Order ID: {order.order_id.slice(0, 16)}...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Customer: {order.user.first_name} {order.user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Amount: {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Current Status: {order.status}
                        </p>
                    </div>
                    
                    {/* Reason input for actions that need it */}
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
                    
                    {/* Warning message for destructive actions */}
                    {currentAction.variant === "destructive" && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                            <p className="text-sm font-medium text-destructive flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Warning: This action cannot be undone
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
            <AlertDialog open={showDialog} onOpenChange={!actionLoading ? setShowDialog : undefined}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    {renderDialogContent()}
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel onClick={handleCancel} disabled={actionLoading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirm}
                            disabled={actionLoading || (currentAction.needsReason && !reason.trim())}
                            className={currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            {actionLoading ? (
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
            <Drawer open={showDialog} onOpenChange={!actionLoading ? setShowDialog : undefined}>
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
                            disabled={actionLoading || (currentAction.needsReason && !reason.trim())}
                            className={currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            {actionLoading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                currentAction.confirmText
                            )}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    };

    const renderMobileActionSheet = () => {
        if (!order) return null;

        const isPending = order.status?.toLowerCase() === 'pending_shipment' && !pendingApproval;
        const canCancel = !['cancelled', 'completed'].includes(order.status?.toLowerCase() || '') && !pendingApproval;
        const hasReceipt = order.receipt !== null;

        return (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto">
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        Actions
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Order Actions</SheetTitle>
                        <SheetDescription>
                            Choose an action for order #{order.order_id.slice(0, 8)}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-2 pb-4">
                        {/* View Details - Always available */}
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-10"
                            onClick={() => {
                                // Already on view details page
                                // Could scroll to top or refresh
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </Button>

                        {/* View Receipt - If available */}
                        {hasReceipt && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10"
                                onClick={() => {
                                    if (order.receipt?.url) {
                                        window.open(order.receipt.url, '_blank');
                                    }
                                }}
                            >
                                <Receipt className="mr-2 h-4 w-4 text-purple-600" />
                                View Receipt
                            </Button>
                        )}

                        {/* Confirm - For pending orders */}
                        {isPending && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10"
                                onClick={() => handleActionClick('confirmOrder')}
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Confirm Order
                            </Button>
                        )}

                        {/* Prepare Shipment - From available actions */}
                        {availableActions.includes('prepare_shipment') && !pendingApproval && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10"
                                onClick={() => handleActionClick('prepareShipment')}
                            >
                                <Package2 className="mr-2 h-4 w-4 text-blue-600" />
                                Prepare Shipment
                            </Button>
                        )}

                        {/* Mark as Ready for Pickup */}
                        {availableActions.includes('ready_for_pickup') && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10"
                                onClick={() => handleActionClick('markAsReady')}
                            >
                                <Store className="mr-2 h-4 w-4 text-blue-600" />
                                Mark Ready for Pickup
                            </Button>
                        )}

                        {/* Mark as Picked Up */}
                        {availableActions.includes('picked_up') && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10"
                                onClick={() => handleActionClick('markAsPickedUp')}
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Mark as Picked Up
                            </Button>
                        )}


                        {/* Cancel - If allowed */}
                        {canCancel && (
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleActionClick('cancelOrder')}
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel Order
                            </Button>
                        )}
                    </div>
                    <SheetFooter>
                        <SheetClose asChild>
                            <Button variant="outline" className="w-full">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );
    };

    const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null;

    if (loading) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <div className="flex justify-center items-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            </div>
                            <p className="text-muted-foreground">Loading order details...</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Order ID: {orderId} | Shop ID: {shopId}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    if (error || !order) {
        return (
            <UserProvider user={user}>
                <div className="container mx-auto p-4 sm:p-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6 text-center">
                            <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-2">Error Loading Order</h2>
                            <p className="text-muted-foreground text-sm sm:text-base mb-4">{error || "Order not found"}</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Order ID: {orderId}<br />
                                Shop ID: {shopId}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button onClick={() => fetchOrderDetails()}>
                                    Retry
                                </Button>
                                <Button variant="outline" onClick={() => navigate('/seller/orders')}>
                                    Back to Orders
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </UserProvider>
        );
    }

    const pendingApprovalStatus = pendingApproval || isPendingApproval(order);
    const approved = isApproved(order);
    const waitingForRider = isWaitingForRider(order);
    const isPickup = isPickupOrder(order);

    return (
        <UserProvider user={user}>
            <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {actionLoading && (
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
                        <Link to="/seller/seller-order-list" className="hover:text-primary hover:underline flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Orders</span>
                        </Link>
                        <span>&gt;</span>
                        <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
                            Order #{order.order_id.slice(0, 8)}...
                        </span>
                    </nav>

                    {/* Actions - Different for mobile vs desktop */}
                    {isMobile ? (
                        renderMobileActionSheet()
                    ) : (
                        availableActions.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="ml-auto">
                                        <MoreVertical className="w-4 h-4 mr-2" />
                                        Actions
                                        {loadingActions && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">

                                    {/* Confirm Order - For pending orders */}
                                    {order.status?.toLowerCase() === 'pending_shipment' && !pendingApprovalStatus && (
                                        <DropdownMenuItem
                                            onClick={() => handleActionClick('confirmOrder')}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Confirm Order
                                        </DropdownMenuItem>
                                    )}

                                    {/* Prepare Shipment - From available actions */}
                                    {availableActions.includes('prepare_shipment') && !pendingApprovalStatus && (
                                        <DropdownMenuItem
                                            onClick={() => handleActionClick('prepareShipment')}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Package2 className="w-4 h-4 text-blue-600" />
                                            Prepare Shipment
                                        </DropdownMenuItem>
                                    )}

                                    {/* Mark as Ready for Pickup */}
                                    {availableActions.includes('ready_for_pickup') && (
                                        <DropdownMenuItem
                                            onClick={() => handleActionClick('markAsReady')}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Store className="w-4 h-4 text-blue-600" />
                                            Mark Ready for Pickup
                                        </DropdownMenuItem>
                                    )}

                                    {/* Mark as Picked Up */}
                                    {availableActions.includes('picked_up') && (
                                        <DropdownMenuItem
                                            onClick={() => handleActionClick('markAsPickedUp')}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Mark as Picked Up
                                        </DropdownMenuItem>
                                    )}

                                    {/* Cancel Order - If allowed */}
                                    {!['cancelled', 'completed'].includes(order.status?.toLowerCase() || '') && !pendingApprovalStatus && (
                                        <>
                                            {(availableActions.length > 0 || order.receipt) && <DropdownMenuSeparator />}
                                            <DropdownMenuItem
                                                onClick={() => handleActionClick('cancelOrder')}
                                                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                                            >
                                                <Ban className="w-4 h-4" />
                                                Cancel Order
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )
                    )}
                </div>

                {/* Status Notices */}
                {waitingForRider && (
                    <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <UserRoundCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                    Waiting for Rider
                                </h4>
                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                    Rider {order.delivery_info?.rider_name} has been assigned and is reviewing the delivery offer.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {pendingApprovalStatus && (
                    <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                    Pending Admin Approval
                                </h4>
                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                    This order has a receipt and is awaiting admin approval for payment verification.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {approved && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <CheckCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                                    Payment Approved
                                </h4>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                    Payment has been verified and approved by admin.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Order Card */}
                <Card>
                    <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg sm:text-xl">Order #{order.order_id.slice(0, 8)}...</CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-1">
                                    {formatDate(order.created_at)}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {getApprovalBadge(order.approval)}
                                {getStatusBadge(order.status, order)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-6">
                        {/* Order Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Amount</p>
                                <p className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Payment Method</p>
                                <div className="flex items-center gap-1">
                                    <CreditCard className="w-4 h-4" />
                                    <p className="text-sm sm:text-base font-medium">{order.payment_method}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Items</p>
                                <div className="flex items-center gap-1">
                                    <Package className="w-4 h-4" />
                                    <p className="text-sm sm:text-base font-medium">{order.items.length}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Last Updated</p>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <p className="text-xs sm:text-sm font-medium">{new Date(order.updated_at).toLocaleDateString()}</p>
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
                                    {isPickup ? 'Pickup Location' : 'Delivery Address'}
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

                        {/* Delivery Info */}
                        {order.delivery_info && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Truck className="w-4 h-4" />
                                        Delivery Information
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {order.delivery_info.rider_name && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Rider</p>
                                                <p className="text-sm font-medium">{order.delivery_info.rider_name}</p>
                                            </div>
                                        )}
                                        {order.delivery_info.status && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Delivery Status</p>
                                                <Badge variant="outline" className="mt-1">
                                                    {order.delivery_info.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        )}
                                        {order.delivery_info.tracking_number && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Tracking Number</p>
                                                <p className="text-sm font-medium">{order.delivery_info.tracking_number}</p>
                                            </div>
                                        )}
                                        {order.delivery_info.estimated_delivery && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                                                <p className="text-sm font-medium">{order.delivery_info.estimated_delivery}</p>
                                            </div>
                                        )}
                                        {order.delivery_info.delivery_fee && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Delivery Fee</p>
                                                <p className="text-sm font-medium">{formatCurrency(order.delivery_info.delivery_fee.toString())}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Receipt Section */}
                        {order.receipt && (
                            <>
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        Payment Receipt
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg overflow-hidden border p-4">
                                        {isImageFile(order.receipt.file_type) ? (
                                            <div className="flex justify-center">
                                                <img
                                                    src={order.receipt.url}
                                                    alt="Payment Receipt"
                                                    className="max-w-full max-h-96 object-contain rounded"
                                                    loading="lazy"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <FileText className="w-16 h-16 text-muted-foreground mb-3" />
                                                <p className="text-sm font-medium text-center mb-1">
                                                    {order.receipt.file_type?.toUpperCase() || 'Document'} Receipt
                                                </p>
                                                <p className="text-xs text-muted-foreground text-center">
                                                    File: {order.receipt.file_name || getFileName(order.receipt.url)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Uploaded by customer on {new Date(order.receipt.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Order Items */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Order Items ({order.items.length})
                            </h3>
                            <div className="space-y-3">
                                {order.items.map((item) => {
                                    const variant = item.cart_item.variant;
                                    const product = item.cart_item.product;
                                    const productImage = product.primary_image?.url || variant?.image_url || product.variant_image;
                                    
                                    return (
                                        <div key={item.id} className="border rounded-lg p-3 sm:p-4">
                                            <div className="flex gap-3">
                                                {/* Product Image */}
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
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Qty: {item.cart_item.quantity}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <div className="text-base sm:text-lg font-bold text-primary">
                                                                {formatCurrency(item.total_amount)}
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-muted-foreground">
                                                                Unit: {formatCurrency(product.price)} x {item.cart_item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {item.voucher && (
                                                        <div className="bg-muted/50 rounded-lg p-2 sm:p-3 mt-2">
                                                            <div className="flex items-center gap-2">
                                                                <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                                <div>
                                                                    <p className="text-xs sm:text-sm font-medium">{item.voucher.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Code: {item.voucher.code} • Discount: {formatCurrency(item.voucher.value)}
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

                {/* Responsive Action Dialog/Drawer */}
                {isMobile ? renderMobileDialog() : renderDesktopDialog()}
            </div>
        </UserProvider>
    );
}