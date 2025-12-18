import type { Route } from './+types/seller-return-refund-cancel';
import SidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useToast } from '~/hooks/use-toast';
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
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Separator } from '~/components/ui/separator';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { 
  ShoppingCart,
  Clock,
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
  List,
  RotateCcw,
  X,
  TruckIcon,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  FileText,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  PackageCheck,
  Banknote,
  CheckSquare,
  MessageSquareReply,
  Handshake as NegotiationIcon,
  CheckCheck,
  FileSearch,
  Ban as CancelledIcon
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Return/Refund/Cancel",
    },
  ];
}

// Interface for return/refund/cancel items
interface ReturnItem {
  id: string;
  order_id: string;
  request_number?: string;
  product: {
    id: string;
    name: string;
    price: number;
    shop: {
      id: string;
      name: string;
    };
    image?: string;
  };
  quantity: number;
  amount: number;
  type: 'return' | 'refund' | 'cancellation' | 'failed_delivery';
  status: 'pending' | 'negotiation' | 'approved' | 'waiting' | 'to_verify' | 'to_process' | 'dispute' | 'completed' | 'rejected' | 'cancelled' | 'pending_review' | 'under_review' | 'returning' | 'refunded' | 'disputed' | 'delivery_failed' | 'pending_cancellation';
  reason: string;
  description?: string;
  created_at: string;
  updated_at: string;
  refund_amount?: number;
  preferred_refund_method?: string;
  refund_method?: string;
  tracking_number?: string;
  dispute_reason?: string;
  resolution?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  estimated_refund_date?: string;
  actual_refund_date?: string;
  pickup_scheduled_date?: string;
  courier?: string;
  notes?: string;
  seller_response?: string;
  available_actions?: string[];
  // Detailed payload fields
  order_items?: any[];
  evidence?: any[];
  delivery?: any;
  seller_offer?: any;
  detailed?: boolean;
} 

