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
  ShoppingCart,
  CalendarClock,
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';
import { Label } from '~/components/ui/label';

const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return '/phon.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanUrl}`;
};

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
  is_refundable: boolean;
  primary_image?: { url: string; file_type: string; } | null;
  product_images?: Array<{ url: string; file_type: string; }>;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
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
  pickup_date?: string | null;
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
  status: 'pending' | 'in_progress' | 'to_ship' | 'to_receive' | 'delivered' | 'picked_up' | 'completed' | 'cancelled' | 'return_refund' | 'ready_for_pickup';
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
  return [{ title: "Purchases" }];
}

const STATUS_TABS = [
  { id: 'all', label: 'All', icon: ClipboardList },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'processing', label: 'Processing', icon: Clock },
  { id: 'to_pickup', label: 'To Pickup', icon: Store },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'rate', label: 'Rate', icon: MessageSquare },
  { id: 'returns', label: 'Returns', icon: Undo2 }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  to_ship: { label: 'To Ship', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  to_receive: { label: 'To Receive', color: 'bg-blue-100 text-blue-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-teal-100 text-teal-800', icon: PackageCheck },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-blue-100 text-blue-800', icon: Store },
  picked_up: { label: 'Picked Up', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  return_refund: { label: 'Return & Refund', color: 'bg-orange-100 text-orange-800', icon: RefreshCcw }
};

const mapStatus = (backendStatus: string): PurchaseItem['status'] => {
  const normalized = (backendStatus || '').toString().trim().toLowerCase();
  switch (normalized) {
    case 'pending': return 'pending';
    case 'processing': return 'in_progress';
    case 'to_ship': return 'to_ship';
    case 'shipped': return 'to_ship';
    case 'to_receive': return 'to_receive';
    case 'ready_for_pickup': return 'ready_for_pickup';
    case 'picked_up': return 'picked_up';
    case 'delivered': return 'delivered';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'return_refund';
    default:
      console.warn(`Unknown status: ${backendStatus}, defaulting to pending`);
      return 'pending';
  }
};

// Detect Cash on Pickup orders
const isCashOnPickup = (order: PurchaseOrder): boolean => {
  const method = (order.payment_method || '').toLowerCase();
  const delivery = (order.delivery_method || '').toLowerCase();
  return method.includes('cash') && (method.includes('pickup') || delivery.includes('pickup'));
};

// Format a datetime string nicely
const formatPickupDateTime = (dt: string): string => {
  try {
    return new Date(dt).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dt;
  }
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const user = await fetchUserRole({ request, context });
  await requireRole(request, context, ["isCustomer"]);
  const headers: HeadersInit = (context as any).__sessionCookie
    ? { "Set-Cookie": (context as any).__sessionCookie }
    : {};
  const fallback = {
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
    purchaseItems: [] as PurchaseItem[],
    rawPurchases: null as PurchasesResponse | null,
  };
  try {
    const response = await AxiosInstance.get<PurchasesResponse>('/purchases-buyer/user_purchases/', {
      headers: { 'X-User-Id': user?.user_id || '' }
    });
    const purchasesData = response.data;
    const purchaseItems: PurchaseItem[] = [];
    purchasesData.purchases.forEach((order: PurchaseOrder) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: OrderItem, index: number) => {
          const statusToUse = item.status || order.status || 'pending';
          const mappedStatus = mapStatus(statusToUse);
          const rawImageUrl = item.primary_image?.url || (item.product_images && item.product_images[0]?.url);
          const imageUrl = getFullImageUrl(rawImageUrl);
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
          if (item.status === 'cancelled' && item.remarks) {
            purchaseItem.reason = item.remarks;
          }
          purchaseItems.push(purchaseItem);
        });
      } else {
        purchaseItems.push({
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
        });
      }
    });
    return Response.json({
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
      rawPurchases: purchasesData,
    }, { headers });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return Response.json(fallback, { headers });
  }
}

