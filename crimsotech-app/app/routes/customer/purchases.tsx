"use client";

import type { Route } from './+types/purchases';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { 
  Card, 
  CardContent
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Clock,
  Package,
  Calendar,
  PhilippinePeso,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCcw,
  List,
  RotateCcw,
  User,
  Truck,
  MessageCircle,
  CreditCard,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Tag,
  Store,
  MapPin,
  CalendarDays,
  ShoppingCart,
  Truck as ShippingIcon,
  PackageCheck,
  Handshake,
  ShieldAlert,
  CheckSquare
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Purchases",
    },
  ];
}

interface PurchaseItem {
  id: string;
  order: {
    order_id: string;
    total_amount: number;
    created_at: string;
  };
  product_name: string;
  shop_name: string;
  color: string;
  quantity: number;
  status: 'pending' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'return_refund' | 'in_progress';
  purchased_at: string;
  tracking_number?: string;
  image: string;
  reason?: string;
  refund_request_id?: string; // Add this field
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  
  

  const purchaseItems: PurchaseItem[] = [
    {
      id: "PUR-2024-00123",
      order: {
        order_id: "ORD-2024-00123",
        total_amount: 45000,
        created_at: "2024-01-20T08:30:00Z"
      },
      product_name: "Apple iPhone 13 Pro",
      shop_name: "TechWorld Shop",
      color: "Black",
      quantity: 1,
      status: "in_progress",
      purchased_at: "2024-01-20T10:30:00Z",
      image: "/phon.jpg"
    },
    {
      id: "PUR-2024-00124",
      order: {
        order_id: "ORD-2024-00124",
        total_amount: 12000,
        created_at: "2024-01-19T12:20:00Z"
      },
      product_name: "Samsung Galaxy Watch 4",
      shop_name: "TechWorld Shop",
      color: "White",
      quantity: 2,
      status: "completed",
      purchased_at: "2024-01-19T14:20:00Z",
      tracking_number: "TRK-789012",
      image: "/controller.jpg"
    },
    {
      id: "PUR-2024-00125",
      order: {
        order_id: "ORD-2024-00125",
        total_amount: 32000,
        created_at: "2024-01-15T08:15:00Z"
      },
      product_name: "MacBook Air M1",
      shop_name: "GadgetHub",
      color: "Gray",
      quantity: 1,
      status: "completed",
      purchased_at: "2024-01-15T09:15:00Z",
      image: "/power_supply.jpg"
    },
    {
      id: "PUR-2024-00126",
      order: {
        order_id: "ORD-2024-00126",
        total_amount: 8500,
        created_at: "2024-01-18T10:30:00Z"
      },
      product_name: "Wireless Headphones",
      shop_name: "GadgetHub",
      color: "Black",
      quantity: 1,
      status: "to_ship",
      purchased_at: "2024-01-18T11:30:00Z",
      image: "/phon.jpg"
    },
    {
      id: "PUR-2024-00127",
      order: {
        order_id: "ORD-2024-00127",
        total_amount: 1000,
        created_at: "2024-01-22T07:45:00Z"
      },
      product_name: "USB-C Cable",
      shop_name: "AccessoryStore",
      color: "Silver",
      quantity: 1,
      status: "cancelled",
      purchased_at: "2024-01-22T08:45:00Z",
      reason: "Out of stock",
      image: "/phon.jpg"
    },
    {
      id: "PUR-2024-00128",
      order: {
        order_id: "ORD-2024-00128",
        total_amount: 25000,
        created_at: "2024-01-23T14:30:00Z"
      },
      product_name: "Smartwatch",
      shop_name: "GadgetHub",
      color: "Black",
      quantity: 1,
      status: "to_receive",
      purchased_at: "2024-01-23T16:30:00Z",
      tracking_number: "TRK-123456",
      image: "/phon.jpg"
    },
    {
      id: "PUR-2024-00129",
      order: {
        order_id: "ORD-2024-00129",
        total_amount: 15000,
        created_at: "2024-01-24T09:15:00Z"
      },
      product_name: "Digital Camera",
      shop_name: "AccessoryStore",
      color: "Black",
      quantity: 1,
      status: "pending",
      purchased_at: "2024-01-24T11:15:00Z",
      image: "/phon.jpg"
    },
    {
      id: "PUR-2024-00130",
      order: {
        order_id: "ORD-2024-00130",
        total_amount: 8000,
        created_at: "2024-01-25T13:45:00Z"
      },
      product_name: "Bluetooth Speaker",
      shop_name: "TechWorld Shop",
      color: "Blue",
      quantity: 1,
      status: "return_refund",
      purchased_at: "2024-01-25T15:45:00Z",
      tracking_number: "TRK-RET-567890",
      reason: "Product defective",
      image: "/phon.jpg"
    }
  ];

  return {
    user: {
      id: "demo-customer-123",
      name: "John Customer",
      email: "customer@example.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: false,
      username: "john_customer",
    },
    purchaseItems
  };
}

// Tabs configuration - EXACTLY like return/refund page
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'in_progress', label: 'In Progress', icon: Clock },
  { id: 'to_ship', label: 'To Ship', icon: Package },
  { id: 'to_receive', label: 'To Receive', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'return_refund', label: 'Return & Refund', icon: RefreshCcw },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle }
];