interface ReturnStats {
  total_requests: number;
  return_refund_requests: number;
  cancellation_requests: number;
  failed_delivery_requests: number;
  under_review: number;
  returning: number;
  refunded: number;
  disputed: number;
  rejected_cancelled: number;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // Session+role checks
  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
    // Only require customer role; customers may own shops
    await requireRole(request, undefined, ['isCustomer'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  console.log(userId)

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || undefined;
  const shopIdFromSession = session.get('shopId');
  const shopId = url.searchParams.get('shop_id') || (typeof shopIdFromSession === 'string' ? shopIdFromSession : undefined) || undefined;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  try {
    // Build query params
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (shopId) params.set('shop_id', shopId);

    const headers: Record<string,string> = { 'Accept': 'application/json', 'X-User-Id': userId };
    if (shopId) headers['X-Shop-Id'] = shopId;

    const endpoint = shopId ? 'get_my_refunds' : 'get_shop_refunds';
    const res = await fetch(`${API_BASE_URL}/return-refund/${endpoint}/${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!res.ok) {
      const defaultStats = {
        total_requests: 0,
        pending: 0,
        negotiation: 0,
        approved: 0,
        waiting: 0,
        to_verify: 0,
        to_process: 0,
        dispute: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        return_refund_requests: 0,
        cancellation_requests: 0,
        failed_delivery_requests: 0,
        under_review: 0,
        returning: 0,
        refunded: 0,
        disputed: 0,
        rejected_cancelled: 0,
      };
      return { user: { id: userId, name: 'Customer', isCustomer: true, isAdmin: false, isRider: false, isModerator: false }, returnItems: [], stats: defaultStats };
    }

    const data = await res.json();
    // API may return { shop, results } when a shop id is supplied
    const serverList = Array.isArray(data) ? data : (data.results || data);
    const shopInfo = data && data.shop ? data.shop : null;

    const returnItems: ReturnItem[] = serverList.map((r: any) => ({
      id: r.refund || r.id,
      order_id: r.order_info?.order_id || r.order?.order || r.order_id || '',
      product: {
        id: r.order_items?.[0]?.product?.id || r.order_items?.[0]?.product_id || 'unknown',
        name: r.order_items?.[0]?.product?.name || r.order_items?.[0]?.name || r.order?.items?.[0]?.product?.name || 'Product',
        price: Number(r.total_refund_amount) || 0,
        shop: { id: r.order?.shop?.id || '', name: r.order?.shop?.name || '' },
        image: r.order_items?.[0]?.product?.image || ''
      },
      quantity: r.order_items?.[0]?.quantity || 1,
      amount: Number(r.total_refund_amount) || 0,
      type: r.type || 'refund',
      status: r.status || 'pending',
      reason: r.reason || '',
      description: r.customer_note || r.seller_response || '',
      created_at: r.requested_at || r.requested_on || '',
      updated_at: r.last_updated || r.processed_at || r.requested_at || '',
      refund_amount: r.total_refund_amount ? Number(r.total_refund_amount) : undefined,
      refund_method: r.final_refund_method || r.preferred_refund_method || undefined,
      tracking_number: r.tracking_number || undefined,
      dispute_reason: r.dispute_reason || undefined,
      resolution: r.admin_response || r.seller_response || undefined,
      reviewed_by: r.processed_by?.username || r.processed_by || undefined,
      reviewed_at: r.processed_at || undefined,
      estimated_refund_date: r.estimated_refund_date || undefined,
      actual_refund_date: r.processed_at || undefined,
      pickup_scheduled_date: r.pickup_scheduled_date || undefined,
      courier: r.logistic_service || undefined,
      notes: r.seller_response || r.note || '',
      available_actions: (function(status){
        switch(status){
          case 'pending': return ['approve','reject','propose_negotiation'];
          case 'negotiation': return ['propose_negotiation','contact_customer'];
          case 'approved': return ['schedule_pickup'];
          case 'waiting': return ['mark_as_received'];
          case 'to_verify': return ['verify_item'];
          case 'to_process': return ['process_refund'];
          case 'dispute': return ['contact_customer','resolve_dispute'];
          default: return [];
        }
      })(r.status)
    }));

    const stats = {
      total_requests: returnItems.length,
      // status breakdown (new)
      pending: returnItems.filter(i => i.status === 'pending').length,
      negotiation: returnItems.filter(i => i.status === 'negotiation').length,
      approved: returnItems.filter(i => i.status === 'approved').length,
      waiting: returnItems.filter(i => i.status === 'waiting').length,
      to_verify: returnItems.filter(i => i.status === 'to_verify').length,
      to_process: returnItems.filter(i => i.status === 'to_process').length,
      dispute: returnItems.filter(i => i.status === 'dispute').length,
      completed: returnItems.filter(i => i.status === 'completed').length,
      rejected: returnItems.filter(i => i.status === 'rejected').length,
      cancelled: returnItems.filter(i => i.status === 'cancelled').length,
      // legacy UI fields expected elsewhere
      return_refund_requests: returnItems.filter(i => i.type === 'return' || i.type === 'refund').length,
      cancellation_requests: returnItems.filter(i => i.type === 'cancellation').length,
      failed_delivery_requests: returnItems.filter(i => i.type === 'failed_delivery').length,
      under_review: returnItems.filter(i => ['pending','negotiation','pending_review','under_review','waiting'].includes(i.status)).length,
      returning: returnItems.filter(i => i.status === 'returning').length,
      refunded: returnItems.filter(i => i.status === 'refunded' || i.status === 'completed').length,
      disputed: returnItems.filter(i => i.status === 'dispute' || i.status === 'disputed').length,
      rejected_cancelled: returnItems.filter(i => ['rejected','cancelled','pending_cancellation'].includes(i.status)).length,
    };

    const userObj = { id: userId, name: 'Customer', isCustomer: true, isAdmin: false, isRider: false, isModerator: false };
    return { user: userObj, returnItems, stats, shopId: shopId || (shopInfo ? shopInfo.id : undefined), shop: shopInfo };

  } catch (err) {
    console.error('Error fetching shop refunds', err);
    const defaultStats = {
      total_requests: 0,
      pending: 0,
      negotiation: 0,
      approved: 0,
      waiting: 0,
      to_verify: 0,
      to_process: 0,
      dispute: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      return_refund_requests: 0,
      cancellation_requests: 0,
      failed_delivery_requests: 0,
      under_review: 0,
      returning: 0,
      refunded: 0,
      disputed: 0,
      rejected_cancelled: 0,
    };
    const userObj = { id: userId, name: 'Seller', isCustomer: true, isAdmin: false, isRider: false, isModerator: false };
    return { user: userObj, returnItems: [], stats: defaultStats };
  }
}

// Empty state components
const EmptyTable = ({ message = "No requests found" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <RotateCcw className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Customer return, refund, and cancellation requests will appear here.
      </p>
    </div>
  </div>
);

// Status tabs based on Django model statuses
const STATUS_TABS = [
  { id: 'all', label: 'All Requests', icon: List },
  { id: 'pending', label: 'Pending Review', icon: Clock },
  { id: 'negotiation', label: 'Negotiation', icon: NegotiationIcon },
  { id: 'approved', label: 'Approved', icon: CheckCircle },
  { id: 'waiting', label: 'Waiting', icon: Package },
  { id: 'to_verify', label: 'To Verify', icon: FileSearch },
  { id: 'to_process', label: 'To Process', icon: RefreshCw },
  { id: 'dispute', label: 'Dispute', icon: ShieldAlert },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'rejected', label: 'Rejected', icon: XCircle },
  { id: 'cancelled', label: 'Cancelled', icon: CancelledIcon }
];

// Status configuration (aligned with Refund model statuses)
const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: '#f59e0b', icon: Clock, bgColor: '#fffbeb' },
  negotiation: { label: 'Negotiation', color: '#3b82f6', icon: MessageCircle, bgColor: '#eff6ff' },
  approved: { label: 'Approved', color: '#10b981', icon: CheckCircle, bgColor: '#ecfdf5' },
  waiting: { label: 'Waiting For Return', color: '#6366f1', icon: Package, bgColor: '#eef2ff' },
  to_verify: { label: 'To Verify', color: '#8b5cf6', icon: PackageCheck, bgColor: '#f5f3ff' },
  to_process: { label: 'To Process', color: '#3b82f6', icon: Banknote, bgColor: '#eff6ff' },
  dispute: { label: 'Dispute', color: '#8b5cf6', icon: ShieldAlert, bgColor: '#f5f3ff' },
  completed: { label: 'Completed', color: '#10b981', icon: CheckSquare, bgColor: '#ecfdf5' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: XCircle, bgColor: '#fef2f2' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: X, bgColor: '#f9fafb' }
};

// Type configuration with colors and icons
const TYPE_CONFIG = {
  return: { label: 'Return', color: '#3b82f6', icon: RotateCcw, bgColor: '#eff6ff' },
  refund: { label: 'Refund', color: '#10b981', icon: PhilippinePeso, bgColor: '#ecfdf5' },
  cancellation: { label: 'Cancellation', color: '#ef4444', icon: X, bgColor: '#fef2f2' },
  failed_delivery: { label: 'Failed Delivery', color: '#dc2626', icon: TruckIcon, bgColor: '#fef2f2' }
};

export default function SellerReturnRefundCancel({ loaderData }: Route.ComponentProps) {
  const { user, returnItems: initialReturnItems, stats } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get('shop_id') || undefined;

  const [itemsState, setItemsState] = useState<ReturnItem[]>(initialReturnItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Helper to call seller endpoints and update UI optimistically
  const sellerActionToEndpoint: Record<string, string> = {
    approve: 'approve_refund',
    reject: 'reject_refund',
    propose_negotiation: 'propose_negotiation',
    mark_as_received: 'mark_as_received',
    verify_item: 'verify_item',
    process_refund: 'process_refund'
  };

  async function performSellerAction(requestId: string, action: string, body: any = {}) {
    if (!requestId) return;
    const endpoint = sellerActionToEndpoint[action] || action;
    setActionLoading(requestId);
    try {
      const res = await fetch(`${API_BASE_URL}/return-refund/${requestId}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: Object.keys(body).length ? JSON.stringify(body) : undefined
      });

      if (!res.ok) throw new Error(`Action ${action} failed (${res.status})`);
      const data = await res.json();

      // Update item in state based on response if possible
      setItemsState(prev => prev.map(it => it.id === requestId ? ({ ...it, status: data.status || it.status, notes: data.message || it.notes }) : it));
      toast({ title: 'Action successful', description: data.message || `${action} succeeded`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Action failed', description: String(err), variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  // Filter return items based on active tab and subtab
  const getFilteredReturnItems = () => {
    // First filter by search term
    let filtered = itemsState.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.product?.name?.toLowerCase().includes(searchLower) ||
        item.order_id?.toLowerCase().includes(searchLower) ||
        item.product?.shop?.name?.toLowerCase().includes(searchLower) ||
        item.reason?.toLowerCase().includes(searchLower)
      );
    });

    // Then filter by active tab (status-driven like customer)
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.status === activeTab);
    }

