import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge'; // Changed this import
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
  ExternalLink
} from 'lucide-react'; // Removed Badge from here
import { Separator } from '~/components/ui/separator';

interface OrderActionsProps {
  order: {
    order_id: string;
    status: string;
    delivery_method?: string | null;
    shipping_method?: string | null;
    delivery_info?: DeliveryInfo; // Add this
  };
  isCancelled: boolean;
  isPickup: boolean;
  hasPendingOffer?: boolean; // Add this
  availableActions: string[];
  isLoadingActions: boolean;
  onUpdateStatus: (orderId: string, actionType: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onViewDetails: () => void;
  onArrangeShipment?: () => void; // Add this
  onRefreshActions: () => Promise<void>;
  isMobile?: boolean;
}

// Add DeliveryInfo interface
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
  hasPendingOffer = false, // Add default value
  availableActions,
  isLoadingActions,
  onUpdateStatus, 
  onCancelOrder, 
  onViewDetails,
  onArrangeShipment, // Add this
  onRefreshActions,
  isMobile = false 
}: OrderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

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
            ) : (
              selectedAction === 'cancel' ? 'Cancel Order' : 'Confirm'
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

  // Handle arrange shipment separately (navigation)
  const handleArrangeShipment = () => {
    window.location.href = `/arrange-shipment?orderId=${order.order_id}`;
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
            // Show mobile actions sheet
            const event = new CustomEvent('open-actions', { detail: { orderId: order.order_id } });
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
          
          {/* View Details */}
          <DropdownMenuItem 
            onClick={() => onViewDetails()}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {/* Available Actions */}
          {isLoadingActions ? (
            <DropdownMenuItem className="cursor-pointer">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading actions...
            </DropdownMenuItem>
          ) : availableActions.length > 0 ? (
            availableActions.map((action) => (
              <DropdownMenuItem 
                key={action}
                onClick={(e) => {
                  e.stopPropagation();
                  if (action === 'arrange_shipment_nav') {
                    onArrangeShipment?.(); // Add this prop to OrderActionsProps
                  } else if (action === 'arrange_shipment') {
                    handleArrangeShipment();
                  } else if (action === 'print') {
                    handlePrint();
                  } else if (action === 'view_details') {
                    onViewDetails();
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
          
          {/* Refresh Actions */}
          <DropdownMenuItem 
            onClick={onRefreshActions}
            className="cursor-pointer"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Actions
          </DropdownMenuItem>
          
          {/* Print Option */}
          <DropdownMenuItem 
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