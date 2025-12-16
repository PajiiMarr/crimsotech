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
  Shield
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Refund & Return",
    },
  ];
}

// Update interface to match Django Refund model
interface RefundRequest {
  refund: string;  // Changed from id to refund (UUID primary key)
  order_id: string;
  order_ref: string; // Reference to Order object
  product_name: string;
  shop_name: string;
  color: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting' | 'to process' | 'completed';
  requested_at: string;
  refund_amount: number;
  reason: string;
  preferred_refund_method: string;
  final_refund_method?: string; // Added to match Django model
  evidence_count: number;
  image: string;
  last_updated?: string;
  deadline?: string;
  tracking_number?: string; // Added to match Django model
  logistic_service?: string; // Added to match Django model
  seller_response?: string;
  processed_by?: string;
  processed_at?: string;
  requested_by_name?: string;
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

  // Updated refund requests data to match Django model statuses
  const refundRequests: RefundRequest[] = [
    {
      refund: "REF-2024-00123",
      order_id: "ORD-2024-00123",
      order_ref: "ORD-2024-00123",
      product_name: "Apple iPhone 13 Pro",
      shop_name: "TechWorld Shop",
      color: "Black",
      quantity: 1,
      status: "pending",
      requested_at: "2024-01-20T10:30:00Z",
      refund_amount: 45000,
      reason: "Product defective - screen has dead pixels upon arrival",
      preferred_refund_method: "Return Item and Refund to Wallet",
      evidence_count: 4,
      image: "/phon.jpg",
      last_updated: "2024-01-22T14:30:00Z",
      deadline: "2024-01-25T10:30:00Z",
      seller_response: "Under review"
    },
    {
      refund: "REF-2024-00124",
      order_id: "ORD-2024-00124",
      order_ref: "ORD-2024-00124",
      product_name: "Samsung Galaxy Watch 4",
      shop_name: "TechWorld Shop",
      color: "White",
      quantity: 2,
      status: "pending",
      requested_at: "2024-01-19T14:20:00Z",
      refund_amount: 12000,
      reason: "Wrong color delivered",
      preferred_refund_method: "Return Item and Refund to Original Payment",
      evidence_count: 2,
      image: "/controller.jpg",
      last_updated: "2024-01-19T15:20:00Z",
      deadline: "2024-01-24T14:20:00Z"
    },
    {
      refund: "REF-2024-00125",
      order_id: "ORD-2024-00125",
      order_ref: "ORD-2024-00125",
      product_name: "MacBook Air M1",
      shop_name: "GadgetHub",
      color: "Gray",
      quantity: 1,
      status: "approved",
      requested_at: "2024-01-15T09:15:00Z",
      refund_amount: 32000,
      reason: "Doesn't turn on",
      preferred_refund_method: "Return Item and Replacement",
      evidence_count: 3,
      image: "/power_supply.jpg",
      last_updated: "2024-01-18T11:15:00Z",
      tracking_number: "TRK-RET-789012",
      logistic_service: "LBC Express"
    },
    {
      refund: "REF-2024-00126",
      order_id: "ORD-2024-00126",
      order_ref: "ORD-2024-00126",
      product_name: "Wireless Headphones",
      shop_name: "GadgetHub",
      color: "Black",
      quantity: 1,
      status: "waiting",
      requested_at: "2024-01-18T11:30:00Z",
      refund_amount: 8500,
      reason: "Sound quality issues",
      preferred_refund_method: "Return Item and Refund to Bank",
      evidence_count: 2,
      image: "/phon.jpg",
      last_updated: "2024-01-20T09:30:00Z",
      tracking_number: "TRK-RET-123456",
      logistic_service: "J&T Express"
    },
    {
      refund: "REF-2024-00127",
      order_id: "ORD-2024-00127",
      order_ref: "ORD-2024-00127",
      product_name: "USB-C Cable",
      shop_name: "AccessoryStore",
      color: "Silver",
      quantity: 1,
      status: "to process",
      requested_at: "2024-01-22T08:45:00Z",
      refund_amount: 1000,
      reason: "Not working",
      preferred_refund_method: "Return Item and Store Voucher",
      evidence_count: 1,
      image: "/phon.jpg",
      last_updated: "2024-01-23T10:45:00Z",
      seller_response: "Item received and under verification",
      final_refund_method: "Store Voucher"
    },
    {
      refund: "REF-2024-00128",
      order_id: "ORD-2024-00128",
      order_ref: "ORD-2024-00128",
      product_name: "Smartwatch",
      shop_name: "GadgetHub",
      color: "Black",
      quantity: 1,
      status: "completed",
      requested_at: "2024-01-23T16:30:00Z",
      refund_amount: 25000,
      reason: "Battery drains too fast",
      preferred_refund_method: "Return Item and Refund to Wallet",
      evidence_count: 3,
      image: "/phon.jpg",
      last_updated: "2024-01-30T14:30:00Z",
      seller_response: "Refund processed successfully",
      processed_by: "Admin User",
      processed_at: "2024-01-30T15:30:00Z",
      final_refund_method: "Wallet Credit"
    },
    {
      refund: "REF-2024-00129",
      order_id: "ORD-2024-00129",
      order_ref: "ORD-2024-00129",
      product_name: "Digital Camera",
      shop_name: "AccessoryStore",
      color: "Black",
      quantity: 1,
      status: "rejected",
      requested_at: "2024-01-24T11:15:00Z",
      refund_amount: 15000,
      reason: "Damaged during shipping",
      preferred_refund_method: "Return Item and Full Refund",
      evidence_count: 2,
      image: "/phon.jpg",
      last_updated: "2024-01-26T10:15:00Z",
      seller_response: "Request rejected - damage not covered by warranty",
      processed_by: "Moderator User"
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
    refundRequests
  };
}

// Main tabs configuration
const MAIN_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'active', label: 'Active Requests', icon: RefreshCcw },
  { id: 'completed', label: 'Completed', icon: CheckSquare }
];

