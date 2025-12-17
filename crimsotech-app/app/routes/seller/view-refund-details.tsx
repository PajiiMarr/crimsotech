import { UserProvider as ClientUserProvider } from '~/components/providers/user-role-provider';
import { Link, useLoaderData, data, useNavigate } from 'react-router';
import { useState } from 'react';
import { useToast } from '~/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Progress } from '~/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';

import {
  ArrowLeft, FileText, MapPin, Package, Truck, CreditCard,
  Clock, CheckCircle, XCircle, MessageCircle, AlertTriangle,
  Calendar, User, Phone, Mail, ShoppingBag, Wallet, Building,
  ChevronDown, Printer, Copy, Download, Eye, MoreVertical,
  Store, RotateCcw, PackageCheck, RefreshCw, CheckSquare,
  Ban, HelpCircle, Info, MessageSquare, ShieldAlert, ExternalLink,
  Upload, TrendingUp, TrendingDown, Filter, Search, Settings,
  Heart, Star, ThumbsUp, ThumbsDown, ArrowRight, Home,
  Hash, Tag, PieChart, BarChart3, Layers, Activity
} from 'lucide-react';

type RefundStatus =
  | 'pending'
  | 'negotiation'
  | 'approved'
  | 'waiting'
  | 'to_verify'
  | 'to_process'
  | 'dispute'
  | 'completed'
  | 'rejected'
  | 'cancelled';

interface RefundDetails {
  refund?: string;
  id?: string;
  request_number?: string;
  status?: RefundStatus;
  reason?: string;
  requested_at?: string;
  processed_at?: string;
  total_refund_amount?: number | string | null;
  preferred_refund_method?: string | null;
  final_refund_method?: string | null;
  seller_response?: string | null;
  customer_note?: string | null;
  tracking_number?: string | null;
  logistic_service?: string | null;

  shop?: {
    id?: string;
    name?: string;
    is_suspended?: boolean;
  };

  evidence?: Array<{
    id: string;
    url: string | null;
    file_type?: string | null;
  }>;

  order_info?: {
    order_number?: string;
    order_id?: string;
    user_id?: string;
    created_at?: string;
    payment_method?: string;
    total_amount?: number | null;
    status?: string;
    delivery_method?: string | null;
    delivery_address_text?: string | null;
    shipping_address?: {
      recipient_name?: string;
      recipient_phone?: string;
      full_address?: string;
    } | null;
  } | null;

  order_items?: Array<{
    checkout_id?: string;
    checkout_status?: string;
    checkout_total_amount?: number | null;
    checkout_quantity?: number;
    product?: {
      id?: string;
      name?: string;
      description?: string;
      price?: number | null;
      condition?: string;
      category_name?: string | null;
      shop_name?: string | null;
      skus?: Array<{
        id: string;
        sku_code?: string | null;
        price?: number | null;
        image?: string | null;
        option_ids?: any;
      }>;
      variants?: Array<{
        id: string;
        title: string;
        options?: Array<{ id: string; title: string }>;
      }>;
    } | null;
  }>;

  delivery?: {
    status?: string;
    picked_at?: string | null;
    delivered_at?: string | null;
    tracking_number?: string | null;
  } | null;

  available_actions?: string[];
}

