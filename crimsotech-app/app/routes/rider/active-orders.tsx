import type { Route } from "./+types/active-orders"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '~/components/ui/data-table';
import { Link } from 'react-router';
import { 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  MapPin,
  User,
  Calendar,
  Truck,
  ArrowUpDown,
  Phone,
  Navigation,
  CreditCard,
  MoreVertical,
  PhilippinePeso
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import DateRangeFilter from '~/components/ui/date-range-filter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Active Orders | Riders",
    }
  ]
}

interface Delivery {
  id: string;
  order: {
    order_id: string;
    customer: {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      contact_number: string;
    };
    shipping_address: {
      id: string;
      recipient_name: string;
      recipient_phone: string;
      street: string;
      barangay: string;
      city: string;
      province: string;
      full_address: string;
    };
    total_amount: number;
    payment_method: string;
    delivery_method: string;
    status: string;
    created_at: string;
  };
  status: string;
  proofs_count?: number;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  time_elapsed: string;
  is_late: boolean;
}

interface PendingOrder {
  order_id: string;
  customer: string;
  address: string;
  amount: number;
  created_at: string;
}

interface Metrics {
  total_active_orders: number;
  pending_pickup: number;
  in_transit: number;
  completed_deliveries: number;
  expected_earnings: number;
  avg_delivery_time: number;
  completion_rate: number;
  on_time_deliveries: number;
  late_deliveries: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
}

interface LoaderData {
  user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  return { user };
}