export default function Purchases({ loaderData }: Route.ComponentProps) {
  const { user, purchaseItems } = loaderData as {
    user: {
      id: string; name: string; username: string;
      isCustomer: boolean; isAdmin: boolean; isRider: boolean;
      isModerator: boolean; isSeller: boolean;
    };
    purchaseItems: PurchaseItem[];
    rawPurchases: PurchasesResponse | null;
  };

  const [activeTab, setActiveTab] = useState<string>('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>('all');
  const navigate = useNavigate();
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<PurchaseItem[]>(purchaseItems);
  const [orderCounts, setOrderCounts] = useState({
    pending: 0, processing: 0, to_pickup: 0, shipped: 0, completed: 0, rate: 0, returns: 0, all: purchaseItems.length
  });

  useEffect(() => {
    const counts = { pending: 0, processing: 0, to_pickup: 0, shipped: 0, completed: 0, rate: 0, returns: 0, all: purchaseItems.length };
    purchaseItems.forEach((item) => {
      const status = item.status;
      if (status === 'pending') counts.pending++;
      if (status === 'in_progress') counts.processing++;
      if (status === 'ready_for_pickup') counts.to_pickup++;
      if (status === 'to_ship' || status === 'to_receive' || status === 'delivered') counts.shipped++;
      if (status === 'picked_up' || status === 'completed') counts.completed++;
      if ((status === 'picked_up' || status === 'completed') && item.can_review) counts.rate++;
      if (status === 'cancelled' || status === 'return_refund') counts.returns++;
    });
    setOrderCounts(counts);
  }, [purchaseItems]);

  useEffect(() => {
    let filtered = purchaseItems;
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        item.order_id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply delivery method filter
    if (deliveryMethodFilter !== 'all') {
      filtered = filtered.filter(item => {
        const method = (item.order.delivery_method || '').toLowerCase();
        if (deliveryMethodFilter === 'pickup') {
          return method.includes('pickup') || method.includes('store') || isCashOnPickup(item.order);
        } else if (deliveryMethodFilter === 'delivery') {
          return !method.includes('pickup') && !method.includes('store') && !isCashOnPickup(item.order);
        }
        return true;
      });
    }
    
    // Apply status tab filter
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'pending':
          filtered = filtered.filter(item => item.status === 'pending'); break;
        case 'processing':
          filtered = filtered.filter(item => item.status === 'in_progress'); break;
        case 'to_pickup':
          filtered = filtered.filter(item => item.status === 'ready_for_pickup'); break;
        case 'shipped':
          filtered = filtered.filter(item => 
            item.status === 'to_ship' || item.status === 'to_receive' || item.status === 'delivered'
          ); break;
        case 'completed':
          filtered = filtered.filter(item => 
            item.status === 'picked_up' || item.status === 'completed'
          ); break;
        case 'rate':
          filtered = filtered.filter(item => 
            (item.status === 'picked_up' || item.status === 'completed') && item.can_review
          ); break;
        case 'returns':
          filtered = filtered.filter(item => item.status === 'cancelled' || item.status === 'return_refund'); break;
      }
    }
    setFilteredItems(filtered);
  }, [search, activeTab, deliveryMethodFilter, purchaseItems]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateString; }
  };

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
      { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    return (
      <Badge className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}>
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getTabCount = (tabId: string) =>
    orderCounts[tabId as keyof typeof orderCounts] ?? 0;

  const togglePurchaseExpansion = (purchaseId: string) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(purchaseId)) newExpanded.delete(purchaseId);
    else newExpanded.add(purchaseId);
    setExpandedPurchases(newExpanded);
  };

  const getActionButtons = (item: PurchaseItem) => {
    const status = item.status;
    if (status === 'pending' || status === 'in_progress') {
      return (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Cancel Order" onClick={() => navigate(`/cancel-order/${item.order_id}?item_id=${item.id}`)}>
          <XCircle className="w-3 h-3" />
        </Button>
      );
    }
    if (status === 'to_ship' || status === 'to_receive') {
      return (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="Track Order" onClick={() => navigate(`/track-order/${item.order_id}`)}>
          <Truck className="w-3 h-3" />
        </Button>
      );
    }
    if (status === 'delivered') {
      return (
        <>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Track Order" onClick={() => navigate(`/track-order/${item.order_id}`)}>
            <Truck className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Rate Product & Rider" onClick={() => navigate(`/rate/${item.order_id}/${item.product_id}`)}>
            <MessageSquare className="w-3 h-3 mr-1" /><span className="text-xs">Rate</span>
          </Button>
          {item.is_refundable && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Request Refund" onClick={() => navigate(`/request-refund-return/${item.order_id}?product_id=${item.product_id}`)}>
              <RefreshCcw className="w-3 h-3 mr-1" /><span className="text-xs">Refund</span>
            </Button>
          )}
        </>
      );
    }
    if (status === 'picked_up' || status === 'completed') {
      if (item.can_review) {
        return (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Rate Product" onClick={() => navigate(`/rate/${item.order_id}/${item.product_id}`)}>
            <MessageSquare className="w-3 h-3 mr-1" /><span className="text-xs">Rate</span>
          </Button>
        );
      }
      return (
        <Button size="sm" variant="ghost" className="h-6 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
          title="View Order" onClick={() => navigate(`/view-order/${item.order_id}`)}>
          <Eye className="w-3 h-3 mr-1" /><span className="text-xs">View</span>
        </Button>
      );
    }
    if (status === 'cancelled' || status === 'return_refund') {
      return (
        <Button size="sm" variant="ghost" className="h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          title="View Details" onClick={() => navigate(`/customer-view-refund-request/${item.order_id}`)}>
          <Undo2 className="w-3 h-3 mr-1" /><span className="text-xs">Details</span>
        </Button>
      );
    }
    return null;
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          <div className="mb-2">
            <h1 className="text-lg font-bold">Your Purchases</h1>
            <p className="text-gray-500 text-xs">Manage your purchased items and orders</p>
          </div>

          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input type="text" placeholder="Search purchases..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-8 text-sm h-8" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = getTabCount(tab.id);
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                      isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1 py-0.5 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="delivery-filter" className="text-xs whitespace-nowrap">Filter by:</Label>
              <select
                id="delivery-filter"
                value={deliveryMethodFilter}
                onChange={(e) => setDeliveryMethodFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Orders</option>
                <option value="pickup">Pickup from Store</option>
                <option value="delivery">Standard Delivery</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-4">
                <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {activeTab === 'all' ? 'No purchases found' :
                   activeTab === 'pending' ? 'No pending orders' :
                   activeTab === 'processing' ? 'No processing orders' :
                   activeTab === 'to_pickup' ? 'No orders ready for pickup' :
                   activeTab === 'shipped' ? 'No shipped orders' :
                   activeTab === 'completed' ? 'No completed orders' :
                   activeTab === 'rate' ? 'No orders to rate' :
                   'No returns or refunds'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedPurchases.has(item.id);
                const pickupDate = item.order.pickup_date;
                const showPickupBanner =
                  isCashOnPickup(item.order) &&
                  (item.status === 'in_progress' || item.status === 'ready_for_pickup') &&
                  !!pickupDate;

                return (
                  <Card key={item.id} className={`overflow-hidden border ${showPickupBanner ? 'border-amber-300' : ''}`}>
                    <CardContent className="p-3">

                      {/* ── PICKUP DATE BANNER ── */}
                      {showPickupBanner && (
                        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
                          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <CalendarClock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-800 mb-0.5">
                              Pickup Scheduled
                            </p>
                            <p className="text-sm font-bold text-amber-900">
                              {formatPickupDateTime(pickupDate!)}
                            </p>
                            <p className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              Pick up at the shop address
                            </p>
                          </div>
                          <Badge className="text-[10px] h-5 px-1.5 flex-shrink-0 bg-amber-100 text-amber-800 border-0">
                            Cash on Pickup
                          </Badge>
                        </div>
                      )}

                      {/* Top Section */}
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
                          <button onClick={() => togglePurchaseExpansion(item.id)}
                            className="p-1 hover:bg-gray-100 rounded">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                      </div>

                      {/* Middle Section */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Store className="w-3 h-3" />
                          <span className="truncate">{item.shop_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1 truncate">
                          Qty: {item.quantity} • {formatCurrency(item.total_amount)}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">{item.order.payment_method}</div>
                          <div className="font-medium text-sm">{formatCurrency(item.total_amount)}</div>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="my-2">
                        <img src={item.image} alt={item.product_name}
                          className="h-16 w-16 rounded-md object-cover border"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/phon.jpg'; }} />
                      </div>

                      {/* Expanded Details */}
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
                                {item.order.delivery_method && <div>Delivery Method: {item.order.delivery_method}</div>}
                                <div>Delivery Address: {item.order.delivery_address}</div>
                                {pickupDate && (
                                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                                    <CalendarClock className="w-3 h-3" />
                                    Pickup: {formatPickupDateTime(pickupDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {item.item?.voucher_applied && (
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
                                <div className="text-gray-600">{item.reason}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/view-order/${item.order_id}`)}
                          className="h-6 px-2 text-xs">
                          <Eye className="w-3 h-3 mr-1" />View Order
                        </Button>
                        <div className="flex gap-1">{getActionButtons(item)}</div>
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