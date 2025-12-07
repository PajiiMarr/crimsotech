import type { Route } from './+types/order-list';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from 'react-router';
import { 
  Card, 
  CardContent 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { useState } from 'react';
import { 
  ShoppingCart,
  Clock,
  User,
  Package,
  Calendar,
  PhilippinePeso,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Truck,
  Package2,
  CheckSquare,
  List,
  Ship,
  Loader2,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  CreditCard,
  Phone
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller Orders",
    },
  ];
}

interface OrderItem {
  id: string;
  cart_item: {
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      variant?: string;
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
  delivery_address: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  return {
    user: {
      id: "demo-seller-001",
      name: "TechGadgets Store",
      email: "seller@techgadgets.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: false,
      username: "techgadgets_seller",
    },
    orders: [
      {
        order_id: "ORD-2024-00123",
        user: {
          id: "demo-customer-123",
          username: "john_customer",
          email: "john.customer@example.com",
          first_name: "John",
          last_name: "Customer",
          phone: "+639123456789"
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
                variant: "256GB, Graphite",
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
            shipping_method: "Standard Shipping",
            tracking_number: "TRK-7890123456",
            estimated_delivery: "2024-01-18",
            created_at: "2024-01-15T10:30:00Z",
            shipping_status: "completed",
            waybill_url: "/waybills/ORD-2024-00123.pdf"
          },
          {
            id: "item-002",
            cart_item: {
              id: "cart-002",
              product: {
                id: "prod-002",
                name: "iPhone 13 Pro Case",
                price: 1200,
                variant: "Clear, Anti-Yellowing",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 1200,
            status: "completed",
            is_shipped: true,
            is_processed: true,
            created_at: "2024-01-15T10:30:00Z",
            shipping_status: "completed"
          }
        ]
      },
      {
        order_id: "ORD-2024-00124",
        user: {
          id: "demo-customer-124",
          username: "jane_buyer",
          email: "jane.buyer@example.com",
          first_name: "Jane",
          last_name: "Buyer",
          phone: "+639987654321"
        },
        status: "pending_shipment",
        total_amount: 32000,
        payment_method: "GCash",
        delivery_address: "456 Oak St, Quezon City, Philippines",
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
                variant: "8GB RAM, 256GB SSD",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 32000,
            status: "pending_shipment",
            is_shipped: false,
            is_processed: false,
            created_at: "2024-01-18T14:20:00Z",
            shipping_status: "pending_shipment"
          }
        ]
      },
      {
        order_id: "ORD-2024-00125",
        user: {
          id: "demo-customer-125",
          username: "mike_shopper",
          email: "mike.shopper@example.com",
          first_name: "Mike",
          last_name: "Shopper",
          phone: "+639876543210"
        },
        status: "to_ship",
        total_amount: 10500,
        payment_method: "Bank Transfer",
        delivery_address: "789 Pine St, Makati, Philippines",
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
                variant: "Black, Noise Cancelling",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 8500,
            status: "to_ship",
            is_shipped: false,
            is_processed: true,
            created_at: "2024-01-19T09:15:00Z",
            shipping_status: "to_ship"
          },
          {
            id: "item-005",
            cart_item: {
              id: "cart-005",
              product: {
                id: "prod-005",
                name: "USB-C Cable",
                price: 500,
                variant: "2m, Fast Charging",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 2
            },
            quantity: 2,
            total_amount: 1000,
            status: "to_ship",
            is_shipped: false,
            is_processed: true,
            created_at: "2024-01-19T09:15:00Z",
            shipping_status: "to_ship"
          }
        ]
      },
      {
        order_id: "ORD-2024-00126",
        user: {
          id: "demo-customer-126",
          username: "sarah_tech",
          email: "sarah.tech@example.com",
          first_name: "Sarah",
          last_name: "Tech",
          phone: "+639555123456"
        },
        status: "shipped",
        total_amount: 25000,
        payment_method: "Credit Card",
        delivery_address: "101 Tech Blvd, Taguig, Philippines",
        created_at: "2024-01-20T11:45:00Z",
        updated_at: "2024-01-20T14:30:00Z",
        items: [
          {
            id: "item-006",
            cart_item: {
              id: "cart-006",
              product: {
                id: "prod-006",
                name: "Smart Watch Pro",
                price: 25000,
                variant: "Black, GPS",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 25000,
            status: "shipped",
            is_shipped: true,
            is_processed: true,
            shipping_method: "Express Shipping",
            tracking_number: "TRK-1234567890",
            estimated_delivery: "2024-01-22",
            created_at: "2024-01-20T11:45:00Z",
            shipping_status: "shipped",
            waybill_url: "/waybills/ORD-2024-00126.pdf"
          }
        ]
      },
      {
        order_id: "ORD-2024-00127",
        user: {
          id: "demo-customer-127",
          username: "david_tech",
          email: "david.tech@example.com",
          first_name: "David",
          last_name: "Tech",
          phone: "+639666789012"
        },
        status: "in_transit",
        total_amount: 18000,
        payment_method: "GCash",
        delivery_address: "222 Electronics St, Pasig, Philippines",
        created_at: "2024-01-21T09:30:00Z",
        updated_at: "2024-01-21T16:45:00Z",
        items: [
          {
            id: "item-007",
            cart_item: {
              id: "cart-007",
              product: {
                id: "prod-007",
                name: "Wireless Earbuds",
                price: 9000,
                variant: "White, Water Resistant",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 2
            },
            quantity: 2,
            total_amount: 18000,
            status: "in_transit",
            is_shipped: true,
            is_processed: true,
            shipping_method: "Standard Shipping",
            tracking_number: "TRK-2345678901",
            estimated_delivery: "2024-01-23",
            created_at: "2024-01-21T09:30:00Z",
            shipping_status: "in_transit"
          }
        ]
      },
      {
        order_id: "ORD-2024-00128",
        user: {
          id: "demo-customer-128",
          username: "lisa_shopper",
          email: "lisa.shopper@example.com",
          first_name: "Lisa",
          last_name: "Shopper",
          phone: "+639777890123"
        },
        status: "out_for_delivery",
        total_amount: 7500,
        payment_method: "Bank Transfer",
        delivery_address: "333 Gadget Ave, Mandaluyong, Philippines",
        created_at: "2024-01-22T08:15:00Z",
        updated_at: "2024-01-22T10:20:00Z",
        items: [
          {
            id: "item-008",
            cart_item: {
              id: "cart-008",
              product: {
                id: "prod-008",
                name: "Portable Speaker",
                price: 7500,
                variant: "Blue, Bluetooth 5.0",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 7500,
            status: "out_for_delivery",
            is_shipped: true,
            is_processed: true,
            shipping_method: "Express Shipping",
            tracking_number: "TRK-3456789012",
            estimated_delivery: "2024-01-22",
            created_at: "2024-01-22T08:15:00Z",
            shipping_status: "out_for_delivery"
          }
        ]
      },
      {
        order_id: "ORD-2024-00129",
        user: {
          id: "demo-customer-129",
          username: "tom_buyer",
          email: "tom.buyer@example.com",
          first_name: "Tom",
          last_name: "Buyer",
          phone: "+639888901234"
        },
        status: "cancelled",
        total_amount: 15000,
        payment_method: null,
        delivery_address: "444 Cancel St, Paranaque, Philippines",
        created_at: "2024-01-23T14:00:00Z",
        updated_at: "2024-01-23T15:30:00Z",
        items: [
          {
            id: "item-009",
            cart_item: {
              id: "cart-009",
              product: {
                id: "prod-009",
                name: "Tablet Mini",
                price: 15000,
                variant: "64GB, WiFi",
                shop: {
                  id: "shop-001",
                  name: "TechGadgets Store"
                }
              },
              quantity: 1
            },
            quantity: 1,
            total_amount: 15000,
            status: "cancelled",
            is_shipped: false,
            is_processed: false,
            created_at: "2024-01-23T14:00:00Z",
            shipping_status: "cancelled"
          }
        ]
      }
    ]
  };
}

const EmptyState = ({ message = "No orders" }: { message?: string }) => (
  <div className="text-center py-6">
    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 mb-2" />
    <p className="text-gray-500 text-sm">{message}</p>
  </div>
);

const TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'to_ship', label: 'To Ship', icon: Package2 },
  { id: 'in_transit', label: 'In Transit', icon: Truck },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckSquare },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle }
];

