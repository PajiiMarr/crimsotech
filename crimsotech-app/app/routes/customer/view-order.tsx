"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { UserProvider } from "~/components/providers/user-role-provider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import Breadcrumbs from "~/components/ui/breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import AxiosInstance from "~/components/axios/Axios";
import { toast } from 'sonner';
import {
  ArrowLeft,
  MoreVertical,
  Printer,
  Copy,
  Download,
  Share2,
  XCircle,
  Clock,
  Package,
  Truck,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

// Import view components
import ViewPending from "./view/view-pending";
import ViewProcessing from "./view/view-processing";
import ViewPickupProcessing from "./view/view-pickup-processing";
import ViewPickupReady from "./view/view-pickup-ready";
import ViewPickupPickedUp from "./view/view-pickup-picked-up";
import ViewShipping from "./view/view-shipping";
import ViewDelivered from "./view/view-delivered";
import ViewCompleted from "./view/view-completed";
import ViewRatings from "./view/view-ratings";
import ViewCancelled from "./view/view-cancelled";
import ViewReturns from "./view/view-returns";
import ViewDispute from "./view/view-dispute";

export async function loader({ request, context, params }: any) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({
    request,
    context,
    params,
    unstable_pattern: undefined,
  } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return {
    user,
    orderId: params.orderId,
  };
}

// Define TypeScript interfaces based on backend response
interface OrderItem {
  checkout_id: string;
  product_id: string;
  product_name: string;
  product_description: string;
  product_variant: string;
  quantity: number;
  price: string;
  original_price: string;
  subtotal: string;
  status: string;
  purchased_at: string;
  primary_image: {
    url: string;
    file_type: string;
  } | null;
  product_images: Array<{
    url: string;
    file_type: string;
  }>;
  shop_info: {
    id: string;
    name: string;
    picture: string | null;
    description: string;
  } | null;
  can_review: boolean;
  can_return: boolean;
  is_refundable: boolean;
  return_deadline: string | null;
}

interface OrderResponse {
  order: {
    id: string;
    status: string;
    status_display: string;
    status_color: string;
    created_at: string;
    updated_at: string;
    payment_method: string;
    payment_status: string | null;
    delivery_status: string | null;
    delivery_rider: string | null;
    delivery_notes: string | null;
    delivery_date: string | null;
    delivery_method?: string | null;
  };
  shipping_info: {
    logistics_carrier: string;
    tracking_number: string;
    delivery_method: string;
    estimated_delivery: string;
  };
  delivery_address: {
    recipient_name: string;
    phone_number: string;
    address: string;
    address_details: {
      street: string;
      barangay: string;
      city: string;
      province: string;
      postal_code: string;
    };
  };
  items: OrderItem[];
  order_summary: {
    subtotal: string;
    shipping_fee: string;
    tax: string;
    discount: string;
    total: string;
    payment_fee: string;
  };
  summary_counts: {
    total_items: number;
    total_unique_items: number;
  };
  timeline: Array<{
    event: string;
    description: string;
    date: string;
    icon: string;
    color: string;
    completed: boolean;
  }>;
  actions: {
    can_cancel: boolean;
    can_track: boolean;
    can_review: boolean;
    can_return: boolean;
    can_contact_seller: boolean;
    can_buy_again: boolean;
  };
}

// Status mapping function - Consistent with purchases.tsx
const mapStatus = (backendStatus: string) => {
  switch (backendStatus.toLowerCase()) {
    case "pending":
      return "pending";
    case "processing":
      return "in_progress";
    case "shipped":
      return "to_ship";
    case "ready_for_pickup":
      return "ready_for_pickup";
    case "delivered":
      return "to_receive"; // This will render ViewDelivered
    case "picked_up":
      return "picked_up"; // This will render a customer 'picked up' UI
    case "completed":
      return "completed"; // This will render ViewCompleted
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "return_refund";
    default:
      console.warn(`Unknown backend status in view-order: ${backendStatus}`);
      return "pending";
  }
};

export default function ViewOrder({ loaderData }: any) {
  const { user } = loaderData;
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | string) => {
    if (typeof amount === "string") {
      amount = parseFloat(amount) || 0;
    }
    if (!Number.isFinite(amount)) return "₱0.00";
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  };

  const normalizedUserId = useMemo(() => {
    return user?.user_id || user?.id || "";
  }, [user]);

  // Fetch order details
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching order ${orderId} for user ${normalizedUserId}`);
        
        const response = await AxiosInstance.get<OrderResponse>(`/purchases-buyer/${orderId}/view-order/`, {
          headers: {
            "X-User-Id": normalizedUserId,
          },
        });

        const backendData = response.data;
        console.log("Backend order data:", backendData);

        // Transform items to frontend format
        const items = (backendData.items || []).map((item: OrderItem, index: number) => {
          const price = Number.parseFloat(item.price) || 0;
          const subtotal = Number.parseFloat(item.subtotal) || 0;
          const originalPrice = Number.parseFloat(item.original_price) || price * 1.1;
          
          return {
            id: `${backendData.order?.id || orderId}-${index}`,
            product_id: item.product_id,
            checkout_id: item.checkout_id,
            name: item.product_name,
            description: item.product_description,
            variant: item.product_variant,
            price: price,
            original_price: originalPrice,
            quantity: item.quantity,
            subtotal: subtotal,
            shop_name: item.shop_info?.name || "Unknown Shop",
            shop_id: item.shop_info?.id || null,
            shop_picture: item.shop_info?.picture || null,
            image_url: item.primary_image?.url || "/phon.jpg",
            product_images: item.product_images || [],
            is_refundable: item.is_refundable,
            can_review: item.can_review,
            can_return: item.can_return,
            return_deadline: item.return_deadline,
            purchased_at: item.purchased_at,
          };
        });

        const computedSubtotal = items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
        const total = Number.parseFloat(backendData.order_summary?.total || "0") || computedSubtotal;
        const shippingFee = Number.parseFloat(backendData.order_summary?.shipping_fee || "0");
        const tax = Number.parseFloat(backendData.order_summary?.tax || "0");
        const discount = Number.parseFloat(backendData.order_summary?.discount || "0");

        const uiOrder = {
          id: backendData.order?.id || orderId,
          order_number: backendData.order?.id || orderId,
          created_at: backendData.order?.created_at || new Date().toISOString(),
          updated_at: backendData.order?.updated_at || new Date().toISOString(),
          status: mapStatus(backendData.order?.status || "pending"),
          backend_status: backendData.order?.status, // Keep original backend status
          status_display: backendData.order?.status_display || backendData.order?.status,
          status_color: backendData.order?.status_color || "#6B7280",
          subtotal: computedSubtotal,
          shipping_fee: shippingFee,
          tax: tax,
          discount: discount,
          total_amount: total,
          items,
          shipping: {
            method: backendData.shipping_info?.delivery_method || backendData.order?.delivery_method || "",
            carrier: backendData.shipping_info?.logistics_carrier || "",
            tracking_number: backendData.shipping_info?.tracking_number || "",
            estimated_delivery: backendData.shipping_info?.estimated_delivery || "",
            addressText: backendData.delivery_address?.address || "",
            recipient_name: backendData.delivery_address?.recipient_name || "",
            phone_number: backendData.delivery_address?.phone_number || "",
          },
          payment: {
            method: backendData.order?.payment_method || "",
            status: backendData.order?.payment_status || "pending",
            amount: total,
          },
          delivery: {
            status: backendData.order?.delivery_status || null,
            rider: backendData.order?.delivery_rider || null,
            notes: backendData.order?.delivery_notes || null,
            date: backendData.order?.delivery_date || null,
          },
          // delivery_evidence is an array of image/file URLs for quick UI use
          delivery_evidence: backendData.order?.delivery_evidence || [],
          // delivery_proofs contains detailed metadata if needed
          delivery_proofs: backendData.delivery_proofs || [],
          timeline: backendData.timeline || [],
          can_request_refund: backendData.actions?.can_return || false,
          can_cancel: backendData.actions?.can_cancel || false,
          can_track: backendData.actions?.can_track || false,
          can_review: backendData.actions?.can_review || false,
          can_contact_seller: backendData.actions?.can_contact_seller || false,
          can_buy_again: backendData.actions?.can_buy_again || false,
        };

        console.log("Transformed UI order:", uiOrder);

        if (cancelled) return;
        setOrderDetails({ order: uiOrder });
      } catch (e: any) {
        console.error("Error fetching order details:", e);
        if (cancelled) return;
        const serverMessage = e?.response?.data?.error || e?.response?.data?.detail || e?.message;
        setError(serverMessage || "Failed to load order details. Please try again.");
        setOrderDetails(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [orderId, normalizedUserId]);

  // Action handlers
  const handleRequestRefund = (orderIdOrPayload: any, productId?: string) => {
    // Supports two call styles:
    // 1) handleRequestRefund(orderId, productId?)
    // 2) handleRequestRefund({ orderId, productId, checkoutId })
    try {
      if (typeof orderIdOrPayload === 'object' && orderIdOrPayload !== null) {
        const payload = orderIdOrPayload as { orderId?: string; productId?: string };
        const id = payload.orderId;
        const pid = payload.productId || productId;
        if (!id) return;
        if (pid) navigate(`/request-refund-return/${id}?product_id=${pid}`);
        else navigate(`/request-refund-return/${id}`);
        return;
      }

      const id = String(orderIdOrPayload);
      if (productId) navigate(`/request-refund-return/${id}?product_id=${productId}`);
      else navigate(`/request-refund-return/${id}`);
    } catch (err) {
      console.error('Failed to handle refund navigation', err);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    navigate(`/cancel-order/${orderId}`);
  };

  const handleTrackOrder = (orderId: string) => {
    navigate(`/track-order/${orderId}`);
  };

  const handleRateProduct = (productId: string) => {
    navigate(`/product-rate?productId=${productId}&orderId=${orderId}`);
  };

  const handleViewRefundDetails = (orderId: string) => {
    navigate(`/customer-view-refund-request/${orderId}`);
  };

  const handleReorder = (orderId: string) => {
    // Implement reorder logic
    console.log("Reorder:", orderId);
    // You might want to navigate to cart with these products
  };

  const handleContactSupport = (orderId: string) => {
    navigate(`/contact-support?order=${orderId}`);
  };

  const handleContactSeller = (shopId: string) => {
    navigate(`/chat/seller/${shopId}`);
  };

  const handleViewDisputeDetails = (orderId: string) => {
    navigate(`/dispute-details/${orderId}`);
  };

  const handlePrint = () => window.print();
  const handleCopyOrderNumber = () => {
    const orderNumber = orderDetails?.order.order_number;
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      // You could add a toast notification here
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      console.log('Completing order:', orderId, 'as user', normalizedUserId);
      const response = await AxiosInstance.patch(`/purchases-buyer/${orderId}/complete/`, null, {
        headers: {
          'X-User-Id': normalizedUserId,
        },
      });

      console.log('Complete response:', response?.data);

      if (response.data?.success) {
        toast.success(response.data.message || 'Order marked as completed');
        // reload to fetch latest status
        window.location.reload();
      } else {
        toast.error(response.data?.message || 'Failed to mark order as completed');
      }
    } catch (e: any) {
      console.error('Error completing order:', e);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to mark order as completed');
    }
  };

  // Render the appropriate component based on order status
  const renderStatusComponent = () => {
    if (!orderDetails) return null;

    const status = orderDetails.order.status;
    console.log(`Rendering component for status: ${status}`);
    
    const commonProps = {
      orderDetails,
      formatCurrency,
      formatDate,
      formatDateTime,
      customerName: orderDetails.order.shipping.recipient_name || "Customer",
      contactNumber: orderDetails.order.shipping.phone_number || "",
      onRequestRefund: handleRequestRefund,
      onCancelOrder: handleCancelOrder,
      onTrackOrder: handleTrackOrder,
      onRateProduct: handleRateProduct,
      onViewRefundDetails: handleViewRefundDetails,
      onReorder: handleReorder,
      onContactSupport: handleContactSupport,
      onContactSeller: handleContactSeller,
      onViewDisputeDetails: handleViewDisputeDetails,
      onCompleteOrder: handleCompleteOrder,
      // alias for components expecting `onComplete` prop
      onComplete: handleCompleteOrder,
      // include user id for child components that need to call customer endpoints
      userId: normalizedUserId,
    };

    // Special-case: If backend status is explicitly "pending" and delivery method
    // is "Pickup from Store", prefer the pending view (same as regular pending).
    // This ensures pickup orders that are still pending are shown with the
    // customer-facing pending UI (`view-pending.tsx`).
    const backendStatus = (orderDetails.order.backend_status || "").toString().toLowerCase();
    const deliveryMethod = (orderDetails.order.shipping?.method || "").toString().toLowerCase();
    const paymentMethod = (orderDetails.order.payment?.method || "").toString().toLowerCase();

    if (backendStatus === "pending" && deliveryMethod === "pickup from store") {
      console.log("Pickup from Store with pending status, rendering ViewPending");
      return <ViewPending {...commonProps} />;
    }

    // Pickup-specific UI: when backend status is 'processing' and order uses
    // Cash on Pickup + Pickup from Store, show a separate pickup-processing view
    if (
      backendStatus === "processing" &&
      paymentMethod.includes("cash on pickup") &&
      deliveryMethod.includes("pickup")
    ) {
      console.log("Rendering pickup-specific processing view");
      return <ViewPickupProcessing {...commonProps} />;
    }

    switch (status) {
      case "pending":
        return <ViewPending {...commonProps} />;
      case "in_progress":
        return <ViewProcessing {...commonProps} />;
      case "to_ship":
        return <ViewShipping {...commonProps} />;
      case "ready_for_pickup":
        // For pickup orders (Cash on Pickup + Pickup from Store) show a dedicated ready-for-pickup UI
        if ((paymentMethod || "").toLowerCase().includes("cash on pickup") && (deliveryMethod || "").toLowerCase().includes("pickup")) {
          return <ViewPickupReady {...commonProps} />;
        }
        return <ViewShipping {...commonProps} />; // Use shipping view for non-pickup
      case "to_receive":    // This comes from 'delivered' backend status
        console.log("Rendering ViewDelivered component");
        return <ViewDelivered {...commonProps} />;
      case "picked_up":
        console.log("Rendering ViewPickedUp component");
        return <ViewPickupPickedUp {...commonProps} />;
      case "completed":     // This comes from 'completed' backend status
        console.log("Rendering ViewCompleted component");
        return <ViewCompleted {...commonProps} />;
      case "cancelled":
        return <ViewCancelled {...commonProps} />;
      case "return_refund":
        return <ViewReturns {...commonProps} />;
      default:
        console.warn(`Unknown status: ${status}, defaulting to ViewPending`);
        return <ViewPending {...commonProps} />;
    }
  };

  // For "Rate" tab - check if any items need rating
  const shouldShowRatingsTab = () => {
    if (!orderDetails) return false;
    const status = orderDetails.order.status;
    return status === "completed" && 
           orderDetails.order.items.some((item: any) => item.can_review);
  };

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/purchases")}
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to My Orders</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {loading ? (
          <Card className="border">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-40 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !orderDetails ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Order Not Found</AlertTitle>
            <AlertDescription>The order you're looking for doesn't exist.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Details</h1>
                <p className="text-muted-foreground">
                  Order #<strong>{orderDetails.order.order_number}</strong>
                  <span className="ml-2 px-2 py-1 text-xs rounded-md" 
                        style={{ backgroundColor: orderDetails.order.status_color + '20', 
                                 color: orderDetails.order.status_color }}>
                    {orderDetails.order.status_display}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Ordered on {formatDateTime(orderDetails.order.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Order Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyOrderNumber}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Order Number
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Order Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {renderStatusComponent()}

            {/* Show Ratings tab if applicable */}
            {shouldShowRatingsTab() && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Rate Your Purchase</h2>
                <ViewRatings
                  orderDetails={orderDetails}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  customerName={orderDetails.order.shipping.recipient_name || "Customer"}
                  contactNumber={orderDetails.order.shipping.phone_number || ""}
                  onRateProduct={handleRateProduct}
                />
              </div>
            )}
          </>
        )}
      </div>
    </UserProvider>
  );
}