// Status Configuration for Seller View
const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: Clock,
    description: 'Review the request and decide to approve, reject, or negotiate',
    sellerAction: 'Review within 48 hours',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'current', icon: Clock },
      { label: 'Seller Response', status: 'pending', icon: MessageCircle },
      { label: 'Customer Response', status: 'pending', icon: User },
      { label: 'Return Process', status: 'pending', icon: Package },
      { label: 'Refund Process', status: 'pending', icon: Wallet },
    ]
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: MessageCircle,
    description: 'Negotiating terms with customer',
    sellerAction: 'Await customer response',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Offer Sent', status: 'current', icon: MessageCircle },
      { label: 'Customer Response', status: 'pending', icon: User },
      { label: 'Agreement', status: 'pending', icon: CheckCircle },
      { label: 'Return Process', status: 'pending', icon: Package },
    ]
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
    description: 'Return request approved',
    sellerAction: 'Await item return',
    progress: 3,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Sent', status: 'completed', icon: CheckCircle },
      { label: 'Awaiting Return', status: 'current', icon: Package },
      { label: 'Item Verification', status: 'pending', icon: PackageCheck },
      { label: 'Refund Process', status: 'pending', icon: Wallet },
    ]
  },
  waiting: {
    label: 'Waiting For Return',
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    icon: Package,
    description: 'Waiting for customer to return the item',
    sellerAction: 'Monitor return status',
    progress: 4,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Approval Sent', status: 'completed', icon: CheckCircle },
      { label: 'Return Scheduled', status: 'completed', icon: Calendar },
      { label: 'In Transit', status: 'current', icon: Truck },
      { label: 'Item Received', status: 'pending', icon: Package },
      { label: 'Verification', status: 'pending', icon: PackageCheck },
    ]
  },
  to_verify: {
    label: 'To Verify',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    icon: PackageCheck,
    description: 'Item received, needs verification',
    sellerAction: 'Verify item condition within 3 days',
    progress: 5,
    timeline: [
      { label: 'Item Received', status: 'completed', icon: Package },
      { label: 'Quality Check', status: 'current', icon: PackageCheck },
      { label: 'Condition Assessment', status: 'pending', icon: CheckCircle },
      { label: 'Verification Complete', status: 'pending', icon: CheckSquare },
    ]
  },
  to_process: {
    label: 'To Process',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    icon: RefreshCw,
    description: 'Ready for refund processing',
    sellerAction: 'Process refund within 3-5 days',
    progress: 6,
    timeline: [
      { label: 'Verification Complete', status: 'completed', icon: CheckSquare },
      { label: 'Refund Processing', status: 'current', icon: RefreshCw },
      { label: 'Refund Sent', status: 'pending', icon: Wallet },
      { label: 'Completed', status: 'pending', icon: CheckCircle },
    ]
  },
  dispute: {
    label: 'Dispute',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    icon: AlertTriangle,
    description: 'Under admin review',
    sellerAction: 'Await admin decision',
    progress: 3,
    timeline: [
      { label: 'Dispute Filed', status: 'completed', icon: AlertTriangle },
      { label: 'Admin Review', status: 'current', icon: ShieldAlert },
      { label: 'Decision Made', status: 'pending', icon: CheckCircle },
    ]
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    icon: CheckSquare,
    description: 'Return and refund completed',
    sellerAction: 'Process finished',
    progress: 7,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Item Verified', status: 'completed', icon: PackageCheck },
      { label: 'Refund Processed', status: 'completed', icon: Wallet },
      { label: 'Completed', status: 'current', icon: CheckSquare },
    ]
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 hover:bg-red-100',
    icon: XCircle,
    description: 'Request rejected',
    sellerAction: 'Request denied',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Review Complete', status: 'completed', icon: CheckCircle },
      { label: 'Rejected', status: 'current', icon: XCircle },
    ]
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    icon: Ban,
    description: 'Request cancelled',
    sellerAction: 'Request cancelled',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Cancelled', status: 'current', icon: Ban },
    ]
  }
};

