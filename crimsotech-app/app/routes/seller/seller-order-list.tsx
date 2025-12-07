import type { Route } from './+types/seller-order-list';
import SidebarLayout from '~/components/layouts/seller-sidebar'
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
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { useState } from 'react';
import { 
  ShoppingCart,
  Clock,
  ArrowUpDown,
  User,
  Package,
  Calendar,
  PhilippinePeso,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  Search,
  Filter,
  Eye,
  Truck,
  Package2,
  CheckSquare,
  List,
  Ship,
  CheckCheck,
  Loader2,
  Wallet,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "My Orders",
    },
  ];
}

// Interface for order items
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
    quantity: number;
  };
  voucher?: {
    id: string;
    name: string;
    code: string;
    value: number;
  };
  quantity: number;
  total_amount: number;
  status: string;
  remarks?: string;
  created_at: string;
  is_shipped?: boolean;
  shipping_method?: string | null;
  tracking_number?: string | null;
  estimated_delivery?: string | null;
  is_processed?: boolean; // New field for processed status
  processed_at?: string; // New field for when item was processed
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
  status: string;
  total_amount: number;
  payment_method: string | null;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

// Loader function for UI demo
export async function loader({ request, context }: Route.LoaderArgs) {
  return {
    user: {
      id: "demo-customer-123",
      name: "John Customer",
      email: "customer@example.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      username: "john_customer",
    },
    // Mock orders data for UI display with shipping information
    orders: [
      {
        order_id: "ORD-2024-00123",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "completed",
        total_amount: 57000,
        payment_method: "Credit Card",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-16T14:25:00Z",
        items: [
          {
            id: "item-001",
            cart_item: {
              id: "cart-001",
              product: {
                id: "prod-001",
                name: "Apple iPhone 13 Pro",
                price: 45000,
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 45000,
            status: "completed",
            is_shipped: true,
            is_processed: true,
            processed_at: "2024-01-16T09:30:00Z",
            shipping_method: "Standard Shipping",
            tracking_number: "TRK-7890123456",
            estimated_delivery: "2024-01-18",
            created_at: "2024-01-15T10:30:00Z"
          },
          {
            id: "item-002",
            cart_item: {
              id: "cart-002",
              product: {
                id: "prod-002",
                name: "Samsung Galaxy Watch 4",
                price: 12000,
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 12000,
            status: "completed",
            is_shipped: true,
            is_processed: true,
            processed_at: "2024-01-16T09:30:00Z",
            shipping_method: "Standard Shipping",
            tracking_number: "TRK-7890123456",
            estimated_delivery: "2024-01-18",
            created_at: "2024-01-15T10:30:00Z"
          }
        ]
      },
      {
        order_id: "ORD-2024-00124",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "to_ship",
        total_amount: 32000,
        payment_method: "GCash",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-18T14:20:00Z",
        updated_at: "2024-01-18T14:20:00Z",
        items: [
          {
            id: "item-003",
            cart_item: {
              id: "cart-003",
              product: {
                id: "prod-003",
                name: "MacBook Air M1",
                price: 32000,
                shop: {
                  id: "shop-002",
                  name: "Apple Premium Reseller"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 32000,
            status: "to_ship",
            is_shipped: false,
            is_processed: false,
            shipping_method: "Express Shipping",
            tracking_number: null,
            estimated_delivery: "2024-01-25",
            created_at: "2024-01-18T14:20:00Z"
          }
        ]
      },
      {
        order_id: "ORD-2024-00125",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "to_ship",
        total_amount: 8500,
        payment_method: "Bank Transfer",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-19T09:15:00Z",
        updated_at: "2024-01-19T09:15:00Z",
        items: [
          {
            id: "item-004",
            cart_item: {
              id: "cart-004",
              product: {
                id: "prod-004",
                name: "Wireless Headphones",
                price: 8500,
                shop: {
                  id: "shop-003",
                  name: "Audio Express"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 8500,
            status: "to_ship",
            is_shipped: false,
            is_processed: true,
            processed_at: "2024-01-20T10:15:00Z",
            shipping_method: "Standard Shipping",
            tracking_number: null,
            estimated_delivery: "2024-01-26",
            created_at: "2024-01-19T09:15:00Z"
          },
          {
            id: "item-005",
            cart_item: {
              id: "cart-005",
              product: {
                id: "prod-005",
                name: "USB-C Cable",
                price: 500,
                shop: {
                  id: "shop-003",
                  name: "Audio Express"
                }
              },
              quantity: 2
            },
            quantity: 2,
            total_amount: 1000,
            status: "to_ship",
            is_shipped: false,
            is_processed: false,
            shipping_method: "Standard Shipping",
            tracking_number: null,
            estimated_delivery: "2024-01-26",
            created_at: "2024-01-19T09:15:00Z"
          }
        ]
      },
      {
        order_id: "ORD-2024-00126",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "in_transit",
        total_amount: 25000,
        payment_method: "Credit Card",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-17T11:30:00Z",
        updated_at: "2024-01-20T16:45:00Z",
        items: [
          {
            id: "item-006",
            cart_item: {
              id: "cart-006",
              product: {
                id: "prod-006",
                name: "Smartwatch",
                price: 25000,
                shop: {
                  id: "shop-004",
                  name: "Wearables Hub"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 25000,
            status: "in_transit",
            is_shipped: true,
            is_processed: true,
            processed_at: "2024-01-18T14:20:00Z",
            shipping_method: "Express Shipping",
            tracking_number: "TRK-9876543210",
            estimated_delivery: "2024-01-22",
            created_at: "2024-01-17T11:30:00Z"
          }
        ]
      },
      {
        order_id: "ORD-2024-00127",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "pending_shipment",
        total_amount: 18000,
        payment_method: "Credit Card",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-21T10:00:00Z",
        updated_at: "2024-01-21T10:00:00Z",
        items: [
          {
            id: "item-007",
            cart_item: {
              id: "cart-007",
              product: {
                id: "prod-007",
                name: "Tablet",
                price: 18000,
                shop: {
                  id: "shop-005",
                  name: "Electronics World"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 18000,
            status: "pending_shipment",
            is_shipped: false,
            is_processed: false,
            shipping_method: null,
            tracking_number: null,
            estimated_delivery: null,
            created_at: "2024-01-21T10:00:00Z"
          }
        ]
      },
      // New orders for additional tabs
      {
        order_id: "ORD-2024-00128",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "unpaid",
        total_amount: 15000,
        payment_method: null,
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-22T08:45:00Z",
        updated_at: "2024-01-22T08:45:00Z",
        items: [
          {
            id: "item-008",
            cart_item: {
              id: "cart-008",
              product: {
                id: "prod-008",
                name: "Gaming Mouse",
                price: 15000,
                shop: {
                  id: "shop-006",
                  name: "Gaming Gear"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 15000,
            status: "unpaid",
            is_shipped: false,
            is_processed: false,
            shipping_method: null,
            tracking_number: null,
            estimated_delivery: null,
            created_at: "2024-01-22T08:45:00Z"
          }
        ]
      },
      {
        order_id: "ORD-2024-00129",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "customer@example.com",
          first_name: "John",
          last_name: "Customer"
        },
        status: "return_refund_cancel",
        total_amount: 5000,
        payment_method: "Credit Card",
        delivery_address: "123 Main St, Manila, Philippines",
        created_at: "2024-01-10T14:20:00Z",
        updated_at: "2024-01-18T11:30:00Z",
        items: [
          {
            id: "item-009",
            cart_item: {
              id: "cart-009",
              product: {
                id: "prod-009",
                name: "Bluetooth Speaker",
                price: 5000,
                shop: {
                  id: "shop-007",
                  name: "Audio World"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 5000,
            status: "return_refund_cancel",
            is_shipped: false,
            is_processed: false,
            shipping_method: null,
            tracking_number: null,
            estimated_delivery: null,
            created_at: "2024-01-10T14:20:00Z",
            remarks: "Return requested due to defective product"
          }
        ]
      }
    ]
  };
}

// Empty state components
const EmptyTable = ({ message = "No orders yet" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Start shopping to see your orders here.
      </p>
    </div>
  </div>
);

// Main Tabs configuration
const TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'to_ship', label: 'To Ship', icon: Package2 },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckSquare },
  { id: 'return_refund_cancel', label: 'Return/Refund/Cancel', icon: RotateCcw }
];

// To Ship subtabs configuration
const TO_SHIP_SUBTABS = [
  { id: 'all_to_ship', label: 'All', icon: Package2 },
  { id: 'to_process', label: 'To Process', icon: Loader2 },
  { id: 'processed', label: 'Processed', icon: CheckCheck }
];

// Shipping subtabs configuration
const SHIPPING_SUBTABS = [
  { id: 'all_shipping', label: 'All', icon: Truck },
  { id: 'in_transit', label: 'In Transit', icon: Truck },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck }
];

// Define the type for flattened order items
type FlattenedOrderItem = OrderItem & {
  order_id: string;
  payment_method: string | null;
  delivery_address: string;
  order_created_at: string;
  order_status: string;
  shopName: string;
};

export default function OrderList({ loaderData }: Route.ComponentProps) {
  const { user, orders } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [toShipSubTab, setToShipSubTab] = useState<string>('all_to_ship');
  const [shippingSubTab, setShippingSubTab] = useState<string>('all_shipping');

  // Flatten orders into individual items for the table with proper typing
  const orderItems: FlattenedOrderItem[] = orders.flatMap(order => 
    order.items.map(item => ({
      ...item,
      order_id: order.order_id,
      payment_method: order.payment_method,
      delivery_address: order.delivery_address,
      order_created_at: order.created_at,
      order_status: order.status,
      shopName: item.cart_item?.product?.shop?.name || 'Unknown Shop'
    }))
  );

  // Filter order items based on active tab
  const getFilteredOrderItems = () => {
    // First filter by search term
    let filtered = orderItems.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.cart_item?.product?.name?.toLowerCase().includes(searchLower) ||
        item.order_id?.toLowerCase().includes(searchLower) ||
        item.shopName?.toLowerCase().includes(searchLower)
      );
    });

    // Then filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'to_ship') {
        // Show both 'to_ship' and 'pending_shipment' statuses in "To Ship" tab
        filtered = filtered.filter(item => 
          item.order_status?.toLowerCase() === 'to_ship' ||
          item.order_status?.toLowerCase() === 'pending_shipment'
        );

        // Further filter by toShipSubTab
        if (toShipSubTab === 'to_process') {
          filtered = filtered.filter(item => !item.is_processed);
        } else if (toShipSubTab === 'processed') {
          filtered = filtered.filter(item => !!item.is_processed);
        }
        // 'all_to_ship' shows all items in to_ship tab
      } else if (activeTab === 'shipping') {
        // Show 'in_transit' status in "Shipping" tab
        filtered = filtered.filter(item => 
          item.order_status?.toLowerCase() === 'in_transit'
        );

        // Further filter by shippingSubTab
        if (shippingSubTab === 'in_transit') {
          // Already filtered by in_transit status
          filtered = filtered.filter(item => item.tracking_number && !item.estimated_delivery?.includes('Today'));
        } else if (shippingSubTab === 'out_for_delivery') {
          // Mock out for delivery status
          filtered = filtered.filter(item => item.estimated_delivery?.includes('Today'));
        }
        // 'all_shipping' shows all items in shipping tab
      } else if (activeTab === 'return_refund_cancel') {
        filtered = filtered.filter(item => 
          item.order_status?.toLowerCase() === 'return_refund_cancel' ||
          item.order_status?.toLowerCase() === 'cancelled' ||
          item.order_status?.toLowerCase() === 'returned' ||
          item.order_status?.toLowerCase() === 'refunded'
        );
      } else {
        filtered = filtered.filter(item => 
          item.order_status?.toLowerCase() === activeTab.toLowerCase()
        );
      }
    }

    return filtered;
  };

  const filteredOrderItems = getFilteredOrderItems();

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'to_ship': return '#f59e0b';
      case 'pending_shipment': return '#f97316';
      case 'in_transit': return '#3b82f6';
      case 'out_for_delivery': return '#8b5cf6';
      case 'unpaid': return '#ef4444';
      case 'cancelled': return '#6b7280';
      case 'return_refund_cancel': return '#dc2626';
      case 'returned': return '#7c3aed';
      case 'refunded': return '#059669';
      case 'pending': return '#f59e0b';
      case 'failed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'to_ship': return <Package2 className="w-4 h-4" />;
      case 'pending_shipment': return <Clock className="w-4 h-4" />;
      case 'in_transit': return <Truck className="w-4 h-4" />;
      case 'out_for_delivery': return <Truck className="w-4 h-4" />;
      case 'unpaid': return <PhilippinePeso className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'return_refund_cancel': return <RotateCcw className="w-4 h-4" />;
      case 'returned': return <RotateCcw className="w-4 h-4" />;
      case 'refunded': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const viewOrderDetails = (orderId: string) => {
    alert(`Viewing details for order ${orderId}`);
    // In real app: navigate(`/orders/${orderId}`);
  };

  const trackShipment = (trackingNumber: string) => {
    alert(`Tracking shipment: ${trackingNumber}`);
    // In real app: open tracking page
  };



  const confirmOrder = (orderId: string, itemId: string) => {
    alert(`Confirming order ${orderId}, item ${itemId}\n\nOrder will be marked as processed and ready for shipment arrangement.`);
    // In real app: call API to mark item as processed
  };

  const payNow = (orderId: string) => {
    alert(`Processing payment for order ${orderId}`);
    // In real app: navigate to payment page
  };

  const viewReturnDetails = (orderId: string) => {
    alert(`Viewing return/refund details for order ${orderId}`);
    // In real app: navigate to return details page
  };

  // Calculate stats
  const totalOrders = orders.length;
  const toShipOrders = orders.filter(o => 
    o.status === 'to_ship' || o.status === 'pending_shipment'
  ).length;
  const shippingOrders = orders.filter(o => o.status === 'in_transit').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const returnRefundCancelOrders = orders.filter(o => 
    o.status === 'return_refund_cancel' || 
    o.status === 'cancelled' || 
    o.status === 'returned' || 
    o.status === 'refunded'
  ).length;
  
  const toProcessOrders = orderItems.filter(item => 
    (item.order_status === 'to_ship' || item.order_status === 'pending_shipment') && 
    !item.is_processed
  ).length;
  const processedOrders = orderItems.filter(item => 
    (item.order_status === 'to_ship' || item.order_status === 'pending_shipment') && 
    !!item.is_processed
  ).length;

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
              <p className="text-gray-600 mt-1">Track and manage your purchases</p>
            </div>
          </div>

          {/* Main Tabs Navigation */}
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tab.id === 'all' ? totalOrders :
                            tab.id === 'to_ship' ? toShipOrders :
                            tab.id === 'shipping' ? shippingOrders :
                            tab.id === 'completed' ? completedOrders :
                            tab.id === 'return_refund_cancel' ? returnRefundCancelOrders : 0;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'to_ship') {
                        setToShipSubTab('all_to_ship');
                      }
                      if (tab.id !== 'shipping') {
                        setShippingSubTab('all_shipping');
                      }
                    }}
                    className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-3 ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* To Ship Subtabs (only shown when To Ship tab is active) */}
          {activeTab === 'to_ship' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Package2 className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold">To Ship Orders</h3>
                <span className="text-sm text-gray-500 ml-2">
                  Manage your orders that are ready to be shipped
                </span>
              </div>
              <div className="flex overflow-x-auto">
                {TO_SHIP_SUBTABS.map((subtab) => {
                  const Icon = subtab.icon;
                  const isActive = toShipSubTab === subtab.id;
                  const count = subtab.id === 'all_to_ship' ? toShipOrders :
                              subtab.id === 'to_process' ? toProcessOrders :
                              subtab.id === 'processed' ? processedOrders : 0;

                  return (
                    <Button
                      key={subtab.id}
                      variant="ghost"
                      onClick={() => setToShipSubTab(subtab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 ${isActive ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{subtab.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shipping Subtabs (only shown when Shipping tab is active) */}
          {activeTab === 'shipping' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Shipping Orders</h3>
                <span className="text-sm text-gray-500 ml-2">
                  Track your orders that are on the way
                </span>
              </div>
              <div className="flex overflow-x-auto">
                {SHIPPING_SUBTABS.map((subtab) => {
                  const Icon = subtab.icon;
                  const isActive = shippingSubTab === subtab.id;
                  const count = subtab.id === 'all_shipping' ? shippingOrders :
                              subtab.id === 'in_transit' ? shippingOrders : // Simplified for demo
                              subtab.id === 'out_for_delivery' ? 1 : 0; // Mock count

                  return (
                    <Button
                      key={subtab.id}
                      variant="ghost"
                      onClick={() => setShippingSubTab(subtab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 ${isActive ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{subtab.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Cards - Removed Total Spent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold mt-1">{totalOrders}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">To Ship</p>
                    <p className="text-2xl font-bold mt-1 text-yellow-600">{toShipOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ready for shipping</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Package2 className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{shippingOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">On the way</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, order ID, or shop..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                {activeTab === 'all' && 'All Orders'}
                {activeTab === 'unpaid' && 'Unpaid Orders'}
                {activeTab === 'to_ship' && (
                  <>
                    {toShipSubTab === 'all_to_ship' && 'All To Ship Orders'}
                    {toShipSubTab === 'to_process' && 'Orders To Process'}
                    {toShipSubTab === 'processed' && 'Processed Orders'}
                  </>
                )}
                {activeTab === 'shipping' && (
                  <>
                    {shippingSubTab === 'all_shipping' && 'All Shipping Orders'}
                    {shippingSubTab === 'in_transit' && 'Orders In Transit'}
                    {shippingSubTab === 'out_for_delivery' && 'Orders Out for Delivery'}
                  </>
                )}
                {activeTab === 'completed' && 'Completed Orders'}
                {activeTab === 'return_refund_cancel' && 'Return/Refund/Cancel Orders'}
              </CardTitle>
              <CardDescription>
                Showing {filteredOrderItems.length} order items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredOrderItems.length === 0 ? (
                <EmptyTable 
                  message={
                    activeTab === 'to_ship' ? (
                      toShipSubTab === 'to_process' ? 'No orders to process' :
                      toShipSubTab === 'processed' ? 'No processed orders' :
                      'No orders to ship'
                    ) :
                    activeTab === 'shipping' ? (
                      shippingSubTab === 'in_transit' ? 'No orders in transit' :
                      shippingSubTab === 'out_for_delivery' ? 'No orders out for delivery' :
                      'No shipping orders'
                    ) :
                    activeTab === 'completed' ? 'No completed orders' :
                    activeTab === 'return_refund_cancel' ? 'No return/refund/cancel orders' :
                    'No orders yet'
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Order ID</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Product</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Shop</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Qty</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Processing</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Shipping</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredOrderItems.map((item) => {
                          const statusColor = getStatusColor(item.order_status);
                          const isToShip = activeTab === 'to_ship';
                          const isShipping = activeTab === 'shipping';
                          const isReturnRefundCancel = activeTab === 'return_refund_cancel';
                          
                          const isToProcess = isToShip && toShipSubTab === 'to_process';
                          const isProcessed = isToShip && toShipSubTab === 'processed';
                          
                          const canArrangeShipment = isToShip && item.is_processed && !item.tracking_number;
                          const canConfirmOrder = isToShip && !item.is_processed;
                          
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="p-3 text-sm">
                                <div className="font-medium">{item.order_id}</div>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{item.cart_item?.product?.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      <PhilippinePeso className="inline w-3 h-3 mr-1" />
                                      {item.cart_item?.product?.price}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Store className="w-4 h-4 text-muted-foreground" />
                                  <span>{item.shopName}</span>
                                </div>
                              </td>
                              <td className="p-3 text-sm text-center">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <PhilippinePeso className="w-4 h-4 text-muted-foreground" />
                                  {item.total_amount}
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                <Badge 
                                  variant="secondary"
                                  className="text-xs capitalize flex items-center gap-1"
                                  style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                                >
                                  {getStatusIcon(item.order_status)}
                                  {item.order_status?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                {item.is_processed ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCheck className="w-4 h-4" />
                                    <span className="text-xs">Processed</span>
                                    {item.processed_at && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        {formatDate(item.processed_at)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Awaiting Processing</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                {item.tracking_number ? (
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Tracking: {item.tracking_number}</div>
                                    <div className="text-xs text-muted-foreground">Est: {item.estimated_delivery}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {item.shipping_method || 'Awaiting shipment arrangement'}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  {formatDate(item.created_at)}
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex flex-col gap-2 min-w-[140px]">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => viewOrderDetails(item.order_id)}
                                    className="flex items-center justify-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                  
                                  {/* To Ship Tab Actions */}
                                  {isToShip && canConfirmOrder && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => confirmOrder(item.order_id, item.id)}
                                      className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Confirm Order
                                    </Button>
                                  )}

                                  {isToShip && canArrangeShipment && (
                                    <Link
                                      to={`/arrange-shipment?orderId=${item.order_id}&itemId=${item.id}`}
                                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Ship className="w-3 h-3" />
                                      Arrange Shipment
                                    </Link>
                                  )}

                                  {/* Shipping Tab Actions */}
                                  {item.tracking_number && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => trackShipment(item.tracking_number!)}
                                      className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    >
                                      <Truck className="w-3 h-3" />
                                      Track
                                    </Button>
                                  )}

                                  {/* Return/Refund/Cancel Tab Actions */}
                                  {isReturnRefundCancel && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => viewReturnDetails(item.order_id)}
                                      className="flex items-center justify-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      View Details
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

         

          {activeTab === 'to_ship' && toShipOrders > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-800">
                  <div className="flex items-center gap-2">
                    <Package2 className="w-5 h-5" />
                    {toShipSubTab === 'to_process' && 'Orders To Process'}
                    {toShipSubTab === 'processed' && 'Processed Orders'}
                    {toShipSubTab === 'all_to_ship' && 'To Ship Orders'}
                  </div>
                </CardTitle>
                <CardDescription className="text-blue-600">
                  {toShipSubTab === 'to_process' && (
                    `${toProcessOrders} order${toProcessOrders !== 1 ? 's' : ''} waiting to be processed. Confirm orders before arranging shipment.`
                  )}
                  {toShipSubTab === 'processed' && (
                    `${processedOrders} order${processedOrders !== 1 ? 's' : ''} processed and ready for shipment arrangement.`
                  )}
                  {toShipSubTab === 'all_to_ship' && (
                    `${toShipOrders} order${toShipOrders !== 1 ? 's' : ''} in different shipping stages`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {toShipSubTab === 'to_process' && (
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>
                      <strong>Orders To Process:</strong> These orders need confirmation before shipping can be arranged.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Review order details and payment confirmation</li>
                      <li>Check product availability in inventory</li>
                      <li>Click "Confirm Order" to mark as ready for shipment</li>
                      <li>Once confirmed, orders move to "Processed" tab</li>
                    </ul>
                  </div>
                )}
                {toShipSubTab === 'processed' && (
                  <div className="text-sm text-green-700 space-y-2">
                    <p>
                      <strong>Processed Orders:</strong> These orders are confirmed and ready for shipment arrangement.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Click "Arrange Shipment" to choose shipping method</li>
                      <li>Select courier service and schedule pickup</li>
                      <li>Provide shipping instructions</li>
                      <li>Confirm delivery address</li>
                      <li>Once shipped, orders move to "Shipping" tab</li>
                    </ul>
                  </div>
                )}
                {toShipSubTab === 'all_to_ship' && (
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>
                      <strong>To Ship Orders Workflow:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>To Process:</strong> Orders awaiting confirmation</li>
                      <li><strong>Processed:</strong> Confirmed orders ready for shipment</li>
                      <li><strong>Arrange Shipment:</strong> After processing, arrange shipping details</li>
                      <li><strong>Shipping:</strong> Once shipped, track delivery progress</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'shipping' && shippingOrders > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    {shippingSubTab === 'in_transit' && 'Orders In Transit'}
                    {shippingSubTab === 'out_for_delivery' && 'Orders Out for Delivery'}
                    {shippingSubTab === 'all_shipping' && 'Shipping Orders'}
                  </div>
                </CardTitle>
                <CardDescription className="text-green-600">
                  {shippingOrders} order{shippingOrders !== 1 ? 's' : ''} currently being shipped
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-700">
                  <p className="mb-2">Your orders are on the way! Use the "Track" button to monitor delivery progress.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>In Transit:</strong> Orders are on their way to the delivery hub</li>
                    <li><strong>Out for Delivery:</strong> Orders are with the courier for final delivery</li>
                    <li>Track your packages in real-time with the tracking number</li>
                    <li>Expected delivery dates are shown in the table</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'return_refund_cancel' && returnRefundCancelOrders > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-800">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Return/Refund/Cancel Orders
                  </div>
                </CardTitle>
                <CardDescription className="text-purple-600">
                  {returnRefundCancelOrders} order{returnRefundCancelOrders !== 1 ? 's' : ''} with return/refund/cancel requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-purple-700 space-y-2">
                  <p>
                    <strong>Return/Refund/Cancel Requests:</strong> Manage your return, refund, and cancellation requests here.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Returns:</strong> Product returns for exchange or refund</li>
                    <li><strong>Refunds:</strong> Monetary refunds for cancelled or returned orders</li>
                    <li><strong>Cancellations:</strong> Order cancellation requests</li>
                    <li>Click "View Details" to see the status of your requests</li>
                    <li>Contact customer support for assistance with complex cases</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}