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
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Image
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "View Order",
        }
    ]
}

interface OrderItem {
    id: string;
    cart_item: {
        id: string;
        product: {
            id: string;
            name: string;
            price: number;
            shop: {
                id: string;
                name: string;
            };
        };
        user: {
            id: string;
            username: string;
            email: string;
            first_name: string;
            last_name: string;
        };
    };
    voucher?: {
        id: string;
        name: string;
        code: string;
        value: number;
    };
    total_amount: number;
    status: string;
    created_at: string;
}

interface Order {
    order_id: string;
    user: {
        id: string;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    approval: string;
    status: string;
    total_amount: number;
    payment_method: string;
    delivery_address: string;
    created_at: string;
    updated_at: string;
    items: OrderItem[];
    receipt?: string | null;
}

interface LoaderData {
    user: any;
    order: Order | null;
    error?: string;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
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
    const [showApprovalDialog, setShowApprovalDialog] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'accept' | 'reject' | null>(null);
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const isMobile = useIsMobile();
    const baseUrl = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000/media/';
    const { toast } = useToast();

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
            pending: { variant: "secondary", label: "Pending" },
            confirmed: { variant: "default", label: "Confirmed" },
            processing: { variant: "default", label: "Processing" },
            shipped: { variant: "default", label: "Shipped" },
            delivered: { variant: "default", label: "Delivered" },
            cancelled: { variant: "destructive", label: "Cancelled" },
            completed: { variant: "default", label: "Completed" }
        };
        
        const config = statusConfig[status?.toLowerCase() || 'pending'] || statusConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
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

    const handleViewReceipt = () => {
        if (order?.receipt) {
            setShowReceiptDialog(true);
        }
    };

