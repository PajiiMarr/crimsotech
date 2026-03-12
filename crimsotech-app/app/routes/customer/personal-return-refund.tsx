import type { Route } from './+types/personal-return-refund';
import SidebarLayout from '~/components/layouts/sidebar';
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
  Ban as CancelledIcon,
  Plus,
  Wallet,
  Landmark,
  Send,
  User as UserIcon
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Personal Returns & Refunds",
    },
  ];
}

// Interface for return/refund/cancel items (SELLER view for personal listings)
interface ReturnItem {
  id: string;
  refund_id?: string;
  order_id: string;
  request_number?: string;
  buyer: {
    id: string;
    name: string;
    email?: string;
  };
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
  amount: number;
  type: 'return' | 'refund' | 'cancellation' | 'failed_delivery';
  refund_type?: 'return' | 'keep';
  status: 'pending' | 'approved' | 'negotiation' | 'rejected' | 'dispute' | 'cancelled' | 'failed';
  reason: string;
  description?: string;
  created_at: string;
  updated_at: string;
  refund_amount?: number;
  preferred_refund_method?: string;
  final_refund_method?: string;
  refund_method?: string;
  refund_payment_status?: string | null;
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
  // Personal listing specific fields
  counter_requests?: Array<{
    id: string;
    status: string;
    counter_refund_method: string;
    counter_refund_type: string;
    counter_refund_amount?: number;
    notes?: string;
    requested_at: string;
  }>;
  buyer_suggested_method?: string;
  buyer_suggested_type?: string;
  buyer_suggested_amount?: number;
} 

