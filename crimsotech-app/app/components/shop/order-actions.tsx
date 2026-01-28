import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  Store, 
  Ship, 
  Truck, 
  Ban, 
  XCircle,
  Package2,
  Clock,
  Loader2,
  Eye,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Printer,
  FileText,
  ExternalLink,
  PackagePlus
} from 'lucide-react';
import { Separator } from '~/components/ui/separator';
import { useNavigate } from 'react-router';

interface OrderActionsProps {
  order: {
    order_id: string;
    status: string;
    delivery_method?: string | null;
    shipping_method?: string | null;
    delivery_info?: DeliveryInfo;
  };
  isCancelled: boolean;
  isPickup: boolean;
  hasPendingOffer?: boolean;
  availableActions: string[];
  isLoadingActions: boolean;
  onUpdateStatus: (orderId: string, actionType: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onViewDetails: () => void;
  onArrangeShipment?: () => void;
  onPrepareShipment?: () => Promise<void>;
  onRefreshActions: () => Promise<void>;
  isMobile?: boolean;
}

interface DeliveryInfo {
  delivery_id?: string;
  rider_name?: string;
  status?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  submitted_at?: string;
}

export function OrderActions({ 
  order, 
  isCancelled, 
  isPickup, 
  hasPendingOffer = false,
  availableActions,
  isLoadingActions,
  onUpdateStatus, 
  onCancelOrder, 
  onViewDetails,
  onArrangeShipment,
  onPrepareShipment,
  isMobile = false 
}: OrderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to handle View Details navigation
  const handleViewDetails = () => {
    // Redirect to seller-view-order page with orderId
    navigate(`/seller-view-order/${order.order_id}`);
  };

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setIsOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;
    
    setIsLoading(true);
    try {
      if (selectedAction === 'cancel') {
        await onCancelOrder(order.order_id);
      } else if (selectedAction === 'prepare_shipment') {
        await onPrepareShipment?.();
      } else {
        await onUpdateStatus(order.order_id, selectedAction);
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setSelectedAction(null);
    }
  };

  const getActionConfig = (action: string) => {
    const configs: Record<string, {
      label: string;
      icon: React.ReactNode;
      color: string;
      variant?: 'default' | 'secondary' | 'destructive' | 'outline';
      description: string;
    }> = {
      'confirm': {
        label: isPickup ? 'Confirm Pickup Order' : 'Confirm Delivery Order',
        icon: <CheckCircle className="w-4 h-4 mr-2" />,
        color: 'text-blue-600',
        variant: 'default' as const,
        description: isPickup 
          ? 'Confirm the pickup order and prepare items for collection' 
          : 'Confirm the delivery order and prepare for shipment'
      },
      'prepare_shipment': {
        label: 'Prepare for Shipment',
        icon: <PackagePlus className="w-4 h-4 mr-2" />,
        color: 'text-orange-600',
        variant: 'default' as const,
        description: 'Prepare order items for shipment and mark as ready for shipping arrangements'
      },
      'ready_for_pickup': {
        label: 'Mark as Ready for Pickup',
        icon: <Store className="w-4 h-4 mr-2" />,
        color: 'text-green-600',
        variant: 'default' as const,
        description: 'Notify customer that order is ready for pickup'
      },
      'arrange_shipment': {
        label: 'Arrange Shipping',
        icon: <Ship className="w-4 h-4 mr-2" />,
        color: 'text-green-600',
        variant: 'default' as const,
        description: 'Arrange delivery and shipping for this order'
      },
      'arrange_shipment_nav': {
        label: 'Arrange Shipping',
        icon: <Ship className="w-4 h-4 mr-2" />,
        color: 'text-blue-600',
        variant: 'default' as const,
        description: 'Go to shipment arrangement page'
      },
      'picked_up': {
        label: 'Mark as Picked Up',
        icon: <CheckCircle className="w-4 h-4 mr-2" />,
        color: 'text-green-600',
        variant: 'default' as const,
        description: 'Confirm customer has picked up the order'
      },
      'shipped': {
        label: 'Mark as Shipped',
        icon: <Ship className="w-4 h-4 mr-2" />,
        color: 'text-blue-600',
        variant: 'default' as const,
        description: 'Mark order as shipped with carrier'
      },
      'complete': {
        label: 'Mark as Delivered',
        icon: <CheckCircle className="w-4 h-4 mr-2" />,
        color: 'text-green-600',
        variant: 'default' as const,
        description: 'Confirm order has been delivered to customer'
      },
      'out_for_delivery': {
        label: 'Mark as Out for Delivery',
        icon: <Truck className="w-4 h-4 mr-2" />,
        color: 'text-purple-600',
        variant: 'default' as const,
        description: 'Update status to out for delivery'
      },
      'cancel': {
        label: 'Cancel Order',
        icon: <Ban className="w-4 h-4 mr-2" />,
        color: 'text-red-600',
        variant: 'destructive' as const,
        description: 'Cancel this order permanently'
      },
      'view_details': {
        label: 'View Details',
        icon: <Eye className="w-4 h-4 mr-2" />,
        color: 'text-gray-600',
        variant: 'outline' as const,
        description: 'View complete order information'
      },
      'print': {
        label: 'Print Order',
        icon: <Printer className="w-4 h-4 mr-2" />,
        color: 'text-gray-600',
        variant: 'outline' as const,
        description: 'Print order details and invoice'
      }
    };

    return configs[action] || {
      label: action.replace(/_/g, ' '),
      icon: <CheckCircle className="w-4 h-4 mr-2" />,
      color: 'text-gray-600',
      variant: 'outline' as const,
      description: `Perform ${action.replace(/_/g, ' ')} action`
    };
  };

  const getActionTitle = (actionId: string) => {
    const actionMap: Record<string, string> = {
      'view_details': 'View Order Details',
      'confirm': isPickup ? 'Confirm Pickup Order' : 'Confirm Delivery Order',
      'prepare_shipment': 'Prepare for Shipment',
      'ready_for_pickup': 'Mark as Ready for Pickup',
      'arrange_shipment': 'Arrange Shipping',
      'picked_up': 'Mark as Picked Up',
      'shipped': 'Mark as Shipped',
      'complete': 'Mark as Delivered',
      'out_for_delivery': 'Mark as Out for Delivery',
      'cancel': 'Cancel Order',
      'print': 'Print Order'
    };
    return actionMap[actionId] || actionId.replace(/_/g, ' ');
  };

  const renderDialog = () => {
    if (!selectedAction) return null;

    const actionConfig = getActionConfig(selectedAction);

    const ActionContent = () => (
      <>
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            {selectedAction === 'cancel' ? (
              <Ban className="w-8 h-8 text-red-500" />
            ) : selectedAction === 'prepare_shipment' ? (
              <PackagePlus className="w-8 h-8 text-orange-500" />
            ) : (
              <CheckCircle className="w-8 h-8 text-blue-500" />
            )}
            <div>
              <h3 className="font-semibold text-lg">{getActionTitle(selectedAction)}</h3>
              <p className="text-sm text-gray-500">Order ID: {order.order_id}</p>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          <p className="text-gray-700">
            {actionConfig.description}
          </p>
          
          {selectedAction === 'cancel' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">⚠️ Warning</p>
              <p className="text-sm text-red-600">
                This action cannot be undone. The order will be permanently cancelled.
              </p>
            </div>
          )}
          
          {selectedAction === 'prepare_shipment' && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-600 font-medium">📦 Shipment Preparation</p>
              <p className="text-sm text-blue-600">
                This will mark the order as ready for shipping arrangements. 
                The order status will change to "To Ship".
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setSelectedAction(null);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={selectedAction === 'cancel' ? 'destructive' : 'default'}
            onClick={handleConfirmAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : selectedAction === 'prepare_shipment' ? (
              'Prepare Shipment'
            ) : selectedAction === 'cancel' ? (
              'Cancel Order'
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </>
    );

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{getActionTitle(selectedAction)}</DrawerTitle>
              <DrawerDescription>
                Order ID: {order.order_id}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <ActionContent />
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle(selectedAction)}</AlertDialogTitle>
            <AlertDialogDescription>
              Order ID: {order.order_id}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ActionContent />
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Handle arrange shipment navigation
  const handleArrangeShipment = () => {
    window.location.href = `/arrange-shipment?orderId=${order.order_id}`;
  };

  // Handle prepare shipment action
  const handlePrepareShipment = () => {
    if (onPrepareShipment) {
      onPrepareShipment();
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Main dropdown menu render
  if (isCancelled) {
    return (
      <Badge 
        variant="outline" 
        className="h-7 px-2 text-xs border-red-200 text-red-600"
      >
        <Ban className="w-3 h-3 mr-1" />
        Cancelled
      </Badge>
    );
  }

  if (isMobile) {
    // Mobile version - simple button with actions in a sheet
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            // For mobile, we'll handle it differently - you might need to adjust
            // based on your mobile implementation
            const event = new CustomEvent('open-actions', { 
              detail: { 
                orderId: order.order_id,
                onViewDetails: handleViewDetails // Pass the handler
              } 
            });
            window.dispatchEvent(event);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {renderDialog()}
      </>
    );
  }

  // Desktop version - dropdown menu with dynamic actions
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* View Details - Updated to use navigation */}
          <DropdownMenuItem 
            data-navigate="true"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {/* Available Actions */}
          {isLoadingActions ? (
            <DropdownMenuItem 
              data-navigate="false"
              className="cursor-pointer">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading actions...
            </DropdownMenuItem>
          ) : availableActions.length > 0 ? (
            availableActions.map((action) => (
              <DropdownMenuItem
                data-navigate="false"
                key={action}
                onClick={(e) => {
                  e.stopPropagation();
                  if (action === 'arrange_shipment_nav') {
                    onArrangeShipment?.();
                  } else if (action === 'arrange_shipment') {
                    handleArrangeShipment();
                  } else if (action === 'prepare_shipment') {
                    handlePrepareShipment();
                  } else if (action === 'print') {
                    handlePrint();
                  } else if (action === 'view_details') {
                    handleViewDetails();
                  } else {
                    handleActionClick(action);
                  }
                }}
                className="cursor-pointer"
              >
                {getActionConfig(action).icon}
                {getActionConfig(action).label}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem className="cursor-pointer text-muted-foreground">
              No actions available
            </DropdownMenuItem>
          )}
          
          {/* Print Option */}
          <DropdownMenuItem 
            data-navigate="false"
            onClick={handlePrint}
            className="cursor-pointer"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {renderDialog()}
    </>
  );
}