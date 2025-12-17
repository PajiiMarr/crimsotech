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
  MessageSquareReply
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
  available_actions?: string[];
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
    await requireRole(request, undefined, ['isSeller'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || undefined;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${API_BASE_URL}/api/return-refund/get_shop_refunds/${statusFilter ? `?status=${statusFilter}` : ''}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-User-Id': userId },
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
      return { user: { id: userId, name: 'Seller', isSeller: true, isCustomer: false, isAdmin: false, isRider: false, isModerator: false }, returnItems: [], stats: defaultStats };
    }

    const data = await res.json();
    const serverList = Array.isArray(data) ? data : (data.results || data);

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

    return { user: { id: userId, name: 'Seller', isSeller: true, isCustomer: false, isAdmin: false, isRider: false, isModerator: false }, returnItems, stats };

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
    return { user: { id: userId, name: 'Seller', isSeller: true, isCustomer: false, isAdmin: false, isRider: false, isModerator: false }, returnItems: [], stats: defaultStats };
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

// Main Tabs configuration
const MAIN_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'return_refund', label: 'Return/Refund', icon: RotateCcw },
  { id: 'cancellation', label: 'Cancellation', icon: X },
  { id: 'failed_delivery', label: 'Failed Delivery', icon: TruckIcon }
];

