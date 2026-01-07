"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { UserProvider } from "~/components/providers/user-role-provider";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
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
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Download,
  HelpCircle,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  Phone,
  Printer,
  RotateCcw,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";

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
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return {
    user,
    orderId: params.orderId,
  };
}

type OrderStatus =
  | "pending"
  | "in_progress"
  | "to_ship"
  | "to_receive"
  | "completed"
  | "cancelled"
  | "return_refund"
  | "delivered";

const mapStatus = (backendStatus: string): OrderStatus => {
  switch (backendStatus) {
    case "pending":
      return "pending";
    case "processing":
      return "in_progress";
    case "shipped":
      return "to_ship";
    case "delivered":
      return "completed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "return_refund";
    default:
      return "pending";
  }
};

type BackendOrderItem = {
  product_id: string;
  product_name: string;
  shop_id: string | null;
  shop_name: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks?: string;
  can_review?: boolean;
};

type BackendOrder = {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  payment_status: string | null;
  items: BackendOrderItem[];
};

interface UiOrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  subtotal: number;
  shop_name?: string;
  seller_note?: string;
  color?: string;
}

interface UiOrder {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total_amount: number;
  buyer_note?: string;
  items: UiOrderItem[];
  shipping: {
    method: string;
    addressText: string;
  };
  payment: {
    method: string;
    status: string;
    amount: number;
  };
}

interface OrderDetails {
  order: UiOrder;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    alertTitle: string;
    alertDescription: string;
    alertClassName: string;
    alertIcon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    icon: Clock,
    alertTitle: "Waiting for Seller Confirmation",
    alertDescription:
      "Your order has been placed successfully. The seller will confirm your order within 24 hours.",
    alertClassName: "bg-yellow-50 border-yellow-200",
    alertIcon: Clock,
  },
  in_progress: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    icon: Clock,
    alertTitle: "Order Confirmed",
    alertDescription:
      "The seller has confirmed your order and is now preparing it for shipping.",
    alertClassName: "bg-blue-50 border-blue-200",
    alertIcon: Clock,
  },
  to_ship: {
    label: "To Ship",
    color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
    icon: Package,
    alertTitle: "Order Packed and Ready",
    alertDescription:
      "Your order has been packed and is waiting to be handed over to the delivery service.",
    alertClassName: "bg-indigo-50 border-indigo-200",
    alertIcon: Package,
  },
  delivered: {
    label: "Completed",
    color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
    icon: Package,
    alertTitle: "Order Packed and Ready",
    alertDescription:
      "Your order has been packed and is waiting to be handed over to the delivery service.",
    alertClassName: "bg-indigo-50 border-indigo-200",
    alertIcon: Package,
  },
  to_receive: {
    label: "In Transit",
    color: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    icon: Truck,
    alertTitle: "Order On the Way!",
    alertDescription:
      "Your order is on its way to you. Please be available to receive the package.",
    alertClassName: "bg-blue-50 border-blue-200",
    alertIcon: Truck,
  },
  completed: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 hover:bg-green-100",
    icon: CheckCircle,
    alertTitle: "Order Delivered Successfully!",
    alertDescription:
      "Your order has been delivered. Thank you for shopping with us.",
    alertClassName: "bg-green-50 border-green-200",
    alertIcon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 hover:bg-red-100",
    icon: XCircle,
    alertTitle: "Order Cancelled",
    alertDescription:
      "This order has been cancelled. If you have any questions, please contact the seller.",
    alertClassName: "bg-red-50 border-red-200",
    alertIcon: XCircle,
  },
  return_refund: {
    label: "Return/Refund",
    color: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    icon: RotateCcw,
    alertTitle: "Return/Refund Requested",
    alertDescription:
      "Your return/refund request is being processed. We'll update you as soon as there is a decision.",
    alertClassName: "bg-orange-50 border-orange-200",
    alertIcon: RotateCcw,
  },
};

