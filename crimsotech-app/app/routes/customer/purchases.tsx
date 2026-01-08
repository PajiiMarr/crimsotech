"use client";

import type { Route } from './+types/purchases';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
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
  Eye,
  CheckCircle,
  XCircle,
  RefreshCcw,
  List,
  User,
  Truck,
  MessageCircle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Store,
  PackageCheck,
  ShieldAlert,
  CheckSquare,
  Tag,
  MapPin,
  CalendarDays,
  ShoppingCart
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';

// Define interfaces based on backend response
interface OrderItem {
  checkout_id: string;
  cart_item_id: string | null;
  product_id: string;
  product_name: string;
  shop_id: string | null;
  shop_name: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks: string;
  purchased_at: string;
  voucher_applied: {
    id: string;
    name: string;
    code: string;
  } | null;
  can_review: boolean;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  payment_status: string | null;
  delivery_status: string | null;
  delivery_rider: string | null;
  items: OrderItem[];
}

interface PurchasesResponse {
  user_id: string;
  username: string;
  total_purchases: number;
  purchases: PurchaseOrder[];
}

interface PurchaseItem {
  id: string;
  order_id: string;
  product_name: string;
  shop_name: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'return_refund' | 'ready_for_pickup';
  purchased_at: string;
  total_amount: number;
  image: string;
  reason?: string;
  refund_request_id?: string;
  order: PurchaseOrder;
  item?: OrderItem;
}

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Purchases",
    },
  ];
}

// Tabs configuration
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'in_progress', label: 'In Progress', icon: Clock },
  { id: 'to_ship', label: 'To Ship', icon: Package },
  { id: 'ready_for_pickup', label: 'To Pickup', icon: Package },
  { id: 'to_receive', label: 'To Receive', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'return_refund', label: 'Return & Refund', icon: RefreshCcw },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle }
];

// Status badges configuration
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
  ready_for_pickup: { 
    label: 'To Pickup', 
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

// Helper function to map backend status to frontend status
const mapStatus = (backendStatus: string): PurchaseItem['status'] => {
  switch(backendStatus) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'in_progress';
    case 'shipped':
      return 'to_ship';
    case 'ready_for_pickup':
      return 'ready_for_pickup';
    case 'shipped':
      return 'to_ship';
    case 'delivered':
      return 'completed';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'return_refund';
    // Add more mappings as needed
    default:
      return 'pending';
  }
};

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

  console.log(user?.user_id)

  try {
    // Fetch purchases from backend
    const response = await AxiosInstance.get<PurchasesResponse>('/purchases-buyer/user_purchases/', {
      headers: {
        'X-User-Id': user?.user_id || ''
      }
    });

    const purchasesData = response.data;

    // Transform backend data to frontend format
    const purchaseItems: PurchaseItem[] = [];

    purchasesData.purchases.forEach((order: PurchaseOrder) => {
      if (order.items && order.items.length > 0) {
        // Create one PurchaseItem per product in the order
        order.items.forEach((item: OrderItem, index: number) => {
          const purchaseItem: PurchaseItem = {
            id: `${order.order_id}-${index}`,
            order_id: order.order_id,
            product_name: item.product_name,
            shop_name: item.shop_name || 'Unknown Shop',
            quantity: item.quantity,
            status: mapStatus(item.status),
            purchased_at: item.purchased_at,
            total_amount: parseFloat(item.subtotal),
            image: '/phon.jpg', // Default image - you might want to fetch product images
            order: order,
            item: item
          };

          // Add reason for cancelled or return/refund items
          if (item.status === 'cancelled' && item.remarks) {
            purchaseItem.reason = item.remarks;
          }

          purchaseItems.push(purchaseItem);
        });
      } else {
        // If order has no items, still create a purchase item with order info
        const purchaseItem: PurchaseItem = {
          id: order.order_id,
          order_id: order.order_id,
          product_name: 'No products',
          shop_name: 'N/A',
          quantity: 0,
          status: mapStatus(order.status),
          purchased_at: order.created_at,
          total_amount: parseFloat(order.total_amount),
          image: '/phon.jpg',
          order: order
        };
        purchaseItems.push(purchaseItem);
      }
    });

    return {
      user: {
        id: purchasesData.user_id,
        name: purchasesData.username,
        username: purchasesData.username,
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isSeller: false,
      },
      purchaseItems,
      rawPurchases: purchasesData // Keep raw data for reference
    };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    
    // Return empty data on error
    return {
      user: {
        id: user?.user_id || '',
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isSeller: false,
      },
      purchaseItems: [],
      rawPurchases: null
    };
  }
}