// Status badges configuration - updated to match Django model
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    description: 'Awaiting seller review'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Request approved'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Request rejected'
  },
  waiting: { 
    label: 'Waiting', 
    color: 'bg-indigo-100 text-indigo-800',
    icon: Package,
    description: 'Waiting for processing'
  },
  'to process': { 
    label: 'To Process', 
    color: 'bg-purple-100 text-purple-800',
    icon: RefreshCcw,
    description: 'Ready for refund processing'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-emerald-100 text-emerald-800',
    icon: CheckSquare,
    description: 'Refund completed'
  }
};

export default function RefundReturn({ loaderData }: Route.ComponentProps) {
  const { user, refundRequests } = loaderData;
  const [activeMainTab, setActiveMainTab] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'deadline'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get available statuses for filtering
  const availableStatuses = ['all', ...Object.keys(STATUS_CONFIG)];

  // Filter refund requests based on active tab
  const getFilteredRequests = () => {
    let filtered = [...refundRequests];
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(item => 
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
        item.refund.toLowerCase().includes(search.toLowerCase()) ||
        item.order_id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply main tab filter
    if (activeMainTab === 'active') {
      filtered = filtered.filter(item => 
        item.status === 'pending' || 
        item.status === 'approved' || 
        item.status === 'waiting' || 
        item.status === 'to process'
      );
    } else if (activeMainTab === 'completed') {
      filtered = filtered.filter(item => 
        item.status === 'completed' || 
        item.status === 'rejected'
      );
    }
    
    // Apply status filter
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === activeStatusFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.refund_amount;
          bValue = b.refund_amount;
          break;
        case 'deadline':
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffMs <= 0) return { text: 'Expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (diffDays > 0) return { text: `${diffDays}d ${diffHours}h left`, color: 'text-green-600', bg: 'bg-green-50' };
    return { text: `${diffHours}h left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
  };

  const getStatusBadge = (status: string, deadline?: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
        >
          <Icon className="w-2.5 h-2.5" />
          {config.label}
        </Badge>
        {deadline && status !== 'completed' && status !== 'rejected' && (
          <Badge 
            variant="outline" 
            className={`text-[10px] h-5 px-1.5 py-0 ${getTimeRemaining(deadline).bg} ${getTimeRemaining(deadline).color}`}
          >
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {getTimeRemaining(deadline).text}
          </Badge>
        )}
      </div>
    );
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return refundRequests.length;
    if (tabId === 'active') return refundRequests.filter(item => 
      item.status === 'pending' || 
      item.status === 'approved' || 
      item.status === 'waiting' || 
      item.status === 'to process'
    ).length;
    if (tabId === 'completed') return refundRequests.filter(item => 
      item.status === 'completed' || item.status === 'rejected'
    ).length;
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
      case 'pending':
        actions.push(
          <Button
            key="contact"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            title="Contact Seller"
            onClick={() => navigate(`/chat/seller/${request.shop_name}`)}
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
        
      case 'rejected':
        actions.push(
          <Button
            key="appeal"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Appeal Decision"
            onClick={() => navigate(`/appeal-refund/${request.refund}`)}
          >
            <AlertCircle className="w-3 h-3" />
          </Button>
        );
        break;
    }

    return actions;
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

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Search requests..."
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

          {/* Main Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2 pb-2">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              const isActive = activeMainTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveMainTab(tab.id);
                    setActiveStatusFilter('all');
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

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2 pb-2">
            {availableStatuses.map((status) => {
              const config = status === 'all' 
                ? { label: 'All Status', color: '', icon: List }
                : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              const Icon = config?.icon || List;
              const isActive = activeStatusFilter === status;
              
              return (
                <button
                  key={status}
                  onClick={() => setActiveStatusFilter(status)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                    isActive 
                      ? 'bg-gray-100 text-gray-800 border border-gray-300' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{config?.label || status}</span>
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
                   activeMainTab === 'all' ? 'No refund requests found' :
                   activeMainTab === 'active' ? 'No active requests' :
                   'No completed requests'}
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
                const timeRemaining = request.deadline ? getTimeRemaining(request.deadline) : null;
                
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
                            <span className="truncate">REF: {request.refund}</span>
                            <span>•</span>
                            <span>{formatDate(request.requested_at)}</span>
                            {timeRemaining && timeRemaining.text === 'Expired' && (
                              <>
                                <span>•</span>
                                <span className="text-red-600 font-medium">Expired</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(request.status, request.deadline)}
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
                            {formatCurrency(request.refund_amount)}
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
                      </div>

                      {/* Product Image */}
                      <div className="my-2">
                        <img 
                          src={request.image} 
                          alt={request.product_name} 
                          className="h-16 w-16 rounded-md object-cover border"
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
                            
                            {/* Deadline Warning */}
                            {timeRemaining && timeRemaining.text === 'Expired' && 
                             request.status !== 'completed' && 
                             request.status !== 'rejected' && (
                              <div className="bg-red-50 border border-red-200 rounded p-2">
                                <div className="flex items-center gap-1 text-red-700 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  <span className="font-medium">Deadline expired</span>
                                </div>
                                <p className="text-red-600 text-xs mt-1">
                                  This request is no longer active. Contact support if needed.
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
                    <p>• Check our refund policy for guidelines</p>
                    <p>• Submit evidence to support your claim</p>
                    <p>• Track your return shipment</p>
                    <p>• Contact seller for status updates</p>
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
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}