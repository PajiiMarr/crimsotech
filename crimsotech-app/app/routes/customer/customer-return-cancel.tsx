"use client";

import type { Route } from './+types/customer-return-cancel';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
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
  CheckSquare,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  MoreVertical,
  Download,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Bell,
  Filter,
  ArrowUpDown,
  Plus,
  AlertTriangle,
  Ban,
  Loader2,
  Shield,
  Handshake as NegotiationIcon,
  CheckCheck,
  AlertOctagon,
  FileSearch,
  Ban as CancelledIcon
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Refund & Return",
    },
  ];
}

// Update interface to match Django Refund model exactly
interface RefundRequest {
  refund: string;  // UUID primary key
  order_id: string;
  order_ref: string; // Reference to Order object
  product_name: string;
  shop_name: string;
  color: string;
  quantity: number;
  // Updated to match Django model statuses
  status: 'pending' | 'negotiation' | 'approved' | 'waiting' | 'to_verify' | 'to_process' | 'dispute' | 'completed' | 'rejected' | 'cancelled';
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  requested_at: string;
  total_refund_amount: number;
  reason: string;
  preferred_refund_method: string;
  final_refund_method?: string;
  evidence_count: number;
  image: string;
  last_updated?: string;
  
  // Additional fields from Django model
  request_number?: string;
  tracking_number?: string;
  logistic_service?: string;
  seller_response?: string;
  processed_by?: string;
  processed_at?: string;
  
  // Negotiation fields
  seller_suggested_method?: string;
  seller_suggested_amount?: number;
  seller_suggested_reason?: string;
  negotiation_deadline?: string;
  is_negotiation_expired?: boolean;
  
  // Dispute fields
  dispute_filed_at?: string;
  dispute_reason?: string;
  
  // Admin response fields
  admin_decision?: string;
  admin_response?: string;
  resolved_at?: string;
  
  // Customer note
  customer_note?: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  console.log("🚀 Loader started for /customer-return-cancel");
  