interface ReturnStats {
  total_requests: number;
  pending: number;
  negotiation: number;
  approved: number;
  dispute: number;
  rejected: number;
  cancelled: number;
  failed: number;
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
    const { requireRole } = await import('~/middleware/role-require.server');
    // User must be a customer (seller with personal listings)
    await requireRole(request, undefined, ['isCustomer'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  console.log('User ID from session:', userId);

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || undefined;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  try {
    // Build query params
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    const headers: Record<string,string> = { 
      'Accept': 'application/json', 
      'X-User-Id': userId 
    };

    // For personal listings seller view, use get_personal_refunds endpoint
    // This endpoint should return refund requests for the seller's personal listings
    const endpoint = 'get_personal_refunds';
    const res = await fetch(`${API_BASE_URL}/personal-refunds/${endpoint}/${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!res.ok) {
      console.error('Failed to fetch personal refunds:', res.status, res.statusText);
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
      return { 
        user: { id: userId, name: 'Seller', isCustomer: true, isSeller: true, isAdmin: false, isRider: false, isModerator: false }, 
        returnItems: [], 
        stats: defaultStats 
      };
    }

    const data = await res.json();
    console.log('API Response data:', data);

    // API may return { results } or array
    const serverList = Array.isArray(data) ? data : (data.results || data);

    const returnItems: ReturnItem[] = serverList.map((r: any) => ({
      id: r.refund_id || r.refund || r.id,
      refund_id: r.refund_id || r.id,
      order_id: r.order_id || r.order_info?.order_id || r.order?.order || r.order?.order_id || '',
      request_number: r.request_number,
      buyer: {
        id: r.buyer?.id || r.customer?.id || r.user?.id || '',
        name: r.buyer?.name || r.customer?.name || r.user?.username || 'Buyer',
        email: r.buyer?.email || r.customer?.email || r.user?.email
      },
      product: {
        id: r.order_items?.[0]?.product_id || r.order_items?.[0]?.product?.id || 'unknown',
        name: r.order_items?.[0]?.product_name || r.order_items?.[0]?.product?.name || r.order_items?.[0]?.name || 'Product',
        price: Number(r.order_items?.[0]?.price) || Number(r.amount) || 0,
        image: r.order_items?.[0]?.product_image || ''
      },
      quantity: r.order_items?.[0]?.quantity || 1,
      amount: Number(r.total_refund_amount) || Number(r.amount) || Number(r.order_items?.[0]?.total) || 0,
      type: r.refund_type === 'return' ? 'return' : 'refund',
      refund_type: r.refund_type || 'keep',
      status: r.status || 'pending',
      reason: r.reason || '',
      description: r.customer_note || r.detailed_reason || '',
      created_at: r.requested_at || '',
      updated_at: r.updated_at || r.requested_at || '',
      refund_amount: r.total_refund_amount ? Number(r.total_refund_amount) : (r.amount ? Number(r.amount) : undefined),
      preferred_refund_method: r.buyer_preferred_refund_method,
      final_refund_method: r.final_refund_method,
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
      buyer_notified_at: r.buyer_notified_at || null,
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
      } : undefined,
      counter_requests: r.counter_requests,
      buyer_suggested_method: r.buyer_suggested_method,
      buyer_suggested_type: r.buyer_suggested_type,
      buyer_suggested_amount: r.buyer_suggested_amount,
      available_actions: (function(status){
        switch(status){
          case 'pending': return ['approve','reject','propose_negotiation'];
          case 'negotiation': return ['propose_negotiation','contact_buyer'];
          case 'approved': 
            if (r.refund_type === 'return') {
              return ['awaiting_return','process_refund_after_return'];
            }
            return ['process_refund'];
          case 'dispute': return ['contact_buyer','resolve_dispute'];
          case 'rejected': return [];
          case 'cancelled': return [];
          case 'failed': return [];
          default: return [];
        }
      })(r.status)
    }));

    const stats = {
      total_requests: returnItems.length,
      pending: returnItems.filter(i => i.status === 'pending').length,
      negotiation: returnItems.filter(i => i.status === 'negotiation').length,
      approved: returnItems.filter(i => i.status === 'approved').length,
      dispute: returnItems.filter(i => i.status === 'dispute').length,
      rejected: returnItems.filter(i => i.status === 'rejected').length,
      cancelled: returnItems.filter(i => i.status === 'cancelled').length,
      failed: returnItems.filter(i => i.status === 'failed').length,
      return_refund_requests: returnItems.filter(i => i.type === 'return' || i.type === 'refund').length,
      cancellation_requests: returnItems.filter(i => i.type === 'cancellation').length,
      failed_delivery_requests: returnItems.filter(i => i.type === 'failed_delivery').length,
      under_review: returnItems.filter(i => ['pending','negotiation'].includes(i.status)).length,
      returning: returnItems.filter(i => i.status === 'approved' && i.refund_type === 'return').length,
      refunded: returnItems.filter(i => i.status === 'approved').length,
      disputed: returnItems.filter(i => i.status === 'dispute').length,
      rejected_cancelled: returnItems.filter(i => ['rejected','cancelled','failed'].includes(i.status)).length,
    };

    const userObj = { 
      id: userId, 
      name: 'Personal Seller', 
      isCustomer: true, 
      isSeller: true, 
      isAdmin: false, 
      isRider: false, 
      isModerator: false 
    };
    
    return { user: userObj, returnItems, stats };

  } catch (err) {
    console.error('Error fetching personal refunds:', err);
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
    const userObj = { 
      id: userId, 
      name: 'Personal Seller', 
      isCustomer: true, 
      isSeller: true, 
      isAdmin: false, 
      isRider: false, 
      isModerator: false 
    };
    return { user: userObj, returnItems: [], stats: defaultStats };
  }
}

// Empty state component
const EmptyTable = ({ message = "No refund requests found" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <RotateCcw className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto text-sm">
        Buyers' return, refund, and cancellation requests for your personal listings will appear here.
      </p>
    </div>
  </div>
);

// Tabs for seller view (personal listings)
const STATUS_TABS = [
  { id: 'all', label: 'All Requests', icon: List },
  { id: 'new', label: 'New Requests', icon: Clock },
  { id: 'to-process', label: 'To Process', icon: RefreshCcw },
  { id: 'disputes', label: 'Disputes', icon: ShieldAlert },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
];

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: '#f59e0b', icon: Clock, bgColor: '#fffbeb' },
  negotiation: { label: 'Negotiation', color: '#3b82f6', icon: MessageCircle, bgColor: '#eff6ff' },
  approved: { label: 'Approved', color: '#10b981', icon: CheckCircle, bgColor: '#ecfdf5' },
  dispute: { label: 'Dispute', color: '#8b5cf6', icon: ShieldAlert, bgColor: '#f5f3ff' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: XCircle, bgColor: '#fef2f2' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: X, bgColor: '#f9fafb' },
  failed: { label: 'Failed', color: '#dc2626', icon: AlertTriangle, bgColor: '#fef2f2' }
};

// Type configuration
const TYPE_CONFIG = {
  return: { label: 'Return', color: '#3b82f6', icon: RotateCcw, bgColor: '#eff6ff' },
  refund: { label: 'Refund', color: '#10b981', icon: PhilippinePeso, bgColor: '#ecfdf5' },
  cancellation: { label: 'Cancellation', color: '#ef4444', icon: X, bgColor: '#fef2f2' },
  failed_delivery: { label: 'Failed Delivery', color: '#dc2626', icon: TruckIcon, bgColor: '#fef2f2' }
};

// Refund method configuration
const REFUND_METHOD_CONFIG = {
  wallet: { label: 'E-Wallet', icon: Wallet, color: '#8b5cf6', bgColor: '#f5f3ff' },
  bank: { label: 'Bank Transfer', icon: Landmark, color: '#3b82f6', bgColor: '#eff6ff' },
  remittance: { label: 'Remittance', icon: Send, color: '#10b981', bgColor: '#ecfdf5' },
  voucher: { label: 'Store Voucher', icon: CreditCard, color: '#f59e0b', bgColor: '#fffbeb' }
};

export default function PersonalReturnRefundCancel(props: Route.ComponentProps) {
  const defaultUser = {
    id: '',
    name: 'Personal Seller',
    isCustomer: true,
    isSeller: true,
    isAdmin: false,
    isRider: false,
    isModerator: false,
  };

  const defaultStats: ReturnStats = {
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

  const loaderData = (props as { loaderData?: any }).loaderData;
  const user = loaderData?.user ?? defaultUser;
  const initialReturnItems = loaderData?.returnItems ?? [];
  const stats = loaderData?.stats ?? defaultStats;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'all');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredRefunds, setFilteredRefunds] = useState<ReturnItem[]>([]);
  const [refundData, setRefundData] = useState<ReturnItem[]>(initialReturnItems);
  const [loading, setLoading] = useState(!loaderData);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get refunds for current tab based on seller logic
  const getRefundsForTab = (tabId: string): ReturnItem[] => {
    if (!refundData) return [];

    const refunds = Array.isArray(refundData) ? refundData : [];

    switch(tabId) {
      case 'all':
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
        return refunds.filter(refund => 
          String(refund.status).toLowerCase() === 'dispute' || 
          String(refund.dispute?.status || '').toLowerCase() === 'under_review'
        );

      case 'completed':
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
      console.log('Initial refund data for personal seller:', {
        userId: user?.id,
        refundCount: initialReturnItems.length,
        refunds: initialReturnItems.map((r: ReturnItem) => ({
          id: r.id,
          order_id: r.order_id,
          buyer: r.buyer?.name,
          status: r.status,
          refund_type: r.refund_type,
          refund_payment_status: r.refund_payment_status,
          amount: r.amount
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
          refund.order_id.toLowerCase().includes(search.toLowerCase()) ||
          refund.buyer?.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      setFilteredRefunds(filtered);
    }
  }, [search, activeTab, refundData]);

  const fetchRefundData = async () => {
    try {
      console.log('Fetching refund data for personal seller:', { userId: user?.id });
      const response = await AxiosInstance.get('/personal-refunds/get_personal_refunds/', {
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
                   { label: status, color: '#6b7280', icon: Clock, bgColor: '#f9fafb' };
    const Icon = config.icon;

    return (
      <Badge
        className="text-[10px] h-5 px-1.5 py-0 flex items-center gap-1"
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
    // All buttons go to view details with the current tab
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
            onClick={() => navigate(`/personal/view-refund-details/${refund.id}${tabQs}`)}
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
            onClick={() => navigate(`/personal/view-refund-details/${refund.id}${tabQs}`)}
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
            onClick={() => navigate(`/personal/view-refund-details/${refund.id}${tabQs}`)}
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
            onClick={() => navigate(`/personal/view-refund-details/${refund.id}${tabQs}`)}
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
            <h1 className="text-lg font-bold">Personal Returns & Refunds</h1>
            <p className="text-gray-500 text-xs">Manage refund requests from buyers for your personal listings</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-2">
                <div className="text-xs text-blue-600 font-medium">Total</div>
                <div className="text-lg font-bold text-blue-700">{stats.total_requests}</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-2">
                <div className="text-xs text-yellow-600 font-medium">Pending</div>
                <div className="text-lg font-bold text-yellow-700">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-2">
                <div className="text-xs text-green-600 font-medium">Approved</div>
                <div className="text-lg font-bold text-green-700">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-2">
                <div className="text-xs text-purple-600 font-medium">Disputes</div>
                <div className="text-lg font-bold text-purple-700">{stats.dispute}</div>
              </CardContent>
            </Card>
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
                placeholder="Search by reason, refund ID, order ID, or buyer name..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-8 text-sm h-8"
              />
            </div>
          </div>

          {/* Status Tabs - Seller View */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2 pb-1">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
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

          {/* Refunds List */}
          <div className="space-y-2">
            {filteredRefunds.length === 0 ? (
              <EmptyTable 
                message={
                  activeTab === 'all' ? 'No refund requests found' :
                  activeTab === 'new' ? 'No new refund requests' :
                  activeTab === 'to-process' ? 'No refunds ready to process' :
                  activeTab === 'disputes' ? 'No disputes' :
                  activeTab === 'completed' ? 'No completed refunds' :
                  'No refunds found'
                }
              />
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.id);

                return (
                  <Card key={refund.id} className="overflow-hidden border hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              Refund #{refund.request_number || refund.id.slice(0, 8)}
                            </span>
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
                                    <span className="truncate max-w-[150px]">{refund.order_items[0].product?.name}</span>
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
                                      {refund.order_items.length} items
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="truncate">Product information not available</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <UserIcon className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[100px]">{refund.buyer?.name || 'Buyer'}</span>
                            <span>•</span>
                            <span className="truncate">Order: {refund.order_id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{formatDate(refund.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(refund.status)}
                          {refund.preferred_refund_method && (
                            <Badge
                              className="text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 bg-gray-50"
                              style={{ color: '#6b7280' }}
                            >
                              <Wallet className="w-2.5 h-2.5" />
                              {refund.preferred_refund_method}
                            </Badge>
                          )}
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
                          <RefreshCcw className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{refund.reason}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span>Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</span>
                          <span>•</span>
                          <span>Amount: ₱{refund.refund_amount || refund.amount}</span>
                          <span>•</span>
                          <span>Qty: {refund.quantity}</span>
                        </div>
                        {/* Show buyer suggestion if in negotiation */}
                        {refund.status === 'negotiation' && refund.buyer_suggested_amount && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-1.5 rounded">
                            <span className="font-medium">Buyer suggested: </span>
                            ₱{refund.buyer_suggested_amount} 
                            {refund.buyer_suggested_type && ` (${refund.buyer_suggested_type === 'return' ? 'Return' : 'Keep'})`}
                          </div>
                        )}
                        {/* Show return status */}
                        {refund.return_request && refund.return_request.status && (
                          <div className="text-xs text-gray-500 mt-1">
                            Return Status: {refund.return_request.status.replace('_', ' ')}
                            {refund.return_request.tracking_number && (
                              <span className="ml-2">• Tracking: {refund.return_request.tracking_number}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Section - Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-3">
                            {/* Products */}
                            <div>
                              <div className="font-medium text-gray-700 mb-2">Products Being Refunded</div>
                              <div className="text-gray-600 space-y-2">
                                {refund.order_items && refund.order_items.length > 0 ? (
                                  refund.order_items.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                      <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border">
                                        <img
                                          src={item.product?.image || "/phon.jpg"}
                                          alt={item.product?.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{item.product?.name}</div>
                                        <div className="text-gray-500 text-xs">
                                          Qty: {item.quantity}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="font-medium text-sm">₱{item.amount || item.price}</div>
                                        <div className="text-gray-500 text-xs">₱{item.price} each</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-gray-500">No product information available</div>
                                )}
                              </div>
                            </div>

                            {/* Refund Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Request Details</div>
                                <div className="text-gray-600 space-y-1">
                                  <div><span className="text-gray-400">Refund ID:</span> {refund.id.slice(0, 8)}</div>
                                  <div><span className="text-gray-400">Order ID:</span> {refund.order_id.slice(0, 8)}</div>
                                  <div><span className="text-gray-400">Buyer:</span> {refund.buyer?.name || 'N/A'}</div>
                                  <div><span className="text-gray-400">Request Date:</span> {formatDate(refund.created_at)}</div>
                                  <div><span className="text-gray-400">Last Updated:</span> {formatDate(refund.updated_at)}</div>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Payment Details</div>
                                <div className="text-gray-600 space-y-1">
                                  <div><span className="text-gray-400">Refund Amount:</span> ₱{refund.refund_amount || refund.amount}</div>
                                  <div><span className="text-gray-400">Preferred Method:</span> {refund.preferred_refund_method || 'N/A'}</div>
                                  <div><span className="text-gray-400">Payment Status:</span> {refund.refund_payment_status || 'pending'}</div>
                                  {refund.final_refund_method && (
                                    <div><span className="text-gray-400">Final Method:</span> {refund.final_refund_method}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            if (uuidRegex.test(refund.id)) {
                              const tabQs = `?tab=${encodeURIComponent(activeTab)}`;
                              navigate(`/personal/view-refund-details/${refund.id}${tabQs}`);
                            } else {
                              console.error('Invalid refund_id:', refund.id);
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