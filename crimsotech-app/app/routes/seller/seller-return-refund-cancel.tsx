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
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';
import { 
  ShoppingCart,
  Clock,
  Package,
  Calendar,
  PhilippinePeso,
  ShoppingBag,
  ChevronUp,
  RefreshCcw,
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
  ShieldAlert,
  MessageSquare,
  FileText,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  CheckSquare,
  MessageSquareReply,
  Handshake as NegotiationIcon,
  CheckCheck,
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
  refund_type?: 'return' | 'keep'; // Added for seller workflow
  status: 'pending' | 'approved' | 'negotiation' | 'rejected' | 'dispute' | 'cancelled' | 'failed';
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
  // API response fields
  buyer_notified_at?: string | null;
  refund_payment_status?: string | null;
  return_request?: {
    status: 'waiting_shipment' | 'shipped' | 'received' | 'inspected' | 'approved' | 'completed' | 'problem' | 'rejected';
    tracking_number?: string;
    shipped_at?: string;
    received_at?: string;
    notes?: string;
  };
  dispute?: {
    status: 'pending' | 'under_review' | 'resolved';
    reason?: string;
    resolution?: string;
  };
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

    // For sellers, always use get_shop_refunds to get refunds for their shops
    const endpoint = 'get_shop_refunds';
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
        dispute: 0,
        rejected: 0,
        cancelled: 0,
        failed: 0,
        return_refund_requests: 0,
        cancellation_requests: 0,
        failed_delivery_requests: 0,
        under_review: 0,
        returning: 0,
        refunded: 0,
        disputed: 0,
        rejected_cancelled: 0,
      };
      return { user: { id: userId, name: 'Customer', isCustomer: false, isSeller: true, isAdmin: false, isRider: false, isModerator: false }, returnItems: [], stats: defaultStats };
    }

    const data = await res.json();
    // API may return { shop, results } when a shop id is supplied
    const serverList = Array.isArray(data) ? data : (data.results || data);
    const shopInfo = data && data.shop ? data.shop : null;

    const returnItems: ReturnItem[] = serverList.map((r: any) => ({
      id: r.refund_id || r.refund || r.id,
      order_id: r.order_id || r.order_info?.order_id || r.order?.order || '',
      buyer_notified_at: r.buyer_notified_at || null,
      product: {
        id: r.order_items?.[0]?.product_id || r.order_items?.[0]?.product?.id || 'unknown',
        name: r.order_items?.[0]?.product_name || r.order_items?.[0]?.product?.name || r.order_items?.[0]?.name || 'Product',
        price: Number(r.order_items?.[0]?.price) || Number(r.amount) || 0,
        shop: r.shop || r.order_items?.[0]?.shop || { id: '', name: '' },
        image: r.order_items?.[0]?.product_image || ''
      },
      quantity: r.order_items?.[0]?.quantity || 1,
      amount: Number(r.amount) || Number(r.order_items?.[0]?.total) || 0,
      type: r.refund_type === 'return' ? 'return' : 'refund',
      refund_type: r.refund_type || 'keep',
      status: r.status || 'pending',
      reason: r.reason || '',
      description: r.customer_note || r.detailed_reason || '',
      created_at: r.requested_at || '',
      updated_at: r.updated_at || r.requested_at || '',
      refund_amount: r.amount ? Number(r.amount) : undefined,
      refund_method: r.final_refund_method || r.buyer_preferred_refund_method || undefined,
      refund_payment_status: r.refund_payment_status || 'pending',
      tracking_number: r.return_request?.tracking_number || undefined,
      dispute_reason: r.dispute?.reason || undefined,
      resolution: r.dispute?.resolution || undefined,
      reviewed_by: r.processed_by?.username || undefined,
      reviewed_at: r.processed_at || undefined,
      estimated_refund_date: undefined,
      actual_refund_date: r.processed_at || undefined,
      pickup_scheduled_date: undefined,
      courier: r.return_request?.logistic_service || undefined,
      notes: r.customer_note || r.notes || '',
      // API response fields
      return_request: r.return_request ? {
        status: r.return_request.status,
        tracking_number: r.return_request.tracking_number,
        shipped_at: r.return_request.shipped_at,
        received_at: r.return_request.received_at,
        notes: r.return_request.notes
      } : undefined,
      dispute: r.dispute ? {
        status: r.dispute.status,
        reason: r.dispute.reason,
        resolution: r.dispute.resolution,
        created_at: r.dispute.created_at,
        resolved_at: r.dispute.resolved_at
      } : undefined,
      available_actions: (function(status){
        switch(status){
          case 'pending': return ['approve','reject','propose_negotiation'];
          case 'negotiation': return ['propose_negotiation','contact_customer'];
          case 'approved': return ['schedule_pickup','process_refund'];
          case 'dispute': return ['contact_customer','resolve_dispute'];
          case 'rejected': return [];
          case 'cancelled': return [];
          case 'failed': return [];
          default: return [];
        }
      })(r.status)
    }));

    const stats = {
      total_requests: returnItems.length,
      // status breakdown (aligned with Refund model)
      pending: returnItems.filter(i => i.status === 'pending').length,
      negotiation: returnItems.filter(i => i.status === 'negotiation').length,
      approved: returnItems.filter(i => i.status === 'approved').length,
      dispute: returnItems.filter(i => i.status === 'dispute').length,
      rejected: returnItems.filter(i => i.status === 'rejected').length,
      cancelled: returnItems.filter(i => i.status === 'cancelled').length,
      failed: returnItems.filter(i => i.status === 'failed').length,
      // legacy UI fields expected elsewhere
      return_refund_requests: returnItems.filter(i => i.type === 'return' || i.type === 'refund').length,
      cancellation_requests: returnItems.filter(i => i.type === 'cancellation').length,
      failed_delivery_requests: returnItems.filter(i => i.type === 'failed_delivery').length,
      under_review: returnItems.filter(i => ['pending','negotiation'].includes(i.status)).length,
      returning: returnItems.filter(i => i.status === 'approved').length, // approved refunds may involve returns
      refunded: returnItems.filter(i => i.status === 'approved').length, // approved means refund will be processed
      disputed: returnItems.filter(i => i.status === 'dispute').length,
      rejected_cancelled: returnItems.filter(i => ['rejected','cancelled','failed'].includes(i.status)).length,
    };

    const userObj = { id: userId, name: 'Seller', isCustomer: false, isSeller: true, isAdmin: false, isRider: false, isModerator: false };
    return { user: userObj, returnItems, stats, shopId: shopId || (shopInfo ? shopInfo.id : undefined), shop: shopInfo };

  } catch (err) {
    console.error('Error fetching shop refunds', err);
    const defaultStats = {
      total_requests: 0,
      pending: 0,
      negotiation: 0,
      approved: 0,
      dispute: 0,
      rejected: 0,
      cancelled: 0,
      failed: 0,
      return_refund_requests: 0,
      cancellation_requests: 0,
      failed_delivery_requests: 0,
      under_review: 0,
      returning: 0,
      refunded: 0,
      disputed: 0,
      rejected_cancelled: 0,
    };
    const userObj = { id: userId, name: 'Seller', isCustomer: false, isSeller: true, isAdmin: false, isRider: false, isModerator: false };
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

// Tabs (added Disputes)
const STATUS_TABS = [
  { id: 'all', label: 'All Requests', icon: List },
  { id: 'new', label: 'New Requests', icon: Clock },
  { id: 'to-process', label: 'To Process', icon: RefreshCcw },
  { id: 'disputes', label: 'Disputes', icon: ShieldAlert },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
];

// Status configuration (aligned with Refund model statuses)
const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: '#f59e0b', icon: Clock, bgColor: '#fffbeb' },
  negotiation: { label: 'Negotiation', color: '#3b82f6', icon: MessageCircle, bgColor: '#eff6ff' },
  approved: { label: 'Approved', color: '#10b981', icon: CheckCircle, bgColor: '#ecfdf5' },
  dispute: { label: 'Dispute', color: '#8b5cf6', icon: ShieldAlert, bgColor: '#f5f3ff' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: XCircle, bgColor: '#fef2f2' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: X, bgColor: '#f9fafb' },
  failed: { label: 'Failed', color: '#dc2626', icon: AlertTriangle, bgColor: '#fef2f2' }
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'all');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredRefunds, setFilteredRefunds] = useState<ReturnItem[]>([]);
  const [refundData, setRefundData] = useState<ReturnItem[]>(initialReturnItems);
  const [loading, setLoading] = useState(!initialReturnItems);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get refunds for current tab based on YOUR EXACT LOGIC
  const getRefundsForTab = (tabId: string): ReturnItem[] => {
    if (!refundData) return [];

    const refunds = Array.isArray(refundData) ? refundData : [];

    switch(tabId) {
      case 'all':
        // Show all refunds
        return refunds;

      case 'new':
        // New Requests: refund.status='pending' AND refund.payment_status='pending'
        return refunds.filter(refund =>
          String(refund.status).toLowerCase() === 'pending' &&
          String(refund.refund_payment_status).toLowerCase() === 'pending'
        );

      case 'to-process':
        // To Process tab - include refunds that require seller action or are in-progress
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const rtype = String(refund.refund_type || '').toLowerCase();
          const rrStatus = (refund.return_request?.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();

          // Exclude final states
          if (['completed','rejected','cancelled','failed'].includes(st)) return false;

          // Negotiations awaiting buyer response
          if (st === 'negotiation' && paymentStatus === 'pending') return true;

          // Awaiting Shipment: approved returns waiting for buyer to ship
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped','received'].includes(rrStatus))) return true;

          // In Transit (shipped by buyer)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;

          // Received (need inspection)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;

          // Inspection complete (seller decision needed)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;

          // Ready to Process Payment
          if (st === 'approved' && (
            (rtype === 'keep' && paymentStatus === 'processing') ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          )) return true;

          return false;
        });

      case 'disputes':
        return refunds.filter(refund => String(refund.status).toLowerCase() === 'dispute' || String(refund.dispute?.status || '').toLowerCase() === 'under_review');

      case 'completed':
        // Completed: Includes completed, rejected, cancelled, failed
        // refund.payment_status='completed' OR refund.status IN ('rejected', 'cancelled', 'failed')
        // OR (refund.status='approved' AND return_request.status='rejected')
        return refunds.filter(refund => 
          refund.refund_payment_status === 'completed' ||
          ['rejected', 'cancelled', 'failed'].includes(refund.status) ||
          (refund.status === 'approved' && refund.return_request?.status === 'rejected')
        );

      default:
        return refunds;
    }
  };

  useEffect(() => {
    if (!initialReturnItems) {
      fetchRefundData();
    } else {
      // Log the initial refund data for debugging
      console.log('Initial refund data for seller:', {
        userId: user?.id,
        userName: user?.name,
        refundCount: initialReturnItems.length,
        refunds: initialReturnItems.map(r => ({
          id: r.id,
          order_id: r.order_id,
          status: r.status,
          refund_type: r.refund_type,
          refund_payment_status: r.refund_payment_status,
          buyer_notified_at: r.buyer_notified_at,
          return_request_status: r.return_request?.status,
          dispute_status: r.dispute?.status,
          amount: r.amount,
          reason: r.reason,
          created_at: r.created_at,
          product: r.product.name
        }))
      });
    }
  }, [initialReturnItems]);

  useEffect(() => {
    // Handle success message from navigation state
    if (location.state?.success && location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (refundData) {
      const tabRefunds = getRefundsForTab(activeTab);
      let filtered = tabRefunds;

      if (search) {
        filtered = filtered.filter((refund: ReturnItem) =>
          refund.reason.toLowerCase().includes(search.toLowerCase()) ||
          refund.id.toLowerCase().includes(search.toLowerCase()) ||
          refund.order_id.toLowerCase().includes(search.toLowerCase())
        );
      }

      console.log(`Refunds for tab "${activeTab}":`, {
        totalInTab: tabRefunds.length,
        afterSearch: filtered.length,
        refunds: filtered.map(r => ({
          id: r.id,
          order_id: r.order_id,
          status: r.status,
          refund_type: r.refund_type,
          refund_payment_status: r.refund_payment_status,
          return_request_status: r.return_request?.status,
          dispute_status: r.dispute?.status,
          amount: r.amount,
          reason: r.reason
        }))
      });

      setFilteredRefunds(filtered);
    }
  }, [search, activeTab, refundData]);

  const fetchRefundData = async () => {
    try {
      console.log('Fetching refund data for seller:', { userId: user?.id, userName: user?.name });
      const response = await AxiosInstance.get('/return-refund/get_shop_refunds/', {
        headers: {
          'X-User-Id': user?.id || ''
        }
      });
      console.log('API Response:', response.data);
      setRefundData(response.data);
    } catch (error) {
      console.error('Error fetching refund data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1`}
        style={{ backgroundColor: config.bgColor, color: config.color }}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getTabCount = (tabId: string): number => {
    if (!refundData) return 0;
    return getRefundsForTab(tabId).length;
  };

  const toggleRefundExpansion = (refundId: string) => {
    const newExpanded = new Set(expandedRefunds);
    if (newExpanded.has(refundId)) {
      newExpanded.delete(refundId);
    } else {
      newExpanded.add(refundId);
    }
    setExpandedRefunds(newExpanded);
  };

  const getActionButtons = (refund: ReturnItem) => {
    // All buttons now go to view details with the current tab
    const tabQs = `?tab=${encodeURIComponent(activeTab)}`;
    
    switch(refund.status) {
      case 'pending':
      case 'negotiation':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="View Details"
            onClick={() => navigate(`/seller/view-refund-details/${refund.id}${tabQs}`)}
          >
            <Eye className="w-3 h-3" />
          </Button>
        );
      case 'approved':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="View Details"
            onClick={() => navigate(`/seller/view-refund-details/${refund.id}${tabQs}`)}
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        );
      case 'dispute':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="View Dispute"
            onClick={() => navigate(`/seller/view-refund-details/${refund.id}${tabQs}`)}
          >
            <AlertTriangle className="w-3 h-3" />
          </Button>
        );
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            title="View Details"
            onClick={() => navigate(`/seller/view-refund-details/${refund.id}${tabQs}`)}
          >
            <FileText className="w-3 h-3" />
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Returns & Cancellations</h1>
            <p className="text-gray-500 text-xs">Manage your refund requests and returns</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                {successMessage}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-auto p-1 text-green-600 hover:text-green-800"
                  onClick={() => setSuccessMessage('')}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Search Bar */}
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                type="text"
                placeholder="Search refunds..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
          </div>

          {/* SIMPLIFIED Status Tabs - Only 4 tabs */}
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

          {/* NO SUB-TABS SECTION - Removed */}

          {/* Refunds List */}
          <div className="space-y-2">
            {filteredRefunds.length === 0 ? (
              <div className="text-center py-4">
                <ShoppingBag className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {activeTab === 'all' ? 'No refund requests found' :
                   activeTab === 'new' ? 'No new refund requests' :
                   activeTab === 'to-process' ? 'No refunds ready to process' :
                   activeTab === 'completed' ? 'No completed, rejected, or cancelled refunds' :
                   'No refunds found'}
                </p>
              </div>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.id);

                return (
                  <Card key={refund.id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">Refund #{refund.id.slice(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <div className="flex items-center gap-1">
                              {refund.order_items && refund.order_items.length > 0 ? (
                                refund.order_items.length === 1 ? (
                                  <>
                                    <img
                                      src={refund.order_items[0].product?.image || "/phon.jpg"}
                                      alt={refund.order_items[0].product?.name}
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                    />
                                    <span className="truncate">{refund.order_items[0].product?.name}</span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                      {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                                        <img
                                          key={index}
                                          src={item.product?.image || "/phon.jpg"}
                                          alt={item.product?.name}
                                          className="w-6 h-6 rounded object-cover border border-white flex-shrink-0"
                                        />
                                      ))}
                                      {refund.order_items.length > 3 && (
                                        <div className="w-6 h-6 rounded bg-gray-300 border border-white flex items-center justify-center text-xs text-gray-600 font-medium flex-shrink-0">
                                          +{refund.order_items.length - 3}
                                        </div>
                                      )}
                                    </div>
                                    <span className="truncate ml-1">
                                      {refund.order_items.length} product{refund.order_items.length > 1 ? 's' : ''} for refund
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="truncate">Product information not available</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">Order: {refund.order_id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{formatDate(refund.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(refund.status)}
                          <button
                            onClick={() => toggleRefundExpansion(refund.id)}
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
                          <RefreshCcw className="w-3 h-3" />
                          <span className="truncate">{refund.reason}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1 truncate">
                          Type: {refund.type} • Method: {refund.preferred_refund_method || 'N/A'}
                        </div>
                        {/* Show payment status if available */}
                        {refund.refund_payment_status && (
                          <div className="text-xs text-gray-500 truncate">
                            Payment Status: {refund.refund_payment_status}
                          </div>
                        )}
                      </div>

                      {/* Expanded Section - Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-2">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Products Being Refunded</div>
                              <div className="text-gray-600 space-y-2">
                                {refund.order_items?.map((item: any, index: number) => (
                                  <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border">
                                      <img
                                        src={item.product?.image || "/phon.jpg"}
                                        alt={item.product?.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{item.product?.name}</div>
                                      <div className="text-gray-500 text-xs truncate">
                                        {item.product?.shop?.name || 'Shop'} • Qty: {item.quantity}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="font-medium text-sm">₱{item.amount || item.price}</div>
                                      <div className="text-gray-500 text-xs">₱{item.price} each</div>
                                    </div>
                                  </div>
                                )) || (
                                  <div className="text-gray-500">No product information available</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Refund Details</div>
                              <div className="text-gray-600 space-y-1">
                                <div>Refund ID: {refund.id}</div>
                                <div>Order ID: {refund.order_id}</div>
                                <div>Refund Amount: ₱{refund.refund_amount || refund.amount || 'N/A'}</div>
                                <div>Request Date: {formatDate(refund.created_at)}</div>
                                <div>Refund Type: {refund.type}</div>
                                <div>Refund Method: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</div>
                                <div>Preferred Method: {refund.preferred_refund_method || 'N/A'}</div>
                                <div>Payment Status: {refund.refund_payment_status || 'pending'}</div>
                                {refund.return_request && (
                                  <div>Return Status: {refund.return_request.status}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Validate that refund_id is a valid UUID
                            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            if (uuidRegex.test(refund.id)) {
                              const tabQs = `?tab=${encodeURIComponent(activeTab)}`;
                              navigate(`/seller/view-refund-details/${refund.id}${tabQs}`);
                            } else {
                              console.error('Invalid refund_id:', refund.id);
                              // You could show an error message here
                            }
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>

                        <div className="flex gap-1">
                          {getActionButtons(refund)}
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