  try {
    // Import middleware
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { userContext } = await import("~/contexts/user-role");

    // Get user from context or fetch
    let user = context.get(userContext);
    if (!user) {
      user = await fetchUserRole({ request, context });
    }

    // Ensure user is a customer
    await requireRole(request, context, ["isCustomer"]);

    // Get session to get user ID
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get('userId');

    console.log("🔑 User ID from session:", userId);

    if (!userId) {
      console.log("❌ No user ID found in session");
      throw new Response("Unauthorized", { status: 401 });
    }

    // Fetch refund requests from Django backend
    let refundRequests: RefundRequest[] = [];
    let apiError = null;

    try {
      console.log("📡 Fetching refund requests from Django backend...");
      
      // Use your Django backend URL - adjust this based on your environment
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      // Use the registered ViewSet action for buyer refunds
      const API_ENDPOINT = `${API_BASE_URL}/return-refund/get_my_refunds/`;
      
      console.log("🌐 API Endpoint:", API_ENDPOINT);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
          'Accept': 'application/json',
        },
        credentials: 'include', // Important for cookies/session
      });

      console.log("📊 API Response Status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Refund data received from backend:", data.length || 0, "requests");
        
        // Transform backend data to match our frontend interface
        // The viewset returns a list of refunds (serialized), so handle both wrapped and bare lists
        const serverList = data.refunds || data.results || data || [];
        refundRequests = serverList.map((refund: any) => ({
          refund: refund.refund || refund.id,
          order_id: refund.order?.order_number || refund.order_id || refund.order?.order || 'N/A',
          order_ref: refund.order?.id || refund.order_ref,
          product_name: refund.order_item?.product?.name || refund.product_name || (refund.order_item?.product?.name) || 'Product',
          shop_name: refund.order?.shop?.name || refund.shop_name || refund.order?.shop?.name || 'Shop',
          color: refund.order_item?.color || refund.color || '',
          quantity: refund.order_item?.quantity || refund.quantity || 1,
          status: refund.status,
          payment_status: refund.payment_status,
          requested_at: refund.requested_at,
          total_refund_amount: parseFloat(refund.total_refund_amount) || 0,
          reason: refund.reason,
          preferred_refund_method: refund.preferred_refund_method,
          final_refund_method: refund.final_refund_method,
          evidence_count: refund.evidence_count || (refund.refundmedias_count || 0),
          image: refund.order_item?.product?.image || refund.image || '/images/placeholder-product.jpg',
          last_updated: refund.last_updated || refund.updated_at,
          request_number: refund.request_number,
          tracking_number: refund.tracking_number,
          logistic_service: refund.logistic_service,
          seller_response: refund.seller_response,
          processed_by: refund.processed_by?.username || refund.processed_by,
          processed_at: refund.processed_at,
          seller_suggested_method: refund.seller_suggested_method,
          seller_suggested_amount: refund.seller_suggested_amount ? parseFloat(refund.seller_suggested_amount) : undefined,
          seller_suggested_reason: refund.seller_suggested_reason,
          negotiation_deadline: refund.negotiation_deadline,
          is_negotiation_expired: refund.is_negotiation_expired,
          dispute_filed_at: refund.dispute_filed_at,
          dispute_reason: refund.dispute_reason,
          admin_decision: refund.admin_decision,
          admin_response: refund.admin_response,
          resolved_at: refund.resolved_at,
          customer_note: refund.customer_note,
        }));
        
        console.log("✅ Successfully transformed", refundRequests.length, "refund requests");
        
      } else {
        apiError = `API Error ${response.status}: ${response.statusText}`;
        console.error("❌ API Error:", apiError);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error("📋 Error details:", errorData);
          apiError = errorData.detail || errorData.message || errorData.error || apiError;
        } catch (e) {
          console.error("Could not parse error response:", e);
        }
        
        // Throw error to show in UI
        throw new Error(apiError);
      }
    } catch (error) {
      console.error("❌ Network error fetching refunds:", error);
      apiError = error instanceof Error ? error.message : 'Network error';
      
      // Return empty array but include error for debugging
      refundRequests = [];
    }

    console.log("📋 Final refund requests count:", refundRequests.length);
    
    return {
      user: user || {
        id: userId || "demo-customer-123",
        name: "John Customer",
        email: "customer@example.com",
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        username: "john_customer",
      },
      refundRequests,
      apiError: refundRequests.length === 0 ? apiError : null,
    };
    
  } catch (error) {
    console.error("❌ Loader error:", error);
    return {
      user: {
        id: "error-user",
        name: "Error",
        email: "error@example.com",
        isCustomer: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        username: "error_user",
      },
      refundRequests: [],
      apiError: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Status tabs based on Django model statuses
const STATUS_TABS = [
  { id: 'all', label: 'All Requests', icon: List },
  { id: 'pending', label: 'Pending Review', icon: Clock },
  { id: 'negotiation', label: 'Negotiation', icon: NegotiationIcon },
  { id: 'approved', label: 'Approved', icon: CheckCircle },
  { id: 'waiting', label: 'Waiting', icon: Package },
  { id: 'to_verify', label: 'To Verify', icon: FileSearch },
  { id: 'to_process', label: 'To Process', icon: RefreshCcw },
  { id: 'dispute', label: 'Dispute', icon: ShieldAlert },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'rejected', label: 'Rejected', icon: XCircle },
  { id: 'cancelled', label: 'Cancelled', icon: CancelledIcon }
];

// Status badges configuration - updated to match Django model exactly
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    description: 'Awaiting seller review'
  },
  negotiation: { 
    label: 'Negotiation', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: NegotiationIcon,
    description: 'Seller made an offer'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Request approved'
  },
  waiting: { 
    label: 'Waiting For Return', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Package,
    description: 'Waiting for item return'
  },
  to_verify: { 
    label: 'To Verify', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: FileSearch,
    description: 'Item received, under verification'
  },
  to_process: { 
    label: 'To Process', 
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: RefreshCcw,
    description: 'Ready for refund processing'
  },
  dispute: { 
    label: 'Dispute', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: ShieldAlert,
    description: 'Escalated to admin'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCheck,
    description: 'Refund completed'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
    description: 'Request rejected'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CancelledIcon,
    description: 'Request cancelled'
  }
};