function formatMoney(value: unknown) {
  const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function meta() {
  return [{ title: 'View Refund Details' }];
}

export async function loader({ request, context, params }: { request: Request; context: any; params?: Record<string, string | undefined> }) {
  // Session+role checks
  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
    // Only require customer role; customers may own a shop
    await requireRole(request, undefined, ['isCustomer'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  const shopIdFromSession = session.get('shopId');

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const refundId =
    params?.refundId ||
    url.searchParams.get('refund_id') ||
    url.searchParams.get('refund') ||
    url.searchParams.get('id');

  const shopId =
    url.searchParams.get('shop_id') || (typeof shopIdFromSession === 'string' ? shopIdFromSession : undefined);

  // If shop_id supplied via URL, persist to session for following pages
  const { commitSession } = await import('~/sessions.server');
  if (shopId && typeof shopIdFromSession !== 'string') {
    session.set('shopId', shopId);
    // Debug log
    console.debug('Persisting shopId to session from view-refund-details loader', { shopId });
  }

  if (!refundId) {
    throw new Response('refund_id is required', { status: 400 });
  }

  if (!shopId) {
    throw new Response('shop_id is required', { status: 400 });
  }

  // Basic validation and debug
  if (/\./.test(refundId)) {
    throw new Response('Invalid refund identifier', { status: 400 });
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const endpoint = `${API_BASE_URL}/return-refund/${refundId}/get_refund_details/?shop_id=${encodeURIComponent(shopId)}`;
  console.debug('Seller view-refund-details loader', { refundId, shopId, endpoint });

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User-Id': userId,
      'X-Shop-Id': shopId,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Response(text || 'Failed to load refund details', { status: res.status });
  }

  const refund: RefundDetails = await res.json();
  const user = {
    isAdmin: false,
    isCustomer: true,
    isRider: false,
    isModerator: false,
    user_id: userId,
  };

  return data(
    { userId, shopId, refundId, refund, user },
    { headers: { 'Set-Cookie': await commitSession(session) } },
  );
}

// Status-specific UI components for seller
function PendingStatusUI({ refund, formatDate, formatMoney, navigate, shopId, onAction, actionLoading }: any) {
  const statusConfig = STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refund.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{refund.order_info?.order_number} • Requested on {formatDate(refund.requested_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Action Required: Review Request</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Customer has requested a refund. Please review and respond within 48 hours.
              </AlertDescription>
            </Alert>

            {/* Customer Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer ID</p>
                  <p className="text-sm font-medium">{refund.order_info?.user_id || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="text-sm font-medium">{formatDate(refund.order_info?.created_at)}</p>
                </div>
              </div>
              {refund.order_info?.shipping_address && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Shipping Address</p>
                  <p className="text-sm">{refund.order_info.shipping_address.full_address || '—'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span>{refund.order_info.shipping_address.recipient_name}</span>
                    <span>•</span>
                    <span>{refund.order_info.shipping_address.recipient_phone}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Request Details */}
            <div>
              <h3 className="text-sm font-medium mb-3">Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Amount</p>
                    <p className="text-xl font-bold text-green-600">{formatMoney(refund.total_refund_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Method</p>
                    <div className="flex items-center gap-2">
                      {refund.preferred_refund_method === 'wallet' && <Wallet className="h-4 w-4 text-blue-600" />}
                      {refund.preferred_refund_method === 'original_payment' && <CreditCard className="h-4 w-4 text-purple-600" />}
                      <span className="text-sm font-medium capitalize">{refund.preferred_refund_method?.replace('_', ' ') || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="text-sm font-medium">{refund.reason || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Note</p>
                    <p className="text-sm">{refund.customer_note || 'No additional notes'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Items Requested for Return</CardTitle>
            <CardDescription>Review items and their conditions</CardDescription>
          </CardHeader>
          <CardContent>
            {!refund.order_items?.length ? (
              <div className="text-sm text-muted-foreground">No items found.</div>
            ) : (
              <div className="space-y-4">
                {refund.order_items.map((it: OrderItem, idx: number) => (
                  <div key={it.checkout_id || String(idx)} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 flex-shrink-0">
                          {it.product?.skus?.[0]?.image ? (
                            <img
                              src={it.product.skus[0].image}
                              alt={it.product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{it.product?.name || 'Product'}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{it.product?.description || ''}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Qty: {it.checkout_quantity ?? '—'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatMoney(it.product?.price)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Checkout Total</div>
                        <div className="font-medium">{formatMoney(it.checkout_total_amount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Actions & Timeline */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs"
              onClick={() => navigate(`/seller/refund/approve/${refund.id}?shop_id=${shopId}`)}
            >
              <CheckCircle className="h-3 w-3 mr-1.5" />
              Approve Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/seller/refund/negotiate/${refund.id}?shop_id=${shopId}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Make Offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/seller/refund/reject/${refund.id}?shop_id=${shopId}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Reject Request
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View Order Details
            </Button>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Request Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusConfig.timeline.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === 'completed' ? 'bg-green-100 text-green-600' :
                  step.status === 'current' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'current' ? 'text-yellow-700' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {step.status === 'current' ? 'Action required' : 'Completed'}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Response Deadline</p>
                <p className="text-xs text-blue-700 mt-1">
                  Please respond within 48 hours of request to avoid automatic escalation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovedStatusUI({ refund, formatDate, formatMoney, navigate, shopId }: any) {
  const statusConfig = STATUS_CONFIG.approved;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refund.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{refund.order_info?.order_number} • Approved on {formatDate(refund.processed_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Request Approved</AlertTitle>
              <AlertDescription className="text-green-700">
                Customer has been notified and can now return the item. Prepare to receive the return.
              </AlertDescription>
            </Alert>

            {/* Return Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Return Instructions</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Expected Return Method:</p>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Customer arranges return</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Return Deadline:</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">7 days from approval</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border rounded p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">When item is received:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Verify item condition matches photos</li>
                    <li>• Check for all accessories and packaging</li>
                    <li>• Update status to "To Verify"</li>
                    <li>• Process refund within 3-5 days after verification</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Customer Communication */}
            {refund.seller_response && (
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Your Response to Customer</h3>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm">{refund.seller_response}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/seller/refund/mark-received/${refund.id}?shop_id=${shopId}`)}
            >
              <PackageCheck className="h-3 w-3 mr-1.5" />
              Mark as Received
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/seller/refund/update-tracking/${refund.id}?shop_id=${shopId}`)}
            >
              <Truck className="h-3 w-3 mr-1.5" />
              Update Tracking
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/seller/refund/cancel/${refund.id}?shop_id=${shopId}`)}
            >
              <Ban className="h-3 w-3 mr-1.5" />
              Cancel Approval
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-green-100 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Approved Successfully</p>
                <p className="text-xs text-green-700 mt-1">
                  Customer has been notified. Await item return within 7 days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompletedStatusUI({ refund, formatDate, formatMoney, navigate, shopId }: any) {
  const statusConfig = STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refund.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{refund.order_info?.order_number} • Completed on {formatDate(refund.processed_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">Refund Completed</AlertTitle>
              <AlertDescription className="text-emerald-700">
                This refund request has been successfully completed.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Refund Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount Refunded:</span>
                    <span className="text-lg font-bold text-emerald-700">{formatMoney(refund.total_refund_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Method:</span>
                    <span className="text-sm font-medium capitalize">{refund.final_refund_method?.replace('_', ' ') || refund.preferred_refund_method?.replace('_', ' ') || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processed On:</span>
                    <span className="text-sm">{formatDate(refund.processed_at)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Customer ID: {refund.order_info?.user_id || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Order: {refund.order_info?.order_number || '—'}</span>
                  </div>
                  {refund.tracking_number && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Tracking: {refund.tracking_number}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border border-emerald-100 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckSquare className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-800">Process Complete</p>
              <p className="text-xs text-emerald-700 mt-1">
                Refund successfully processed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/seller/refund/receipt/${refund.id}?shop_id=${shopId}`)}
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/seller/seller-return-refund-cancel?shop_id=${shopId}`)}
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add other status UI components as needed (negotiation, waiting, to_verify, to_process, dispute, rejected, cancelled)
// For brevity, I'll show a generic fallback for other statuses

function GenericStatusUI({ refund, formatDate, formatMoney, navigate, shopId, statusConfig }: any) {
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refund.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig?.color + " text-xs"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig?.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{refund.order_info?.order_number} • {statusConfig?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className={statusConfig?.color.replace('hover:bg-', 'bg-').replace(' text-', ' border-')}>
              <StatusIcon className="h-4 w-4" />
              <AlertTitle>{statusConfig?.label}</AlertTitle>
              <AlertDescription>{statusConfig?.description}</AlertDescription>
            </Alert>

            {/* Main content would go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Amount</p>
                    <p className="text-lg font-bold">{formatMoney(refund.total_refund_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="text-sm">{refund.reason || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Note</p>
                    <p className="text-sm">{refund.customer_note || 'No note provided'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Order Number</p>
                    <p className="text-sm font-medium">{refund.order_info?.order_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Total</p>
                    <p className="text-sm">{formatMoney(refund.order_info?.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="text-sm">{refund.order_info?.payment_method || '—'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View Order
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/seller/seller-return-refund-cancel?shop_id=${shopId}`)}
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Map status to UI components
const STATUS_UI_COMPONENTS = {
  pending: PendingStatusUI,
  negotiation: GenericStatusUI,
  approved: ApprovedStatusUI,
  waiting: GenericStatusUI,
  to_verify: GenericStatusUI,
  to_process: GenericStatusUI,
  dispute: GenericStatusUI,
  completed: CompletedStatusUI,
  rejected: GenericStatusUI,
  cancelled: GenericStatusUI,
};

export default function ViewRefundDetails() {
  const { shopId, refund, user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  const status = refund.status || 'pending';
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig?.icon || Clock;
  const StatusSpecificUI = STATUS_UI_COMPONENTS[status] || GenericStatusUI;

  const backTo = `/seller/seller-return-refund-cancel?shop_id=${encodeURIComponent(shopId)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRequestNumber = () => {
    navigator.clipboard.writeText(refund.request_number || '');
    toast({
      title: 'Copied!',
      description: 'Request number copied to clipboard',
    });
  };

  return (
    <ClientUserProvider user={user ?? null}>
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(backTo)}
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to Requests</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Shop:</span>
            <Badge variant="outline" className="font-medium">
              <Store className="w-3 h-3 mr-1" />
              {refund.shop?.name || 'Shop'}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Refund Request Details</h1>
              <p className="text-muted-foreground">
                Request #<strong>{refund.request_number || '—'}</strong>
                {refund.order_info?.order_number && (
                  <>
                    {' '}• Order #<strong>{refund.order_info.order_number}</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={`text-sm px-3 py-1.5 ${statusConfig?.color}`}
            >
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {statusConfig?.label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Request Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyRequestNumber}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Request Number
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status-Specific UI */}
        <StatusSpecificUI
          refund={refund}
          formatDate={formatDate}
          formatMoney={formatMoney}
          navigate={navigate}
          shopId={shopId}
          statusConfig={statusConfig}
          actionLoading={actionLoading}
        />

        {/* Tabs for Additional Information (Evidence only) */}
        <Tabs defaultValue="evidence" className="w-full">
          <TabsList className="grid w-full grid-cols-1 lg:w-auto lg:inline-flex">
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Evidence</CardTitle>
                <CardDescription>Uploaded photos/files for this request</CardDescription>
              </CardHeader>
              <CardContent>
                {!refund.evidence?.length ? (
                  <div className="text-sm text-muted-foreground">No evidence uploaded.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {refund.evidence.map((m) => (
                      <a
                        key={m.id}
                        href={m.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border p-3 hover:border-gray-300 transition-colors"
                      >
                        {m.url ? (
                          <img
                            src={m.url}
                            alt={m.file_type || 'evidence'}
                            className="h-40 w-full rounded object-cover mb-2"
                          />
                        ) : (
                          <div className="h-40 w-full rounded bg-muted flex items-center justify-center mb-2">
                            <FileText className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground truncate">{m.file_type || 'file'}</div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientUserProvider>
  );
}

type OrderItem = NonNullable<RefundDetails['order_items']>[number];