const TO_SHIP_SUBTABS = [
  { id: 'all_to_ship', label: 'All', icon: Package2 },
  { id: 'pending_shipment', label: 'To Process', icon: Loader2 },
  { id: 'to_ship', label: 'Processed', icon: CheckSquare },
  { id: 'shipped', label: 'Shipped', icon: Ship }
];

export default function SellerOrderList({ loaderData }: Route.ComponentProps) {
  const { user, orders } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [toShipSubTab, setToShipSubTab] = useState<string>('all_to_ship');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const formatCustomerName = (user: { first_name: string; last_name: string }) => {
    return `${user.first_name} ${user.last_name}`;
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'pending_shipment': return '#f59e0b';
      case 'to_ship': return '#f97316';
      case 'shipped': return '#3b82f6';
      case 'in_transit': return '#3b82f6';
      case 'out_for_delivery': return '#8b5cf6';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'pending_shipment': return <Clock className="w-3 h-3" />;
      case 'to_ship': return <Package2 className="w-3 h-3" />;
      case 'shipped': return <Ship className="w-3 h-3" />;
      case 'in_transit': return <Truck className="w-3 h-3" />;
      case 'out_for_delivery': return <Truck className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'pending_shipment': return 'Pending Shipment';
      case 'to_ship': return 'To Ship';
      case 'shipped': return 'Shipped';
      case 'in_transit': return 'In Transit';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status?.replace(/_/g, ' ') || 'Unknown';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders.filter(order => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const customerName = formatCustomerName(order.user).toLowerCase();
      
      return (
        customerName.includes(searchLower) ||
        order.order_id.toLowerCase().includes(searchLower) ||
        order.user.email.toLowerCase().includes(searchLower) ||
        order.items.some(item => 
          item.cart_item?.product?.name?.toLowerCase().includes(searchLower)
        )
      );
    });

    if (activeTab !== 'all') {
      if (activeTab === 'to_ship') {
        filtered = filtered.filter(order => 
          order.status === 'pending_shipment' || 
          order.status === 'to_ship' || 
          order.status === 'shipped'
        );

        if (toShipSubTab === 'pending_shipment') {
          filtered = filtered.filter(order => order.status === 'pending_shipment');
        } else if (toShipSubTab === 'to_ship') {
          filtered = filtered.filter(order => order.status === 'to_ship');
        } else if (toShipSubTab === 'shipped') {
          filtered = filtered.filter(order => order.status === 'shipped');
        }
      } else {
        filtered = filtered.filter(order => order.status === activeTab);
      }
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const counts = {
    all: orders.length,
    to_ship: orders.filter(o => ['pending_shipment', 'to_ship', 'shipped'].includes(o.status)).length,
    pending_shipment: orders.filter(o => o.status === 'pending_shipment').length,
    to_ship_status: orders.filter(o => o.status === 'to_ship').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    in_transit: orders.filter(o => o.status === 'in_transit').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  const getPaymentIcon = (method: string | null) => {
    if (!method) return <CreditCard className="w-3 h-3" />;
    switch(method.toLowerCase()) {
      case 'credit card':
      case 'debit card':
        return <CreditCard className="w-3 h-3" />;
      case 'gcash':
        return <Phone className="w-3 h-3" />;
      case 'bank transfer':
        return <CreditCard className="w-3 h-3" />;
      default:
        return <CreditCard className="w-3 h-3" />;
    }
  };

  const getActionButton = (order: Order) => {
    const status = order.status;
    const orderId = order.order_id;
    const primaryItem = order.items[0];
    
    switch(status) {
      case 'pending_shipment':
        return (
          <Button
            size="sm"
            onClick={() => alert(`Confirming order ${orderId}`)}
            className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirm Order
          </Button>
        );
      case 'to_ship':
        return (
          <Link to={`/arrange-shipment?orderId=${orderId}`}>
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
            >
              <Ship className="w-3 h-3 mr-1" />
              Arrange Shipment
            </Button>
          </Link>
        );
      case 'shipped':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert(`Printing waybill for ${orderId}`)}
            className="h-7 px-2 text-xs"
          >
            <Printer className="w-3 h-3 mr-1" />
            Print Waybill
          </Button>
        );
      case 'in_transit':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const trackingNum = (primaryItem as OrderItem)?.tracking_number;
              if (trackingNum) {
                alert(`Tracking ${orderId}: ${trackingNum}`);
              } else {
                alert(`No tracking number available for ${orderId}`);
              }
            }}
            className="h-7 px-2 text-xs"
          >
            <Truck className="w-3 h-3 mr-1" />
            Track Order
          </Button>
        );
      case 'out_for_delivery':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert(`Order ${orderId} is out for delivery`)}
            className="h-7 px-2 text-xs"
          >
            <Truck className="w-3 h-3 mr-1" />
            Delivery Status
          </Button>
        );
      case 'completed':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => alert(`Viewing completed order ${orderId}`)}
            className="h-7 px-2 text-xs text-gray-600"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            View Details
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Orders</h1>
            <p className="text-gray-500 text-xs">Manage customer orders</p>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm h-8"
            />
          </div>

          {/* Main Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = counts[tab.id as keyof typeof counts] || 0;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'to_ship') setToShipSubTab('all_to_ship');
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1 py-0.5 rounded ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* To Ship Subtabs */}
          {activeTab === 'to_ship' && (
            <div className="bg-gray-50 p-2 rounded mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Package2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-medium">To Ship Orders</span>
                </div>
                <span className="text-xs text-gray-500">
                  {counts.pending_shipment} to process • {counts.to_ship_status} processed • {counts.shipped} shipped
                </span>
              </div>
              <div className="flex space-x-1 overflow-x-auto">
                {TO_SHIP_SUBTABS.map((subtab) => {
                  const Icon = subtab.icon;
                  const isActive = toShipSubTab === subtab.id;
                  const count = counts[subtab.id as keyof typeof counts] || 0;
                  
                  return (
                    <button
                      key={subtab.id}
                      onClick={() => setToShipSubTab(subtab.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap ${
                        isActive 
                          ? 'bg-white text-blue-600 border border-blue-200' 
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{subtab.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders List */}
          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <EmptyState 
                message={
                  activeTab === 'to_ship' ? (
                    toShipSubTab === 'pending_shipment' ? 'No orders to process' :
                    toShipSubTab === 'to_ship' ? 'No processed orders ready to ship' :
                    toShipSubTab === 'shipped' ? 'No shipped orders' :
                    'No orders to ship'
                  ) :
                  activeTab === 'in_transit' ? 'No orders in transit' :
                  activeTab === 'out_for_delivery' ? 'No orders out for delivery' :
                  activeTab === 'completed' ? 'No completed orders' :
                  activeTab === 'cancelled' ? 'No cancelled orders' :
                  'No orders yet'
                }
              />
            ) : (
              filteredOrders.map((order) => {
                const customerName = formatCustomerName(order.user);
                const primaryItem = order.items[0];
                const isExpanded = expandedOrders.has(order.order_id);
                const statusColor = getStatusColor(order.status);
                
                return (
                  <Card key={order.order_id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Order Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{order.order_id}</span>
                            <span>•</span>
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            className="text-xs h-5 px-2 py-0 flex items-center gap-1"
                            style={{ 
                              backgroundColor: `${statusColor}15`, 
                              color: statusColor 
                            }}
                          >
                            {getStatusIcon(order.status)}
                            {getStatusLabel(order.status)}
                          </Badge>
                          <button 
                            onClick={() => toggleOrderExpansion(order.order_id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Middle Section - Order Summary */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Package className="w-3 h-3" />
                          <span className="truncate">
                            {primaryItem?.cart_item?.product?.name}
                            {order.items.length > 1 && ` +${order.items.length - 1} more`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            {getPaymentIcon(order.payment_method)}
                            <span>{order.payment_method || 'Payment pending'}</span>
                          </div>
                          <div className="font-medium text-sm">
                            <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                            {order.total_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section - Product Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          {/* Customer Information */}
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">Customer Information</div>
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1 text-gray-600">
                                <User className="w-3 h-3" />
                                <span>{customerName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-600">
                                <CreditCard className="w-3 h-3" />
                                <span>{order.user.email}</span>
                              </div>
                              {order.user.phone && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  <span>{order.user.phone}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-1 text-gray-600">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{order.delivery_address}</span>
                              </div>
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">Order Details</div>
                            <div className="text-xs space-y-1 text-gray-600">
                              <div>Order ID: {order.order_id}</div>
                              <div>Order Date: {formatDateTime(order.created_at)}</div>
                              <div>Last Updated: {formatDateTime(order.updated_at)}</div>
                            </div>
                          </div>

                          {/* Products */}
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">Products</div>
                            <div className="space-y-2">
                              {order.items.map((item, index) => (
                                <div key={item.id} className="text-xs">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {item.cart_item.product.name}
                                      </div>
                                      {item.cart_item.product.variant && (
                                        <div className="text-gray-500 mt-0.5">
                                          Variant: {item.cart_item.product.variant}
                                        </div>
                                      )}
                                      <div className="text-gray-600 mt-0.5">
                                        Quantity: {item.quantity} × 
                                        <span className="ml-1">
                                          <PhilippinePeso className="inline w-2.5 h-2.5 mr-0.5" />
                                          {item.cart_item.product.price.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="font-medium ml-2">
                                      <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                                      {item.total_amount.toLocaleString()}
                                    </div>
                                  </div>
                                  {index < order.items.length - 1 && <hr className="my-2 border-gray-100" />}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipping Info (if available) */}
                          {(order.status === 'shipped' || order.status === 'in_transit' || order.status === 'out_for_delivery') && 
                           (primaryItem as OrderItem)?.tracking_number && (
                            <div className="mb-3 p-2 bg-blue-50 rounded text-xs">
                              <div className="flex items-center gap-1 text-blue-700 mb-1">
                                <Truck className="w-3 h-3" />
                                <span className="font-medium">Shipping Information</span>
                              </div>
                              {(primaryItem as OrderItem).shipping_method && (
                                <div className="text-blue-600 mb-0.5">
                                  Method: {(primaryItem as OrderItem).shipping_method}
                                </div>
                              )}
                              <div className="text-blue-600">
                                Tracking Number: {(primaryItem as OrderItem).tracking_number}
                              </div>
                              {(primaryItem as OrderItem).estimated_delivery && (
                                <div className="text-blue-600 mt-0.5">
                                  Estimated Delivery: {(primaryItem as OrderItem).estimated_delivery}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => alert(`Viewing details for ${order.order_id}`)}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        
                        <div className="flex gap-1">
                          {getActionButton(order)}
                          
                          {/* Additional Waybill button for shipped orders */}
                          {order.status === 'shipped' && order.items.some(item => (item as OrderItem).waybill_url) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => alert(`Viewing waybill for ${order.order_id}`)}
                              className="h-6 px-2 text-xs"
                            >
                              <Printer className="w-3 h-3 mr-1" />
                              View Waybill
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}