    return filtered;
  };

  const filteredReturnItems = getFilteredReturnItems();

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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
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
      return 'Invalid date';
    }
  };

  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return { text: 'N/A', color: 'text-gray-600', bg: 'bg-gray-50' };
    try {
      const now = new Date();
      const d = new Date(deadline);
      const diffMs = d.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (diffMs <= 0) return { text: 'Expired', color: 'text-red-600', bg: 'bg-red-50' };
      if (diffDays > 0) return { text: `${diffDays}d ${diffHours}h left`, color: 'text-green-600', bg: 'bg-green-50' };
      return { text: `${diffHours}h left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } catch (err) {
      return { text: 'Invalid date', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const activeTabLabel = STATUS_TABS.find(t => t.id === activeTab)?.label || (activeTab === 'all' ? 'All Requests' : activeTab);

  const viewRequestDetails = (requestId: string) => {
    if (!requestId) return;
    const qs = new URLSearchParams();
    if (shopId) qs.set('shop_id', shopId);
    // Use relative navigation so it still works with a basename / nested hosting.
    navigate(`/seller/view-refund-details/${encodeURIComponent(requestId)}${
    qs.toString() ? `?${qs.toString()}` : ''
  }`
);

  };

  const trackReturn = (trackingNumber: string) => {
    alert(`Tracking return shipment: ${trackingNumber}`);
    // In real app: open tracking page
  };

  const contactCustomer = (requestId: string) => {
    alert(`Contacting customer for request ${requestId}`);
    // In real app: open customer chat
  };

  const reviewRequest = (requestId: string) => {
    alert(`Reviewing request ${requestId}`);
    // In real app: open review form
  };

  const processRefund = (requestId: string) => {
    alert(`Processing refund for request ${requestId}`);
    // In real app: open refund processing
  };

  const schedulePickup = (requestId: string) => {
    alert(`Scheduling pickup for request ${requestId}`);
    // In real app: open pickup scheduling
  };

  const toggleExpand = async (itemId: string) => {
    // Expand / collapse and fetch detailed info if not present
    const isCollapsing = expandedItem === itemId;
    if (isCollapsing) {
      setExpandedItem(null);
      return;
    }

    // If we already have detailed order_items on the item, just expand
    const existing = itemsState.find(i => i.id === itemId);
    if (existing && (existing.order_items || existing.detailed)) {
      setExpandedItem(itemId);
      return;
    }

    // Otherwise fetch details from backend
    try {
      const res = await fetch(`${API_BASE_URL}/return-refund/${itemId}/get_refund_details/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'X-User-Id': user?.id },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        // Map response to local item shape (merge)
        setItemsState(prev => prev.map(it => it.id === itemId ? ({
          ...it,
          status: data.status || it.status,
          notes: data.seller_response || data.notes || it.notes,
          order_id: data.order_info?.order_number || it.order_id,
          refund_amount: data.total_refund_amount || data.order_info?.total_amount || it.refund_amount,
          refund_method: data.final_refund_method || data.preferred_refund_method || it.refund_method,
          order_items: data.order_items || [],
          delivery: data.delivery || data.delivery,
          evidence: data.evidence || [],
          seller_offer: data.seller_offer || null,
          available_actions: data.available_actions || it.available_actions || [],
          detailed: true
        }) : it));

        setExpandedItem(itemId);
        toast({ title: 'Details loaded', variant: 'default' });
      } else {
        toast({ title: 'Could not load details', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Fetch refund details error', err);
      toast({ title: 'Error loading details', description: String(err), variant: 'destructive' });
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
           { label: status, color: '#6b7280', icon: AlertCircle, bgColor: '#f9fafb' };
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || 
           { label: type, color: '#6b7280', icon: AlertCircle, bgColor: '#f9fafb' };
  };

  // Format currency helper
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '₱0.00';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Seller detail view (mirrors customer layout)
  const SellerDetailUI = ({ item, formatDate, formatDateTime, formatCurrency, onAction, actionLoading, toggleExpand }: any) => {
    const statusCfg = getStatusConfig(item.status);
    const StatusIcon = statusCfg.icon;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Return Request #{item.id}
                </CardTitle>
                <Badge variant="outline" className="text-xs" style={{ backgroundColor: statusCfg.bgColor, color: statusCfg.color }}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusCfg.label}
                </Badge>
              </div>
              <CardDescription className="text-xs">Order: {item.order_id} • Requested on {formatDate(item.created_at)}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div className="ml-2">
                  <div className="font-medium text-yellow-800">Status: {statusCfg.label}</div>
                  <div className="text-xs text-yellow-700">{item.notes || 'Seller view of the request'}</div>
                </div>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Request Date</p>
                  <p className="font-medium text-sm">{formatDateTime(item.created_at)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Items</p>
                  <p className="font-medium text-sm">{item.quantity} item(s)</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><PhilippinePeso className="h-3 w-3" />Refund Amount</p>
                  <p className="font-medium text-sm">{formatCurrency(item.refund_amount || item.amount)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Last Updated</p>
                  <p className="font-medium text-sm">{formatDateTime(item.updated_at)}</p>
                </div>
              </div>

              {/* Item List */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Items to Return</p>
                <div className="space-y-2">
                  <div className="p-3 border rounded space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500"><span>Qty: {item.quantity}</span></div>
                      </div>
                      <div className="font-medium text-sm">{formatCurrency(item.amount)}</div>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Refund Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Item Price:</span><span>{formatCurrency(item.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quantity:</span><span>{item.quantity}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-sm"><span>Total Refund:</span><span className="text-green-600">{formatCurrency(item.refund_amount || item.amount)}</span></div>
              <div className="pt-2 mt-2 border-t">
                <p className="text-muted-foreground">Refund Method:</p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="font-medium">{item.refund_method || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Action Buttons driven by available_actions */}
              {item.available_actions?.includes('approve') && (
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => onAction(item.id, 'approve')} disabled={actionLoading}>
                  <CheckCircle className="h-3 w-3 mr-1.5" />
                  Approve
                </Button>
              )}

              {item.available_actions?.includes('reject') && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onAction(item.id, 'reject')} disabled={actionLoading}>
                  <XCircle className="h-3 w-3 mr-1.5" />
                  Reject
                </Button>
              )}

              {item.available_actions?.includes('propose_negotiation') && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => onAction(item.id, 'propose_negotiation', { seller_suggested_amount: item.amount * 0.5, seller_suggested_method: 'partial_refund', seller_suggested_reason: 'Partial refund offer' })} disabled={actionLoading}>
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Propose Offer
                </Button>
              )}

              {item.available_actions?.includes('schedule_pickup') && (
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => schedulePickup(item.id)}>
                  <Truck className="h-3 w-3 mr-1.5" />
                  Schedule Pickup
                </Button>
              )}

              {item.available_actions?.includes('process_refund') && (
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs" onClick={() => onAction(item.id, 'process_refund')} disabled={actionLoading}>
                  <PhilippinePeso className="h-3 w-3 mr-1.5" />
                  Process Refund
                </Button>
              )}

              <Button variant="link" className="h-6 px-0 text-xs text-gray-700 mt-1" onClick={() => toggleExpand()}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-6">
          {/* Header - Removed "File New Request" button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Return/Refund/Cancel Requests</h1>
              <p className="text-gray-600 mt-1">Manage customer return, refund, and cancellation requests</p>
            </div>
            {/* File New Request button removed for seller side */}
          </div>

          {/* Status Tabs - match customer UI */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2 pb-2 border-b">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'all' ? itemsState.length : itemsState.filter(i => i.status === tab.id).length;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap flex-shrink-0 ${
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

          {/* Return/Refund Subtabs (only shown when Return/Refund tab is active) */}
          



          {/* Search Bar */}
          {/* <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, order ID, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* Requests Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{STATUS_TABS.find(t => t.id === activeTab)?.label || (activeTab === 'all' ? 'All Requests' : activeTab)}</CardTitle>
              <CardDescription>
                Showing {filteredReturnItems.length} of {itemsState.length} requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReturnItems.length === 0 ? (
                <EmptyTable message={activeTab === 'all' ? 'No requests found' : `No ${activeTabLabel}`} />
              ) : (
                <div className="space-y-3">
                    {filteredReturnItems.map((item) => {
                      const statusConfig = getStatusConfig(item.status);
                      const isExpanded = expandedItem === item.id;

                      const negotiationInfo = item.seller_offer || null;

                      return (
                        <Card key={item.id} className="overflow-hidden border hover:border-blue-200 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm font-medium truncate">{item.product?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {item.request_number && (
                                    <>
                                      <span className="truncate">{item.request_number}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>{formatDateTime(item.created_at)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                                  <statusConfig.icon className="w-3 h-3" />
                                  {statusConfig.label}
                                </Badge>

                                <button onClick={() => toggleExpand(item.id)} className="p-1 hover:bg-gray-100 rounded">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 transform rotate-180" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </button>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Store className="w-3 h-3" />
                                  <span className="truncate">{item.product?.shop?.name}</span>
                                </div>
                                <div className="font-medium text-sm">
                                  <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                                  {formatCurrency(item.amount || item.refund_amount || 0)}
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 mb-1 truncate">Order: {item.order_id} • Qty: {item.quantity}</div>

                              <div className="text-xs text-gray-600 mb-2 line-clamp-2">{item.reason}</div>

                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <FileText className="w-3 h-3" />
                                <span>{(item.evidence && item.evidence.length) ? item.evidence.length : 0} evidence file{(item.evidence && item.evidence.length) !== 1 ? 's' : ''}</span>
                              </div>

                              {/* Negotiation or Dispute Info */}
                              {item.seller_offer && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <MessageCircle className="w-3 h-3 text-blue-600" />
                                      <span className="text-xs font-medium text-blue-800">Seller Offer</span>
                                    </div>
                                    {item.seller_offer.deadline && (
                                      <Badge className="text-[10px] h-4 bg-green-50 text-green-600">{getTimeRemaining(item.seller_offer?.deadline).text}</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-blue-700 mt-1">{item.seller_offer.method} - {formatCurrency(item.seller_offer.amount || 0)}</p>
                                  {item.seller_offer.reason && <p className="text-xs text-gray-600 mt-0.5">{item.seller_offer.reason}</p>}
                                </div>
                              )}

                              {item.status === 'dispute' && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                  <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3 text-red-600" />
                                    <span className="text-xs font-medium text-red-800">Under Admin Review</span>
                                  </div>
                                  {item.dispute_reason && <p className="text-xs text-gray-700 mt-1">Your reason: {item.dispute_reason}</p>}
                                </div>
                              )}

                            </div>

                            <div className="my-2">
                              <img src={item.product?.image || '/phon.jpg'} alt={item.product?.name} className="h-16 w-16 rounded-md object-cover border" onError={(e)=>{(e.target as HTMLImageElement).src='/phon.jpg'}} />
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t text-xs space-y-2">
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Refund Details</div>
                                  <div className="text-gray-600 space-y-1">
                                    <div>Requested Method: {item.preferred_refund_method}</div>
                                    {item.refund_method && <div>Final Method: {item.refund_method}</div>}
                                    <div>Status: {statusConfig.label}</div>
                                    {item.updated_at && <div>Last Updated: {formatDateTime(item.updated_at)}</div>}
                                    {item.tracking_number && <div>Tracking: {item.tracking_number}</div>}
                                  </div>
                                </div>

                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Reason for Refund</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border">{item.reason}</div>
                                </div>

                                {item.notes && (
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Your Note</div>
                                    <div className="text-gray-600 bg-gray-50 p-2 rounded border">{item.notes}</div>
                                  </div>
                                )}

                                {item.seller_response && (
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1 flex items-center gap-1"><Store className="w-3 h-3" /> Seller Response</div>
                                    <div className="text-gray-600 bg-gray-50 p-2 rounded border">{item.seller_response}</div>
                                  </div>
                                )}

                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t">
                              <Button variant="ghost" size="sm" onClick={() => viewRequestDetails(item.id)} className="h-6 px-2 text-xs"><Eye className="w-3 h-3 mr-1"/> View Details</Button>

                              <div className="flex gap-1">
                                {item.available_actions?.includes('approve') && (
                                  <Button size="sm" variant="default" onClick={() => performSellerAction(item.id, 'approve')} disabled={actionLoading===item.id} className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"><FileText className="w-3 h-3 mr-1"/>Approve</Button>
                                )}
                                {item.available_actions?.includes('reject') && (
                                  <Button size="sm" variant="outline" onClick={() => performSellerAction(item.id, 'reject')} disabled={actionLoading===item.id} className="h-6 px-2 text-xs"><XCircle className="w-3 h-3 mr-1"/>Reject</Button>
                                )}
                                {item.available_actions?.includes('propose_negotiation') && (
                                  <Button size="sm" variant="outline" onClick={() => performSellerAction(item.id, 'propose_negotiation', { seller_suggested_amount: (item.amount||0)*0.5 })} disabled={actionLoading===item.id} className="h-6 px-2 text-xs"> <MessageSquare className="w-3 h-3 mr-1"/>Propose Offer</Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50" title="More Actions"><FileText className="w-3 h-3"/></Button>
                              </div>
                            </div>

                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Cards for Seller */}
          {activeTab === 'return_refund' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Seller Guidelines
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-blue-700 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Review within 48 hours</p>
                        <p className="text-blue-600">Respond to customer requests promptly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Arrange pickup within 3 days</p>
                        <p className="text-blue-600">For approved return requests</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-green-100 p-1 rounded-full mt-0.5">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Process refund within 7 days</p>
                        <p className="text-green-600">Upon receiving returned items</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Dispute Resolution
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-purple-700 space-y-3">
                    <p>For disputed requests:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Communicate clearly with customers</li>
                      <li>Request photos/videos as evidence</li>
                      <li>Consider partial refunds for minor issues</li>
                      <li>Escalate to platform support if needed</li>
                    </ul>
                    <div className="pt-2">
                      <Button variant="outline" className="w-full bg-white">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Platform Support
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Cancellation Policy (Seller)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Seller should approve cancellation if:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Order has not been processed yet</li>
                    <li>Within 1 hour of order placement</li>
                    <li>No shipping label created</li>
                  </ul>
                  <p className="pt-2"><strong>Seller can reject cancellation if:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Order has already been shipped</li>
                    <li>Product has been prepared for shipping</li>
                    <li>More than 1 hour has passed</li>
                  </ul>
                  <p className="pt-2 text-gray-600">Provide clear reasons for rejection and suggest return option.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'failed_delivery' && (
            <Card className="bg-orange-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" />
                    Failed Delivery (Seller)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-orange-700 space-y-2">
                  <p><strong>Seller responsibilities:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Coordinate with courier for redelivery</li>
                    <li>Update customer on delivery status</li>
                    <li>Process refund if delivery is impossible</li>
                    <li>Follow up with courier for updates</li>
                  </ul>
                  <p className="pt-2"><strong>Seller options:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Request courier to reattempt delivery</li>
                    <li>Offer pickup from courier hub</li>
                    <li>Process refund and have item returned</li>
                    <li>Contact customer for alternative address</li>
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