function StatusLayout({
  orderDetails,
  customerName,
  contactNumber,
  formatDate,
  formatCurrency,
}: {
  orderDetails: OrderDetails;
  customerName: string;
  contactNumber: string;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
}) {
  const order = orderDetails.order;
  const statusCfg = STATUS_CONFIG[order.status];
  const StatusIcon = statusCfg.icon;
  const AlertIcon = statusCfg.alertIcon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusCfg.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={statusCfg.alertClassName}>
              <AlertIcon className="h-4 w-4" />
              <AlertTitle>{statusCfg.alertTitle}</AlertTitle>
              <AlertDescription>{statusCfg.alertDescription}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Order Date
                </p>
                <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items
                </p>
                <p className="font-medium text-sm">{order.items.length} items</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Payment Method
                </p>
                <p className="font-medium text-sm">
                  {(order.payment.method || "").toUpperCase()}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Payment Status
                </p>
                <p className="font-medium text-sm">{order.payment.status}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <ShoppingCart className="h-3 w-3" />
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="w-12 h-12 flex-shrink-0">
                      <img
                        src={item.image_url || "/phon.jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Qty: {item.quantity}</span>
                        {item.color ? (
                          <>
                            <span>•</span>
                            <span>Color: {item.color}</span>
                          </>
                        ) : null}
                        {item.shop_name ? (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.shop_name}</span>
                          </>
                        ) : null}
                      </div>
                      {item.seller_note ? (
                        <p className="text-xs text-blue-600 mt-0.5">{item.seller_note}</p>
                      ) : null}
                    </div>
                    <div className="font-medium text-sm">{formatCurrency(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping:</span>
              <span>{formatCurrency(order.shipping_fee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span className="text-green-600">-{formatCurrency(order.discount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Total:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{customerName}</p>
                <p className="text-muted-foreground whitespace-pre-line">
                  {order.shipping.addressText || "N/A"}
                </p>
                <p className="flex items-center gap-1 mt-2">
                  <Phone className="h-3 w-3" />
                  <span className="text-muted-foreground">{contactNumber || "N/A"}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" disabled>
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" disabled>
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Get Help
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ViewOrder({ loaderData }: any) {
  const { user } = loaderData;
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCustomerName, setResolvedCustomerName] = useState<string>("Customer");
  const [resolvedContactNumber, setResolvedContactNumber] = useState<string>("");

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    if (!Number.isFinite(amount)) return "₱0.00";
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  };

  const normalizedUserId = useMemo(() => {
    return user?.user_id || user?.id || "";
  }, [user]);

  const customerName = useMemo(() => {
    return (
      user?.name ||
      user?.username ||
      user?.email ||
      normalizedUserId ||
      "Customer"
    );
  }, [user]);

  useEffect(() => {
    // If the loader user object doesn't include a name/username,
    // fetch it via the existing purchases-buyer endpoint (no backend changes).
    let cancelled = false;

    async function resolveName() {
      try {
        if (!normalizedUserId) {
          setResolvedCustomerName(customerName);
          return;
        }

        // If we already have something better than an ID, keep it.
        if (customerName && customerName !== normalizedUserId && customerName !== "Customer") {
          setResolvedCustomerName(customerName);
          return;
        }

        const resp = await AxiosInstance.get(`/purchases-buyer/user_purchases/`, {
          headers: {
            "X-User-Id": normalizedUserId,
          },
        });

        const username = resp?.data?.username as string | undefined;
        if (cancelled) return;

        setResolvedCustomerName(username || customerName);
      } catch {
        if (!cancelled) setResolvedCustomerName(customerName);
      }
    }

    resolveName();

    return () => {
      cancelled = true;
    };
  }, [normalizedUserId, customerName]);

  useEffect(() => {
    // Resolve customer's contact number using existing shipping address endpoint.
    // (No backend changes.)
    let cancelled = false;

    async function resolveContactNumber() {
      try {
        if (!normalizedUserId) {
          setResolvedContactNumber("");
          return;
        }

        const resp = await AxiosInstance.get(`/shipping-address/get_shipping_addresses/`, {
          params: {
            user_id: normalizedUserId,
          },
        });

        const phone = (resp?.data?.default_shipping_address?.recipient_phone as string | undefined) || "";
        if (!cancelled) setResolvedContactNumber(phone);
      } catch {
        if (!cancelled) setResolvedContactNumber("");
      }
    }

    resolveContactNumber();

    return () => {
      cancelled = true;
    };
  }, [normalizedUserId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const response = await AxiosInstance.get(`/purchases-buyer/${orderId}/`, {
          headers: {
            "X-User-Id": normalizedUserId,
          },
        });

        const backendOrder = response.data as BackendOrder;

        const items: UiOrderItem[] = (backendOrder.items || []).map((item, index) => {
          const price = Number.parseFloat(item.price);
          const subtotal = Number.parseFloat(item.subtotal);
          return {
            id: `${backendOrder.order_id}-${index}`,
            product_id: item.product_id,
            name: item.product_name,
            price: Number.isFinite(price) ? price : 0,
            quantity: item.quantity,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            shop_name: item.shop_name || undefined,
            seller_note: item.remarks || undefined,
            image_url: "/phon.jpg",
          };
        });

        const computedSubtotal = items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
        const total = Number.parseFloat(backendOrder.total_amount);

        const uiOrder: UiOrder = {
          id: backendOrder.order_id,
          order_number: backendOrder.order_id,
          created_at: backendOrder.created_at,
          updated_at: backendOrder.created_at,
          status: mapStatus(backendOrder.status),
          subtotal: Number.isFinite(computedSubtotal) ? computedSubtotal : 0,
          shipping_fee: 0,
          tax: 0,
          discount: 0,
          total_amount: Number.isFinite(total) ? total : computedSubtotal,
          items,
          shipping: {
            method: backendOrder.delivery_method || "",
            addressText: backendOrder.delivery_address || "",
          },
          payment: {
            method: backendOrder.payment_method || "",
            status: backendOrder.payment_status || "pending",
            amount: Number.isFinite(total) ? total : computedSubtotal,
          },
        };

        if (cancelled) return;
        setOrderDetails({ order: uiOrder });
      } catch (e) {
        console.error("Error fetching order details:", e);
        if (cancelled) return;
        setError("Failed to load order details. Please try again.");
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

  const handlePrint = () => {
    window.print();
  };

  const handleCopyOrderNumber = () => {
    const orderNumber = orderDetails?.order.order_number;
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
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
              <AlertDescription>The order you\'re looking for doesn\'t exist.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Details</h1>
                  <p className="text-muted-foreground">
                    Order #<strong>{orderDetails.order.order_number}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={`text-sm px-3 py-1.5 ${STATUS_CONFIG[orderDetails.order.status].color}`}
                  >
                    {React.createElement(STATUS_CONFIG[orderDetails.order.status].icon, {
                      className: "h-3.5 w-3.5 mr-1.5",
                    })}
                    {STATUS_CONFIG[orderDetails.order.status].label}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                      {orderDetails.order.status === "to_receive" ||
                      orderDetails.order.status === "completed" ? (
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(
                              `/request-refund-return/${orderDetails.order.id}`
                            )
                          }
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Request Refund
                        </DropdownMenuItem>
                      ) : null}
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

              <StatusLayout
                orderDetails={orderDetails}
                customerName={resolvedCustomerName}
                contactNumber={resolvedContactNumber}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            </>
          )}
        </div>
    </UserProvider>
  );
}