export default function Purchases({ loaderData }: Route.ComponentProps) {
  const { user, purchaseItems } = loaderData;
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<PurchaseItem[]>(purchaseItems);

  useEffect(() => {
    // Apply filters whenever search or activeTab changes
    let filtered = purchaseItems;
    
    if (search) {
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        item.order_id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.status === activeTab);
    }
    
    setFilteredItems(filtered);
  }, [search, activeTab, purchaseItems]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
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

  const togglePurchaseExpansion = (purchaseId: string) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId);
    } else {
      newExpanded.add(purchaseId);
    }
    setExpandedPurchases(newExpanded);
  };

  const getActionButtons = (item: PurchaseItem) => {
    switch(item.status) {
      case 'to_receive':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Track Order"
            onClick={() => navigate(`/track-order/${item.id}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
        );
      case 'completed':
        // Show Rate button either when item reports it's reviewable or when the overall order status is completed
        if (item.item?.can_review || item.order?.status === 'completed') {
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Rate Product"
              onClick={() => navigate(`/product-rate?productId=${item.item?.product_id}`)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              <span className="text-xs">Rate</span>
            </Button>
          );
        }
        return null;
      case 'pending':
      case 'in_progress':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Cancel Order"
            onClick={() => navigate(`/cancel-order/${item.order_id}?item_id=${item.id}`)}
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
            onClick={() => navigate(`/shipping/${item.order_id}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
        );
      case 'return_refund':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title="View Refund"
            onClick={() => navigate(`/customer-view-refund-request/${item.order_id}`)}
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
            onClick={() => navigate(`/cancelled/${item.order_id}`)}
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
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Your Purchases</h1>
            <p className="text-gray-500 text-xs">Manage your purchased items and orders</p>
          </div>

          {/* Search Bar */}
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

          {/* Status Tabs */}
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

          {/* Purchases List */}
          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-4">
                <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {activeTab === 'all' ? 'No purchases found' :
                   activeTab === 'pending' ? 'No pending purchases' :
                   activeTab === 'in_progress' ? 'No in progress purchases' :
                   activeTab === 'to_ship' ? 'No items to ship' :
                   activeTab === 'ready_for_pickup' ? 'No items to pickup' :
                   activeTab === 'to_receive' ? 'No items to receive' :
                   activeTab === 'completed' ? 'No completed purchases' :
                   activeTab === 'return_refund' ? 'No return & refund requests' :
                   'No cancelled purchases'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedPurchases.has(item.id);
                
                return (
                  <Card key={item.id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{item.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{item.order_id}</span>
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
                          Qty: {item.quantity}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            {item.order.payment_method}
                          </div>
                          <div className="font-medium text-sm">
                            ₱{item.total_amount.toLocaleString()}
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
                      {isExpanded && item.order && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-2">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Order Details</div>
                              <div className="text-gray-600 space-y-1">
                                <div>Order ID: {item.order_id}</div>
                                <div>Order Date: {formatDate(item.order.created_at)}</div>
                                <div>Status: {item.order.status}</div>
                                <div>Payment Method: {item.order.payment_method}</div>
                                {item.order.delivery_method && (
                                  <div>Delivery Method: {item.order.delivery_method}</div>
                                )}
                                <div>Delivery Address: {item.order.delivery_address}</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Product Details</div>
                              <div className="text-gray-600">
                                {item.product_name}
                              </div>
                            </div>
                            
                            {item.item && item.item.voucher_applied && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Voucher Applied</div>
                                <div className="text-gray-600">
                                  {item.item.voucher_applied.name} ({item.item.voucher_applied.code})
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/view-order/${item.order_id}`)}  // Changed this line
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Order
                        </Button>
                        
                        <div className="flex gap-1">
                          {getActionButtons(item)}
                          
                          {/* Contact Seller button */}
                          {item.status !== 'completed' && item.status !== 'cancelled' && item.shop_name !== 'N/A' && (
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