    const handleDownloadReceipt = () => {
        if (order?.receipt) {
            const link = document.createElement('a');
            link.href = baseUrl + order.receipt;
            link.download = `receipt_${order.order_id}.${getFileExtension(order.receipt)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: "Download Started",
                description: "Receipt download has started",
                variant: "success",
            });
        }
    };

    const getFileExtension = (filename: string) => {
        if (!filename) return '';
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const isImageFile = (filename: string) => {
        const ext = getFileExtension(filename);
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    };

    const isPdfFile = (filename: string) => {
        const ext = getFileExtension(filename);
        return ext === 'pdf';
    };

    const getFileName = (filepath: string) => {
        if (!filepath) return 'receipt';
        return filepath.split('/').pop() || 'receipt';
    };

    const canApproveOrder = () => {
        if (!order) return false;
        return (
            order.receipt && 
            order.payment_method.toLowerCase().includes('wallet') &&
            order.approval === 'pending'
        );
    };

    const handleApprovalClick = (action: 'accept' | 'reject') => {
        setApprovalAction(action);
        setShowApprovalDialog(true);
    };

    const handleApprovalConfirm = async () => {
        if (!order || !approvalAction) return;

        setLoading(true);
        try {
            const response = await AxiosInstance.post('/admin-orders/approve_order/', {
                order_id: order.order_id,
                action: approvalAction
            });

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: `Order ${approvalAction === 'accept' ? 'approved' : 'rejected'} successfully`,
                    variant: "success",
                });

                setOrder({
                    ...order,
                    approval: approvalAction === 'accept' ? 'accepted' : 'rejected'
                });
            }
        } catch (error: any) {
            console.error('Error approving order:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to update order approval",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setShowApprovalDialog(false);
            setApprovalAction(null);
        }
    };

    const handleCancel = () => {
        if (loading) return;
        setShowApprovalDialog(false);
        setApprovalAction(null);
    };

    const renderReceiptPreview = () => {
        if (!order?.receipt) return null;

        const fileName = getFileName(order.receipt);
        const isImage = isImageFile(order.receipt);
        const isPdf = isPdfFile(order.receipt);
        const receiptUrl = baseUrl + order.receipt;

        return (
            <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5" />
                            Payment Receipt - Order #{order.order_id.slice(0, 8)}...
                        </DialogTitle>
                        <DialogDescription>
                            Provided by customer: {order.user.first_name} {order.user.last_name}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                File: {fileName}
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleDownloadReceipt}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 border">
                            {isImage ? (
                                <div className="flex justify-center">
                                    <img
                                        src={receiptUrl}
                                        alt="Payment Receipt"
                                        className="max-w-full max-h-[70vh] object-contain rounded"
                                        loading="lazy"
                                    />
                                </div>
                            ) : isPdf ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <FileText className="w-16 h-16 text-muted-foreground mb-3" />
                                    <p className="text-sm font-medium text-center mb-2">
                                        PDF Document
                                    </p>
                                    <p className="text-xs text-muted-foreground text-center mb-4">
                                        Click "Download" to view the receipt
                                    </p>
                                    <Button 
                                        variant="default"
                                        onClick={() => window.open(receiptUrl, '_blank')}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Open PDF in New Tab
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <FileText className="w-16 h-16 text-muted-foreground mb-3" />
                                    <p className="text-sm font-medium text-center mb-2">
                                        {getFileExtension(order.receipt).toUpperCase()} Document
                                    </p>
                                    <Button 
                                        variant="default"
                                        onClick={() => window.open(receiptUrl, '_blank')}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Open File
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order ID:</span>
                                <span className="font-medium">{order.order_id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-medium text-primary">₱{order.total_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Method:</span>
                                <span className="font-medium">{order.payment_method}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Uploaded:</span>
                                <span className="font-medium">{new Date(order.updated_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    const renderApprovalDialogContent = () => {
        if (!approvalAction || !order) return null;

        return (
            <>
                <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                        <p className="text-sm font-medium">Order ID: {order.order_id.slice(0, 16)}...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Customer: {order.user.first_name} {order.user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Amount: ₱{order.total_amount.toLocaleString()}
                        </p>
                    </div>

                    {approvalAction === 'accept' ? (
                        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3 sm:p-4">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Approve Order
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                The customer will be notified and the order will proceed to processing.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 sm:p-4">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Reject Order
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                The customer will be notified and the order will be cancelled.
                            </p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderDesktopApprovalDialog = () => {
        if (!approvalAction) return null;

        return (
            <AlertDialog open={showApprovalDialog} onOpenChange={!loading ? setShowApprovalDialog : undefined}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {approvalAction === 'accept' ? 'Approve Order' : 'Reject Order'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {approvalAction === 'accept' 
                                ? 'Are you sure you want to approve this order?'
                                : 'Are you sure you want to reject this order?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {renderApprovalDialogContent()}
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel onClick={handleCancel} disabled={loading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleApprovalConfirm}
                            disabled={loading}
                            className={approvalAction === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                approvalAction === 'accept' ? 'Approve' : 'Reject'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const renderMobileApprovalDrawer = () => {
        if (!approvalAction) return null;

        return (
            <Drawer open={showApprovalDialog} onOpenChange={!loading ? setShowApprovalDialog : undefined}>
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>
                            {approvalAction === 'accept' ? 'Approve Order' : 'Reject Order'}
                        </DrawerTitle>
                        <DrawerDescription>
                            {approvalAction === 'accept' 
                                ? 'Are you sure you want to approve this order?'
                                : 'Are you sure you want to reject this order?'}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4">
                        {renderApprovalDialogContent()}
                    </div>
                    <DrawerFooter className="pt-2">
                        <Button 
                            onClick={handleApprovalConfirm}
                            disabled={loading}
                            className={approvalAction === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                approvalAction === 'accept' ? 'Approve' : 'Reject'
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
                        <a href="/admin/orders" className="hover:text-primary hover:underline">
                            Orders
                        </a>
                        <span>&gt;</span>
                        <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
                            Order #{order.order_id.slice(0, 8)}...
                        </span>
                    </nav>

                    {isMobile && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto">
                                    <Menu className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {order.receipt && (
                                    <>
                                        <DropdownMenuItem onClick={handleViewReceipt}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Receipt
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDownloadReceipt}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Receipt
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {canApproveOrder() && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleApprovalClick('accept')}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve Order
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleApprovalClick('reject')}>
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject Order
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem>
                                    <Package className="w-4 h-4 mr-2" />
                                    Update Status
                                </DropdownMenuItem>
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
                                {getApprovalBadge(order.approval)}
                                {getStatusBadge(order.status)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-6">
                        {/* Approval Notice */}
                        {canApproveOrder() && (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                            Order Awaiting Approval
                                        </h4>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                            This order has a receipt and uses e-wallet payment. Please review and approve or reject.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="default"
                                                onClick={() => handleApprovalClick('accept')}
                                                className="text-xs"
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Approve Order
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleApprovalClick('reject')}
                                                className="text-xs"
                                            >
                                                <XCircle className="w-3 h-3 mr-1" />
                                                Reject Order
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Amount</p>
                                <p className="text-lg sm:text-xl font-bold text-primary">₱{order.total_amount.toLocaleString()}</p>
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
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Delivery Address
                                </h3>
                                <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Receipt Section */}
                        {order.receipt && (
                            <>
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        Payment Receipt
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg overflow-hidden border">
                                        {isImageFile(order.receipt) ? (
                                            <div className="relative group cursor-pointer" onClick={handleViewReceipt}>
                                                <img
                                                    src={order.receipt}
                                                    alt="Payment Receipt"
                                                    className="w-full h-auto max-h-64 object-contain bg-white"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                    <div className="text-white text-center p-4">
                                                        <Eye className="w-8 h-8 mx-auto mb-2" />
                                                        <p className="text-sm font-medium">Click to view full receipt</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div 
                                                className="flex flex-col items-center justify-center p-8 bg-muted cursor-pointer" 
                                                onClick={handleViewReceipt}
                                            >
                                                <FileText className="w-16 h-16 text-muted-foreground mb-3" />
                                                <p className="text-sm font-medium text-center mb-1">
                                                    {getFileExtension(order.receipt).toUpperCase()} Document
                                                </p>
                                                <p className="text-xs text-muted-foreground text-center mb-3">
                                                    Click to view receipt
                                                </p>
                                                <Button size="sm" variant="outline">
                                                    <Eye className="w-3 h-3 mr-2" />
                                                    View Receipt
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-xs sm:text-sm"
                                            onClick={handleViewReceipt}
                                        >
                                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                            View Receipt
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-xs sm:text-sm"
                                            onClick={handleDownloadReceipt}
                                        >
                                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                            Download
                                        </Button>
                                        {isImageFile(order.receipt) && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-xs sm:text-sm"
                                                onClick={() => window.open(baseUrl + order.receipt, '_blank')}
                                            >
                                                <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                                Open Original
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Uploaded by customer on {new Date(order.updated_at).toLocaleDateString()}
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
                                {order.items.map((item) => (
                                    <div key={item.id} className="border rounded-lg p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm sm:text-base break-words">{item.cart_item.product.name}</h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        <Store className="w-3 h-3 mr-1" />
                                                        {item.cart_item.product.shop.name}
                                                    </Badge>
                                                    {getStatusBadge(item.status)}
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <div className="text-base sm:text-lg font-bold text-primary">
                                                    ₱{item.total_amount.toLocaleString()}
                                                </div>
                                                <div className="text-xs sm:text-sm text-muted-foreground">
                                                    Unit: ₱{item.cart_item.product.price.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {item.voucher && (
                                            <div className="bg-muted/50 rounded-lg p-2 sm:p-3 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-medium">{item.voucher.name}</p>
                                                        <p className="text-xs text-muted-foreground">Code: {item.voucher.code} • Discount: ₱{item.voucher.value}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                            {canApproveOrder() && (
                                <>
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="text-xs sm:text-sm"
                                        onClick={() => handleApprovalClick('accept')}
                                    >
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                        Approve Order
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        className="text-xs sm:text-sm"
                                        onClick={() => handleApprovalClick('reject')}
                                    >
                                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                        Reject Order
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                Update Status
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                Contact Customer
                            </Button>
                            {order.receipt && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs sm:text-sm"
                                    onClick={handleViewReceipt}
                                >
                                    <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                    View Receipt
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Receipt Dialog */}
                {renderReceiptPreview()}

                {/* Responsive Approval Dialog/Drawer */}
                {isMobile ? renderMobileApprovalDrawer() : renderDesktopApprovalDialog()}
            </div>
        </UserProvider>
    );
}