export default function ActiveOrders({ loaderData}: { loaderData: LoaderData }){
  const { user } = loaderData;
  const [isDesktop, setIsDesktop] = useState(false);
  
  // State for data
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_active_orders: 0,
    pending_pickup: 0,
    in_transit: 0,
    completed_deliveries: 0,
    expected_earnings: 0,
    avg_delivery_time: 0,
    completion_rate: 0,
    on_time_deliveries: 0,
    late_deliveries: 0,
    today_deliveries: 0,
    week_earnings: 0,
    has_data: false
  });
  
  // State for loading and date range
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    rangeType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  });

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  // Fetch data function
  const fetchDeliveryData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch metrics and deliveries in parallel
      const [metricsResponse, deliveriesResponse] = await Promise.all([
        AxiosInstance.get('/rider-orders-active/get_metrics/', {
            headers: {
                'X-User-Id': user.user_id
            }
        }),
        AxiosInstance.get('/rider-orders-active/get_deliveries/?page=1&page_size=50&status=all', {
            headers: {
                'X-User-Id': user.user_id
            }
        })
      ]);

      if (metricsResponse.data.success) {
        setMetrics(metricsResponse.data.metrics);
      }

      if (deliveriesResponse.data.success) {
        setDeliveries(deliveriesResponse.data.deliveries);
        setPendingOrders(deliveriesResponse.data.pending_orders || []);
      }

    } catch (error) {
      console.error('Error fetching delivery data:', error);
      // Reset to empty state on error
      setMetrics({
        total_active_orders: 0,
        pending_pickup: 0,
        in_transit: 0,
        completed_deliveries: 0,
        expected_earnings: 0,
        avg_delivery_time: 0,
        completion_rate: 0,
        on_time_deliveries: 0,
        late_deliveries: 0,
        today_deliveries: 0,
        week_earnings: 0,
        has_data: false
      });
      setDeliveries([]);
      setPendingOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action confirmation
  const confirmAction = async () => {
    if (!selectedDelivery || !actionType) return;
    
    try {
      setIsActionLoading(true);
      
      const endpoint = actionType === 'pickup' 
        ? '/rider-orders-active/pickup_order/'
        : '/rider-orders-active/deliver_order/';
      
      console.log('Sending delivery ID:', selectedDelivery.id);
      
      // Use FormData to ensure proper data format
      const formData = new FormData();
      formData.append('delivery_id', selectedDelivery.id);
      
      const response = await AxiosInstance.post(endpoint, formData, {
        headers: {
          'X-User-Id': user.user_id,
          // FormData will set the correct content type automatically
        }
      });
      
      if (response.data.success) {
        // Refresh data
        await fetchDeliveryData();
        // Close dialog
        setShowActionDialog(false);
        setSelectedDelivery(null);
        setActionType(null);
        alert(`Order ${actionType === 'pickup' ? 'picked up' : 'delivered'} successfully!`);
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.error || `Failed to ${actionType} order`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle pickup action
  const handlePickupClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('pickup');
    setShowActionDialog(true);
  };

  // Handle delivery action
  const handleDeliverClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActionType('deliver');
    setShowActionDialog(true);
  };

  // Prepare transformed data for the table
  const tableData = useMemo(() => {
    return deliveries.map(delivery => ({
      // Create a flattened structure for the table
      id: delivery.id,
      order_id: delivery.order.order_id,
      customer_name: `${delivery.order.customer.first_name} ${delivery.order.customer.last_name}`,
      customer_phone: delivery.order.customer.contact_number,
      address: delivery.order.shipping_address?.full_address || 'No address',
      recipient_phone: delivery.order.shipping_address?.recipient_phone || '',
      amount: delivery.order.total_amount,
      payment_method: delivery.order.payment_method,
      delivery_method: delivery.order.delivery_method,
      status: delivery.status,
      created_at: delivery.created_at,
      time_elapsed: delivery.time_elapsed,
      is_late: delivery.is_late,
      // Keep original delivery for actions
      original: delivery
    }));
  }, [deliveries]);

  // Get filter options based on actual column IDs
  const getFilterOptions = () => {
    const statusOptions = [...new Set(deliveries.map(d => d.status))].filter(Boolean);
    const paymentOptions = [...new Set(deliveries.map(d => d.order.payment_method))].filter(Boolean);
    const deliveryOptions = [...new Set(deliveries.map(d => d.order.delivery_method))].filter(Boolean);
    
    return {
      status: {
        options: statusOptions,
        placeholder: 'Delivery Status',
        columnId: 'status' // Match the column ID
      },
      payment_method: {
        options: paymentOptions,
        placeholder: 'Payment Method',
        columnId: 'payment_method' // Match the column ID
      },
      delivery_method: {
        options: deliveryOptions,
        placeholder: 'Delivery Method',
        columnId: 'delivery_method' // Match the column ID
      }
    };
  };

  // Loading skeleton for metrics
  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mt-1" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  // Columns definition
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "order_id",
      id: "order_id", // This ID is used for searching
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Order ID
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any}) => (
        <div className="font-mono text-xs sm:text-sm">
          #{row.getValue("order_id")?.slice(-8) || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "customer_name",
      id: "customer_name", // This ID is used for searching
      header: "Customer",
      cell: ({ row }: { row: any}) => {
        const customerPhone = row.original.customer_phone;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">
                {row.getValue("customer_name")}
              </span>
            </div>
            {customerPhone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                {customerPhone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      id: "address", // This ID is used for searching
      header: "Delivery Address",
      cell: ({ row }: { row: any}) => {
        const recipientPhone = row.original.recipient_phone;
        return (
          <div className="space-y-1 max-w-[200px]">
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
              <span className="text-xs sm:text-sm line-clamp-2">
                {row.getValue("address")}
              </span>
            </div>
            {recipientPhone && (
              <div className="text-xs text-muted-foreground">
                Contact: {recipientPhone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any}) => (
        <div className="space-y-1">
          <div className="font-bold text-xs sm:text-sm">
            ₱{parseFloat(row.getValue("amount")).toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CreditCard className="w-3 h-3" />
            {row.original.payment_method || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      id: "status", // This ID is used for filtering
      header: "Status",
      cell: ({ row }: { row: any}) => {
        const status = row.getValue("status");
        const isLate = row.original.is_late;
        const timeElapsed = row.original.time_elapsed;
        
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
          pending: { label: "Pending", variant: "secondary", icon: Clock },
          pending_offer: { label: "Pending Offer", variant: "secondary", icon: Clock },
          picked_up: { label: "In Transit", variant: "default", icon: Truck },
          delivered: { label: "Delivered", variant: "outline", icon: CheckCircle }
        };
        
        const config = statusConfig[status] || { label: status, variant: "outline", icon: AlertCircle };
        const Icon = config.icon;
        
        return (
          <div className="space-y-2">
            <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
              <Icon className="w-3 h-3" />
              {config.label}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeElapsed}
              {isLate && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Late
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      id: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs sm:text-sm"
        >
          Created
          <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      ),
      cell: ({ row }: { row: any}) => (
        <div className="text-xs sm:text-sm">
          {new Date(row.getValue("created_at")).toLocaleDateString()}
          <div className="text-xs text-muted-foreground">
            {new Date(row.getValue("created_at")).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "payment_method",
      id: "payment_method", // This ID is used for filtering
      header: "Payment Method",
      cell: ({ row }: { row: any}) => (
        <div className="text-xs sm:text-sm">
          {row.getValue("payment_method") || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "delivery_method",
      id: "delivery_method", // This ID is used for filtering
      header: "Delivery Method",
      cell: ({ row }: { row: any}) => (
        <div className="text-xs sm:text-sm">
          {row.getValue("delivery_method") || 'N/A'}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any}) => {
        const delivery = row.original.original; // Get the original delivery object
        const isPending = delivery.status === 'pending' || delivery.status === 'pending_offer';
        const isPickedUp = delivery.status === 'picked_up';
        
        return (
          <div className="flex items-center gap-2">
            {isDesktop ? (
              <>
                {isPending && (
                  <Button 
                    size="sm" 
                    onClick={() => handlePickupClick(delivery)}
                    className="text-xs"
                  >
                    <Package className="w-3 h-3 mr-1" />
                    Pick Up
                  </Button>
                )}
                {isPickedUp && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeliverClick(delivery)}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Deliver
                  </Button>
                )}

                {delivery.status === 'delivered' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    asChild
                  >
                    <Link to={`/rider/delivery/${delivery.id}/add-delivery-media`}>
                      {(delivery.proofs_count || 0) > 0 ? 'View Proofs' : 'Provide Proof'}
                    </Link>
                  </Button>
                )}

                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs"
                  asChild
                >
                  <Link to={`/rider/orders/active/${delivery.order.order_id}`}>
                    <Navigation className="w-3 h-3 mr-1" />
                    Details
                  </Link>
                </Button>
              </>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Actions</AlertDialogTitle>
                    <AlertDialogDescription>
                      Choose an action for this delivery
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-4">
                    {isPending && (
                      <Button 
                        size="sm" 
                        onClick={() => handlePickupClick(delivery)}
                        className="w-full justify-start"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Pick Up Order
                      </Button>
                    )}
                    {isPickedUp && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeliverClick(delivery)}
                        className="w-full justify-start"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Delivered
                      </Button>
                    )}
                    {delivery.status === 'delivered' && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="w-full justify-start"
                        asChild
                      >
                        <Link to={`/rider/delivery/${delivery.id}/add-delivery-media`}>
                          {(delivery.proofs_count || 0) > 0 ? 'View Proofs' : 'Provide Proof'}
                        </Link>
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start"
                      asChild
                    >
                      <Link to={`/rider/orders/${delivery.order.order_id}`}>
                        <Navigation className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ];

  // Action Dialog/Drawer component
  const ActionConfirmation = () => {
    if (!selectedDelivery || !actionType) return null;

    const actionConfig = {
      pickup: {
        title: "Pick Up Order",
        description: "Are you sure you want to mark this order as picked up? This will update the order status to 'In Transit'.",
        confirmText: "Yes, Pick Up",
        icon: Package,
        confirmColor: "bg-blue-600 hover:bg-blue-700"
      },
      deliver: {
        title: "Deliver Order",
        description: "Are you sure you want to mark this order as delivered? This will complete the delivery process.",
        confirmText: "Yes, Deliver",
        icon: CheckCircle,
        confirmColor: "bg-green-600 hover:bg-green-700"
      }
    };

    const config = actionConfig[actionType];
    const Icon = config.icon;
    const order = selectedDelivery.order;
    const customer = order.customer;

    if (isDesktop) {
      return (
        <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {config.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>{config.description}</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Order ID:</span>
                    <span className="font-mono text-sm">#{order.order_id?.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">{customer.first_name} {customer.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-bold">₱{order.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isActionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAction}
                disabled={isActionLoading}
                className={config.confirmColor}
              >
                {isActionLoading ? "Processing..." : config.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    } else {
      return (
        <Drawer open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {config.title}
              </DrawerTitle>
              <DrawerDescription className="space-y-4">
                <p>{config.description}</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Order ID:</span>
                    <span className="font-mono text-sm">#{order.order_id?.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">{customer.first_name} {customer.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-bold">₱{order.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pt-2">
              <Button
                onClick={confirmAction}
                disabled={isActionLoading}
                className={config.confirmColor}
              >
                {isActionLoading ? "Processing..." : config.confirmText}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" disabled={isActionLoading}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDeliveryData();
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    });
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Active Orders</h1>
              <p className="text-muted-foreground mt-1">Manage your deliveries and track performance</p>
            </div>
          </div>

          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Orders</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{metrics.total_active_orders}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {metrics.pending_pickup} pending
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {metrics.in_transit} in transit
                          </span>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Package className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Earnings</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          ₱{metrics.expected_earnings.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          ₱{metrics.week_earnings.toLocaleString()} this week
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {Math.floor(metrics.avg_delivery_time / 60)}h {Math.round(metrics.avg_delivery_time % 60)}m
                        </p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" /> {metrics.on_time_deliveries} on time
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-red-500" /> {metrics.late_deliveries} late
                          </span>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {metrics.completion_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {metrics.today_deliveries} deliveries today
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Action Confirmation Dialog/Drawer */}
          <ActionConfirmation />

          {/* Active Deliveries Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">My Deliveries</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading deliveries...' : `Showing ${deliveries.length} deliveries`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable 
                  columns={columns} 
                  data={tableData}
                  filterConfig={getFilterOptions()}
                  searchConfig={{
                    column: "order_id", // Search by order_id column
                    placeholder: "Search by order ID..."
                  }}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  )
}