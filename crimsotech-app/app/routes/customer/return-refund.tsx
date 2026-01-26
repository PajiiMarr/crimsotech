"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import type { Route } from './+types/return-refund';
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import AxiosInstance from '~/components/axios/Axios';
import {
  Clock,
  Package,
  CheckCircle,
  XCircle,
  RefreshCcw,
  MessageCircle,
  AlertTriangle,
  Truck,
  Shield,
  ShoppingBag,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Store,
  CalendarDays,
  List
} from 'lucide-react';

import type { User } from '~/contexts/user-role';

export function meta(): Route.MetaDescriptors {
  return [{ title: "Return - Refund" }]
}
// Types for refund data
interface OrderItem {
  checkout_id: string;
  product_name: string;
  shop_name: string;
  quantity: number;
  price: string;
  subtotal: string;
  product_image?: string;
}

interface OrderInfo {
  order_id: string;
  total_amount: string;
  items: OrderItem[];
}

interface RefundItem {
  refund_id: string;
  reason: string;
  detailed_reason?: string;
  buyer_preferred_refund_method: string;
  refund_type: string;
  status: string;
  customer_note?: string;
  final_refund_method?: string;
  refund_payment_status: string;
  requested_at: string;
  processed_at?: string;
  order_id: string;
  order_info?: any;
  medias?: any[];
  dispute_request?: any;
  evidence?: any[];
  available_actions?: string[];
  [key: string]: any; // For additional fields
}

interface RefundResponse {
  refund_id: string;
  reason: string;
  detailed_reason?: string;
  buyer_preferred_refund_method: string;
  refund_type: string;
  status: string;
  customer_note?: string;
  final_refund_method?: string;
  refund_payment_status: string;
  requested_at: string;
  processed_at?: string;
  order_id: string;
  medias?: any[];
  dispute_request?: any;
  order_info?: any;
  evidence?: any[];
  available_actions?: string[];
  [key: string]: any; // For additional fields
}[]

interface LoaderData {
  user: User;
  refundData: RefundResponse | null;
}