// Payment status badges
const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Payment Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Payment Completed', color: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'Payment Failed', color: 'bg-red-50 text-red-700 border-red-200' },
  not_applicable: { label: 'N/A', color: 'bg-gray-50 text-gray-700 border-gray-200' }
};

export default function RefundReturn({ loaderData }: Route.ComponentProps) {
  const { user, refundRequests, apiError } = loaderData;
  // Default to pending tab so pending refunds are visible by default
  const [activeTab, setActiveTab] = useState<string>('pending');
  const navigate = useNavigate();
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'deadline'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // Filter refund requests based on active tab
  const getFilteredRequests = () => {
    let filtered = [...refundRequests];
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        item.refund.toLowerCase().includes(search.toLowerCase()) ||
        item.order_id.toLowerCase().includes(search.toLowerCase()) ||
        (item.request_number && item.request_number.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.status === activeTab);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.total_refund_amount;
          bValue = b.total_refund_amount;
          break;
        case 'deadline':
          aValue = a.negotiation_deadline ? new Date(a.negotiation_deadline).getTime() : 0;
          bValue = b.negotiation_deadline ? new Date(b.negotiation_deadline).getTime() : 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.requested_at).getTime();
          bValue = new Date(b.requested_at).getTime();
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getTimeRemaining = (deadline: string) => {
    try {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffMs <= 0) return { text: 'Expired', color: 'text-red-600', bg: 'bg-red-50' };
      if (diffDays > 0) return { text: `${diffDays}d ${diffHours}h left`, color: 'text-green-600', bg: 'bg-green-50' };
      return { text: `${diffHours}h left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } catch (error) {
      return { text: 'Invalid date', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const getStatusBadge = (status: string, payment_status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const paymentConfig = PAYMENT_STATUS_CONFIG[payment_status as keyof typeof PAYMENT_STATUS_CONFIG];
    const Icon = config.icon;
    
    return (
      <div className="flex flex-col gap-1">
        <Badge 
          className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color} border`}
        >
          <Icon className="w-2.5 h-2.5" />
          {config.label}
        </Badge>
        {paymentConfig && (
          <Badge 
            variant="outline" 
            className={`text-[9px] h-4 px-1 py-0 ${paymentConfig.color}`}
          >
            {paymentConfig.label}
          </Badge>
        )}
      </div>
    );
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return refundRequests.length;
    return refundRequests.filter(item => item.status === tabId).length;
  };

  const toggleRequestExpansion = (requestId: string) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  };

  const getActionButtons = (request: RefundRequest) => {
    const actions = [];
    
    // View Details button for all statuses
    actions.push(
      <Button
        key="view"
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        title="View Details"
        onClick={() => navigate(`/view-customer-return-cancel/${request.refund}?status=${request.status}`)}
      >
        <Eye className="w-3 h-3" />
      </Button>
    );

    // Status-specific actions
    switch(request.status) {
      case 'negotiation':
        actions.push(
          <Button
            key="negotiate"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Respond to Offer"
            onClick={() => navigate(`/negotiate-refund/${request.refund}`)}
          >
            <MessageCircle className="w-3 h-3" />
          </Button>
        );
        break;
        
      case 'approved':
        actions.push(
          <Button
            key="process"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Start Return Process"
            onClick={() => navigate(`/start-return/${request.refund}`)}
          >
            <Package className="w-3 h-3" />
          </Button>
        );
        break;
        
      case 'waiting':
        actions.push(
          <Button
            key="track"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            title="Track Return"
            onClick={() => navigate(`/track-return/${request.refund}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
        );
        break;
        
      case 'dispute':
        actions.push(
          <Button
            key="dispute"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="View Dispute Details"
            onClick={() => navigate(`/dispute-details/${request.refund}`)}
          >
            <AlertCircle className="w-3 h-3" />
          </Button>
        );
        break;
    }

    return actions;
  };

  const getNegotiationInfo = (request: RefundRequest) => {
    if (request.status !== 'negotiation') return null;
    
    const timeRemaining = request.negotiation_deadline ? getTimeRemaining(request.negotiation_deadline) : null;
    
    return (
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NegotiationIcon className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Seller Offer</span>
          </div>
          {timeRemaining && (
            <Badge className={`text-[10px] h-4 ${timeRemaining.bg} ${timeRemaining.color}`}>
              {timeRemaining.text}
            </Badge>
          )}
        </div>
        {request.seller_suggested_method && (
          <p className="text-xs text-blue-700 mt-1">
            {request.seller_suggested_method} - {formatCurrency(request.seller_suggested_amount || 0)}
          </p>
        )}
        {request.seller_suggested_reason && (
          <p className="text-xs text-gray-600 mt-0.5">{request.seller_suggested_reason}</p>
        )}
      </div>
    );
  };

  const getDisputeInfo = (request: RefundRequest) => {
    if (request.status !== 'dispute') return null;
    
    return (
      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3 h-3 text-red-600" />
          <span className="text-xs font-medium text-red-800">Under Admin Review</span>
        </div>
        {request.dispute_reason && (
          <p className="text-xs text-gray-700 mt-1">Your reason: {request.dispute_reason}</p>
        )}
      </div>
    );
  };

  const handleRefresh = () => {
    // This would normally trigger a reload of the loader data
    window.location.reload();
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-4 p-4">
          {/* Header */}
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">Refund & Return Requests</h1>
                <p className="text-gray-500 text-xs">Manage your refund and return requests</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCcw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => navigate('/request-refund')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Request
                </Button>
              </div>
            </div>
          </div>

          {/* API Error Alert */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="text-xs text-red-600 mt-1">
                    Unable to load refund requests from server. Error: {apiError}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs"
                      onClick={handleRefresh}
                    >
                      Retry
                    </Button>
                    <Button 
                      size="sm" 
                      variant="link" 
                      className="h-6 text-xs text-red-700"
                      onClick={() => navigate('/contact-support')}
                    >
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-gray-600">Loading refund requests...</p>
            </div>
          )}

          {/* Main Content (only show when not loading) */}
          {!loading && (
            <>
              {/* Search and Filters */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <Input
                      type="text"
                      placeholder="Search by product, shop, or request number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 text-sm h-8"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setFilterOpen(!filterOpen)}
                  >
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                    Sort
                  </Button>
                </div>

                {filterOpen && (
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Sort By</label>
                        <select 
                          className="w-full text-xs border rounded p-1.5"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                        >
                          <option value="date">Request Date</option>
                          <option value="amount">Refund Amount</option>
                          <option value="deadline">Deadline</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Order</label>
                        <select 
                          className="w-full text-xs border rounded p-1.5"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value as any)}
                        >
                          <option value="desc">Newest First</option>
                          <option value="asc">Oldest First</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Tabs - Horizontal Scrollable */}
              <div className="flex items-center space-x-1 overflow-x-auto mb-2 pb-2">
                {STATUS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const count = getTabCount(tab.id);
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap flex-shrink-0 ${
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

              {/* Requests List */}
              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCcw className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm mb-2">
                      {search ? 'No refund requests match your search' :
                       activeTab === 'all' ? 'No refund requests found' :
                       `No ${STATUS_TABS.find(t => t.id === activeTab)?.label?.toLowerCase() || activeTab} requests`}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/request-refund')}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Create New Request
                    </Button>
                  </div>
                ) : (
                  filteredRequests.map((request) => {
                    const isExpanded = expandedRequests.has(request.refund);
                    
                    return (
                      <Card key={request.refund} className="overflow-hidden border hover:border-blue-200 transition-colors">
                        <CardContent className="p-3">
                          {/* Top Section - Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ShoppingBag className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{request.product_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {request.request_number && (
                                  <>
                                    <span className="truncate">{request.request_number}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{formatDate(request.requested_at)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(request.status, request.payment_status)}
                              <button 
                                onClick={() => toggleRequestExpansion(request.refund)}
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
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Store className="w-3 h-3" />
                                <span className="truncate">{request.shop_name}</span>
                              </div>
                              <div className="font-medium text-sm">
                                <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                                {formatCurrency(request.total_refund_amount)}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-1 truncate">
                              Order: {request.order_id} • Qty: {request.quantity} • {request.color}
                            </div>
                            
                            {/* Short Reason Preview */}
                            <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {request.reason}
                            </div>
                            
                            {/* Evidence Badge */}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <FileText className="w-3 h-3" />
                              <span>{request.evidence_count} evidence file{request.evidence_count !== 1 ? 's' : ''}</span>
                            </div>
                            
                            {/* Negotiation or Dispute Info */}
                            {getNegotiationInfo(request)}
                            {getDisputeInfo(request)}
                          </div>

                          {/* Product Image */}
                          <div className="my-2">
                            <img 
                              src={request.image} 
                              alt={request.product_name} 
                              className="h-16 w-16 rounded-md object-cover border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/phon.jpg';
                              }}
                            />
                          </div>

                          {/* Expanded Section - Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs space-y-2">
                                {/* Refund Details */}
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Refund Details</div>
                                  <div className="text-gray-600 space-y-1">
                                    <div>Requested Method: {request.preferred_refund_method}</div>
                                    {request.final_refund_method && (
                                      <div>Final Method: {request.final_refund_method}</div>
                                    )}
                                    <div>Status: {STATUS_CONFIG[request.status]?.label || request.status}</div>
                                    <div>Payment Status: {PAYMENT_STATUS_CONFIG[request.payment_status]?.label || request.payment_status}</div>
                                    {request.last_updated && (
                                      <div>Last Updated: {formatDate(request.last_updated)}</div>
                                    )}
                                    {request.tracking_number && (
                                      <div>Tracking: {request.tracking_number}</div>
                                    )}
                                    {request.logistic_service && (
                                      <div>Courier: {request.logistic_service}</div>
                                    )}
                                    {request.processed_by && (
                                      <div>Processed By: {request.processed_by}</div>
                                    )}
                                    {request.processed_at && (
                                      <div>Processed At: {formatDate(request.processed_at)}</div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Full Reason */}
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Reason for Refund</div>
                                  <div className="text-gray-600 bg-gray-50 p-2 rounded border">
                                    {request.reason}
                                  </div>
                                </div>
                                
                                {/* Customer Note */}
                                {request.customer_note && (
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      Your Note
                                    </div>
                                    <div className="text-gray-600 bg-gray-50 p-2 rounded border">
                                      {request.customer_note}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Seller Response */}
                                {request.seller_response && (
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                                      <Store className="w-3 h-3" />
                                      Seller Response
                                    </div>
                                    <div className="text-gray-600 bg-gray-50 p-2 rounded border">
                                      {request.seller_response}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Admin Response */}
                                {request.admin_response && (
                                  <div>
                                    <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      Admin Decision
                                    </div>
                                    <div className="text-gray-600 bg-gray-50 p-2 rounded border">
                                      {request.admin_decision && (
                                        <p className="font-medium mb-1">{request.admin_decision}</p>
                                      )}
                                      {request.admin_response}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Deadline Warning */}
                                {request.is_negotiation_expired && (
                                  <div className="bg-red-50 border border-red-200 rounded p-2">
                                    <div className="flex items-center gap-1 text-red-700 text-xs">
                                      <AlertCircle className="w-3 h-3" />
                                      <span className="font-medium">Negotiation expired</span>
                                    </div>
                                    <p className="text-red-600 text-xs mt-1">
                                      The seller's offer has expired. Your request will be updated shortly.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Bottom Section - Actions */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            {/* View Details Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/view-customer-return-cancel/${request.refund}?status=${request.status}`)}
                              className="h-6 px-2 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                            
                            <div className="flex gap-1">
                              {getActionButtons(request)}
                              
                              {/* More Actions Dropdown */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                title="More Actions"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Help Section */}
              <Card className="border border-blue-100 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-800 mb-1">Refund Process Information</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>• Each status represents a step in the refund process</p>
                        <p>• Negotiation: Seller has made a counter-offer</p>
                        <p>• Dispute: Case escalated to admin for review</p>
                        <p>• Check payment status for refund progress</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="link" className="h-6 px-0 text-xs text-blue-700">
                          View Refund Policy
                        </Button>
                        <Button size="sm" variant="link" className="h-6 px-0 text-xs text-blue-700">
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}