// Return/Refund subtabs configuration
const RETURN_REFUND_SUBTABS = [
  { id: 'all_return_refund', label: 'All', icon: RotateCcw },
  { id: 'under_review', label: 'Under Review', icon: Clock },
  { id: 'returning', label: 'Returning', icon: Truck },
  { id: 'refunded', label: 'Refunded', icon: CheckCircle },
  { id: 'disputed', label: 'Disputed', icon: ShieldAlert },
  { id: 'rejected_cancelled', label: 'Rejected/Cancelled', icon: XCircle }
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
  const [itemsState, setItemsState] = useState<ReturnItem[]>(initialReturnItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [returnRefundSubTab, setReturnRefundSubTab] = useState<string>('all_return_refund');
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
      const res = await fetch(`${API_BASE_URL}/api/return-refund/${requestId}/${endpoint}/`, {
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

    // Then filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'return_refund') {
        filtered = filtered.filter(item => 
          item.type === 'return' || item.type === 'refund'
        );

        // Further filter by returnRefundSubTab
        if (returnRefundSubTab === 'under_review') {
          filtered = filtered.filter(item => 
            item.status === 'under_review' || item.status === 'pending_review'
          );
        } else if (returnRefundSubTab === 'returning') {
          filtered = filtered.filter(item => item.status === 'returning');
        } else if (returnRefundSubTab === 'refunded') {
          filtered = filtered.filter(item => item.status === 'refunded');
        } else if (returnRefundSubTab === 'disputed') {
          filtered = filtered.filter(item => item.status === 'disputed');
        } else if (returnRefundSubTab === 'rejected_cancelled') {
          filtered = filtered.filter(item => 
            item.status === 'rejected' || item.status === 'cancelled'
          );
        }
        // 'all_return_refund' shows all items in return_refund tab
      } else if (activeTab === 'cancellation') {
        filtered = filtered.filter(item => item.type === 'cancellation');
      } else if (activeTab === 'failed_delivery') {
        filtered = filtered.filter(item => item.type === 'failed_delivery');
      }
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

  const viewRequestDetails = (requestId: string) => {
    alert(`Viewing detailed information for request ${requestId}`);
    // In real app: navigate(`/seller/returns/${requestId}`);
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

  const toggleExpand = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
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

          {/* Main Tabs Navigation */}
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tab.id === 'all' ? stats.total_requests :
                            tab.id === 'return_refund' ? stats.return_refund_requests :
                            tab.id === 'cancellation' ? stats.cancellation_requests :
                            tab.id === 'failed_delivery' ? stats.failed_delivery_requests : 0;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'return_refund') {
                        setReturnRefundSubTab('all_return_refund');
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

          {/* Return/Refund Subtabs (only shown when Return/Refund tab is active) */}
          {activeTab === 'return_refund' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Return/Refund Requests</h3>
                <span className="text-sm text-gray-500 ml-2">
                  Manage customer return and refund requests
                </span>
              </div>
              <div className="flex overflow-x-auto">
                {RETURN_REFUND_SUBTABS.map((subtab) => {
                  const Icon = subtab.icon;
                  const isActive = returnRefundSubTab === subtab.id;
                  const count = subtab.id === 'all_return_refund' ? stats.return_refund_requests :
                              subtab.id === 'under_review' ? stats.under_review :
                              subtab.id === 'returning' ? stats.returning :
                              subtab.id === 'refunded' ? stats.refunded :
                              subtab.id === 'disputed' ? stats.disputed :
                              subtab.id === 'rejected_cancelled' ? stats.rejected_cancelled : 0;

                  return (
                    <Button
                      key={subtab.id}
                      variant="ghost"
                      onClick={() => setReturnRefundSubTab(subtab.id)}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold mt-1">{stats.total_requests}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <List className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Return/Refund</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{stats.return_refund_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Product returns & refunds</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancellations</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.cancellation_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order cancellations</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed Delivery</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{stats.failed_delivery_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Delivery issues</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <TruckIcon className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats for Return/Refund Tab */}
          {activeTab === 'return_refund' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Under Review</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{stats.under_review}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Returning</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{stats.returning}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Refunded</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{stats.refunded}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Disputed</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">{stats.disputed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rejected/Cancelled</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejected_cancelled}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {stats.total_requests > 0 
                        ? `${Math.round((stats.refunded / stats.total_requests) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
              <CardTitle className="text-xl">
                {activeTab === 'all' && 'All Requests'}
                {activeTab === 'return_refund' && (
                  <>
                    {returnRefundSubTab === 'all_return_refund' && 'All Return/Refund Requests'}
                    {returnRefundSubTab === 'under_review' && 'Requests Under Review'}
                    {returnRefundSubTab === 'returning' && 'Returning Items'}
                    {returnRefundSubTab === 'refunded' && 'Refunded Requests'}
                    {returnRefundSubTab === 'disputed' && 'Disputed Requests'}
                    {returnRefundSubTab === 'rejected_cancelled' && 'Rejected/Cancelled Requests'}
                  </>
                )}
                {activeTab === 'cancellation' && 'Cancellation Requests'}
                {activeTab === 'failed_delivery' && 'Failed Delivery Requests'}
              </CardTitle>
              <CardDescription>
                Showing {filteredReturnItems.length} of {itemsState.length} requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReturnItems.length === 0 ? (
                <EmptyTable 
                  message={
                    activeTab === 'return_refund' ? (
                      returnRefundSubTab === 'under_review' ? 'No requests under review' :
                      returnRefundSubTab === 'returning' ? 'No items returning' :
                      returnRefundSubTab === 'refunded' ? 'No refunded requests' :
                      returnRefundSubTab === 'disputed' ? 'No disputed requests' :
                      returnRefundSubTab === 'rejected_cancelled' ? 'No rejected/cancelled requests' :
                      'No return/refund requests'
                    ) :
                    activeTab === 'cancellation' ? 'No cancellation requests' :
                    activeTab === 'failed_delivery' ? 'No failed delivery requests' :
                    'No requests found'
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Request ID</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Product</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Created</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredReturnItems.map((item) => {
                          const statusConfig = getStatusConfig(item.status);
                          const typeConfig = getTypeConfig(item.type);
                          const StatusIcon = statusConfig.icon;
                          const TypeIcon = typeConfig.icon;
                          const isExpanded = expandedItem === item.id;

                          return (
                            <>
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm">
                                  <div className="font-medium">{item.id}</div>
                                  <div className="text-xs text-muted-foreground">Order: {item.order_id}</div>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{item.product?.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <Badge 
                                    variant="secondary"
                                    className="text-xs capitalize flex items-center gap-1"
                                    style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                                  >
                                    <TypeIcon className="w-3 h-3" />
                                    {typeConfig.label}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  <Badge 
                                    variant="secondary"
                                    className="text-xs capitalize flex items-center gap-1"
                                    style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex items-center gap-1">
                                    <PhilippinePeso className="w-4 h-4 text-muted-foreground" />
                                    {item.amount}
                                    {item.refund_amount && item.refund_amount !== item.amount && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        (Refund: {item.refund_amount})
                                      </span>
                                    )}
                                  </div>
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
                                      onClick={() => viewRequestDetails(item.id)}
                                      className="flex items-center justify-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      View Details
                                    </Button>
                                    
                                    {/* Seller-specific actions: prefer server-provided available_actions when present */}
                                    {(item.available_actions?.includes('review') || item.available_actions?.includes('approve') || item.available_actions?.includes('reject')) && (
                                      <div className="flex items-center gap-2">
                                        {item.available_actions?.includes('approve') && (
                                          <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => performSellerAction(item.id, 'approve')}
                                            className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700"
                                            disabled={actionLoading === item.id}
                                          >
                                            <FileText className="w-3 h-3" />
                                            Approve
                                          </Button>
                                        )}

                                        {item.available_actions?.includes('reject') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => performSellerAction(item.id, 'reject')}
                                            className="flex items-center justify-center gap-1"
                                            disabled={actionLoading === item.id}
                                          >
                                            <XCircle className="w-3 h-3" />
                                            Reject
                                          </Button>
                                        )}

                                        {item.available_actions?.includes('propose_negotiation') && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => performSellerAction(item.id, 'propose_negotiation', { message: 'Seller proposed a partial refund' })}
                                            className="flex items-center justify-center gap-1 bg-yellow-50"
                                            disabled={actionLoading === item.id}
                                          >
                                            <MessageSquare className="w-3 h-3" />
                                            Propose Offer
                                          </Button>
                                        )}

                                      </div>
                                    )}

                                    {item.available_actions?.includes('schedule_pickup') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => schedulePickup(item.id)}
                                        className="flex items-center justify-center gap-1 bg-green-50 text-green-700 hover:bg-green-100"
                                      >
                                        <Truck className="w-3 h-3" />
                                        Schedule Pickup
                                      </Button>
                                    )}

                                    {item.available_actions?.includes('process_refund') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => performSellerAction(item.id, 'process_refund')}
                                        className="flex items-center justify-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                        disabled={actionLoading === item.id}
                                      >
                                        <PhilippinePeso className="w-3 h-3" />
                                        Process Refund
                                      </Button>
                                    )}

                                    {item.tracking_number && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => trackReturn(item.tracking_number!)}
                                        className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                      >
                                        <Truck className="w-3 h-3" />
                                        Track
                                      </Button>
                                    )}

                                    {(item.available_actions?.includes('contact_customer') || item.status === 'disputed') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => contactCustomer(item.id)}
                                        className="flex items-center justify-center gap-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        Contact Customer
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpand(item.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan={8} className="p-4">
                                    <SellerDetailUI
                                      item={item}
                                      formatDate={formatDate}
                                      formatDateTime={formatDateTime}
                                      formatCurrency={(v:number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                                      onAction={performSellerAction}
                                      actionLoading={actionLoading === item.id}
                                      toggleExpand={() => toggleExpand(item.id)}
                                    />
                                  </td>
                                </tr>
                              )}

                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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