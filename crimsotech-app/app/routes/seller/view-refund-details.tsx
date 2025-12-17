import { UserProvider as ClientUserProvider } from '~/components/providers/user-role-provider';
import { Link, useLoaderData, data, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
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
  Hash, Tag, PieChart, BarChart3, Layers, Activity, Receipt
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

type OrderItem = {
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
};

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

  const refundRaw: RefundDetails = await res.json();

  // Normalize any relative media URLs returned by backend to absolute URLs using API_BASE_URL
  function toAbsolute(u?: string | null): string | null {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return `${API_BASE_URL}${u}`;
    return `${API_BASE_URL}/${u}`;
  }

  const refund: RefundDetails = {
    ...refundRaw,
    evidence: (refundRaw.evidence || []).map((m) => ({ ...m, url: toAbsolute(m.url) })),
    order_items: (refundRaw.order_items || []).map((it) => ({
      ...it,
      product: it.product
        ? {
            ...it.product,
            skus: (it.product.skus || []).map((s: any) => ({ ...s, image: toAbsolute(s.image) })),
          }
        : it.product,
    })),
  };

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
                {refund.order_items.map((it: OrderItem, idx: number) => {
                  // Precompute selected SKU and unit price for this item
                  const optionMap = (it.product?.variants || []).reduce((acc: Record<string,string>, v: any) => {
                    (v.options || []).forEach((opt: any) => acc[opt.id] = opt.title);
                    return acc;
                  }, {} as Record<string,string>);

                  const qty = Number(it.checkout_quantity) || 1;
                  const unitPriceFromTotal = it.checkout_total_amount && qty > 0 ? Number(it.checkout_total_amount) / qty : null;
                  const unitPrice = unitPriceFromTotal ?? (it.product?.price ? Number(it.product.price) : null);

                  let selectedSku: any = null;
                  const cart = (it as any).cart;
                  const preferredOptionIds = cart?.selected_option_ids || cart?.option_ids || cart?.selected_options || null;
                  const selectedSkuId = cart?.sku_id || cart?.selected_sku_id || null;

                  if (selectedSkuId && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => String(s.id) === String(selectedSkuId));
                  }

                  if (!selectedSku && preferredOptionIds && Array.isArray(preferredOptionIds) && preferredOptionIds.length && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => {
                      const skuIds = (s.option_ids || []).map((x: any) => String(x));
                      return skuIds.length === preferredOptionIds.length && skuIds.sort().join(',') === preferredOptionIds.map(String).sort().join(',');
                    });
                  }

                  if (!selectedSku && unitPrice != null && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(unitPrice));
                  }

                  if (!selectedSku && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(it.product?.price));
                  }

                  if (!selectedSku && it.product?.skus) {
                    selectedSku = it.product.skus[0];
                  }

                  const labelIds = Array.isArray(selectedSku?.option_ids) ? selectedSku.option_ids : (selectedSku?.option_ids ? [selectedSku.option_ids] : []);
                  const labels = labelIds.map((id: any) => optionMap[id] || id).filter(Boolean);
                  const label = labels.length ? labels.join(' • ') : (selectedSku?.sku_code || 'SKU');

                  return (
                    <div key={it.checkout_id || String(idx)} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium">{it.product?.name || 'Product'}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">{it.product?.description || ''}</div>

                            {selectedSku ? (
                              <div className="mt-2 text-sm text-gray-700">
                                <div>
                                  <div className="text-xs text-muted-foreground">Variant</div>
                                  <div className="font-medium">{label}</div>
                                  <div className="text-xs text-gray-500 mt-1">{selectedSku.sku_code ? `SKU: ${selectedSku.sku_code}` : null}</div>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Qty: {it.checkout_quantity ?? '—'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Price</div>
                          <div className="font-medium">{formatMoney(unitPrice)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              onClick={() => onAction?.('approve')}
              disabled={actionLoading}
            >
              <CheckCircle className="h-3 w-3 mr-1.5" />
              {actionLoading ? 'Approving…' : 'Approve Request'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => {
                const id = refund?.refund || refund?.id;
                if (!id) {
                  console.warn('Missing refund id');
                  return;
                }
                navigate(`/seller/refund/negotiate/${id}?shop_id=${shopId}`);
              }}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Make Offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                const id = refund?.refund || refund?.id;
                if (!id) {
                  console.warn('Missing refund id');
                  return;
                }
                navigate(`/seller/refund/reject/${id}?shop_id=${shopId}`);
              }}
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

function ApprovedStatusUI({ refund, formatDate, formatMoney, navigate, shopId, user }: any) {
  const statusConfig = STATUS_CONFIG.approved;
  const StatusIcon = statusConfig.icon;
  const [showWaybill, setShowWaybill] = useState(false);
  const [waybillData, setWaybillData] = useState<any>(null);
  const [generatingWaybill, setGeneratingWaybill] = useState(false);

  const generateReturnWaybill = async () => {
    const id = refund?.refund || refund?.id;
    if (!id) {
      console.warn('Missing refund id');
      return;
    }

    setGeneratingWaybill(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/return-refund/${id}/create_return_waybill/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.user_id,
          'X-Shop-Id': shopId,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWaybillData(data.waybill);
        setShowWaybill(true);
      } else {
        console.error('Failed to generate waybill');
      }
    } catch (error) {
      console.error('Error generating waybill:', error);
    } finally {
      setGeneratingWaybill(false);
    }
  };

  const printWaybill = async () => {
    const id = refund?.refund || refund?.id;
    if (!id) {
      console.warn('Missing refund id');
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/return-refund/${id}/print_waybill/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.user_id,
          'X-Shop-Id': shopId,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Open print dialog with the printable data
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Return Waybill - ${data.printable_data.waybill_number}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                  .waybill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                  .info-section { flex: 1; padding: 10px; }
                  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                  .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                  .items-table th { background-color: #f5f5f5; }
                  .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>Return Waybill</h1>
                  <h2>Waybill #${data.printable_data.waybill_number}</h2>
                </div>
                
                <div class="waybill-info">
                  <div class="info-section">
                    <h3>Sender Information</h3>
                    <p><strong>Customer:</strong> ${data.printable_data.customer_info?.name || 'N/A'}</p>
                    <p><strong>Address:</strong> ${data.printable_data.customer_info?.address || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${data.printable_data.customer_info?.phone || 'N/A'}</p>
                  </div>
                  
                  <div class="info-section">
                    <h3>Receiver Information</h3>
                    <p><strong>Shop:</strong> ${data.printable_data.shop_info?.name || 'N/A'}</p>
                    <p><strong>Address:</strong> ${data.printable_data.shop_info?.address || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${data.printable_data.shop_info?.phone || 'N/A'}</p>
                  </div>
                </div>
                
                <div class="info-section">
                  <h3>Return Details</h3>
                  <p><strong>Order Number:</strong> ${data.printable_data.order_number || 'N/A'}</p>
                  <p><strong>Refund ID:</strong> ${data.printable_data.refund_id || 'N/A'}</p>
                  <p><strong>Status:</strong> ${data.printable_data.status || 'N/A'}</p>
                  <p><strong>Created:</strong> ${new Date(data.printable_data.created_at).toLocaleDateString()}</p>
                </div>
                
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.printable_data.return_items?.map((item: any) => `
                      <tr>
                        <td>${item.name || 'N/A'}</td>
                        <td>${item.quantity || 'N/A'}</td>
                        <td>${item.description || 'N/A'}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="3">No items found</td></tr>'}
                  </tbody>
                </table>
                
                <div class="footer">
                  <p>Generated on ${new Date(data.print_date).toLocaleString()}</p>
                  <p>Printed by: ${data.printed_by || 'N/A'}</p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        console.error('Failed to get printable waybill');
      }
    } catch (error) {
      console.error('Error printing waybill:', error);
    }
  };

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
              Order #{refund.order_info?.order_number} • Approved on {formatDate(refund.approved_at || refund.processed_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Request Approved</AlertTitle>
              <AlertDescription className="text-green-700">
                {refund.buyer_notified_at
                  ? (refund.refund_category === 'keep_item'
                      ? 'Customer has been notified. Process the partial refund payment.'
                      : 'Customer has been notified and can now return the item. Prepare to receive the return.'
                    )
                  : 'Click "Notify Buyer" to allow the customer to proceed with the refund process.'
                }
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
                      <span className="text-sm">{refund.return_deadline ? formatDate(refund.return_deadline) : '7 days from approval'}</span>
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

            {/* Customer Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
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

        {/* Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Items Requested for Return</CardTitle>
            <CardDescription>Review items to expect from the customer</CardDescription>
          </CardHeader>
          <CardContent>
            {!refund.order_items?.length ? (
              <div className="text-sm text-muted-foreground">No items found.</div>
            ) : (
              <div className="space-y-4">
                {refund.order_items.map((it: OrderItem, idx: number) => {
                  // Precompute selected SKU and unit price for this item (same logic as pending view)
                  const optionMap = (it.product?.variants || []).reduce((acc: Record<string,string>, v: any) => {
                    (v.options || []).forEach((opt: any) => acc[opt.id] = opt.title);
                    return acc;
                  }, {} as Record<string,string>);

                  const qty = Number(it.checkout_quantity) || 1;
                  const unitPriceFromTotal = it.checkout_total_amount && qty > 0 ? Number(it.checkout_total_amount) / qty : null;
                  const unitPrice = unitPriceFromTotal ?? (it.product?.price ? Number(it.product.price) : null);

                  let selectedSku: any = null;
                  const cart = (it as any).cart;
                  const preferredOptionIds = cart?.selected_option_ids || cart?.option_ids || cart?.selected_options || null;
                  const selectedSkuId = cart?.sku_id || cart?.selected_sku_id || null;

                  if (selectedSkuId && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => String(s.id) === String(selectedSkuId));
                  }

                  if (!selectedSku && preferredOptionIds && Array.isArray(preferredOptionIds) && preferredOptionIds.length && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => {
                      const skuIds = (s.option_ids || []).map((x: any) => String(x));
                      return skuIds.length === preferredOptionIds.length && skuIds.sort().join(',') === preferredOptionIds.map(String).sort().join(',');
                    });
                  }

                  if (!selectedSku && unitPrice != null && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(unitPrice));
                  }

                  if (!selectedSku && it.product?.skus) {
                    selectedSku = it.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(it.product?.price));
                  }

                  if (!selectedSku && it.product?.skus) {
                    selectedSku = it.product.skus[0];
                  }

                  const labelIds = Array.isArray(selectedSku?.option_ids) ? selectedSku.option_ids : (selectedSku?.option_ids ? [selectedSku.option_ids] : []);
                  const labels = labelIds.map((id: any) => optionMap[id] || id).filter(Boolean);
                  const label = labels.length ? labels.join(' • ') : (selectedSku?.sku_code || 'SKU');

                  return (
                    <div key={it.checkout_id || String(idx)} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium">{it.product?.name || 'Product'}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">{it.product?.description || ''}</div>

                            {selectedSku ? (
                              <div className="mt-2 text-sm text-gray-700">
                                <div>
                                  <div className="text-xs text-muted-foreground">Variant</div>
                                  <div className="font-medium">{label}</div>
                                  <div className="text-xs text-gray-500 mt-1">{selectedSku.sku_code ? `SKU: ${selectedSku.sku_code}` : null}</div>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Qty: {it.checkout_quantity ?? '—'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Price</div>
                          <div className="font-medium">{formatMoney(unitPrice)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            {/* Notify Buyer Button - only show if buyer hasn't been notified yet */}
            {!refund.buyer_notified_at && (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  const id = refund?.refund || refund?.id;
                  if (!id) {
                    console.warn('Missing refund id');
                    return;
                  }
                  
                  try {
                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                    const response = await fetch(`${API_BASE_URL}/return-refund/${id}/notify_buyer/`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-User-Id': user.user_id,
                        'X-Shop-Id': shopId,
                      },
                      credentials: 'include',
                    });
                    
                    if (response.ok) {
                      // Refresh the page or update state
                      window.location.reload();
                    } else {
                      console.error('Failed to notify buyer');
                    }
                  } catch (error) {
                    console.error('Error:', error);
                  }
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1.5" />
                Notify Buyer
              </Button>
            )}

            {/* Generate Return Waybill Button */}
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700"
              onClick={generateReturnWaybill}
              disabled={generatingWaybill}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              {generatingWaybill ? 'Generating...' : 'Generate Return Waybill'}
            </Button>

            {/* Show action buttons only after buyer has been notified */}
            {refund.buyer_notified_at && (
              <>
                {/* Show action button based on refund category */}
                {refund.refund_category === 'return_item' && (
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={async () => {
                      const id = refund?.refund || refund?.id;
                      if (!id) {
                        console.warn('Missing refund id');
                        return;
                      }
                      
                      try {
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                        const response = await fetch(`${API_BASE_URL}/return-refund/${id}/mark_to_process/`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-User-Id': user.user_id,
                            'X-Shop-Id': shopId,
                          },
                          credentials: 'include',
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          
                          // If waybill printable data is included, print the waybill
                          if (data.waybill_printable) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Return Waybill - ${data.waybill_printable.waybill_number}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; margin: 20px; }
                                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                      .waybill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                                      .info-section { flex: 1; padding: 10px; }
                                      .info-section h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                                      .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                                      .items-table th { background-color: #f5f5f5; }
                                      .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>Return Waybill</h1>
                                      <h2>Waybill #${data.waybill_printable.waybill_number}</h2>
                                    </div>
                                    
                                    <div class="waybill-info">
                                      <div class="info-section">
                                        <h3>Sender Information</h3>
                                        <p><strong>Customer:</strong> ${data.waybill_printable.customer_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${data.waybill_printable.customer_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${data.waybill_printable.customer_info?.phone || 'N/A'}</p>
                                      </div>
                                      
                                      <div class="info-section">
                                        <h3>Receiver Information</h3>
                                        <p><strong>Shop:</strong> ${data.waybill_printable.shop_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${data.waybill_printable.shop_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${data.waybill_printable.shop_info?.phone || 'N/A'}</p>
                                      </div>
                                    </div>
                                    
                                    <div class="info-section">
                                      <h3>Return Details</h3>
                                      <p><strong>Order Number:</strong> ${data.waybill_printable.order_number || 'N/A'}</p>
                                      <p><strong>Refund ID:</strong> ${data.waybill_printable.refund_id || 'N/A'}</p>
                                      <p><strong>Status:</strong> ${data.waybill_printable.status || 'N/A'}</p>
                                      <p><strong>Created:</strong> ${new Date(data.waybill_printable.created_at).toLocaleDateString()}</p>
                                    </div>
                                    
                                    <table class="items-table">
                                      <thead>
                                        <tr>
                                          <th>Item</th>
                                          <th>Quantity</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${data.waybill_printable.return_items?.map((item: any) => `
                                          <tr>
                                            <td>${item.name || 'N/A'}</td>
                                            <td>${item.quantity || 'N/A'}</td>
                                            <td>${item.description || 'N/A'}</td>
                                          </tr>
                                        `).join('') || '<tr><td colspan="3">No items found</td></tr>'}
                                      </tbody>
                                    </table>
                                    
                                    <div class="footer">
                                      <p>Generated on ${new Date(data.waybill_printable.print_date).toLocaleString()}</p>
                                      <p>Printed by: ${data.waybill_printable.printed_by || 'N/A'}</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }
                          
                          // Refresh the page
                          window.location.reload();
                        } else {
                          console.error('Failed to notify buyer');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Notify Buyer to Process Return
                  </Button>
                )}

                {refund.refund_category === 'keep_item' && (
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      const id = refund?.refund || refund?.id;
                      if (!id) {
                        console.warn('Missing refund id');
                        return;
                      }
                      
                      try {
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                        const response = await fetch(`${API_BASE_URL}/return-refund/${id}/mark_to_process/`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-User-Id': user.user_id,
                            'X-Shop-Id': shopId,
                          },
                          credentials: 'include',
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          
                          // If waybill printable data is included, print the waybill
                          if (data.waybill_printable) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Return Waybill - ${data.waybill_printable.waybill_number}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; margin: 20px; }
                                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                      .waybill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                                      .info-section { flex: 1; padding: 10px; }
                                      .info-section h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                                      .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                                      .items-table th { background-color: #f5f5f5; }
                                      .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>Return Waybill</h1>
                                      <h2>Waybill #${data.waybill_printable.waybill_number}</h2>
                                    </div>
                                    
                                    <div class="waybill-info">
                                      <div class="info-section">
                                        <h3>Sender Information</h3>
                                        <p><strong>Customer:</strong> ${data.waybill_printable.customer_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${data.waybill_printable.customer_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${data.waybill_printable.customer_info?.phone || 'N/A'}</p>
                                      </div>
                                      
                                      <div class="info-section">
                                        <h3>Receiver Information</h3>
                                        <p><strong>Shop:</strong> ${data.waybill_printable.shop_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${data.waybill_printable.shop_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${data.waybill_printable.shop_info?.phone || 'N/A'}</p>
                                      </div>
                                    </div>
                                    
                                    <div class="info-section">
                                      <h3>Return Details</h3>
                                      <p><strong>Order Number:</strong> ${data.waybill_printable.order_number || 'N/A'}</p>
                                      <p><strong>Refund ID:</strong> ${data.waybill_printable.refund_id || 'N/A'}</p>
                                      <p><strong>Status:</strong> ${data.waybill_printable.status || 'N/A'}</p>
                                      <p><strong>Created:</strong> ${new Date(data.waybill_printable.created_at).toLocaleDateString()}</p>
                                    </div>
                                    
                                    <table class="items-table">
                                      <thead>
                                        <tr>
                                          <th>Item</th>
                                          <th>Quantity</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${data.waybill_printable.return_items?.map((item: any) => `
                                          <tr>
                                            <td>${item.name || 'N/A'}</td>
                                            <td>${item.quantity || 'N/A'}</td>
                                            <td>${item.description || 'N/A'}</td>
                                          </tr>
                                        `).join('') || '<tr><td colspan="3">No items found</td></tr>'}
                                      </tbody>
                                    </table>
                                    
                                    <div class="footer">
                                      <p>Generated on ${new Date(data.waybill_printable.print_date).toLocaleString()}</p>
                                      <p>Printed by: ${data.waybill_printable.printed_by || 'N/A'}</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }
                          
                          // Refresh the page
                          window.location.reload();
                        } else {
                          console.error('Failed to start processing');
                        }
                      } catch (error) {
                        console.error('Error:', error);
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Start Processing Refund
                  </Button>
                )}
                
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => {
                    const id = refund?.refund || refund?.id;
                    if (!id) {
                      console.warn('Missing refund id');
                      return;
                    }
                    navigate(`/seller/refund/mark-received/${id}?shop_id=${shopId}`);
                  }}
                >
                  <PackageCheck className="h-3 w-3 mr-1.5" />
                  Mark as Received
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => {
                    const id = refund?.refund || refund?.id;
                    if (!id) {
                      console.warn('Missing refund id');
                      return;
                    }
                    navigate(`/seller/refund/update-tracking/${id}?shop_id=${shopId}`);
                  }}
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
                  onClick={() => {
                    const id = refund?.refund || refund?.id;
                    if (!id) {
                      console.warn('Missing refund id');
                      return;
                    }
                    navigate(`/seller/refund/cancel/${id}?shop_id=${shopId}`);
                  }}
                >
                  <Ban className="h-3 w-3 mr-1.5" />
                  Cancel Approval
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Return Waybill Display */}
        {showWaybill && waybillData && (
          <Card className="border border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Return Waybill Generated
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWaybill(false)}
                  className="h-8 w-8 p-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Waybill Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Waybill Number:</span>
                      <span className="font-medium">{waybillData.waybill_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {waybillData.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{formatDate(waybillData.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Shipping Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">From:</span>
                      <p className="font-medium">{waybillData.customer_info?.name}</p>
                      <p className="text-xs text-gray-500">{waybillData.customer_info?.address}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">To:</span>
                      <p className="font-medium">{waybillData.shop_info?.name}</p>
                      <p className="text-xs text-gray-500">{waybillData.shop_info?.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-purple-800 mb-2">Return Items</h4>
                <div className="space-y-2">
                  {waybillData.return_items?.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Qty: {item.quantity}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No items listed</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  size="sm"
                  onClick={printWaybill}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Waybill
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWaybill(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

                  {refund.approved_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Approved: {formatDate(refund.approved_at)}</span>
                    </div>
                  )}

                  {refund.return_deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Return Deadline: {formatDate(refund.return_deadline)}</span>
                    </div>
                  )}

                  {/* Approval and return timeline */}
                  {refund.approved_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Approved: {formatDate(refund.approved_at)}</span>
                    </div>
                  )}
                  {refund.return_deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Return by: {formatDate(refund.return_deadline)}</span>
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
              onClick={() => {
                const id = refund?.refund || refund?.id;
                if (!id) {
                  console.warn('Missing refund id');
                  return;
                }
                navigate(`/seller/refund/receipt/${id}?shop_id=${shopId}`);
              }}
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

function ToVerifyStatusUI({ refund, formatDate, formatMoney, navigate, shopId, statusConfig, onAction }: any) {
  const StatusIcon = statusConfig?.icon || PackageCheck;

  const refundId = refund?.refund || refund?.id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
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

            <Card>
              <CardHeader>
                <CardTitle>Verification Actions</CardTitle>
                <CardDescription>Accept or reject the returned items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => onAction('verify_item', { refundId, verification_result: 'approved' })}
                  >
                    <CheckSquare className="h-3 w-3 mr-2" />
                    Accept Return (Verify)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-200 text-red-600"
                    onClick={() => onAction('verify_item', { refundId, verification_result: 'rejected' })}
                  >
                    <XCircle className="h-3 w-3 mr-2" />
                    Reject Return
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="font-medium text-green-600">{formatMoney(refund.total_refund_amount)}</span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Status:</span>
              <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RejectedStatusUI({ refund, formatDate, formatMoney, navigate, shopId, statusConfig, onAction }: any) {
  const refundId = refund?.refund || refund?.id;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Refund Request #{refund.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig?.color + " text-xs"}>
                {statusConfig?.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{refund.order_info?.order_number} • Rejected during verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className={statusConfig?.color.replace('hover:bg-', 'bg-').replace(' text-', ' border-')}>
              <AlertTitle>{statusConfig?.label}</AlertTitle>
              <AlertDescription>
                The items did not pass verification. You may file a dispute to escalate.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate(`/file-dispute/${refundId}`)}
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                File a Dispute
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/seller/seller-return-refund-cancel?shop_id=${shopId}`)}
              >
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back to Requests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigates to the file-dispute page for customers/sellers to file disputes */}
      </div>

      <div className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="font-medium text-green-600">{formatMoney(refund.total_refund_amount)}</span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Status:</span>
              <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

function ToProcessStatusUI({ refund, formatDate, formatMoney, navigate, shopId, user }: any) {
  const { toast } = useToast();
  const statusConfig = STATUS_CONFIG.to_process;
  const StatusIcon = statusConfig.icon;

  const [paymentMethod, setPaymentMethod] = useState('');
  const [walletProvider, setWalletProvider] = useState('');
  const [walletAccountName, setWalletAccountName] = useState('');
  const [walletAccountNumber, setWalletAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [remittanceProvider, setRemittanceProvider] = useState('');
  const [remittanceFullName, setRemittanceFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refundMethod = refund.final_refund_method || refund.preferred_refund_method;

  const handleSubmitPaymentDetails = async () => {
    if (!refundMethod) {
      toast({ title: 'Error', description: 'No refund method specified' });
      return;
    }

    let paymentData: any = {};

    if (refundMethod === 'wallet') {
      if (!walletProvider || !walletAccountName || !walletAccountNumber) {
        toast({ title: 'Error', description: 'Please fill in all wallet details' });
        return;
      }
      paymentData = {
        wallet: {
          provider: walletProvider,
          account_name: walletAccountName,
          account_number: walletAccountNumber,
        }
      };
    } else if (refundMethod === 'bank_transfer') {
      if (!bankName || !bankAccountName || !bankAccountNumber) {
        toast({ title: 'Error', description: 'Please fill in all bank details' });
        return;
      }
      paymentData = {
        bank: {
          bank_name: bankName,
          account_name: bankAccountName,
          account_number: bankAccountNumber,
        }
      };
    } else if (refundMethod === 'remittance') {
      if (!remittanceProvider || !remittanceFullName) {
        toast({ title: 'Error', description: 'Please fill in all remittance details' });
        return;
      }
      paymentData = {
        remittance: {
          provider: remittanceProvider,
          full_name: remittanceFullName,
        }
      };
    }

    try {
      setIsSubmitting(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const refundId = refund?.refund || refund?.id;
      
      const response = await fetch(`${API_BASE_URL}/return-refund/${refundId}/process_refund/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.user_id,
          'X-Shop-Id': shopId,
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_method_details: paymentData,
          final_refund_method: refundMethod,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Refund processed successfully' });
        window.location.reload();
      } else {
        const error = await response.text();
        toast({ title: 'Error', description: error || 'Failed to process refund' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process refund' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Order #{refund.order_info?.order_number} • Ready for processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Ready to Process Refund</AlertTitle>
              <AlertDescription className="text-blue-700">
                Customer has chosen <strong>{refundMethod?.replace('_', ' ')}</strong> as their preferred refund method. 
                Please provide the payment details below to complete the refund.
              </AlertDescription>
            </Alert>

            {/* Refund Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Refund Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Refund Amount:</p>
                  <p className="text-lg font-bold text-green-600">{formatMoney(refund.total_refund_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Refund Method:</p>
                  <p className="text-sm capitalize">{refundMethod?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Customer:</p>
                  <p className="text-sm">{refund.order_info?.user_id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Order:</p>
                  <p className="text-sm">{refund.order_info?.order_number}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Details Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-4">Enter Payment Details</h3>
              
              {refundMethod === 'wallet' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">E-Wallet Provider</label>
                    <select
                      value={walletProvider}
                      onChange={(e) => setWalletProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Provider</option>
                      <option value="gcash">GCash</option>
                      <option value="paymaya">PayMaya</option>
                      <option value="coins.ph">Coins.ph</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Account Name</label>
                    <input
                      type="text"
                      value={walletAccountName}
                      onChange={(e) => setWalletAccountName(e.target.value)}
                      placeholder="Full name on the account"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Account Number/Phone</label>
                    <input
                      type="text"
                      value={walletAccountNumber}
                      onChange={(e) => setWalletAccountNumber(e.target.value)}
                      placeholder="Mobile number or account number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {refundMethod === 'bank_transfer' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Bank Name</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Bank</option>
                      <option value="bdo">Banco de Oro (BDO)</option>
                      <option value="bpi">Bank of the Philippine Islands (BPI)</option>
                      <option value="metrobank">Metrobank</option>
                      <option value="unionbank">UnionBank</option>
                      <option value="landbank">Land Bank of the Philippines</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Account Name</label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Full name on the account"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Account Number</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Bank account number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {refundMethod === 'remittance' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Remittance Provider</label>
                    <select
                      value={remittanceProvider}
                      onChange={(e) => setRemittanceProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Provider</option>
                      <option value="western_union">Western Union</option>
                      <option value="moneygram">MoneyGram</option>
                      <option value="palawan">Palawan Express</option>
                      <option value="cebuana">Cebuana Lhuillier</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={remittanceFullName}
                      onChange={(e) => setRemittanceFullName(e.target.value)}
                      placeholder="Full name for pickup"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Button
                  onClick={handleSubmitPaymentDetails}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Complete Refund
                    </>
                  )}
                </Button>
              </div>
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

        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Processing Guidelines</p>
                <p className="text-xs text-blue-700 mt-1">
                  Verify payment details carefully. Refunds are typically processed within 3-5 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaitingStatusUI({ refund, formatDate, formatMoney, navigate, shopId, statusConfig, onAction }: any) {
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
              Order #{refund.order_info?.order_number} • Waiting for customer to return items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className={statusConfig?.color.replace('hover:bg-', 'bg-').replace(' text-', ' border-')}>
              <StatusIcon className="h-4 w-4" />
              <AlertTitle>{statusConfig?.label}</AlertTitle>
              <AlertDescription>{statusConfig?.description}</AlertDescription>
            </Alert>

            {/* Return Tracking */}
            {refund.tracking_number && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Return Shipment Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Logistic Service</p>
                      <p className="text-sm font-medium">{refund.logistic_service || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking Number</p>
                      <p className="text-sm font-medium font-mono">{refund.tracking_number}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(`https://track.example.com/${refund.tracking_number}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Track Shipment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Items to be Returned */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Items to be Returned</CardTitle>
                <CardDescription>Customer should return these items</CardDescription>
              </CardHeader>
              <CardContent>
                {!refund.order_items?.length ? (
                  <div className="text-sm text-muted-foreground">No items found.</div>
                ) : (
                  <div className="space-y-4">
                    {refund.order_items.map((item: any) => {
                      const sku = item.product?.skus?.[0];
                      const variantLabel = sku?.option_ids?.map((id: string) => {
                        const variant = item.product?.variants?.find((v: any) => 
                          v.options.some((opt: any) => opt.id === id)
                        );
                        if (variant) {
                          const option = variant.options.find((opt: any) => opt.id === id);
                          return option?.title;
                        }
                        return null;
                      }).filter(Boolean).join(' • ');

                      return (
                        <div key={item.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                                <img
                                  src={sku?.image || '/crimsonity.png'}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                              <div>
                                <div className="font-medium">{item.product?.name || 'Product'}</div>
                                {variantLabel && (
                                  <div className="mt-1 text-sm text-gray-700">
                                    <div className="text-xs text-muted-foreground">Variant</div>
                                    <div className="font-medium">{variantLabel}</div>
                                    <div className="text-xs text-gray-500">{sku?.sku_code ? `SKU: ${sku.sku_code}` : null}</div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Qty: {item.quantity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Value</div>
                              <div className="font-medium text-green-600">{formatMoney(item.total_amount)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Waybill */}
            {refund.waybill && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Return Waybill
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Waybill Number</p>
                      <p className="text-sm font-mono">{refund.waybill.waybill_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className="text-xs">{refund.waybill.status}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Return Waybill - ${refund.waybill.waybill_number}</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 20px; }
                                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                .waybill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                                .info-section { flex: 1; padding: 10px; }
                                .info-section h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                                .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                                .items-table th { background-color: #f5f5f5; }
                                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>Return Waybill</h1>
                                <h2>Waybill #${refund.waybill.waybill_number}</h2>
                              </div>
                              
                              <div class="waybill-info">
                                <div class="info-section">
                                  <h3>Sender Information</h3>
                                  <p><strong>Customer:</strong> ${refund.waybill.customer_info?.name || 'N/A'}</p>
                                  <p><strong>Address:</strong> ${refund.waybill.customer_info?.address || 'N/A'}</p>
                                  <p><strong>Phone:</strong> ${refund.waybill.customer_info?.phone || 'N/A'}</p>
                                </div>
                                
                                <div class="info-section">
                                  <h3>Receiver Information</h3>
                                  <p><strong>Shop:</strong> ${refund.waybill.shop_info?.name || 'N/A'}</p>
                                  <p><strong>Address:</strong> ${refund.waybill.shop_info?.address || 'N/A'}</p>
                                  <p><strong>Phone:</strong> ${refund.waybill.shop_info?.phone || 'N/A'}</p>
                                </div>
                              </div>
                              
                              <div class="info-section">
                                <h3>Return Details</h3>
                                <p><strong>Order Number:</strong> ${refund.order_info?.order_number || 'N/A'}</p>
                                <p><strong>Refund ID:</strong> ${refund.refund || 'N/A'}</p>
                                <p><strong>Status:</strong> ${refund.waybill.status || 'N/A'}</p>
                                <p><strong>Created:</strong> ${new Date(refund.waybill.created_at).toLocaleDateString()}</p>
                              </div>
                              
                              <table class="items-table">
                                <thead>
                                  <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${refund.waybill.return_items?.map((item: any) => `
                                    <tr>
                                      <td>${item.name || 'N/A'}</td>
                                      <td>${item.quantity || 'N/A'}</td>
                                      <td>${item.description || 'N/A'}</td>
                                    </tr>
                                  `).join('') || '<tr><td colspan="3">No items found</td></tr>'}
                                </tbody>
                              </table>
                              
                              <div class="footer">
                                <p>Generated on ${new Date().toLocaleString()}</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                  >
                    <Printer className="h-3 w-3 mr-2" />
                    Print Waybill
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Action Card */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onAction('mark_as_received', refund.refund)}
            >
              <PackageCheck className="h-3 w-3 mr-2" />
              Confirm Item Received
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/seller/chat/customer/${refund.requested_by}`)}
            >
              <MessageCircle className="h-3 w-3 mr-2" />
              Contact Customer
            </Button>
          </CardContent>
        </Card>

        {/* Return Summary */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="font-medium text-green-600">
                  {formatMoney(refund.total_refund_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Deadline:</span>
                <span>
                  {refund.buyer_return_deadline 
                    ? formatDate(refund.buyer_return_deadline)
                    : '7 days from approval'}
                </span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Status:</span>
              <Badge className={statusConfig?.color}>
                {statusConfig?.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Return Guidelines</p>
                <p className="text-xs text-blue-700 mt-1">
                  Once you receive the returned items, confirm receipt to proceed with verification and refund processing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DisputeStatusUI({ refund, formatDate, formatMoney, navigate, shopId, statusConfig, onAction }: any) {
  const StatusIcon = statusConfig?.icon || AlertTriangle;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
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
              <AlertTitle>Dispute Filed</AlertTitle>
              <AlertDescription>
                A dispute has been filed for this refund request. The case is under admin review.
              </AlertDescription>
            </Alert>

            {/* Dispute Details */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Dispute Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Dispute Reason</p>
                    <p className="text-sm font-medium">
                      {refund.dispute_reason || 'Dispute filed by shop owner'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Filed Date</p>
                    <p className="text-sm">
                      {refund.dispute_filed_at ? formatDate(refund.dispute_filed_at) : 'N/A'}
                    </p>
                  </div>
                </div>
                {refund.dispute_description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm bg-white p-3 rounded border mt-1">
                      {refund.dispute_description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main content */}
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

            {/* Evidence Section */}
            {refund.evidence && refund.evidence.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Customer Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {refund.evidence.map((evidence: any, index: number) => (
                      <div key={index} className="relative group">
                        {evidence.file_type === 'image' ? (
                          <img
                            src={evidence.url}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(evidence.url, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:bg-gray-200"
                               onClick={() => window.open(evidence.url, '_blank')}>
                            <FileText className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Action Card */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate(`/seller/chat/customer/${refund.requested_by}`)}
            >
              <MessageCircle className="h-3 w-3 mr-2" />
              Contact Customer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/seller/orders/${refund.order_info?.order_number}`)}
            >
              <Eye className="h-3 w-3 mr-2" />
              View Order
            </Button>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusConfig?.timeline?.map((step: any, index: number) => {
              const StepIcon = step.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${
                    step.status === 'completed' ? 'bg-green-100' :
                    step.status === 'current' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    <StepIcon className={`h-3 w-3 ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'current' ? 'text-blue-600' :
                      'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${
                      step.status === 'current' ? 'text-blue-600' :
                      step.status === 'completed' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-orange-100 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Dispute Resolution</p>
                <p className="text-xs text-orange-700 mt-1">
                  This dispute is under admin review. You will be notified once a decision is made.
                </p>
              </div>
            </div>
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
  waiting: WaitingStatusUI,
  to_verify: ToVerifyStatusUI,
  to_process: ToProcessStatusUI,
  dispute: DisputeStatusUI,
  completed: CompletedStatusUI,
  rejected: RejectedStatusUI,
  cancelled: GenericStatusUI,
};

export default function ViewRefundDetails() {
  const { shopId, refund: initialRefund, user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  // Make refund stateful so we can update status locally after actions (approve, etc.)
  const [refund, setRefund] = useState(initialRefund);
  useEffect(() => setRefund(initialRefund), [initialRefund]);

  // Computed refund id (business uuid preferred)
  const refundId = refund?.refund || refund?.id;

  // Action handler for status changes (approve, etc.)
  async function handleAction(action: string, payload?: any) {
    if (!action) return;
    if (action === 'approve') {
      try {
        setActionLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const refundIdRaw = refund?.refund || refund?.id;
        if (!refundIdRaw) {
          toast({ title: 'Error', description: 'Refund id missing' });
          setActionLoading(false);
          return;
        }
        const refundId = String(refundIdRaw);
        const endpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(refundId)}/approve_refund/`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-User-Id': user.user_id,
            'X-Shop-Id': shopId,
          },
          credentials: 'include',
          body: JSON.stringify({ notes: payload?.notes || 'Approved by seller' }),
        });

        const text = await res.text();
        if (!res.ok) {
          // Try parse JSON error if possible
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || JSON.stringify(json));
          } catch (e) {
            throw new Error(text || 'Failed to approve');
          }
        }

        // Parse success response
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        // Update local refund state to include approved and deadline timestamps (use server response when available)
        const nowIso = (new Date()).toISOString();
        setRefund((r: any) => ({
          ...(r || {}),
          status: (data && data.status) || 'approved',
          processed_at: (data && data.processed_at) || nowIso,
          approved_at: (data && data.approved_at) || nowIso,
          return_deadline: (data && data.return_deadline) || null,
        }));

        // Show confirmation toast
        toast({ title: 'Approved request!', description: 'Refund request approved', variant: 'default' });

      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || String(e) });
      } finally {
        setActionLoading(false);
      }
    } else if (action === 'mark_as_received') {
      try {
        setActionLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const refundId = payload;
        if (!refundId) {
          toast({ title: 'Error', description: 'Refund id missing' });
          setActionLoading(false);
          return;
        }
        const endpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(refundId)}/mark_as_received/`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-User-Id': user.user_id,
            'X-Shop-Id': shopId,
          },
          credentials: 'include',
        });

        const text = await res.text();
        if (!res.ok) {
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || JSON.stringify(json));
          } catch (e) {
            throw new Error(text || 'Failed to mark as received');
          }
        }

        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        // Update local refund state
        setRefund((r: any) => ({
          ...(r || {}),
          status: (data && data.status) || 'to_verify',
        }));

        toast({ title: 'Item received!', description: 'Item marked as received for verification', variant: 'default' });

      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || String(e) });
      } finally {
        setActionLoading(false);
      }
    } else if (action === 'verify_item') {
      try {
        setActionLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const refundId = payload?.refundId || (refund?.refund || refund?.id);
        const result = payload?.verification_result;
        const notes = payload?.verification_notes || '';
        if (!refundId || !result) {
          toast({ title: 'Error', description: 'Missing verification data' });
          setActionLoading(false);
          return;
        }
        const endpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(refundId)}/verify_item/`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-User-Id': user.user_id,
            'X-Shop-Id': shopId,
          },
          credentials: 'include',
          body: JSON.stringify({ verification_result: result, verification_notes: notes }),
        });

        const text = await res.text();
        if (!res.ok) {
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || JSON.stringify(json));
          } catch (e) {
            throw new Error(text || 'Failed to verify item');
          }
        }

        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        setRefund((r: any) => ({
          ...(r || {}),
          status: (data && data.status) || (result === 'approved' ? 'to_process' : 'rejected'),
        }));

        toast({
          title: result === 'approved' ? 'Item verified' : 'Return rejected',
          description: result === 'approved' ? 'Moved to processing' : 'Moved to rejected',
          variant: 'default',
        });

      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || String(e) });
      } finally {
        setActionLoading(false);
      }
    } else if (action === 'file_dispute') {
      try {
        setActionLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const refundId = payload?.refundId || (refund?.refund || refund?.id);
        const reason = payload?.dispute_reason || 'Dispute filed by seller';
        if (!refundId) {
          toast({ title: 'Error', description: 'Refund id missing' });
          setActionLoading(false);
          return;
        }
        const endpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(refundId)}/file_dispute/`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-User-Id': user.user_id,
            'X-Shop-Id': shopId,
          },
          credentials: 'include',
          body: JSON.stringify({ dispute_reason: reason }),
        });

        const text = await res.text();
        if (!res.ok) {
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || JSON.stringify(json));
          } catch (e) {
            throw new Error(text || 'Failed to file dispute');
          }
        }

        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        setRefund((r: any) => ({
          ...(r || {}),
          status: (data && data.status) || 'dispute',
        }));

        toast({ title: 'Dispute filed', description: 'Refund moved to dispute', variant: 'default' });

      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || String(e) });
      } finally {
        setActionLoading(false);
      }
    }

  }

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
          user={user}
          statusConfig={statusConfig}
          onAction={handleAction}
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