// UPDATED TABS - Exactly 4 tabs as requested
const STATUS_TABS = [
  { id: 'pending-request', label: 'Pending Request', icon: Clock },
  { id: 'to-process', label: 'To Process', icon: RefreshCcw },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

// Status configuration for badges
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  negotiation: { label: 'Negotiation', color: 'bg-blue-100 text-blue-800', icon: MessageCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  to_ship: { label: 'To Ship', color: 'bg-orange-100 text-orange-800', icon: Truck },
  shipped: { label: 'Shipped', color: 'bg-blue-100 text-blue-800', icon: Truck },
  received: { label: 'Received', color: 'bg-purple-100 text-purple-800', icon: Package },
  inspected: { label: 'Inspected', color: 'bg-indigo-100 text-indigo-800', icon: Eye },
  dispute: { label: 'Dispute', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
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
    // Fetch refund data from backend
    const response = await AxiosInstance.get<RefundResponse>('/return-refund/get_my_refunds/', {
      headers: {
        'X-User-Id': user?.user_id || ''
      }
    });

    return {
      user: user || {
        isAdmin: false,
        isCustomer: true,
        isRider: false,
        isModerator: false,
        user_id: ''
      },
      refundData: response.data
    };
  } catch (error) {
    console.error('Error fetching refund data:', error);

    // Return empty data on error
    return {
      user: user || {
        isAdmin: false,
        isCustomer: true,
        isRider: false,
        isModerator: false,
        user_id: ''
      },
      refundData: null
    };
  }
}

export default function CustomerReturnCancel({ loaderData }: Route.ComponentProps) {
  const { user, refundData: initialRefundData } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'pending-request');
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filteredRefunds, setFilteredRefunds] = useState<RefundItem[]>([]);
  const [refundData, setRefundData] = useState<RefundResponse | null>(initialRefundData);
  const [loading, setLoading] = useState(!initialRefundData);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get refunds for current tab - UPDATED LOGIC
  const getRefundsForTab = (tabId: string): RefundItem[] => {
    if (!refundData) return [];

    // refundData is an array of refunds from get_my_refunds API
    const refunds = Array.isArray(refundData) ? refundData : [];

    switch(tabId) {
      case 'pending-request':
        // Pending Request: New refund requests pending seller review
        return refunds.filter(refund =>
          String(refund.status).toLowerCase() === 'pending' &&
          String(refund.refund_payment_status).toLowerCase() === 'pending'
        );

      case 'to-process':
        // To Process tab - buyer-side items they need to act on or track
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const rtype = String(refund.refund_type || '').toLowerCase();
          const rrStatus = (refund.return_request?.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();

          // Negotiations awaiting buyer response
          if (st === 'negotiation' && paymentStatus === 'pending') return true;

          // Awaiting Shipment: approved returns waiting for buyer to ship
          if (rtype === 'return' && st === 'approved' && paymentStatus === 'pending' && (!rrStatus || !['shipped','received'].includes(rrStatus))) return true;

          // In Transit (shipped by buyer)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'shipped') return true;

          // Received (need inspection)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'received') return true;

          // Inspection Complete (decision)
          if (rtype === 'return' && st === 'approved' && rrStatus === 'inspected') return true;

          // Ready to Process Payment
          if (st === 'approved' && (
            (rtype === 'keep' && paymentStatus === 'processing') ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          )) return true;

          return false;
        });

      case 'disputes':
        // Disputes tab - only disputes
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          return st === 'dispute';
        });

      case 'completed':
        // Completed: Includes completed, rejected, cancelled, failed
        return refunds.filter(refund => {
          const st = String(refund.status || '').toLowerCase();
          const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
          
          return paymentStatus === 'completed' ||
                 ['rejected', 'cancelled', 'failed'].includes(st) ||
                 (st === 'approved' && refund.return_request?.status === 'rejected');
        });

      default:
        return refunds;
    }
  };

  useEffect(() => {
    if (!initialRefundData) {
      fetchRefundData();
    }
  }, [initialRefundData]);

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
        filtered = filtered.filter((refund: RefundItem) =>
          refund.reason.toLowerCase().includes(search.toLowerCase()) ||
          refund.refund_id.toLowerCase().includes(search.toLowerCase()) ||
          refund.order_id.toLowerCase().includes(search.toLowerCase())
        );
      }

      setFilteredRefunds(filtered);
    }
  }, [search, activeTab, refundData]);

  const fetchRefundData = async () => {
    try {
      const response = await AxiosInstance.get('/return-refund/get_my_refunds/', {
        headers: {
          'X-User-Id': user?.user_id || ''
        }
      });
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

  const getStatusBadge = (refund: RefundItem) => {
    // If there's a return request status, use that for more specific status
    let status = refund.status;
    if (refund.return_request?.status) {
      status = refund.return_request.status;
    }
    
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

  const getActionButtons = (refund: RefundItem) => {
    const tabQs = `?tab=${encodeURIComponent(activeTab)}`;
    
    // Check return request status for more specific actions
    const returnStatus = refund.return_request?.status;
    
    if (returnStatus === 'shipped' || returnStatus === 'received' || returnStatus === 'inspected') {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="Track Status"
          onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
        >
          <Truck className="w-3 h-3" />
        </Button>
      );
    }
    
    // Show ship action when buyer has been notified and hasn't created a return_request yet
    if (refund.refund_type === 'return' && refund.status === 'approved' && refund.buyer_notified_at && !refund.return_request) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          title="Ship Item"
          onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
        >
          <Truck className="w-3 h-3" />
        </Button>
      );
    }
    
    switch(refund.status) {
      case 'pending':
      case 'negotiation':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="View Details"
            onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
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
            onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
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
            onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
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
            onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
          >
            <FileText className="w-3 h-3" />
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="View Details"
            onClick={() => navigate(`/view-return-refund/${refund.refund_id}${tabQs}`)}
          >
            <Eye className="w-3 h-3" />
          </Button>
        );
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

          {/* UPDATED Status Tabs - Exactly 4 tabs as requested */}
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
                  {activeTab === 'pending-request' ? 'No pending refund requests found' :
                   activeTab === 'to-process' ? 'No refunds require your action' :
                   activeTab === 'disputes' ? 'No disputes found' :
                   activeTab === 'completed' ? 'No completed, rejected, or cancelled refunds' :
                   'No refunds found'}
                </p>
              </div>
            ) : (
              filteredRefunds.map((refund) => {
                const isExpanded = expandedRefunds.has(refund.refund_id);

                return (
                  <Card key={refund.refund_id} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">Refund #{refund.refund_id.slice(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <div className="flex items-center gap-1">
                              {refund.order_items && refund.order_items.length > 0 ? (
                                refund.order_items.length === 1 ? (
                                  <>
                                    <img
                                      src={refund.order_items[0].product_image || "/phon.jpg"}
                                      alt={refund.order_items[0].product_name}
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                    />
                                    <span className="truncate">{refund.order_items[0].product_name}</span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                      {refund.order_items.slice(0, 3).map((item: any, index: number) => (
                                        <img
                                          key={index}
                                          src={item.product_image || "/phon.jpg"}
                                          alt={item.product_name}
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
                            <span>{formatDate(refund.requested_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(refund)}
                          <button
                            onClick={() => toggleRefundExpansion(refund.refund_id)}
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
                          Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'} • 
                          Method: {refund.buyer_preferred_refund_method || 'N/A'}
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
                                        src={item.product_image || "/phon.jpg"}
                                        alt={item.product_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{item.product_name}</div>
                                      <div className="text-gray-500 text-xs truncate">
                                        {item.shop_name || 'Shop'} • Qty: {item.quantity}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="font-medium text-sm">₱{item.subtotal || item.price}</div>
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
                                <div>Refund ID: {refund.refund_id}</div>
                                <div>Order ID: {refund.order_id}</div>
                                <div>Request Date: {formatDate(refund.requested_at)}</div>
                                <div>Refund Type: {refund.refund_type === 'return' ? 'Return Item' : 'Keep Item'}</div>
                                <div>Preferred Method: {refund.buyer_preferred_refund_method || 'N/A'}</div>
                                <div>Payment Status: {refund.refund_payment_status || 'pending'}</div>
                                {refund.return_request && (
                                  <div>Return Status: {refund.return_request.status}</div>
                                )}
                                {refund.dispute_request && (
                                  <div>Dispute Status: {refund.dispute_request.status}</div>
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
                            if (uuidRegex.test(refund.refund_id)) {
                              const tabQs = `?tab=${encodeURIComponent(activeTab)}`;
                              navigate(`/view-return-refund/${refund.refund_id}${tabQs}`);
                            } else {
                              console.error('Invalid refund_id:', refund.refund_id);
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