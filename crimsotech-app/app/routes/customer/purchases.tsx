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
  ClipboardList,
  Clock,
  Truck,
  MessageSquare,
  Undo2,
  Package,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCcw,
  List,
  User,
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
  status: string; // This should match order.status from backend
  remarks: string;
  purchased_at: string;
  voucher_applied: {
    id: string;
    name: string;
    code: string;
  } | null;
  can_review: boolean;
  is_refundable: boolean;
  primary_image?: {
    url: string;
    file_type: string;
  } | null;
  product_images?: Array<{
    url: string;
    file_type: string;
  }>;
}

interface PurchaseOrder {
  order_id: string;
  status: string; // Order status from Order model
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  completed_at: string | null;
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
  product_id: string;
  product_name: string;
  shop_name: string;
  shop_id: string | null;
  quantity: number;
  status: 'pending' | 'in_progress' | 'to_ship' | 'to_receive' | 'delivered' | 'completed' | 'cancelled' | 'return_refund' | 'ready_for_pickup' | 'picked_up';
  purchased_at: string;
  total_amount: number;
  image: string;
  reason?: string;
  refund_request_id?: string;
  order: PurchaseOrder;
  item?: OrderItem;
  is_refundable: boolean;
  can_review: boolean;
}

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Purchases",
    },
  ];
}