// Status badges configuration - EXACTLY like return/refund page
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800',
    icon: Clock
  },
  to_ship: { 
    label: 'To Ship', 
    color: 'bg-indigo-100 text-indigo-800',
    icon: Package
  },
  to_receive: { 
    label: 'To Receive', 
    color: 'bg-blue-100 text-blue-800',
    icon: Truck
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  return_refund: { 
    label: 'Return & Refund', 
    color: 'bg-orange-100 text-orange-800',
    icon: RefreshCcw
  }
};

export default function Purchases({ loaderData }: Route.ComponentProps) {
  const { user, purchaseItems } = loaderData;
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Filter purchase items based on active tab
  const getFilteredPurchaseItems = () => {
    let filtered = purchaseItems;
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        item.order.order_id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply tab filter
    if (activeTab === 'all') {
      return filtered;
    } else {
      return filtered.filter(item => item.status === activeTab);
    }
  };

  const filteredPurchaseItems = getFilteredPurchaseItems();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge 
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return purchaseItems.length;
    return purchaseItems.filter(item => item.status === tabId).length;
  };

  const togglePurchaseExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedPurchases(newExpanded);
  };

  const getActionButtons = (item: PurchaseItem) => {
    switch(item.status) {
      case 'to_receive':
        return (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Track Order"
              onClick={() => navigate(`/track-order/${item.id}`)}
            >
              <Truck className="w-3 h-3" />
            </Button>
          </>
        );
      case 'completed':
        return (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Rate Product"
              onClick={() => navigate(`/rate/${item.id}`)}
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
          </>
        );
      case 'pending':
      case 'in_progress':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Cancel Order"
            onClick={() => navigate(`/cancel-order/${item.id}`)}
          >
            <XCircle className="w-3 h-3" />
          </Button>
        );
      case 'to_ship':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="View Shipping"
            onClick={() => navigate(`/shipping/${item.id}`)}
          >
            <ShippingIcon className="w-3 h-3" />
          </Button>
        );
      // In the getActionButtons function, update the return_refund case:
      case 'return_refund':
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
      title="View Refund"
      onClick={() => navigate(`/customer-view-refund-request/${item.refund_request_id || item.id}?status=approved`)}
    >
      <RefreshCcw className="w-3 h-3" />
    </Button>
  );
      case 'cancelled':
        
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            title="View Details"
            onClick={() => navigate(`/cancelled/${item.id}`)}
          >
            <FileText className="w-3 h-3" />
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
          {/* Header - EXACTLY like return/refund page */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Your Purchases</h1>
            <p className="text-gray-500 text-xs">Manage your purchased items and orders</p>
          </div>

          {/* Search Bar - Added like in your purchases page */}
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                type="text"
                placeholder="Search purchases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
          </div>

          {/* Status Tabs - EXACTLY like return/refund page */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

          {/* Purchases List - EXACTLY like return/refund page */}
          <div className="space-y-2">
            {filteredPurchaseItems.length === 0 ? (
              <div className="text-center py-4">
                <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {activeTab === 'all' ? 'No purchases found' :
                   activeTab === 'pending' ? 'No pending purchases' :
                   activeTab === 'in_progress' ? 'No in progress purchases' :
                   activeTab === 'to_ship' ? 'No items to ship' :
                   activeTab === 'to_receive' ? 'No items to receive' :
                   activeTab === 'completed' ? 'No completed purchases' :
                   activeTab === 'return_refund' ? 'No return & refund requests' :
                   'No cancelled purchases'}
                </p>
              </div>
            ) : (
              filteredPurchaseItems.map((item) => {
                const isExpanded = expandedPurchases.has(item.id);
                
                return (
                  <Card key={item.id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header - EXACTLY like return/refund page */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{item.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{item.id}</span>
                            <span>•</span>
                            <span>{formatDate(item.purchased_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(item.status)}
                          <button 
                            onClick={() => togglePurchaseExpansion(item.id)}
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

                      {/* Middle Section - Summary */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Store className="w-3 h-3" />
                          <span className="truncate">{item.shop_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1 truncate">
                          Variation: {item.color} • Qty: {item.quantity}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            {item.order.order_id}
                          </div>
                          <div className="font-medium text-sm">
                            <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                            {item.order.total_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="my-2">
                        <img 
                          src={item.image} 
                          alt={item.product_name} 
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                      </div>

                      {/* Expanded Section - Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-2">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Order Details</div>
                              <div className="text-gray-600 space-y-1">
                                <div>Order ID: {item.order.order_id}</div>
                                <div>Order Date: {formatDate(item.order.created_at)}</div>
                                <div>Purchase Date: {formatDate(item.purchased_at)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Product Details</div>
                              <div className="text-gray-600">
                                {item.product_name} ({item.color})
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Shop</div>
                              <div className="text-gray-600">
                                {item.shop_name}
                              </div>
                            </div>
                            
                            {item.tracking_number && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Tracking</div>
                                <div className="text-gray-600">
                                  {item.tracking_number}
                                </div>
                              </div>
                            )}
                            
                            {item.reason && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Reason</div>
                                <div className="text-gray-600">
                                  {item.reason}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        {/* View Order Button - navigates to /view-order/{id}?status={status} */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/view-order/${item.id}?status=${item.status}`)}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Order
                        </Button>
                        
                        <div className="flex gap-1">
                          {getActionButtons(item)}
                          
                          {/* Contact Seller button for all statuses except completed and cancelled */}
                          {item.status !== 'completed' && item.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Contact Seller"
                              onClick={() => navigate(`/chat/seller/${item.shop_name}`)}
                            >
                              <MessageCircle className="w-3 h-3" />
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