// Updated Tabs configuration to match mobile (5 tabs)
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: ClipboardList },
  { id: 'processing', label: 'Processing', icon: Clock },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'rate', label: 'Rate', icon: MessageSquare },
  { id: 'returns', label: 'Returns', icon: Undo2 }
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
  delivered: {
    label: 'Delivered',
    color: 'bg-teal-100 text-teal-800',
    icon: PackageCheck
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
  // Normalize input to avoid mismatches from casing or stray whitespace
  const normalized = (backendStatus || '').toString().trim().toLowerCase();

  switch (normalized) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'in_progress';
    case 'shipped':
      return 'to_ship';
    case 'ready_for_pickup':
      return 'ready_for_pickup';
    case 'picked_up':
      return 'picked_up';
    case 'delivered':
      return 'delivered'; // Show delivered UI separately from to_receive
    case 'completed':
      return 'completed'; // This will show completed UI in view-order
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'return_refund';
    default:
      console.warn(`Unknown status: ${backendStatus}, defaulting to pending`);
      return 'pending';
  }
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

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
      console.log(`Processing order ${order.order_id} with status: ${order.status}`);
      
      if (order.items && order.items.length > 0) {
        // Create one PurchaseItem per product in the order
        order.items.forEach((item: OrderItem, index: number) => {
          console.log(`Item ${index} has status: ${item.status}, order status: ${order.status}`);
          
          // Use ORDER status as the primary status (item.status should match order.status from backend)
          const statusToUse = item.status || order.status || 'pending';
          const mappedStatus = mapStatus(statusToUse);
          
          // Get image URL from backend or use default
          const imageUrl = item.primary_image?.url || 
                          (item.product_images && item.product_images[0]?.url) || 
                          '/phon.jpg';
          
          const purchaseItem: PurchaseItem = {
            id: `${order.order_id}-${index}`,
            order_id: order.order_id,
            product_id: item.product_id,
            product_name: item.product_name,
            shop_name: item.shop_name || 'Unknown Shop',
            shop_id: item.shop_id,
            quantity: item.quantity,
            status: mappedStatus,
            purchased_at: item.purchased_at,
            total_amount: parseFloat(item.subtotal),
            image: imageUrl,
            order: order,
            item: item,
            is_refundable: item.is_refundable || false,
            can_review: item.can_review || false
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
          product_id: 'no-product',
          product_name: 'No products available',
          shop_name: 'N/A',
          shop_id: null,
          quantity: 0,
          status: mapStatus(order.status),
          purchased_at: order.created_at,
          total_amount: parseFloat(order.total_amount),
          image: '/phon.jpg',
          order: order,
          is_refundable: false,
          can_review: false
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
      rawPurchases: purchasesData
    };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    
    // Return empty data on error
    return {
      user: {
        id: user?.user_id || '',
        name: user?.name || 'Customer',
        username: user?.username || '',
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
  
  // State for order counts
  const [orderCounts, setOrderCounts] = useState({
    processing: 0,
    shipped: 0,
    rate: 0,
    returns: 0,
    all: purchaseItems.length
  });

  // Calculate order counts based on backend status
  useEffect(() => {
    const counts = {
      processing: 0,
      shipped: 0,
      rate: 0,
      returns: 0,
      all: purchaseItems.length
    };

    purchaseItems.forEach((item) => {
      const status = item.status;
      const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
      const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();

      const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

      // Processing tab:
      // - Non-pickup: pending or in_progress
      // - Pickup (Cash on Pickup + Pickup from Store): pending, in_progress or ready_for_pickup
      if ((status === 'pending' || status === 'in_progress') || (isPickupCash && status === 'ready_for_pickup')) {
        counts.processing++;
      }

      // Shipped tab:
      // Includes shipping flows and pickup completion/picked states
      const rawOrderStatus = (item.order?.status || '').toString().trim().toLowerCase();
      if (
        status === 'to_ship' ||
        status === 'to_receive' ||
        status === 'delivered' ||
        status === 'picked_up' ||
        status === 'completed' ||
        rawOrderStatus === 'delivered'
      ) {
        counts.shipped++;
      }

      // Rate tab (keep showing items eligible for rating regardless of moved tab policy)
      if (status === 'completed' && item.can_review) {
        counts.rate++;
      }

      // Returns tab (cancelled or return_refund)
      if (status === 'cancelled' || status === 'return_refund') {
        counts.returns++;
      }
    });

    setOrderCounts(counts);
  }, [purchaseItems]);

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
      switch (activeTab) {
        case 'processing':
          filtered = filtered.filter(item => {
            const paymentMethod = (item.order.payment_method || '').toString().toLowerCase();
            const deliveryMethod = (item.order.delivery_method || '').toString().toLowerCase();
            const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');

            // For pickup orders using Cash on Pickup + Pickup from Store, include ready_for_pickup in processing
            if (isPickupCash) {
              return item.status === 'pending' || item.status === 'in_progress' || item.status === 'ready_for_pickup';
            }

            return item.status === 'pending' || item.status === 'in_progress';
          });
          break;
        case 'shipped':
          filtered = filtered.filter(item => {
            const rawOrderStatus = (item.order?.status || '').toString().trim().toLowerCase();

            return (
              item.status === 'to_ship' ||
              item.status === 'to_receive' ||
              item.status === 'delivered' ||
              item.status === 'picked_up' ||
              item.status === 'completed' ||
              rawOrderStatus === 'delivered'
            );
          });
          break;
        case 'rate':
          // Show completed items that can be rated (keep this as a separate view for ratings)
          filtered = filtered.filter(item => 
            item.status === 'completed' && item.can_review
          );
          break;
        case 'returns':
          filtered = filtered.filter(item => 
            item.status === 'cancelled' || item.status === 'return_refund'
          );
          break;
        default:
          break;
      }
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

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
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
    switch (tabId) {
      case 'all':
        return orderCounts.all;
      case 'processing':
        return orderCounts.processing;
      case 'shipped':
        return orderCounts.shipped;
      case 'rate':
        return orderCounts.rate;
      case 'returns':
        return orderCounts.returns;
      default:
        return 0;
    }
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
    const status = item.status;
    
    // Processing items (pending/in_progress) - Show Cancel button
    if (status === 'pending' || status === 'in_progress') {
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
    }
    
    // Shipped items (to_ship) - Show Track button
    if (status === 'to_ship') {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="Track Order"
          onClick={() => navigate(`/track-order/${item.order_id}`)}
        >
          <Truck className="w-3 h-3" />
        </Button>
      );
    }
    
    // Delivered items (to_receive) - Show Track and Refund buttons
    if (status === 'to_receive') {
      return (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Track Order"
            onClick={() => navigate(`/track-order/${item.order_id}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
          {item.is_refundable && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Request Refund"
              onClick={() => navigate(`/request-refund-return/${item.order_id}?product_id=${item.product_id}`)}
            >
              <RefreshCcw className="w-3 h-3 mr-1" />
              <span className="text-xs">Refund</span>
            </Button>
          )}
        </>
      );
    }

    // Delivered items (delivered) - same UI as to_receive but separate status
    if (status === 'delivered') {
      return (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Track Order"
            onClick={() => navigate(`/track-order/${item.order_id}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
          {item.is_refundable && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Request Refund"
              onClick={() => navigate(`/request-refund-return/${item.order_id}?product_id=${item.product_id}`)}
            >
              <RefreshCcw className="w-3 h-3 mr-1" />
              <span className="text-xs">Refund</span>
            </Button>
          )}
        </>
      );
    }
    
    // Completed items - Show Rate button if applicable
    if (status === 'completed') {
      if (item.can_review) {
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Rate Product"
            onClick={() => navigate(`/product-rate?productId=${item.product_id}&orderId=${item.order_id}`)}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            <span className="text-xs">Rate</span>
          </Button>
        );
      }
    }
    
    // Returns items - Show Details button
    if (status === 'cancelled' || status === 'return_refund') {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          title="View Details"
          onClick={() => navigate(`/customer-view-refund-request/${item.order_id}`)}
        >
          <Undo2 className="w-3 h-3 mr-1" />
          <span className="text-xs">Details</span>
        </Button>
      );
    }
    
    return null;
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
                   activeTab === 'processing' ? 'No processing orders' :
                   activeTab === 'shipped' ? 'No shipped orders' :
                   activeTab === 'rate' ? 'No orders to rate' :
                   'No returns or refunds'}
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
                          Qty: {item.quantity} • {formatCurrency(item.total_amount)}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            {item.order.payment_method}
                          </div>
                          <div className="font-medium text-sm">
                            {formatCurrency(item.total_amount)}
                          </div>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="my-2">
                        <img 
                          src={item.image} 
                          alt={item.product_name} 
                          className="h-16 w-16 rounded-md object-cover border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/phon.jpg';
                          }}
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
                          onClick={() => navigate(`/view-order/${item.order_id}`)}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Order
                        </Button>
                        
                        <div className="flex gap-1">
                          {getActionButtons(item)}
                          
                          {/* Contact Seller button */}
                          {item.status !== 'completed' && item.status !== 'cancelled' && item.shop_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Contact Seller"
                              onClick={() => navigate(`/chat/seller/${item.shop_id}`)}
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